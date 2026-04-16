'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Editor, TLAssetStore, TLStoreSnapshot } from 'tldraw';
import { toast } from 'sonner';
import { saveBoardSnapshot, uploadBoardAsset } from '@/app/actions/admin-boards';
import 'tldraw/tldraw.css';

const Tldraw = dynamic(() => import('tldraw').then((m) => m.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading canvas…</p>
    </div>
  ),
});

type Props = {
  boardId: string;
  boardName: string;
  initialSnapshot: unknown;
};

const SAVE_DEBOUNCE_MS = 1500;

export function BoardCanvas({ boardId, boardName, initialSnapshot }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const assetStore: TLAssetStore = {
    async upload(_asset, file) {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadBoardAsset(boardId, formData);
      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Upload failed');
        throw new Error(result.error ?? 'Upload failed');
      }
      const { url } = result.data as { url: string };
      return { src: url };
    },
    resolve(asset) {
      return (asset.props as { src?: string }).src ?? null;
    },
  };

  const flushSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    setSaveState('saving');
    try {
      const { getSnapshot } = await import('tldraw');
      const snapshot = getSnapshot(editor.store);
      const result = await saveBoardSnapshot({ boardId, snapshot });
      if (!result.success) {
        setSaveState('error');
        toast.error(result.error ?? 'Save failed');
      } else {
        setSaveState('saved');
      }
    } catch (err) {
      setSaveState('error');
      console.error('Board save error', err);
    }
  }, [boardId]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    saveTimerRef.current = setTimeout(() => {
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      if (initialSnapshot) {
        void import('tldraw').then(({ loadSnapshot }) => {
          try {
            loadSnapshot(editor.store, initialSnapshot as TLStoreSnapshot);
          } catch (err) {
            console.error('Failed to load board snapshot', err);
          }
        });
      }

      // Listen only to user-authored document changes (not UI state / sessions).
      const unsubscribe = editor.store.listen(
        () => {
          scheduleSave();
        },
        { source: 'user', scope: 'document' }
      );

      // Flush on tab close.
      const handleBeforeUnload = () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          void flushSave();
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        unsubscribe();
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    },
    [initialSnapshot, scheduleSave, flushSave]
  );

  return (
    <div className="fixed inset-0 top-16 flex flex-col">
      <div className="flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">{boardName}</h1>
          <SaveIndicator state={saveState} />
        </div>
        <p className="text-xs text-muted-foreground">Draw · drag · drop images · auto-saves</p>
      </div>
      <div className="relative flex-1">
        <Tldraw onMount={handleMount} assets={assetStore} />
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  const label =
    state === 'saving'
      ? 'Saving…'
      : state === 'saved'
        ? 'Saved'
        : state === 'error'
          ? 'Save failed'
          : '';
  const color =
    state === 'error'
      ? 'text-red-500'
      : state === 'saved'
        ? 'text-qualia-600'
        : 'text-muted-foreground';
  if (!label) return null;
  return <span className={`text-xs ${color}`}>{label}</span>;
}
