/**
 * Notification type definitions
 */
export type NotificationKind = "due_tomorrow" | "manual_reminder" | "mention" | "assignment" | "weekly_digest";

export interface NotificationPayload {
  type?: "task" | "milestone";
  taskId?: string;
  milestoneId?: string;
  entityId?: string;
  title?: string;
  due_at?: string;
  dueAt?: string;
  projectId?: string;
  projectName?: string;
  senderName?: string;
  daysUntilDue?: number;
  sentBy?: string;
  body?: string; // For mention notifications
  count?: number; // For weekly digest notifications
  assignerName?: string; // For assignment notifications
  assignedBy?: string; // User ID of who assigned the task
  mentionedBy?: string; // User ID of who mentioned
  mentionerName?: string; // Name of who mentioned
}

export interface Notification {
  id: string;
  kind: string;
  payload_json: NotificationPayload;
  read_at: string | null;
  created_at: string;
}

/**
 * Get icon for notification type
 */
export function getNotificationIcon(kind: string): string {
  switch (kind) {
    case "due_tomorrow":
    case "manual_reminder":
      return "🔔";
    case "mention":
      return "💬";
    case "assignment":
      return "📋";
    case "weekly_digest":
      return "📊";
    default:
      return "📬";
  }
}

/**
 * Format notification message for display
 */
export function getNotificationMessage(notification: Notification): string {
  const { kind, payload_json } = notification;
  const payload = payload_json || {};

  switch (kind) {
    case "due_tomorrow": {
      const entityType = payload.type || "task";
      const title = payload.title || "Untitled";
      const daysUntilDue = payload.daysUntilDue ?? 1;

      if (daysUntilDue === 1) {
        return `${entityType === "task" ? "Task" : "Milestone"} "${title}" is due tomorrow`;
      } else if (daysUntilDue === 0) {
        return `${entityType === "task" ? "Task" : "Milestone"} "${title}" is due today`;
      } else {
        return `${entityType === "task" ? "Task" : "Milestone"} "${title}" is due in ${daysUntilDue} days`;
      }
    }

    case "manual_reminder": {
      const entityType = payload.type || "task";
      const title = payload.title || "Untitled";
      const senderName = payload.senderName || "A team admin";
      return `${senderName} sent you a reminder about ${entityType} "${title}"`;
    }

    case "mention": {
      const title = payload.title;
      const mentionerName = payload.mentionerName || "Someone";
      if (title) {
        return `${mentionerName} mentioned you in "${title}"`;
      }
      return `${mentionerName} mentioned you in a comment`;
    }

    case "assignment": {
      const title = payload.title || "a task";
      const assignerName = payload.assignerName || "Someone";
      return `${assignerName} assigned you to "${title}"`;
    }

    case "weekly_digest": {
      const count = payload.count ?? 0;
      return `Your weekly summary is ready (${count} activities)`;
    }

    default:
      return "You have a new notification";
  }
}

/**
 * Get navigation link for notification
 */
export function getNotificationLink(notification: Notification): string {
  const { kind, payload_json } = notification;
  const payload = payload_json || {};

  switch (kind) {
    case "due_tomorrow":
    case "manual_reminder": {
      const entityType = payload.type || "task";
      const projectId = payload.projectId;

      if (entityType === "task") {
        return projectId ? `/projects/${projectId}/tasks` : "/dashboard";
      } else {
        return projectId ? `/projects/${projectId}/milestones` : "/dashboard";
      }
    }

    case "mention": {
      const taskId = payload.taskId;
      const projectId = payload.projectId;
      if (projectId) {
        return `/projects/${projectId}/tasks`;
      }
      return "/dashboard";
    }

    case "assignment": {
      const projectId = payload.projectId;
      if (projectId) {
        return `/projects/${projectId}/tasks`;
      }
      return "/dashboard";
    }

    case "weekly_digest":
      return "/dashboard";

    default:
      return "/dashboard";
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
