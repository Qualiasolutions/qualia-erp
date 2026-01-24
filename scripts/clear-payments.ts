/**
 * Script to clear all payments data
 * Run with: npx tsx scripts/clear-payments.ts
 */

import { clearAllPayments } from '../app/actions/payments';

async function main() {
  console.log('Clearing all payments...');

  const result = await clearAllPayments();

  if (result.success) {
    console.log(`Successfully cleared ${result.count} payments.`);
  } else {
    console.error('Failed to clear payments:', result.error);
    process.exit(1);
  }
}

main().catch(console.error);
