const EUR_FORMATTER = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const EUR_WHOLE = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatEUR(amount: number): string {
  return EUR_FORMATTER.format(amount);
}

export function formatEURWhole(amount: number): string {
  return EUR_WHOLE.format(amount);
}

export function formatEURCompact(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return `€${(amount / 1000).toFixed(1)}k`;
  }
  return EUR_WHOLE.format(amount);
}
