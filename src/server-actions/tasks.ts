"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";
import { recordEventMaybeAward } from "@/server-actions/gamification";

const Task = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  due_at: z.string().datetime().optional(),
  size: z.number().int().optional(),
});

export type TaskInput = z.infer<typeof Task>;

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
}
