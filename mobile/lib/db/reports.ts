"use client";

import type { ReportSummaryResponse } from "../types";
import { getDb } from "./connection";
import { effectiveStatusSql } from "./invoiceStatus";
import { roundHalfEven } from "./money";

// Padanan ReportsController.Summary — agregasi langsung di SQLite lokal.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const r2 = (v: number) => roundHalfEven(v, 2);

export async function getReportSummary(): Promise<ReportSummaryResponse> {
  const db = await getDb();
  const nowIso = new Date().toISOString();

  // Omset, PPN, piutang, dan hitungan invoice per status efektif.
  const groups = (
    await db.query(
      `SELECT ${effectiveStatusSql("i")} AS st, COUNT(*) AS n,
              COALESCE(SUM(i.total), 0) AS amount, COALESCE(SUM(i.ppn_amount), 0) AS ppn
       FROM invoices i GROUP BY st`,
      [nowIso],
    )
  ).values ?? [];
  const g = (st: string) => groups.find((x) => x.st === st) ?? { n: 0, amount: 0, ppn: 0 };

  const lunas = g("Lunas");
  const menunggu = g("Menunggu");
  const terlambat = g("Terlambat");

  const warehouse = (await db.query("SELECT COALESCE(SUM(unit_price * stock), 0) AS v FROM products WHERE is_active = 1")).values?.[0]?.v ?? 0;

  // Pendapatan bulanan: hanya invoice Lunas, dikelompokkan menurut bulan TANGGAL INVOICE (bukan tanggal bayar), seperti backend.
  const monthRows = (
    await db.query(
      `SELECT substr(issue_date, 1, 7) AS ym, COALESCE(SUM(total), 0) AS revenue
       FROM invoices WHERE status = 'Lunas' GROUP BY ym ORDER BY ym`,
    )
  ).values ?? [];
  const multiYear = new Set(monthRows.map((m) => String(m.ym).slice(0, 4))).size > 1;
  const monthlyRevenue = monthRows.map((m) => {
    const [year, month] = String(m.ym).split("-");
    const label = MONTHS[Number(month) - 1];
    return { month: multiYear ? `${label} ${year.slice(2)}` : label, key: m.ym as string, revenue: r2(m.revenue) };
  });

  // Top 5 menurut unit terjual, dari semua baris invoice (termasuk invoice apa pun statusnya, seperti backend).
  // Seri diurutkan menurut kemunculan pertama, sama dengan GroupBy+OrderByDescending (stabil) di LINQ.
  const top = (
    await db.query(
      `SELECT product_sku_snapshot AS sku, product_name_snapshot AS name,
              SUM(quantity) AS units, COALESCE(SUM(line_total), 0) AS revenue
       FROM invoice_items
       GROUP BY product_sku_snapshot, product_name_snapshot
       ORDER BY units DESC, MIN(id) ASC
       LIMIT 5`,
    )
  ).values ?? [];

  return {
    collectedRevenue: r2(lunas.amount),
    warehouseAssetValue: r2(warehouse),
    collectedPpn: r2(lunas.ppn),
    outstandingReceivable: r2(menunggu.amount + terlambat.amount),
    paidInvoiceCount: lunas.n,
    pendingInvoiceCount: menunggu.n,
    overdueInvoiceCount: terlambat.n,
    monthlyRevenue,
    topProducts: top.map((t, i) => ({ rank: i + 1, sku: t.sku, name: t.name, unitsSold: t.units, revenueValue: r2(t.revenue) })),
  };
}
