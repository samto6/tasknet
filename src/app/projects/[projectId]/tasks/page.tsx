import { supabaseServer, getCurrentUser } from "@/lib/supabase/server";
import TasksClient from "./tasks-client";
import { Suspense } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import FilterBar from "./FilterBar";
import BulkReminderButton from "./BulkReminderButton";

export const revalidate = 5; // ISR to keep lists fresh without full SSR on every request

type Search = Record<string, string | string[] | undefined> & {
  page?: string | string[];
  filter?: string | string[];
  milestone_id?: string | string[];
  assignee?: string | string[];
  date_from?: string | string[];
  date_to?: string | string[];
};

const toSingleValue = (value?: string | string[]): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const isFilter = (value?: string): value is "me" | "week" | "milestone" | "overdue" | "all" =>
  value === "me" || value === "week" || value === "milestone" || value === "overdue" || value === "all";

export default async function ProjectTasksPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Search> }) {
  const [{ projectId }, rawSearch] = await Promise.all([params, searchParams]);

  const pageParam = toSingleValue(rawSearch.page);
  const parsedPage = Number(pageParam ?? "1");
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("tasks")
    .select("id,title,status,due_at,description,created_by,milestone_id")
    .eq("project_id", projectId)
    .order("due_at", { ascending: true, nullsFirst: true });

  // Advanced filters
  const filterValue = toSingleValue(rawSearch.filter);
  const filter = isFilter(filterValue) ? filterValue : undefined;
  const assigneeId = toSingleValue(rawSearch.assignee);
  const milestoneId = toSingleValue(rawSearch.milestone_id);
  const dateFrom = toSingleValue(rawSearch.date_from);
  const dateTo = toSingleValue(rawSearch.date_to);

  // Quick filters
  if (filter === "me") {
    if (user) {
      // Filter by tasks assigned to current user
      const { data: assignedTaskIds } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", user.id);

      if (assignedTaskIds && assignedTaskIds.length > 0) {
        q = q.in("id", assignedTaskIds.map(a => a.task_id));
      } else {
        // No assigned tasks, return empty
        q = q.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }
  } else if (filter === "week") {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    q = q.gte("due_at", start.toISOString()).lt("due_at", end.toISOString());
  } else if (filter === "overdue") {
    const now = new Date().toISOString();
    q = q.lt("due_at", now).neq("status", "done");
  }

  // Assignee filter (advanced)
  if (assigneeId) {
    const { data: assignedTaskIds } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", assigneeId);

    if (assignedTaskIds && assignedTaskIds.length > 0) {
      q = q.in("id", assignedTaskIds.map(a => a.task_id));
    } else {
      q = q.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // Milestone filter (advanced)
  if (milestoneId) {
    q = q.eq("milestone_id", milestoneId);
  }

  // Date range filter (advanced)
  if (dateFrom) {
    q = q.gte("due_at", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    q = q.lte("due_at", endDate.toISOString());
  }

  const { data: tasks, error } = await q.range(from, to);
  if (error) {
    return <main className="p-6">Error: {error.message}</main>;
  }

  // Fetch project to get team_id
  const { data: project } = await supabase
    .from("projects")
    .select("team_id")
    .eq("id", projectId)
    .maybeSingle();

  // Check if user is admin
  let isAdmin = false;
  if (project?.team_id && user) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("team_id", project.team_id)
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = membership?.role === "admin";
  }

  // Fetch milestones for filtering
  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, title, due_at")
    .eq("project_id", projectId)
    .order("due_at", { ascending: true });

  // Fetch team members for filtering
  let teamMembers: Array<{ id: string; name: string | null; email: string | null }> = [];
  if (project?.team_id) {
    const { data: members } = await supabase
      .from("memberships")
      .select("user_id, users!inner(id, name, email)")
      .eq("team_id", project.team_id);

    if (members) {
      teamMembers = members.map(m => {
        const user = m.users as unknown as { id: string; name: string | null; email: string | null };
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      });
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <div className="flex gap-2">
          <Link href={`/projects/${projectId}/tasks/new`}>
            <Button variant="primary" size="sm">
              <span className="mr-2">➕</span>
              Create Task
            </Button>
          </Link>
          {isAdmin && (
            <BulkReminderButton projectId={projectId} />
          )}
          <Link href={`/projects/${projectId}/milestones`}>
            <Button variant="secondary" size="sm">
              <span className="mr-2">🎯</span>
              Milestones
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/timeline`}>
            <Button variant="secondary" size="sm">
              <span className="mr-2">📅</span>
              Timeline
            </Button>
          </Link>
        </div>
      </div>

      <FilterBar
        milestones={milestones || []}
        teamMembers={teamMembers}
      />

      <Suspense fallback={<div>Loading…</div>}>
        <TasksClient
          projectId={projectId}
          tasks={tasks ?? []}
          page={page}
          pageSize={pageSize}
          isAdmin={isAdmin}
          teamMembers={teamMembers}
        />
      </Suspense>
    </main>
  );
}
