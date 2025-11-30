import { Suspense } from "react";
import ClientDetailClient from "./client";

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<ClientDetailSkeleton />}>
      <ClientDetailClient />
    </Suspense>
  );
}

function ClientDetailSkeleton() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4" />
        <div className="h-4 bg-muted rounded w-1/4 mb-8" />
        <div className="space-y-4">
          <div className="h-32 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
