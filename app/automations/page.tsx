import type { Metadata } from 'next';
import { AutomationsClient } from './automations-client';

export const metadata: Metadata = {
  title: 'Automations',
  description: 'AI-powered automations running across Qualia Solutions',
};

export default function AutomationsPage() {
  return <AutomationsClient />;
}
