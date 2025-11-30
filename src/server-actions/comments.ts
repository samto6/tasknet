"use server";
import { supabaseServer, getCurrentUser } from "@/lib/supabase/server";
import { sendMention } from "@/lib/email";

const MENTION_RE = /@([\w.\-+]+@[\w.\-]+\.\w+)/g; // @email

export async function addComment(taskId: string, body: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, user_id: user.id, body });
  if (error) throw error;

  // Get task details for notification context
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id, title")
    .eq("id", taskId)
    .maybeSingle();

  // Get commenter info
  const { data: commenter } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  const commenterName = commenter?.name || commenter?.email?.split("@")[0] || "Someone";

  // mentions -> notifications + optional email
  const mentions = Array.from(body.matchAll(MENTION_RE)).map((m) => m[1]);
  if (mentions.length) {
    const { data: users } = await supabase
      .from("users")
      .select("id,email")
      .in("email", mentions);
    if (users && users.length) {
      for (const u of users) {
        await supabase.from("notifications").insert({
          user_id: u.id,
          kind: "mention",
          payload_json: {
            taskId,
            title: task?.title,
            projectId: task?.project_id,
            body,
            mentionedBy: user.id,
            mentionerName: commenterName,
          },
        });
      }
      // email only if prefs allow
      const { data: prefs } = await supabase
        .from("user_prefs")
        .select("user_id,email_mentions")
        .in(
          "user_id",
          users.map((u) => u.id)
        );
      for (const u of users) {
        const ok = prefs?.find((p) => p.user_id === u.id)?.email_mentions;
        if (ok && u.email) {
          // send via Resend on the server (see email.ts)
          await sendMention(u.email, { taskId, body });
        }
      }
    }
  }
}
