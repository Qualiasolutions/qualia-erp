import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-20 w-20">
          {/* Animated glow rings */}
          <div className="absolute -inset-4 animate-ping rounded-full bg-qualia-500/20" />
          <div className="absolute -inset-2 animate-pulse rounded-full bg-qualia-400/15" />
          {/* Sphere image with floating animation */}
          <div className="relative h-full w-full animate-bounce-subtle">
            <Image
              src="/sphere.png"
              alt="Loading"
              fill
              className="object-contain drop-shadow-[0_0_15px_rgba(45,212,191,0.4)]"
              priority
            />
          </div>
        </div>
        <p className="animate-pulse text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
