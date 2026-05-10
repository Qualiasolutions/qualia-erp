'use client';

import { ProjectBriefShell } from './project-brief-shell';
import type { BriefModulesStep } from './brief-types';

const MODULES: BriefModulesStep = {
  title: 'Which Kartatic updates do you need?',
  hint: 'The current demo plus what we add for v1.',
  defaults: ['Referral program', 'Ticketing system'],
  options: [
    { value: 'Referral program (invite & earn)', label: 'Referral program' },
    { value: 'Ticketing system (QR check-in)', label: 'Ticketing' },
    { value: 'Web ↔ Habs car linkage', label: 'Habs ↔ web link' },
    { value: 'QR code generation (per profile / asset)', label: 'QR codes' },
    { value: 'Profile editing (self-serve)', label: 'Profile editing' },
    { value: 'Payment integration (JCC / Revolut)', label: 'Payment integration' },
    { value: 'Custom branding', label: 'Custom branding' },
    { value: 'Email + SMS notifications', label: 'Notifications' },
    { value: 'Admin dashboard (members / payments / analytics)', label: 'Admin dashboard' },
    { value: 'Multi-language (EN / EL / AR)', label: 'Multi-language' },
  ],
};

export function KartaticBrief({
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
      formTitle="Kartatic"
      modulesStep={MODULES}
      className={className}
    />
  );
}
