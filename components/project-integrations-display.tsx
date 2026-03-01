'use client';

import { useState, useEffect, useTransition } from 'react';
import { ExternalLink, Github, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  getProjectIntegrations,
  upsertIntegration,
  deleteIntegration,
} from '@/app/actions/project-integrations';
import type { ProjectIntegration } from '@/types/database';

interface ProjectIntegrationsDisplayProps {
  projectId: string;
  userRole?: 'admin' | 'employee';
}

export function ProjectIntegrationsDisplay({
  projectId,
  userRole = 'employee',
}: ProjectIntegrationsDisplayProps) {
  const [isPending, startTransition] = useTransition();
  const [integrations, setIntegrations] = useState<ProjectIntegration[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [vercelUrl, setVercelUrl] = useState('');
  const [loading, setLoading] = useState(true);

  // Load integrations on mount
  useEffect(() => {
    loadIntegrations();
  }, [projectId]);

  async function loadIntegrations() {
    setLoading(true);
    const data = await getProjectIntegrations(projectId);
    setIntegrations(data);

    // Populate form fields
    const github = data.find((i) => i.service_type === 'github');
    const vercel = data.find((i) => i.service_type === 'vercel');
    setGithubUrl(github?.external_url || '');
    setVercelUrl(vercel?.external_url || '');
    setLoading(false);
  }

  async function handleSave() {
    startTransition(async () => {
      const promises = [];

      // Save GitHub URL if provided
      if (githubUrl.trim()) {
        promises.push(upsertIntegration(projectId, 'github', githubUrl.trim()));
      } else {
        // Delete if URL is empty
        const github = integrations.find((i) => i.service_type === 'github');
        if (github) {
          promises.push(deleteIntegration(github.id, projectId));
        }
      }

      // Save Vercel URL if provided
      if (vercelUrl.trim()) {
        promises.push(upsertIntegration(projectId, 'vercel', vercelUrl.trim()));
      } else {
        // Delete if URL is empty
        const vercel = integrations.find((i) => i.service_type === 'vercel');
        if (vercel) {
          promises.push(deleteIntegration(vercel.id, projectId));
        }
      }

      const results = await Promise.all(promises);
      const hasError = results.some((r) => !r.success);

      if (hasError) {
        toast.error('Failed to save some integrations');
      } else {
        toast.success('Integrations updated');
        setEditModalOpen(false);
        await loadIntegrations();
      }
    });
  }

  async function handleRemove(serviceType: 'github' | 'vercel') {
    const integration = integrations.find((i) => i.service_type === serviceType);
    if (!integration) return;

    startTransition(async () => {
      const result = await deleteIntegration(integration.id, projectId);
      if (result.success) {
        toast.success(`${serviceType === 'github' ? 'GitHub' : 'Vercel'} integration removed`);
        if (serviceType === 'github') {
          setGithubUrl('');
        } else {
          setVercelUrl('');
        }
        await loadIntegrations();
      } else {
        toast.error(result.error || 'Failed to remove integration');
      }
    });
  }

  const githubIntegration = integrations.find((i) => i.service_type === 'github');
  const vercelIntegration = integrations.find((i) => i.service_type === 'vercel');

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* GitHub Badge */}
      {githubIntegration ? (
        <a
          href={githubIntegration.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-70"
        >
          <Badge
            variant="outline"
            className="gap-1.5 bg-neutral-500/10 text-neutral-800 dark:text-neutral-200"
          >
            <Github className="h-4 w-4" />
            GitHub
            <ExternalLink className="h-3 w-3" />
          </Badge>
        </a>
      ) : (
        <Badge
          variant="outline"
          className="gap-1.5 bg-neutral-500/10 text-neutral-500 dark:text-neutral-400"
        >
          <Github className="h-4 w-4" />
          Not connected
        </Badge>
      )}

      {/* Vercel Badge */}
      {vercelIntegration ? (
        <a
          href={vercelIntegration.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-70"
        >
          <Badge
            variant="outline"
            className="gap-1.5 bg-slate-500/10 text-slate-800 dark:text-slate-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
            Vercel
            <ExternalLink className="h-3 w-3" />
          </Badge>
        </a>
      ) : (
        <Badge
          variant="outline"
          className="gap-1.5 bg-slate-500/10 text-slate-500 dark:text-slate-400"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
          Not connected
        </Badge>
      )}

      {/* Edit Button (Admin only) */}
      {userRole === 'admin' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditModalOpen(true)}
          className="h-6 gap-1 px-2 text-xs"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      )}

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Integrations</DialogTitle>
            <DialogDescription>
              Add or update GitHub repository and Vercel deployment URLs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* GitHub URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="github-url">GitHub Repository</Label>
                {githubUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove('github')}
                    disabled={isPending}
                    className="h-6 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                )}
              </div>
              <Input
                id="github-url"
                type="url"
                placeholder="https://github.com/username/repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Vercel URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="vercel-url">Vercel Deployment</Label>
                {vercelUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove('vercel')}
                    disabled={isPending}
                    className="h-6 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                )}
              </div>
              <Input
                id="vercel-url"
                type="url"
                placeholder="https://project.vercel.app"
                value={vercelUrl}
                onChange={(e) => setVercelUrl(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
