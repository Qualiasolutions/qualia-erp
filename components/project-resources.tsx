'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Link as LinkIcon,
  Github,
  ExternalLink,
  Plus,
  Trash2,
  Database,
  Globe,
  Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateProject, getProjectById } from '@/app/actions';

// Resource types with icons
const RESOURCE_TYPES = [
  { value: 'github', label: 'GitHub', icon: Github, color: 'text-muted-foreground' },
  { value: 'vercel', label: 'Vercel', icon: Cloud, color: 'text-white' },
  { value: 'supabase', label: 'Supabase', icon: Database, color: 'text-emerald-500' },
  { value: 'railway', label: 'Railway', icon: Cloud, color: 'text-violet-500' },
  { value: 'social', label: 'Social Media', icon: Globe, color: 'text-sky-500' },
  { value: 'other', label: 'Other', icon: LinkIcon, color: 'text-muted-foreground' },
] as const;

type ResourceType = (typeof RESOURCE_TYPES)[number]['value'];

interface Resource {
  id: string;
  type: ResourceType;
  label: string;
  url: string;
}

// Input type for initialResources - allows any string type that will be normalized
interface ResourceInput {
  id: string;
  type: string;
  label: string;
  url: string;
}

interface ProjectResourcesProps {
  projectId: string;
  initialResources?: ResourceInput[];
  className?: string;
}

export function ProjectResources({
  projectId,
  initialResources = [],
  className,
}: ProjectResourcesProps) {
  // Normalize input resources to ensure valid type
  const normalizeResources = (inputs: ResourceInput[]): Resource[] => {
    const validTypes = RESOURCE_TYPES.map((t) => t.value);
    return inputs.map((r) => ({
      ...r,
      type: (validTypes.includes(r.type as ResourceType) ? r.type : 'other') as ResourceType,
    }));
  };

  const [resources, setResources] = useState<Resource[]>(() =>
    normalizeResources(initialResources)
  );
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [newType, setNewType] = useState<ResourceType>('github');
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const saveResources = async (updatedResources: Resource[]) => {
    const formData = new FormData();
    formData.set('id', projectId);
    formData.set('metadata', JSON.stringify({ resources: updatedResources }));

    const result = await updateProject(formData);
    if (result.success) {
      // Refresh to get latest
      const project = await getProjectById(projectId);
      if (project?.metadata?.resources) {
        setResources(project.metadata.resources as Resource[]);
      }
    }
  };

  const handleAdd = () => {
    if (!newUrl.trim()) return;

    const typeConfig = RESOURCE_TYPES.find((t) => t.value === newType);
    const resource: Resource = {
      id: crypto.randomUUID(),
      type: newType,
      label: newLabel.trim() || typeConfig?.label || 'Link',
      url: newUrl.trim(),
    };

    const updated = [...resources, resource];
    setResources(updated);
    startTransition(() => saveResources(updated));

    // Reset form
    setNewType('github');
    setNewLabel('');
    setNewUrl('');
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = resources.filter((r) => r.id !== id);
    setResources(updated);
    startTransition(() => saveResources(updated));
  };

  const getTypeConfig = (type: ResourceType) => {
    return RESOURCE_TYPES.find((t) => t.value === type) || RESOURCE_TYPES[5];
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card',
        isPending && 'opacity-70',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Resources</h3>
          <span className="text-xs text-muted-foreground">({resources.length})</span>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Resource Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={newType} onValueChange={(v) => setNewType(v as ResourceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className={cn('h-4 w-4', t.color)} />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Label (optional)</label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder={getTypeConfig(newType).label}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL</label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <Button onClick={handleAdd} disabled={!newUrl.trim()} className="w-full">
                Add Resource
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resources List */}
      <div className="flex-1 overflow-y-auto p-2">
        {resources.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <LinkIcon className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No resources yet</p>
            <p className="text-xs text-muted-foreground/70">Add GitHub, Vercel, Supabase links</p>
          </div>
        ) : (
          <div className="space-y-1">
            {resources.map((resource) => {
              const config = getTypeConfig(resource.type);
              const Icon = config.icon;

              return (
                <div
                  key={resource.id}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{resource.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{resource.url}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 min-h-[44px] w-7 min-w-[44px]"
                      asChild
                    >
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open resource in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 min-h-[44px] w-7 min-w-[44px] text-red-500 hover:text-red-500"
                      onClick={() => handleDelete(resource.id)}
                      aria-label="Delete resource"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
