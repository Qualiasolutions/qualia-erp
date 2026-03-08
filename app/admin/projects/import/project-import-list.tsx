'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Eye, Settings, X, InfoIcon } from 'lucide-react';
import type { ProjectForImport } from '@/app/actions/portal-import';
import { RoadmapPreviewModal } from '@/components/portal/roadmap-preview-modal';
import { PortalSettingsModal } from '@/components/admin/portal-settings-modal';

type FilterStatus = 'all' | 'enabled' | 'not-enabled';

export function ProjectImportList({ projects }: { projects: ProjectForImport[] }) {
  const router = useRouter();
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

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

  // Clear all selections
  const clearSelection = () => {
    setSelectedProjectIds(new Set());
  };

  // Open preview for selected project (only enabled when exactly 1 selected)
  const openPreview = () => {
    if (selectedProjectIds.size === 1) {
      const projectId = Array.from(selectedProjectIds)[0];
      setPreviewProjectId(projectId);
    }
  };

  // Open settings modal for selected projects
  const openSettingsModal = () => {
    if (selectedProjectIds.size > 0) {
      setSettingsModalOpen(true);
    }
  };

  // Get selected projects data for modal
  const selectedProjectsData = projects
    .filter((p) => selectedProjectIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name }));

  // Handle successful settings save
  const handleSaveSuccess = () => {
    router.refresh(); // Reload page data to show updated badges
    setSelectedProjectIds(new Set()); // Clear selection
  };

  const allSelected =
    selectedProjectIds.size === filteredProjects.length && filteredProjects.length > 0;
  const someSelected =
    selectedProjectIds.size > 0 && selectedProjectIds.size < filteredProjects.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Import Projects to Portal</h1>
        <p className="text-sm text-muted-foreground">
          Select ERP projects to enable for client portal access
        </p>
      </div>

      {/* Info banner about Phase 18 */}
      <Alert className="border-[#00A4AC]/20 bg-[#00A4AC]/5">
        <InfoIcon className="h-4 w-4 text-[#00A4AC]" />
        <AlertDescription className="text-sm text-foreground">
          Projects marked <strong>&quot;Portal Ready&quot;</strong> are configured and ready for
          client invitations in Phase 18. Projects with <strong>&quot;Portal Active&quot;</strong>{' '}
          already have client access.
        </AlertDescription>
      </Alert>

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

      {/* Bulk actions toolbar - fixed at bottom */}
      {selectedProjectIds.size > 0 && (
        <Card className="fixed bottom-6 left-1/2 z-modal flex -translate-x-1/2 items-center gap-4 border-primary/20 bg-primary/5 px-6 py-3 shadow-elevation-4 backdrop-blur-sm">
          <span className="text-sm font-medium">
            {selectedProjectIds.size} project{selectedProjectIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 bg-[#00A4AC] hover:bg-[#00A4AC]/90"
              onClick={openSettingsModal}
            >
              <Settings className="h-3.5 w-3.5" />
              Configure Portal Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={selectedProjectIds.size !== 1}
              onClick={openPreview}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview Roadmap
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={clearSelection}>
              <X className="h-3.5 w-3.5" />
              Clear Selection
            </Button>
          </div>
        </Card>
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
                  <Checkbox
                    checked={someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={toggleAll}
                  />
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
                <TableRow key={project.id} className="card-interactive">
                  <TableCell>
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
                        Portal Active ({project.portalAccessCount})
                      </Badge>
                    ) : project.hasPortalSettings ? (
                      <Badge className="gap-1.5 bg-[#00A4AC]/10 text-[#00A4AC] hover:bg-[#00A4AC]/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Portal Ready
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1.5">
                        Not Configured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPreviewProjectId(project.id)}
                      title="Preview roadmap"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Roadmap preview modal */}
      <RoadmapPreviewModal
        open={!!previewProjectId}
        onOpenChange={(open) => !open && setPreviewProjectId(null)}
        projectId={previewProjectId}
      />

      {/* Portal settings modal */}
      <PortalSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        selectedProjects={selectedProjectsData}
        onSuccess={handleSaveSuccess}
      />
    </div>
  );
}
