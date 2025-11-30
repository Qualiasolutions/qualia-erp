export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-background/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-qualia-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-qualia-500 rounded-full animate-spin" />
          <div className="absolute inset-4 bg-qualia-500/10 rounded-full blur-sm" />
        </div>
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
