import { redirect } from 'next/navigation';

export default function PortalInboxRedirect() {
  // Inbox folded into the unified /tasks page (default mode).
  redirect('/tasks');
}
