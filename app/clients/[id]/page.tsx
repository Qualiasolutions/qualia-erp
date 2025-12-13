import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getClientById } from '@/app/actions';
import { ClientDetailView } from './client-detail-view';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function ClientDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-background px-6 py-4">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </header>
      <div className="flex-1 p-6">
        <div className="max-w-4xl space-y-6">
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

interface ClientLoaderProps {
  id: string;
}

async function ClientLoader({ id }: ClientLoaderProps) {
  await connection();

  // Fetch client data on the server
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  return <ClientDetailView client={client} />;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-background px-6 py-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </header>

      <div className="flex-1">
        <Suspense fallback={<ClientDetailSkeleton />}>
          <ClientLoader id={id} />
        </Suspense>
      </div>
    </div>
  );
}
