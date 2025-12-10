'use client';

import {
  Bot,
  Globe,
  Search,
  Megaphone,
  Triangle,
  Square,
  Train,
  Building,
  Users,
  FileText,
  Phone,
} from 'lucide-react';
import type { WizardData } from './project-wizard';

interface StepReviewProps {
  data: WizardData;
  teams: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; display_name: string | null }>;
}

const PROJECT_TYPE_CONFIG = {
  web_design: { label: 'Website', icon: Globe, color: 'text-blue-500 bg-blue-500/10' },
  ai_agent: { label: 'AI Agent', icon: Bot, color: 'text-purple-500 bg-purple-500/10' },
  voice_agent: { label: 'Voice Agent', icon: Phone, color: 'text-pink-500 bg-pink-500/10' },
  seo: { label: 'SEO', icon: Search, color: 'text-green-500 bg-green-500/10' },
  ads: { label: 'Ads', icon: Megaphone, color: 'text-orange-500 bg-orange-500/10' },
};

const PLATFORM_CONFIG = {
  vercel: { label: 'Vercel', icon: Triangle },
  squarespace: { label: 'Squarespace', icon: Square },
  railway: { label: 'Railway', icon: Train },
};

export function StepReview({ data, teams, clients }: StepReviewProps) {
  const team = teams.find((t) => t.id === data.team_id);
  const client = clients.find((c) => c.id === data.client_id);
  const typeConfig = data.project_type ? PROJECT_TYPE_CONFIG[data.project_type] : null;
  const platformConfig = data.deployment_platform
    ? PLATFORM_CONFIG[data.deployment_platform]
    : null;

  const totalItems = data.phases.reduce((sum, phase) => sum + phase.items.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-lg font-medium">Review & Create</h3>
        <p className="text-sm text-muted-foreground">
          Review your project details before creating.
        </p>
      </div>

      {/* Project Summary Card */}
      <div className="space-y-6 rounded-lg border p-6">
        {/* Header with name and type */}
        <div className="flex items-start gap-4">
          {typeConfig && (
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-lg ${typeConfig.color}`}
            >
              <typeConfig.icon className="h-7 w-7" />
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-xl font-semibold">{data.name || 'Untitled Project'}</h4>
            {data.description && (
              <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Project Type */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Project Type</p>
              <p className="font-medium">{typeConfig?.label || 'Not selected'}</p>
            </div>
          </div>

          {/* Platform */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
            {platformConfig && <platformConfig.icon className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="text-xs text-muted-foreground">Platform</p>
              <p className="font-medium">{platformConfig?.label || 'Not selected'}</p>
            </div>
          </div>

          {/* Client */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="font-medium">{client?.display_name || 'Not selected'}</p>
            </div>
          </div>

          {/* Team */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Team</p>
              <p className="font-medium">{team?.name || 'Not selected'}</p>
            </div>
          </div>
        </div>

        {/* Roadmap Summary */}
        <div className="border-t pt-4">
          <h5 className="mb-3 font-medium">Roadmap Summary</h5>
          <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span>{data.phases.length} phases</span>
            <span>|</span>
            <span>{totalItems} total items</span>
          </div>

          <div className="space-y-2">
            {data.phases.map((phase, index) => (
              <div key={phase.templateKey} className="flex items-center gap-3 text-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-qualia-500/10 text-xs font-medium text-qualia-400">
                  {index + 1}
                </div>
                <span className="flex-1">{phase.name}</span>
                <span className="text-muted-foreground">{phase.items.length} items</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final confirmation message */}
      <div className="rounded-lg border border-qualia-600/20 bg-qualia-600/5 p-4">
        <p className="text-center text-sm">
          Click <strong>Create Project</strong> to create the project and initialize the roadmap.
        </p>
      </div>
    </div>
  );
}
