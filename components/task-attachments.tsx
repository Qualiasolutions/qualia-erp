'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { format, parseISO } from 'date-fns';
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  FileCode,
  File,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTaskAttachments, invalidateTaskAttachments, invalidateInboxTasks } from '@/lib/swr';
import {
  uploadTaskAttachment,
  deleteTaskAttachment,
  getTaskAttachmentUrl,
  type TaskAttachment,
} from '@/app/actions/task-attachments';

interface TaskAttachmentsProps {
  taskId: string;
  taskStatus: string;
  onTaskMarkedDone?: () => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'text/html') return FileCode;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({ taskId, taskStatus, onTaskMarkedDone }: TaskAttachmentsProps) {
  const { attachments, isLoading, revalidate } = useTaskAttachments(taskId);
  const [uploading, setUploading] = useState(false);
  const [markAsDone, setMarkAsDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.set('file', file);
        formData.set('task_id', taskId);
        if (markAsDone) formData.set('mark_as_done', 'true');

        const result = await uploadTaskAttachment(formData);
        if (result.success) {
          toast.success('File uploaded');
          invalidateTaskAttachments(taskId);
          if (markAsDone) {
            invalidateInboxTasks(true);
            onTaskMarkedDone?.();
          }
          revalidate();
        } else {
          toast.error(result.error || 'Upload failed');
        }
      } finally {
        setUploading(false);
        setMarkAsDone(false);
      }
    },
    [taskId, markAsDone, revalidate, onTaskMarkedDone]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [handleUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleDownload = useCallback(async (attachment: TaskAttachment) => {
    const result = await getTaskAttachmentUrl(attachment.id);
    if (result.success && result.data) {
      const { url } = result.data as { url: string };
      window.open(url, '_blank');
    }
  }, []);

  const handleDelete = useCallback((attachment: TaskAttachment) => {
    setDeleteTarget(attachment);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    const result = await deleteTaskAttachment(id);
    if (result.success) {
      invalidateTaskAttachments(taskId);
      revalidate();
    }
  }, [deleteTarget, taskId, revalidate]);

  const isNotDone = taskStatus !== 'Done';

  return (
    <div className="border-t border-border px-6 py-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Paperclip className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Attachments
        </span>
        {attachments.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {attachments.length}
          </span>
        )}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'mb-3 flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed p-4 transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-border hover:bg-muted/30',
          uploading && 'pointer-events-none opacity-60'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <Upload className="size-5 text-muted-foreground/60" />
        )}
        <span className="text-xs text-muted-foreground">
          {uploading ? 'Uploading...' : 'Drop a file or click to upload (max 1MB)'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {/* Mark as done checkbox */}
      {isNotDone && (
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={markAsDone}
            onChange={(e) => setMarkAsDone(e.target.checked)}
            className="size-3.5 rounded border-border accent-qualia-500"
          />
          <CheckCircle2 className="size-3 text-emerald-500/70" />
          Mark task as done when uploading
        </label>
      )}

      {/* File list */}
      {isLoading && attachments.length === 0 && (
        <p className="text-xs text-muted-foreground/60">Loading...</p>
      )}

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((a) => {
            const Icon = getFileIcon(a.mime_type);
            return (
              <div
                key={a.id}
                className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground/70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground/90">{a.file_name}</p>
                  <p className="text-[11px] text-muted-foreground/60">
                    {formatFileSize(a.file_size)}
                    {a.uploader?.full_name && ` · ${a.uploader.full_name}`}
                    {a.created_at && ` · ${format(parseISO(a.created_at), 'MMM d')}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(a);
                    }}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive/70 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(a);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.file_name}"?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
