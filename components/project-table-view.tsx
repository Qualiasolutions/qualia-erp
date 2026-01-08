'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  X,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Folder,
  Inbox,
  MoreVertical,
  Trash2,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/client-utils';
import { PROJECT_STATUS_COLORS, type ProjectStatusKey } from '@/lib/color-constants';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAdminContext } from '@/components/admin-provider';
import { deleteProject } from '@/app/actions';
import type { ProjectData } from '@/app/projects/page';
import type { ProjectType } from '@/types/database';

// Project type configuration
const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  {
    icon: typeof Globe;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  ai_agent: {
    icon: Bot,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    label: 'AI',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    label: 'Voice',
  },
  web_design: {
    icon: Globe,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    label: 'Web',
  },
  seo: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'SEO',
  },
  ads: {
    icon: Megaphone,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Ads',
  },
};

const PROJECT_STATUSES = [
  'Active',
  'Demos',
  'Launched',
  'Delayed',
  'Archived',
  'Canceled',
] as const;
const PROJECT_TYPES: ProjectType[] = ['ai_agent', 'voice_agent', 'web_design', 'seo', 'ads'];

type SortField =
  | 'name'
  | 'progress'
  | 'owner'
  | 'status'
  | 'tasks'
  | 'start_date'
  | 'end_date'
  | 'type';
type SortDirection = 'asc' | 'desc';

// Helper: Calculate progress
function getProgress(project: ProjectData): number {
  if (project.roadmap_progress > 0) return project.roadmap_progress;
  if (project.issue_stats?.total) {
    return Math.round((project.issue_stats.done / project.issue_stats.total) * 100);
  }
  return 0;
}

// Helper: Days remaining component
function DaysRemaining({ targetDate }: { targetDate: string }) {
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="text-xs text-red-400">({Math.abs(diffDays)}d overdue)</span>;
  } else if (diffDays === 0) {
    return <span className="text-xs text-amber-400">(Today)</span>;
  } else if (diffDays <= 7) {
    return <span className="text-xs text-amber-400">({diffDays}d left)</span>;
  } else {
    return <span className="text-xs text-muted-foreground/70">({diffDays}d)</span>;
  }
}

