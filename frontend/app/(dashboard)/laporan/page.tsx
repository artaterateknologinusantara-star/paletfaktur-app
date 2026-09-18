"use client";

import { useEffect, useState } from "react";
import { apiRequest, formatRupiah } from "@/lib/api";
import { ReportSummaryResponse } from "@/lib/types";
import StatCard from "@/components/StatCard";

export default function LaporanPage() {
  const [report, setReport] = useState<ReportSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<ReportSummaryResponse>("/reports/summary").then(setReport).catch((e) => setError(e.message));
  }, []);

  const totalInvoices = report ? report.paidInvoiceCount + report.pendingInvoiceCount + report.overdueInvoiceCount : 0;
  const paidRatio = report && totalInvoices > 0 ? Math.round((report.paidInvoiceCount / totalInvoices) * 100) : 0;
  const maxRevenue = report ? Math.max(1, ...report.monthlyRevenue.map((m) => m.revenue)) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Laporan Keuangan & Inventori</h1>
      <p className="text-sm text-slate-500 mb-6">Audit omset penjualan, piutang, aset sisa gudang, serta produk terlaris.</p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Omset Terkumpul (Lunas)" value={formatRupiah(report.collectedRevenue)} hint={`Dari ${report.paidInvoiceCount} invoice lunas`} />
            <StatCard label="Kapitalisasi Aset Gudang" value={formatRupiah(report.warehouseAssetValue)} hint="Total nilai stok aktif" />
            <StatCard label="Kewajiban PPN Terkumpul" value={formatRupiah(report.collectedPpn)} hint="PPN terakumulasi dari transaksi lunas" />
            <StatCard label="Piutang Berjalan (Unpaid)" value={formatRupiah(report.outstandingReceivable)} hint={`Menunggu ${report.pendingInvoiceCount + report.overdueInvoiceCount} invoice dibayar`} tone="warning" />
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-sm mb-1">Tren Pendapatan Bulanan</h2>
              <p className="text-xs text-slate-400 mb-4">Analisis omset penjualan gross dari awal tahun sampai bulan berjalan.</p>
              <div className="flex items-end gap-3 h-40">
                {report.monthlyRevenue.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(m.revenue / maxRevenue) * 100}%` }} />
                    <span className="text-[10px] text-slate-400">{m.month}</span>
                  </div>
                ))}
                {report.monthlyRevenue.length === 0 && <p className="text-sm text-slate-400 m-auto">Belum ada data pendapatan.</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-sm mb-1">Rasio Pelunasan</h2>
              <p className="text-xs text-slate-400 mb-4">Efektivitas tagihan lunas berbanding tertunda.</p>
              <div className="flex flex-col items-center">
                <div className="w-28 h-28 rounded-full flex items-center justify-center text-2xl font-bold"
                     style={{ background: `conic-gradient(#10b981 ${paidRatio}%, #e2e8f0 0)` }}>
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-lg">{paidRatio}%</div>
                </div>
                <ul className="text-xs mt-4 space-y-1 w-full">
                  <li className="flex justify-between"><span>Lunas (Paid)</span><span>{report.paidInvoiceCount} invoice</span></li>
                  <li className="flex justify-between"><span>Menunggu (Pending)</span><span>{report.pendingInvoiceCount} invoice</span></li>
                  <li className="flex justify-between"><span>Terlambat (Overdue)</span><span>{report.overdueInvoiceCount} invoice</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-sm mb-1">Top 5 Produk Terlaris (Volume Unit)</h2>
            <p className="text-xs text-slate-400 mb-4">Visualisasi barang yang paling mendominasi volume penjualan berdasarkan kuantitas faktur.</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 font-medium">Peringkat</th>
                  <th className="py-2 font-medium">Kode SKU</th>
                  <th className="py-2 font-medium">Deskripsi Komoditas</th>
                  <th className="py-2 font-medium">Unit Terjual</th>
                  <th className="py-2 font-medium">Nilai Rupiah</th>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.map((p) => (
                  <tr key={p.sku} className="border-b border-slate-50 last:border-0">
                    <td className="py-2">{p.rank}</td>
                    <td className="py-2">{p.sku}</td>
                    <td className="py-2">{p.name}</td>
                    <td className="py-2">{p.unitsSold} unit</td>
                    <td className="py-2">{formatRupiah(p.revenueValue)}</td>
                  </tr>
                ))}
                {report.topProducts.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">Belum ada data penjualan.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
