'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import Image from 'next/image';

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    original_name: string;
    mime_type: string;
    url: string;
  } | null;
}

export function FilePreviewModal({ open, onOpenChange, file }: FilePreviewModalProps) {
  if (!file) return null;

  const isImage = file.mime_type.startsWith('image/');
  const isPdf = file.mime_type === 'application/pdf';

  const handleDownload = () => {
    window.open(file.url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isImage
            ? 'max-w-4xl gap-0 overflow-hidden p-0'
            : isPdf
              ? 'max-w-5xl gap-0 overflow-hidden p-0'
              : 'max-w-lg'
        }
        showCloseButton={false}
      >
        {/* Custom header */}
        <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/30 px-5 py-3.5">
          <DialogTitle className="min-w-0 truncate text-sm font-semibold text-foreground">
            {file.original_name}
          </DialogTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 cursor-pointer p-0"
              aria-label={`Download ${file.original_name}`}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 cursor-pointer p-0"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="relative">
          {isImage && (
            <div className="relative flex items-center justify-center bg-muted/20 p-4">
              <div className="relative max-h-[80vh] w-full">
                <Image
                  src={file.url}
                  alt={file.original_name}
                  width={1200}
                  height={800}
                  className="mx-auto max-h-[80vh] w-auto object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          {isPdf && (
            <iframe
              src={file.url}
              className="h-[80vh] w-full border-0"
              title={file.original_name}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
