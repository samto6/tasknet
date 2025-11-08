"use client";

import { useState, useTransition } from "react";
import { createMilestone } from "@/server-actions/milestones";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface NewMilestoneFormProps {
  projectId: string;
}

export default function NewMilestoneForm({ projectId }: NewMilestoneFormProps) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("title", title);
    if (dueAt) {
      formData.set("dueAt", dueAt);
    }

    startTransition(async () => {
      try {
        await createMilestone(formData);
        setToast({ message: "Milestone created successfully", variant: "success" });
        setTitle("");
        setDueAt("");
        router.refresh();
      } catch (error) {
        setToast({
          message:
            error instanceof Error ? error.message : "Failed to create milestone",
          variant: "error",
        });
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Project Proposal"
          required
          hint="Give your milestone a clear, descriptive name"
        />

        <Input
          label="Due Date (Optional)"
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          hint="When should this milestone be completed?"
        />

        <Button type="submit" disabled={isPending || !title} className="w-full">
          {isPending ? "Creating..." : "Create Milestone"}
        </Button>
      </form>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
