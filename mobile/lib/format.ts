export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

/** utc = true untuk field tanggal-saja (tanggal invoice, jatuh tempo, kirim) yang disimpan sebagai 00:00 UTC. */
export function formatDate(value: string, utc = false): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", ...(utc ? { timeZone: "UTC" } : {}) });
}

// ---- Tanggal-saja ("YYYY-MM-DD", dari <input type="date">) ----
// Disimpan di DB sebagai ISO 00:00 UTC, sama seperti backend (JSON "2026-05-26" -> DateTime tengah malam).

/** Hari ini menurut jam HP (bukan UTC, supaya dini hari WIB tidak jadi "kemarin"). */
export function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  return new Date(Date.parse(`${dateStr}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function dateStringToIso(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}
