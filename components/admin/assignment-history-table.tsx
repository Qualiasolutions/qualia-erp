'use client';

import { useAllAssignments } from '@/lib/swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { Clock } from 'lucide-react';

export function AssignmentHistoryTable() {
  const { data: assignments, isLoading } = useAllAssignments();

  // Sort by assigned_at descending
  const sortedAssignments = Array.isArray(assignments)
    ? [...assignments].sort(
        (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      )
    : [];

  if (isLoading) {
    return <p className="text-muted-foreground">Loading history...</p>;
  }

  if (!sortedAssignments.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No assignment history yet</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment History</CardTitle>
        <CardDescription>Complete audit trail of all employee-project assignments</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Removed</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAssignments.map((assignment) => {
              const isActive = !assignment.removed_at;
              const duration = assignment.removed_at
                ? Math.ceil(
                    (new Date(assignment.removed_at).getTime() -
                      new Date(assignment.assigned_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : Math.ceil(
                    (Date.now() - new Date(assignment.assigned_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                  );

              return (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? 'Active' : 'Removed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={assignment.employee?.avatar_url || ''} />
                        <AvatarFallback>
                          {assignment.employee?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{assignment.employee?.full_name || assignment.employee?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{assignment.project?.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(assignment.assigned_at, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {assignment.removed_at ? formatDate(assignment.removed_at, 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {duration} day{duration !== 1 ? 's' : ''}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
