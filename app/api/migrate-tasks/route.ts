import { NextResponse } from 'next/server';
import { initializePipelinesForAllProjects, resetAllPhaseTasks } from '@/app/actions/pipeline';

export async function POST() {
  // First, initialize pipelines for projects that don't have any phases
  const initResult = await initializePipelinesForAllProjects();

  // Reset and add default tasks to all phases
  const resetResult = await resetAllPhaseTasks();

  return NextResponse.json({
    initialization: initResult.success ? initResult.data : { error: initResult.error },
    reset: resetResult.success ? resetResult.data : { error: resetResult.error },
  });
}
