import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Agent | Qualia',
  description: 'Full-page AI agent interface for project management assistance',
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
