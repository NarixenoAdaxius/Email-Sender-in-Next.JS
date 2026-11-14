'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { EmailTheme, TemplateBlock } from './types';

export interface StudioSnapshot {
  blocks: TemplateBlock[];
  theme: EmailTheme;
  customCss: string;
  preheader?: string;
}

interface UseStudioHistoryOptions {
  onBeforeUndoRedo?: () => void;
}

interface HistoryState {
  past: StudioSnapshot[];
  present: StudioSnapshot;
  future: StudioSnapshot[];
}

type HistoryAction =
  | { type: 'COMMIT'; next: StudioSnapshot; coalesce: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; snapshot: StudioSnapshot };

const MAX_HISTORY = 50;

function snapshotsEqual(a: StudioSnapshot, b: StudioSnapshot): boolean {
  return (
    a === b ||
    (a.blocks === b.blocks &&
      a.theme === b.theme &&
      a.customCss === b.customCss &&
      (a.preheader ?? '') === (b.preheader ?? ''))
  );
}

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'COMMIT': {
      if (snapshotsEqual(state.present, action.next)) {
        return state;
      }
      if (action.coalesce) {
        return {
          ...state,
          present: action.next,
        };
      }
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
        present: action.next,
        future: [],
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future.slice(0, MAX_HISTORY - 1)],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
        present: next,
        future: state.future.slice(1),
      };
    }

    case 'RESET':
      return {
        past: [],
        present: action.snapshot,
        future: [],
      };

    default:
      return state;
  }
}

export function useStudioHistory(
  initial: StudioSnapshot,
  options?: UseStudioHistoryOptions
) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initial,
    future: [],
  });
  const lastCommitRef = useRef<number>(0);
  const onBeforeUndoRedoRef = useRef(options?.onBeforeUndoRedo);
  onBeforeUndoRedoRef.current = options?.onBeforeUndoRedo;
  const canUndoRef = useRef(false);
  const canRedoRef = useRef(false);
  canUndoRef.current = state.past.length > 0;
  canRedoRef.current = state.future.length > 0;

  const commit = useCallback(
    (next: StudioSnapshot, commitOptions?: { coalesceMs?: number }) => {
      const now = Date.now();
      const coalesceMs = commitOptions?.coalesceMs ?? 0;
      const coalesce = coalesceMs > 0 && now - lastCommitRef.current < coalesceMs;
      if (!coalesce) {
        lastCommitRef.current = now;
      }
      dispatch({ type: 'COMMIT', next, coalesce });
    },
    []
  );

  const resetHistory = useCallback((snapshot: StudioSnapshot) => {
    lastCommitRef.current = 0;
    dispatch({ type: 'RESET', snapshot });
  }, []);

  const undo = useCallback(() => {
    lastCommitRef.current = 0;
    onBeforeUndoRedoRef.current?.();
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    lastCommitRef.current = 0;
    onBeforeUndoRedoRef.current?.();
    dispatch({ type: 'REDO' });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('.cm-editor') ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;

      if (e.shiftKey) {
        if (!canRedoRef.current) return;
        e.preventDefault();
        redo();
      } else {
        if (!canUndoRef.current) return;
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  return {
    snapshot: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit,
    resetHistory,
    undo,
    redo,
  };
}
