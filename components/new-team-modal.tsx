'use client';

import { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { createTeam, getProfiles } from '@/app/actions';
import { useWorkspace } from '@/components/workspace-provider';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export function NewTeamModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (open) {
      getProfiles().then(setProfiles);
    }
  }, [open]);

  function toggleMember(profileId: string) {
    setSelectedMembers((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    // Add workspace_id to form data
    if (currentWorkspace) {
      formData.set('workspace_id', currentWorkspace.id);
    }

    // Add selected members to form data
    selectedMembers.forEach((id) => {
      formData.append('member_ids', id);
    });

    const result = await createTeam(formData);

    if (result.success) {
      setOpen(false);
      setSelectedMembers([]);
    } else {
      setError(result.error || 'Failed to create team');
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-primary hover:bg-primary">
          <Plus className="h-4 w-4" />
          <span>New Team</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Engineering"
              required
              className="border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">Team Key *</Label>
            <Input
              id="key"
              name="key"
              placeholder="ENG"
              required
              maxLength={5}
              className="border-border bg-background uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Short identifier (2-5 characters). Will be uppercased.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the team..."
              className="min-h-[80px] border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </Label>
            <div className="max-h-[160px] overflow-y-auto rounded-md border border-border bg-background">
              {profiles.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No members available</p>
              ) : (
                <div className="divide-y divide-border">
                  {profiles.map((profile) => (
                    <label
                      key={profile.id}
                      className="flex cursor-pointer items-center gap-3 p-3 hover:bg-card"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(profile.id)}
                        onCheckedChange={() => toggleMember(profile.id)}
                        className="border-border data-[state=checked]:border-qualia-600 data-[state=checked]:bg-primary"
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {profile.full_name?.charAt(0) || profile.email?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">
                            {profile.full_name || 'Unnamed'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary">
              {loading ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
