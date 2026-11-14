"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, FileText, Star, ExternalLink, Loader2, type LucideIcon } from 'lucide-react';
import { requestJson } from '@/components/dashboard/requestJson';

interface AppPreferences {
  newFeatures: boolean;
  security: boolean;
  emailSent: boolean;
  emailOpened: boolean;
  emailClicked: boolean;
  emailBounced: boolean;
  newTemplates: boolean;
}

interface NotificationPreferences {
  app: AppPreferences;
}

const DEFAULT_APP_PREFERENCES: AppPreferences = {
  newFeatures: true,
  security: true,
  emailSent: true,
  emailOpened: true,
  emailClicked: true,
  emailBounced: true,
  newTemplates: true,
};

interface NotificationToggleConfig {
  key: keyof AppPreferences;
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconWrapperClass: string;
}

const NOTIFICATION_ITEMS: NotificationToggleConfig[] = [
  {
    key: 'newFeatures',
    id: 'notif-new-features',
    title: 'New Features',
    description: 'Receive notifications about new features and product updates.',
    icon: Star,
    iconWrapperClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'security',
    id: 'notif-security-alerts',
    title: 'Security Alerts',
    description: 'Receive notifications about security events and sign-in alerts.',
    icon: AlertTriangle,
    iconWrapperClass: 'bg-destructive/10 text-destructive',
  },
  {
    key: 'emailSent',
    id: 'notif-email-sent',
    title: 'Email Sent',
    description: 'Get notified when your emails are dispatched successfully.',
    icon: ExternalLink,
    iconWrapperClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'newTemplates',
    id: 'notif-new-templates',
    title: 'New Templates',
    description: 'Get notified when new email templates become available.',
    icon: FileText,
    iconWrapperClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
];

export default function NotificationSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    app: DEFAULT_APP_PREFERENCES,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await requestJson<{ preferences?: { app?: Partial<AppPreferences> } }>(
          '/api/user/notification-preferences',
          undefined,
          'Failed to load notification preferences'
        );
        if (data.preferences?.app) {
          setPreferences({
            app: {
              ...DEFAULT_APP_PREFERENCES,
              ...data.preferences.app,
            },
          });
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to load notification preferences';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleToggle = (type: keyof AppPreferences, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      app: {
        ...prev.app,
        [type]: value,
      },
    }));
    setHasChanges(true);
  };

  const saveChanges = async () => {
    try {
      setIsSaving(true);
      await requestJson(
        '/api/user/notification-preferences',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ preferences }),
        },
        'Failed to update notification preferences'
      );

      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update notification preferences';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Notification Settings</CardTitle>
        <CardDescription>
          Control which notifications you receive within the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            In-App Notifications
          </h3>

          <div className="space-y-3">
            {NOTIFICATION_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3.5 transition-colors duration-150 hover:bg-muted/40"
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${item.iconWrapperClass}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <Label
                        htmlFor={item.id}
                        className="cursor-pointer text-sm font-medium text-foreground"
                      >
                        {item.title}
                      </Label>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={item.id}
                    aria-label={item.title}
                    checked={preferences.app[item.key]}
                    onCheckedChange={(value) => handleToggle(item.key, value)}
                    disabled={isLoading || isSaving}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={saveChanges}
            disabled={isLoading || isSaving || !hasChanges}
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
