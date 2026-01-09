'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { initializePipelinesForAllProjects, resetAllPhaseTasks } from '@/app/actions/pipeline';

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

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Pipeline Migration</h1>
      <p className="mb-6 text-muted-foreground">
        This will reset all pipeline tasks and add the new default tasks (4-10 per phase).
      </p>

      <Button onClick={runMigration} disabled={loading}>
        {loading ? 'Running...' : 'Run Migration'}
      </Button>

      {result && <pre className="mt-6 overflow-auto rounded-lg bg-muted p-4 text-sm">{result}</pre>}
    </div>
  );
}
