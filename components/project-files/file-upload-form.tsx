'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Eye,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  FolderUp,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadProjectFile } from '@/app/actions/project-files';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PARALLEL_UPLOADS = 3;

type UploadState = 'queued' | 'uploading' | 'success' | 'error';

interface UploadItem {
  id: string;
  file: File;
  /** Folder-relative path when the item came from a folder picker or a
   *  directory drag-drop (e.g. "designs/v2/hero.png"). Null for flat files. */
  relativePath: string | null;
  state: UploadState;
  error?: string;
}

interface FileUploadFormProps {
  projectId: string;
  phases: { id: string; phase_name: string }[];
  onUploadComplete?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function iconForMime(mime: string) {
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.startsWith('audio/')) return FileAudio;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('archive')) return FileArchive;
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text')) return FileText;
  return FileIcon;
}

function iconColorForMime(mime: string): string {
  if (mime.startsWith('image/')) return 'text-blue-500';
  if (mime.startsWith('video/')) return 'text-purple-500';
  if (mime.startsWith('audio/')) return 'text-emerald-500';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('archive'))
    return 'text-orange-500';
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text'))
    return 'text-red-500';
  return 'text-muted-foreground';
}

/**
 * Drag-and-drop multi-file uploader. Users can:
 * - Drop one or more files on the zone
 * - Click the zone / button to pick files (multiple selection enabled)
 * - Paste files from clipboard (e.g. images copied from another app)
 *
 * Uploads run in small parallel batches (MAX_PARALLEL_UPLOADS) and each
 * queued item reports its own state. Advanced metadata (description, phase,
 * client visibility) applies to every file in the current batch — collapsed
 * by default to keep the happy path one click.
 */
