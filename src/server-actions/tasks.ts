"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";
import { recordEventMaybeAward } from "@/server-actions/gamification";
import { revalidatePath } from "next/cache";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  due_at: z.string().datetime().optional(),
  size: z.number().int().optional(),
  milestone_id: z.string().uuid().optional(),
});

export type TaskInput = z.infer<typeof TaskSchema>;

export async function createTask(input: TaskInput) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  const { error, data } = await supabase
    .from("tasks")
    .insert({ ...input, created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;
  // Revalidate project tasks listing paths after creation
  revalidatePath(`/projects/${input.project_id}/tasks`);
  return data!.id as string;
}

export async function completeTask(taskId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: task, error: tErr } = await supabase
    .from("tasks")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("id, project_id, due_at, updated_at")
    .single();
  if (tErr) throw tErr;

  // Fetch project->team for event
  const { data: proj } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", task!.project_id)
    .single();
  await recordEventMaybeAward({
    kind: "task_completed",
    team_id: proj?.team_id ?? null,
    payload: { taskId },
  });

  // Revalidate the project's tasks list page
  if (task?.project_id) revalidatePath(`/projects/${task.project_id}/tasks`);
}

export async function assignSelf(taskId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  const { error } = await supabase
    .from("task_assignees")
    .upsert(
      { task_id: taskId, user_id: user.id },
      { onConflict: "task_id,user_id", ignoreDuplicates: true }
    );
  if (error) throw error;
  // Revalidate possible lists showing assignees state
  // We don't have the project_id here; lists are still refreshed by client-side transitions.
}

export async function unassignSelf(taskId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  const { error } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", user.id);
  if (error) throw error;
  // Revalidate possible lists showing assignees state
}

/**
 * Get tasks assigned to the current user
 * Optionally filter by status and due date
 */
export async function getMyTasks(options?: {
  status?: "open" | "in_progress" | "done";
  limit?: number;
  dueSoon?: boolean; // if true, only return tasks due within next 7 days
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get task IDs assigned to user
  const { data: assignments } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", user.id);

  if (!assignments || assignments.length === 0) {
    return [];
  }

  const taskIds = assignments.map((a) => a.task_id);

  // Build query for tasks
  let query = supabase
    .from("tasks")
    .select("id, title, description, status, due_at, project_id, projects!inner(name, team_id)")
    .in("id", taskIds)
    .order("due_at", { ascending: true, nullsFirst: false });

  // Apply status filter if provided
  if (options?.status) {
    query = query.eq("status", options.status);
  }

  // Apply due soon filter if requested
  if (options?.dueSoon) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    query = query.lte("due_at", sevenDaysFromNow.toISOString());
  }

  // Apply limit if provided
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: tasks, error } = await query;
  if (error) throw error;

  return tasks || [];
}

/**
 * Get user statistics for dashboard
 */
export async function getUserStats() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Get task IDs assigned to user
  const { data: assignments } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", user.id);

  const taskIds = assignments?.map((a) => a.task_id) || [];

  // Count completed tasks
  let completedTasksCount = 0;
  if (taskIds.length > 0) {
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("id", taskIds)
      .eq("status", "done");
    completedTasksCount = count || 0;
  }

  // Get active projects (where user has tasks)
  let activeProjects: string[] = [];
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("project_id")
      .in("id", taskIds);

    activeProjects = [...new Set(tasks?.map(t => t.project_id) || [])];
  }

  // Get team memberships
  const { data: memberships } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("user_id", user.id);

  return {
    completedTasks: completedTasksCount,
    activeProjects: activeProjects.length,
    teamMemberships: memberships?.length || 0,
  };
}
