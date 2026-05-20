'use client';

import { ProjectBriefShell } from './project-brief-shell';
import type { BriefModulesStep } from './brief-types';

const MODULES: BriefModulesStep = {
  title: 'Which event-website modules do you need?',
  hint: 'Pick everything you want live for the first edition.',
  defaults: ['Speakers module', 'Schedule / agenda', 'Ticketing system'],
  options: [
    { value: 'Speakers module', label: 'Speakers' },
    { value: 'Schedule / agenda', label: 'Schedule' },
    { value: 'Ticketing system', label: 'Ticketing' },
    { value: 'Sponsors module', label: 'Sponsors' },
    { value: 'Map & venue', label: 'Map & venue' },
    { value: 'Newsletter / lead capture', label: 'Newsletter' },
    { value: 'Live streaming', label: 'Live streaming' },
    { value: 'Past editions archive', label: 'Past editions' },
    { value: 'Multi-language (EN / EL / AR)', label: 'Multi-language' },
    { value: 'Sponsorship deck (gated download)', label: 'Sponsorship deck' },
    { value: 'Press / contact kit', label: 'Press kit' },
    { value: 'Custom integrations (CRM / payments / calendar)', label: 'Custom integrations' },
  ],
};

export function AICyprusExpoBrief({
  projectId,
  projectName,
  className,
}: {
  projectId: string;
  projectName: string;
  className?: string;
}) {
  return (
    <ProjectBriefShell
      projectId={projectId}
      projectName={projectName}
      formTitle="AI Cyprus Expo"
      modulesStep={MODULES}
      variant="aicyprus-expo"
      className={className}
    />
  );
}
