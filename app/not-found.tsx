'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="mb-6 rounded-2xl bg-muted/50 p-4">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">Page Not Found</h1>
      <p className="mb-6 max-w-md text-center text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
        <Button asChild className="bg-primary hover:bg-qualia-700">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
