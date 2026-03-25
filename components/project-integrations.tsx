'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Github,
  Globe,
  Figma,
  FileText,
  ExternalLink,
  Plus,
  X,
  Check,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  getProjectLinks,
  saveProjectLink,
  removeProjectLink,
  type ProjectLink,
  type LinkServiceType,
} from '@/app/actions/project-links';

const SERVICE_CONFIG: Record<
  LinkServiceType,
  { label: string; icon: typeof Github; placeholder: string; color: string }
> = {
  github: {
    label: 'GitHub',
    icon: Github,
    placeholder: 'https://github.com/org/repo',
    color: 'text-foreground',
  },
  vercel: {
    label: 'Vercel',
    icon: Globe,
    placeholder: 'https://vercel.com/team/project',
    color: 'text-foreground',
  },
  figma: {
    label: 'Figma',
    icon: Figma,
    placeholder: 'https://figma.com/file/...',
    color: 'text-purple-500',
  },
  notion: {
    label: 'Notion',
    icon: FileText,
    placeholder: 'https://notion.so/...',
    color: 'text-foreground',
  },
};

interface ProjectIntegrationsProps {
  projectId: string;
  compact?: boolean;
}

export function ProjectIntegrations({ projectId, compact = false }: ProjectIntegrationsProps) {
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<LinkServiceType>('github');
  const [addUrl, setAddUrl] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getProjectLinks(projectId).then(setLinks);
  }, [projectId]);

  const handleSave = () => {
    if (!addUrl.trim()) return;
    startTransition(async () => {
      const result = await saveProjectLink(projectId, addType, addUrl);
      if (result.success) {
        setAddUrl('');
        setIsAdding(false);
        const updated = await getProjectLinks(projectId);
        setLinks(updated);
      }
    });
  };

  const handleRemove = (linkId: string) => {
    startTransition(async () => {
      await removeProjectLink(linkId, projectId);
      const updated = await getProjectLinks(projectId);
      setLinks(updated);
    });
  };

  const availableTypes = (Object.keys(SERVICE_CONFIG) as LinkServiceType[]).filter(
    (type) => !links.some((l) => l.service_type === type)
  );

  if (compact) {
    // Inline display for project headers
    if (links.length === 0) return null;
    return (
      <div className="flex items-center gap-2">
        {links.map((link) => {
          const config = SERVICE_CONFIG[link.service_type as LinkServiceType];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <a
              key={link.id}
              href={link.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                'border border-border hover:bg-muted/50',
                config.color
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {config.label}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Integrations</h4>
        {availableTypes.length > 0 && !isAdding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              setAddType(availableTypes[0]);
              setIsAdding(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Link
          </Button>
        )}
      </div>

      {/* Existing links */}
      {links.map((link) => {
        const config = SERVICE_CONFIG[link.service_type as LinkServiceType];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <div
            key={link.id}
            className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2"
          >
            <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
            <a
              href={link.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-muted-foreground hover:text-foreground"
            >
              {link.external_url}
            </a>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 shrink-0 p-0 text-muted-foreground/50 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              onClick={() => handleRemove(link.id)}
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      {/* Add form */}
      {isAdding && (
        <div className="space-y-2 rounded-lg border border-dashed border-primary/30 p-3">
          <div className="flex gap-2">
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as LinkServiceType)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {SERVICE_CONFIG[type].label}
                </option>
              ))}
            </select>
            <Input
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder={SERVICE_CONFIG[addType].placeholder}
              className="h-8 flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setAddUrl('');
                }
              }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setIsAdding(false);
                setAddUrl('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1"
              onClick={handleSave}
              disabled={isPending || !addUrl.trim()}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {links.length === 0 && !isAdding && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          No integrations linked yet.
        </p>
      )}
    </div>
  );
}
