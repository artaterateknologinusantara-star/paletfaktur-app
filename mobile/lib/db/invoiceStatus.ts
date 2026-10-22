// Port Extensions/InvoiceStatusExtensions.cs.
// "Terlambat" dihitung on-the-fly (Menunggu + lewat jatuh tempo) dan TIDAK PERNAH disimpan ke kolom status.
export function getEffectiveStatus(status: string, dueDate: string): string {
  if (status === "Menunggu" && Date.parse(dueDate) < Date.now()) return "Terlambat";
  return status;
}

/**
 * Padanan SQL dari getEffectiveStatus() untuk agregasi (dashboard/laporan) tanpa memuat semua baris.
 * Kolom tanggal disimpan ISO-8601 UTC, sehingga perbandingan string sama dengan perbandingan waktu.
 * `nowIso` dioper sebagai parameter (bukan datetime('now')) supaya format-nya identik dengan Date.now() di JS.
 */
export function effectiveStatusSql(alias = "i"): string {
  return `CASE WHEN ${alias}.status = 'Menunggu' AND ${alias}.due_date < ? THEN 'Terlambat' ELSE ${alias}.status END`;
}
