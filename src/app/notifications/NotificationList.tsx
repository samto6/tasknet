"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} from "@/server-actions/notifications";
import {
  getNotificationIcon,
  getNotificationMessage,
  getNotificationLink,
  formatRelativeTime,
  type Notification,
} from "@/lib/notifications";

interface NotificationListProps {
  initialNotifications: Notification[];
}

export default function NotificationList({ initialNotifications }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();

  const filteredNotifications = notifications.filter((n) =>
    filter === "unread" ? !n.read_at : true
  );

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleNotificationClick(notification: Notification) {
    try {
      // Mark as read if unread
      if (!notification.read_at) {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
      }

      // Navigate to the link
      const link = getNotificationLink(notification);
      router.push(link);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }

  async function handleDeleteNotification(notificationId: string, event: React.MouseEvent) {
    event.stopPropagation();
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }

  async function handleDeleteAllRead() {
    try {
      await deleteAllRead();
      setNotifications((prev) => prev.filter((n) => !n.read_at));
    } catch (error) {
      console.error("Failed to delete read notifications:", error);
    }
  }

  return (
    <div>
      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-[6px] transition-colors ${
              filter === "all"
                ? "bg-sage-green text-white"
                : "bg-surface text-muted hover:bg-warm-gray-200"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 text-sm font-medium rounded-[6px] transition-colors ${
              filter === "unread"
                ? "bg-sage-green text-white"
                : "bg-surface text-muted hover:bg-warm-gray-200"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
          {notifications.some((n) => n.read_at) && (
            <Button variant="secondary" size="sm" onClick={handleDeleteAllRead}>
              Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-6xl mb-4">
            {filter === "unread" ? "✅" : "📭"}
          </div>
          <p className="text-muted">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full p-4 border-2 border-border rounded-[8px] hover:border-sage-green transition-colors text-left ${
                !notification.read_at ? "bg-sage-green/5" : "bg-surface"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="text-3xl flex-shrink-0">
                  {getNotificationIcon(notification.kind)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium mb-1">
                    {getNotificationMessage(notification)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {!notification.read_at && (
                    <div className="w-2 h-2 bg-sage-green rounded-full"></div>
                  )}
                  <button
                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                    className="text-muted hover:text-dusty-rose transition-colors p-1"
                    aria-label="Delete notification"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
