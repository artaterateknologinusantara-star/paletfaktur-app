/**
 * Pembulatan setengah-ke-genap (banker's rounding) seperti Math.Round(decimal, n) di C#
 * (MidpointRounding.ToEven), supaya angka PPN/DPP identik dengan hasil backend.
 */
export function roundHalfEven(value: number, digits: number): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  if (Math.abs(scaled - floor - 0.5) < 1e-9) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(scaled) / factor;
}

export interface InvoiceTotals {
  subtotal: number;
  dppNilaiLain: number;
  ppnAmount: number;
  total: number;
}

/** Rumus dari InvoicesController.Create: DPP Nilai Lain = subtotal x 11/12, PPN = DPP x tarif; applyTax=false -> DPP & PPN = 0. */
export function computeInvoiceTotals(subtotal: number, applyTax: boolean, ppnRate: number): InvoiceTotals {
  if (!applyTax) return { subtotal, dppNilaiLain: 0, ppnAmount: 0, total: subtotal };
  const dppNilaiLain = roundHalfEven((subtotal * 11) / 12, 2);
  const ppnAmount = roundHalfEven(dppNilaiLain * ppnRate, 2);
  return { subtotal, dppNilaiLain, ppnAmount, total: roundHalfEven(subtotal + ppnAmount, 2) };
}
