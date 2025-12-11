'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Folder } from 'lucide-react';
import type { WizardData } from './project-wizard';

interface StepBasicInfoProps {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

export function StepBasicInfo({ data, onChange }: StepBasicInfoProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-qualia-500/10">
            <Folder className="h-5 w-5 text-qualia-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Basic Information</h3>
            <p className="text-sm text-muted-foreground">
              Give your project a name and description
            </p>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-6">
        {/* Project Name */}
        <div className="space-y-3">
          <Label htmlFor="name" className="text-sm font-medium">
            Project Name <span className="text-qualia-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Client Website Redesign"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-12 rounded-xl border-border/50 bg-muted/30 px-4 text-base transition-all focus:border-qualia-500 focus:bg-background focus:ring-2 focus:ring-qualia-500/20"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="space-y-3">
          <Label htmlFor="description" className="text-sm font-medium">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Brief description of the project scope and goals..."
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={4}
            className="rounded-xl border-border/50 bg-muted/30 px-4 py-3 text-base transition-all focus:border-qualia-500 focus:bg-background focus:ring-2 focus:ring-qualia-500/20"
          />
        </div>
      </div>
    </div>
  );
}
