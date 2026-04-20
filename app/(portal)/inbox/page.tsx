import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Inbox' };

export default function PortalInboxRedirect() {
  // Inbox folded into the unified /tasks page (default mode).
  redirect('/tasks');
}
