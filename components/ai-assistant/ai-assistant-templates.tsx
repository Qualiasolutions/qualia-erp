'use client';

import { Globe, Bot, Megaphone, Shield, FileText, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistant } from './ai-assistant-provider';

// Document templates configuration
const templates = [
  {
    id: 'web-dev',
    icon: Globe,
    title: 'Web Development',
    description: 'Websites and web apps',
    file: '/tempaltes/TEMPLATE_Web_Development_Agreement.pdf',
  },
  {
    id: 'ai-agent',
    icon: Bot,
    title: 'AI Agent',
    description: 'Voice agents and chatbots',
    file: '/tempaltes/TEMPLATE_AI_Agent_Agreement.pdf',
  },
  {
    id: 'marketing',
    icon: Megaphone,
    title: 'Marketing',
    description: 'Social media and digital',
    file: '/tempaltes/TEMPLATE_Marketing_Agreement.pdf',
  },
  {
    id: 'nda',
    icon: Shield,
    title: 'NDA',
    description: 'Confidentiality',
    file: '/tempaltes/TEMPLATE_NDA_Agreement.pdf',
  },
];

function TemplateCard({ template }: { template: (typeof templates)[0] }) {
  const Icon = template.icon;

  return (
    <div className="group flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-2.5 transition-all hover:border-border hover:bg-card">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 ring-1 ring-border/50">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h4 className="text-xs font-medium text-foreground">{template.title}</h4>
          <p className="text-[11px] text-muted-foreground">{template.description}</p>
        </div>
      </div>
      <a
        href={template.file}
        download
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md',
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          'transition-colors'
        )}
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

export function AIAssistantTemplates() {
  const { toggleTemplates } = useAIAssistant();

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Templates</span>
        </div>
        <button
          onClick={toggleTemplates}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>

        {/* Brand Guidelines - Special Card */}
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-foreground">Brand Guidelines</h4>
                <p className="text-[11px] text-muted-foreground">Colors, logos, standards</p>
              </div>
            </div>
            <a
              href="/tempaltes/Qualia_Solutions_Brand_Guidelines.pdf"
              download
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3 w-3" />
              PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
