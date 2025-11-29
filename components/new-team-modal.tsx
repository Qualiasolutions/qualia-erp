"use client";

import { useState, useEffect } from "react";
import { Plus, Users } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createTeam, getProfiles } from "@/app/actions";
import { useWorkspace } from "@/components/workspace-provider";

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
            prev.includes(profileId)
                ? prev.filter((id) => id !== profileId)
                : [...prev, profileId]
        );
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        // Add workspace_id to form data
        if (currentWorkspace) {
            formData.set("workspace_id", currentWorkspace.id);
        }

        // Add selected members to form data
        selectedMembers.forEach((id) => {
            formData.append("member_ids", id);
        });

        const result = await createTeam(formData);

        if (result.success) {
            setOpen(false);
            setSelectedMembers([]);
        } else {
            setError(result.error || "Failed to create team");
        }

        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-qualia-600 hover:bg-qualia-500">
                    <Plus className="w-4 h-4" />
                    <span>New Team</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground max-w-md">
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
                            className="bg-background border-border"
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
                            className="bg-background border-border uppercase"
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
                            className="bg-background border-border min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Team Members
                        </Label>
                        <div className="bg-background border border-border rounded-md max-h-[160px] overflow-y-auto">
                            {profiles.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-3">No members available</p>
                            ) : (
                                <div className="divide-y divide-border">
                                    {profiles.map((profile) => (
                                        <label
                                            key={profile.id}
                                            className="flex items-center gap-3 p-3 hover:bg-card cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={selectedMembers.includes(profile.id)}
                                                onCheckedChange={() => toggleMember(profile.id)}
                                                className="border-border data-[state=checked]:bg-qualia-600 data-[state=checked]:border-qualia-600"
                                            />
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="w-7 h-7 rounded-full bg-qualia-600 flex items-center justify-center text-xs text-white shrink-0">
                                                    {profile.full_name?.charAt(0) || profile.email?.charAt(0) || "?"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-foreground truncate">
                                                        {profile.full_name || "Unnamed"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {profile.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedMembers.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-qualia-600 hover:bg-qualia-500"
                        >
                            {loading ? "Creating..." : "Create Team"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
