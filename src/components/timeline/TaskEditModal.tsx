"use client";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card, { CardTitle } from "@/components/ui/Card";

type Props = {
  taskId: string | null;
  onClose: () => void;
  onUpdate?: () => void;
};

export default function TaskEditModal({ taskId, onClose, onUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(taskId !== null);
  }, [taskId]);

  if (!isOpen || !taskId) return null;

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 200); // Allow animation to complete
  };

  // Note: This is a simplified modal. In a full implementation, you would:
  // 1. Fetch task details using taskId
  // 2. Show a form to edit the task
  // 3. Submit changes via server actions
  // For now, we'll just link to the task's project page

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200">
          <CardTitle className="mb-4">Task Actions</CardTitle>

          <p className="text-muted mb-6">
            Click below to view this task in its project page where you can edit it.
          </p>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Navigate to task's project page
                // In a real implementation, you'd use router.push
                window.location.href = `/projects/${taskId}/tasks`;
              }}
            >
              View Task
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
