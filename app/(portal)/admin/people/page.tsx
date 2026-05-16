import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Users } from 'lucide-react';

import { getPeopleIndex } from '@/app/actions/admin-control/people';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProfileRow, ClientRow } from '@/app/actions/admin-control/people';

export const metadata: Metadata = {
  title: 'People | Admin · Qualia',
  robots: { index: false, follow: false },
};

function ProfileTable({ rows }: { rows: ProfileRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
        <Users className="mb-3 size-7 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No people in this category.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="cursor-pointer">
              <TableCell>
                <Link
                  href={`/admin/people/${row.id}`}
                  className="flex items-center gap-2.5 font-medium text-foreground hover:text-primary"
                >
                  {row.avatarUrl ? (
                    <img src={row.avatarUrl} alt="" className="size-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-[10px] font-semibold text-primary">
                        {(row.fullName || row.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span>{row.fullName || 'Unnamed'}</span>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.email ?? '—'}</TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {row.role ?? '—'}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ClientTable({ rows }: { rows: ClientRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
        <Users className="mb-3 size-7 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No clients found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Email / Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="cursor-pointer">
              <TableCell>
                <Link
                  href={`/admin/people/${row.id}`}
                  className="flex items-center gap-2.5 font-medium text-foreground hover:text-primary"
                >
                  {row.logoUrl ? (
                    <img src={row.logoUrl} alt="" className="size-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-[10px] font-semibold text-primary">
                        {(row.displayName || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span>{row.displayName || 'Unnamed'}</span>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.phone ?? '—'}</TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  client
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  {row.leadStatus ?? 'Active'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function PeoplePage() {
  await connection();
  const data = await getPeopleIndex();

  if (!data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Failed to load people data.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          Admin
        </span>
        <h1 className="text-[clamp(1.75rem,1.4rem+1.7vw,2.5rem)] font-semibold tracking-tight">
          People
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.admins.length + data.employees.length} team members · {data.clients.length} clients
        </p>
      </header>

      <Tabs defaultValue="admins" className="w-full">
        <TabsList>
          <TabsTrigger value="admins">Admins ({data.admins.length})</TabsTrigger>
          <TabsTrigger value="employees">Employees ({data.employees.length})</TabsTrigger>
          <TabsTrigger value="clients">Clients ({data.clients.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="mt-4">
          <ProfileTable rows={data.admins} />
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <ProfileTable rows={data.employees} />
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <ClientTable rows={data.clients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
