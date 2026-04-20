'use client';

import { ControlTabPlaceholder } from './qualia-control';
import type { FinancePayload } from '@/app/actions/admin-control';

export function ControlFinance(props: { data: FinancePayload | undefined }) {
  void props;
  return <ControlTabPlaceholder label="Finance" />;
}
