"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, formatDate, formatRupiah } from "@/lib/api";
import { DashboardSummaryResponse } from "@/lib/types";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<DashboardSummaryResponse>("/dashboard/summary")
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ringkasan Faktur & Stok</h1>
          <p className="text-sm text-slate-500">Sistem invoicing otomatis yang terhubung langsung ke inventori barang Anda.</p>
        </div>
        <Link
          href="/invoice/create"
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          + Buat Invoice Baru
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {summary && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Invoice" value={formatRupiah(summary.totalInvoiceAmount)} hint={`${summary.totalInvoiceCount} invoice terbit`} />
            <StatCard label="Sudah Dibayar (Lunas)" value={formatRupiah(summary.paidAmount)} hint={`${summary.paidCount} invoice lunas`} tone="success" />
            <StatCard label="Menunggu Pembayaran" value={formatRupiah(summary.pendingAmount)} hint={`${summary.pendingCount} tertunda/terlambat`} tone="warning" />
            <StatCard label="Peringatan Stok Rendah" value={`${summary.lowStockCount} Produk`} hint={summary.lowStockCount === 0 ? "0 produk habis" : "perlu restock"} tone={summary.lowStockCount > 0 ? "danger" : "default"} />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-sm">Invoice Terbaru</h2>
                  <p className="text-xs text-slate-400">Daftar transaksi penjualan terakhir yang diterbitkan.</p>
                </div>
                <Link href="/invoice" className="text-xs text-blue-600 font-medium">Lihat semua →</Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="py-2 font-medium">No. Invoice</th>
                    <th className="py-2 font-medium">Klien</th>
                    <th className="py-2 font-medium">Tanggal</th>
                    <th className="py-2 font-medium">Total</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2">
                        <Link href={`/invoice`} className="text-blue-600 font-medium">{inv.invoiceNumber}</Link>
                      </td>
                      <td className="py-2">{inv.clientName}</td>
                      <td className="py-2 text-slate-500">{formatDate(inv.issueDate)}</td>
                      <td className="py-2 font-medium">{formatRupiah(inv.total)}</td>
                      <td className="py-2"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                  {summary.recentInvoices.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Belum ada invoice.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm">Alert Stok Barang</h2>
                <Link href="/inventori" className="text-xs text-blue-600 font-medium">Inventori →</Link>
              </div>

              {summary.lowStockProducts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">✓</div>
                  <p className="text-sm font-medium mt-3">Stok Barang Aman</p>
                  <p className="text-xs text-slate-400 mt-1">Semua unit produk aktif berada pada tingkat stok aman.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {summary.lowStockProducts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm border border-red-100 bg-red-50 rounded-lg px-3 py-2">
                      <span>{p.name}</span>
                      <span className="font-semibold text-red-600">{p.stock} sisa</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
