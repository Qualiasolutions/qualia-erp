import Image from 'next/image';

export default function ProjectsLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-breathe relative h-14 w-14">
          <Image src="/sphere.webp" alt="Loading" fill className="object-contain" priority />
        </div>
        <p className="animate-fade-in text-sm text-muted-foreground">Loading Projects...</p>
      </div>
    </div>
  );
}
