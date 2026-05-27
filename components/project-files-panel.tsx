'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Download,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Link as LinkIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  createProjectFileLink,
  deleteProjectFile,
  getFileDownloadUrl,
  getProjectFiles,
  uploadClientFile,
  uploadProjectFile,
  type ProjectFileWithUploader,
} from '@/app/actions/project-files';

interface ProjectFilesPanelProps {
  projectId: string;
  isClient: boolean;
  /** When true, show admin upload + delete controls. Clients get their own
   *  upload path via uploadClientFile and never get delete/admin controls. */
  isAdmin?: boolean;
  canManage?: boolean;
  className?: string;
}

function getFileIcon(file: ProjectFileWithUploader) {
  if (file.file_kind === 'link') return <LinkIcon className="h-3.5 w-3.5 text-sky-400" />;
  const mimeType = file.mime_type;
  if (!mimeType) return <FileIcon className="h-3.5 w-3.5 text-muted-foreground/70" />;
  if (mimeType.startsWith('image/')) return <FileImage className="h-3.5 w-3.5 text-blue-400" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="h-3.5 w-3.5 text-purple-400" />;
  if (mimeType.startsWith('audio/')) return <FileAudio className="h-3.5 w-3.5 text-emerald-400" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive'))
    return <FileArchive className="h-3.5 w-3.5 text-amber-400" />;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
    return <FileText className="h-3.5 w-3.5 text-rose-400" />;
  return <FileIcon className="h-3.5 w-3.5 text-muted-foreground/70" />;
}

function formatBytes(bytes: number | null): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function ProjectFilesPanel({
  projectId,
  isClient,
  isAdmin = false,
  canManage = isAdmin,
  className,
}: ProjectFilesPanelProps) {
  const [files, setFiles] = useState<ProjectFileWithUploader[] | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    startTransition(() => {
      getProjectFiles(projectId, isClient).then(setFiles);
    });
  };

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      getProjectFiles(projectId, isClient).then((result) => {
        if (!cancelled) setFiles(result);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, isClient]);

  const handleDownload = async (fileId: string, originalName: string) => {
    setDownloadingId(fileId);
    try {
      const result = await getFileDownloadUrl(fileId);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to get download URL');
        return;
      }
      const data = result.data as { url: string };
      if (data.url.startsWith('http')) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        const link = document.createElement('a');
        link.href = data.url;
        link.download = originalName;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset the input so the same file can be re-uploaded if needed.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('project_id', projectId);
      const result = isClient ? await uploadClientFile(fd) : await uploadProjectFile(fd);
      if (!result.success) {
        toast.error(result.error || 'Upload failed');
        return;
      }
      toast.success(`Uploaded ${file.name}`);
      refresh();
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim() || addingLink) return;
    setAddingLink(true);
    try {
      const fd = new FormData();
      fd.set('project_id', projectId);
      fd.set('title', linkTitle.trim() || linkUrl.trim());
      fd.set('url', linkUrl.trim());
      const result = await createProjectFileLink(fd);
      if (!result.success) {
        toast.error(result.error || 'Add link failed');
        return;
      }
      toast.success('Link added');
      setLinkTitle('');
      setLinkUrl('');
      refresh();
    } finally {
      setAddingLink(false);
    }
  };

  const handleDelete = (fileId: string, originalName: string) => {
    setPendingDelete({ id: fileId, name: originalName });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setDeletingId(id);
    try {
      const result = await deleteProjectFile(id);
      if (!result.success) {
        toast.error(result.error || 'Delete failed');
        return;
      }
      toast.success('File deleted');
      refresh();
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const loading = files === null || isPending;
  const list = files || [];

  return (
    <div className={cn('flex flex-col rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Files</h3>
          {!loading && <span className="text-xs text-muted-foreground">({list.length})</span>}
        </div>
        {(canManage || isClient) && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple={false}
              className="hidden"
              onChange={handleFilePicked}
              aria-hidden
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              aria-label={isClient ? 'Upload client file' : 'Upload project file'}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload
            </Button>
          </>
        )}
      </div>

      {canManage && (
        <div className="grid gap-2 border-b border-border px-3 py-2 sm:grid-cols-[1fr_1.25fr_auto]">
          <Input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Link title"
            disabled={addingLink}
            className="h-8 text-xs"
          />
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            disabled={addingLink}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            disabled={addingLink || !linkUrl.trim()}
            onClick={handleAddLink}
            aria-label="Add project link"
          >
            {addingLink ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No files yet</p>
            {isClient ? (
              <p className="text-xs text-muted-foreground/70">
                Upload files you want the team to review
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/70">
                Upload briefs, deliverables, invoices
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((file) => (
              <div
                key={file.id}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
                  {getFileIcon(file)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13px] font-medium text-foreground"
                    title={file.original_name}
                  >
                    {file.original_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground/70">
                    {file.file_kind === 'link' ? 'Link' : formatBytes(file.file_size)}
                    {file.phase_name ? ` · ${file.phase_name}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 min-h-[44px] w-7 min-w-[44px] shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  onClick={() => handleDownload(file.id, file.original_name)}
                  disabled={downloadingId === file.id}
                  title="Download"
                  aria-label="Download file"
                >
                  {downloadingId === file.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : file.file_kind === 'link' ? (
                    <ExternalLink className="h-3.5 w-3.5" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 min-h-[44px] w-7 min-w-[44px] shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                    onClick={() => handleDelete(file.id, file.original_name)}
                    disabled={deletingId === file.id}
                    title="Delete"
                    aria-label="Delete file"
                  >
                    {deletingId === file.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete file"
        description={pendingDelete ? `Delete ${pendingDelete.name}? This can't be undone.` : ''}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
