"use client";

import { useState, useTransition } from "react";
import { updateMilestone, deleteMilestone } from "@/server-actions/milestones";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import ReminderModal from "@/components/ReminderModal";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";

interface Milestone {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

interface MilestoneRowProps {
  milestone: Milestone;
  isAdmin: boolean;
  projectId: string;
}

export default function MilestoneRow({ milestone, isAdmin, projectId }: MilestoneRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const [dueAt, setDueAt] = useState(
    milestone.due_at ? format(new Date(milestone.due_at), "yyyy-MM-dd") : ""
  );
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateMilestone(milestone.id, {
          title,
          dueAt: dueAt || null,
        });
        setToast({ message: "Milestone updated", variant: "success" });
        setIsEditing(false);
        router.refresh();
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : "Failed to update",
          variant: "error",
        });
      }
    });
  };

  const handleToggleStatus = () => {
    startTransition(async () => {
      try {
        await updateMilestone(milestone.id, {
          status: milestone.status === "open" ? "done" : "open",
        });
        setToast({
          message: `Milestone marked as ${milestone.status === "open" ? "done" : "open"}`,
          variant: "success",
        });
        router.refresh();
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : "Failed to update status",
          variant: "error",
        });
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteMilestone(milestone.id);
        setToast({ message: "Milestone deleted", variant: "success" });
        router.refresh();
        setShowConfirmDelete(false);
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : "Failed to delete",
          variant: "error",
        });
        setShowConfirmDelete(false);
      }
    });
  };

  const handleCancel = () => {
    setTitle(milestone.title);
    setDueAt(milestone.due_at ? format(new Date(milestone.due_at), "yyyy-MM-dd") : "");
    setIsEditing(false);
  };

  const isPastDue =
    milestone.due_at &&
    milestone.status !== "done" &&
    new Date(milestone.due_at) < new Date();

  return (
    <>
      <div className="p-4 bg-background rounded-[8px] border-2 border-border hover:border-primary/30 transition-colors">
        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-4">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milestone title"
            />
            <Input
              label="Due Date"
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isPending || !title}>
                {isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg">{milestone.title}</h3>
                  <Badge variant={milestone.status === "done" ? "success" : "default"}>
                    {milestone.status}
                  </Badge>
                  {isPastDue && (
                    <Badge variant="danger">
                      Overdue
                    </Badge>
                  )}
                </div>
                {milestone.due_at && (
                  <p className="text-sm text-muted">
                    Due: {format(new Date(milestone.due_at), "MMM d, yyyy")} (
                    {formatDistanceToNow(new Date(milestone.due_at), { addSuffix: true })})
                  </p>
                )}
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="text-sm"
                    onClick={() => setShowReminderModal(true)}
                    disabled={isPending}
                  >
                    Remind
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-sm"
                    onClick={handleToggleStatus}
                    disabled={isPending}
                  >
                    Mark {milestone.status === "open" ? "Done" : "Open"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-sm"
                    onClick={() => setIsEditing(true)}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                  {!showConfirmDelete ? (
                    <Button
                      variant="ghost"
                      className="text-sm text-red-600 hover:bg-red-50"
                      onClick={() => setShowConfirmDelete(true)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="text-xs bg-red-600 text-white hover:bg-red-700"
                        onClick={handleDelete}
                        disabled={isPending}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={() => setShowConfirmDelete(false)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Progress</span>
                <span className="font-semibold">
                  {milestone.completedTasks} / {milestone.totalTasks} tasks
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-4 overflow-hidden border-2 border-border">
                <div
                  className="h-full bg-sage-green flex items-center justify-center text-xs font-bold text-white transition-all duration-300"
                  style={{ width: `${milestone.progress}%` }}
                >
                  {milestone.progress > 15 && `${milestone.progress}%`}
                </div>
              </div>
              {milestone.progress <= 15 && milestone.progress > 0 && (
                <p className="text-xs text-muted mt-1">{milestone.progress}%</p>
              )}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        entityType="milestone"
        entityId={milestone.id}
        entityTitle={milestone.title}
        projectId={projectId}
      />
    </>
  );
}
