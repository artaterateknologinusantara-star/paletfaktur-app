"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { deleteInvoice, getInvoices, markInvoicePaid } from "@/lib/db";
import { formatDate, formatRupiah } from "@/lib/format";
import type { InvoiceListItemResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const TABS = ["Semua", "Lunas", "Menunggu", "Terlambat", "Draft"];

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<InvoiceListItemResponse[]>([]);
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getInvoices({ status: tab, search })
      .then(setInvoices)
      .then(() => setError(null))
      .catch((err) => setError(err.message));
  }, [tab, search]);

  useEffect(load, [load]);

  async function handleDelete(id: number) {
    if (!confirm("Hapus invoice ini? Stok yang terpakai akan dikembalikan.")) return;
    try {
      await deleteInvoice(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus invoice.");
    }
  }

  async function handleMarkPaid(id: number) {
    if (!confirm("Tandai invoice ini sebagai Lunas?")) return;
    try {
      await markInvoicePaid(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menandai invoice lunas.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">Daftar Invoice</h1>
          <p className="text-xs text-slate-500">Penjualan, pelunasan, dan pembatalan tagihan.</p>
        </div>
        <Link href="/invoice/create/" className="shrink-0 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium">
          + Invoice
        </Link>
      </div>

      <input
        placeholder="Cari no. invoice atau nama klien..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-1 overflow-x-auto mb-4 -mx-4 px-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border ${
              tab === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="space-y-3">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/invoice/detail/?id=${inv.id}`} className="text-sm font-semibold text-blue-600">
                  {inv.invoiceNumber}
                </Link>
                <p className="text-sm">{inv.clientName}</p>
              </div>
              <StatusBadge status={inv.status} />
            </div>
            <p className="text-lg font-bold mt-2">{formatRupiah(inv.total)}</p>
            <p className="text-xs text-slate-400">
              Terbit {formatDate(inv.issueDate, true)} • Jatuh tempo {formatDate(inv.dueDate, true)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              <Link href={`/invoice/detail/?id=${inv.id}`} className="text-xs rounded-lg border border-slate-200 px-3 py-2">
                Pratinjau
              </Link>
              {inv.status !== "Lunas" && inv.status !== "Dibatalkan" && (
                <button onClick={() => handleMarkPaid(inv.id)} className="text-xs rounded-lg border border-emerald-200 text-emerald-700 px-3 py-2">
                  Tandai Lunas
                </button>
              )}
              <Link href={`/surat-jalan/create/?invoiceId=${inv.id}`} className="text-xs rounded-lg border border-slate-200 px-3 py-2">
                Surat Jalan
              </Link>
              <button onClick={() => handleDelete(inv.id)} className="text-xs rounded-lg border border-red-200 text-red-600 px-3 py-2">
                Hapus
              </button>
            </div>
          </div>
        ))}
        {invoices.length === 0 && !error && <p className="text-sm text-slate-400 text-center py-8">Tidak ada invoice.</p>}
      </div>
    </div>
  );
}
