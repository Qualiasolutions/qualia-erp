'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface WorkItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  src: string;
  device: 'mobile' | 'desktop';
  description?: string;
}

interface WorkShowcaseProps {
  clientName: string;
  workItems: WorkItem[];
}

// Phone mockup frame component
function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[280px] rounded-[2.5rem] bg-gradient-to-b from-gray-900 to-gray-800 p-2 shadow-2xl',
        'ring-8 ring-gray-900/50',
        className
      )}
      style={{ aspectRatio: '9/16' }}
    >
      {/* Notch */}
      <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
      
      {/* Screen */}
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-black">
        {children}
      </div>
      
      {/* Home indicator */}
      <div className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/30" />
    </div>
  );
}

// Laptop/Desktop mockup frame component - using 16:9 aspect ratio
function LaptopFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative mx-auto w-full', className)}>
      {/* Screen */}
      <div 
        className="relative w-full overflow-hidden rounded-t-xl bg-gray-900 p-2 shadow-2xl"
        style={{ aspectRatio: '16/9' }}
      >
        {/* Screen bezel */}
        <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
          {children}
        </div>
      </div>
      
      {/* Keyboard/base */}
      <div className="relative -mt-1 h-6 w-full rounded-b-xl bg-gradient-to-b from-gray-800 to-gray-900 shadow-xl">
        <div className="absolute left-1/2 top-1/2 h-1 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-700" />
      </div>
    </div>
  );
}

function WorkItemCard({ item }: { item: WorkItem }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const FrameComponent = item.device === 'mobile' ? PhoneFrame : LaptopFrame;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl transition-all duration-500',
        'hover:scale-[1.02] hover:shadow-2xl',
        'animate-in fade-in slide-in-from-bottom-4'
      )}
      style={{ animationDelay: '150ms' }}
    >
      {/* Glow effect */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative rounded-2xl bg-card p-4 md:p-6">
        {/* Frame wrapper with proper aspect ratio - 16:9 for desktop, mobile maintains phone ratio */}
        <div
          className={cn(
            'relative mx-auto overflow-hidden rounded-xl',
            item.device === 'mobile' ? 'w-full max-w-[280px]' : 'w-full'
          )}
        >
          <FrameComponent>
            <div className="relative h-full w-full">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/30">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              {hasError ? (
                <div className="flex h-full w-full items-center justify-center bg-muted/50">
                  <span className="text-sm text-muted-foreground">Failed to load</span>
                </div>
              ) : (
                <>
                  {item.type === 'image' ? (
                    <Image
                      src={item.src}
                      alt={item.title}
                      fill
                      className={cn(
                        'object-contain transition-opacity duration-500',
                        isLoading ? 'opacity-0' : 'opacity-100'
                      )}
                      sizes={item.device === 'mobile' ? '280px' : '100vw'}
                      onLoad={() => setIsLoading(false)}
                      onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                      }}
                    />
                  ) : (
                    <video
                      src={item.src}
                      className={cn(
                        'h-full w-full object-contain transition-opacity duration-500',
                        isLoading ? 'opacity-0' : 'opacity-100'
                      )}
                      autoPlay
                      loop
                      muted
                      playsInline
                      onLoadedData={() => setIsLoading(false)}
                      onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </FrameComponent>
        </div>

        {/* Title and description */}
        {(item.title || item.description) && (
          <div className="mt-4 text-center">
            {item.title && (
              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                {item.title}
              </h3>
            )}
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkShowcase({ clientName, workItems }: WorkShowcaseProps) {
  if (!workItems || workItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="animate-in fade-in slide-in-from-bottom-2">
        <h2 className="text-xl font-bold text-foreground">Work Showcase</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Showcasing our work for {clientName}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
        {workItems.map((item, index) => (
          <div
            key={item.id}
            className="animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <WorkItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

