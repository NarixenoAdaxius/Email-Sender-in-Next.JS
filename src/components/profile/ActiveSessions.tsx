"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Computer,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Shield,
  Loader2,
  X,
  AlertTriangle,
  Laptop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { requestJson } from '@/components/dashboard/requestJson';

interface DeviceInfo {
  browser: string;
  os: string;
  ip: string;
  deviceType: string;
}

interface Session {
  _id: string;
  deviceInfo: DeviceInfo;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function ActiveSessions() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await requestJson<{ success?: boolean; sessions?: Session[]; message?: string }>(
        '/api/user/sessions',
        undefined,
        'Failed to fetch active sessions'
      );

      if (data.success === false) {
        throw new Error(data.message || 'Failed to fetch active sessions');
      }

      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setIsRevoking(true);

      await requestJson(
        '/api/user/sessions/revoke',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        },
        'Failed to revoke session'
      );

      await fetchSessions();
      setShowConfirmDialog(false);
      setSelectedSession(null);

      toast({
        title: 'Success',
        description: 'Session revoked successfully',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke session';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      setIsRevoking(true);

      await requestJson(
        '/api/user/sessions/revoke',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ revokeAll: true }),
        },
        'Failed to revoke sessions'
      );

      await fetchSessions();
      setShowLogoutAllDialog(false);

      toast({
        title: 'Success',
        description: 'All other sessions revoked successfully',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke sessions';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    const type = (deviceType || '').toLowerCase();
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
      case 'tablet':
        return <Tablet className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
      case 'desktop':
        return <Computer className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
      case 'laptop':
        return <Laptop className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
      default:
        return <Globe className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return 'Unknown date';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const maskIpAddress = (ip: string) => {
    if (!ip || ip === 'Unknown') return 'Unknown';
    if (ip === '::1') return 'localhost';

    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.*.*`;
      }
    }

    if (ip.includes(':')) {
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}:****`;
    }

    return ip;
  };

  const handleRequestRevoke = (session: Session) => {
    if (session.isCurrent) return;
    setSelectedSession(session);
    setShowConfirmDialog(true);
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Shield className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            View and manage your active login sessions across devices
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
              <p className="text-sm">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={fetchSessions}
              >
                Try Again
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Globe className="mx-auto mb-2 h-8 w-8 opacity-60" aria-hidden="true" />
              <p className="text-sm">No active sessions found</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    className={`flex items-start justify-between rounded-lg border p-4 transition-colors duration-150 ${
                      session.isCurrent
                        ? 'border-indigo-500/30 bg-indigo-500/10'
                        : 'border-border bg-muted/20'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">{getDeviceIcon(session.deviceInfo.deviceType)}</div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <span>{session.deviceInfo.browser}</span>
                          {session.isCurrent && (
                            <span className="rounded-full border border-indigo-500/25 bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.deviceInfo.os}
                        </div>
                        <div className="flex items-center gap-1 pt-0.5 text-xs tabular-nums text-muted-foreground">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          <span title={formatDate(session.lastActive)}>
                            Active {formatTimeAgo(session.lastActive)}
                          </span>
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground">
                          IP: {maskIpAddress(session.deviceInfo.ip)}
                        </div>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Revoke session on ${session.deviceInfo.browser}`}
                        onClick={() => handleRequestRevoke(session)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLogoutAllDialog(true)}
                  disabled={isRevoking || sessions.length <= 1}
                >
                  Sign Out From All Other Devices
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Revoke Session Dialog */}
      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          if (!open && !isRevoking) setShowConfirmDialog(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out the selected device. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRevoking}
              onClick={(e) => {
                e.preventDefault();
                if (selectedSession) handleRevokeSession(selectedSession._id);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRevoking ? 'Revoking...' : 'Revoke Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Revoke All Sessions Dialog */}
      <AlertDialog
        open={showLogoutAllDialog}
        onOpenChange={(open) => {
          if (!open && !isRevoking) setShowLogoutAllDialog(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out from all other devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end all active sessions except your current browser session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRevoking}
              onClick={(e) => {
                e.preventDefault();
                handleRevokeAllSessions();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRevoking ? 'Signing Out...' : 'Sign Out All Others'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
