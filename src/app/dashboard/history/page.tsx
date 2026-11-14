"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  SearchIcon,
  RefreshCw,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Trash2,
  Download,
  RotateCcw,
} from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { requestJson } from '@/components/dashboard/requestJson';

interface EmailData {
  id: string;
  subject: string;
  recipient: string;
  recipients?: string[];
  templateId: string;
  templateName?: string;
  template?: string;
  sentDate: string;
  status: string;
  errorMessage?: string;
  content?: string;
}

interface HistoryResponse {
  emails?: EmailData[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages?: number;
    totalPages?: number;
  };
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'success':
    case 'delivered':
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        >
          Delivered
        </Badge>
      );
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        >
          Pending
        </Badge>
      );
    case 'partial':
      return (
        <Badge
          variant="outline"
          className="border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
        >
          Partial
        </Badge>
      );
    case 'failed':
    case 'bounced':
      return (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/10 text-destructive"
        >
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const resolveTemplateLabel = (email: EmailData) =>
  email.templateName || email.template || 'Custom / Unknown';

function parseLocalDateBoundary(dateStr: string, endOfDay: boolean): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^\s*[=+\-@\t\r|]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function EmailHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<EmailData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isInitialMount = useRef(true);
  const previousSearchRef = useRef(searchQuery);
  const historyAbortRef = useRef<AbortController | null>(null);
  const historyRequestIdRef = useRef(0);
  const detailsAbortRef = useRef<AbortController | null>(null);
  const detailsRequestIdRef = useRef(0);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    return () => {
      historyAbortRef.current?.abort();
      detailsAbortRef.current?.abort();
    };
  }, []);

  const fetchEmailHistory = useCallback(
    async (
      page = 1,
      search = searchQuery,
      status = statusFilter,
      from = fromDate,
      to = toDate
    ) => {
      historyAbortRef.current?.abort();
      const controller = new AbortController();
      historyAbortRef.current = controller;
      const requestId = ++historyRequestIdRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (status && status !== 'all') params.set('status', status);
        const fromIso = from ? parseLocalDateBoundary(from, false) : null;
        const toIso = to ? parseLocalDateBoundary(to, true) : null;
        if (fromIso) params.set('from', fromIso);
        if (toIso) params.set('to', toIso);
        params.set('page', page.toString());
        params.set('limit', pagination.limit.toString());

        const data = await requestJson<HistoryResponse>(
          `/api/email/history?${params.toString()}`,
          { signal: controller.signal },
          'Failed to fetch email history'
        );

        if (controller.signal.aborted || requestId !== historyRequestIdRef.current) {
          return;
        }

        const nextEmails = Array.isArray(data.emails) ? data.emails : [];
        setEmails(nextEmails);
        if (data.pagination) {
          setPagination((prev) => ({
            ...prev,
            page: data.pagination?.page ?? page,
            total: data.pagination?.total ?? nextEmails.length,
            pages: Math.max(1, data.pagination?.totalPages ?? data.pagination?.pages ?? 1),
          }));
        }
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return;
        }
        if (requestId !== historyRequestIdRef.current) return;

        const message = err instanceof Error ? err.message : 'Failed to fetch email history';
        setError(message);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message,
        });
      } finally {
        if (requestId === historyRequestIdRef.current && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [fromDate, pagination.limit, searchQuery, statusFilter, toDate, toast]
  );

  // Initial load & immediate fetch on filter/date changes; debounce search input only
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousSearchRef.current = searchQuery;
      fetchEmailHistory(1, searchQuery, statusFilter, fromDate, toDate);
      return;
    }

    const searchChanged = previousSearchRef.current !== searchQuery;
    previousSearchRef.current = searchQuery;
    const delay = searchChanged && searchQuery ? 400 : 0;
    const timer = setTimeout(() => {
      fetchEmailHistory(1, searchQuery, statusFilter, fromDate, toDate);
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, fromDate, toDate]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchEmailHistory(newPage, searchQuery, statusFilter, fromDate, toDate);
    }
  };

  const handleRefresh = () => {
    fetchEmailHistory(pagination.page, searchQuery, statusFilter, fromDate, toDate);
    toast({
      title: 'Refreshed',
      description: 'Email history has been refreshed',
    });
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || statusFilter !== 'all' || fromDate || toDate
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
  };

  const handleExportCsv = () => {
    if (emails.length === 0) return;

    const headers = ['Date', 'Recipient', 'Subject', 'Status', 'Error'].map(sanitizeCsvCell);
    const rows = emails.map((email) => {
      const recipientText =
        email.recipients && email.recipients.length > 0
          ? email.recipients.join('; ')
          : email.recipient;
      return [
        sanitizeCsvCell(formatDate(email.sentDate)),
        sanitizeCsvCell(recipientText),
        sanitizeCsvCell(email.subject),
        sanitizeCsvCell(email.status),
        sanitizeCsvCell(email.errorMessage ?? ''),
      ].join(',');
    });

    const csvContent = `\uFEFF${[headers.join(','), ...rows].join('\r\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `palettemail-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast({
      title: 'CSV Exported',
      description: `Exported ${emails.length} ${emails.length === 1 ? 'row' : 'rows'} from current page`,
    });
  };

  const handleRetryEmail = (email: EmailData) => {
    const retryRecipients =
      email.recipients && email.recipients.length > 0
        ? email.recipients
        : email.recipient
          ? [email.recipient]
          : [];
    const retryTarget = retryRecipients.join(', ');
    if (!retryTarget) {
      toast({
        variant: 'destructive',
        title: 'No recipient',
        description: 'This record does not have a valid recipient address to retry.',
      });
      return;
    }

    try {
      localStorage.setItem('palettemail:retryRecipient', retryTarget);
      localStorage.setItem(
        'palettemail:retryDraft',
        JSON.stringify({
          recipients: retryRecipients,
          templateId: email.templateId,
        })
      );
    } catch {
      // Ignore storage access errors in restricted browsing contexts
    }

    toast({
      title: 'Ready to resend',
      description: email.templateId
        ? 'Recipients and template pre-filled in Dashboard Composer'
        : 'Recipient pre-filled in Dashboard Composer',
    });
    router.push('/dashboard');
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmail) return;
    const target = deletingEmail;
    const previousEmails = emails;
    const previousTotal = pagination.total;

    setIsDeleting(true);
    // Optimistic removal
    setEmails((prev) => prev.filter((e) => e.id !== target.id));
    setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    setDeletingEmail(null);

    try {
      await requestJson(
        `/api/email/history/${target.id}`,
        { method: 'DELETE' },
        'Failed to delete email'
      );
      toast({ title: 'Deleted', description: 'Email removed from history' });
      const targetPage =
        previousEmails.length === 1 ? Math.max(1, pagination.page - 1) : pagination.page;
      await fetchEmailHistory(
        targetPage,
        searchQuery,
        statusFilter,
        fromDate,
        toDate
      );
    } catch (err: unknown) {
      setEmails(previousEmails);
      setPagination((prev) => ({ ...prev, total: previousTotal }));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete email',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const viewEmailDetails = async (email: EmailData) => {
    setSelectedEmail(email);
    setIsDetailsOpen(true);

    detailsAbortRef.current?.abort();
    const requestId = ++detailsRequestIdRef.current;

    if (!email.content) {
      const controller = new AbortController();
      detailsAbortRef.current = controller;
      setIsLoadingDetails(true);
      try {
        const data = await requestJson<{ email?: Partial<EmailData> }>(
          `/api/email/history/${email.id}`,
          { signal: controller.signal },
          'Failed to load email content'
        );
        if (controller.signal.aborted || requestId !== detailsRequestIdRef.current) {
          return;
        }
        if (data.email) {
          setSelectedEmail((prev) =>
            prev && prev.id === (data.email?.id || email.id)
              ? { ...prev, ...data.email }
              : prev
          );
        }
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return;
        }
        if (requestId !== detailsRequestIdRef.current) return;

        const message = err instanceof Error ? err.message : 'Failed to load email content';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message,
        });
      } finally {
        if (requestId === detailsRequestIdRef.current && !controller.signal.aborted) {
          setIsLoadingDetails(false);
        }
      }
    } else {
      detailsAbortRef.current = null;
      setIsLoadingDetails(false);
    }
  };

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
            Email History
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Inspect sent emails, delivery outcomes, and rendered message content.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={isLoading || emails.length === 0}
            title="Export current filtered page rows to CSV"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-border bg-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(150px,1fr)_minmax(155px,1fr)_minmax(155px,1fr)_auto] lg:items-end">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label
                htmlFor="history-search"
                className="mb-1.5 block text-xs font-medium text-foreground/80"
              >
                Search
              </Label>
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="history-search"
                  name="search"
                  type="search"
                  aria-label="Search email history"
                  placeholder="Search by subject or recipient..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="status-filter"
                className="mb-1.5 block text-xs font-medium text-foreground/80"
              >
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value: string) => setStatusFilter(value)}
              >
                <SelectTrigger id="status-filter" aria-label="Filter by status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Delivered</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="history-date-from"
                className="mb-1.5 block text-xs font-medium text-foreground/80"
              >
                From
              </Label>
              <Input
                id="history-date-from"
                name="from"
                type="date"
                aria-label="Filter from date"
                max={toDate || undefined}
                className="tabular-nums"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label
                htmlFor="history-date-to"
                className="mb-1.5 block text-xs font-medium text-foreground/80"
              >
                To
              </Label>
              <Input
                id="history-date-to"
                name="to"
                type="date"
                aria-label="Filter to date"
                min={fromDate || undefined}
                className="tabular-nums"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters || isLoading}
                className="h-10 w-full lg:w-auto"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      {/* Emails Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell colSpan={6} className="h-12 animate-pulse bg-muted/50" />
                  </TableRow>
                ))
              ) : emails.length > 0 ? (
                emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="max-w-xs truncate font-medium text-foreground">
                      {email.subject}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {email.recipients && email.recipients.length > 1
                        ? `${email.recipient} + ${email.recipients.length - 1} more`
                        : email.recipient}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDate(email.sentDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {resolveTemplateLabel(email)}
                    </TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {(email.status === 'failed' || email.status === 'partial') && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Retry / Resend ${email.subject}`}
                            onClick={() => handleRetryEmail(email)}
                            className="h-8 gap-1.5 px-2.5 text-indigo-600 hover:bg-indigo-500/10 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Retry / Resend</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`View details for ${email.subject}`}
                          onClick={() => viewEmailDetails(email)}
                        >
                          <EyeIcon className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${email.subject}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingEmail(email)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No emails found. Try a different search or filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-4">
              <div className="text-sm tabular-nums text-muted-foreground">
                Showing {emails.length} of {pagination.total} emails
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Previous page"
                  disabled={pagination.page === 1 || isLoading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="text-sm tabular-nums text-foreground">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Next page"
                  disabled={pagination.page === pagination.pages || isLoading}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Details Dialog */}
      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            detailsAbortRef.current?.abort();
            detailsAbortRef.current = null;
            detailsRequestIdRef.current += 1;
            setIsLoadingDetails(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEmail.subject}</DialogTitle>
                <DialogDescription className="tabular-nums">
                  Sent on {formatDate(selectedEmail.sentDate)}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </h3>
                    <div className="mt-1.5">{getStatusBadge(selectedEmail.status)}</div>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Template
                    </h3>
                    <div className="mt-1.5 text-sm font-medium text-foreground">
                      {resolveTemplateLabel(selectedEmail)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Recipients
                  </h3>
                  <div className="mt-1.5 text-sm text-foreground">
                    {selectedEmail.recipients && selectedEmail.recipients.length > 0 ? (
                      <ul className="list-inside list-disc space-y-0.5">
                        {selectedEmail.recipients.map((recipient, index) => (
                          <li key={`${recipient}-${index}`}>{recipient}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>{selectedEmail.recipient}</span>
                    )}
                  </div>
                </div>

                {selectedEmail.errorMessage && (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-destructive">
                      Error
                    </h3>
                    <div className="mt-1.5 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                      {selectedEmail.errorMessage}
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EyeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <h3 className="text-sm font-medium text-foreground">
                        Email Content Preview
                      </h3>
                    </div>
                    {isLoadingDetails && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" aria-hidden="true" />
                        Loading content...
                      </div>
                    )}
                  </div>

                  <div className="max-h-[420px] min-h-[200px] overflow-auto rounded-md border border-border bg-muted/40 p-4">
                    <div className="mb-3 border-b border-border pb-2.5">
                      <div className="text-sm font-medium text-foreground">
                        Subject: {selectedEmail.subject}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        To: {selectedEmail.recipients?.join(', ') || selectedEmail.recipient}
                      </div>
                    </div>

                    {isLoadingDetails ? (
                      <div className="flex h-[280px] items-center justify-center rounded bg-muted animate-pulse">
                        <p className="text-sm text-muted-foreground">Loading email content...</p>
                      </div>
                    ) : selectedEmail.content ? (
                      <iframe
                        srcDoc={selectedEmail.content}
                        className="h-[300px] w-full rounded border border-border bg-white"
                        title="Email content"
                        sandbox=""
                      />
                    ) : (
                      <div className="flex h-[280px] items-center justify-center rounded bg-muted">
                        <p className="text-sm text-muted-foreground">Content not available.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingEmail}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingEmail(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingEmail
                ? `“${deletingEmail.subject}” will be permanently removed from your history. This can’t be undone.`
                : 'This record will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
