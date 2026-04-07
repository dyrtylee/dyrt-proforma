export function fmtCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 10_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function fmtCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function fmtPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function fmtNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function fmtTons(value: number): string {
  return `${value.toFixed(1)} tons`;
}
