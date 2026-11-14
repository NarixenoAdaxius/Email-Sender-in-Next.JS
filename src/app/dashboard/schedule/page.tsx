"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  CalendarClock,
  Globe,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { requestJson } from '@/components/dashboard/requestJson';

interface ScheduledEmail {
  _id: string;
  subject: string;
  recipientGroup: string;
  recipientCount: number;
  scheduledDate: string;
  template: string;
  templateId: string;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly';
  status: 'scheduled' | 'processing' | 'sent' | 'cancelled' | 'failed';
}

interface EmailTemplate {
  _id?: string;
  id?: string;
  name: string;
  subject?: string;
  description?: string;
}

interface ContactItem {
  _id: string;
  name: string;
  email: string;
  company?: string;
  tags?: string[];
  status?: string;
}

const getContactInactiveStatus = (contact: ContactItem): string | null => {
  const status = typeof contact.status === 'string' ? contact.status.trim().toLowerCase() : '';
  if (!status || status === 'active') return null;
  if (status === 'unsubscribed') return 'Unsubscribed';
  if (status === 'bounced') return 'Bounced';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const sortScheduledEmailsAsc = (items: ScheduledEmail[]): ScheduledEmail[] =>
  [...items].sort((a, b) => {
    const timeA = new Date(a.scheduledDate).getTime();
    const timeB = new Date(b.scheduledDate).getTime();
    const validA = Number.isNaN(timeA) ? Number.POSITIVE_INFINITY : timeA;
    const validB = Number.isNaN(timeB) ? Number.POSITIVE_INFINITY : timeB;
    return validA - validB;
  });

const getRecurrenceBadge = (recurrence: string) => {
  switch (recurrence) {
    case 'daily':
      return (
        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
          Daily
        </Badge>
      );
    case 'weekly':
      return (
        <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
          Weekly
        </Badge>
      );
    case 'monthly':
      return (
        <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          Monthly
        </Badge>
      );
    case 'once':
    default:
      return (
        <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
          One-time
        </Badge>
      );
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          Sent
        </Badge>
      );
    case 'scheduled':
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          Scheduled
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400">
          Processing
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
          Cancelled
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Presets produce LOCAL date/time strings (never UTC) to match the local `min` and submit logic.
const toLocalParts = (d: Date) => ({
  date: format(d, 'yyyy-MM-dd'),
  time: format(d, 'HH:mm'),
});

const atNineAm = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(9, 0, 0, 0);
  return copy;
};

const SCHEDULE_PRESETS: { label: string; compute: () => { date: string; time: string } }[] = [
  {
    label: 'In 1 hour',
    compute: () => toLocalParts(new Date(Date.now() + 60 * 60 * 1000)),
  },
  {
    label: 'Tomorrow 9:00 AM',
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return toLocalParts(atNineAm(d));
    },
  },
  {
    label: 'Next Monday 9:00 AM',
    compute: () => {
      const d = new Date();
      const daysAhead = ((8 - d.getDay()) % 7) || 7;
      d.setDate(d.getDate() + daysAhead);
      return toLocalParts(atNineAm(d));
    },
  },
];

const formatScheduledDate = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return format(date, 'MMM d, yyyy h:mm a');
};

const toLocalDateTimeInput = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

const parseLocalDateTimeInput = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value.trim()
  );
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  const date = new Date(year, month - 1, day, hour, minute, second, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }
  return date;
};

