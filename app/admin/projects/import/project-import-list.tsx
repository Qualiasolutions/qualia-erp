'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Settings } from 'lucide-react';
import type { ProjectForImport } from '@/app/actions/portal-import';

type FilterStatus = 'all' | 'enabled' | 'not-enabled';

export function ProjectImportList({ projects }: { projects: ProjectForImport[] }) {
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Filter projects based on selected tab
  const filteredProjects = projects.filter((project) => {
    if (filterStatus === 'enabled') return project.hasPortalAccess;
    if (filterStatus === 'not-enabled') return !project.hasPortalAccess;
    return true;
  });

  // Calculate counts for tab badges
  const allCount = projects.length;
  const enabledCount = projects.filter((p) => p.hasPortalAccess).length;
  const notEnabledCount = projects.filter((p) => !p.hasPortalAccess).length;

  // Toggle individual project selection
  const toggleProject = (projectId: string) => {
    const newSet = new Set(selectedProjectIds);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setSelectedProjectIds(newSet);
  };

  // Toggle all visible projects
  const toggleAll = () => {
    if (selectedProjectIds.size === filteredProjects.length && filteredProjects.length > 0) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(filteredProjects.map((p) => p.id)));
    }
  };

  const allSelected =
    selectedProjectIds.size === filteredProjects.length && filteredProjects.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Import Projects to Portal</h1>
        <p className="text-sm text-muted-foreground">
          Select ERP projects to enable for client portal access
        </p>
      </div>

      {/* Filter tabs */}
      <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {allCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="not-enabled" className="gap-2">
            Not Enabled
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {notEnabledCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="enabled" className="gap-2">
            Enabled
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {enabledCount}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bulk actions toolbar */}
      {selectedProjectIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedProjectIds.size} project{selectedProjectIds.size !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}

      {/* Project table */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No projects found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filterStatus === 'enabled'
              ? 'No projects have portal access enabled yet'
              : filterStatus === 'not-enabled'
                ? 'All projects already have portal access'
                : 'No active projects in the system'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Project Name</TableHead>
                <TableHead className="w-[140px]">Type</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[200px]">ERP Client</TableHead>
                <TableHead className="w-[160px]">Portal Access</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow
                  key={project.id}
                  className="card-interactive cursor-pointer"
                  onClick={() => toggleProject(project.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedProjectIds.has(project.id)}
                      onCheckedChange={() => toggleProject(project.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {project.project_type || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {project.project_status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {project.erpClient ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{project.erpClient.name}</span>
                        {project.erpClient.company_name && (
                          <span className="text-xs text-muted-foreground">
                            {project.erpClient.company_name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No client linked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {project.hasPortalAccess ? (
                      <Badge className="gap-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Enabled ({project.portalAccessCount})
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1.5">
                        Not Enabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      disabled
                      title="Available in next plan"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
