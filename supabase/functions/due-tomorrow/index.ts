// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Type definitions for edge function
interface TaskAssignee {
  user_id: string;
}

interface Task {
  id: string;
  title: string;
  due_at: string;
  project_id: string;
  task_assignees: TaskAssignee[] | null;
  projects: { team_id: string } | null;
}

interface User {
  id: string;
  email: string;
}

interface UserPref {
  user_id: string;
  email_due: boolean;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const site = Deno.env.get("SITE_URL")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "TaskNet <noreply@tasknet.app>";

Deno.serve(async () => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() + 1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 1);

  // tasks due tomorrow and not done
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id,title,due_at,project_id,task_assignees(user_id),projects(team_id)"
    )
    .neq("status", "done")
    .gte("due_at", from.toISOString())
    .lt("due_at", to.toISOString());

  if (error) return new Response(error.message, { status: 500 });

  const assignees = ((tasks ?? []) as Task[]).flatMap((t) =>
    t.task_assignees?.map((a) => ({ task: t, user_id: a.user_id })) ?? []
  );
  if (!assignees.length) return new Response("ok");

  // fetch user emails & prefs
  const userIds = [...new Set(assignees.map((a) => a.user_id))];
  const { data: users } = await supabase
    .from("users")
    .select("id,email")
    .in("id", userIds);
  const { data: prefs } = await supabase
    .from("user_prefs")
    .select("user_id,email_due")
    .in("id", userIds);

  // send notifications
  for (const a of assignees) {
    const email = (users as User[] | null)?.find((u) => u.id === a.user_id)?.email as
      | string
      | undefined;
    const ok = (prefs as UserPref[] | null)?.find((p) => p.user_id === a.user_id)?.email_due as
      | boolean
      | undefined;
    await supabase.from("notifications").insert({
      user_id: a.user_id,
      kind: "due_tomorrow",
      payload_json: {
        type: "task",
        taskId: a.task.id,
        title: a.task.title,
        due_at: a.task.due_at,
        projectId: a.task.project_id,
        daysUntilDue: 1,
      },
    });
    if (email && ok && RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: email,
          subject: "Tasks due tomorrow",
          html: `<p>${a.task.title} is due soon.</p><p><a href="${site}/projects/${a.task.project_id}/tasks">Open</a></p>`,
        }),
      });
    }
  }
  return new Response("ok");
});
