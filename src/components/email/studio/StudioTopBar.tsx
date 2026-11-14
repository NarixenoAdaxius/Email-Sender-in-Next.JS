"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Code2,
  Columns2,
  Eye,
  Loader2,
  Monitor,
  Moon,
  Redo2,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Sun,
  Undo2,
} from 'lucide-react';
import { toast } from 'react-toastify';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { StudioMode, ViewportMode } from './types';

const LAST_TEST_EMAIL_KEY = 'palettemail:lastTestEmail';
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

interface StudioTopBarProps {
  name: string;
  subject: string;
  onNameChange: (name: string) => void;
  onSubjectChange: (subject: string) => void;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  viewport: ViewportMode;
  onViewportChange: (viewport: ViewportMode) => void;
  darkModePreview: boolean;
  onToggleDarkModePreview: () => void;
  useSampleData: boolean;
  onToggleSampleData: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isSaving: boolean;
  onSave: () => void;
  isDirty: boolean;
  lastSavedAt: Date | null;
  previewHtml: string;
  sampleData: Record<string, string>;
  onDiscardDraft?: () => void;
}

const MODES: { id: StudioMode; label: string; icon: React.ReactNode }[] = [
  { id: 'visual', label: 'Visual', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'split', label: 'Split', icon: <Columns2 className="h-3.5 w-3.5" /> },
  { id: 'code', label: 'Code', icon: <Code2 className="h-3.5 w-3.5" /> },
];