const getLocalTimezoneLabel = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const offsetLabel =
      offsetMinutes === 0
        ? 'UTC+0'
        : mins === 0
          ? `UTC${sign}${hours}`
          : `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`;
    return `${tz} (${offsetLabel})`;
  } catch {
    return 'Local Time';
  }
};

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function EmailSchedulePage() {
  const { toast } = useToast();
  const [localTimezone, setLocalTimezone] = useState<string>('');
  const [minDate, setMinDate] = useState<string>('');
  const [minDateTime, setMinDateTime] = useState<string>('');
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactTags, setContactTags] = useState<string[]>(['all']);
  const [recipientMode, setRecipientMode] = useState<'group' | 'individual'>('group');
  const [newEmail, setNewEmail] = useState({
    subject: '',
    recipientGroup: '',
    scheduledDate: '',
    scheduledTime: '',
    templateId: '',
    recurrence: 'once',
  });

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<ContactItem[]>([]);
  const [manualRecipients, setManualRecipients] = useState<string[]>([]);
  const [newManualRecipient, setNewManualRecipient] = useState('');
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');
  const [reschedulingEmail, setReschedulingEmail] = useState<ScheduledEmail | null>(null);
  const [rescheduleDateTime, setRescheduleDateTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [cancellingEmail, setCancellingEmail] = useState<ScheduledEmail | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<ScheduledEmail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchRequestIdRef = useRef(0);

  useEffect(() => {
    setLocalTimezone(getLocalTimezoneLabel());
    const now = Date.now();
    setMinDate(format(new Date(now), 'yyyy-MM-dd'));
    setMinDateTime(format(new Date(now + 60_000), "yyyy-MM-dd'T'HH:mm"));
  }, []);

  const fetchData = useCallback(async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const requestId = ++fetchRequestIdRef.current;

    setIsLoading(true);
    setFetchError(null);
    try {
      const [emailsRes, templatesRes, contactsRes] = await Promise.allSettled([
        requestJson<{ scheduledEmails?: ScheduledEmail[] }>(
          '/api/scheduled-emails',
          { signal: controller.signal },
          'Failed to fetch scheduled emails'
        ),
        requestJson<{ templates?: EmailTemplate[] }>(
          '/api/templates?includeDefault=false&fields=summary',
          { signal: controller.signal },
          'Failed to fetch templates'
        ),
        requestJson<{ contacts?: ContactItem[] }>(
          '/api/contacts',
          { signal: controller.signal },
          'Failed to fetch contacts'
        ),
      ]);

      if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) {
        return;
      }

      if (emailsRes.status === 'rejected') {
        throw emailsRes.reason;
      }

      const emailsData = emailsRes.value;
      const templatesData =
        templatesRes.status === 'fulfilled' ? templatesRes.value : { templates: [] };

      let contactTagsList = ['all'];
      if (contactsRes.status === 'fulfilled') {
        const fetchedContacts = Array.isArray(contactsRes.value.contacts)
          ? contactsRes.value.contacts
          : [];
        const allTags = new Set<string>();
        fetchedContacts.forEach((contact) => {
          if (Array.isArray(contact.tags)) {
            contact.tags.forEach((tag) => {
              if (tag && tag.trim()) allTags.add(tag.trim());
            });
          }
        });
        contactTagsList = ['all', ...Array.from(allTags)];
        setContacts(fetchedContacts);
      } else {
        setContacts([]);
      }

      setScheduledEmails(
        sortScheduledEmailsAsc(
          Array.isArray(emailsData.scheduledEmails) ? emailsData.scheduledEmails : []
        )
      );
      const validTemplates = (Array.isArray(templatesData.templates) ? templatesData.templates : []).filter(
        (t) => Boolean(t._id || t.id)
      );
      setTemplates(validTemplates);
      setContactTags(contactTagsList);
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        return;
      }
      if (requestId !== fetchRequestIdRef.current) return;

      const message = error instanceof Error ? error.message : 'Failed to load scheduled emails';
      setFetchError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      if (requestId === fetchRequestIdRef.current && !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, [fetchData]);

  const getAllRecipientEmails = () => {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const raw of [
      ...selectedContacts.map((contact) => contact.email),
      ...manualRecipients,
    ]) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(trimmed);
      }
    }
    return unique;
  };

  const resetModalForm = () => {
    setNewEmail({
      subject: '',
      recipientGroup: '',
      scheduledDate: '',
      scheduledTime: '',
      templateId: '',
      recurrence: 'once',
    });
    setRecipientMode('group');
    setSelectedContacts([]);
    setManualRecipients([]);
    setNewManualRecipient('');
    setContactsSearchQuery('');
  };

  const handleAddScheduledEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    const recipientEmails = getAllRecipientEmails();
    const hasRecipients =
      recipientMode === 'group' ? Boolean(newEmail.recipientGroup) : recipientEmails.length > 0;

    if (
      !newEmail.subject.trim() ||
      !hasRecipients ||
      !newEmail.scheduledDate ||
      !newEmail.scheduledTime ||
      !newEmail.templateId
    ) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields and choose at least one recipient.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const localDate = parseLocalDateTimeInput(
        `${newEmail.scheduledDate}T${newEmail.scheduledTime}`
      );
      if (!localDate) {
        toast({
          title: 'Invalid Schedule Time',
          description: 'Please enter a valid date and time.',
          variant: 'destructive',
        });
        return;
      }
      if (localDate.getTime() <= Date.now()) {
        toast({
          title: 'Schedule Time in the Past',
          description: 'Please select a future date and time.',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);
      const dateTimeString = localDate.toISOString();

      const payload =
        recipientMode === 'group'
          ? {
              subject: newEmail.subject.trim(),
              recipientType: 'group' as const,
              recipientGroup: newEmail.recipientGroup,
              scheduledDate: dateTimeString,
              templateId: newEmail.templateId,
              recurrence: newEmail.recurrence,
            }
          : {
              subject: newEmail.subject.trim(),
              recipientType: (selectedContacts.length > 0 ? 'individual' : 'manual') as
                | 'individual'
                | 'manual',
              recipients: recipientEmails,
              scheduledDate: dateTimeString,
              templateId: newEmail.templateId,
              recurrence: newEmail.recurrence,
            };

      const data = await requestJson<{ scheduledEmail: ScheduledEmail }>(
        '/api/scheduled-emails',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        'Failed to schedule email'
      );

      if (data.scheduledEmail) {
        setScheduledEmails((prev) =>
          sortScheduledEmailsAsc([...prev, data.scheduledEmail])
        );
      }

      resetModalForm();
      setIsAddDialogOpen(false);

      toast({
        title: 'Success',
        description: 'Email scheduled successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to schedule email';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRescheduleDialog = (email: ScheduledEmail) => {
    setMinDateTime(format(new Date(Date.now() + 60_000), "yyyy-MM-dd'T'HH:mm"));
    setReschedulingEmail(email);
    setRescheduleDateTime(toLocalDateTimeInput(email.scheduledDate));
    setRescheduleError(null);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingEmail) return;

    const parsedDate = parseLocalDateTimeInput(rescheduleDateTime);
    if (!parsedDate) {
      const msg = 'Please select a valid date and time.';
      setRescheduleError(msg);
      toast({
        title: 'Invalid Schedule Time',
        description: msg,
        variant: 'destructive',
      });
      return;
    }

    if (parsedDate.getTime() <= Date.now()) {
      const msg = 'Please select a future date and time.';
      setRescheduleError(msg);
      toast({
        title: 'Schedule Time in the Past',
        description: msg,
        variant: 'destructive',
      });
      return;
    }

    const target = reschedulingEmail;
    try {
      setIsRescheduling(true);
      setRescheduleError(null);
      const data = await requestJson<{ scheduledEmail?: ScheduledEmail }>(
        `/api/scheduled-emails/${target._id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scheduledDate: parsedDate.toISOString(),
          }),
        },
        'Failed to reschedule email'
      );

      setScheduledEmails((prev) =>
        sortScheduledEmailsAsc(
          prev.map((item) =>
            item._id === target._id
              ? {
                  ...item,
                  ...(data.scheduledEmail ?? {}),
                  scheduledDate:
                    data.scheduledEmail?.scheduledDate ?? parsedDate.toISOString(),
                }
              : item
          )
        )
      );
      setReschedulingEmail(null);
      setRescheduleDateTime('');

      toast({
        title: 'Rescheduled',
        description: 'Scheduled send time updated successfully',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to reschedule email';
      setRescheduleError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleConfirmCancelEmail = async () => {
    if (!cancellingEmail) return;

    try {
      setIsCancelling(true);
      await requestJson(
        `/api/scheduled-emails/${cancellingEmail._id}`,
        {
          method: 'DELETE',
        },
        'Failed to cancel scheduled email'
      );

      setScheduledEmails((prev) =>
        prev.map((email) =>
          email._id === cancellingEmail._id ? { ...email, status: 'cancelled' } : email
        )
      );
      setCancellingEmail(null);

      toast({
        title: 'Success',
        description: 'Scheduled email cancelled',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to cancel scheduled email';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmDeleteEmail = async () => {
    if (!deletingEmail) return;
    const target = deletingEmail;

    try {
      setIsDeleting(true);
      await requestJson(
        `/api/scheduled-emails/${target._id}?permanent=true`,
        { method: 'DELETE' },
        'Failed to delete scheduled email'
      );
      setScheduledEmails((prev) => prev.filter((email) => email._id !== target._id));
      setDeletingEmail(null);
      toast({ title: 'Deleted', description: 'Scheduled email entry removed' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete scheduled email';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const applyPreset = ({ date, time }: { date: string; time: string }) => {
    setNewEmail((prev) => ({ ...prev, scheduledDate: date, scheduledTime: time }));
  };

  const formatGroupName = (groupName: string) => {
    if (groupName === 'all') return 'All Contacts';
    return groupName.charAt(0).toUpperCase() + groupName.slice(1);
  };

  const addManualRecipient = () => {
    const email = newManualRecipient.trim();
    if (!email || !validateEmail(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    const normalized = email.toLowerCase();
    if (manualRecipients.some((r) => r.trim().toLowerCase() === normalized)) {
      toast({
        title: 'Duplicate Email',
        description: 'This email has already been added',
        variant: 'destructive',
      });
      return;
    }

    setManualRecipients((prev) => [...prev, email]);
    setNewManualRecipient('');
  };

  const removeManualRecipient = (email: string) => {
    setManualRecipients((prev) => prev.filter((r) => r !== email));
  };

  const toggleContactSelection = (contact: ContactItem) => {
    if (getContactInactiveStatus(contact)) return;
    setSelectedContacts((prev) =>
      prev.some((c) => c._id === contact._id)
        ? prev.filter((c) => c._id !== contact._id)
        : [...prev, contact]
    );
  };

  const filteredContacts = useMemo(() => {
    const q = contactsSearchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(q) ||
        contact.email.toLowerCase().includes(q) ||
        Boolean(contact.company && contact.company.toLowerCase().includes(q))
    );
  }, [contacts, contactsSearchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Email Scheduling
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Schedule one-time or recurring campaigns for your contacts.
          </p>
          {localTimezone && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-xs font-medium text-foreground/85">
              <Globe
                className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                aria-hidden="true"
              />
              <span>Times shown in your local timezone: {localTimezone}</span>
            </div>
          )}
        </div>

        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            if (open) {
              setMinDate(format(new Date(), 'yyyy-MM-dd'));
            }
            setIsAddDialogOpen(open);
            if (!open && !isSubmitting) resetModalForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Schedule Email
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>Schedule an Email</DialogTitle>
              <DialogDescription>
                Choose recipients, select a saved template, and pick a send time.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddScheduledEmail} className="space-y-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule-subject" className="text-right">
                  Subject
                </Label>
                <Input
                  id="schedule-subject"
                  name="subject"
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail((prev) => ({ ...prev, subject: e.target.value }))}
                  className="col-span-3"
                  placeholder="Monthly product update"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <span
                  id="schedule-recipients-label"
                  className="pt-2 text-right text-sm font-medium text-foreground"
                >
                  Recipients
                </span>
                <div
                  role="group"
                  aria-labelledby="schedule-recipients-label"
                  className="col-span-3 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={recipientMode === 'group' ? 'default' : 'outline'}
                      onClick={() => {
                        setRecipientMode('group');
                        setSelectedContacts([]);
                        setManualRecipients([]);
                      }}
                    >
                      Contact Group
                    </Button>
                    <Button
                      type="button"
                      variant={recipientMode === 'individual' ? 'default' : 'outline'}
                      onClick={() => {
                        setRecipientMode('individual');
                        setNewEmail((prev) => ({ ...prev, recipientGroup: '' }));
                      }}
                    >
                      Individual
                    </Button>
                  </div>

                  {recipientMode === 'group' ? (
                    <div>
                      <Label htmlFor="recipient-group" className="sr-only">
                        Contact Group
                      </Label>
                      <Select
                        name="recipientGroup"
                        value={newEmail.recipientGroup}
                        onValueChange={(value: string) =>
                          setNewEmail((prev) => ({ ...prev, recipientGroup: value }))
                        }
                      >
                        <SelectTrigger id="recipient-group">
                          <SelectValue placeholder="Select a contact group" />
                        </SelectTrigger>
                        <SelectContent>
                          {contactTags.map((tag) => (
                            <SelectItem key={tag} value={tag}>
                              {formatGroupName(tag)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex gap-2">
                        <Label htmlFor="manual-recipient" className="sr-only">
                          Add email address manually
                        </Label>
                        <Input
                          id="manual-recipient"
                          name="manualRecipient"
                          type="email"
                          autoComplete="email"
                          placeholder="Add email address manually"
                          value={newManualRecipient}
                          onChange={(e) => setNewManualRecipient(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addManualRecipient();
                            }
                          }}
                          className="flex-1 bg-background"
                        />
                        <Button type="button" onClick={addManualRecipient} size="sm" variant="secondary">
                          Add
                        </Button>
                      </div>

                      {(selectedContacts.length > 0 || manualRecipients.length > 0) && (
                        <div>
                          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                            Selected Recipients (
                            <span className="tabular-nums">
                              {selectedContacts.length + manualRecipients.length}
                            </span>
                            )
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedContacts.map((contact) => (
                              <Badge
                                key={contact._id}
                                variant="secondary"
                                className="flex items-center gap-1 py-1 pl-2.5 pr-1"
                              >
                                <span>{contact.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({contact.email})
                                </span>
                                <button
                                  type="button"
                                  data-compact="true"
                                  aria-label={`Remove ${contact.name}`}
                                  onClick={() => toggleContactSelection(contact)}
                                  className="relative ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground after:absolute after:-inset-1.5 after:content-['']"
                                >
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </Badge>
                            ))}
                            {manualRecipients.map((email) => (
                              <Badge
                                key={email}
                                variant="outline"
                                className="flex items-center gap-1 bg-background py-1 pl-2.5 pr-1"
                              >
                                <span>{email}</span>
                                <button
                                  type="button"
                                  data-compact="true"
                                  aria-label={`Remove ${email}`}
                                  onClick={() => removeManualRecipient(email)}
                                  className="relative ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground after:absolute after:-inset-1.5 after:content-['']"
                                >
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="contacts-search" className="sr-only">
                          Search contacts
                        </Label>
                        <Input
                          id="contacts-search"
                          name="contactsSearch"
                          type="search"
                          placeholder="Browse contacts..."
                          value={contactsSearchQuery}
                          onChange={(e) => setContactsSearchQuery(e.target.value)}
                          className="mb-2 bg-background"
                        />
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background">
                          {filteredContacts.length > 0 ? (
                            <div className="divide-y divide-border">
                              {filteredContacts.map((contact) => {
                                const inactiveStatus = getContactInactiveStatus(contact);
                                const isInactive = Boolean(inactiveStatus);
                                const isSelected = selectedContacts.some(
                                  (c) => c._id === contact._id
                                );
                                return (
                                  <button
                                    key={contact._id}
                                    type="button"
                                    disabled={isInactive}
                                    onClick={() => toggleContactSelection(contact)}
                                    className={`w-full px-3 py-2 text-left transition-colors duration-150 ${
                                      isInactive
                                        ? 'cursor-not-allowed bg-muted/30 opacity-60'
                                        : isSelected
                                          ? 'bg-indigo-500/10 text-foreground'
                                          : 'hover:bg-muted/60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm font-medium text-foreground">
                                        {contact.name}
                                      </span>
                                      {inactiveStatus ? (
                                        <Badge
                                          variant="outline"
                                          className="border-destructive/30 bg-destructive/10 text-destructive"
                                        >
                                          {inactiveStatus}
                                        </Badge>
                                      ) : isSelected ? (
                                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                          Selected
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {contact.email}
                                    </div>
                                    {contact.company && (
                                      <div className="text-xs text-muted-foreground">
                                        {contact.company}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No contacts found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule-template" className="text-right">
                  Template
                </Label>
                <div className="col-span-3">
                  <Select
                    name="templateId"
                    value={newEmail.templateId}
                    onValueChange={(value: string) =>
                      setNewEmail((prev) => ({ ...prev, templateId: value }))
                    }
                  >
                    <SelectTrigger id="schedule-template">
                      <SelectValue placeholder="Select email template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length > 0 ? (
                        templates.map((template) => {
                          const value = template._id || template.id || '';
                          return (
                            <SelectItem key={value} value={value}>
                              {template.name}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="no-templates" disabled>
                          No saved templates available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule-date" className="text-right">
                  Date
                </Label>
                <div className="col-span-3">
                  <Input
                    id="schedule-date"
                    name="scheduledDate"
                    type="date"
                    min={minDate || undefined}
                    value={newEmail.scheduledDate}
                    onChange={(e) =>
                      setNewEmail((prev) => ({ ...prev, scheduledDate: e.target.value }))
                    }
                    className="tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule-time" className="text-right">
                  Time
                </Label>
                <div className="col-span-3">
                  <Input
                    id="schedule-time"
                    name="scheduledTime"
                    type="time"
                    value={newEmail.scheduledTime}
                    onChange={(e) =>
                      setNewEmail((prev) => ({ ...prev, scheduledTime: e.target.value }))
                    }
                    className="tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm text-muted-foreground" id="schedule-presets-label">
                  Quick
                </span>
                <div
                  className="col-span-3 flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby="schedule-presets-label"
                >
                  {SCHEDULE_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset.compute())}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule-recurrence" className="text-right">
                  Recurrence
                </Label>
                <div className="col-span-3">
                  <Select
                    name="recurrence"
                    value={newEmail.recurrence}
                    onValueChange={(value: string) =>
                      setNewEmail((prev) => ({ ...prev, recurrence: value }))
                    }
                  >
                    <SelectTrigger id="schedule-recurrence">
                      <SelectValue placeholder="Select recurrence pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Schedule Email
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {fetchError && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{fetchError}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* List of Scheduled Emails */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="sr-only">Loading scheduled emails</span>
            </div>
          ) : scheduledEmails.length === 0 ? (
            <div className="p-14 text-center">
              <CalendarIcon
                className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50"
                aria-hidden="true"
              />
              <h2 className="text-base font-semibold text-foreground">No scheduled emails</h2>
              <p className="mt-1.5 mb-5 text-sm text-muted-foreground">
                You haven&apos;t scheduled any emails yet.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMinDate(format(new Date(), 'yyyy-MM-dd'));
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Schedule your first email
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledEmails.map((email) => (
                  <TableRow key={email._id}>
                    <TableCell className="font-medium text-foreground">{email.subject}</TableCell>
                    <TableCell className="text-muted-foreground">{email.template}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      <span>{email.recipientCount}</span>{' '}
                      {email.recipientGroup &&
                      email.recipientGroup !== 'all' &&
                      email.recipientGroup !== 'individual' ? (
                        <Badge variant="outline" className="ml-1">
                          {email.recipientGroup}
                        </Badge>
                      ) : (
                        <span>contacts</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatScheduledDate(email.scheduledDate)}
                    </TableCell>
                    <TableCell>{getRecurrenceBadge(email.recurrence)}</TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {email.status === 'scheduled' && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Reschedule ${email.subject}`}
                              onClick={() => openRescheduleDialog(email)}
                              className="h-8 gap-1.5 px-2.5 text-foreground/80 hover:bg-accent hover:text-foreground"
                            >
                              <CalendarClock className="h-4 w-4" aria-hidden="true" />
                              <span className="hidden sm:inline">Reschedule</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Cancel scheduled email ${email.subject}`}
                              onClick={() => setCancellingEmail(email)}
                              className="size-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </>
                        )}
                        {['cancelled', 'sent', 'failed'].includes(email.status) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete scheduled email ${email.subject}`}
                            onClick={() => setDeletingEmail(email)}
                            className="size-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Email Dialog */}
      <Dialog
        open={!!reschedulingEmail}
        onOpenChange={(open) => {
          if (!open && !isRescheduling) {
            setReschedulingEmail(null);
            setRescheduleDateTime('');
            setRescheduleError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Reschedule Email</DialogTitle>
            <DialogDescription>
              {reschedulingEmail
                ? `Choose a new send time for “${reschedulingEmail.subject}”${localTimezone ? ` (${localTimezone})` : ''}.`
                : 'Choose a new future date and time.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reschedule-datetime">New Date &amp; Time</Label>
              <Input
                id="reschedule-datetime"
                name="rescheduleDateTime"
                type="datetime-local"
                min={minDateTime || undefined}
                value={rescheduleDateTime}
                onChange={(e) => {
                  setRescheduleDateTime(e.target.value);
                  if (rescheduleError) {
                    setRescheduleError(null);
                  }
                }}
                aria-invalid={Boolean(rescheduleError)}
                className="tabular-nums"
                required
              />
              {rescheduleError && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {rescheduleError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <span
                id="reschedule-presets-label"
                className="block text-xs font-medium text-foreground/80"
              >
                Quick Presets
              </span>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby="reschedule-presets-label"
              >
                {SCHEDULE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const { date, time } = preset.compute();
                      setRescheduleDateTime(`${date}T${time}`);
                      setRescheduleError(null);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReschedulingEmail(null);
                  setRescheduleDateTime('');
                  setRescheduleError(null);
                }}
                disabled={isRescheduling}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRescheduling}
                className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {isRescheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Cancel Scheduled Email Dialog */}
      <AlertDialog
        open={!!cancellingEmail}
        onOpenChange={(open) => {
          if (!open && !isCancelling) setCancellingEmail(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel scheduled email?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellingEmail ? (
                <>
                  This will cancel{' '}
                  <span className="font-medium text-foreground">
                    &ldquo;{cancellingEmail.subject}&rdquo;
                  </span>{' '}
                  scheduled for{' '}
                  <span className="tabular-nums">
                    {formatScheduledDate(cancellingEmail.scheduledDate)}
                  </span>
                  .
                </>
              ) : (
                'This scheduled send will be cancelled.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Schedule</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelling}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmCancelEmail();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCancelling ? 'Cancelling...' : 'Cancel Email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Scheduled Email Dialog */}
      <AlertDialog
        open={!!deletingEmail}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingEmail(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingEmail
                ? `“${deletingEmail.subject}” will be permanently removed from your schedule list. This can’t be undone.`
                : 'This entry will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDeleteEmail();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
