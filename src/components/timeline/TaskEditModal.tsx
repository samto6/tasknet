"use client";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card, { CardTitle } from "@/components/ui/Card";
import { getTask, updateTask } from "@/server-actions/tasks";
import { getProjectMilestones } from "@/server-actions/milestones";

type TaskData = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "done";
  due_at: string | null;
  size: number | null;
  milestone_id: string | null;
  project_id: string;
};

type Milestone = {
  id: string;
  title: string;
};

type Props = {
  taskId: string | null;
  onClose: () => void;
  onUpdate?: () => void;
};

export default function TaskEditModal({ taskId, onClose, onUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [task, setTask] = useState<TaskData | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"open" | "in_progress" | "done">("open");
  const [dueAt, setDueAt] = useState("");
  const [size, setSize] = useState<string>("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    setIsOpen(taskId !== null);
    if (taskId) {
      setLoading(true);
      setError(null);
      
      // Fetch task data
      getTask(taskId)
        .then((data) => {
          setTask(data as TaskData);
          setTitle(data.title);
          setDescription(data.description || "");
          setStatus(data.status as "open" | "in_progress" | "done");
          setDueAt(data.due_at ? data.due_at.slice(0, 16) : ""); // Format for datetime-local
          setSize(data.size?.toString() || "");
          setMilestoneId(data.milestone_id || "");
          
          // Fetch milestones for this project
          return getProjectMilestones(data.project_id);
        })
        .then((milestonesData) => {
          setMilestones(milestonesData.map((m) => ({ id: m.id, title: m.title })));
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || "Failed to load task");
          setLoading(false);
        });
    }
  }, [taskId]);

  if (!isOpen || !taskId) return null;

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await updateTask(taskId, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        due_at: dueAt || null,
        size: size ? parseInt(size, 10) : null,
        milestone_id: milestoneId || null,
      });
      
      onUpdate?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
          <CardTitle className="mb-4">Edit Task</CardTitle>

          {loading ? (
            <div className="py-8 text-center text-muted">Loading...</div>
          ) : error && !task ? (
            <div className="py-8 text-center">
              <p className="text-dusty-rose mb-4">{error}</p>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-sage-green focus:outline-none"
                  placeholder="Task title"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-sage-green focus:outline-none resize-none"
                  placeholder="Optional description"
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "open" | "in_progress" | "done")}
                  className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-sage-green focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="dueAt" className="block text-sm font-medium mb-1">
                  Due Date
                </label>
                <input
                  id="dueAt"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-sage-green focus:outline-none"
                />
              </div>

              {/* Size (Story Points) */}
              <div>
                <label htmlFor="size" className="block text-sm font-medium mb-1">
                  Size (Story Points)
                </label>
                <input
                  id="size"
                  type="number"
                  min="1"
                  max="13"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-sage-green focus:outline-none"
                  placeholder="e.g., 1, 2, 3, 5, 8, 13"
                />
              </div>

              {/* Milestone */}
              {milestones.length > 0 && (
                <div>
                  <label htmlFor="milestone" className="block text-sm font-medium mb-1">
                    Milestone
                  </label>
                  <select
                    id="milestone"
                    value={milestoneId}
                    onChange={(e) => setMilestoneId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-sage-green focus:outline-none"
                  >
                    <option value="">No milestone</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Error message */}
              {error && (
                <p className="text-sm text-dusty-rose">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !title.trim()}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
