'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, { container: string; icon: string; pixels: number }> = {
  xs: { container: 'h-5 w-5', icon: 'h-3 w-3', pixels: 20 },
  sm: { container: 'h-6 w-6', icon: 'h-3.5 w-3.5', pixels: 24 },
  md: { container: 'h-8 w-8', icon: 'h-4 w-4', pixels: 32 },
  lg: { container: 'h-10 w-10', icon: 'h-5 w-5', pixels: 40 },
  xl: { container: 'h-12 w-12', icon: 'h-6 w-6', pixels: 48 },
};

interface EntityAvatarProps {
  src?: string | null;
  fallbackIcon: React.ReactNode;
  fallbackBgColor?: string;
  fallbackIconColor?: string;
  size?: AvatarSize;
  className?: string;
  rounded?: 'full' | 'lg' | 'md';
}

export function EntityAvatar({
  src,
  fallbackIcon,
  fallbackBgColor = 'bg-muted',
  fallbackIconColor = 'text-muted-foreground',
  size = 'md',
  className,
  rounded = 'lg',
}: EntityAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const sizeConfig = SIZE_MAP[size];

  const roundedClass = {
    full: 'rounded-full',
    lg: 'rounded-lg',
    md: 'rounded-md',
  }[rounded];

  // Show fallback if no src or image failed to load
  if (!src || imageError) {
    return (
      <div
        className={cn(
          'flex flex-shrink-0 items-center justify-center',
          sizeConfig.container,
          roundedClass,
          fallbackBgColor,
          className
        )}
      >
        <span
          className={cn(sizeConfig.icon, fallbackIconColor, 'flex items-center justify-center')}
        >
          {fallbackIcon}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex-shrink-0 overflow-hidden',
        sizeConfig.container,
        roundedClass,
        className
      )}
    >
      <Image
        src={src}
        alt="Logo"
        fill
        className="object-cover"
        onError={() => setImageError(true)}
        unoptimized // Allow external URLs from Supabase storage
      />
    </div>
  );
}
