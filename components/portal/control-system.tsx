'use client';

import type { ReactNode } from 'react';
import { ControlTabPlaceholder } from './qualia-control';
import type { SystemPayload } from '@/app/actions/admin-control';

export function ControlSystem(props: {
  data: SystemPayload | undefined;
  emptyFallback?: ReactNode;
}) {
  void props;
  return <ControlTabPlaceholder label="System" />;
}
