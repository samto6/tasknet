"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "@/server-actions/notifications";
import {
  getNotificationIcon,
  getNotificationMessage,
  getNotificationLink,
  formatRelativeTime,
  type Notification,
} from "@/lib/notifications";

// Poll interval for checking new notifications (60 seconds)
const POLL_INTERVAL = 60000;

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load unread count on mount and set up polling
  useEffect(() => {
    loadUnreadCount();

    // Poll for new notifications periodically
    const interval = setInterval(() => {
      loadUnreadCount();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  async function loadUnreadCount() {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const items = await getNotifications(5, 0);
      setNotifications(items);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    try {
      // Mark as read if unread
      if (!notification.read_at) {
        await markAsRead(notification.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
      }

      // Navigate to the link
      const link = getNotificationLink(notification);
      setIsOpen(false);
      router.push(link);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }

  function toggleDropdown() {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadNotifications();
      loadUnreadCount();
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 hover:bg-surface rounded-[6px] transition-colors"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6 text-muted hover:text-foreground transition-colors"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-dusty-rose text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border-2 border-border rounded-[8px] shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b-2 border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-sage-green hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <div className="text-4xl mb-2">📭</div>
                <div className="text-sm">No notifications</div>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 border-b border-border hover:bg-surface transition-colors text-left ${
                    !notification.read_at ? "bg-sage-green/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.kind)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {getNotificationMessage(notification)}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="w-2 h-2 bg-sage-green rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t-2 border-border bg-surface">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-sage-green hover:underline block text-center"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
