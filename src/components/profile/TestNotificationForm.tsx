"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { requestJson } from '@/components/dashboard/requestJson';

const NOTIFICATION_TYPES = [
  { value: 'newFeatures', label: 'New Features' },
  { value: 'security', label: 'Security Alert' },
  { value: 'emailSent', label: 'Email Sent' },
  { value: 'emailOpened', label: 'Email Opened' },
  { value: 'emailClicked', label: 'Email Link Clicked' },
  { value: 'emailBounced', label: 'Email Bounced' },
  { value: 'newTemplates', label: 'New Templates' },
] as const;

export function TestNotificationForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [notificationType, setNotificationType] = useState('newFeatures');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const sendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      await requestJson(
        '/api/notifications/test',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: notificationType,
            title: title.trim() || undefined,
            message: message.trim() || 'This is a test notification',
          }),
        },
        'Failed to create test notification'
      );

      toast({
        title: 'Success',
        description: 'Test notification created',
      });

      setTitle('');
      setMessage('');
    } catch (error: unknown) {
      const errMessage =
        error instanceof Error ? error.message : 'Failed to create test notification';
      toast({
        title: 'Error',
        description: errMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Test Notifications</CardTitle>
        <CardDescription>
          Create test notifications to preview how they appear in the app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={sendTestNotification} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-notification-type">Notification Type</Label>
            <Select
              name="type"
              value={notificationType}
              onValueChange={setNotificationType}
              disabled={isLoading}
            >
              <SelectTrigger id="test-notification-type">
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-notification-title">Title (Optional)</Label>
            <Input
              id="test-notification-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave empty to use default title"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              If left empty, a default title is generated from the notification type.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-notification-message">Message</Label>
            <Textarea
              id="test-notification-message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              disabled={isLoading}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Sending...' : 'Send Test Notification'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
