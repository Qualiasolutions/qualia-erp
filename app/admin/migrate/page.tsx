'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { migrateAllProjectsToGSD } from '@/app/actions/pipeline';

export default function MigratePage() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runGSDMigration = async () => {
    setLoading(true);
    setResult(null);

    try {
      const migrationResult = await migrateAllProjectsToGSD();
      setResult(JSON.stringify(migrationResult, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-bold">GSD Pipeline Migration</h1>

      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h2 className="mb-2 font-semibold text-emerald-600">
            Migrate All Projects to GSD Workflow
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">
            This will reset ALL projects to use the 6-phase GSD workflow:
          </p>
          <ul className="mb-4 ml-4 list-disc text-sm text-muted-foreground">
            <li>
              <strong>SETUP</strong> → Gather requirements and configure environment
            </li>
            <li>
              <strong>DISCUSS</strong> → Clarify scope and align with stakeholders
            </li>
            <li>
              <strong>PLAN</strong> → Create detailed implementation plan
            </li>
            <li>
              <strong>EXECUTE</strong> → Build and implement the solution
            </li>
            <li>
              <strong>VERIFY</strong> → Test and validate the implementation
            </li>
            <li>
              <strong>SHIP</strong> → Deploy to production and hand off
            </li>
          </ul>
          <p className="mb-4 text-sm text-amber-600">
            ⚠️ This will DELETE all existing phases and tasks, then recreate them using
            type-specific templates (web_design, ai_agent, voice_agent, seo, ads).
          </p>
          <Button onClick={runGSDMigration} disabled={loading}>
            {loading ? 'Migrating...' : 'Run GSD Migration'}
          </Button>
        </div>
      </div>

      {result && <pre className="mt-6 overflow-auto rounded-lg bg-muted p-4 text-sm">{result}</pre>}
    </div>
  );
}
