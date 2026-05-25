import type { Metadata, Viewport } from 'next';
import { OwnerAssistantClient } from './owner-assistant-client';

export const metadata: Metadata = {
  title: 'Qualia',
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function FawziAssistantPage() {
  return <OwnerAssistantClient />;
}
