"use client";

import { useParams, useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/email/ErrorBoundary';
import { EmailStudio } from '@/components/email/studio/EmailStudio';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;

  return (
    <ErrorBoundary>
      <EmailStudio
        templateId={templateId}
        onSave={() => {
          router.push('/dashboard/templates');
        }}
      />
    </ErrorBoundary>
  );
}
