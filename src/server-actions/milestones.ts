"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * Get all milestones for a project with task statistics
 */
export async function getProjectMilestones(projectId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get all milestones
  const { data: milestones, error } = await supabase
    .from("milestones")
    .select("id, title, due_at, status")
    .eq("project_id", projectId)
    .order("due_at", { ascending: true });

  if (error) throw error;

  // Get task stats for each milestone
  const milestonesWithStats = await Promise.all(
    (milestones || []).map(async (milestone) => {
      // Count total tasks
      const { count: totalTasks } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("milestone_id", milestone.id);

      // Count completed tasks
      const { count: completedTasks } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("milestone_id", milestone.id)
        .eq("status", "done");

      return {
        ...milestone,
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        progress:
          totalTasks && totalTasks > 0
            ? Math.round((completedTasks! / totalTasks) * 100)
            : 0,
      };
    })
  );

  return milestonesWithStats;
}

/**
 * Create a new milestone (admin only)
 */
export async function createMilestone(formData: FormData) {
  const title = z.string().min(1).max(200).parse(formData.get("title"));
  const projectId = z.string().uuid().parse(formData.get("projectId"));
  const dueAt = formData.get("dueAt");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Verify user is admin of the team
  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) throw new Error("Project not found");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    throw new Error("Only admins can create milestones");
  }

  const { error } = await supabase.from("milestones").insert({
    project_id: projectId,
    title,
    due_at: dueAt ? new Date(dueAt as string).toISOString() : null,
  });

  if (error) throw error;
}

/**
 * Update a milestone (admin only)
 */
export async function updateMilestone(
  milestoneId: string,
  updates: {
    title?: string;
    dueAt?: string | null;
    status?: "open" | "done";
  }
) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get milestone and verify permissions
  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id, projects!inner(team_id)")
    .eq("id", milestoneId)
    .maybeSingle();

  if (!milestone) throw new Error("Milestone not found");

  const teamId = (milestone.projects as unknown as { team_id: string }).team_id;
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    throw new Error("Only admins can update milestones");
  }

  // Build update object
  const updateData: { title?: string; due_at?: string | null; status?: "open" | "done" } = {};
  if (updates.title !== undefined) {
    updateData.title = z.string().min(1).max(200).parse(updates.title);
  }
  if (updates.dueAt !== undefined) {
    updateData.due_at = updates.dueAt ? new Date(updates.dueAt).toISOString() : null;
  }
  if (updates.status !== undefined) {
    updateData.status = z.enum(["open", "done"]).parse(updates.status);
  }

  const { error } = await supabase
    .from("milestones")
    .update(updateData)
    .eq("id", milestoneId);

  if (error) throw error;
}

/**
 * Delete a milestone (admin only)
 */
export async function deleteMilestone(milestoneId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get milestone and verify permissions
  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id, projects!inner(team_id)")
    .eq("id", milestoneId)
    .maybeSingle();

  if (!milestone) throw new Error("Milestone not found");

  const teamId = (milestone.projects as unknown as { team_id: string }).team_id;
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    throw new Error("Only admins can delete milestones");
  }

  // Check if milestone has tasks
  const { count: taskCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("milestone_id", milestoneId);

  if (taskCount && taskCount > 0) {
    throw new Error(
      `Cannot delete milestone with ${taskCount} associated tasks. Please reassign or delete the tasks first.`
    );
  }

  const { error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId);

  if (error) throw error;
}
