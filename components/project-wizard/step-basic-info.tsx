'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WizardData } from './project-wizard';

interface StepBasicInfoProps {
  data: WizardData;
  teams: Array<{ id: string; name: string }>;
  onChange: (updates: Partial<WizardData>) => void;
}

export function StepBasicInfo({ data, teams, onChange }: StepBasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-lg font-medium">Basic Information</h3>
        <p className="text-sm text-muted-foreground">
          Enter the project name and assign it to a team.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Project Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Client Website Redesign"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the project scope and goals..."
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team">
            Team <span className="text-destructive">*</span>
          </Label>
          <Select value={data.team_id} onValueChange={(value) => onChange({ team_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">The team responsible for this project</p>
        </div>
      </div>
    </div>
  );
}
