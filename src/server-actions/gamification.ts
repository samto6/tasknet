"use server";
import { supabaseServer } from "@/lib/supabase/server";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export async function recordEventMaybeAward(args: {
  kind: "checkin" | "task_completed";
  team_id?: string | null;
  payload?: Json;
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
    ? Date.now() - new Date(String(lastEvent.created_at)).getTime() <= 48 * 3600 * 1000
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
  const last = new Date(String(st.updated_at));
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
    const days = Number((s2 as { current_days: number }).current_days);
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

/**
 * Get the current user's streak information
 */
export async function getUserStreak() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: streak } = await supabase
    .from("streaks")
    .select("current_days, longest_days, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!streak) {
    return { current_days: 0, longest_days: 0, updated_at: null };
  }

  return {
    current_days: Number(streak.current_days),
    longest_days: Number(streak.longest_days),
    updated_at: streak.updated_at,
  };
}

/**
 * Get the current user's unlocked badges
 */
export async function getUserBadges() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: badges } = await supabase
    .from("rewards")
    .select("kind, awarded_at")
    .eq("user_id", user.id)
    .order("awarded_at", { ascending: false });

  return badges || [];
}
