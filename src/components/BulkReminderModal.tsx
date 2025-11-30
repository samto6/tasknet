"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import {
  sendTaskReminderAction,
  sendMilestoneReminderAction,
  getProjectMembers,
  getUpcomingItems,
} from "@/server-actions/reminders";

interface BulkReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface TaskItem {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
  task_assignees?: { user_id: string }[];
}

interface MilestoneItem {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  role?: string;
}

export default function BulkReminderModal({
  isOpen,
  onClose,
  projectId,
}: BulkReminderModalProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([]);
  const [recipientMode, setRecipientMode] = useState<"assignees" | "all">("assignees");
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [items, memberList] = await Promise.all([
        getUpcomingItems(projectId),
        getProjectMembers(projectId),
      ]);
      setTasks(items.tasks);
      setMilestones(items.milestones);
      setMembers(memberList);
      // Select all by default
      setSelectedTasks(items.tasks.map((t) => t.id));
      setSelectedMilestones(items.milestones.map((m) => m.id));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleTask(id: string) {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleMilestone(id: string) {
    setSelectedMilestones((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    if (selectedTasks.length === 0 && selectedMilestones.length === 0) return;

    setSending(true);
    setResult(null);
    let totalSent = 0;
    let totalRecipients = 0;

    try {
      // Send task reminders
      for (const taskId of selectedTasks) {
        const task = tasks.find((t) => t.id === taskId);
        let recipientIds: string[];

        if (recipientMode === "assignees" && task?.task_assignees?.length) {
          recipientIds = task.task_assignees.map((a) => a.user_id);
        } else {
          recipientIds = members.map((m) => m.id);
        }

        if (recipientIds.length > 0) {
          const res = await sendTaskReminderAction(taskId, recipientIds);
          totalSent += res.sent;
          totalRecipients += res.total;
        }
      }

      // Send milestone reminders
      for (const milestoneId of selectedMilestones) {
        const recipientIds = members.map((m) => m.id);
        if (recipientIds.length > 0) {
          const res = await sendMilestoneReminderAction(milestoneId, recipientIds);
          totalSent += res.sent;
          totalRecipients += res.total;
        }
      }

      setResult({ sent: totalSent, total: totalRecipients });
    } catch (error) {
      console.error("Failed to send reminders:", error);
      alert(error instanceof Error ? error.message : "Failed to send reminders");
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border-2 border-border rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Send Bulk Reminders</h2>
          <p className="text-sm text-muted mt-1">
            Send reminders for upcoming tasks and milestones
          </p>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : result ? (
            <div className="text-center py-4">
              <p className="text-lg font-medium text-sage-green">
                Sent {result.sent} of {result.total} reminders
              </p>
              <p className="text-sm text-muted mt-2">
                Recipients with email notifications disabled were skipped.
              </p>
            </div>
          ) : (
            <>
              {/* Recipient mode */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Send to:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientMode("assignees")}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      recipientMode === "assignees"
                        ? "bg-sage-green text-white border-sage-green"
                        : "border-border hover:bg-surface"
                    }`}
                  >
                    Task Assignees
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("all")}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      recipientMode === "all"
                        ? "bg-sage-green text-white border-sage-green"
                        : "border-border hover:bg-surface"
                    }`}
                  >
                    All Members ({members.length})
                  </button>
                </div>
              </div>

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Tasks due this week ({tasks.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-border rounded-md">
                    {tasks.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-center gap-3 p-2 hover:bg-surface cursor-pointer border-b border-border last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleTask(task.id)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{task.title}</div>
                          {task.due_at && (
                            <div className="text-xs text-muted">
                              Due: {new Date(task.due_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {milestones.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Milestones due this week ({milestones.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-border rounded-md">
                    {milestones.map((milestone) => (
                      <label
                        key={milestone.id}
                        className="flex items-center gap-3 p-2 hover:bg-surface cursor-pointer border-b border-border last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMilestones.includes(milestone.id)}
                          onChange={() => toggleMilestone(milestone.id)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{milestone.title}</div>
                          {milestone.due_at && (
                            <div className="text-xs text-muted">
                              Due: {new Date(milestone.due_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {tasks.length === 0 && milestones.length === 0 && (
                <div className="text-center py-4 text-muted">
                  No upcoming tasks or milestones due in the next week.
                </div>
              )}

              <p className="text-xs text-muted">
                {selectedTasks.length + selectedMilestones.length} item(s) selected
              </p>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              loading={sending}
              disabled={selectedTasks.length === 0 && selectedMilestones.length === 0}
            >
              Send Reminders
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
