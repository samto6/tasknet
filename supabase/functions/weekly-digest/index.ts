// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const site = Deno.env.get("SITE_URL")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "TaskNest <noreply@tasknest.app>";

Deno.serve(async () => {
  // Gather a simple weekly digest: tasks completed in the last 7 days per user
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: recentEvents, error } = await supabase
    .from("events")
    .select("user_id, kind, created_at, payload_json")
    .gte("created_at", since.toISOString());
  if (error) return new Response(error.message, { status: 500 });

  const byUser: Record<string, any[]> = {};
  for (const e of recentEvents ?? []) {
    if (!byUser[e.user_id]) byUser[e.user_id] = [];
    byUser[e.user_id].push(e);
  }

  const userIds = Object.keys(byUser);
  if (!userIds.length) return new Response("ok");

  const { data: users } = await supabase
    .from("users")
    .select("id,email")
    .in("id", userIds);
  const { data: prefs } = await supabase
    .from("user_prefs")
    .select("user_id,email_digest")
    .in("user_id", userIds);

  for (const uid of userIds) {
    const email = users?.find((u: any) => u.id === uid)?.email as string | undefined;
    const ok = prefs?.find((p: any) => p.user_id === uid)?.email_digest as boolean | undefined;
    const list = byUser[uid];

    // notification record
    await supabase.from("notifications").insert({
      user_id: uid,
      kind: "weekly_digest",
      payload_json: { count: list.length },
    });

    if (email && ok && RESEND_API_KEY) {
      const completed = list.filter((e) => e.kind === "task_completed").length;
      const checkins = list.filter((e) => e.kind === "checkin").length;
      const html = `<h2>Your week at a glance</h2>
        <p><b>${completed}</b> tasks completed</p>
        <p><b>${checkins}</b> check-ins</p>
        <p><a href="${site}/dashboard">Open TaskNest</a></p>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to: email, subject: "Your weekly digest", html }),
      });
    }
  }
  return new Response("ok");
});
