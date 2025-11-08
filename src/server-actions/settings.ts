"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * Get user profile and preferences
 */
export async function getUserSettings() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get user profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("id", user.id)
    .maybeSingle();

  // Get user preferences (create if doesn't exist)
  const { data: prefs } = await supabase
    .from("user_prefs")
    .select("email_mentions, email_due, email_digest")
    .eq("user_id", user.id)
    .maybeSingle();

  // If no prefs exist, create default ones
  if (!prefs) {
    await supabase.from("user_prefs").insert({
      user_id: user.id,
      email_mentions: true,
      email_due: true,
      email_digest: true,
    });
  }

  return {
    id: user.id,
    name: profile?.name || null,
    email: profile?.email || user.email || null,
    emailMentions: prefs?.email_mentions ?? true,
    emailDue: prefs?.email_due ?? true,
    emailDigest: prefs?.email_digest ?? true,
  };
}

/**
 * Update user profile (name)
 */
export async function updateUserProfile(formData: FormData) {
  const name = z.string().min(1).max(100).parse(formData.get("name"));

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("users")
    .update({ name })
    .eq("id", user.id);

  if (error) throw error;
}

/**
 * Update email notification preferences
 */
export async function updateEmailPreferences(formData: FormData) {
  const emailMentions = formData.get("emailMentions") === "true";
  const emailDue = formData.get("emailDue") === "true";
  const emailDigest = formData.get("emailDigest") === "true";

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Upsert preferences
  const { error } = await supabase
    .from("user_prefs")
    .upsert(
      {
        user_id: user.id,
        email_mentions: emailMentions,
        email_due: emailDue,
        email_digest: emailDigest,
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

/**
 * Get user statistics
 */
export async function getUserStats() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get team count
  const { count: teamCount } = await supabase
    .from("memberships")
    .select("team_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get completed tasks count
  // First get all done task IDs
  const { data: doneTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("status", "done");

  const doneTaskIds = doneTasks?.map(t => t.id) || [];

  // Then count task_assignees for this user with those IDs
  const { count: completedTasks } = await supabase
    .from("task_assignees")
    .select("task_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("task_id", doneTaskIds.length > 0 ? doneTaskIds : ["00000000-0000-0000-0000-000000000000"]);

  // Get streak data
  const { data: streakData } = await supabase
    .from("streaks")
    .select("current_days, longest_days")
    .eq("user_id", user.id)
    .maybeSingle();

  // Get total check-ins
  const { count: checkInCount } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get badges
  const { data: badges } = await supabase
    .from("rewards")
    .select("badge_name, unlocked_at")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false });

  return {
    teamCount: teamCount || 0,
    completedTasks: completedTasks || 0,
    currentStreak: streakData?.current_days || 0,
    longestStreak: streakData?.longest_days || 0,
    totalCheckIns: checkInCount || 0,
    badges: badges || [],
  };
}
