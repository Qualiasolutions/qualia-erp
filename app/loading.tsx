import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16 animate-fade-in">
          <Image src="/sphere.webp" alt="Loading" fill className="object-contain" priority />
        </div>
        <p className="animate-fade-in text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
