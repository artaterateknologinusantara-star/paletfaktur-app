"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, formatDate } from "@/lib/api";
import { SuratJalanListItemResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const TABS = ["Semua", "Proses", "Terkirim", "Dibatalkan"];

export default function SuratJalanPage() {
  const [list, setList] = useState<SuratJalanListItemResponse[]>([]);
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (tab !== "Semua") params.set("status", tab);
    if (search) params.set("search", search);
    apiRequest<SuratJalanListItemResponse[]>(`/suratjalan?${params.toString()}`).then(setList).catch((e) => setError(e.message));
  }

  useEffect(load, [tab, search]);

  async function handleDelete(id: number) {
    if (!confirm("Hapus surat jalan ini?")) return;
    try {
      await apiRequest(`/suratjalan/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus surat jalan.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Surat Jalan</h1>
          <p className="text-sm text-slate-500">Buat, kelola, dan cetak surat jalan pengiriman barang (A4).</p>
        </div>
        <Link href="/surat-jalan/create" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          + Buat Surat Jalan
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <input
            placeholder="Cari no. SJ atau penerima..."
            className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600 px-5 pt-3">{error}</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="py-3 px-5 font-medium">No. SJ</th>
              <th className="py-3 px-5 font-medium">Ref. Invoice</th>
              <th className="py-3 px-5 font-medium">Penerima</th>
              <th className="py-3 px-5 font-medium">Tgl. Kirim</th>
              <th className="py-3 px-5 font-medium">Sopir</th>
              <th className="py-3 px-5 font-medium">Status</th>
              <th className="py-3 px-5 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((sj) => (
              <tr key={sj.id} className="border-b border-slate-50 last:border-0">
                <td className="py-3 px-5 text-blue-600 font-medium">{sj.suratJalanNumber}</td>
                <td className="py-3 px-5">{sj.invoiceNumber ?? "-"}</td>
                <td className="py-3 px-5">{sj.recipientName}</td>
                <td className="py-3 px-5 text-slate-500">{formatDate(sj.deliveryDate)}</td>
                <td className="py-3 px-5">{sj.driverName || "-"}</td>
                <td className="py-3 px-5"><StatusBadge status={sj.status} /></td>
                <td className="py-3 px-5">
                  <div className="flex gap-2">
                    <Link href={`/surat-jalan/${sj.id}`} className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                      Lihat / Cetak
                    </Link>
                    <Link href={`/surat-jalan/${sj.id}/edit`} className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(sj.id)} className="text-xs rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 hover:bg-red-50">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Belum ada surat jalan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
