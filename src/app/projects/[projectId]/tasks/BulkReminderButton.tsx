"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import BulkReminderModal from "@/components/BulkReminderModal";

interface BulkReminderButtonProps {
  projectId: string;
}

export default function BulkReminderButton({ projectId }: BulkReminderButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
        <span className="mr-2">📧</span>
        Send Reminders
      </Button>

      <BulkReminderModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        projectId={projectId}
      />
    </>
  );
}
