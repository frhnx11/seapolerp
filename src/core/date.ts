/**
 * True when `v` is a real calendar date in strict "YYYY-MM-DD" form. Unlike a
 * `new Date(...)` NaN check, this rejects impossible dates that JS silently rolls
 * over (e.g. "2026-02-30" → Mar 2, "2026-13-01" → next year).
 */
export function isValidYmd(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}
