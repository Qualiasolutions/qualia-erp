import Link from 'next/link';
import { Folder, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] ring-1 ring-primary/15">
        <Folder className="h-6 w-6 text-primary/70" />
      </div>
      <h1 className="mb-2 text-base font-semibold tracking-tight text-foreground">
        Project not found
      </h1>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        This project doesn&apos;t exist or you don&apos;t have permission to view it.
      </p>
      <Button asChild className="rounded-lg bg-primary hover:bg-qualia-700">
        <Link href="/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to projects
        </Link>
      </Button>
    </div>
  );
}
