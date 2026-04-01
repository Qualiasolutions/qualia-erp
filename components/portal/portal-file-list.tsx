'use client';

import { useState } from 'react';
import { getFileDownloadUrl } from '@/app/actions/project-files';
import type { ProjectFile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Download,
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
}

export function PortalFileList({ files }: PortalFileListProps) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const f = file as any;
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
                <div className="flex-shrink-0">{getFileIcon(f.mime_type)}</div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base" title={f.original_name}>
                    {f.original_name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {(f.file_size / 1024).toFixed(2)} KB
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Description */}
              {f.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{f.description}</p>
              )}

              {/* Phase Badge */}
              {f.phase && (
                <Badge variant="outline" className="text-xs">
                  {f.phase.phase_name}
                </Badge>
              )}

              {/* Upload Date */}
              <p className="text-xs text-muted-foreground/80">
                Uploaded {formatRelativeTime(file.created_at)}
              </p>

              {/* Download Button */}
              <Button
                onClick={() => handleDownload(file.id, f.original_name)}
                disabled={downloadingFileId === file.id}
                className="min-h-[44px] w-full"
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
