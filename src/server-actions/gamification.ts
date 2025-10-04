"use server";
import { supabaseServer } from "@/lib/supabase/server";

export async function recordEventMaybeAward(args: {
  kind: "checkin" | "task_completed";
  team_id?: string | null;
  payload?: any;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  await supabase
    .from("events")
    .insert({
      user_id: user.id,
      team_id: args.team_id ?? null,
      kind: args.kind,
      payload_json: args.payload ?? null,
    });

  // Streak: increment today if we haven't updated streak today and user had an event within last 48h
  const now = new Date().toISOString();
  const { data: lastEvent } = await supabase
    .from("events")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: st } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const within48h = lastEvent
    ? Date.now() - new Date(lastEvent.created_at as any).getTime() <=
      48 * 3600 * 1000
    : true;

  if (!st) {
    const days = 1;
    await supabase
      .from("streaks")
      .insert({
        user_id: user.id,
        current_days: days,
        longest_days: days,
        updated_at: now,
      });
  } else {
    // only increment once per calendar day
    const last = new Date(st.updated_at as any);
    const sameDay = last.toDateString() === new Date().toDateString();
    let current = st.current_days as number;
    let longest = st.longest_days as number;
    if (!sameDay) {
      if (within48h) current += 1;
      else current = 1;
      if (current > longest) longest = current;
      await supabase
        .from("streaks")
        .update({
          current_days: current,
          longest_days: longest,
          updated_at: now,
        })
        .eq("user_id", user.id);
    }
  }

  // Badges (idempotent via unique constraint)
  // streak_7, streak_30
  const { data: s2 } = await supabase
    .from("streaks")
    .select("current_days")
    .eq("user_id", user.id)
    .single();
  if (s2) {
    const days = (s2 as any).current_days as number;
    if (days >= 7) {
      await supabase
        .from("rewards")
        .upsert(
          { user_id: user.id, kind: "streak_7" },
          { onConflict: "user_id,kind", ignoreDuplicates: true }
        );
    }
    if (days >= 30) {
      await supabase
        .from("rewards")
        .upsert(
          { user_id: user.id, kind: "streak_30" },
          { onConflict: "user_id,kind", ignoreDuplicates: true }
        );
    }
  }
  // on_time_10 and milestone_maker are awarded elsewhere (e.g., after batch checks)
}
