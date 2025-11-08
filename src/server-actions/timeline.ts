"use server";
import { supabaseServer } from "@/lib/supabase/server";

export type TimelineTask = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "done";
  due_at: string | null;
  project_id: string;
  project_name: string;
  team_id: string;
  milestone_id: string | null;
  milestone_title: string | null;
  assignees: { user_id: string; name: string | null }[];
};

export type TimelineMilestone = {
  id: string;
  title: string;
  due_at: string | null;
  status: "open" | "done";
};

export type TimelineData = {
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  projectName?: string;
  projectStart?: string | null;
  projectEnd?: string | null;
};

/**
 * Get timeline data for a specific project
 */
export async function getProjectTimeline(projectId: string): Promise<TimelineData> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Verify user has access to this project
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, team_id")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Project not found");

  // Fetch all tasks for this project
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      status,
      due_at,
      project_id,
      milestone_id,
      milestones (
        id,
        title
      )
    `)
    .eq("project_id", projectId)
    .order("due_at", { ascending: true, nullsFirst: false });

  // Fetch assignees for all tasks
  const taskIds = tasks?.map((t) => t.id) || [];
  const { data: assignees } = taskIds.length > 0
    ? await supabase
        .from("task_assignees")
        .select("task_id, user_id, users!inner(id, name)")
        .in("task_id", taskIds)
    : { data: [] };

  // Group assignees by task
  const assigneesByTask = (assignees || []).reduce((acc, a) => {
    if (!acc[a.task_id]) acc[a.task_id] = [];
    const userData = a.users as unknown as { id: string; name: string | null };
    acc[a.task_id].push({ user_id: a.user_id, name: userData.name });
    return acc;
  }, {} as Record<string, { user_id: string; name: string | null }[]>);

  // Fetch milestones
  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, title, due_at, status")
    .eq("project_id", projectId)
    .order("due_at", { ascending: true, nullsFirst: false });

  // Calculate project start/end from milestones
  const milestoneDates = (milestones || [])
    .map((m) => m.due_at)
    .filter((d): d is string => d !== null);

  const projectStart = milestoneDates.length > 0 ? milestoneDates[0] : null;
  const projectEnd = milestoneDates.length > 0 ? milestoneDates[milestoneDates.length - 1] : null;

  // Map tasks to TimelineTask format
  const timelineTasks: TimelineTask[] = (tasks || []).map((task) => {
    const milestoneData = task.milestones as unknown as { id: string; title: string } | null;
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      due_at: task.due_at,
      project_id: task.project_id,
      project_name: project.name,
      team_id: project.team_id,
      milestone_id: task.milestone_id,
      milestone_title: milestoneData?.title || null,
      assignees: assigneesByTask[task.id] || [],
    };
  });

  return {
    tasks: timelineTasks,
    milestones: (milestones || []) as TimelineMilestone[],
    projectName: project.name,
    projectStart,
    projectEnd,
  };
}

/**
 * Get timeline data for all tasks assigned to the current user
 */
export async function getPersonalTimeline(): Promise<TimelineData> {
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
    return { tasks: [], milestones: [] };
  }

  const taskIds = assignments.map((a) => a.task_id);

  // Fetch all assigned tasks with project and milestone info
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      status,
      due_at,
      project_id,
      milestone_id,
      projects!inner(id, name, team_id),
      milestones(id, title)
    `)
    .in("id", taskIds)
    .order("due_at", { ascending: true, nullsFirst: false });

  // Fetch assignees for all tasks (to show co-assignees)
  const { data: assignees } = await supabase
    .from("task_assignees")
    .select("task_id, user_id, users!inner(id, name)")
    .in("task_id", taskIds);

  // Group assignees by task
  const assigneesByTask = (assignees || []).reduce((acc, a) => {
    if (!acc[a.task_id]) acc[a.task_id] = [];
    const userData = a.users as unknown as { id: string; name: string | null };
    acc[a.task_id].push({ user_id: a.user_id, name: userData.name });
    return acc;
  }, {} as Record<string, { user_id: string; name: string | null }[]>);

  // Get unique project IDs to fetch milestones
  const projectIds = [...new Set((tasks || []).map((t) => t.project_id))];

  // Fetch milestones for all relevant projects
  const { data: milestones } = projectIds.length > 0
    ? await supabase
        .from("milestones")
        .select("id, title, due_at, status")
        .in("project_id", projectIds)
        .order("due_at", { ascending: true, nullsFirst: false })
    : { data: [] };

  // Map tasks to TimelineTask format
  const timelineTasks: TimelineTask[] = (tasks || []).map((task) => {
    const projectData = task.projects as unknown as { id: string; name: string; team_id: string };
    const milestoneData = task.milestones as unknown as { id: string; title: string } | null;

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      due_at: task.due_at,
      project_id: task.project_id,
      project_name: projectData.name,
      team_id: projectData.team_id,
      milestone_id: task.milestone_id,
      milestone_title: milestoneData?.title || null,
      assignees: assigneesByTask[task.id] || [],
    };
  });

  return {
    tasks: timelineTasks,
    milestones: (milestones || []) as TimelineMilestone[],
  };
}
