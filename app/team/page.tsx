import { redirect } from 'next/navigation';

/**
 * Team page - redirects to main Daily Flow page
 * The team functionality has been merged into the main dashboard
 */
export default function TeamSchedulePage() {
  redirect('/');
}
