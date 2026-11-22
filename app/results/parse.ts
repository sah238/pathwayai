/**
 * Reads the results URL. Only `socs` belongs in it; ZIP and income tier are
 * entered on the page and kept in browser memory, so any zip/tier parameter
 * is ignored.
 */
export type ParsedSocs = { ok: true; socs: [string, string, string] } | { ok: false; message: string };

const SOC = /^\d{2}-\d{4}$/;

export function parseSocs(raw: string | string[] | undefined): ParsedSocs {
  const value = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const socs = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (socs.length !== 3) {
    return { ok: false, message: "This page needs exactly three careers." };
  }
  const bad = socs.filter((s) => !SOC.test(s));
  if (bad.length) {
    return { ok: false, message: `These career codes aren't valid: ${bad.join(", ")}.` };
  }
  if (new Set(socs).size !== 3) {
    return { ok: false, message: "The three careers must be different." };
  }
  return { ok: true, socs: socs as [string, string, string] };
}
