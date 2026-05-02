import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inbox' };

export default function PortalInboxRedirect() {
  redirect('/tasks');
}
