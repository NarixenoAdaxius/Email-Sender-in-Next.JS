"use client";

import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import NotificationSettings from '@/components/profile/NotificationSettings';
import { TestNotificationForm } from '@/components/profile/TestNotificationForm';

export default function NotificationSettingsPage() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="mb-6 flex items-center gap-2">
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notification Settings
        </h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <NotificationSettings />
        </div>
        <div>
          <TestNotificationForm />
        </div>
      </div>
    </motion.div>
  );
}
