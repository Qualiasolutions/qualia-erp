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
  FileText,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
  CircleDot,
  Ban,
} from 'lucide-react';
import type { WizardData } from './project-wizard';

interface StepReviewProps {
  data: WizardData;
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
  meta: { label: 'Meta', icon: Facebook },
  instagram: { label: 'Instagram', icon: Instagram },
  google_ads: { label: 'Google Ads', icon: CircleDot },
  tiktok: { label: 'TikTok', icon: CircleDot },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  none: { label: 'N/A', icon: Ban },
};

export function StepReview({ data, clients }: StepReviewProps) {
  const client = clients.find((c) => c.id === data.client_id);
  const typeConfig = data.project_type ? PROJECT_TYPE_CONFIG[data.project_type] : null;
  const platformConfig = data.deployment_platform
    ? PLATFORM_CONFIG[data.deployment_platform]
    : null;

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
        <div className="grid grid-cols-3 gap-4">
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
              <p className="font-medium">
                {data.custom_client_name || client?.display_name || 'Not selected'}
                {data.custom_client_name && (
                  <span className="ml-1.5 text-xs text-amber-500">(new)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final confirmation message */}
      <div className="rounded-lg border border-qualia-600/20 bg-qualia-600/5 p-4">
        <p className="text-center text-sm">
          Click <strong>Create Project</strong> to create the project.
        </p>
      </div>
    </div>
  );
}