export function StudioTopBar({
  name,
  subject,
  onNameChange,
  onSubjectChange,
  mode,
  onModeChange,
  viewport,
  onViewportChange,
  darkModePreview,
  onToggleDarkModePreview,
  useSampleData,
  onToggleSampleData,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isSaving,
  onSave,
  isDirty,
  lastSavedAt,
  previewHtml,
  sampleData,
  onDiscardDraft,
}: StudioTopBarProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const router = useRouter();

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const testEmailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_TEST_EMAIL_KEY);
      if (stored) setTestEmail(stored);
    } catch {
      // Ignore storage failures
    }
  }, []);

  const formattedSavedTime = lastSavedAt
    ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDirty) {
      e.preventDefault();
      setLeaveDialogOpen(true);
    }
  };

  const handleConfirmLeave = () => {
    setLeaveDialogOpen(false);
    onDiscardDraft?.();
    router.push('/dashboard/templates');
  };

  const handleSendTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = testEmail.trim();
    if (!trimmed || trimmed.length > 254 || !EMAIL_REGEX.test(trimmed)) {
      setTestError('Please enter a valid email address.');
      return;
    }

    try {
      localStorage.setItem(LAST_TEST_EMAIL_KEY, trimmed);
    } catch {
      // Ignore storage failures
    }

    try {
      setIsSendingTest(true);
      setTestError(null);

      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          subject: subject.trim() || name.trim() || 'Test Email',
          html: previewHtml,
          variables: sampleData,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      toast.success(`Test email sent to ${trimmed}`);
      setSendTestOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send test email';
      setTestError(message);
      toast.error(message);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <>
      <header className="sticky top-16 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
          {/* Left: Back + Inline Template Name, Subject & Status Badge */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link
              href="/dashboard/templates"
              onClick={handleBackClick}
              aria-label="Back to Templates"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card/80 text-muted-foreground transition-transform duration-75 hover:text-foreground active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none sm:h-8 sm:w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <Input
                aria-label="Template name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Untitled Template"
                className="min-h-11 max-w-[220px] border-transparent bg-transparent px-2 text-sm font-semibold text-foreground hover:border-border focus-visible:border-border focus-visible:bg-background sm:min-h-0 sm:h-8"
              />
              <span className="hidden text-muted-foreground/50 sm:inline">/</span>
              <Input
                aria-label="Email subject"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="Email subject line..."
                className="min-h-11 max-w-[260px] border-transparent bg-transparent px-2 text-xs text-muted-foreground hover:border-border focus-visible:border-border focus-visible:bg-background focus-visible:text-foreground sm:min-h-0 sm:h-8"
              />
            </div>

            <div className="hidden shrink-0 xl:flex">
              {isDirty ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  <span>Unsaved changes</span>
                </span>
              ) : (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-300"
                >
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Saved{formattedSavedTime ? ` · ${formattedSavedTime}` : ''}</span>
                </span>
              )}
            </div>
          </div>

          {/* Center: Mode Segmented Control */}
          <div
            role="group"
            aria-label="Editor mode"
            className="relative inline-flex items-center rounded-lg border border-border/80 bg-muted/60 p-0.5"
          >
            {MODES.map((item) => {
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onModeChange(item.id)}
                  className={cn(
                    'relative z-10 inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none sm:min-h-0',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={prefersReducedMotion ? undefined : 'studio-mode-pill'}
                      transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                      className="absolute inset-0 -z-10 rounded-md bg-background shadow-xs ring-1 ring-border/60"
                    />
                  )}
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Status (compact), History, Viewport, Preview Toggles, Send Test & Save */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex xl:hidden">
              {isDirty ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  <span className="hidden sm:inline">Unsaved changes</span>
                  <span className="sm:hidden">Unsaved</span>
                </span>
              ) : (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-300"
                >
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Saved{formattedSavedTime ? ` · ${formattedSavedTime}` : ''}</span>
                </span>
              )}
            </div>

            <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-card/70 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 active:scale-[0.97] motion-reduce:transform-none sm:h-7 sm:w-7"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl/Cmd + Z)"
                aria-label="Undo"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 active:scale-[0.97] motion-reduce:transform-none sm:h-7 sm:w-7"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl/Cmd + Shift + Z)"
                aria-label="Redo"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="hidden items-center gap-0.5 rounded-lg border border-border/80 bg-card/70 p-0.5 sm:inline-flex">
              <Button
                type="button"
                variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 active:scale-[0.97] motion-reduce:transform-none"
                onClick={() => onViewportChange('desktop')}
                title="Desktop viewport"
                aria-label="Desktop viewport"
                aria-pressed={viewport === 'desktop'}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
                size="icon"
                className="hidden h-7 w-7 active:scale-[0.97] motion-reduce:transform-none sm:inline-flex"
                onClick={() => onViewportChange('mobile')}
                title="Mobile viewport (375px)"
                aria-label="Mobile viewport"
                aria-pressed={viewport === 'mobile'}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              variant={darkModePreview ? 'secondary' : 'outline'}
              size="icon"
              className="h-11 w-11 active:scale-[0.97] motion-reduce:transform-none sm:h-8 sm:w-8"
              onClick={onToggleDarkModePreview}
              title="Toggle Dark Mode email simulation"
              aria-label="Toggle Dark Mode email simulation"
              aria-pressed={darkModePreview}
            >
              {darkModePreview ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </Button>

            <Button
              type="button"
              variant={useSampleData ? 'secondary' : 'outline'}
              size="sm"
              className="hidden h-8 gap-1.5 px-2.5 text-xs active:scale-[0.97] motion-reduce:transform-none md:inline-flex"
              onClick={onToggleSampleData}
              aria-pressed={useSampleData}
              title="Preview {{variables}} with sample data"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Sample Data</span>
            </Button>

            {/* Send Test Dialog */}
            <Dialog
              open={sendTestOpen}
              onOpenChange={(open) => {
                setSendTestOpen(open);
                if (open) setTestError(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant={sendTestOpen ? 'secondary' : 'outline'}
                  size="sm"
                  className="min-h-11 gap-1.5 px-3 text-xs font-medium transition-transform duration-75 active:scale-[0.97] motion-reduce:transform-none sm:min-h-0 sm:h-8"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Test</span>
                </Button>
              </DialogTrigger>

              <DialogContent
                className="sm:max-w-md"
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  testEmailInputRef.current?.focus();
                }}
              >
                <DialogHeader className="text-left">
                  <DialogTitle className="text-base">Send Test Email</DialogTitle>
                  <DialogDescription className="text-xs">
                    Sends current studio HTML compiled with Sample Data
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSendTestSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="studio-send-test-email" className="text-xs text-foreground">
                      Recipient Email
                    </Label>
                    <Input
                      ref={testEmailInputRef}
                      id="studio-send-test-email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={testEmail}
                      onChange={(e) => {
                        setTestEmail(e.target.value);
                        if (testError) setTestError(null);
                      }}
                      placeholder="you@example.com"
                      disabled={isSendingTest}
                      className="min-h-11 text-xs sm:min-h-0 sm:h-9"
                    />
                    {testError && (
                      <p role="alert" className="text-xs text-destructive">
                        {testError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSendingTest || !testEmail.trim()}
                    className="min-h-11 w-full gap-1.5 bg-[#4F46E5] text-xs font-semibold text-white transition-transform duration-75 hover:bg-[#4338CA] active:scale-[0.97] motion-reduce:transform-none sm:min-h-0 sm:h-9"
                  >
                    {isSendingTest ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Test Email</span>
                      </>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="min-h-11 gap-1.5 bg-[#4F46E5] px-3.5 text-xs font-semibold text-white transition-transform duration-75 hover:bg-[#4338CA] active:scale-[0.97] motion-reduce:transform-none sm:min-h-0 sm:h-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits in this email template. Leaving now will discard your unsaved
              changes and clear the local draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 sm:min-h-10">Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:min-h-10"
            >
              Discard &amp; Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
