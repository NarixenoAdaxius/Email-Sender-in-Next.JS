"use client";

import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/email/ErrorBoundary';
import { EmailStudio } from '@/components/email/studio/EmailStudio';

export default function NewTemplatePage() {
  const router = useRouter();

  return (
    <ErrorBoundary>
      <EmailStudio
        onSave={() => {
          router.push('/dashboard/templates');
        }}
      />
    </ErrorBoundary>
  );
}
