'use client';

import { ClientProjectBriefForm } from '@/components/portal/client-project-brief-form';
import { AICyprusExpoBrief } from './aicyprus-expo-brief';
import { HostyoBrief } from './hostyo-brief';
import { KartaticBrief } from './kartatic-brief';
import { NetworkingBrief } from './networking-brief';

interface ProjectBriefFormProps {
  projectId: string;
  projectName: string;
  className?: string;
}

function resolveBriefVariant(
  name: string
): 'networking' | 'expo' | 'kartatic' | 'hostyo' | 'generic' {
  const n = name.toLowerCase();
  if (n.includes('kartatek') || n.includes('kartatic') || n.includes('kartatik')) return 'kartatic';
  if (n.includes('cyprus expo') || n.includes('aicyprus') || n.includes('ai cyprus')) return 'expo';
  if (n.includes('hivora') || n.includes('networking')) return 'networking';
  if (n.includes('hostyo')) return 'hostyo';
  return 'generic';
}

export function ProjectBriefForm({ projectId, projectName, className }: ProjectBriefFormProps) {
  const variant = resolveBriefVariant(projectName);

  switch (variant) {
    case 'networking':
      return (
        <NetworkingBrief projectId={projectId} projectName={projectName} className={className} />
      );
    case 'expo':
      return (
        <AICyprusExpoBrief projectId={projectId} projectName={projectName} className={className} />
      );
    case 'kartatic':
      return (
        <KartaticBrief projectId={projectId} projectName={projectName} className={className} />
      );
    case 'hostyo':
      return <HostyoBrief projectId={projectId} projectName={projectName} className={className} />;
    default:
      return (
        <ClientProjectBriefForm
          projectId={projectId}
          projectName={projectName}
          className={className}
        />
      );
  }
}
