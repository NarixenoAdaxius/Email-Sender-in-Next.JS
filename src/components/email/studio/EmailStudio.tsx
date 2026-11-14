"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'react-toastify';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Eye, History, Layers, Loader2, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getDefaultContentForType,
  getDefaultStylesForType,
} from '../visual-builder/utils';
import {
  buildPreheaderHtml,
  compileBlocksToHtml,
  extractVariablesFromText,
  renderPreviewHtml,
} from './html-compiler';
import { parseHtmlToBlocks } from './html-parser';
import { cloneBlocks, STARTER_TEMPLATES } from './presets';
import {
  BlockContent,
  BlockType,
  DEFAULT_EMAIL_THEME,
  EmailTheme,
  LeftRailTab,
  SectionPreset,
  StarterTemplate,
  StudioMode,
  TemplateBlock,
  ViewportMode,
} from './types';
import { StudioSnapshot, useStudioHistory } from './useStudioHistory';
import { StudioTopBar } from './StudioTopBar';
import { LeftRail } from './LeftRail';
import { VisualCanvas } from './VisualCanvas';
import { CodePane } from './CodePane';
import { InspectorPanel } from './InspectorPanel';

interface EmailStudioProps {
  templateId?: string;
  onSave?: (template: Record<string, unknown>) => void;
}

type MobilePane = 'rail' | 'canvas' | 'inspector';

interface StudioSerializableState {
  name: string;
  subject: string;
  description: string;
  preheader: string;
  isPublic: boolean;
  blocks: TemplateBlock[];
  theme: EmailTheme;
  customCss: string;
}

interface StoredStudioDraft {
  snapshot: StudioSerializableState;
  updatedAt: string;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }
  return true;
}

function statesEqual(a: StudioSerializableState, b: StudioSerializableState): boolean {
  if (a === b) return true;
  return (
    a.name === b.name &&
    a.subject === b.subject &&
    a.description === b.description &&
    a.preheader === b.preheader &&
    a.isPublic === b.isPublic &&
    a.customCss === b.customCss &&
    deepEqual(a.theme, b.theme) &&
    deepEqual(a.blocks, b.blocks)
  );
}

function hasPreheaderElement(rawHtml: string): boolean {
  return /\bid\s*=\s*(?:"pm-preheader"|'pm-preheader'|pm-preheader(?=\s|>))/i.test(rawHtml);
}

function extractPreheaderFromHtml(html: string): string {
  if (!html) return '';
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const span = doc.getElementById('pm-preheader-text');
      if (span) return (span.textContent || '').trim();
    } catch {
      // Fallback below
    }
  }
  const spanRe = /<span\b([^>]*)>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = spanRe.exec(html)) !== null) {
    if (/\bid\s*=\s*(?:"pm-preheader-text"|'pm-preheader-text'|pm-preheader-text(?=\s|$))/i.test(match[1])) {
      const contentStart = match.index + match[0].length;
      const closeIdx = html.indexOf('</span>', contentStart);
      if (closeIdx === -1) return '';
      return html
        .slice(contentStart, closeIdx)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }
  }
  return '';
}

function stripPreheaderDiv(html: string): string {
  let result = html;
  const openTagRe = /<div\b([^>]*)>/gi;
  while (true) {
    openTagRe.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    while ((match = openTagRe.exec(result)) !== null) {
      if (/\bid\s*=\s*(?:"pm-preheader"|'pm-preheader'|pm-preheader(?=\s|$))/i.test(match[1])) {
        break;
      }
    }
    if (!match || match.index === undefined) break;

    const startIdx = match.index;
    const cursor = startIdx + match[0].length;
    let depth = 1;
    const divTokenRe = /<\/?div(?=\s|>|\/)/gi;
    divTokenRe.lastIndex = cursor;

    let endIdx = -1;
    let token: RegExpExecArray | null = null;
    while ((token = divTokenRe.exec(result)) !== null) {
      const gtIdx = result.indexOf('>', token.index + token[0].length);
      if (gtIdx === -1) break;
      const isClosing = result[token.index + 1] === '/';
      const isSelfClosing = !isClosing && result[gtIdx - 1] === '/';
      if (isClosing) {
        depth -= 1;
        if (depth === 0) {
          endIdx = gtIdx + 1;
          break;
        }
      } else if (!isSelfClosing) {
        depth += 1;
      }
      divTokenRe.lastIndex = gtIdx + 1;
    }

    if (endIdx === -1) {
      endIdx = startIdx + match[0].length;
    }

    let trimStart = startIdx;
    while (trimStart > 0 && (result[trimStart - 1] === ' ' || result[trimStart - 1] === '\t')) {
      trimStart -= 1;
    }
    if (trimStart > 0 && result[trimStart - 1] === '\n') {
      trimStart -= 1;
      if (trimStart > 0 && result[trimStart - 1] === '\r') {
        trimStart -= 1;
      }
    } else {
      trimStart = startIdx;
    }

    result = result.slice(0, trimStart) + result.slice(endIdx);
  }
  return result;
}

