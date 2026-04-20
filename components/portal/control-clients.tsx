'use client';

import { ControlTabPlaceholder } from './qualia-control';
import type { ClientsPayload } from '@/app/actions/admin-control';

export function ControlClients(props: { data: ClientsPayload | undefined }) {
  void props;
  return <ControlTabPlaceholder label="Clients" />;
}
