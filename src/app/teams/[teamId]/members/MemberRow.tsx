"use client";

import { useState, useTransition } from "react";
import { removeMemberFromTeam, updateMemberRole } from "@/server-actions/teams";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/Toast";

interface Member {
  userId: string;
  name: string;
  email: string | null;
  role: string;
  joinedAt: string;
  completedTasks: number;
  currentStreak: number;
  longestStreak: number;
}

interface MemberRowProps {
  member: Member;
  teamId: string;
  isAdmin: boolean;
  isCurrentUser: boolean;
}

export default function MemberRow({
  member,
  teamId,
  isAdmin,
  isCurrentUser,
}: MemberRowProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const router = useRouter();

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeMemberFromTeam(teamId, member.userId);
        setToast({ message: "Member removed successfully", variant: "success" });
        router.refresh();
        setShowConfirm(false);
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : "Failed to remove member",
          variant: "error",
        });
        setShowConfirm(false);
      }
    });
  };

  const handleRoleChange = (newRole: "admin" | "member") => {
    startTransition(async () => {
      try {
        await updateMemberRole(teamId, member.userId, newRole);
        setToast({
          message: `Role updated to ${newRole}`,
          variant: "success",
        });
        router.refresh();
      } catch (error) {
        setToast({
          message:
            error instanceof Error ? error.message : "Failed to update role",
          variant: "error",
        });
      }
    });
  };

  return (
    <>
      <div className="p-4 bg-background rounded-[8px] border-2 border-border hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Member Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold truncate">{member.name}</h3>
                  {isCurrentUser && (
                    <span className="text-xs text-muted">(You)</span>
                  )}
                </div>
                {member.email && (
                  <p className="text-sm text-muted truncate">{member.email}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm flex-wrap">
              <div>
                <span className="text-muted">Role:</span>{" "}
                <Badge variant={member.role === "admin" ? "success" : "default"}>
                  {member.role}
                </Badge>
              </div>
              <div>
                <span className="text-muted">Tasks:</span>{" "}
                <span className="font-semibold">{member.completedTasks}</span>
              </div>
              <div>
                <span className="text-muted">Streak:</span>{" "}
                <span className="font-semibold">
                  {member.currentStreak} 🔥
                </span>
              </div>
              <div>
                <span className="text-muted">Best:</span>{" "}
                <span className="font-semibold">{member.longestStreak}</span>
              </div>
              <div>
                <span className="text-muted">Joined:</span>{" "}
                <span className="font-semibold">
                  {formatDistanceToNow(new Date(member.joinedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && !isCurrentUser && (
            <div className="flex gap-2">
              {member.role === "member" ? (
                <Button
                  variant="secondary"
                  className="text-sm"
                  onClick={() => handleRoleChange("admin")}
                  disabled={isPending}
                >
                  Make Admin
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="text-sm"
                  onClick={() => handleRoleChange("member")}
                  disabled={isPending}
                >
                  Demote to Member
                </Button>
              )}

              {!showConfirm ? (
                <Button
                  variant="ghost"
                  className="text-sm text-red-600 hover:bg-red-50"
                  onClick={() => setShowConfirm(true)}
                  disabled={isPending}
                >
                  Remove
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="text-sm bg-red-600 text-white hover:bg-red-700"
                    onClick={handleRemove}
                    disabled={isPending}
                  >
                    {isPending ? "Removing..." : "Confirm"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-sm"
                    onClick={() => setShowConfirm(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
