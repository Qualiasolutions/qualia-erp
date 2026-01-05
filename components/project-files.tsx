'use client';

import { useState, useCallback, useRef } from 'react';
import {
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Table,
  Presentation,
  Upload,
  Download,
  Trash2,
  Loader2,
  FolderOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  getFileDownloadUrl,
} from '@/app/actions/project-files';
import type { ProjectFile } from '@/types/database';
import { cn, formatTimeAgo } from '@/lib/utils';
import useSWR, { mutate } from 'swr';

interface ProjectFilesProps {
  projectId: string;
}

function getFileIcon(mimeType: string | null): typeof File {
  if (!mimeType) return File;

  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return Table;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('rar')) return Archive;
  if (mimeType.startsWith('text/')) return FileText;

  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ProjectFiles({ projectId }: ProjectFilesProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files with SWR
  const { data: files = [], isLoading } = useSWR(
    `project-files-${projectId}`,
    () => getProjectFiles(projectId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      setUploading(true);
      setUploadError(null);

      try {
        for (const file of Array.from(selectedFiles)) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('project_id', projectId);

          const result = await uploadProjectFile(formData);

          if (!result.success) {
            setUploadError(result.error || 'Upload failed');
            break;
          }
        }

        // Refresh files list
        mutate(`project-files-${projectId}`);
      } catch {
        setUploadError('An unexpected error occurred');
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [projectId]
  );

  const handleDownload = useCallback(async (file: ProjectFile) => {
    setDownloadingId(file.id);
    try {
      const result = await getFileDownloadUrl(file.id);
      if (result.success && result.data) {
        const { url, filename } = result.data as { url: string; filename: string };
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (file: ProjectFile) => {
      if (!confirm(`Delete "${file.original_name}"?`)) return;

      setDeletingId(file.id);
      try {
        const result = await deleteProjectFile(file.id);
        if (result.success) {
          mutate(`project-files-${projectId}`);
        }
      } finally {
        setDeletingId(null);
      }
    },
    [projectId]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Files</h3>
          <span className="text-xs text-muted-foreground">({files.length})</span>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Drop zone / File list */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed transition-colors',
          isDragging ? 'border-qualia-500 bg-qualia-500/5' : 'border-border',
          files.length === 0 && !isLoading && 'min-h-[120px]'
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {isDragging ? 'Drop files here' : 'No files yet'}
            </p>
            <p className="text-xs text-muted-foreground/70">Drag & drop files or click Upload</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.mime_type);
              const isDeleting = deletingId === file.id;
              const isDownloading = downloadingId === file.id;

              return (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 transition-colors hover:bg-secondary/50',
                    isDeleting && 'opacity-50'
                  )}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-secondary">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={file.original_name}>
                      {file.original_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)} • {formatTimeAgo(file.created_at)}
                      {file.uploader && ` • ${file.uploader.full_name || file.uploader.email}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDownload(file)}
                      disabled={isDownloading || isDeleting}
                      title="Download"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => handleDelete(file)}
                      disabled={isDownloading || isDeleting}
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground/70">
        Max 50MB per file. Supported: images, PDFs, documents, spreadsheets, videos, audio,
        archives.
      </p>
    </div>
  );
}
