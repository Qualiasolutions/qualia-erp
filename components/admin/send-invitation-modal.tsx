'use client';

import { useState } from 'react';
import { createInvitation } from '@/app/actions/client-invitations';
import { sendClientInvitation } from '@/lib/email';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { InfoIcon, CheckCircle2 } from 'lucide-react';

type ProjectForImport = {
  id: string;
  name: string;
  portal_settings?: {
    welcomeMessage?: string;
    visibility?: {
      showRoadmap?: boolean;
      showFiles?: boolean;
      showComments?: boolean;
    };
  } | null;
};

type SendInvitationModalProps = {
  project: ProjectForImport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function SendInvitationModal({
  project,
  open,
  onOpenChange,
  onSuccess,
}: SendInvitationModalProps) {
  // Form state
  const [email, setEmail] = useState<string>('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!project) {
      toast.error('No project selected');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsPending(true);
    try {
      const result = await createInvitation({
        projectId: project.id,
        email: email.trim().toLowerCase(),
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to send invitation');
        return;
      }

      const data = result.data as { token?: string; email?: string } | undefined;

      if (data?.token && data?.email) {
        await sendClientInvitation({
          projectId: project.id,
          projectName: project.name,
          email: data.email,
          invitationToken: data.token,
          welcomeMessage: project.portal_settings?.welcomeMessage,
        });

        toast.success(`Invitation sent to ${data.email}`);
        setEmail('');
        onSuccess();
        onOpenChange(false);
      }
    } catch {
      toast.error('Failed to send invitation');
    } finally {
      setIsPending(false);
    }
  };

  // Reset form when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEmail('');
    }
    onOpenChange(open);
  };

  if (!project) return null;

  // Extract visibility settings
  const visibility = project.portal_settings?.visibility;
  const visibilityFeatures = [];
  if (visibility?.showRoadmap !== false) visibilityFeatures.push('Roadmap');
  if (visibility?.showFiles !== false) visibilityFeatures.push('Files');
  if (visibility?.showComments !== false) visibilityFeatures.push('Comments');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Client Invitation</DialogTitle>
          <DialogDescription>
            Send a secure invitation email with a one-time signup link to the client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Project</Label>
            <div>
              <Badge variant="secondary" className="text-sm">
                {project.name}
              </Badge>
            </div>
          </div>

          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Client Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              required
              className="max-w-md"
            />
          </div>

          {/* Info banner */}
          <Alert className="border-blue-200 bg-blue-50">
            <InfoIcon className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              The client will receive an email with a secure link to create their account and access{' '}
              <strong>{project.name}</strong>.
            </AlertDescription>
          </Alert>

          {/* Welcome message preview */}
          {project.portal_settings?.welcomeMessage && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Welcome Message (from portal settings)</Label>
              <div className="rounded-lg border border-[#00A4AC]/20 bg-[#00A4AC]/5 p-4">
                <p className="text-sm italic text-[#00A4AC]">
                  {project.portal_settings.welcomeMessage}
                </p>
              </div>
            </div>
          )}

          {/* Visibility settings preview */}
          {visibilityFeatures.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">This project is configured to show:</Label>
              <div className="flex flex-wrap gap-2">
                {visibilityFeatures.map((feature) => (
                  <Badge
                    key={feature}
                    variant="outline"
                    className="gap-1.5 border-green-200 bg-green-50 text-green-700"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

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
              disabled={isPending || !email.trim()}
              className="bg-[#00A4AC] hover:bg-[#00A4AC]/90"
            >
              {isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
