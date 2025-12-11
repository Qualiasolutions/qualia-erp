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
import {
  Bot,
  Globe,
  Search,
  Megaphone,
  Triangle,
  Square,
  Train,
  Settings2,
  Building,
  Check,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
  CircleDot,
  Ban,
} from 'lucide-react';
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
  gradient: string;
}> = [
  {
    value: 'web_design',
    label: 'Website',
    description: 'Design and build websites',
    icon: <Globe className="h-6 w-6" />,
    color: 'text-blue-500',
    gradient: 'from-blue-500/20 to-blue-600/5',
  },
  {
    value: 'ai_agent',
    label: 'AI Agent',
    description: 'Chatbots & automation',
    icon: <Bot className="h-6 w-6" />,
    color: 'text-purple-500',
    gradient: 'from-purple-500/20 to-purple-600/5',
  },
  {
    value: 'voice_agent',
    label: 'Voice Agent',
    description: 'Phone bots & voice AI',
    icon: <Phone className="h-6 w-6" />,
    color: 'text-pink-500',
    gradient: 'from-pink-500/20 to-pink-600/5',
  },
  {
    value: 'seo',
    label: 'SEO',
    description: 'Search optimization',
    icon: <Search className="h-6 w-6" />,
    color: 'text-green-500',
    gradient: 'from-green-500/20 to-green-600/5',
  },
  {
    value: 'ads',
    label: 'Ads',
    description: 'Paid advertising',
    icon: <Megaphone className="h-6 w-6" />,
    color: 'text-orange-500',
    gradient: 'from-orange-500/20 to-orange-600/5',
  },
];

interface PlatformOption {
  value: DeploymentPlatform;
  label: string;
  icon: React.ReactNode;
}

// Development/hosting platforms (for websites, AI agents, voice agents)
const DEV_PLATFORMS: PlatformOption[] = [
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

// Ad/social platforms (for SEO and Ads projects)
const AD_PLATFORMS: PlatformOption[] = [
  {
    value: 'meta',
    label: 'Meta',
    icon: <Facebook className="h-5 w-5" />,
  },
  {
    value: 'instagram',
    label: 'Instagram',
    icon: <Instagram className="h-5 w-5" />,
  },
  {
    value: 'google_ads',
    label: 'Google Ads',
    icon: <CircleDot className="h-5 w-5" />,
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    icon: <CircleDot className="h-5 w-5" />,
  },
  {
    value: 'linkedin',
    label: 'LinkedIn',
    icon: <Linkedin className="h-5 w-5" />,
  },
  {
    value: 'none',
    label: 'N/A',
    icon: <Ban className="h-5 w-5" />,
  },
];

// Helper to get platforms based on project type
function getPlatformsForType(projectType: ProjectType | null): PlatformOption[] {
  if (projectType === 'seo' || projectType === 'ads') {
    return AD_PLATFORMS;
  }
  return DEV_PLATFORMS;
}

export function StepConfiguration({
  data,
  clients,
  onProjectTypeChange,
  onChange,
}: StepConfigurationProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <Settings2 className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Project Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Choose the project type, platform, and client
            </p>
          </div>
        </div>
      </div>

      {/* Project Type Selection */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">
          Project Type <span className="text-qualia-500">*</span>
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {PROJECT_TYPES.map((type) => {
            const isSelected = data.project_type === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onProjectTypeChange(type.value)}
                className={cn(
                  'group relative flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200',
                  isSelected
                    ? 'border-qualia-500 bg-gradient-to-br shadow-lg shadow-qualia-500/10'
                    : 'border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40',
                  isSelected && type.gradient
                )}
              >
                {/* Check indicator */}
                {isSelected && (
                  <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-qualia-500 shadow-lg">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </div>
                )}

                <div
                  className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all',
                    isSelected ? 'bg-white/80 shadow-md' : 'bg-muted/50',
                    type.color
                  )}
                >
                  {type.icon}
                </div>
                <div>
                  <p className={cn('font-semibold', isSelected && 'text-foreground')}>
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deployment Platform */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">
          {data.project_type === 'seo' || data.project_type === 'ads'
            ? 'Platform'
            : 'Deployment Platform'}{' '}
          <span className="text-qualia-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {getPlatformsForType(data.project_type).map((platform) => {
            const isSelected = data.deployment_platform === platform.value;
            return (
              <button
                key={platform.value}
                type="button"
                onClick={() => onChange({ deployment_platform: platform.value })}
                className={cn(
                  'group relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3 transition-all duration-200 sm:px-4 sm:py-4',
                  isSelected
                    ? 'border-qualia-500 bg-qualia-500/5 shadow-lg shadow-qualia-500/10'
                    : 'border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40'
                )}
              >
                {isSelected && (
                  <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-qualia-500 shadow">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                )}
                <div className={cn('transition-colors', isSelected && 'text-qualia-500')}>
                  {platform.icon}
                </div>
                <span className={cn('text-sm font-medium', isSelected && 'text-foreground')}>
                  {platform.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Client Selection */}
      <div className="space-y-3">
        <Label htmlFor="client" className="text-sm font-medium">
          Client <span className="text-qualia-500">*</span>
        </Label>
        <Select value={data.client_id} onValueChange={(value) => onChange({ client_id: value })}>
          <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/30 px-4 text-base transition-all focus:border-qualia-500 focus:ring-2 focus:ring-qualia-500/20">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {clients.map((client) => (
              <SelectItem
                key={client.id}
                value={client.id}
                className="rounded-lg py-3 focus:bg-qualia-500/10"
              >
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {client.display_name || 'Unnamed Client'}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The client this project is being created for
        </p>
      </div>
    </div>
  );
}