// Sortable header component
function SortableHeader({
  field,
  label,
  currentField,
  direction,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = field === currentField;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

// Table row component
const ProjectTableRow = React.memo(function ProjectTableRow({
  project,
  rowIndex,
}: {
  project: ProjectData;
  rowIndex: number;
}) {
  const router = useRouter();
  const { isSuperAdmin } = useAdminContext();
  const [isPending, startTransition] = useTransition();

  const handleRowClick = () => {
    router.push(`/projects/${project.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        'Are you sure you want to delete this project? This will also delete all tasks. This action cannot be undone.'
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Failed to delete project');
      }
    });
  };

  const progress = getProgress(project);
  const statusColors = PROJECT_STATUS_COLORS[project.status as ProjectStatusKey];
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;

  return (
    <tr
      onClick={handleRowClick}
      className={cn(
        'group cursor-pointer transition-colors',
        'hover:bg-secondary/50',
        rowIndex % 2 === 1 && 'bg-secondary/20',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      {/* ID Column */}
      <td className="px-4 py-3 text-sm text-muted-foreground">#{rowIndex + 1}</td>

      {/* Project Name */}
      <td className="px-4 py-3">
        <span className="font-medium text-foreground transition-colors group-hover:text-qualia-500">
          {project.name}
        </span>
      </td>

      {/* Progress */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progress === 100 ? 'bg-emerald-500' : 'bg-qualia-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-medium tabular-nums text-muted-foreground">
            {progress}%
          </span>
        </div>
      </td>

      {/* Owner */}
      <td className="px-4 py-3">
        {project.lead ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-qualia-500/10 text-xs text-qualia-500">
                {getInitials(project.lead.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[80px] truncate text-sm text-muted-foreground">
              {project.lead.full_name?.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/50">-</span>
        )}
      </td>

      {/* Status Badge */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            statusColors?.bg || 'bg-slate-500/10',
            statusColors?.text || 'text-slate-400'
          )}
        >
          {project.status}
        </span>
      </td>

      {/* Tasks */}
      <td className="px-4 py-3">
        <span className="text-sm tabular-nums text-muted-foreground">
          {project.issue_stats?.done || 0}/{project.issue_stats?.total || 0}
        </span>
      </td>

      {/* Start Date */}
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {project.start_date ? format(new Date(project.start_date), 'MMM d, yy') : '-'}
        </span>
      </td>

      {/* End Date with relative indicator */}
      <td className="px-4 py-3">
        {project.target_date ? (
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">
              {format(new Date(project.target_date), 'MMM d, yy')}
            </span>
            <DaysRemaining targetDate={project.target_date} />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground/50">-</span>
        )}
      </td>

      {/* Type Tag */}
      <td className="px-4 py-3">
        {typeConfig && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
              typeConfig.bgColor,
              typeConfig.color
            )}
          >
            <TypeIcon className="h-3 w-3" />
            {typeConfig.label}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-2 py-3">
        {isSuperAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleRowClick}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
});

interface ProjectTableViewProps {
  projects: ProjectData[];
}

export function ProjectTableView({ projects }: ProjectTableViewProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique owners
  const owners = useMemo(() => {
    const uniqueOwners = new Map<string, { id: string; full_name: string | null }>();
    projects.forEach((p) => {
      if (p.lead) {
        uniqueOwners.set(p.lead.id, { id: p.lead.id, full_name: p.lead.full_name });
      }
    });
    return Array.from(uniqueOwners.values());
  }, [projects]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted projects
  const processedProjects = useMemo(() => {
    let result = [...projects];

    // Apply filters
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter((p) => p.project_type === typeFilter);
    }
    if (ownerFilter !== 'all') {
      result = result.filter((p) => p.lead?.id === ownerFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'progress':
          comparison = getProgress(a) - getProgress(b);
          break;
        case 'owner':
          comparison = (a.lead?.full_name || '').localeCompare(b.lead?.full_name || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'tasks':
          comparison = (a.issue_stats?.total || 0) - (b.issue_stats?.total || 0);
          break;
        case 'start_date':
          comparison =
            (a.start_date ? new Date(a.start_date).getTime() : 0) -
            (b.start_date ? new Date(b.start_date).getTime() : 0);
          break;
        case 'end_date':
          comparison =
            (a.target_date ? new Date(a.target_date).getTime() : 0) -
            (b.target_date ? new Date(b.target_date).getTime() : 0);
          break;
        case 'type':
          comparison = (a.project_type || '').localeCompare(b.project_type || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [projects, statusFilter, typeFilter, ownerFilter, searchQuery, sortField, sortDirection]);

  const hasActiveFilters =
    statusFilter !== 'all' || typeFilter !== 'all' || ownerFilter !== 'all' || searchQuery;

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setOwnerFilter('all');
    setSearchQuery('');
  };

  if (projects.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-2xl bg-secondary/50 p-5">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground">No projects yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first project to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PROJECT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROJECT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {PROJECT_TYPE_CONFIG[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Owner Filter */}
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.full_name || 'Unnamed'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}

        {/* Results count */}
        <span className="ml-auto text-sm text-muted-foreground">
          {processedProjects.length} of {projects.length} projects
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[950px] table-fixed">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="w-14 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                ID
              </th>
              <th className="w-[200px] px-4 py-3 text-left">
                <SortableHeader
                  field="name"
                  label="Project Name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-24 px-4 py-3 text-left">
                <SortableHeader
                  field="progress"
                  label="%"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-28 px-4 py-3 text-left">
                <SortableHeader
                  field="owner"
                  label="Owner"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-24 px-4 py-3 text-left">
                <SortableHeader
                  field="status"
                  label="Status"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-20 px-4 py-3 text-left">
                <SortableHeader
                  field="tasks"
                  label="Tasks"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-24 px-4 py-3 text-left">
                <SortableHeader
                  field="start_date"
                  label="Start"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-28 px-4 py-3 text-left">
                <SortableHeader
                  field="end_date"
                  label="End"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-20 px-4 py-3 text-left">
                <SortableHeader
                  field="type"
                  label="Type"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-10 px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {processedProjects.map((project, index) => (
              <ProjectTableRow key={project.id} project={project} rowIndex={index} />
            ))}
          </tbody>
        </table>

        {/* Empty filtered state */}
        {processedProjects.length === 0 && projects.length > 0 && (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No projects match your filters</p>
            <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
