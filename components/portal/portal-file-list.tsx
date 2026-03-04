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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';

interface PortalFileListProps {
  files: ProjectFile[];
}

export function PortalFileList({ files }: PortalFileListProps) {
  const { toast } = useToast();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-8 w-8 text-muted-foreground/60" />;

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

    return <File className="h-8 w-8 text-muted-foreground/60" />;
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingFileId(fileId);
    try {
      const result = await getFileDownloadUrl(fileId);

      if (result.success && result.data) {
        const { url } = result.data as { url: string; filename: string };
        window.open(url, '_blank');
        toast({
          title: 'Download Started',
          description: `Downloading ${fileName}`,
        });
      } else {
        toast({
          title: 'Download Failed',
          description: result.error || 'Failed to download file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <File className="mb-4 h-12 w-12 text-muted-foreground/60" />
        <h3 className="mb-2 text-lg font-semibold text-foreground">No files shared yet</h3>
        <p className="text-sm text-muted-foreground">
          Your project manager will upload files here when available.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${fadeInClasses}`}>
      {files.map((file, index) => (
        <Card
          key={file.id}
          style={index < 6 ? getStaggerDelay(index) : undefined}
          className={`transition-all hover:shadow-md ${index < 6 ? 'animate-fade-in-up fill-mode-both' : ''}`}
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
            {file.phase && (
              <Badge variant="outline" className="text-xs">
                {file.phase.phase_name}
              </Badge>
            )}

            {/* Upload Date */}
            <p className="text-xs text-muted-foreground/80">
              Uploaded {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
            </p>

            {/* Download Button */}
            <Button
              onClick={() => handleDownload(file.id, file.original_name)}
              disabled={downloadingFileId === file.id}
              className="w-full"
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
      ))}
    </div>
  );
}
