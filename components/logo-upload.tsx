'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  uploadProjectLogo,
  uploadClientLogo,
  deleteProjectLogo,
  deleteClientLogo,
} from '@/app/actions/logos';
import { useRouter } from 'next/navigation';

interface LogoUploadProps {
  entityType: 'project' | 'client';
  entityId: string;
  currentLogoUrl?: string | null;
  fallbackIcon: React.ReactNode;
  fallbackBgColor?: string;
  fallbackIconColor?: string;
  size?: 'md' | 'lg' | 'xl';
  onLogoChange?: (newUrl: string | null) => void;
}

const SIZE_MAP = {
  md: { container: 'h-16 w-16', icon: 'h-6 w-6', pixels: 64 },
  lg: { container: 'h-20 w-20', icon: 'h-8 w-8', pixels: 80 },
  xl: { container: 'h-24 w-24', icon: 'h-10 w-10', pixels: 96 },
};

export function LogoUpload({
  entityType,
  entityId,
  currentLogoUrl,
  fallbackIcon,
  fallbackBgColor = 'bg-muted',
  fallbackIconColor = 'text-muted-foreground',
  size = 'lg',
  onLogoChange,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [localLogoUrl, setLocalLogoUrl] = useState(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const sizeConfig = SIZE_MAP[size];
  const hasLogo = localLogoUrl && !imageError;

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append(entityType === 'project' ? 'project_id' : 'client_id', entityId);

        const result =
          entityType === 'project'
            ? await uploadProjectLogo(formData)
            : await uploadClientLogo(formData);

        if (result.success && result.data) {
          const newUrl = (result.data as { logo_url: string }).logo_url;
          setLocalLogoUrl(newUrl);
          setImageError(false);
          onLogoChange?.(newUrl);
          router.refresh();
        } else {
          setError(result.error || 'Failed to upload logo');
        }
      } catch {
        setError('An unexpected error occurred');
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [entityType, entityId, onLogoChange, router]
  );

  const handleDelete = useCallback(async () => {
    if (!confirm('Remove this logo?')) return;

    setDeleting(true);
    setError(null);

    try {
      const result =
        entityType === 'project'
          ? await deleteProjectLogo(entityId)
          : await deleteClientLogo(entityId);

      if (result.success) {
        setLocalLogoUrl(null);
        setImageError(false);
        onLogoChange?.(null);
        router.refresh();
      } else {
        setError(result.error || 'Failed to remove logo');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  }, [entityType, entityId, onLogoChange, router]);

  const isLoading = uploading || deleting;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Logo display with upload overlay */}
      <div className="group relative">
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border-2 border-dashed border-transparent transition-all',
            sizeConfig.container,
            !hasLogo && fallbackBgColor,
            'group-hover:border-primary/50'
          )}
        >
          {hasLogo ? (
            <Image
              src={localLogoUrl!}
              alt="Logo"
              fill
              className="object-contain"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div
              className={cn('flex h-full w-full items-center justify-center', fallbackIconColor)}
            >
              <span className={sizeConfig.icon}>{fallbackIcon}</span>
            </div>
          )}

          {/* Overlay on hover */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity',
              'group-hover:opacity-100',
              isLoading && 'opacity-100'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        {/* Click area for upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="absolute inset-0 cursor-pointer"
          aria-label="Upload logo"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="h-7 px-2 text-xs"
        >
          {uploading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Upload className="mr-1 h-3 w-3" />
          )}
          {hasLogo ? 'Change' : 'Upload'}
        </Button>

        {hasLogo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="mr-1 h-3 w-3" />
            )}
            Remove
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
