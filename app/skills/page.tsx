import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SkillsPageContent } from './skills-page-content';

export const metadata: Metadata = {
  title: 'Skills',
  description: 'Track your skill growth and achievements',
};

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading skills...</p>
      </div>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SkillsPageContent />
    </Suspense>
  );
}
