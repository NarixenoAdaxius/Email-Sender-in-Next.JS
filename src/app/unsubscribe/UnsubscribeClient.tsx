'use client';

import { useEffect, useState } from 'react';

interface UnsubscribeClientProps {
  token?: string;
}

export default function UnsubscribeClient({ token }: UnsubscribeClientProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error'
  );
  const [message, setMessage] = useState<string>(
    token ? 'Processing your unsubscribe request...' : 'Missing unsubscribe token.'
  );
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    async function run() {
      try {
        const res = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          email?: string;
          message?: string;
          error?: string;
        };
        if (cancelled) return;

        if (res.ok && data.success) {
          setStatus('success');
          setEmail(data.email || null);
          setMessage(data.message || 'You have been unsubscribed.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Unable to process unsubscribe request.');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Network error while processing unsubscribe request.');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-xl bg-white p-8 shadow-sm border border-slate-200 text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-3">
          {status === 'loading'
            ? 'Unsubscribing...'
            : status === 'success'
              ? 'Unsubscribed'
              : 'Unsubscribe Failed'}
        </h1>
        <p className="text-sm text-slate-600 mb-2">{message}</p>
        {email && (
          <p className="text-xs text-slate-500">
            Address: <span className="font-medium text-slate-700">{email}</span>
          </p>
        )}
      </div>
    </main>
  );
}
