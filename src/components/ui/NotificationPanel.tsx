"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, X, Check, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "./button";
import { Badge } from "./badge";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!response.ok) return;

      const data = await response.json();
      if (data?.success && Array.isArray(data?.data?.notifications)) {
        const items: Notification[] = data.data.notifications;
        setNotifications(items);
        const totalUnread =
          typeof data.data.unreadCount === "number"
            ? data.data.unreadCount
            : items.filter((n) => !n.isRead).length;
        setUnreadCount(totalUnread);
      }
    } catch {
      // Silently ignore transient network failures during background poll
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Initial fetch, visibility & focus gated polling, and cross-view sync
  useEffect(() => {
    if (document.visibilityState === "visible") {
      fetchNotifications();
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) {
        fetchNotifications();
      }
    }, 60000);

    const handleNotificationsUpdated = () => {
      fetchNotifications();
    };
    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener(
        "notifications-updated",
        handleNotificationsUpdated
      );
    };
  }, [fetchNotifications]);

  // Dismiss on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Just now";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) fetchNotifications();
        }}
        className="relative rounded-full"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 text-[11px] tabular-nums shadow-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Notifications panel"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", duration: 0.24, bounce: 0 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[32rem] overflow-hidden flex flex-col z-50 rounded-2xl border border-border/80 bg-popover/95 text-popover-foreground backdrop-blur-xl backdrop-saturate-150 shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-primary/5">
              <h3 className="text-sm font-semibold tracking-tight">
                Notifications
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 px-2 text-xs"
                  >
                    <Check size={13} className="mr-1" aria-hidden="true" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close notifications"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 rounded-lg"
                >
                  <X size={14} aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto flex-grow">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      role="button"
                      tabIndex={0}
                      className={`p-3.5 hover:bg-accent/70 cursor-pointer flex gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                        !notification.isRead ? "bg-primary/5" : ""
                      }`}
                      onClick={() =>
                        !notification.isRead && markAsRead(notification._id)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (!notification.isRead) {
                            markAsRead(notification._id);
                          }
                        }
                      }}
                    >
                      <div
                        className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                          !notification.isRead ? "bg-primary" : "bg-transparent"
                        }`}
                      />
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between gap-2">
                          <h4 className="text-sm font-medium truncate">
                            {notification.title}
                          </h4>
                          <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs mt-1 text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 border-t border-border/70 bg-muted/40 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground w-full"
                asChild
              >
                <Link
                  href="/profile/notifications"
                  onClick={() => setIsOpen(false)}
                >
                  View all notifications
                  <ExternalLink size={12} className="ml-1" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
