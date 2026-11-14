"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Bell, ArrowLeft, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { requestJson } from '@/components/dashboard/requestJson';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await requestJson<{
        success?: boolean;
        data?: { notifications?: Notification[]; unreadCount?: number };
      }>('/api/notifications?limit=50', undefined, 'Failed to fetch notifications');

      const list = Array.isArray(data.data?.notifications) ? data.data.notifications : [];
      setNotifications(list);
      setUnreadCount(
        typeof data.data?.unreadCount === 'number'
          ? data.data.unreadCount
          : list.filter((n) => !n.isRead).length
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await requestJson(
        '/api/notifications/mark-read',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notificationId }),
        },
        'Failed to mark notification as read'
      );

      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to mark notification as read';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await requestJson(
        '/api/notifications/mark-read',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ markAll: true }),
        },
        'Failed to mark all notifications as read'
      );

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const groupNotificationsByDate = () => {
    const grouped: Record<string, Notification[]> = {};

    notifications.forEach((notification) => {
      const date = new Date(notification.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const dateKey = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ).toISOString();

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(notification);
    });

    return Object.entries(grouped)
      .map(([date, items]) => ({
        date: new Date(date),
        notifications: items,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const groupedNotifications = groupNotificationsByDate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Go back"
            onClick={() => router.back()}
            className="mr-1"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="flex items-center text-2xl font-semibold tracking-tight text-foreground">
            <Bell className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2.5 tabular-nums">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button type="button" onClick={markAllAsRead} variant="outline" size="sm">
              <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Mark all as read
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/profile/notifications/settings')}
          >
            Settings
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse space-y-3 text-center">
            <div className="mx-auto h-7 w-48 rounded bg-muted" />
            <div className="mx-auto h-4 w-64 rounded bg-muted" />
            <div className="mx-auto h-4 w-56 rounded bg-muted" />
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-border bg-card p-12 text-center">
          <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
          <h2 className="mb-2 text-lg font-semibold text-foreground">No notifications</h2>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any notifications yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedNotifications.map((group) => (
            <div key={group.date.toISOString()} className="space-y-3">
              <h2 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {new Intl.DateTimeFormat('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }).format(group.date)}
              </h2>

              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {group.notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`px-4 py-4 transition-colors duration-150 ${
                      !notification.isRead ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                          !notification.isRead
                            ? 'bg-indigo-600 dark:bg-indigo-400'
                            : 'bg-transparent'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="font-medium text-foreground">{notification.title}</h3>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification._id)}
                          className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
