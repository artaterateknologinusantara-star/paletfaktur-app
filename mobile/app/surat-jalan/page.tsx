"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { deleteSuratJalan, getSuratJalanList } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { SuratJalanListItemResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const TABS = ["Semua", "Proses", "Terkirim", "Dibatalkan"];

export default function SuratJalanListPage() {
  const [list, setList] = useState<SuratJalanListItemResponse[]>([]);
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getSuratJalanList({ status: tab, search })
      .then(setList)
      .then(() => setError(null))
      .catch((e) => setError(e.message));
  }, [tab, search]);

  useEffect(load, [load]);

  async function handleDelete(id: number) {
    if (!confirm("Hapus surat jalan ini?")) return;
    try {
      await deleteSuratJalan(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus surat jalan.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">Surat Jalan</h1>
          <p className="text-xs text-slate-500">Pengiriman barang ke klien.</p>
        </div>
        <Link href="/surat-jalan/create/" className="shrink-0 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium">
          + Surat Jalan
        </Link>
      </div>

      <input
        placeholder="Cari no. SJ atau nama penerima..."
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
        {list.map((sj) => (
          <div key={sj.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/surat-jalan/detail/?id=${sj.id}`} className="text-sm font-semibold text-blue-600">
                  {sj.suratJalanNumber}
                </Link>
                <p className="text-sm">{sj.recipientName}</p>
              </div>
              <StatusBadge status={sj.status} />
            </div>
            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
              <p>Ref. invoice: {sj.invoiceNumber ?? "-"}</p>
              <p>Kirim: {formatDate(sj.deliveryDate, true)} • Driver: {sj.driverName}</p>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <Link href={`/surat-jalan/detail/?id=${sj.id}`} className="flex-1 text-center text-xs rounded-lg border border-slate-200 py-2">
                Lihat
              </Link>
              <button onClick={() => handleDelete(sj.id)} className="flex-1 text-xs rounded-lg border border-red-200 text-red-600 py-2">
                Hapus
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && !error && <p className="text-sm text-slate-400 text-center py-8">Belum ada surat jalan.</p>}
      </div>
    </div>
  );
}
