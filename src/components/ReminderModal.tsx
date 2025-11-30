"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import {
  sendTaskReminderAction,
  sendMilestoneReminderAction,
  getTaskAssignees,
  getProjectMembers,
} from "@/server-actions/reminders";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  role?: string;
}

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "task" | "milestone";
  entityId: string;
  entityTitle: string;
  projectId: string;
}

export default function ReminderModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityTitle,
  projectId,
}: ReminderModalProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [assignees, setAssignees] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recipientMode, setRecipientMode] = useState<"assignees" | "all" | "custom">("assignees");
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRecipients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entityId, projectId]);

  async function loadRecipients() {
    setLoading(true);
    try {
      const [assigneeList, memberList] = await Promise.all([
        entityType === "task" ? getTaskAssignees(entityId) : Promise.resolve([]),
        getProjectMembers(projectId),
      ]);
      setAssignees(assigneeList);
      setAllMembers(memberList);

      // Default select assignees if available, otherwise all members
      if (assigneeList.length > 0) {
        setSelectedIds(assigneeList.map((a) => a.id));
        setRecipientMode("assignees");
      } else {
        setSelectedIds(memberList.map((m) => m.id));
        setRecipientMode("all");
      }
    } catch (error) {
      console.error("Failed to load recipients:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(mode: "assignees" | "all" | "custom") {
    setRecipientMode(mode);
    if (mode === "assignees") {
      setSelectedIds(assignees.map((a) => a.id));
    } else if (mode === "all") {
      setSelectedIds(allMembers.map((m) => m.id));
    }
    // custom keeps current selection
  }

  function toggleMember(id: string) {
    setRecipientMode("custom");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    if (selectedIds.length === 0) return;

    setSending(true);
    setResult(null);
    try {
      const res =
        entityType === "task"
          ? await sendTaskReminderAction(entityId, selectedIds)
          : await sendMilestoneReminderAction(entityId, selectedIds);
      setResult(res);
    } catch (error) {
      console.error("Failed to send reminder:", error);
      alert(error instanceof Error ? error.message : "Failed to send reminder");
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border-2 border-border rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Send Reminder</h2>
          <p className="text-sm text-muted mt-1">
            {entityType === "task" ? "Task" : "Milestone"}: {entityTitle}
          </p>
        </div>

        <div className="p-4 min-h-[280px]">
          {loading ? (
            <div className="flex items-center justify-center h-[200px]">
              <div className="text-center">
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-muted">Loading recipients...</p>
              </div>
            </div>
          ) : result ? (
            <div className="flex items-center justify-center h-[200px]">
              <div className="text-center">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-xl font-semibold text-sage-green">
                  Sent {result.sent} of {result.total} reminders
                </p>
                <p className="text-sm text-muted mt-3">
                  {result.sent === result.total 
                    ? "All recipients will receive notifications."
                    : "Some recipients had email notifications disabled."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mode selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Send to:</label>
                <div className="flex flex-wrap gap-2">
                  {assignees.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleModeChange("assignees")}
                      className={`px-3 py-1 text-sm rounded-md border ${
                        recipientMode === "assignees"
                          ? "bg-sage-green text-white border-sage-green"
                          : "border-border hover:bg-surface"
                      }`}
                    >
                      Assignees ({assignees.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleModeChange("all")}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      recipientMode === "all"
                        ? "bg-sage-green text-white border-sage-green"
                        : "border-border hover:bg-surface"
                    }`}
                  >
                    All Members ({allMembers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("custom")}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      recipientMode === "custom"
                        ? "bg-sage-green text-white border-sage-green"
                        : "border-border hover:bg-surface"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Member list */}
              <div className="max-h-48 overflow-y-auto border border-border rounded-md">
                {allMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-2 hover:bg-surface cursor-pointer border-b border-border last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {member.name || member.email || "Unknown"}
                      </div>
                      {member.name && member.email && (
                        <div className="text-xs text-muted truncate">
                          {member.email}
                        </div>
                      )}
                    </div>
                    {assignees.some((a) => a.id === member.id) && (
                      <span className="text-xs bg-sage-green/20 text-sage-green px-2 py-0.5 rounded">
                        Assignee
                      </span>
                    )}
                  </label>
                ))}
              </div>

              <p className="text-xs text-muted mt-2">
                {selectedIds.length} recipient{selectedIds.length !== 1 ? "s" : ""} selected
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
              disabled={selectedIds.length === 0}
            >
              Send Reminder
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
