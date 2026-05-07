import type { Metadata } from 'next';

import { LandingHero } from '@/components/landing/landing-hero';

export const metadata: Metadata = {
  title: 'Qualia Suite — The operating system for your client work',
  description:
    'Projects, tasks, finances, meetings and AI assistants — one private workspace for your team and a clean portal for every client.',
  alternates: { canonical: '/' },
};

export default function LandingPage() {
  return <LandingHero />;
}
