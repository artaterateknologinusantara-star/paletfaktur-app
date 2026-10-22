"use client";

import type { DashboardSummaryResponse } from "../types";
import { getDb } from "./connection";
import { getInvoices } from "./invoices";
import { effectiveStatusSql } from "./invoiceStatus";
import { roundHalfEven } from "./money";
import { getProducts } from "./products";

// Padanan DashboardController.Summary — semua angka dihitung dari SQLite lokal.
//  - total      : semua invoice (apa pun statusnya)
//  - paid       : status tersimpan Lunas
//  - pending    : status efektif Menunggu ATAU Terlambat
//  - low stock  : produk aktif dengan stok <= batas minimum, urut stok naik
export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const db = await getDb();
  const nowIso = new Date().toISOString();

  const groups = (
    await db.query(
      `SELECT ${effectiveStatusSql("i")} AS st, COUNT(*) AS n, COALESCE(SUM(i.total), 0) AS amount
       FROM invoices i GROUP BY st`,
      [nowIso],
    )
  ).values ?? [];

  const pick = (...statuses: string[]) =>
    groups.filter((g) => statuses.includes(g.st)).reduce((a, g) => ({ n: a.n + g.n, amount: a.amount + g.amount }), { n: 0, amount: 0 });

  const all = pick(...groups.map((g) => g.st));
  const paid = pick("Lunas");
  const pending = pick("Menunggu", "Terlambat");

  const lowStock = (await getProducts()).filter((p) => p.stock <= p.minStockThreshold).sort((a, b) => a.stock - b.stock || a.id - b.id);

  return {
    totalInvoiceAmount: roundHalfEven(all.amount, 2),
    totalInvoiceCount: all.n,
    paidAmount: roundHalfEven(paid.amount, 2),
    paidCount: paid.n,
    pendingAmount: roundHalfEven(pending.amount, 2),
    pendingCount: pending.n,
    lowStockCount: lowStock.length,
    recentInvoices: await getInvoices({ limit: 5 }),
    lowStockProducts: lowStock,
  };
}
