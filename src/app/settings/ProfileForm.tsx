"use client";

import { useState, useTransition } from "react";
import { updateUserProfile } from "@/server-actions/settings";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  name: string;
  email: string;
}

export default function ProfileForm({ name, email }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(name);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateUserProfile(formData);
        setToast({ message: "Profile updated successfully", variant: "success" });
        router.refresh();
      } catch (error) {
        setToast({
          message:
            error instanceof Error ? error.message : "Failed to update profile",
          variant: "error",
        });
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Display Name"
          name="name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your name"
          required
          hint="This name will be visible to your teammates"
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          disabled
          hint="Email cannot be changed"
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending || displayName === name}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          {displayName !== name && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDisplayName(name)}
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