function injectPreheaderHtml(html: string, preheaderText: string): string {
  const baseHtml = stripPreheaderDiv(html);
  const preheaderNode = buildPreheaderHtml(preheaderText);
  if (!preheaderNode) return baseHtml;
  const bodyMatch = baseHtml.match(/<body[^>]*>/i);
  if (bodyMatch && bodyMatch.index !== undefined) {
    const insertPos = bodyMatch.index + bodyMatch[0].length;
    return `${baseHtml.slice(0, insertPos)}\n  ${preheaderNode}${baseHtml.slice(insertPos)}`;
  }
  return `${preheaderNode}\n${baseHtml}`;
}

function parseCodeSnapshot(rawHtml: string, curr: StudioSnapshot): StudioSnapshot {
  const parsed = parseHtmlToBlocks(rawHtml, curr.blocks);
  const hasHeadOrStyle = /<(?:head|style)\b/i.test(rawHtml);
  const nextCss = hasHeadOrStyle ? parsed.customCss : curr.customCss;
  const nextPreheader = hasPreheaderElement(rawHtml)
    ? parsed.preheader || extractPreheaderFromHtml(rawHtml)
    : '';
  return {
    blocks: parsed.blocks,
    theme: curr.theme,
    customCss: nextCss,
    preheader: nextPreheader,
  };
}

function readStoredDraft(key: string): StoredStudioDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredStudioDraft>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.snapshot &&
      typeof parsed.snapshot === 'object' &&
      Array.isArray(parsed.snapshot.blocks)
    ) {
      const s = parsed.snapshot;
      return {
        snapshot: {
          name: typeof s.name === 'string' ? s.name : '',
          subject: typeof s.subject === 'string' ? s.subject : '',
          description: typeof s.description === 'string' ? s.description : '',
          preheader: typeof s.preheader === 'string' ? s.preheader : '',
          isPublic: Boolean(s.isPublic),
          blocks: s.blocks,
          theme: {
            ...DEFAULT_EMAIL_THEME,
            ...(s.theme && typeof s.theme === 'object' ? s.theme : {}),
          },
          customCss: typeof s.customCss === 'string' ? s.customCss : '',
        },
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      };
    }
  } catch {
    // Ignore storage/parse errors
  }
  return null;
}

const DEFAULT_SAMPLE_DATA: Record<string, string> = {
  senderName: 'PaletteMail Team',
  name: 'Alex Morgan',
  email: 'alex@example.com',
  actionLink: 'https://example.com/get-started',
  unsubscribeUrl: 'https://example.com/unsubscribe',
  companyName: 'PaletteMail',
  productName: 'Email Studio 2.0',
  editionTitle: 'November Edition',
  orderId: 'PM-4829',
  amount: '$49.00',
};

