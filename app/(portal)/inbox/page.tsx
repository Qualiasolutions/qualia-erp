import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inbox' };

export default function PortalInboxRedirect() {
  // Redirect is handled in next.config.ts so this segment stays static-buildable.
  return null;
}
