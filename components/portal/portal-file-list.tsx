'use client';

import { useState } from 'react';
import { getFileDownloadUrl } from '@/app/actions/project-files';
import type { ProjectFile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Download,
  Eye,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';

interface PortalFileListProps {
  files: ProjectFile[];
  onPreview?: (file: { id: string; original_name: string; mime_type: string }) => void;
}

function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

export function PortalFileList({ files, onPreview }: PortalFileListProps) {
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-8 w-8 text-muted-foreground" />;

    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    }
    if (mimeType.startsWith('video/')) {
      return <FileVideo className="h-8 w-8 text-purple-500" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <FileAudio className="h-8 w-8 text-green-500" />;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return <FileArchive className="h-8 w-8 text-orange-500" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }

    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingFileId(fileId);
    try {
      const result = await getFileDownloadUrl(fileId);

      if (result.success && result.data) {
        const { url } = result.data as { url: string; filename: string };
        window.open(url, '_blank');
        toast.success(`Downloading ${fileName}`);
      } else {
        toast.error('Download Failed', { description: result.error || 'Failed to download file' });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download Failed', { description: 'An unexpected error occurred' });
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          {/* Icon Container */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-qualia-500/10 to-qualia-600/5 ring-1 ring-primary/10">
            <FolderOpen className="h-10 w-10 text-primary/60" />
          </div>

          {/* Heading */}
          <h3 className="text-xl font-semibold tracking-tight text-foreground">No files yet</h3>

          {/* Description */}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Deliverables and project files will be shared here. Your team will upload files when
            they&apos;re ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${fadeInClasses}`}>
      {files.map((file, index) => {
        return (
          <Card
            key={file.id}
            style={index < 6 ? getStaggerDelay(index) : undefined}
            className={cn(
              'border-primary/[0.08] shadow-elevation-1 transition-shadow duration-200 ease-premium hover:border-primary/20 hover:shadow-elevation-2',
              index < 6 && 'animate-fade-in-up fill-mode-both'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">{getFileIcon(file.mime_type)}</div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base" title={file.original_name}>
                    {file.original_name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {(file.file_size / 1024).toFixed(2)} KB
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Description */}
              {file.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{file.description}</p>
              )}

              {/* Phase Badge */}
              {file.phase_name && (
                <Badge variant="outline" className="text-xs">
                  {file.phase_name}
                </Badge>
              )}

              {/* Upload Date */}
              <p className="text-xs text-muted-foreground/80">
                Uploaded {formatRelativeTime(file.created_at)}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {onPreview && isPreviewable(file.mime_type) && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      onPreview({
                        id: file.id,
                        original_name: file.original_name,
                        mime_type: file.mime_type || '',
                      })
                    }
                    className="min-h-[44px] flex-1 cursor-pointer"
                    aria-label={`Preview ${file.original_name}`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                )}
                <Button
                  onClick={() => handleDownload(file.id, file.original_name)}
                  disabled={downloadingFileId === file.id}
                  className={`min-h-[44px] ${onPreview && isPreviewable(file.mime_type) ? 'flex-1' : 'w-full'}`}
                >
                  {downloadingFileId === file.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
