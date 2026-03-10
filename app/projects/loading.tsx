import Image from 'next/image';

export default function ProjectsLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-16 w-16">
          {/* Animated glow rings */}
          <div className="absolute -inset-3 animate-ping rounded-full bg-qualia-500/20" />
          <div className="absolute -inset-1 animate-pulse rounded-full bg-qualia-400/15" />
          {/* Sphere image */}
          <div className="relative h-full w-full animate-bounce-subtle">
            <Image
              src="/sphere.webp"
              alt="Loading"
              fill
              className="object-contain drop-shadow-[0_0_12px_rgba(45,212,191,0.4)]"
              priority
            />
          </div>
        </div>
        <p className="animate-pulse text-sm text-muted-foreground">Loading Projects...</p>
      </div>
    </div>
  );
}
