"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, formatDate, formatRupiah } from "@/lib/api";
import { InvoiceListItemResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const TABS = ["Semua", "Lunas", "Menunggu", "Terlambat", "Draft"];

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<InvoiceListItemResponse[]>([]);
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (tab !== "Semua") params.set("status", tab);
    if (search) params.set("search", search);
    apiRequest<InvoiceListItemResponse[]>(`/invoices?${params.toString()}`)
      .then(setInvoices)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [tab, search]);

  async function handleDelete(id: number) {
    if (!confirm("Hapus invoice ini? Stok yang terpakai akan dikembalikan.")) return;
    await apiRequest(`/invoices/${id}`, { method: "DELETE" });
    load();
  }

  async function handleMarkPaid(id: number) {
    if (!confirm("Tandai invoice ini sebagai Lunas?")) return;
    try {
      await apiRequest(`/invoices/${id}/mark-paid`, { method: "PUT" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menandai invoice lunas.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Daftar Invoice</h1>
          <p className="text-sm text-slate-500">Kelola penjualan, cetak faktur, pantau pelunasan, dan batalkan tagihan.</p>
        </div>
        <Link href="/invoice/create" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          + Buat Invoice Baru
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <input
            placeholder="Cari kode invoice atau nama klien..."
            className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 px-5 py-3">{error}</p>}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="py-3 px-5 font-medium">No. Invoice</th>
              <th className="py-3 px-5 font-medium">Klien</th>
              <th className="py-3 px-5 font-medium">Tgl. Penerbitan</th>
              <th className="py-3 px-5 font-medium">Jatuh Tempo</th>
              <th className="py-3 px-5 font-medium">Total Invoice</th>
              <th className="py-3 px-5 font-medium">Status</th>
              <th className="py-3 px-5 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-50 last:border-0">
                <td className="py-3 px-5 text-blue-600 font-medium">{inv.invoiceNumber}</td>
                <td className="py-3 px-5">{inv.clientName}</td>
                <td className="py-3 px-5 text-slate-500">{formatDate(inv.issueDate)}</td>
                <td className="py-3 px-5 text-slate-500">{formatDate(inv.dueDate)}</td>
                <td className="py-3 px-5 font-medium">{formatRupiah(inv.total)}</td>
                <td className="py-3 px-5"><StatusBadge status={inv.status} /></td>
                <td className="py-3 px-5">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/invoice/${inv.id}`} className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                      Pratinjau
                    </Link>
                    {inv.status !== "Lunas" && inv.status !== "Dibatalkan" && (
                      <button onClick={() => handleMarkPaid(inv.id)} className="text-xs rounded-lg border border-emerald-200 text-emerald-700 px-2.5 py-1.5 hover:bg-emerald-50">
                        Tandai Lunas
                      </button>
                    )}
                    <Link href="/surat-jalan" className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                      Surat Jalan
                    </Link>
                    <button onClick={() => handleDelete(inv.id)} className="text-xs rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 hover:bg-red-50">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Tidak ada invoice.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
