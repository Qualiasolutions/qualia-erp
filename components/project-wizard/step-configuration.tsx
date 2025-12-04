'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Bot, Globe, Search, Megaphone, Triangle, Square, Train } from 'lucide-react';
import type { ProjectType, DeploymentPlatform } from '@/types/database';
import type { WizardData } from './project-wizard';

interface StepConfigurationProps {
  data: WizardData;
  clients: Array<{ id: string; display_name: string | null }>;
  onProjectTypeChange: (type: ProjectType | null) => void;
  onChange: (updates: Partial<WizardData>) => void;
}

const PROJECT_TYPES: Array<{
  value: ProjectType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    value: 'web_design',
    label: 'Website',
    description: 'Design and build websites',
    icon: <Globe className="h-6 w-6" />,
    color: 'text-blue-500 bg-blue-500/10',
  },
  {
    value: 'ai_agent',
    label: 'AI Agent',
    description: 'Build AI-powered agents',
    icon: <Bot className="h-6 w-6" />,
    color: 'text-purple-500 bg-purple-500/10',
  },
  {
    value: 'seo',
    label: 'SEO',
    description: 'Search optimization',
    icon: <Search className="h-6 w-6" />,
    color: 'text-green-500 bg-green-500/10',
  },
  {
    value: 'ads',
    label: 'Ads',
    description: 'Paid advertising',
    icon: <Megaphone className="h-6 w-6" />,
    color: 'text-orange-500 bg-orange-500/10',
  },
];

const DEPLOYMENT_PLATFORMS: Array<{
  value: DeploymentPlatform;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'vercel',
    label: 'Vercel',
    icon: <Triangle className="h-5 w-5" />,
  },
  {
    value: 'squarespace',
    label: 'Squarespace',
    icon: <Square className="h-5 w-5" />,
  },
  {
    value: 'railway',
    label: 'Railway',
    icon: <Train className="h-5 w-5" />,
  },
];

export function StepConfiguration({
  data,
  clients,
  onProjectTypeChange,
  onChange,
}: StepConfigurationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-lg font-medium">Project Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Choose the project type, deployment platform, and link it to a client.
        </p>
      </div>

      {/* Project Type Selection */}
      <div className="space-y-3">
        <Label>
          Project Type <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {PROJECT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onProjectTypeChange(type.value)}
              className={cn(
                'flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all',
                data.project_type === type.value
                  ? 'border-qualia-600 bg-qualia-600/5'
                  : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
              )}
            >
              <div
                className={cn('flex h-12 w-12 items-center justify-center rounded-lg', type.color)}
              >
                {type.icon}
              </div>
              <div>
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Deployment Platform */}
      <div className="space-y-3">
        <Label>
          Deployment Platform <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-3">
          {DEPLOYMENT_PLATFORMS.map((platform) => (
            <button
              key={platform.value}
              type="button"
              onClick={() => onChange({ deployment_platform: platform.value })}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                data.deployment_platform === platform.value
                  ? 'border-qualia-600 bg-qualia-600/5'
                  : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
              )}
            >
              {platform.icon}
              <span className="font-medium">{platform.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Client Selection */}
      <div className="space-y-2">
        <Label htmlFor="client">
          Client <span className="text-destructive">*</span>
        </Label>
        <Select value={data.client_id} onValueChange={(value) => onChange({ client_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.display_name || 'Unnamed Client'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">The client this project is for</p>
      </div>
    </div>
  );
}
