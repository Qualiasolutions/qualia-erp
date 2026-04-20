import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Team' };

/**
 * Team page - redirects to main Daily Flow page
 * The team functionality has been merged into the main dashboard
 */
export default function TeamSchedulePage() {
  redirect('/');
}
