'use client';

import { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Check, Upload, Loader2, ImageIcon } from 'lucide-react';
import { usePortalBranding, invalidatePortalBranding } from '@/lib/swr';
import { updatePortalBranding, uploadPortalLogo } from '@/app/actions/portal-admin';
import Image from 'next/image';

const ACCENT_COLORS = [
  '#00A4AC',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#F43F5E',
  '#F59E0B',
  '#10B981',
  '#64748B',
] as const;

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

interface BrandingSettingsProps {
  workspaceId: string;
}

export function BrandingSettings({ workspaceId }: BrandingSettingsProps) {
  const { branding, isLoading } = usePortalBranding(workspaceId);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive display values from branding data or local state
  const displayName = companyName ?? branding?.company_name ?? '';
  const displayColor = selectedColor ?? branding?.accent_color ?? '#00A4AC';
  const displayLogo = logoPreview ?? branding?.logo_url ?? null;

  const handleLogoSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed');
        return;
      }

      // Validate file size
      if (file.size > MAX_LOGO_SIZE) {
        toast.error('Logo size must be under 2MB');
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspace_id', workspaceId);

        const result = await uploadPortalLogo(formData);

        if (result.success) {
          const data = result.data as { logo_url: string };
          setLogoPreview(data.logo_url);
          invalidatePortalBranding(workspaceId);
          toast.success('Logo uploaded successfully');
        } else {
          toast.error(result.error ?? 'Failed to upload logo');
        }
      } catch (error) {
        console.error('Logo upload error:', error);
        toast.error('Failed to upload logo');
      } finally {
        setUploading(false);
        // Reset file input so the same file can be re-selected
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [workspaceId]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const result = await updatePortalBranding(workspaceId, {
        company_name: displayName || undefined,
        accent_color: displayColor || undefined,
      });

      if (result.success) {
        toast.success('Branding saved successfully');
        invalidatePortalBranding(workspaceId);
      } else {
        toast.error(result.error ?? 'Failed to save branding');
      }
    } catch (error) {
      console.error('Branding save error:', error);
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  }, [workspaceId, displayName, displayColor]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Company Name */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-3">
          <div>
            <Label htmlFor="company-name" className="text-sm font-semibold">
              Company Name
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Displayed in the portal sidebar and header.
            </p>
          </div>
          <Input
            id="company-name"
            value={displayName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company name"
            maxLength={100}
            className="max-w-md"
          />
        </div>
      </section>

      {/* Logo Upload */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Portal Logo</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 2MB.</p>
          </div>

          <div className="flex items-start gap-4">
            {/* Logo preview */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
              {displayLogo ? (
                <Image
                  src={displayLogo}
                  alt="Portal logo"
                  width={80}
                  height={80}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
              )}
            </div>

            {/* Upload button */}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoSelect}
                className="sr-only"
                id="logo-upload"
                aria-label="Upload portal logo"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
              {displayLogo && (
                <p className="text-xs text-muted-foreground">
                  Logo is saved automatically on upload.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Accent Color */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Accent Color</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Stored as a preference. Does not change the current portal theme.
            </p>
          </div>

          <div
            className="flex flex-wrap gap-3"
            role="radiogroup"
            aria-label="Accent color selection"
          >
            {ACCENT_COLORS.map((color) => {
              const isSelected = displayColor === color;

              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Select color ${color}`}
                  onClick={() => setSelectedColor(color)}
                  className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{
                    boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                  }}
                >
                  <span
                    className="h-8 w-8 rounded-full transition-transform duration-150 group-hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                  {isSelected && (
                    <Check
                      className="absolute h-4 w-4"
                      style={{
                        color: color === '#F59E0B' || color === '#10B981' ? '#000' : '#fff',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Branding'
          )}
        </Button>
      </div>
    </div>
  );
}