export function FileUploadForm({ projectId, phases, onUploadComplete }: FileUploadFormProps) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('none');
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const queued = useMemo(() => items.filter((i) => i.state === 'queued'), [items]);
  const hasItems = items.length > 0;
  const hasQueued = queued.length > 0;

  const addFiles = useCallback((filesToAdd: File[]) => {
    if (filesToAdd.length === 0) return;
    const next: UploadItem[] = filesToAdd.map((file) => {
      const overSized = file.size > MAX_FILE_SIZE;
      // `webkitRelativePath` is populated for folder picks and directory
      // drag-drops in Chromium/WebKit. When it contains a slash we treat
      // the item as part of a folder upload.
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      const relativePath = rel && rel.includes('/') ? rel : null;
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        relativePath,
        state: overSized ? 'error' : 'queued',
        error: overSized
          ? `Too large (${(file.size / 1024 / 1024).toFixed(1)}MB > 50MB)`
          : undefined,
      };
    });
    setItems((prev) => [...prev, ...next]);
  }, []);

  // Clipboard paste — images copied from other apps, screenshots, etc.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        addFiles(files);
        toast.info(`${files.length} file${files.length > 1 ? 's' : ''} pasted`);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) addFiles(dropped);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) addFiles(picked);
    // Reset so the same file can be picked again
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFolderPick = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) {
      addFiles(picked);
      const folderName = (
        picked[0] as File & { webkitRelativePath?: string }
      ).webkitRelativePath?.split('/')[0];
      toast.info(
        `${picked.length} file${picked.length > 1 ? 's' : ''} queued from ${folderName ?? 'folder'}`
      );
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCompleted = () => {
    setItems((prev) => prev.filter((i) => i.state !== 'success'));
  };

  const uploadOne = async (item: UploadItem): Promise<UploadItem> => {
    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('project_id', projectId);
    if (description) formData.append('description', description);
    if (selectedPhase && selectedPhase !== 'none') formData.append('phase_id', selectedPhase);
    formData.append('is_client_visible', String(isClientVisible));
    if (item.relativePath) formData.append('relative_path', item.relativePath);

    const result = await uploadProjectFile(formData);
    if (result.success) {
      return { ...item, state: 'success', error: undefined };
    }
    return { ...item, state: 'error', error: result.error ?? 'Upload failed' };
  };

  const handleUploadAll = async () => {
    if (!hasQueued || isUploading) return;
    setIsUploading(true);

    // Flip all queued to uploading
    setItems((prev) => prev.map((i) => (i.state === 'queued' ? { ...i, state: 'uploading' } : i)));

    const queue = [...queued];
    let successes = 0;
    let failures = 0;

    // Small-batch parallelism — 3 at a time
    while (queue.length > 0) {
      const batch = queue.splice(0, MAX_PARALLEL_UPLOADS);
      const settled = await Promise.all(batch.map(uploadOne));
      setItems((prev) => {
        const map = new Map(settled.map((s) => [s.id, s]));
        return prev.map((i) => map.get(i.id) ?? i);
      });
      successes += settled.filter((s) => s.state === 'success').length;
      failures += settled.filter((s) => s.state === 'error').length;
    }

    setIsUploading(false);

    if (successes > 0) {
      toast.success(
        `${successes} file${successes > 1 ? 's' : ''} uploaded${
          failures > 0 ? ` · ${failures} failed` : ''
        }`
      );
      router.refresh();
      onUploadComplete?.();
    } else if (failures > 0) {
      toast.error(`${failures} file${failures > 1 ? 's' : ''} failed to upload`);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Dropzone */}
      <div className="p-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to browse"
          className={cn(
            'group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
            'focus:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20',
            isDragActive
              ? 'border-primary bg-primary/[0.06]'
              : 'border-border hover:border-primary/50 hover:bg-primary/[0.025]'
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200',
              isDragActive ? 'scale-110 bg-primary/15' : 'bg-primary/10 group-hover:bg-primary/15'
            )}
          >
            <Upload
              className={cn(
                'h-5 w-5 transition-colors',
                isDragActive ? 'text-primary' : 'text-primary/80'
              )}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {isDragActive ? 'Drop to upload' : 'Drop files here, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Multiple files supported · up to 50MB each · you can also paste (⌘V)
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
            disabled={isUploading}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors',
              'hover:border-primary/40 hover:bg-primary/[0.04]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              'disabled:opacity-50'
            )}
          >
            <FolderUp className="h-3.5 w-3.5" />
            Pick folder
          </button>

          <input
            ref={inputRef}
            id={inputId}
            type="file"
            multiple
            className="hidden"
            onChange={handlePick}
            disabled={isUploading}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFolderPick}
            disabled={isUploading}
            // Non-standard but supported in Chromium + WebKit. Casting avoids
            // a TS error since `webkitdirectory` isn't in React's type defs.
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          />
        </div>
      </div>

      {/* Queue */}
      {hasItems && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {items.length} file{items.length > 1 ? 's' : ''}
            </p>
            {items.some((i) => i.state === 'success') && (
              <button
                type="button"
                onClick={clearCompleted}
                disabled={isUploading}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                Clear completed
              </button>
            )}
          </div>

          <ul className="space-y-1.5">
            {items.map((item) => {
              const Icon = iconForMime(item.file.type);
              const iconColor = iconColorForMime(item.file.type);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                    item.state === 'success' && 'border-emerald-500/30 bg-emerald-500/[0.04]',
                    item.state === 'error' && 'border-red-500/30 bg-red-500/[0.04]',
                    (item.state === 'queued' || item.state === 'uploading') &&
                      'border-border bg-background'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.relativePath ?? item.file.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatBytes(item.file.size)}
                      {item.error && (
                        <>
                          {' · '}
                          <span className="text-red-600 dark:text-red-400">{item.error}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {item.state === 'queued' && (
                      <span className="text-[11px] text-muted-foreground">Ready</span>
                    )}
                    {item.state === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {item.state === 'success' && (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {item.state === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>

                  {/* Remove */}
                  {item.state !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={isUploading}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Advanced options */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-expanded={advancedOpen}
        >
          <span className="inline-flex items-center gap-2">
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                advancedOpen && 'rotate-180'
              )}
            />
            Options {isClientVisible && <span className="text-primary">· Client-visible</span>}
            {selectedPhase !== 'none' && <span className="text-primary">· Phase attached</span>}
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            Applied to {hasQueued ? `${queued.length} queued` : 'upcoming'} file
            {queued.length === 1 ? '' : 's'}
          </span>
        </button>

        {advancedOpen && (
          <div className="grid gap-4 border-t border-border bg-muted/10 px-4 py-4 md:grid-cols-2">
            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="file-description" className="text-xs">
                Description
              </Label>
              <Textarea
                id="file-description"
                placeholder="Optional — adds context for the team (e.g. “Design v2 mockups for review”)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none text-sm"
                disabled={isUploading}
              />
            </div>

            {/* Phase */}
            <div className="space-y-1.5">
              <Label htmlFor="file-phase" className="text-xs">
                Phase
              </Label>
              <Select
                value={selectedPhase}
                onValueChange={setSelectedPhase}
                disabled={isUploading || phases.length === 0}
              >
                <SelectTrigger id="file-phase" className="h-9">
                  <SelectValue placeholder="No phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No phase</SelectItem>
                  {phases.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.phase_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client visibility */}
            <div className="space-y-1.5">
              <Label htmlFor="file-visibility" className="text-xs">
                Visibility
              </Label>
              <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  Share with client
                </span>
                <Switch
                  id="file-visibility"
                  checked={isClientVisible}
                  onCheckedChange={setIsClientVisible}
                  disabled={isUploading}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload action */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/5 px-4 py-3">
        <p className="text-[11px] text-muted-foreground">
          {isUploading
            ? 'Uploading…'
            : hasQueued
              ? `${queued.length} ready to upload`
              : hasItems
                ? 'All files processed'
                : 'Drop or paste files to begin'}
        </p>
        <div className="flex items-center gap-2">
          {hasItems && !isUploading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItems([])}
              disabled={isUploading}
              className="text-muted-foreground"
            >
              Clear all
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleUploadAll}
            disabled={!hasQueued || isUploading}
            className="gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload {hasQueued ? `${queued.length} file${queued.length > 1 ? 's' : ''}` : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
