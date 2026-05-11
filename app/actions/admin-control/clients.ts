'use server';

import { getClients } from '@/app/actions';
import { getClientAccessDrift, type ClientAccessDriftRow } from '@/app/actions/clients';
import type { Client } from '@/lib/client-utils';

export type ClientsPayload = {
  clients: Client[];
  driftRows: ClientAccessDriftRow[];
  driftAuthorized: boolean;
};

/**
 * Load data for the Clients tab inside /admin hub.
 * Mirrors the data-fetching from `app/(portal)/clients/page.tsx` ClientListLoader.
 */
export async function loadClientsTab(): Promise<ClientsPayload> {
  const [data, drift] = await Promise.all([getClients(), getClientAccessDrift()]);

  // Only show clients (active_client, inactive_client, dead_lead), not leads
  const clients = (data as Client[]).filter(
    (c) =>
      c.lead_status === 'active_client' ||
      c.lead_status === 'inactive_client' ||
      c.lead_status === 'dead_lead'
  );

  return {
    clients,
    driftRows: drift.rows,
    driftAuthorized: drift.authorized,
  };
}
