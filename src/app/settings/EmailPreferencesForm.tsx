"use client";

import { useState, useTransition } from "react";
import { updateEmailPreferences } from "@/server-actions/settings";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface EmailPreferencesFormProps {
  emailMentions: boolean;
  emailDue: boolean;
  emailDigest: boolean;
}

export default function EmailPreferencesForm({
  emailMentions,
  emailDue,
  emailDigest,
}: EmailPreferencesFormProps) {
  const [mentions, setMentions] = useState(emailMentions);
  const [due, setDue] = useState(emailDue);
  const [digest, setDigest] = useState(emailDigest);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const router = useRouter();

  const hasChanges =
    mentions !== emailMentions ||
    due !== emailDue ||
    digest !== emailDigest;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.set("emailMentions", mentions.toString());
    formData.set("emailDue", due.toString());
    formData.set("emailDigest", digest.toString());

    startTransition(async () => {
      try {
        await updateEmailPreferences(formData);
        setToast({
          message: "Email preferences updated successfully",
          variant: "success",
        });
        router.refresh();
      } catch (error) {
        setToast({
          message:
            error instanceof Error
              ? error.message
              : "Failed to update preferences",
          variant: "error",
        });
      }
    });
  };

  const handleReset = () => {
    setMentions(emailMentions);
    setDue(emailDue);
    setDigest(emailDigest);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mentions */}
        <div className="flex items-start gap-3 p-4 bg-background rounded-[8px] border-2 border-border">
          <input
            type="checkbox"
            id="mentions"
            checked={mentions}
            onChange={(e) => setMentions(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="mentions"
              className="font-bold text-sm cursor-pointer block mb-1"
            >
              Mention Notifications
            </label>
            <p className="text-sm text-muted">
              Get notified when someone @mentions you in a comment
            </p>
          </div>
        </div>

        {/* Due Tasks */}
        <div className="flex items-start gap-3 p-4 bg-background rounded-[8px] border-2 border-border">
          <input
            type="checkbox"
            id="due"
            checked={due}
            onChange={(e) => setDue(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="due"
              className="font-bold text-sm cursor-pointer block mb-1"
            >
              Due Task Reminders
            </label>
            <p className="text-sm text-muted">
              Get reminded when tasks assigned to you are due tomorrow
            </p>
          </div>
        </div>

        {/* Weekly Digest */}
        <div className="flex items-start gap-3 p-4 bg-background rounded-[8px] border-2 border-border">
          <input
            type="checkbox"
            id="digest"
            checked={digest}
            onChange={(e) => setDigest(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="digest"
              className="font-bold text-sm cursor-pointer block mb-1"
            >
              Weekly Digest
            </label>
            <p className="text-sm text-muted">
              Receive a weekly summary of your team&apos;s progress and activity
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending || !hasChanges}>
            {isPending ? "Saving..." : "Save Preferences"}
          </Button>
          {hasChanges && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
        </div>
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
