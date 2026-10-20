"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, formatDate, formatRupiah } from "@/lib/api";
import { QuotationResponse, QuotationStatus } from "@/lib/types";

const STATUSES: QuotationStatus[] = ["Draft", "Terkirim", "Disetujui", "Ditolak"];

const STATUS_STYLE: Record<QuotationStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Terkirim: "bg-blue-100 text-blue-700",
  Disetujui: "bg-emerald-100 text-emerald-700",
  Ditolak: "bg-red-100 text-red-700",
};

export default function PenawaranPage() {
  const [quotations, setQuotations] = useState<QuotationResponse[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    apiRequest<QuotationResponse[]>(`/quotations?${params.toString()}`).then(setQuotations).catch((e) => setError(e.message));
  }

  useEffect(load, [search]);

  async function handleStatus(q: QuotationResponse, status: string) {
    try {
      await apiRequest(`/quotations/${q.id}/status`, { method: "PUT", body: { status } });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  async function handleDelete(q: QuotationResponse) {
    if (!confirm(`Hapus penawaran ${q.quotationNumber}?`)) return;
    try {
      await apiRequest(`/quotations/${q.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus penawaran.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Penawaran Harga</h1>
          <p className="text-sm text-slate-500">Surat penawaran harga (SPH) ke calon pelanggan, siap cetak / simpan PDF.</p>
        </div>
        <Link href="/penawaran/create" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          + Buat Penawaran
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex justify-end mb-4">
          <input
            placeholder="Cari nomor atau penerima..."
            className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="py-2 font-medium">Nomor</th>
              <th className="py-2 font-medium">Tanggal</th>
              <th className="py-2 font-medium">Kepada</th>
              <th className="py-2 font-medium text-right">Total</th>
              <th className="py-2 font-medium pl-6">Status</th>
              <th className="py-2 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2 font-medium">{q.quotationNumber}</td>
                <td className="py-2">{formatDate(q.quotationDate)}</td>
                <td className="py-2">{q.recipientName}</td>
                <td className="py-2 text-right">{formatRupiah(q.total)}</td>
                <td className="py-2 pl-6">
                  <select
                    value={q.status}
                    onChange={(e) => handleStatus(q, e.target.value)}
                    className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${STATUS_STYLE[q.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Link href={`/penawaran/${q.id}`} className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                      Lihat / Cetak
                    </Link>
                    <Link href={`/penawaran/${q.id}/edit`} className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(q)} className="text-xs rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 hover:bg-red-50">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                  Belum ada penawaran.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
