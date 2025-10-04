import { supabaseServer } from "@/lib/supabase/server";
import TasksClient from "./";
import { Suspense } from "react";

export const revalidate = 5; // ISR to keep lists fresh without full SSR on every request

type Search = Record<string, string | string[] | undefined> & {
  page?: string | string[];
  filter?: string | string[];
  milestone_id?: string | string[];
};

const toSingleValue = (value?: string | string[]): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const isFilter = (value?: string): value is "me" | "week" | "milestone" =>
  value === "me" || value === "week" || value === "milestone";

export default async function ProjectTasksPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Search> }) {
  const [{ projectId }, rawSearch] = await Promise.all([params, searchParams]);

  const pageParam = toSingleValue(rawSearch.page);
  const parsedPage = Number(pageParam ?? "1");
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  const supabase = await supabaseServer();
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("tasks")
    .select("id,title,status,due_at,description,created_by")
    .eq("project_id", projectId)
    .order("due_at", { ascending: true, nullsFirst: true });

  // basic filters
  const filterValue = toSingleValue(rawSearch.filter);
  const filter = isFilter(filterValue) ? filterValue : undefined;
  if (filter === "me") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) q = q.eq("created_by", user.id);
  } else if (filter === "week") {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    q = q.gte("due_at", start.toISOString()).lt("due_at", end.toISOString());
  } else if (filter === "milestone") {
    const milestoneId = toSingleValue(rawSearch.milestone_id);
    if (milestoneId) {
      // select tasks due before/after milestone? For MVP, fetch tasks with due_at == milestone due day
      const { data: ms } = await supabase
        .from("milestones")
        .select("due_at")
        .eq("id", milestoneId)
        .maybeSingle();
      if (ms?.due_at) {
        const start = new Date(ms.due_at);
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        q = q.gte("due_at", start.toISOString()).lt("due_at", end.toISOString());
      }
    }
  }

  const { data: tasks, error } = await q.range(from, to);
  if (error) {
    return <main className="p-6">Error: {error.message}</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Tasks</h1>
      <Suspense fallback={<div>Loading…</div>}>
        <TasksClient
          projectId={projectId}
          tasks={tasks ?? []}
          page={page}
          pageSize={pageSize}
        />
      </Suspense>
    </main>
  );
}
