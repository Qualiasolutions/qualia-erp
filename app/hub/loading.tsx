import { Loader2 } from 'lucide-react';

export default function HubLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading Hub...</p>
      </div>
    </div>
  );
}
