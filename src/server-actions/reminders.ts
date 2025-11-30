"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { sendTaskReminder, sendMilestoneReminder } from "@/lib/email";

/**
 * Send manual reminder for a task (admin only)
 */
export async function sendTaskReminderAction(
  taskId: string,
  recipientIds: string[]
) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get task with project info
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, due_at, project_id, projects!inner(name, team_id)")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) throw new Error("Task not found");

  const project = task.projects as unknown as { name: string; team_id: string };

  // Verify user is admin
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    throw new Error("Only admins can send reminders");
  }

  // Get sender info
  const { data: sender } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  const senderName = sender?.name || sender?.email || "A team admin";

  // Get recipient emails and prefs
  const { data: recipients } = await supabase
    .from("users")
    .select("id, email")
    .in("id", recipientIds);

  const { data: prefs } = await supabase
    .from("user_prefs")
    .select("user_id, email_due")
    .in("user_id", recipientIds);

  // Send emails and log
  const results = await Promise.allSettled(
    (recipients || []).map(async (recipient) => {
      // Check user preference
      const userPref = prefs?.find((p) => p.user_id === recipient.id);
      if (userPref?.email_due === false) {
        // Still create in-app notification for skipped emails
        await supabase.from("notifications").insert({
          user_id: recipient.id,
          kind: "manual_reminder",
          payload_json: {
            type: "task",
            taskId: task.id,
            title: task.title,
            due_at: task.due_at,
            projectId: task.project_id,
            projectName: project.name,
            senderName,
            sentBy: user.id,
          },
        });
        return { skipped: true, userId: recipient.id };
      }

      // Try to send email
      if (recipient.email) {
        try {
          await sendTaskReminder(recipient.email, {
            taskId: task.id,
            taskTitle: task.title,
            dueAt: task.due_at,
            projectId: task.project_id,
            projectName: project.name,
            senderName,
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${recipient.email}:`, emailError);
          // Continue with notification even if email fails
        }
      }

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: recipient.id,
        kind: "manual_reminder",
        payload_json: {
          type: "task",
          taskId: task.id,
          title: task.title,
          due_at: task.due_at,
          projectId: task.project_id,
          projectName: project.name,
          senderName,
          sentBy: user.id,
        },
      });

      // Log the reminder
      await supabase.from("reminder_logs").insert({
        entity_type: "task",
        entity_id: taskId,
        recipient_id: recipient.id,
        sent_by: user.id,
      });

      return { sent: true, userId: recipient.id };
    })
  );

  const sent = results.filter(
    (r) => r.status === "fulfilled" && (r.value as { sent?: boolean }).sent
  ).length;

  return { sent, total: recipientIds.length };
}

/**
 * Send manual reminder for a milestone (admin only)
 */
export async function sendMilestoneReminderAction(
  milestoneId: string,
  recipientIds: string[]
) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get milestone with project info
  const { data: milestone } = await supabase
    .from("milestones")
    .select("id, title, due_at, project_id, projects!inner(name, team_id)")
    .eq("id", milestoneId)
    .maybeSingle();

  if (!milestone) throw new Error("Milestone not found");

  const project = milestone.projects as unknown as { name: string; team_id: string };

  // Verify user is admin
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    throw new Error("Only admins can send reminders");
  }

  // Get sender info
  const { data: sender } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  const senderName = sender?.name || sender?.email || "A team admin";

  // Get recipient emails and prefs
  const { data: recipients } = await supabase
    .from("users")
    .select("id, email")
    .in("id", recipientIds);

  const { data: prefs } = await supabase
    .from("user_prefs")
    .select("user_id, email_due")
    .in("user_id", recipientIds);

  // Send emails and log
  const results = await Promise.allSettled(
    (recipients || []).map(async (recipient) => {
      // Check user preference
      const userPref = prefs?.find((p) => p.user_id === recipient.id);
      if (userPref?.email_due === false) {
        return { skipped: true, userId: recipient.id };
      }

      if (recipient.email) {
        await sendMilestoneReminder(recipient.email, {
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          dueAt: milestone.due_at,
          projectId: milestone.project_id,
          projectName: project.name,
          senderName,
        });
      }

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: recipient.id,
        kind: "manual_reminder",
        payload_json: {
          type: "milestone",
          milestoneId: milestone.id,
          title: milestone.title,
          due_at: milestone.due_at,
          projectId: milestone.project_id,
          projectName: project.name,
          senderName,
          sentBy: user.id,
        },
      });

      // Log the reminder
      await supabase.from("reminder_logs").insert({
        entity_type: "milestone",
        entity_id: milestoneId,
        recipient_id: recipient.id,
        sent_by: user.id,
      });

      return { sent: true, userId: recipient.id };
    })
  );

  const sent = results.filter(
    (r) => r.status === "fulfilled" && (r.value as { sent?: boolean }).sent
  ).length;

  return { sent, total: recipientIds.length };
}

/**
 * Get task assignees for recipient selection
 */
export async function getTaskAssignees(taskId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: assignees } = await supabase
    .from("task_assignees")
    .select("user_id, users!inner(id, name, email)")
    .eq("task_id", taskId);

  return (assignees || []).map((a) => {
    const u = a.users as unknown as { id: string; name: string | null; email: string | null };
    return { id: u.id, name: u.name, email: u.email };
  });
}

/**
 * Get project members for recipient selection
 */
export async function getProjectMembers(projectId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get team_id from project
  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) throw new Error("Project not found");

  // Get all team members
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, role, users!inner(id, name, email)")
    .eq("team_id", project.team_id);

  return (members || []).map((m) => {
    const u = m.users as unknown as { id: string; name: string | null; email: string | null };
    return { id: u.id, name: u.name, email: u.email, role: m.role };
  });
}

/**
 * Get upcoming tasks and milestones for bulk reminder
 */
export async function getUpcomingItems(projectId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const now = new Date();
  const oneWeekLater = new Date(now);
  oneWeekLater.setDate(now.getDate() + 7);

  // Get upcoming tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_at, status, task_assignees(user_id)")
    .eq("project_id", projectId)
    .neq("status", "done")
    .gte("due_at", now.toISOString())
    .lte("due_at", oneWeekLater.toISOString())
    .order("due_at", { ascending: true });

  // Get upcoming milestones
  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, title, due_at, status")
    .eq("project_id", projectId)
    .eq("status", "open")
    .gte("due_at", now.toISOString())
    .lte("due_at", oneWeekLater.toISOString())
    .order("due_at", { ascending: true });

  return {
    tasks: tasks || [],
    milestones: milestones || [],
  };
}

/**
 * Check if user is admin for a project
 */
export async function isProjectAdmin(projectId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return false;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  return membership?.role === "admin";
}
