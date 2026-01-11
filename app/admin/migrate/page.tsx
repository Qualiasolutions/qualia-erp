'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  initializePipelinesForAllProjects,
  resetAllPhaseTasks,
  updateAllProjectPhaseTasks,
} from '@/app/actions/pipeline';

export default function MigratePage() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Initialize pipelines for projects without phases
      const initResult = await initializePipelinesForAllProjects();

      // Reset and add default tasks
      const resetResult = await resetAllPhaseTasks();

      setResult(JSON.stringify({ init: initResult, reset: resetResult }, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const runClaudeWorkflowMigration = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Update phases 2-5 with new Claude workflow tasks
      const updateResult = await updateAllProjectPhaseTasks();

      setResult(JSON.stringify({ update: updateResult }, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Pipeline Migration</h1>

      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Full Reset Migration</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Reset all pipeline tasks and add default tasks (4-10 per phase).
          </p>
          <Button onClick={runMigration} disabled={loading} variant="outline">
            {loading ? 'Running...' : 'Run Full Reset'}
          </Button>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h2 className="mb-2 font-semibold text-emerald-600">Claude Workflow Migration</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Update phases 2-5 (Design, Build, Test, Ship) with new Claude workflow tasks. Phase 1
            (Plan) remains unchanged.
          </p>
          <Button onClick={runClaudeWorkflowMigration} disabled={loading}>
            {loading ? 'Running...' : 'Run Claude Workflow Migration'}
          </Button>
        </div>
      </div>

      {result && <pre className="mt-6 overflow-auto rounded-lg bg-muted p-4 text-sm">{result}</pre>}
    </div>
  );
}
