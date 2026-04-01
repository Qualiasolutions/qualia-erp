'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadClientFile } from '@/app/actions/project-files';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, X, Loader2, FileText } from 'lucide-react';

interface PortalClientUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalClientUpload({ projectId, onUploadComplete }: PortalClientUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  const validateAndSetFile = (file: File) => {
    setFileSizeError(null);
    if (file.size > MAX_FILE_SIZE) {
      setFileSizeError('File exceeds the 50MB limit. Please choose a smaller file.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileSizeError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('project_id', projectId);
    if (description.trim()) {
      formData.append('description', description.trim());
    }

    const result = await uploadClientFile(formData);

    setIsUploading(false);

    if (result.success) {
      toast.success('File uploaded', {
        description: `${selectedFile.name} has been shared with your team.`,
      });
      // Reset form
      setSelectedFile(null);
      setDescription('');
      setFileSizeError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete?.();
      router.refresh();
    } else {
      toast.error('Upload failed', {
        description: result.error || 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={[
          'relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors duration-200',
          isDragging
            ? 'border-primary bg-primary/5'
            : selectedFile
              ? 'cursor-default border-border bg-muted/30'
              : 'border-border hover:border-primary/50 hover:bg-muted/20',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={handleFileInput}
          tabIndex={-1}
        />

        {selectedFile ? (
          /* Selected file state */
          <div className="flex w-full items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleClearFile();
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </div>
        ) : (
          /* Empty / dragging state */
          <>
            <div
              className={[
                'flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200',
                isDragging ? 'bg-primary/15' : 'bg-muted/60',
              ].join(' ')}
            >
              <Upload
                className={[
                  'h-6 w-6 transition-colors duration-200',
                  isDragging ? 'text-primary' : 'text-muted-foreground',
                ].join(' ')}
              />
            </div>
            <div>
              <p
                className={[
                  'text-sm font-medium transition-colors duration-200',
                  isDragging ? 'text-primary' : 'text-foreground',
                ].join(' ')}
              >
                {isDragging ? 'Drop your file here' : 'Drag & drop or click to browse'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Any file type up to 50MB</p>
            </div>
          </>
        )}
      </div>

      {/* File size error */}
      {fileSizeError && <p className="text-sm text-destructive">{fileSizeError}</p>}

      {/* Description (shown only when file is selected) */}
      {selectedFile && (
        <div className="animate-fade-in-up fill-mode-both" style={{ animationDuration: '200ms' }}>
          <Textarea
            placeholder="Add a note for your team (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            rows={2}
            className="resize-none text-sm"
          />
          {description.length > 150 && (
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/200
            </p>
          )}
        </div>
      )}

      {/* Submit button */}
      {selectedFile && (
        <Button type="submit" disabled={isUploading || !selectedFile} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Share with team
            </>
          )}
        </Button>
      )}
    </form>
  );
}
