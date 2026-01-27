'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProjectNotes } from '@/components/project-notes';
import { ProjectResources } from '@/components/project-resources';
import { EntityAvatar } from '@/components/entity-avatar';
import {
  Beaker,
  MessageSquare,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Loader2,
  Rocket,
  Bot,
  Phone,
  Globe,
  TrendingUp,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { getProjectById, updateProject, deleteProject, updateProjectStatus } from '@/app/actions';
import { invalidateProjectStats } from '@/lib/swr';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import type { ProjectData } from '@/app/projects/page';
import type { ProjectType } from '@/types/database';
import { cn } from '@/lib/utils';

interface DemoSheetProps {
  demo: ProjectData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoSheet({ demo, open, onOpenChange }: DemoSheetProps) {
  const router = useRouter();
  const [resources, setResources] = useState<
    { id: string; type: string; label: string; url: string }[]
  >([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Start Building state
  const [startBuildingOpen, setStartBuildingOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Fetch full project data to get workspace_id and resources
  useEffect(() => {
    if (demo?.id && open) {
      getProjectById(demo.id).then((project) => {
        if (project) {
          setWorkspaceId(project.workspace_id);
          setResources((project.metadata?.resources as typeof resources) || []);
        }
      });
    }
  }, [demo?.id, open]);

  // Initialize edit form when opening - fetch full project to get description
  useEffect(() => {
    if (demo && editOpen) {
      setEditName(demo.name);
      getProjectById(demo.id).then((project) => {
        if (project) {
          setEditDescription(project.description || '');
        }
      });
    }
  }, [demo, editOpen]);

  const handleEdit = async () => {
    if (!demo) return;
    setIsEditing(true);

    const formData = new FormData();
    formData.append('id', demo.id);
    formData.append('name', editName);
    formData.append('description', editDescription);

    const result = await updateProject(formData);

    if (result.success) {
      toast({ title: 'Demo updated' });
      invalidateProjectStats(true);
      setEditOpen(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }

    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!demo) return;
    setIsDeleting(true);

    const result = await deleteProject(demo.id);

    if (result.success) {
      toast({ title: 'Demo deleted' });
      invalidateProjectStats(true);
      setDeleteOpen(false);
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }

    setIsDeleting(false);
  };

  const handleStartBuilding = async () => {
    if (!demo || !selectedType) return;
    setIsConverting(true);

    // First update the project type
    const formData = new FormData();
    formData.append('id', demo.id);
    formData.append('project_type', selectedType);

    const typeResult = await updateProject(formData);

    if (!typeResult.success) {
      toast({ title: 'Error', description: typeResult.error, variant: 'destructive' });
      setIsConverting(false);
      return;
    }

    // Then update the status
    const result = await updateProjectStatus(demo.id, 'Active');

    if (result.success) {
      toast({
        title: 'Project activated!',
        description: `"${demo.name}" is now in Currently Building.`,
      });
      invalidateProjectStats(true);
      setStartBuildingOpen(false);
      setSelectedType(null);
      onOpenChange(false);
      // Navigate to the project page
      router.push(`/projects/${demo.id}`);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }

    setIsConverting(false);
  };

  if (!demo) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EntityAvatar
                src={demo.logo_url}
                fallbackIcon={<Beaker className="h-4 w-4" />}
                fallbackBgColor="bg-amber-500/10"
                fallbackIconColor="text-amber-500"
                size="lg"
              />
              <div>
                <SheetTitle className="text-left">{demo.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">Demo</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStartBuildingOpen(true)}
                className="h-8 gap-1.5 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
              >
                <Rocket className="h-4 w-4" />
                <span className="hidden sm:inline">Start Building</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditOpen(true)}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteOpen(true)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="notes" className="flex flex-1 flex-col overflow-hidden pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4 flex-1 overflow-hidden">
            {workspaceId ? (
              <ProjectNotes projectId={demo.id} workspaceId={workspaceId} className="h-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading...
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-4 flex-1 overflow-hidden">
            <ProjectResources projectId={demo.id} initialResources={resources} className="h-full" />
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Demo</DialogTitle>
            <DialogDescription>Update the demo details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Demo name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Demo description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing || !editName.trim()}>
              {isEditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Demo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{demo.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Building Confirmation Dialog */}
      <Dialog open={startBuildingOpen} onOpenChange={setStartBuildingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-emerald-500" />
              Start Building
            </DialogTitle>
            <DialogDescription>
              Convert &quot;{demo.name}&quot; from a demo to an active project. Choose the project type:
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {[
              { type: 'web_design' as const, label: 'Website', icon: Globe, color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
              { type: 'ai_agent' as const, label: 'AI Agent', icon: Bot, color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
              { type: 'voice_agent' as const, label: 'Voice Agent', icon: Phone, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
              { type: 'ai_platform' as const, label: 'AI Platform', icon: Sparkles, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
              { type: 'seo' as const, label: 'SEO', icon: TrendingUp, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
              { type: 'ads' as const, label: 'Ads', icon: Megaphone, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
            ].map(({ type, label, icon: Icon, color, bgColor }) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={cn(
                  'group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                  selectedType === type
                    ? `border-transparent ${bgColor} shadow-lg`
                    : 'border-border/30 bg-muted/20 hover:border-border/50 hover:bg-muted/40'
                )}
              >
                <div className={cn('rounded-lg p-2', bgColor)}>
                  <Icon className={cn('h-5 w-5', color)} />
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  selectedType === type ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {label}
                </span>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setStartBuildingOpen(false);
              setSelectedType(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleStartBuilding}
              disabled={isConverting || !selectedType}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start Building
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
