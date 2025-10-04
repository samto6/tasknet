import { supabaseServer } from "@/lib/supabase/server";
import TasksClient from "./";
import { Suspense } from "react";

type Search = { page?: string; filter?: "me" | "week" | "milestone"; milestone_id?: string };

export default async function ProjectTasksPage({ params, searchParams }: { params: { projectId: string }, searchParams: Search }) {
  const supabase = await supabaseServer();

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("tasks")
    .select("id,title,status,due_at,description,created_by")
    .eq("project_id", params.projectId)
    .order("due_at", { ascending: true, nullsFirst: true });

  // basic filters
  const filter = searchParams.filter;
  if (filter === "me") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) q = q.eq("created_by", user.id);
  } else if (filter === "week") {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    q = q.gte("due_at", start.toISOString()).lt("due_at", end.toISOString());
  } else if (filter === "milestone" && searchParams.milestone_id) {
    // select tasks due before/after milestone? For MVP, fetch tasks with due_at == milestone due day
    const { data: ms } = await supabase
      .from("milestones")
      .select("due_at")
      .eq("id", searchParams.milestone_id)
      .maybeSingle();
    if (ms?.due_at) {
      const start = new Date(ms.due_at);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      q = q.gte("due_at", start.toISOString()).lt("due_at", end.toISOString());
    }
  }

  const { data: tasks, error, count } = await q.range(from, to).select();
  if (error) {
    return <main className="p-6">Error: {error.message}</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Tasks</h1>
      <Suspense fallback={<div>Loading…</div>}>
        <TasksClient
          projectId={params.projectId}
          tasks={tasks ?? []}
          page={page}
          pageSize={pageSize}
        />
      </Suspense>
    </main>
  );
}
