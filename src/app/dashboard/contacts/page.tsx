"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  PlusIcon,
  SearchIcon,
  DownloadIcon,
  Upload,
  TrashIcon,
  PencilIcon,
  Loader2,
  Users,
  AlertCircle,
  RefreshCw,
  ChevronLeftIcon,
  ChevronRightIcon,
  Tag,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
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
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requestJson } from '@/components/dashboard/requestJson';

interface Contact {
  _id: string;
  name: string;
  email: string;
  company?: string;
  tags: string[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ContactsResponse {
  contacts?: Contact[];
  pagination?: Partial<PaginationMeta>;
}

interface BulkImportResponse {
  message?: string;
  importedCount?: number;
  skippedCount?: number;
  invalidCount?: number;
}

interface BulkPatchResponse {
  message?: string;
  modifiedCount?: number;
}

interface BulkDeleteResponse {
  message?: string;
  deletedCount?: number;
}

interface ParsedCsvContact {
  rowNumber: number;
  email: string;
  name: string;
  company: string;
  tags: string[];
  isValid: boolean;
  error?: string;
}

interface CsvParseResult {
  parsedRows: ParsedCsvContact[];
  validRows: ParsedCsvContact[];
  invalidRows: ParsedCsvContact[];
  hasHeader: boolean;
  headerError?: string;
}

const EMAIL_REGEX =
  /^[^\s@<>()[\]\\,;:"']{1,64}@[^\s@<>()[\]\\.,;:"']+(?:\.[^\s@<>()[\]\\.,;:"']+)+$/;
const FORMULA_PREFIX_REGEX = /^\s*[=+\-@\t\r|]/;
const CSV_SAMPLE_TEMPLATE = [
  'email,name,company,tags',
  'alex@company.com,Alex Morgan,"Acme, Inc.",vip;newsletter',
  'jordan@studio.io,Jordan Lee,Northstar Labs,prospect|q2-launch',
].join('\n');
const CSV_PREVIEW_LIMIT = 8;
const BULK_IMPORT_CHUNK_SIZE = 500;
const MAX_CSV_IMPORT_ROWS = 5000;
const MAX_CSV_FILE_BYTES = 2 * 1024 * 1024;

function isValidEmail(value: string): boolean {
  return value.length > 0 && value.length <= 254 && EMAIL_REGEX.test(value);
}

const EMAIL_HEADER_ALIASES = new Set([
  'email',
  'e-mail',
  'email address',
  'email_address',
  'mail',
]);
const NAME_HEADER_ALIASES = new Set([
  'name',
  'full name',
  'full_name',
  'fullname',
  'contact',
  'contact name',
]);
const FIRST_NAME_ALIASES = new Set(['first name', 'first_name', 'firstname', 'given name']);
const LAST_NAME_ALIASES = new Set([
  'last name',
  'last_name',
  'lastname',
  'surname',
  'family name',
]);
const COMPANY_HEADER_ALIASES = new Set([
  'company',
  'organization',
  'organisation',
  'org',
  'company name',
  'company_name',
]);
const TAGS_HEADER_ALIASES = new Set(['tags', 'tag', 'labels', 'label', 'groups', 'group']);

function isKnownHeaderToken(token: string): boolean {
  return (
    EMAIL_HEADER_ALIASES.has(token) ||
    NAME_HEADER_ALIASES.has(token) ||
    FIRST_NAME_ALIASES.has(token) ||
    LAST_NAME_ALIASES.has(token) ||
    COMPANY_HEADER_ALIASES.has(token) ||
    TAGS_HEADER_ALIASES.has(token) ||
    token === 'status'
  );
}

/**
 * RFC-4180-aware CSV parser supporting BOM stripping, quoted fields with commas,
 * escaped double quotes (""), and CRLF/LF/CR line endings.
 */
function parseCsvMatrix(rawInput: string): string[][] {
  const input = rawInput.replace(/^\uFEFF/, '');
  if (!input.trim()) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"' && currentField.trim() === '') {
      currentField = '';
      inQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && input[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function detectEmailColumnIndex(rows: string[][]): number {
  const sampleRows = rows
    .filter((cols) => cols.some((cell) => cell.trim() !== ''))
    .slice(0, 5);
  if (sampleRows.length === 0) return -1;

  const columnScores = new Map<number, number>();
  for (const cols of sampleRows) {
    for (let colIdx = 0; colIdx < cols.length; colIdx++) {
      const candidate = cols[colIdx].trim().toLowerCase();
      if (isValidEmail(candidate)) {
        columnScores.set(colIdx, (columnScores.get(colIdx) ?? 0) + 1);
      }
    }
  }

  let bestCol = -1;
  let bestScore = 0;
  columnScores.forEach((score, colIdx) => {
    if (score > bestScore || (score === bestScore && (bestCol === -1 || colIdx < bestCol))) {
      bestCol = colIdx;
      bestScore = score;
    }
  });
  return bestCol;
}

function parseContactsCsv(rawInput: string): CsvParseResult {
  const matrix = parseCsvMatrix(rawInput);
  if (matrix.length === 0) {
    return { parsedRows: [], validRows: [], invalidRows: [], hasHeader: false };
  }

  const firstRow = matrix[0].map((cell) => cell.trim());
  const firstRowNormalized = firstRow.map((cell) =>
    cell.replace(/\s+/g, ' ').toLowerCase()
  );
  const firstRowHasEmail = firstRow.some((cell) => isValidEmail(cell.toLowerCase()));
  const hasHeader =
    !firstRowHasEmail && firstRowNormalized.some((token) => isKnownHeaderToken(token));

  const dataRows = hasHeader ? matrix.slice(1) : matrix;

  let emailIdx = 0;
  let nameIdx = 1;
  let firstNameIdx = -1;
  let lastNameIdx = -1;
  let companyIdx = 2;
  let tagsIdx = 3;

  if (hasHeader) {
    emailIdx = firstRowNormalized.findIndex((token) => EMAIL_HEADER_ALIASES.has(token));
    nameIdx = firstRowNormalized.findIndex((token) => NAME_HEADER_ALIASES.has(token));
    firstNameIdx = firstRowNormalized.findIndex((token) => FIRST_NAME_ALIASES.has(token));
    lastNameIdx = firstRowNormalized.findIndex((token) => LAST_NAME_ALIASES.has(token));
    companyIdx = firstRowNormalized.findIndex((token) => COMPANY_HEADER_ALIASES.has(token));
    tagsIdx = firstRowNormalized.findIndex((token) => TAGS_HEADER_ALIASES.has(token));

    if (emailIdx === -1) {
      const detectedEmailIdx = detectEmailColumnIndex(dataRows);
      if (detectedEmailIdx === -1) {
        return {
          parsedRows: [],
          validRows: [],
          invalidRows: [],
          hasHeader: true,
          headerError:
            'Could not detect an email column. Include an "email" header or ensure at least one of the first 5 rows contains a valid email address.',
        };
      }
      emailIdx = detectedEmailIdx;
    }
  } else {
    const detectedEmailIdx = detectEmailColumnIndex(dataRows);
    if (detectedEmailIdx === -1) {
      return {
        parsedRows: [],
        validRows: [],
        invalidRows: [],
        hasHeader: false,
        headerError:
          'Could not detect an email column in the first 5 rows. Include a header row (e.g. email,name,company,tags) or ensure at least one of the first 5 rows contains a valid email address.',
      };
    }

    emailIdx = detectedEmailIdx;
    const remainingCols = [0, 1, 2, 3].filter((col) => col !== detectedEmailIdx);
    nameIdx = remainingCols[0] ?? -1;
    companyIdx = remainingCols[1] ?? -1;
    tagsIdx = remainingCols[2] ?? -1;
  }

  const startIndex = hasHeader ? 1 : 0;
  const parsedRows: ParsedCsvContact[] = [];
  const validRows: ParsedCsvContact[] = [];
  const invalidRows: ParsedCsvContact[] = [];

  for (let i = startIndex; i < matrix.length; i++) {
    const cols = matrix[i];
    if (!cols.some((cell) => cell.trim() !== '')) {
      continue;
    }

    const email = (cols[emailIdx] ?? '').trim().toLowerCase();
    let rawName = nameIdx >= 0 ? (cols[nameIdx] ?? '').trim() : '';
    if (!rawName && (firstNameIdx >= 0 || lastNameIdx >= 0)) {
      const first = firstNameIdx >= 0 ? (cols[firstNameIdx] ?? '').trim() : '';
      const last = lastNameIdx >= 0 ? (cols[lastNameIdx] ?? '').trim() : '';
      rawName = [first, last].filter(Boolean).join(' ');
    }

    const company = companyIdx >= 0 ? (cols[companyIdx] ?? '').trim() : '';
    const rawTags = tagsIdx >= 0 ? (cols[tagsIdx] ?? '').trim() : '';
    const tags = rawTags
      ? Array.from(
          new Set(
            rawTags
              .split(/[;|,]/)
              .map((t) => t.trim())
              .filter(Boolean)
          )
        )
      : [];

    const isValid = isValidEmail(email);
    const displayName = rawName || (isValid ? email.split('@')[0] || '' : '');
    const row: ParsedCsvContact = {
      rowNumber: i + 1,
      email,
      name: displayName,
      company,
      tags,
      isValid,
      error: !email
        ? 'Missing email'
        : email.length > 254
          ? 'Email exceeds 254 characters'
          : !isValid
            ? 'Invalid email format'
            : undefined,
    };

    parsedRows.push(row);
    if (isValid) {
      validRows.push(row);
    } else {
      invalidRows.push(row);
    }
  }

  return { parsedRows, validRows, invalidRows, hasHeader };
}

function escapeCsvCell(value: string): string {
  const preNeutralized = FORMULA_PREFIX_REGEX.test(value) ? `'${value}` : value;
  const normalized = preNeutralized.replace(/[\r\n]+/g, ' ');
  const postNeutralized = FORMULA_PREFIX_REGEX.test(normalized)
    ? `'${normalized}`
    : normalized;
  return `"${postNeutralized.replace(/"/g, '""')}"`;
}

const pressFeedbackClass =
  'active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none';

export default function ContactsPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [newContact, setNewContact] = useState({ name: '', email: '', company: '', tags: '' });
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContact, setEditingContact] = useState<null | {
    id: string;
    name: string;
    email: string;
    company: string;
    tags: string;
  }>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk selection & actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const fetchRequestIdRef = useRef(0);
  const pendingRevokesRef = useRef<Map<number, string>>(new Map());

  // CSV Import modal state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  useEffect(() => {
    const pending = pendingRevokesRef.current;
    return () => {
      pending.forEach((url, timerId) => {
        window.clearTimeout(timerId);
        URL.revokeObjectURL(url);
      });
      pending.clear();
    };
  }, []);

  const scheduleFileDownload = useCallback(
    (content: string, filename: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      const timerId = window.setTimeout(() => {
        URL.revokeObjectURL(url);
        pendingRevokesRef.current.delete(timerId);
      }, 1000);
      pendingRevokesRef.current.set(timerId, url);
    },
    []
  );

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === debouncedSearch) return;
    const delay = trimmed ? 300 : 0;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  const fetchContacts = useCallback(
    async (page = 1) => {
      fetchAbortControllerRef.current?.abort();
      const controller = new AbortController();
      fetchAbortControllerRef.current = controller;
      const requestId = ++fetchRequestIdRef.current;

      setIsLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
        });
        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }
        if (selectedTag !== 'all') {
          params.set('tag', selectedTag);
        }

        const data = await requestJson<ContactsResponse>(
          `/api/contacts?${params.toString()}`,
          { signal: controller.signal },
          'Failed to load contacts'
        );

        if (controller.signal.aborted || requestId !== fetchRequestIdRef.current) {
          return;
        }

        const nextContacts = Array.isArray(data.contacts) ? data.contacts : [];
        setContacts(nextContacts);

        const pageTags = new Set<string>();
        nextContacts.forEach((contact) => {
          if (Array.isArray(contact.tags)) {
            contact.tags.forEach((tag) => {
              const trimmed = tag.trim();
              if (trimmed) pageTags.add(trimmed);
            });
          }
        });
        const isUnfilteredSinglePage =
          !debouncedSearch &&
          selectedTag === 'all' &&
          (data.pagination?.totalPages ?? 1) <= 1;
        setKnownTags((prev) => {
          if (isUnfilteredSinglePage) {
            return Array.from(pageTags).sort((a, b) => a.localeCompare(b));
          }
          const merged = new Set(prev);
          pageTags.forEach((tag) => merged.add(tag));
          if (selectedTag !== 'all') {
            merged.add(selectedTag);
          }
          return Array.from(merged).sort((a, b) => a.localeCompare(b));
        });

        // Clear stale selections not present in the freshly loaded contacts
        const validIdsSet = new Set(nextContacts.map((contact) => contact._id));
        setSelectedIds((prev) => {
          if (prev.size === 0) return prev;
          const next = new Set<string>();
          prev.forEach((id) => {
            if (validIdsSet.has(id)) next.add(id);
          });
          return next.size === prev.size ? prev : next;
        });

        if (data.pagination) {
          const total = data.pagination.total ?? nextContacts.length;
          const limit = data.pagination.limit ?? pagination.limit;
          setPagination({
            page: data.pagination.page ?? page,
            limit,
            total,
            totalPages: Math.max(1, data.pagination.totalPages ?? 1),
          });
        } else {
          setPagination((prev) => ({
            ...prev,
            page: 1,
            total: nextContacts.length,
            totalPages: 1,
          }));
        }
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError') ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
          return;
        }
        if (requestId !== fetchRequestIdRef.current) return;

        const message = error instanceof Error ? error.message : 'Failed to load contacts';
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
    },
    [debouncedSearch, pagination.limit, selectedTag, toast]
  );

  useEffect(() => {
    fetchContacts(1);
    return () => {
      fetchAbortControllerRef.current?.abort();
    };
  }, [fetchContacts]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      fetchContacts(newPage);
    }
  };

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>(knownTags);
    contacts.forEach((contact) => {
      if (Array.isArray(contact.tags)) {
        contact.tags.forEach((tag) => {
          const trimmed = tag.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    if (selectedTag !== 'all') {
      tagSet.add(selectedTag);
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [knownTags, contacts, selectedTag]);

  const filteredContacts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesTag =
        selectedTag === 'all' ||
        (Array.isArray(contact.tags) &&
          contact.tags.some((tag) => tag.trim() === selectedTag));
      if (!matchesTag) return false;
      if (!normalizedQuery) return true;
      return (
        contact.name.toLowerCase().includes(normalizedQuery) ||
        contact.email.toLowerCase().includes(normalizedQuery) ||
        (contact.company && contact.company.toLowerCase().includes(normalizedQuery)) ||
        (Array.isArray(contact.tags) &&
          contact.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)))
      );
    });
  }, [contacts, searchQuery, selectedTag]);

  // Visible selection state for header Select All checkbox
  const visibleContactIds = useMemo(
    () => filteredContacts.map((contact) => contact._id),
    [filteredContacts]
  );

  useEffect(() => {
    const visibleSet = new Set(visibleContactIds);
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleSet.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [visibleContactIds]);
  const selectedVisibleCount = useMemo(
    () => visibleContactIds.filter((id) => selectedIds.has(id)).length,
    [visibleContactIds, selectedIds]
  );
  const allVisibleSelected =
    visibleContactIds.length > 0 && selectedVisibleCount === visibleContactIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleContactIds.forEach((id) => next.delete(id));
      } else {
        visibleContactIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleRow = (contactId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setBulkTagInput('');
  };

  const deferredCsvText = useDeferredValue(csvText);
  const parsedCsv = useMemo(() => parseContactsCsv(deferredCsvText), [deferredCsvText]);
  const isCsvParsing = csvText !== deferredCsvText;
  const exceedsImportLimit = parsedCsv.validRows.length > MAX_CSV_IMPORT_ROWS;
  const previewRows = useMemo(
    () => parsedCsv.parsedRows.slice(0, CSV_PREVIEW_LIMIT),
    [parsedCsv.parsedRows]
  );

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_CSV_FILE_BYTES) {
      toast({
        title: 'File too large',
        description: 'Please upload a CSV file smaller than 2 MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const content = await file.text();
      setCsvText(content);
      setCsvFileName(file.name);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to read the selected CSV file.',
        variant: 'destructive',
      });
    }
  };

  const handleImportCsv = async () => {
    if (parsedCsv.validRows.length === 0) {
      toast({
        title: 'No valid contacts',
        description: 'Provide at least one row with a valid email address before importing.',
        variant: 'destructive',
      });
      return;
    }

    if (parsedCsv.validRows.length > MAX_CSV_IMPORT_ROWS) {
      toast({
        title: 'Too many contacts',
        description: `Please import at most ${MAX_CSV_IMPORT_ROWS.toLocaleString()} contacts per batch.`,
        variant: 'destructive',
      });
      return;
    }

    const payloadRows = parsedCsv.validRows.map(({ email, name, company, tags }) => ({
      email,
      name,
      company,
      tags,
    }));

    let totalImported = 0;
    let totalSkipped = 0;
    let totalServerInvalid = 0;
    let completedChunks = 0;

    try {
      setIsImportingCsv(true);

      for (let i = 0; i < payloadRows.length; i += BULK_IMPORT_CHUNK_SIZE) {
        const chunk = payloadRows.slice(i, i + BULK_IMPORT_CHUNK_SIZE);
        const data = await requestJson<BulkImportResponse>(
          '/api/contacts',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contacts: chunk }),
          },
          'Failed to import contacts'
        );
        completedChunks += 1;
        totalImported += data.importedCount ?? 0;
        totalSkipped += data.skippedCount ?? 0;
        totalServerInvalid += data.invalidCount ?? 0;
      }

      const invalidTotal = parsedCsv.invalidRows.length + totalServerInvalid;
      toast({
        title: 'CSV Import Complete',
        description: `Imported ${totalImported}, skipped ${totalSkipped} duplicate${
          totalSkipped === 1 ? '' : 's'
        }${invalidTotal > 0 ? `, ${invalidTotal} invalid` : ''}`,
      });

      setCsvText('');
      setCsvFileName(null);
      setIsImportOpen(false);
      await fetchContacts(1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to import contacts';
      if (completedChunks > 0) {
        await fetchContacts(1);
        toast({
          title: 'Partial Import',
          description: `Imported ${totalImported} before error${
            totalSkipped > 0 ? ` (skipped ${totalSkipped})` : ''
          }: ${message}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Import Failed',
          description: message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsImportingCsv(false);
    }
  };

  const handleBulkAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = bulkTagInput.trim();
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !cleanTag) return;

    if (cleanTag.length > 50) {
      toast({
        title: 'Tag too long',
        description: 'Tags must be 50 characters or fewer.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsBulkTagging(true);
      const data = await requestJson<BulkPatchResponse>(
        '/api/contacts',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids, addTag: cleanTag }),
        },
        'Failed to tag selected contacts'
      );

      const idSet = new Set(ids);
      setContacts((prev) =>
        prev.map((contact) => {
          if (!idSet.has(contact._id)) return contact;
          const existingTags = Array.isArray(contact.tags) ? contact.tags : [];
          if (existingTags.includes(cleanTag)) return contact;
          return { ...contact, tags: [...existingTags, cleanTag] };
        })
      );
      setBulkTagInput('');

      const modifiedCount = data.modifiedCount ?? 0;
      toast({
        title: 'Tags Updated',
        description:
          modifiedCount > 0
            ? `Added tag "${cleanTag}" to ${modifiedCount} contact${modifiedCount === 1 ? '' : 's'}`
            : `All selected contacts already have tag "${cleanTag}"`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update tags';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkTagging(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      setIsBulkDeleting(true);
      const data = await requestJson<BulkDeleteResponse>(
        '/api/contacts',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids }),
        },
        'Failed to delete selected contacts'
      );

      const deletedSet = new Set(ids);
      const remainingOnPage = contacts.filter((contact) => !deletedSet.has(contact._id)).length;
      const targetPage =
        remainingOnPage === 0 && pagination.page > 1 ? pagination.page - 1 : pagination.page;

      setSelectedIds(new Set());
      setIsBulkDeleteOpen(false);
      await fetchContacts(targetPage);

      const deletedCount = data.deletedCount ?? ids.length;
      toast({
        title: 'Contacts Deleted',
        description: `Deleted ${deletedCount} selected contact${deletedCount === 1 ? '' : 's'}`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete contacts';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim() || !newContact.email.trim()) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await requestJson<{ contact: Contact }>(
        '/api/contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newContact.name.trim(),
            email: newContact.email.trim(),
            company: newContact.company.trim(),
            tags: newContact.tags,
          }),
        },
        'Failed to add contact'
      );

      setNewContact({ name: '', email: '', company: '', tags: '' });
      setIsAddContactOpen(false);
      await fetchContacts(1);

      toast({
        title: 'Success',
        description: 'Contact added successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add contact';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    if (!editingContact.name.trim() || !editingContact.email.trim()) {
      toast({
        title: 'Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await requestJson<{ contact: Contact }>(
        `/api/contacts/${editingContact.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editingContact.name.trim(),
            email: editingContact.email.trim(),
            company: editingContact.company.trim(),
            tags: editingContact.tags,
          }),
        },
        'Failed to update contact'
      );

      if (data.contact) {
        setContacts((prev) =>
          prev.map((contact) => (contact._id === editingContact.id ? data.contact : contact))
        );
      }

      setEditingContact(null);

      toast({
        title: 'Success',
        description: 'Contact updated successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update contact';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteContact = async () => {
    if (!deletingContact) return;

    try {
      setIsDeleting(true);
      await requestJson(
        `/api/contacts/${deletingContact._id}`,
        {
          method: 'DELETE',
        },
        'Failed to delete contact'
      );

      const deletedId = deletingContact._id;
      const previousLength = contacts.length;
      setContacts((prev) => prev.filter((contact) => contact._id !== deletedId));
      setSelectedIds((prev) => {
        if (!prev.has(deletedId)) return prev;
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });
      setPagination((prev) => {
        const nextTotal = Math.max(0, prev.total - 1);
        return {
          ...prev,
          total: nextTotal,
          totalPages: Math.max(1, Math.ceil(nextTotal / prev.limit)),
        };
      });
      setDeletingContact(null);

      if (previousLength === 1 && pagination.page > 1) {
        fetchContacts(pagination.page - 1);
      }

      toast({
        title: 'Success',
        description: 'Contact deleted successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete contact';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const exportContactsJson = () => {
    if (contacts.length === 0) {
      toast({
        title: 'No contacts to export',
        description: 'Add at least one contact before exporting.',
        variant: 'destructive',
      });
      return;
    }
    const jsonString = JSON.stringify(contacts, null, 2);
    scheduleFileDownload(jsonString, 'contacts.json', 'application/json');
    toast({
      title: 'Success',
      description: 'Contacts exported as JSON',
    });
  };

  const exportContactsCsv = () => {
    if (contacts.length === 0) {
      toast({
        title: 'No contacts to export',
        description: 'Add at least one contact before exporting.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Name', 'Email', 'Company', 'Tags'].map(escapeCsvCell);
    const rows = contacts.map((contact) =>
      [
        escapeCsvCell(contact.name || ''),
        escapeCsvCell(contact.email || ''),
        escapeCsvCell(contact.company || ''),
        escapeCsvCell(Array.isArray(contact.tags) ? contact.tags.join('; ') : ''),
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\r\n');
    scheduleFileDownload(`\uFEFF${csvContent}`, 'contacts.csv', 'text/csv;charset=utf-8;');

    toast({
      title: 'Success',
      description: 'Contacts exported as CSV',
    });
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedTag !== 'all');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Contact Lists
            </h1>
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {pagination.total || contacts.length}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your contacts, companies, and recipient audience tags.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={exportContactsJson}
            className={`min-h-11 sm:min-h-9 ${pressFeedbackClass}`}
          >
            <DownloadIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportContactsCsv}
            className={`min-h-11 sm:min-h-9 ${pressFeedbackClass}`}
          >
            <DownloadIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className={`min-h-11 sm:min-h-9 ${pressFeedbackClass}`}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Import CSV
          </Button>

          <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                className={`min-h-11 sm:min-h-9 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 ${pressFeedbackClass}`}
              >
                <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact to your audience directory.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddContact} className="space-y-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-contact-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="add-contact-name"
                    name="name"
                    autoComplete="name"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="col-span-3 min-h-11 sm:min-h-9"
                    placeholder="Alex Morgan"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-contact-email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="add-contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="col-span-3 min-h-11 sm:min-h-9"
                    placeholder="alex@company.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-contact-company" className="text-right">
                    Company
                  </Label>
                  <Input
                    id="add-contact-company"
                    name="company"
                    autoComplete="organization"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    className="col-span-3 min-h-11 sm:min-h-9"
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-contact-tags" className="text-right">
                    Tags
                  </Label>
                  <Input
                    id="add-contact-tags"
                    name="tags"
                    autoComplete="off"
                    value={newContact.tags}
                    onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                    className="col-span-3 min-h-11 sm:min-h-9"
                    placeholder="customer, prospect, newsletter"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddContactOpen(false)}
                    disabled={isSubmitting}
                    className={`min-h-11 sm:min-h-9 ${pressFeedbackClass}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={`min-h-11 sm:min-h-9 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 ${pressFeedbackClass}`}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Contact
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Tag Filter */}
      <Card className="mb-6 border-border bg-card">
        <CardContent className="pt-6">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="contacts-search"
              name="search"
              type="search"
              aria-label="Search contacts"
              placeholder="Search contacts by name, email, company, or tag..."
              className="min-h-11 sm:min-h-9 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {availableTags.length > 0 && (
            <div
              role="group"
              aria-label="Filter contacts by tag"
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                aria-pressed={selectedTag === 'all'}
                onClick={() => setSelectedTag('all')}
                className={`min-h-11 sm:min-h-7 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${pressFeedbackClass} ${
                  selectedTag === 'all'
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                    : 'border border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                All
              </button>
              {availableTags.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTag(isSelected ? 'all' : tag)}
                    className={`min-h-11 sm:min-h-7 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${pressFeedbackClass} ${
                      isSelected
                        ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                        : 'border border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {fetchError && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{fetchError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchContacts(pagination.page)}
            className={`min-h-11 sm:min-h-8 ${pressFeedbackClass}`}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* Contacts Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="sr-only">Loading contacts</span>
            </div>
          ) : !hasActiveFilters && contacts.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">No contacts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first contact or import a CSV to start organizing recipient groups.
              </p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? `No contacts match “${searchQuery}”${selectedTag !== 'all' ? ` in tag “${selectedTag}”` : ''}.`
                  : `No contacts found with tag “${selectedTag}”.`}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`mt-3 min-h-11 sm:min-h-8 ${pressFeedbackClass}`}
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                  setSelectedTag('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-2">
                      <label className={`inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted/60 ${pressFeedbackClass}`}>
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={handleToggleSelectAll}
                          aria-label="Select all visible contacts"
                          className="h-4 w-4 cursor-pointer rounded border-input accent-indigo-600"
                        />
                      </label>
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => {
                    const isRowSelected = selectedIds.has(contact._id);
                    return (
                      <TableRow
                        key={contact._id}
                        data-state={isRowSelected ? 'selected' : undefined}
                      >
                        <TableCell className="w-12 px-2" onClick={(e) => e.stopPropagation()}>
                          <label
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted/60 ${pressFeedbackClass}`}
                          >
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleToggleRow(contact._id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${contact.name}`}
                              className="h-4 w-4 cursor-pointer rounded border-input accent-indigo-600"
                            />
                          </label>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{contact.name}</TableCell>
                        <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.company || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(contact.tags) && contact.tags.length > 0 ? (
                              contact.tags.map((tag, index) => (
                                <span
                                  key={`${contact._id}-${tag}-${index}`}
                                  className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Edit ${contact.name}`}
                              className={`min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 ${pressFeedbackClass}`}
                              onClick={() =>
                                setEditingContact({
                                  id: contact._id,
                                  name: contact.name,
                                  email: contact.email,
                                  company: contact.company || '',
                                  tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
                                })
                              }
                            >
                              <PencilIcon className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete ${contact.name}`}
                              className={`min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 text-muted-foreground hover:text-destructive ${pressFeedbackClass}`}
                              onClick={() => setDeletingContact(contact)}
                            >
                              <TrashIcon className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-4">
                  <div className="text-sm tabular-nums text-muted-foreground">
                    Showing {contacts.length} of {pagination.total} contacts
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label="Previous page"
                      disabled={pagination.page <= 1 || isLoading}
                      onClick={() => handlePageChange(pagination.page - 1)}
                      className={`min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 ${pressFeedbackClass}`}
                    >
                      <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <span className="text-sm tabular-nums text-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label="Next page"
                      disabled={pagination.page >= pagination.totalPages || isLoading}
                      onClick={() => handlePageChange(pagination.page + 1)}
                      className={`min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 ${pressFeedbackClass}`}
                    >
                      <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Translucent Apple-Styled Sticky Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            role="region"
            aria-label="Bulk contact actions"
            className="bg-background/90 backdrop-blur-xl border border-border/60 shadow-lg rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-30 mt-4"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-indigo-500/25 bg-indigo-500/15 px-3 py-1 text-xs font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                {selectedIds.size} selected
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                disabled={isBulkTagging || isBulkDeleting}
                className={`min-h-11 sm:min-h-9 text-xs ${pressFeedbackClass}`}
              >
                Clear
              </Button>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-initial">
              <form
                onSubmit={handleBulkAddTag}
                className="flex flex-1 flex-wrap items-center gap-2 sm:flex-initial"
              >
                <Input
                  type="text"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="Add tag..."
                  maxLength={50}
                  aria-label="Add tag to selected contacts"
                  disabled={isBulkTagging || isBulkDeleting}
                  className="min-h-11 sm:min-h-9 w-full sm:w-44"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isBulkTagging || isBulkDeleting || !bulkTagInput.trim()}
                  className={`min-h-11 sm:min-h-9 ${pressFeedbackClass}`}
                >
                  {isBulkTagging ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Tag className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Apply Tag
                </Button>
              </form>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isBulkTagging || isBulkDeleting}
                onClick={() => setIsBulkDeleteOpen(true)}
                className={`min-h-11 sm:min-h-9 ${pressFeedbackClass}`}
              >
                <TrashIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Delete Selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV Import Dialog */}
      <Dialog
        open={isImportOpen}
        onOpenChange={(open) => {
          if (!open && isImportingCsv) return;
          setIsImportOpen(open);
          if (!open) {
            setCsvText('');
            setCsvFileName(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Import Contacts from CSV</DialogTitle>
              <DialogDescription>
                Upload a `.csv` file or paste CSV rows below. Duplicate emails are skipped automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="csv-file-input" className="text-sm font-medium">
                  Upload CSV file
                </Label>
                {csvFileName && (
                  <span className="text-xs text-muted-foreground">
                    Loaded: <span className="font-medium text-foreground">{csvFileName}</span>
                  </span>
                )}
              </div>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                disabled={isImportingCsv}
                className={`block w-full min-h-11 cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:border-indigo-500/50 hover:file:bg-indigo-700 dark:file:bg-indigo-500 dark:hover:file:bg-indigo-600 ${pressFeedbackClass}`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="csv-paste-textarea" className="text-sm font-medium">
                  Or paste CSV content
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvText(CSV_SAMPLE_TEMPLATE);
                      setCsvFileName(null);
                    }}
                    disabled={isImportingCsv}
                    className={`min-h-11 sm:min-h-7 rounded-md px-2 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400 ${pressFeedbackClass}`}
                  >
                    Use example
                  </button>
                  {csvText && (
                    <button
                      type="button"
                      onClick={() => {
                        setCsvText('');
                        setCsvFileName(null);
                      }}
                      disabled={isImportingCsv}
                      className={`min-h-11 sm:min-h-7 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground ${pressFeedbackClass}`}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <Textarea
                id="csv-paste-textarea"
                rows={5}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  if (csvFileName) setCsvFileName(null);
                }}
                disabled={isImportingCsv}
                placeholder={CSV_SAMPLE_TEMPLATE}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Expected columns: <code className="rounded bg-muted px-1 py-0.5 text-foreground">email,name,company,tags</code> (optional header row; separate multiple tags with <code className="rounded bg-muted px-1 py-0.5 text-foreground">;</code> or <code className="rounded bg-muted px-1 py-0.5 text-foreground">|</code>).
              </p>
            </div>

            {deferredCsvText.trim().length > 0 &&
              (parsedCsv.headerError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{parsedCsv.headerError}</span>
                </div>
              ) : parsedCsv.parsedRows.length === 0 ? (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    No contact rows found. Add at least one data row below the header to preview and import.
                  </span>
                </div>
              ) : null)}

            {parsedCsv.parsedRows.length > 0 && (
              <div className="space-y-3 rounded-xl border border-border/80 bg-muted/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums text-xs">
                      {parsedCsv.parsedRows.length} parsed
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 tabular-nums text-xs"
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      {parsedCsv.validRows.length} valid
                    </Badge>
                    {parsedCsv.invalidRows.length > 0 && (
                      <Badge
                        variant="outline"
                        className="border-destructive/30 bg-destructive/10 text-destructive tabular-nums text-xs"
                      >
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        {parsedCsv.invalidRows.length} invalid
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {parsedCsv.hasHeader ? 'Header detected' : 'Headerless CSV'}
                  </span>
                </div>

                {exceedsImportLimit ? (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Batch limit is {MAX_CSV_IMPORT_ROWS.toLocaleString()} contacts per import (
                      {parsedCsv.validRows.length.toLocaleString()} valid rows detected). Please split your CSV into smaller files.
                    </span>
                  </div>
                ) : (
                  parsedCsv.validRows.length > BULK_IMPORT_CHUNK_SIZE && (
                    <p className="text-xs text-muted-foreground">
                      {parsedCsv.validRows.length} valid contacts will be imported in batches of{' '}
                      {BULK_IMPORT_CHUNK_SIZE}.
                    </p>
                  )
                )}

                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 px-3 text-xs">Status</TableHead>
                        <TableHead className="h-9 px-3 text-xs">Email</TableHead>
                        <TableHead className="h-9 px-3 text-xs">Name</TableHead>
                        <TableHead className="h-9 px-3 text-xs">Company</TableHead>
                        <TableHead className="h-9 px-3 text-xs">Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => (
                        <TableRow key={`csv-preview-${row.rowNumber}`}>
                          <TableCell className="px-3 py-2 text-xs">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                {row.error || 'Invalid'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs font-medium text-foreground">
                            {row.email || '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                            {row.name || '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                            {row.company || '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                            {row.tags.length > 0 ? row.tags.join(', ') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {parsedCsv.parsedRows.length > CSV_PREVIEW_LIMIT && (
                  <p className="text-xs text-muted-foreground">
                    Showing first {CSV_PREVIEW_LIMIT} of {parsedCsv.parsedRows.length} parsed rows.
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsImportOpen(false);
                  setCsvText('');
                  setCsvFileName(null);
                }}
                disabled={isImportingCsv}
                className={`min-h-11 sm:min-h-9 ${pressFeedbackClass}`}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  isImportingCsv ||
                  isCsvParsing ||
                  exceedsImportLimit ||
                  parsedCsv.validRows.length === 0
                }
                onClick={handleImportCsv}
                className={`min-h-11 sm:min-h-9 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 ${pressFeedbackClass}`}
              >
                {isImportingCsv && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isImportingCsv
                  ? 'Importing...'
                  : `Import ${parsedCsv.validRows.length} Contact${
                      parsedCsv.validRows.length === 1 ? '' : 's'
                    }`}
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog
        open={!!editingContact}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setEditingContact(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact details and audience tags.
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            <form onSubmit={handleEditContact} className="space-y-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contact-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-contact-name"
                  name="name"
                  autoComplete="name"
                  required
                  value={editingContact.name}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, name: e.target.value })
                  }
                  className="col-span-3 min-h-11 sm:min-h-9"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contact-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={editingContact.email}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, email: e.target.value })
                  }
                  className="col-span-3 min-h-11 sm:min-h-9"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contact-company" className="text-right">
                  Company
                </Label>
                <Input
                  id="edit-contact-company"
                  name="company"
                  autoComplete="organization"
                  value={editingContact.company}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, company: e.target.value })
                  }
                  className="col-span-3 min-h-11 sm:min-h-9"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contact-tags" className="text-right">
                  Tags
                </Label>
                <Input
                  id="edit-contact-tags"
                  name="tags"
                  autoComplete="off"
                  value={editingContact.tags}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, tags: e.target.value })
                  }
                  className="col-span-3 min-h-11 sm:min-h-9"
                  placeholder="customer, prospect, newsletter"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingContact(null)}
                  disabled={isSubmitting}
                  className={`min-h-11 sm:min-h-9 ${pressFeedbackClass}`}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`min-h-11 sm:min-h-9 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 ${pressFeedbackClass}`}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Contact Dialog */}
      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingContact(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingContact ? (
                <>
                  This will permanently remove{' '}
                  <span className="font-medium text-foreground">{deletingContact.name}</span> (
                  {deletingContact.email}) from your contact list.
                </>
              ) : (
                'This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className={`min-h-11 sm:min-h-10 ${pressFeedbackClass}`}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDeleteContact();
              }}
              className={`min-h-11 sm:min-h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90 ${pressFeedbackClass}`}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete Contact'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Bulk Delete Contacts Dialog */}
      <AlertDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !isBulkDeleting) setIsBulkDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} selected contact{selectedIds.size === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} selected contact
              {selectedIds.size === 1 ? '' : 's'} from your contact list. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isBulkDeleting}
              className={`min-h-11 sm:min-h-10 ${pressFeedbackClass}`}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isBulkDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmBulkDelete();
              }}
              className={`min-h-11 sm:min-h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90 ${pressFeedbackClass}`}
            >
              {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isBulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Selected`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
