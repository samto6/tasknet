"use server";
import { supabaseServer, getCurrentUser } from "@/lib/supabase/server";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TaskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  due_at: z.string().optional().nullable(), // Allow any string format, we'll handle conversion
  size: z.number().int().optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
  status: z.enum(["open", "in_progress", "done"]).optional(),
});

export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;

/**
 * Update an existing task
 */
export async function updateTask(taskId: string, input: TaskUpdateInput) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // Get the task to find its project_id for revalidation
  const { data: existingTask, error: fetchError } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .single();

  if (fetchError || !existingTask) throw new Error("Task not found");

  // Build update object, only including non-undefined fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.due_at !== undefined) updateData.due_at = input.due_at;
  if (input.size !== undefined) updateData.size = input.size;
  if (input.milestone_id !== undefined) updateData.milestone_id = input.milestone_id;
  if (input.status !== undefined) updateData.status = input.status;

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) throw error;

  // Revalidate the project's tasks list page
  revalidatePath(`/projects/${existingTask.project_id}/tasks`);
  
  return { success: true };
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, due_at, size, milestone_id, project_id, created_by")
    .eq("id", taskId)
    .single();

  if (error) throw error;
  return task;
}

/**
 * Delete a task (only admin or task creator can delete)
 */
export async function deleteTask(taskId: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // Get the task to find its project_id for revalidation
  const { data: existingTask, error: fetchError } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .single();

  if (fetchError || !existingTask) throw new Error("Task not found");

  // RLS policy handles authorization (admin or creator can delete)
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;

  // Revalidate the project's tasks list page
  revalidatePath(`/projects/${existingTask.project_id}/tasks`);
  
  return { success: true };
}

export async function createTask(input: TaskInput) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
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
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  const completedAt = new Date().toISOString();
  const { data: task, error: tErr } = await supabase
    .from("tasks")
    .update({ status: "done", updated_at: completedAt })
    .eq("id", taskId)
    .select("id, project_id, due_at, milestone_id, updated_at")
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
    payload: { 
      taskId,
      dueAt: task?.due_at ?? null,
      completedAt,
      milestoneId: task?.milestone_id ?? null,
    },
  });

  // Revalidate the project's tasks list page
  if (task?.project_id) revalidatePath(`/projects/${task.project_id}/tasks`);
}

export async function assignSelf(taskId: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
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
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
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
 * Assign another user to a task (creates a notification)
 */
export async function assignUser(taskId: string, assigneeId: string) {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  if (!user) throw new Error("Unauthenticated");

  // Get task details for notification
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, project_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) throw new Error("Task not found");

  // Assign the user
  const { error } = await supabase
    .from("task_assignees")
    .upsert(
      { task_id: taskId, user_id: assigneeId },
      { onConflict: "task_id,user_id", ignoreDuplicates: true }
    );
  if (error) throw error;

  // Only create notification if assigning someone else (not self)
  if (assigneeId !== user.id) {
    // Get assigner's name for the notification
    const { data: assigner } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle();

    const assignerName = assigner?.name || assigner?.email?.split("@")[0] || "Someone";

    // Create assignment notification
    await supabase.from("notifications").insert({
      user_id: assigneeId,
      kind: "assignment",
      payload_json: {
        taskId: task.id,
        title: task.title,
        projectId: task.project_id,
        assignerName,
        assignedBy: user.id,
      },
    });
  }

  // Revalidate task lists
  if (task.project_id) {
    revalidatePath(`/projects/${task.project_id}/tasks`);
  }
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
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
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
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
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
