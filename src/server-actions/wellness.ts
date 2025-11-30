"use server";
import { supabaseServer, getCurrentUser } from "@/lib/supabase/server";
import { recordEventMaybeAward } from "./gamification";

export async function checkIn(mood: 1 | 2 | 3 | 4 | 5, note?: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // once per day enforced by unique index
  const { error } = await supabase
    .from("checkins")
    .insert({ user_id: user.id, mood, note_private: note ?? null });
  if (error) throw error;

  // record event for streaks
  await recordEventMaybeAward({ kind: "checkin", payload: { mood } });
}
