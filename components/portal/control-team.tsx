'use client';

import { ControlTabPlaceholder } from './qualia-control';
import type { TeamPayload } from '@/app/actions/admin-control';

export function ControlTeam(props: { data: TeamPayload | undefined }) {
  void props;
  return <ControlTabPlaceholder label="Team" />;
}
