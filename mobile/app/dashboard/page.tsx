"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardSummary } from "@/lib/db";
import { formatDate, formatRupiah } from "@/lib/format";
import type { DashboardSummaryResponse } from "@/lib/types";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">Ringkasan Faktur & Stok</h1>
          <p className="text-xs text-slate-500">Invoice otomatis terhubung ke inventori barang.</p>
        </div>
        <Link href="/invoice/create/" className="shrink-0 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium">
          + Invoice
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!summary && !error && <p className="text-sm text-slate-400">Memuat ringkasan...</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard label="Total Invoice" value={formatRupiah(summary.totalInvoiceAmount)} hint={`${summary.totalInvoiceCount} invoice terbit`} />
            <StatCard label="Sudah Dibayar" value={formatRupiah(summary.paidAmount)} hint={`${summary.paidCount} invoice lunas`} tone="success" />
            <StatCard label="Menunggu Pembayaran" value={formatRupiah(summary.pendingAmount)} hint={`${summary.pendingCount} tertunda/terlambat`} tone="warning" />
            <StatCard
              label="Stok Rendah"
              value={`${summary.lowStockCount} Produk`}
              hint={summary.lowStockCount === 0 ? "semua stok aman" : "perlu restock"}
              tone={summary.lowStockCount > 0 ? "danger" : "default"}
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Invoice Terbaru</h2>
              <Link href="/invoice/" className="text-xs text-blue-600 font-medium">Lihat semua →</Link>
            </div>
            <ul>
              {summary.recentInvoices.map((inv) => (
                <li key={inv.id} className="py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/invoice/detail/?id=${inv.id}`} className="text-sm font-medium text-blue-600">{inv.invoiceNumber}</Link>
                      <p className="text-xs text-slate-500 truncate">{inv.clientName} • {formatDate(inv.issueDate, true)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatRupiah(inv.total)}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                </li>
              ))}
              {summary.recentInvoices.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Belum ada invoice.</li>}
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Alert Stok Barang</h2>
              <Link href="/inventori/" className="text-xs text-blue-600 font-medium">Inventori →</Link>
            </div>
            {summary.lowStockProducts.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">✓</div>
                <p className="text-sm font-medium mt-3">Stok Barang Aman</p>
                <p className="text-xs text-slate-400 mt-1">Semua produk aktif berada di atas batas minimum.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {summary.lowStockProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm border border-red-100 bg-red-50 rounded-lg px-3 py-2">
                    <span className="min-w-0 truncate">{p.name}</span>
                    <span className="font-semibold text-red-600 shrink-0 ml-2">{p.stock} sisa</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
