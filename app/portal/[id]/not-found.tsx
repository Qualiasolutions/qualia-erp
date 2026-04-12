import Link from 'next/link';
import { Folder, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="mb-6 rounded-2xl bg-violet-500/10 p-4">
        <Folder className="h-12 w-12 text-violet-500" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">Project Not Found</h1>
      <p className="mb-6 max-w-md text-center text-muted-foreground">
        This project doesn&apos;t exist or you don&apos;t have permission to view it.
      </p>
      <Button asChild className="bg-primary hover:bg-qualia-700">
        <Link href="/portal/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </Button>
    </div>
  );
}
