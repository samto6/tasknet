"use server";
import { randomUUID } from "crypto";
import { supabaseServer, getCurrentUser } from "@/lib/supabase/server";
import { z } from "zod";

export async function createTeam(form: FormData) {
  const name = z.string().min(2).parse(form.get("name"));
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // ensure the profile row exists before inserting the team so the trigger can add the membership without FK issues
  const { error: profileErr } = await supabase
    .from("users")
    .upsert({
      id: user.id,
      email: user.email ?? null,
      name: typeof user.user_metadata === "object" && user.user_metadata && "full_name" in user.user_metadata
        ? String((user.user_metadata as Record<string, unknown>).full_name ?? "") || null
        : null,
    });
  if (profileErr) throw profileErr;

  const invite_code = Math.random().toString(36).slice(2, 10);
  const teamId = randomUUID();
  const { error } = await supabase
    .from("teams")
    .insert({ id: teamId, name, invite_code });
  if (error) throw error;

  // create default prefs if missing (idempotent)
  const { error: prefsErr } = await supabase
    .from("user_prefs")
    .upsert(
      { user_id: user.id },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
  if (prefsErr) throw prefsErr;

  return teamId;
}

export async function joinTeamByCode(code: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // Ensure the profile row exists before joining (memberships references users)
  const { error: profileErr } = await supabase
    .from("users")
    .upsert({
      id: user.id,
      email: user.email ?? null,
      name: typeof user.user_metadata === "object" && user.user_metadata && "full_name" in user.user_metadata
        ? String((user.user_metadata as Record<string, unknown>).full_name ?? "") || null
        : null,
    });
  if (profileErr) throw profileErr;

  const { error } = await supabase.rpc("join_team_by_token", { _token: code });
  if (error) throw error;

  // Create default prefs if missing (idempotent)
  const { error: prefsErr } = await supabase
    .from("user_prefs")
    .upsert(
      { user_id: user.id },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
  if (prefsErr) throw prefsErr;
}

/**
 * Get all members of a team with their roles and activity stats
 */
export async function getTeamMembers(teamId: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // Verify user is a team member
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this team");

  // Get all members with their user info
  const { data: members, error } = await supabase
    .from("memberships")
    .select(`
      user_id,
      role,
      joined_at,
      users!inner (
        id,
        name,
        email
      )
    `)
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  // Get task completion stats for each member
  const memberStats = await Promise.all(
    (members || []).map(async (member) => {
      const userId = member.user_id;

      // Count completed tasks in this team
      // First get project IDs for this team
      const { data: teamProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("team_id", teamId);

      const projectIds = teamProjects?.map(p => p.id) || [];

      // Then get done task IDs from those projects
      const { data: doneTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("status", "done")
        .in("project_id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"]);

      const doneTaskIds = doneTasks?.map(t => t.id) || [];

      // Finally count this user's assignments to those tasks
      const { count: completedTasks } = await supabase
        .from("task_assignees")
        .select("task_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("task_id", doneTaskIds.length > 0 ? doneTaskIds : ["00000000-0000-0000-0000-000000000000"]);

      // Get current streak
      const { data: streakData } = await supabase
        .from("streaks")
        .select("current, longest")
        .eq("user_id", userId)
        .maybeSingle();

      const user = member.users as unknown as { name: string | null; email: string | null } | null;
      return {
        userId,
        name: user?.name || user?.email || "Unknown",
        email: user?.email || null,
        role: member.role,
        joinedAt: member.joined_at,
        completedTasks: completedTasks || 0,
        currentStreak: streakData?.current || 0,
        longestStreak: streakData?.longest || 0,
      };
    })
  );

  return memberStats;
}

/**
 * Remove a member from a team (admin only)
 */
export async function removeMemberFromTeam(teamId: string, userId: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // Verify current user is an admin
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    throw new Error("Only admins can remove members");
  }

  // Prevent removing yourself if you're the only admin
  const { data: admins } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("role", "admin");

  if (admins && admins.length === 1 && admins[0].user_id === userId) {
    throw new Error("Cannot remove the only admin. Promote another member first.");
  }

  // Delete the membership
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Update a member's role (admin only)
 */
export async function updateMemberRole(
  teamId: string,
  userId: string,
  newRole: "admin" | "member"
) {
  const roleSchema = z.enum(["admin", "member"]);
  const validatedRole = roleSchema.parse(newRole);

  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // Verify current user is an admin
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    throw new Error("Only admins can change member roles");
  }

  // Prevent demoting yourself if you're the only admin
  if (validatedRole === "member" && userId === user.id) {
    const { data: admins } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("role", "admin");

    if (admins && admins.length === 1) {
      throw new Error("Cannot demote the only admin. Promote another member first.");
    }
  }

  // Update the role
  const { error } = await supabase
    .from("memberships")
    .update({ role: validatedRole })
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) throw error;
}
