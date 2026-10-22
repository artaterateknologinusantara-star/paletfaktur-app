"use client";

import { useEffect, useState } from "react";
import { getReportSummary } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import type { ReportSummaryResponse } from "@/lib/types";
import StatCard from "@/components/StatCard";
import BackLink from "@/components/BackLink";

export default function LaporanPage() {
  const [report, setReport] = useState<ReportSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReportSummary().then(setReport).catch((e) => setError(e.message));
  }, []);

  const totalInvoices = report ? report.paidInvoiceCount + report.pendingInvoiceCount + report.overdueInvoiceCount : 0;
  const paidRatio = report && totalInvoices > 0 ? Math.round((report.paidInvoiceCount / totalInvoices) * 100) : 0;
  const maxRevenue = report ? Math.max(1, ...report.monthlyRevenue.map((m) => m.revenue)) : 1;

  return (
    <div>
      <BackLink href="/menu/" label="Menu" />
      <h1 className="text-xl font-bold mb-1">Laporan Keuangan & Inventori</h1>
      <p className="text-xs text-slate-500 mb-4">Omset, piutang, aset gudang, dan produk terlaris.</p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!report && !error && <p className="text-sm text-slate-400">Memuat laporan...</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard label="Omset Terkumpul" value={formatRupiah(report.collectedRevenue)} hint={`Dari ${report.paidInvoiceCount} invoice lunas`} />
            <StatCard label="Aset Gudang" value={formatRupiah(report.warehouseAssetValue)} hint="Nilai stok aktif" />
            <StatCard label="PPN Terkumpul" value={formatRupiah(report.collectedPpn)} hint="Dari transaksi lunas" />
            <StatCard
              label="Piutang Berjalan"
              value={formatRupiah(report.outstandingReceivable)}
              hint={`${report.pendingInvoiceCount + report.overdueInvoiceCount} invoice belum dibayar`}
              tone="warning"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
            <h2 className="font-semibold text-sm mb-1">Tren Pendapatan Bulanan</h2>
            <p className="text-xs text-slate-400 mb-4">Omset invoice lunas per bulan penerbitan.</p>
            <div className="flex items-end gap-2 h-36 overflow-x-auto">
              {report.monthlyRevenue.map((m) => (
                <div key={m.key} className="flex-1 min-w-[40px] h-full flex flex-col justify-end items-center gap-1">
                  <span className="text-[9px] text-slate-500">{formatRupiah(m.revenue).replace("Rp ", "")}</span>
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(2, (m.revenue / maxRevenue) * 80)}%` }} />
                  <span className="text-[10px] text-slate-400">{m.month}</span>
                </div>
              ))}
              {report.monthlyRevenue.length === 0 && <p className="text-sm text-slate-400 m-auto">Belum ada data pendapatan.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
            <h2 className="font-semibold text-sm mb-1">Rasio Pelunasan</h2>
            <p className="text-xs text-slate-400 mb-4">Invoice lunas berbanding yang tertunda.</p>
            <div className="flex items-center gap-5">
              <div
                className="w-24 h-24 shrink-0 rounded-full flex items-center justify-center"
                style={{ background: `conic-gradient(#10b981 ${paidRatio}%, #e2e8f0 0)` }}
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-base font-bold">{paidRatio}%</div>
              </div>
              <ul className="text-xs space-y-1.5 flex-1">
                <li className="flex justify-between"><span>Lunas</span><span>{report.paidInvoiceCount} invoice</span></li>
                <li className="flex justify-between"><span>Menunggu</span><span>{report.pendingInvoiceCount} invoice</span></li>
                <li className="flex justify-between"><span>Terlambat</span><span>{report.overdueInvoiceCount} invoice</span></li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-sm mb-1">Top 5 Produk Terlaris</h2>
            <p className="text-xs text-slate-400 mb-3">Berdasarkan volume unit pada invoice.</p>
            <ul>
              {report.topProducts.map((p) => (
                <li key={`${p.sku}-${p.name}`} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">{p.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{p.unitsSold} unit</p>
                    <p className="text-xs text-slate-500">{formatRupiah(p.revenueValue)}</p>
                  </div>
                </li>
              ))}
              {report.topProducts.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Belum ada data penjualan.</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
