'use client';

import { ProjectBriefShell } from './project-brief-shell';
import type { BriefModulesStep } from './brief-types';

const MODULES: BriefModulesStep = {
  title: 'Which Hivora modules do you need?',
  hint: 'Pick everything for v1 — we’ll prioritise the rest after.',
  defaults: ['QR profile generation', 'Profile editor'],
  options: [
    { value: 'QR profile generation', label: 'QR profiles' },
    { value: 'Profile editor (self-serve)', label: 'Profile editor' },
    { value: 'Networking feed', label: 'Networking feed' },
    { value: 'Direct messaging (1:1)', label: 'Direct messaging' },
    { value: 'Connections graph (follow / connect)', label: 'Connections' },
    { value: 'Events module', label: 'Events module' },
    { value: 'Custom branding (theme / logo / domain)', label: 'Custom branding' },
    { value: 'Multi-language (EN / EL / AR)', label: 'Multi-language' },
    { value: 'Mobile app (iOS + Android)', label: 'Mobile app' },
    { value: 'Analytics dashboard', label: 'Analytics' },
    { value: 'Premium / paid tier', label: 'Premium tier' },
  ],
};

export function NetworkingBrief({
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
      formTitle="Hivora"
      modulesStep={MODULES}
      variant="networking"
      className={className}
    />
  );
}
