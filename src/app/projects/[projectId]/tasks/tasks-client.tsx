"use client";
import { useOptimistic, useState, useTransition } from "react";
import { completeTask, assignSelf, unassignSelf } from "@/server-actions/tasks";
import { addComment } from "@/server-actions/comments";

type Task = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  description: string | null;
  created_by: string;
};

export default function TasksClient({ projectId, tasks, page, pageSize }: { projectId: string; tasks: Task[]; page: number; pageSize: number; }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticTasks, mutate] = useOptimistic(tasks, (prev, action: { id: string; type: "done" }) => {
    if (action.type === "done") {
      return prev.map((t) => (t.id === action.id ? { ...t, status: "done" } as Task : t));
    }
    return prev;
  });

  async function markDone(id: string) {
    mutate({ id, type: "done" });
    startTransition(async () => {
      await completeTask(id);
    });
  }

  return (
    <div className="space-y-4">
      {optimisticTasks.map((t) => (
        <TaskRow key={t.id} task={t} onMarkDone={() => markDone(t.id)} />
      ))}
      <div className="flex gap-2 items-center mt-6">
        {page > 1 && (
          <a className="underline" href={`?page=${page - 1}`}>Previous</a>
        )}
        {tasks.length === pageSize && (
          <a className="underline" href={`?page=${page + 1}`}>Next</a>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, onMarkDone }: { task: Task; onMarkDone: () => void }) {
  const [comment, setComment] = useState("");
  const [sending, startTransition] = useTransition();
  const [mine, setMine] = useState(false);

  const due = task.due_at ? new Date(task.due_at) : null;
  const overdue = due && due.getTime() < Date.now() && task.status !== "done";

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{task.title}</div>
          <div className={`text-sm ${overdue ? "text-red-600" : "opacity-60"}`}>
            {task.status}{due ? ` • due ${due.toLocaleDateString()}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.status !== "done" && (
            <button onClick={onMarkDone} className="px-3 py-1 rounded bg-emerald-600 text-white">Mark done</button>
          )}
          {!mine ? (
            <button
              onClick={() => {
                setMine(true);
                startTransition(async () => {
                  await assignSelf(task.id);
                });
              }}
              className="px-3 py-1 rounded border"
            >Assign me</button>
          ) : (
            <button
              onClick={() => {
                setMine(false);
                startTransition(async () => {
                  await unassignSelf(task.id);
                });
              }}
              className="px-3 py-1 rounded border"
            >Unassign</button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <form action={async () => { "use server"; }} onSubmit={(e) => {
          e.preventDefault();
          const body = comment.trim();
          if (!body) return;
          startTransition(async () => {
            await addComment(task.id, body);
            setComment("");
          });
        }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Comment… mention with @email"
          />
        </form>
      </div>
    </div>
  );
}
