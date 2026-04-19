'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Download,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getFileDownloadUrl,
  getProjectFiles,
  type ProjectFileWithUploader,
} from '@/app/actions/project-files';

interface ProjectFilesPanelProps {
  projectId: string;
  isClient: boolean;
  className?: string;
}

function getFileIcon(mimeType: string | null) {
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

export function ProjectFilesPanel({ projectId, isClient, className }: ProjectFilesPanelProps) {
  const [files, setFiles] = useState<ProjectFileWithUploader[] | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      const link = document.createElement('a');
      link.href = data.url;
      link.download = originalName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
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
        {!isClient && (
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Link href={`/projects/${projectId}/files`}>Manage</Link>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No files yet</p>
            {!isClient && (
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
                  {getFileIcon(file.mime_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13px] font-medium text-foreground"
                    title={file.original_name}
                  >
                    {file.original_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground/70">
                    {formatBytes(file.file_size)}
                    {file.phase_name ? ` · ${file.phase_name}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDownload(file.id, file.original_name)}
                  disabled={downloadingId === file.id}
                  title="Download"
                >
                  {downloadingId === file.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
