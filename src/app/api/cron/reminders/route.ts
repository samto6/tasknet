import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTaskReminder, sendMilestoneReminder } from "@/lib/email";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Get tasks due tomorrow
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);

  // Fetch tasks due tomorrow
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      due_at,
      project_id,
      task_assignees(user_id),
      projects!inner(name, team_id)
    `)
    .neq("status", "done")
    .gte("due_at", tomorrow.toISOString())
    .lt("due_at", dayAfter.toISOString());

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  // Fetch milestones due tomorrow
  const { data: milestones, error: milestonesError } = await supabase
    .from("milestones")
    .select(`
      id,
      title,
      due_at,
      project_id,
      projects!inner(name, team_id)
    `)
    .eq("status", "open")
    .gte("due_at", tomorrow.toISOString())
    .lt("due_at", dayAfter.toISOString());

  if (milestonesError) {
    console.error("Error fetching milestones:", milestonesError);
    return NextResponse.json({ error: milestonesError.message }, { status: 500 });
  }

  let sentCount = 0;

  // Process task reminders
  for (const task of tasks || []) {
    const project = task.projects as unknown as { name: string; team_id: string };
    const assignees = task.task_assignees as { user_id: string }[];

    if (!assignees?.length) continue;

    // Get user emails and preferences
    const userIds = assignees.map((a) => a.user_id);
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .in("id", userIds);

    const { data: prefs } = await supabase
      .from("user_prefs")
      .select("user_id, email_due")
      .in("user_id", userIds);

    for (const user of users || []) {
      const userPref = prefs?.find((p) => p.user_id === user.id);

      // Skip if user has disabled due date reminders
      if (userPref?.email_due === false) continue;

      if (user.email) {
        try {
          await sendTaskReminder(user.email, {
            taskId: task.id,
            taskTitle: task.title,
            dueAt: task.due_at,
            projectId: task.project_id,
            projectName: project.name,
            senderName: "TaskNet",
          });
          sentCount++;

          // Create in-app notification
          await supabase.from("notifications").insert({
            user_id: user.id,
            kind: "due_tomorrow",
            payload_json: {
              type: "task",
              taskId: task.id,
              title: task.title,
              due_at: task.due_at,
              projectId: task.project_id,
              projectName: project.name,
              daysUntilDue: 1,
            },
          });
        } catch (error) {
          console.error(`Failed to send task reminder to ${user.email}:`, error);
        }
      }
    }
  }

  // Process milestone reminders - send to all team members
  for (const milestone of milestones || []) {
    const project = milestone.projects as unknown as { name: string; team_id: string };

    // Get all team members
    const { data: members } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("team_id", project.team_id);

    if (!members?.length) continue;

    const userIds = members.map((m) => m.user_id);
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .in("id", userIds);

    const { data: prefs } = await supabase
      .from("user_prefs")
      .select("user_id, email_due")
      .in("user_id", userIds);

    for (const user of users || []) {
      const userPref = prefs?.find((p) => p.user_id === user.id);

      // Skip if user has disabled due date reminders
      if (userPref?.email_due === false) continue;

      if (user.email) {
        try {
          await sendMilestoneReminder(user.email, {
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            dueAt: milestone.due_at,
            projectId: milestone.project_id,
            projectName: project.name,
            senderName: "TaskNet",
          });
          sentCount++;

          // Create in-app notification
          await supabase.from("notifications").insert({
            user_id: user.id,
            kind: "due_tomorrow",
            payload_json: {
              type: "milestone",
              milestoneId: milestone.id,
              title: milestone.title,
              due_at: milestone.due_at,
              projectId: milestone.project_id,
              projectName: project.name,
              daysUntilDue: 1,
            },
          });
        } catch (error) {
          console.error(`Failed to send milestone reminder to ${user.email}:`, error);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    tasksProcessed: tasks?.length || 0,
    milestonesProcessed: milestones?.length || 0,
    emailsSent: sentCount,
  });
}
