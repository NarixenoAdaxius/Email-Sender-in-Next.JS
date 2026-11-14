"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronUp, Send, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestJson } from '@/components/dashboard/requestJson';

const isDevelopment = process.env.NODE_ENV === 'development';
const EMAIL_REGEX =
  /^[^\s@<>()[\]\\,;:"']{1,64}@[^\s@<>()[\]\\.,;:"']+(?:\.[^\s@<>()[\]\\.,;:"']+)+$/;

interface EmailTesterProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function EmailTester({ isOpen, onToggle }: EmailTesterProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(true);

  const isControlled = typeof isOpen === 'boolean';
  const expanded = isControlled ? isOpen : internalOpen;

  useEffect(() => {
    if (!isDevelopment || isControlled) return;
    const savedState = localStorage.getItem('emailTesterHidden');
    if (savedState === 'true') {
      setInternalOpen(false);
    }
  }, [isControlled]);

  if (!isDevelopment) {
    return null;
  }

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    setInternalOpen((prev) => {
      const next = !prev;
      localStorage.setItem('emailTesterHidden', next ? 'false' : 'true');
      return next;
    });
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = testEmail.trim();
    if (!trimmedEmail || trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      await requestJson<{ message?: string }>(
        '/api/email/test',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: trimmedEmail }),
        },
        'Failed to send test email'
      );

      setResult(`Test email sent successfully to ${trimmedEmail}`);
      toast.success('Test email sent successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send test email';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t border-border pt-6">
      {!isControlled && !expanded && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>SMTP Email Tester</span>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Dev Only
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleToggle}>
            Open Tester
          </Button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="smtp-email-tester-panel"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.12 }
                : { type: 'spring', bounce: 0, duration: 0.3 }
            }
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Terminal className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        SMTP Email Tester
                      </h3>
                      <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        Dev Only
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Send a quick test message to verify SMTP delivery.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggle}
                  className="h-8 gap-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground"
                >
                  <span>Collapse</span>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-red-700 dark:text-red-400"
                >
                  <p className="font-medium">Unable to send test email</p>
                  <p className="mt-0.5 opacity-90">{error}</p>
                </div>
              )}

              {result && (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
                >
                  <p className="font-medium">Test email dispatched</p>
                  <p className="mt-0.5 opacity-90">{result}</p>
                </div>
              )}

              <form onSubmit={handleTestEmail} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="testEmail" className="text-sm font-medium text-foreground">
                    Test Email Address
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="email"
                      id="testEmail"
                      name="testEmail"
                      autoComplete="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={isLoading}
                      className="flex-1 bg-background"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || !testEmail.trim()}
                      className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      {isLoading ? 'Sending...' : 'Send Test Email'}
                    </Button>
                  </div>
                </div>
              </form>

              <p className="mt-3 text-xs text-muted-foreground">
                Requires <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">SMTP_HOST</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">SMTP_PORT</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">SMTP_USER</code>, and{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">SMTP_PASSWORD</code> in{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code>.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