export function EmailStudio({ templateId, onSave }: EmailStudioProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const draftKey = `palettemail:studio:draft:${templateId || 'new'}`;

  const [isLoading, setIsLoading] = useState(Boolean(templateId));
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isForkRequired, setIsForkRequired] = useState(false);

  const [mode, setMode] = useState<StudioMode>('visual');
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [darkModePreview, setDarkModePreview] = useState(false);
  const [useSampleData, setUseSampleData] = useState(false);
  const [sampleData, setSampleData] = useState<Record<string, string>>(DEFAULT_SAMPLE_DATA);

  const [railTab, setRailTab] = useState<LeftRailTab>('blocks');
  const [mobilePane, setMobilePane] = useState<MobilePane>('canvas');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{ block: TemplateBlock; index: number } | null>(
    null
  );

  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editOriginRef = useRef<'visual' | 'code'>('visual');
  const isLegacyCodeOnlyRef = useRef(false);
  const hasUserEditedRef = useRef(false);
  const [hasPendingCodeSync, setHasPendingCodeSync] = useState(false);

  const cancelPendingCodeSync = useCallback(() => {
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
      parseTimerRef.current = null;
    }
    setHasPendingCodeSync(false);
    editOriginRef.current = 'visual';
  }, []);

  const handleBeforeUndoRedo = useCallback(() => {
    cancelPendingCodeSync();
    hasUserEditedRef.current = true;
    isLegacyCodeOnlyRef.current = false;
  }, [cancelPendingCodeSync]);

  const initialStarter = STARTER_TEMPLATES[0];
  const { snapshot, canUndo, canRedo, commit, resetHistory, undo, redo } = useStudioHistory(
    {
      blocks: initialStarter.blocks,
      theme: { ...DEFAULT_EMAIL_THEME },
      customCss: '',
      preheader: '',
    },
    { onBeforeUndoRedo: handleBeforeUndoRedo }
  );
  const preheader = snapshot.preheader ?? '';

  const [savedState, setSavedState] = useState<StudioSerializableState | null>(() =>
    templateId
      ? null
      : {
          name: '',
          subject: '',
          description: '',
          preheader: '',
          isPublic: false,
          blocks: initialStarter.blocks,
          theme: { ...DEFAULT_EMAIL_THEME },
          customCss: '',
        }
  );
  const [savedRawHtml, setSavedRawHtml] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [pendingDraft, setPendingDraft] = useState<StoredStudioDraft | null>(null);

  const [codeHtml, setCodeHtml] = useState(() =>
    compileBlocksToHtml(
      snapshot.blocks,
      snapshot.theme,
      snapshot.customCss,
      snapshot.preheader ?? ''
    )
  );
  const codeHtmlRef = useRef(codeHtml);
  codeHtmlRef.current = codeHtml;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  // Unmount cleanup for pending debounce timer
  useEffect(() => {
    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current);
      }
    };
  }, []);

  // Keep CodeMirror synced when visual state changes (never overwrite legacy HTML or active CodePane edits)
  useEffect(() => {
    if (isLegacyCodeOnlyRef.current) {
      return;
    }
    if (editOriginRef.current === 'code') {
      editOriginRef.current = 'visual';
      return;
    }
    setCodeHtml(
      compileBlocksToHtml(
        snapshot.blocks,
        snapshot.theme,
        snapshot.customCss,
        snapshot.preheader ?? ''
      )
    );
  }, [snapshot.blocks, snapshot.theme, snapshot.customCss, snapshot.preheader]);

  // Check for stored draft on mount when creating a new template
  useEffect(() => {
    if (templateId) return;
    const stored = readStoredDraft(draftKey);
    if (!stored || !savedState) return;
    if (!statesEqual(stored.snapshot, savedState)) {
      setPendingDraft(stored);
    }
  }, [templateId, draftKey, savedState]);

  useEffect(() => {
    if (!templateId) return;
    let active = true;
    hasUserEditedRef.current = false;
    isLegacyCodeOnlyRef.current = false;
    setSavedRawHtml(null);
    setPendingDraft(null);
    setSavedState(null);

    const loadTemplate = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/templates/${templateId}`);
        if (!res.ok) {
          throw new Error('Failed to load template');
        }
        const data = await res.json();
        if (!active) return;
        const loaded = data.template || {};

        const loadedName = loaded.name || '';
        const loadedSubject = loaded.subject || '';
        const loadedDescription = loaded.description || '';
        const loadedIsPublic = Boolean(loaded.isPublic);
        const loadedPreheader =
          typeof loaded.html === 'string' ? extractPreheaderFromHtml(loaded.html) : '';

        setName(loadedName);
        setSubject(loadedSubject);
        setDescription(loadedDescription);
        setIsPublic(loadedIsPublic);
        setIsForkRequired(loaded.isOwner === false || loaded.predefined === true);

        const loadedTheme: EmailTheme = {
          ...DEFAULT_EMAIL_THEME,
          ...(loaded.theme && typeof loaded.theme === 'object' ? loaded.theme : {}),
        };
        let loadedBlocks = initialStarter.blocks;
        let loadedCss = typeof loaded.css === 'string' ? loaded.css : '';

        if (Array.isArray(loaded.blocks)) {
          isLegacyCodeOnlyRef.current = false;
          loadedBlocks = loaded.blocks;
          editOriginRef.current = 'visual';
          resetHistory({
            blocks: loadedBlocks,
            theme: loadedTheme,
            customCss: loadedCss,
            preheader: loadedPreheader,
          });
          setCodeHtml(
            compileBlocksToHtml(loadedBlocks, loadedTheme, loadedCss, loadedPreheader)
          );
        } else if (typeof loaded.html === 'string' && loaded.html.trim().length > 0) {
          isLegacyCodeOnlyRef.current = true;
          const parsed = parseHtmlToBlocks(loaded.html, []);
          loadedBlocks = parsed.blocks;
          loadedCss = parsed.customCss || loadedCss;
          editOriginRef.current = 'code';
          resetHistory({
            blocks: loadedBlocks,
            theme: loadedTheme,
            customCss: loadedCss,
            preheader: loadedPreheader,
          });
          setCodeHtml(loaded.html);
          setSavedRawHtml(loaded.html);
        } else {
          isLegacyCodeOnlyRef.current = false;
          editOriginRef.current = 'visual';
          resetHistory({
            blocks: loadedBlocks,
            theme: loadedTheme,
            customCss: loadedCss,
            preheader: loadedPreheader,
          });
          setCodeHtml(
            compileBlocksToHtml(loadedBlocks, loadedTheme, loadedCss, loadedPreheader)
          );
        }

        const baseline: StudioSerializableState = {
          name: loadedName,
          subject: loadedSubject,
          description: loadedDescription,
          preheader: loadedPreheader,
          isPublic: loadedIsPublic,
          blocks: loadedBlocks,
          theme: loadedTheme,
          customCss: loadedCss,
        };
        setSavedState(baseline);

        const stored = readStoredDraft(`palettemail:studio:draft:${templateId}`);
        if (stored && !statesEqual(stored.snapshot, baseline)) {
          setPendingDraft(stored);
        } else if (stored) {
          try {
            localStorage.removeItem(`palettemail:studio:draft:${templateId}`);
          } catch {
            // Ignore storage errors
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error loading template');
        if (active) {
          setSavedState({
            name: '',
            subject: '',
            description: '',
            preheader: '',
            isPublic: false,
            blocks: initialStarter.blocks,
            theme: { ...DEFAULT_EMAIL_THEME },
            customCss: '',
          });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadTemplate();
    return () => {
      active = false;
    };
  }, [templateId, resetHistory, initialStarter.blocks]);

  const currentStateObj: StudioSerializableState = useMemo(
    () => ({
      name,
      subject,
      description,
      preheader,
      isPublic,
      blocks: snapshot.blocks,
      theme: snapshot.theme,
      customCss: snapshot.customCss,
    }),
    [
      name,
      subject,
      description,
      preheader,
      isPublic,
      snapshot.blocks,
      snapshot.theme,
      snapshot.customCss,
    ]
  );

  const isStateClean = useMemo(() => {
    if (savedState === null) return true;
    return (
      statesEqual(currentStateObj, savedState) &&
      !hasPendingCodeSync &&
      (!isLegacyCodeOnlyRef.current || savedRawHtml === null || codeHtml === savedRawHtml)
    );
  }, [currentStateObj, savedState, hasPendingCodeSync, savedRawHtml, codeHtml]);

  const isDirty = savedState !== null && !isStateClean;

  // Warn before closing or refreshing tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Debounced 1000ms localStorage draft autosave
  useEffect(() => {
    if (isLoading || savedState === null) return;

    if (isStateClean) {
      if (hasUserEditedRef.current && !pendingDraft) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // Ignore storage errors
        }
      }
      return;
    }

    if (pendingDraft) {
      setPendingDraft(null);
    }

    const timer = setTimeout(() => {
      try {
        const payload: StoredStudioDraft = {
          snapshot: currentStateObj,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
      } catch {
        // Ignore quota / privacy mode storage errors
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    isLoading,
    savedState,
    isStateClean,
    currentStateObj,
    draftKey,
    pendingDraft,
  ]);

  const deferredCodeHtml = useDeferredValue(codeHtml);

  const variables = useMemo(
    () => extractVariablesFromText(deferredCodeHtml, subject),
    [deferredCodeHtml, subject]
  );

  const previewHtml = useMemo(
    () => renderPreviewHtml(deferredCodeHtml, sampleData, useSampleData, darkModePreview),
    [deferredCodeHtml, sampleData, useSampleData, darkModePreview]
  );

  const testEmailHtml = useMemo(
    () => renderPreviewHtml(deferredCodeHtml, sampleData, true, false),
    [deferredCodeHtml, sampleData]
  );

  const selectedBlock = useMemo(
    () => snapshot.blocks.find((b) => b.id === activeBlockId) || null,
    [snapshot.blocks, activeBlockId]
  );

  const syncCodeNow = useCallback(
    (rawHtml: string): StudioSnapshot => {
      const curr = snapshotRef.current;
      const nextSnap = parseCodeSnapshot(rawHtml, curr);
      editOriginRef.current = 'code';
      setHasPendingCodeSync(false);
      commit(nextSnap);
      return nextSnap;
    },
    [commit]
  );

  const handleCodeHtmlChange = useCallback(
    (nextHtml: string) => {
      hasUserEditedRef.current = true;
      editOriginRef.current = 'code';
      setCodeHtml(nextHtml);
      setHasPendingCodeSync(true);

      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current);
      }
      parseTimerRef.current = setTimeout(() => {
        parseTimerRef.current = null;
        const curr = snapshotRef.current;
        const nextSnap = parseCodeSnapshot(nextHtml, curr);
        editOriginRef.current = 'code';
        setHasPendingCodeSync(false);
        commit(nextSnap, { coalesceMs: 500 });
      }, 220);
    },
    [commit]
  );

  const handleCssChange = useCallback(
    (nextCss: string) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      commit({ ...snapshotRef.current, customCss: nextCss }, { coalesceMs: 400 });
    },
    [cancelPendingCodeSync, commit]
  );

  const handleModeChange = useCallback(
    (nextMode: StudioMode) => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current);
        parseTimerRef.current = null;
        syncCodeNow(codeHtmlRef.current);
      }
      setMode(nextMode);
    },
    [syncCodeNow]
  );

  const handleNameChange = useCallback(
    (nextName: string) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      setName(nextName);
    },
    [cancelPendingCodeSync]
  );

  const handleSubjectChange = useCallback(
    (nextSubject: string) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      setSubject(nextSubject);
    },
    [cancelPendingCodeSync]
  );

  const handleMetaChange = useCallback(
    (patch: {
      name?: string;
      subject?: string;
      preheader?: string;
      description?: string;
      isPublic?: boolean;
    }) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      if (patch.name !== undefined) setName(patch.name);
      if (patch.subject !== undefined) setSubject(patch.subject);
      if (patch.description !== undefined) setDescription(patch.description);
      if (patch.isPublic !== undefined) setIsPublic(patch.isPublic);
      if (patch.preheader !== undefined) {
        isLegacyCodeOnlyRef.current = false;
        commit({ ...snapshotRef.current, preheader: patch.preheader }, { coalesceMs: 400 });
      }
    },
    [cancelPendingCodeSync, commit]
  );

  const handleThemeChange = useCallback(
    (patch: Partial<EmailTheme>) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      isLegacyCodeOnlyRef.current = false;
      const curr = snapshotRef.current;
      commit({ ...curr, theme: { ...curr.theme, ...patch } }, { coalesceMs: 250 });
    },
    [cancelPendingCodeSync, commit]
  );

  const handleSampleDataChange = useCallback((key: string, val: string) => {
    setSampleData((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleAddBlock = (type: BlockType) => {
    cancelPendingCodeSync();
    hasUserEditedRef.current = true;
    isLegacyCodeOnlyRef.current = false;
    const newBlock: TemplateBlock = {
      id: `${type}-${nanoid(6)}`,
      type,
      content: getDefaultContentForType(type),
      styles: getDefaultStylesForType(type),
    };
    const curr = snapshotRef.current;
    commit({ ...curr, blocks: [...curr.blocks, newBlock] });
    setActiveBlockId(newBlock.id);
    if (mode === 'code') {
      setMode('split');
    }
    if (mobilePane === 'rail') {
      setMobilePane('canvas');
    }
  };

  const handleInsertSection = (preset: SectionPreset) => {
    cancelPendingCodeSync();
    hasUserEditedRef.current = true;
    isLegacyCodeOnlyRef.current = false;
    const cloned = cloneBlocks(preset.blocks);
    const curr = snapshotRef.current;
    commit({ ...curr, blocks: [...curr.blocks, ...cloned] });
    if (cloned[0]) setActiveBlockId(cloned[0].id);
    if (mobilePane === 'rail') {
      setMobilePane('canvas');
    }
    toast.success(`Inserted "${preset.name}"`, { autoClose: 1800 });
  };

  const handleApplyStarter = (starter: StarterTemplate) => {
    cancelPendingCodeSync();
    hasUserEditedRef.current = true;
    isLegacyCodeOnlyRef.current = false;
    const cloned = cloneBlocks(starter.blocks);
    commit({
      blocks: cloned,
      theme: { ...starter.theme },
      customCss: '',
      preheader: snapshotRef.current.preheader ?? '',
    });
    if (!subject.trim()) {
      setSubject(starter.subject);
    }
    setActiveBlockId(null);
    if (mobilePane === 'rail') {
      setMobilePane('canvas');
    }
    toast.success(`Applied "${starter.name}" starter`, { autoClose: 2000 });
  };

  const handleUpdateBlockContent = useCallback(
    (id: string, contentPatch: Partial<BlockContent>) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      isLegacyCodeOnlyRef.current = false;
      const curr = snapshotRef.current;
      const nextBlocks = curr.blocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, ...contentPatch } } : b
      );
      commit({ ...curr, blocks: nextBlocks }, { coalesceMs: 500 });
    },
    [cancelPendingCodeSync, commit]
  );

  const handleUpdateBlockStyle = useCallback(
    (id: string, stylePatch: Record<string, string>) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      isLegacyCodeOnlyRef.current = false;
      const curr = snapshotRef.current;
      const nextBlocks = curr.blocks.map((b) =>
        b.id === id ? { ...b, styles: { ...b.styles, ...stylePatch } } : b
      );
      commit({ ...curr, blocks: nextBlocks }, { coalesceMs: 300 });
    },
    [cancelPendingCodeSync, commit]
  );

  const handleMoveBlock = useCallback(
    (id: string, direction: 'up' | 'down') => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      isLegacyCodeOnlyRef.current = false;
      const curr = snapshotRef.current;
      const idx = curr.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= curr.blocks.length) return;
      const nextBlocks = [...curr.blocks];
      const [moved] = nextBlocks.splice(idx, 1);
      nextBlocks.splice(targetIdx, 0, moved);
      commit({ ...curr, blocks: nextBlocks });
    },
    [cancelPendingCodeSync, commit]
  );

  const handleReorderBlocks = useCallback(
    (nextBlocks: TemplateBlock[]) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      isLegacyCodeOnlyRef.current = false;
      commit({ ...snapshotRef.current, blocks: nextBlocks }, { coalesceMs: 600 });
    },
    [cancelPendingCodeSync, commit]
  );

  const handleDuplicateBlock = useCallback(
    (id: string) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      isLegacyCodeOnlyRef.current = false;
      const curr = snapshotRef.current;
      const idx = curr.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const [copy] = cloneBlocks([curr.blocks[idx]]);
      const nextBlocks = [...curr.blocks];
      nextBlocks.splice(idx + 1, 0, copy);
      commit({ ...curr, blocks: nextBlocks });
      setActiveBlockId(copy.id);
    },
    [cancelPendingCodeSync, commit]
  );

  const handleRemoveBlock = useCallback(
    (id: string) => {
      cancelPendingCodeSync();
      hasUserEditedRef.current = true;
      isLegacyCodeOnlyRef.current = false;
      const curr = snapshotRef.current;
      const idx = curr.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const removed = curr.blocks[idx];
      const nextBlocks = curr.blocks.filter((b) => b.id !== id);
      commit({ ...curr, blocks: nextBlocks });
      setActiveBlockId((prev) => (prev === id ? null : prev));
      setLastRemoved({ block: removed, index: idx });
    },
    [cancelPendingCodeSync, commit]
  );

  const handleInspectCodeForBlock = useCallback((id: string) => {
    setActiveBlockId(id);
    setMode('split');
  }, []);

  const handleDeselectBlock = useCallback(() => {
    setActiveBlockId(null);
  }, []);

  const handleUndoRemove = () => {
    if (!lastRemoved) return;
    cancelPendingCodeSync();
    hasUserEditedRef.current = true;
    isLegacyCodeOnlyRef.current = false;
    const curr = snapshotRef.current;
    if (curr.blocks.some((b) => b.id === lastRemoved.block.id)) {
      setLastRemoved(null);
      return;
    }
    const nextBlocks = [...curr.blocks];
    const insertIdx = Math.min(lastRemoved.index, nextBlocks.length);
    nextBlocks.splice(insertIdx, 0, lastRemoved.block);
    commit({ ...curr, blocks: nextBlocks });
    setActiveBlockId(lastRemoved.block.id);
    setLastRemoved(null);
  };

  const handleFormatHtml = useCallback(() => {
    cancelPendingCodeSync();
    hasUserEditedRef.current = true;
    isLegacyCodeOnlyRef.current = false;
    const curr = snapshotRef.current;
    const nextSnap = parseCodeSnapshot(codeHtmlRef.current, curr);
    const formatted = compileBlocksToHtml(
      nextSnap.blocks,
      nextSnap.theme,
      nextSnap.customCss,
      nextSnap.preheader ?? ''
    );
    commit(nextSnap);
    setCodeHtml(formatted);
    toast.success('Synced & formatted HTML', { autoClose: 1500 });
  }, [cancelPendingCodeSync, commit]);

  const handleDiscardDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore storage errors
    }
    setPendingDraft(null);
  }, [draftKey]);

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    cancelPendingCodeSync();
    hasUserEditedRef.current = true;
    isLegacyCodeOnlyRef.current = false;
    const d = pendingDraft.snapshot;
    setName(d.name || '');
    setSubject(d.subject || '');
    setDescription(d.description || '');
    setIsPublic(Boolean(d.isPublic));
    resetHistory({
      blocks: d.blocks,
      theme: { ...DEFAULT_EMAIL_THEME, ...(d.theme || {}) },
      customCss: d.customCss || '',
      preheader: d.preheader || '',
    });
    setActiveBlockId(null);
    setPendingDraft(null);
    toast.info('Unsaved draft restored', { autoClose: 2000 });
  };

  const handleSave = async () => {
    if (isSaving) return;

    const trimmedName = name.trim();
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      toast.error('Please enter a template name');
      return;
    }
    if (!trimmedSubject) {
      toast.error('Please enter an email subject');
      return;
    }

    let blocksToSave = snapshot.blocks;
    let cssToSave = snapshot.customCss;
    let preheaderToSave = snapshot.preheader ?? '';
    const latestCodeHtml = codeHtml;
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
      parseTimerRef.current = null;
      const nextSnap = syncCodeNow(latestCodeHtml);
      blocksToSave = nextSnap.blocks;
      cssToSave = nextSnap.customCss;
      preheaderToSave = nextSnap.preheader ?? '';
    }

    const finalHtml = isLegacyCodeOnlyRef.current
      ? preheaderToSave
        ? injectPreheaderHtml(latestCodeHtml, preheaderToSave)
        : latestCodeHtml
      : compileBlocksToHtml(blocksToSave, snapshot.theme, cssToSave, preheaderToSave);
    const extractedVars = extractVariablesFromText(finalHtml, trimmedSubject);

    try {
      setIsSaving(true);
      const isUpdate = Boolean(templateId) && !isForkRequired;
      const endpoint = isUpdate ? `/api/templates/${templateId}` : '/api/templates';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription,
          subject: trimmedSubject,
          html: finalHtml,
          css: cssToSave,
          variables: extractedVars,
          isPublic,
          ...(isLegacyCodeOnlyRef.current ? {} : { blocks: blocksToSave }),
          theme: snapshot.theme,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      setName(trimmedName);
      setSubject(trimmedSubject);
      setDescription(trimmedDescription);
      hasUserEditedRef.current = false;
      setHasPendingCodeSync(false);

      setSavedState({
        name: trimmedName,
        subject: trimmedSubject,
        description: trimmedDescription,
        preheader: preheaderToSave,
        isPublic,
        blocks: blocksToSave,
        theme: snapshot.theme,
        customCss: cssToSave,
      });
      setSavedRawHtml(isLegacyCodeOnlyRef.current ? finalHtml : null);
      setLastSavedAt(new Date());
      setPendingDraft(null);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Ignore storage errors
      }

      toast.success(
        isUpdate
          ? 'Template updated!'
          : isForkRequired
            ? 'Saved as a new copy!'
            : 'Template created!'
      );
      if (onSave) {
        onSave(data.template);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  const saveHandlerRef = useRef<() => void>(() => {});
  saveHandlerRef.current = () => {
    void handleSave();
  };

  // Global Ctrl/Cmd+S shortcut (works even when focus is in inputs or CodeMirror)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!isLoading) {
          saveHandlerRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isLoading]);

  const draftTimeLabel = useMemo(() => {
    if (!pendingDraft?.updatedAt) return null;
    const d = new Date(pendingDraft.updatedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [pendingDraft]);

  if (isLoading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-[#4F46E5]" />
          <p className="text-sm font-medium">Loading Email Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
      <StudioTopBar
        name={name}
        subject={subject}
        onNameChange={handleNameChange}
        onSubjectChange={handleSubjectChange}
        mode={mode}
        onModeChange={handleModeChange}
        viewport={viewport}
        onViewportChange={setViewport}
        darkModePreview={darkModePreview}
        onToggleDarkModePreview={() => setDarkModePreview((v) => !v)}
        useSampleData={useSampleData}
        onToggleSampleData={() => setUseSampleData((v) => !v)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        isSaving={isSaving}
        onSave={handleSave}
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        previewHtml={testEmailHtml}
        sampleData={sampleData}
        onDiscardDraft={handleDiscardDraft}
      />

      <AnimatePresence>
        {pendingDraft && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-foreground"
          >
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                An unsaved draft
                {draftTimeLabel ? ` from ${draftTimeLabel}` : ''} was found on this device.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleRestoreDraft}
                className="min-h-11 bg-amber-600 px-3 text-xs font-semibold text-white transition-transform duration-75 hover:bg-amber-700 active:scale-[0.97] motion-reduce:transform-none sm:min-h-0 sm:h-7"
              >
                Restore unsaved draft
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscardDraft}
                className="min-h-11 px-3 text-xs transition-transform duration-75 active:scale-[0.97] motion-reduce:transform-none sm:min-h-0 sm:h-7"
              >
                Discard draft
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastRemoved && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2 text-xs"
          >
            <span>
              Removed <strong>{lastRemoved.block.type}</strong> block.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndoRemove}
                className="inline-flex min-h-11 items-center gap-1 font-semibold text-[#4F46E5] hover:underline sm:min-h-0 dark:text-[#818CF8]"
              >
                <Undo2 className="h-3 w-3" />
                Undo
              </button>
              <button
                type="button"
                onClick={() => setLastRemoved(null)}
                aria-label="Dismiss"
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground sm:min-h-0 sm:min-w-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Studio Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden lg:h-[calc(100vh-7.5rem)] lg:flex-row">
        {mode !== 'code' && (
          <div
            className={cn(
              mobilePane === 'rail' ? 'flex min-h-0 w-full flex-1' : 'hidden',
              'lg:flex lg:w-auto lg:flex-none'
            )}
          >
            <LeftRail
              activeTab={railTab}
              onTabChange={setRailTab}
              onAddBlock={handleAddBlock}
              onInsertSection={handleInsertSection}
              onApplyStarter={handleApplyStarter}
              theme={snapshot.theme}
              onThemeChange={handleThemeChange}
              variables={variables}
              sampleData={sampleData}
              onSampleDataChange={handleSampleDataChange}
            />
          </div>
        )}

        {/* Center Workspace */}
        <div
          role="region"
          aria-label="Email canvas"
          className={cn(
            'min-w-0 flex-1 overflow-hidden',
            mode !== 'code' && mobilePane !== 'canvas' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {mode === 'visual' && (
            <VisualCanvas
              blocks={snapshot.blocks}
              theme={snapshot.theme}
              viewport={viewport}
              darkModePreview={darkModePreview}
              useSampleData={useSampleData}
              sampleData={sampleData}
              activeBlockId={activeBlockId}
              onSelectBlock={setActiveBlockId}
              onMoveBlock={handleMoveBlock}
              onReorderBlocks={handleReorderBlocks}
              onDuplicateBlock={handleDuplicateBlock}
              onRemoveBlock={handleRemoveBlock}
              onInspectCodeForBlock={handleInspectCodeForBlock}
            />
          )}

          {mode === 'split' && (
            <div className="grid h-full w-full grid-cols-1 divide-y divide-border xl:grid-cols-2 xl:divide-x xl:divide-y-0">
              <VisualCanvas
                blocks={snapshot.blocks}
                theme={snapshot.theme}
                viewport={viewport}
                darkModePreview={darkModePreview}
                useSampleData={useSampleData}
                sampleData={sampleData}
                activeBlockId={activeBlockId}
                onSelectBlock={setActiveBlockId}
                onMoveBlock={handleMoveBlock}
                onReorderBlocks={handleReorderBlocks}
                onDuplicateBlock={handleDuplicateBlock}
                onRemoveBlock={handleRemoveBlock}
              />
              <CodePane
                htmlValue={codeHtml}
                cssValue={snapshot.customCss}
                onHtmlChange={handleCodeHtmlChange}
                onCssChange={handleCssChange}
                onFormatHtml={handleFormatHtml}
                fileName={name}
              />
            </div>
          )}

          {mode === 'code' && (
            <div className="grid h-full w-full grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <CodePane
                htmlValue={codeHtml}
                cssValue={snapshot.customCss}
                onHtmlChange={handleCodeHtmlChange}
                onCssChange={handleCssChange}
                onFormatHtml={handleFormatHtml}
                fileName={name}
              />
              <div className="flex flex-col items-center overflow-y-auto bg-muted/40 p-6">
                <div
                  style={{
                    width: '100%',
                    maxWidth: viewport === 'mobile' ? '375px' : `${snapshot.theme.contentWidth}px`,
                  }}
                  className="h-full min-h-[540px] overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all motion-reduce:transition-none"
                >
                  <iframe
                    title="Email HTML Live Preview"
                    sandbox=""
                    srcDoc={previewHtml}
                    className="h-full min-h-[540px] w-full border-0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {mode !== 'code' && (
          <div
            className={cn(
              mobilePane === 'inspector' ? 'flex min-h-0 w-full flex-1' : 'hidden',
              'lg:flex lg:w-auto lg:flex-none'
            )}
          >
            <InspectorPanel
              block={selectedBlock}
              onUpdateContent={handleUpdateBlockContent}
              onUpdateStyle={handleUpdateBlockStyle}
              name={name}
              subject={subject}
              preheader={preheader}
              description={description}
              isPublic={isPublic}
              onMetaChange={handleMetaChange}
              onDeselectBlock={handleDeselectBlock}
            />
          </div>
        )}
      </div>

      {/* Quick Inspect Chip on Mobile Canvas when a block is selected */}
      <AnimatePresence>
        {mode !== 'code' && mobilePane === 'canvas' && selectedBlock && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 lg:hidden"
          >
            <button
              type="button"
              onClick={() => setMobilePane('inspector')}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/60 bg-background/90 px-4 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur-xl transition-transform duration-75 active:scale-[0.97] motion-reduce:transform-none"
            >
              <span
                className="h-2 w-2 rounded-full bg-[#4F46E5] dark:bg-[#818CF8]"
                aria-hidden="true"
              />
              <span>Inspect Block</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile <1024px Bottom Segmented Tab Bar */}
      {mode !== 'code' && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-2 py-1.5 backdrop-blur-xl pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <div
            role="tablist"
            aria-label="Studio workspace views"
            className="grid grid-cols-3 gap-1"
          >
            {(
              [
                { id: 'rail', label: 'Blocks & Theme', icon: <Layers className="h-4 w-4" /> },
                { id: 'canvas', label: 'Canvas', icon: <Eye className="h-4 w-4" /> },
                {
                  id: 'inspector',
                  label: 'Inspector',
                  icon: <SlidersHorizontal className="h-4 w-4" />,
                  hasDot: Boolean(selectedBlock),
                },
              ] as const
            ).map((tab) => {
              const active = mobilePane === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMobilePane(tab.id)}
                  className={cn(
                    'relative z-10 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-xs font-medium transition-colors active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={prefersReducedMotion ? undefined : 'studio-mobile-pane-pill'}
                      transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                      className="absolute inset-0 -z-10 rounded-xl bg-muted/80 ring-1 ring-border/60"
                    />
                  )}
                  <span className="relative inline-flex">
                    {tab.icon}
                    {'hasDot' in tab && tab.hasDot && (
                      <span
                        aria-label="Block selected"
                        className="absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full bg-[#4F46E5] ring-2 ring-background dark:bg-[#818CF8]"
                      />
                    )}
                  </span>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
