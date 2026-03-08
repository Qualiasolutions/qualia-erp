'use client';

import { useState } from 'react';
import { useServerAction } from '@/lib/hooks/use-server-action';
import { savePortalSettings } from '@/app/actions/portal-import';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { InfoIcon } from 'lucide-react';

type PortalSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProjects: Array<{ id: string; name: string }>;
  onSuccess: () => void;
};

export function PortalSettingsModal({
  open,
  onOpenChange,
  selectedProjects,
  onSuccess,
}: PortalSettingsModalProps) {
  // Form state
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [showRoadmap, setShowRoadmap] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [showComments, setShowComments] = useState(true);

  // Server action
  const { execute, isPending } = useServerAction(savePortalSettings, {
    onSuccess: (result) => {
      const count = result.data?.savedCount || selectedProjects.length;
      toast.success(`Portal settings saved for ${count} project${count !== 1 ? 's' : ''}`);

      // Reset form
      setWelcomeMessage('');
      setShowRoadmap(true);
      setShowFiles(true);
      setShowComments(true);

      // Notify parent and close modal
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error || 'Failed to save portal settings');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProjects.length === 0) {
      toast.error('No projects selected');
      return;
    }

    const data = {
      projectIds: selectedProjects.map((p) => p.id),
      welcomeMessage: welcomeMessage.trim() || null,
      visibilitySettings: {
        showRoadmap,
        showFiles,
        showComments,
      },
    };

    await execute(data);
  };

  // Reset form when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setWelcomeMessage('');
      setShowRoadmap(true);
      setShowFiles(true);
      setShowComments(true);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Portal Settings</DialogTitle>
          <DialogDescription>
            Set up portal access configuration for the selected projects. These settings will be
            applied when you send client invitations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected projects */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Selected Projects ({selectedProjects.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {selectedProjects.map((project) => (
                <Badge key={project.id} variant="secondary" className="text-xs">
                  {project.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Info banner */}
          <Alert className="border-blue-200 bg-blue-50">
            <InfoIcon className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Settings will be applied when you send client invitations in Phase 18. Clients will
              see these configurations when they access their portal.
            </AlertDescription>
          </Alert>

          {/* Welcome message */}
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage" className="text-sm font-medium">
              Welcome Message <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="welcomeMessage"
              placeholder="Add a welcome message for clients when they view this project..."
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={isPending}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{welcomeMessage.length}/500 characters</p>
          </div>

          {/* Visibility settings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Visibility Settings</Label>

            {/* Roadmap visibility */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="showRoadmap" className="cursor-pointer font-medium">
                  Show project roadmap
                </Label>
                <p className="text-sm text-muted-foreground">
                  Display project phases and milestones timeline
                </p>
              </div>
              <Switch
                id="showRoadmap"
                checked={showRoadmap}
                onCheckedChange={setShowRoadmap}
                disabled={isPending}
              />
            </div>

            {/* Files visibility */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="showFiles" className="cursor-pointer font-medium">
                  Show shared files
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow clients to view and download project files
                </p>
              </div>
              <Switch
                id="showFiles"
                checked={showFiles}
                onCheckedChange={setShowFiles}
                disabled={isPending}
              />
            </div>

            {/* Comments visibility */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="showComments" className="cursor-pointer font-medium">
                  Allow client comments
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable clients to leave comments and feedback
                </p>
              </div>
              <Switch
                id="showComments"
                checked={showComments}
                onCheckedChange={setShowComments}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#00A4AC] hover:bg-[#00A4AC]/90"
            >
              {isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
