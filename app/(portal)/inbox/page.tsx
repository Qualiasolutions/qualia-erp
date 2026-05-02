import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inbox' };

// IMPORTANT: do not call redirect('/tasks') here — that forces this route
// into the dynamic-render path and breaks the production prerender
// (Next.js cannot statically generate a page that throws NEXT_REDIRECT).
// The /inbox → /tasks redirect is configured in next.config.ts:redirects()
// and runs at the edge before this segment is ever rendered. This page
// only exists so the App Router has a valid file for the segment; in
// practice users never see it. If you change this, also check
// next.config.ts.
export default function PortalInboxRedirect() {
  return null;
}
