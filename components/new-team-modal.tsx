"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { createTeam } from "@/app/actions";

export function NewTeamModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        const result = await createTeam(formData);

        if (result.success) {
            setOpen(false);
        } else {
            setError(result.error || "Failed to create team");
        }

        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500">
                    <Plus className="w-4 h-4" />
                    <span>New Team</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1C1C1C] border-[#2C2C2C] text-white">
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
                            className="bg-[#141414] border-[#2C2C2C]"
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
                            className="bg-[#141414] border-[#2C2C2C] uppercase"
                        />
                        <p className="text-xs text-gray-500">
                            Short identifier (2-5 characters). Will be uppercased.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Describe the team..."
                            className="bg-[#141414] border-[#2C2C2C] min-h-[80px]"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-500"
                        >
                            {loading ? "Creating..." : "Create Team"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
