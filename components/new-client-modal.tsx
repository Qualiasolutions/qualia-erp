"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClientRecord, type LeadStatus } from "@/app/actions";
import { useWorkspace } from "@/components/workspace-provider";

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const leadStatusOptions: { value: LeadStatus; label: string }[] = [
  { value: "cold", label: "Cold Lead" },
  { value: "hot", label: "Hot Lead" },
  { value: "active_client", label: "Active Client" },
  { value: "inactive_client", label: "Inactive Client" },
  { value: "dropped", label: "Dropped Lead" },
];

export function NewClientModal({ open, onOpenChange, onSuccess }: NewClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspace();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (currentWorkspace) {
      formData.set("workspace_id", currentWorkspace.id);
    }

    const result = await createClientRecord(formData);

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      (e.target as HTMLFormElement).reset();
    } else {
      setError(result.error || "Failed to create client");
    }

    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="display_name">Client Name *</Label>
            <Input
              id="display_name"
              name="display_name"
              placeholder="Enter client or company name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                placeholder="www.example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_address">Address</Label>
            <Input
              id="billing_address"
              name="billing_address"
              placeholder="Full address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead_status">Status</Label>
            <Select name="lead_status" defaultValue="cold">
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {leadStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes about this client..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-qualia-600 hover:bg-qualia-700"
            >
              {isSubmitting ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
