'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Download, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Feature {
  id: string;
  name: string;
  original_name: string;
  description: string | null;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
  url: string | null;
  uploader: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface FeaturesGalleryProps {
  features: unknown[];
}

export function FeaturesGallery({ features }: FeaturesGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const typedFeatures = features as Feature[];

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : typedFeatures.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < typedFeatures.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (typedFeatures.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/40 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No features have been shared yet. Your team will add screenshots and design previews here
          as they become available.
        </p>
      </div>
    );
  }

  const currentFeature = typedFeatures[currentIndex];

  return (
    <>
      {/* Image Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {typedFeatures.map((feature, index) => (
          <div
            key={feature.id}
            className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-border/40 bg-muted/20 shadow-elevation-1 transition-all duration-200 ease-premium hover:border-qualia-500/50 hover:shadow-elevation-2"
            onClick={() => handleImageClick(index)}
          >
            {feature.url ? (
              <Image
                src={feature.url}
                alt={feature.description || feature.original_name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Image unavailable</p>
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="truncate text-sm font-semibold text-white">
                  {feature.description || feature.original_name}
                </h3>
                {feature.created_at && (
                  <p className="text-xs text-white/80">
                    {format(new Date(feature.created_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-0" onInteractOutside={(e) => e.preventDefault()}>
          <div className="relative flex h-[85vh] flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 p-4">
              <div className="flex-1 pr-4">
                <h2 className="truncate text-lg font-semibold">
                  {currentFeature?.description || currentFeature?.original_name}
                </h2>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  {currentFeature?.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(currentFeature.created_at), 'MMM d, yyyy')}
                    </span>
                  )}
                  {currentFeature?.uploader?.full_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {currentFeature.uploader.full_name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentFeature?.url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleDownload(currentFeature.url!, currentFeature.original_name)
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setLightboxOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image Container */}
            <div className="relative flex-1 bg-muted/20">
              {currentFeature?.url ? (
                <div className="relative h-full w-full p-4">
                  <Image
                    src={currentFeature.url}
                    alt={currentFeature.description || currentFeature.original_name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    priority
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">Image unavailable</p>
                </div>
              )}

              {/* Navigation Arrows */}
              {typedFeatures.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 shadow-elevation-2"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 shadow-elevation-2"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Footer - Image Counter */}
            <div className="border-t border-border/40 p-3 text-center">
              <p className="text-sm text-muted-foreground">
                {currentIndex + 1} of {typedFeatures.length}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
