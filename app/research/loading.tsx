export default function Loading() {
  return (
    <div className="flex h-full flex-col gap-5 p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
