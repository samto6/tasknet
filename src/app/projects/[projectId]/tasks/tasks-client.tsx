"use client";
import { useOptimistic, useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { completeTask, assignSelf, unassignSelf, assignUser } from "@/server-actions/tasks";
import { addComment } from "@/server-actions/comments";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ReminderModal from "@/components/ReminderModal";

type Task = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  description: string | null;
  created_by: string;
};

type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
};

const statusColors = {
  todo: { border: "warm-gray-300", badge: "default" },
  in_progress: { border: "sage-green", badge: "success" },
  done: { border: "mint-green", badge: "success" },
};

export default function TasksClient({ projectId, tasks, page, pageSize, isAdmin, teamMembers = [] }: { projectId: string; tasks: Task[]; page: number; pageSize: number; isAdmin: boolean; teamMembers?: TeamMember[]; }) {
  const [, startTransition] = useTransition();
  const [optimisticTasks, mutate] = useOptimistic(tasks, (prev, action: { id: string; type: "done" }) => {
    if (action.type === "done") {
      return prev.map((t) => (t.id === action.id ? { ...t, status: "done" } as Task : t));
    }
    return prev;
  });

  async function markDone(id: string) {
    startTransition(async () => {
      mutate({ id, type: "done" });
      await completeTask(id);
    });
  }

  return (
    <div className="space-y-4">
      {optimisticTasks.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="heading-3 mb-2">No tasks yet</h3>
          <p className="text-muted">Create your first task to get started</p>
        </div>
      ) : (
        optimisticTasks.map((t) => (
          <TaskRow key={t.id} task={t} onMarkDone={() => markDone(t.id)} projectId={projectId} isAdmin={isAdmin} teamMembers={teamMembers} />
        ))
      )}

      {tasks.length > 0 && (
        <div className="flex gap-3 items-center justify-center mt-8">
          {page > 1 && (
            <a href={`?page=${page - 1}`}>
              <Button variant="secondary">← Previous</Button>
            </a>
          )}
          <span className="text-sm text-muted">Page {page}</span>
          {tasks.length === pageSize && (
            <a href={`?page=${page + 1}`}>
              <Button variant="secondary">Next →</Button>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onMarkDone, projectId, isAdmin, teamMembers }: { task: Task; onMarkDone: () => void; projectId: string; isAdmin: boolean; teamMembers: TeamMember[]; }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [sending, startTransition] = useTransition();
  const [mine, setMine] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const assignDropdownRef = useRef<HTMLDivElement>(null);

  // Close assign dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target as Node)) {
        setShowAssignDropdown(false);
      }
    }
    if (showAssignDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAssignDropdown]);

  const due = task.due_at ? new Date(task.due_at) : null;
  const overdue = due && due.getTime() < Date.now() && task.status !== "done";

  const statusColor = statusColors[task.status as keyof typeof statusColors] || statusColors.todo;

  // Get border color class based on status
  const getBorderClass = () => {
    if (overdue) return "border-dusty-rose bg-dusty-rose/5";
    if (task.status === "in_progress") return "border-sage-green";
    if (task.status === "done") return "border-mint-green";
    return "border-warm-gray-300";
  };

  return (
    <div className={`
      bg-surface rounded-[8px] p-5
      border-2 ${getBorderClass()}
      shadow-[4px_4px_0px_rgba(45,49,66,0.1)]
      transition-all duration-200
      hover:shadow-[6px_6px_0px_rgba(45,49,66,0.15)]
      hover:translate-x-[-2px] hover:translate-y-[-2px]
    `}>
      {/* Task Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <Badge variant={statusColor.badge as "default" | "success"}>
              {task.status.replace("_", " ")}
            </Badge>
          </div>

          {task.description && (
            <p className="text-sm text-muted mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 text-sm text-muted">
            {due && (
              <span className={overdue ? "text-dusty-rose font-medium" : ""}>
                {overdue && "⚠️ "}
                Due {due.toLocaleDateString()}
              </span>
            )}
            <span className="font-mono text-xs opacity-50">#{task.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* Task Actions */}
        <div className="flex items-center gap-2">
          {task.status !== "done" && (
            <Button onClick={onMarkDone} size="sm" variant="primary">
              ✓ Done
            </Button>
          )}
          <Button
            onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}/edit`)}
            size="sm"
            variant="secondary"
          >
            ✎ Edit
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setShowReminderModal(true)}
              size="sm"
              variant="secondary"
            >
              Remind
            </Button>
          )}
          {isAdmin && teamMembers.length > 0 && (
            <div className="relative" ref={assignDropdownRef}>
              <Button
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                size="sm"
                variant="secondary"
              >
                Assign to ▾
              </Button>
              {showAssignDropdown && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-background border-2 border-border rounded-[6px] shadow-lg z-10 max-h-60 overflow-y-auto">
                  {/* Assign All button */}
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        for (const member of teamMembers) {
                          await assignUser(task.id, member.id);
                        }
                        setShowAssignDropdown(false);
                      });
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-sage-green hover:bg-sage-green/10 transition-colors border-b-2 border-border"
                  >
                    ✓ Assign All ({teamMembers.length})
                  </button>
                  {teamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        startTransition(async () => {
                          await assignUser(task.id, member.id);
                          setShowAssignDropdown(false);
                        });
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface transition-colors border-b border-border last:border-b-0"
                    >
                      {member.name || member.email || "Unknown"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!mine ? (
            <Button
              onClick={() => {
                setMine(true);
                startTransition(async () => {
                  await assignSelf(task.id);
                });
              }}
              size="sm"
              variant="secondary"
            >
              Assign me
            </Button>
          ) : (
            <Button
              onClick={() => {
                setMine(false);
                startTransition(async () => {
                  await unassignSelf(task.id);
                });
              }}
              size="sm"
              variant="ghost"
            >
              Unassign
            </Button>
          )}
        </div>
      </div>

      {/* Comment Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const body = comment.trim();
          if (!body) return;
          startTransition(async () => {
            await addComment(task.id, body);
            setComment("");
          });
        }}
        className="mt-4 pt-4 border-t-2 border-border"
      >
        <div className="flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm placeholder:text-muted focus:border-sage-green focus:outline-none"
            placeholder="Add a comment… mention with @email"
            disabled={sending}
          />
          <Button type="submit" size="sm" disabled={!comment.trim() || sending}>
            {sending ? "..." : "Comment"}
          </Button>
        </div>
      </form>

      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        entityType="task"
        entityId={task.id}
        entityTitle={task.title}
        projectId={projectId}
      />
    </div>
  );
}
