import { NextResponse } from 'next/server';
import {
  populateDefaultTasksForAllProjects,
  initializePipelinesForAllProjects,
  linkTasksToPhases,
} from '@/app/actions/pipeline';

export async function POST() {
  // First, initialize pipelines for projects that don't have any phases
  const initResult = await initializePipelinesForAllProjects();

  // Link existing tasks to phases based on phase_name
  const linkResult = await linkTasksToPhases();

  // Then populate default tasks for phases without tasks
  const taskResult = await populateDefaultTasksForAllProjects();

  return NextResponse.json({
    initialization: initResult.success ? initResult.data : { error: initResult.error },
    linking: linkResult.success ? linkResult.data : { error: linkResult.error },
    tasks: taskResult.success ? taskResult.data : { error: taskResult.error },
  });
}
