// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  // For users with a streak, if their last event was > 48h ago and updated_at is before today, reset current_days to 0
  const now = new Date();
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  // Fetch all streak rows with last event timestamp
  const { data: events, error: eErr } = await supabase
    .from("events")
    .select("user_id, created_at")
    .order("created_at", { ascending: false });
  if (eErr) return new Response(eErr.message, { status: 500 });

  const lastByUser = new Map<string, string>();
  for (const e of events ?? []) {
    if (!lastByUser.has(e.user_id)) lastByUser.set(e.user_id, e.created_at);
  }

  const { data: streaks, error: sErr } = await supabase
    .from("streaks")
    .select("user_id,current_days,updated_at");
  if (sErr) return new Response(sErr.message, { status: 500 });

  for (const st of streaks ?? []) {
    const lastEventAt = lastByUser.get(st.user_id);
    if (!lastEventAt) {
      // no activity at all, reset if not already zero
      if (st.current_days !== 0) {
        await supabase
          .from("streaks")
          .update({ current_days: 0, updated_at: now.toISOString() })
          .eq("user_id", st.user_id);
      }
      continue;
    }
    if (lastEventAt < cutoff) {
      await supabase
        .from("streaks")
        .update({ current_days: 0, updated_at: now.toISOString() })
        .eq("user_id", st.user_id);
    }
  }
  return new Response("ok");
});
