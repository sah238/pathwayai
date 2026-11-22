/** Display formatting only: these never change a value, just how it reads. */
export const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const STATE_NAMES = { DC: "DC", MD: "Maryland", VA: "Virginia" } as const;

/** BLS projections store thousands (174.7 → "174,700"). */
export function thousands(k: number): string {
  return Math.round(Math.abs(k) * 1000).toLocaleString("en-US");
}

export function signedPct(pct: number): string {
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct)}%`;
}
