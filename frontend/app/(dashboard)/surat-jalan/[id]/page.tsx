"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest, assetUrl, formatDate } from "@/lib/api";
import { CompanySettingsResponse, SuratJalanResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export default function SuratJalanPreviewPage() {
  const params = useParams<{ id: string }>();
  const [suratJalan, setSuratJalan] = useState<SuratJalanResponse | null>(null);
  const [settings, setSettings] = useState<CompanySettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<SuratJalanResponse>(`/suratjalan/${params.id}`).then(setSuratJalan).catch((e) => setError(e.message));
    apiRequest<CompanySettingsResponse>("/settings").then(setSettings).catch((e) => setError(e.message));
  }, [params.id]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!suratJalan || !settings) {
    return <p className="text-sm text-slate-400">Memuat surat jalan...</p>;
  }

  return (
    <div>
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <Link href="/surat-jalan" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Surat Jalan</Link>
          <h1 className="text-2xl font-bold mt-1">Pratinjau Surat Jalan</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700"
        >
          🖨 Cetak
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 print:border-0 print:rounded-none p-10 max-w-4xl mx-auto text-sm">
        {/* Kop surat */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
          <div className="flex items-center gap-3">
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(settings.logoUrl)} alt="Logo" className="w-14 h-14 object-contain" />
            )}
            <div>
              <p className="font-bold text-base">{settings.companyName}</p>
              <p className="text-xs text-slate-500 max-w-xs">{settings.address}</p>
              <p className="text-xs text-slate-500">Telp: {settings.phone} • Email: {settings.email}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-800">SURAT JALAN</h2>
            <p className="text-blue-600 font-semibold">{suratJalan.suratJalanNumber}</p>
            <p className="text-xs text-slate-400">Ref. Invoice: {suratJalan.invoiceNumber ?? "-"}</p>
            <div className="mt-1 print:hidden"><StatusBadge status={suratJalan.status} /></div>
          </div>
        </div>

        {/* Info pengiriman */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-1">
            <p className="text-xs uppercase text-slate-400 font-medium mb-1">Kepada / Penerima</p>
            <p className="font-semibold">{suratJalan.clientName}</p>
            <p className="text-slate-500">{suratJalan.deliveryAddress}</p>
          </div>
          <div className="text-right space-y-0.5">
            <p><span className="text-slate-400">Tanggal Pengiriman: </span>{formatDate(suratJalan.deliveryDate)}</p>
            <p><span className="text-slate-400">Nama Pengantar / Driver: </span>{suratJalan.driverName}</p>
            <p><span className="text-slate-400">No. Kendaraan: </span>{suratJalan.vehicleNumber}</p>
          </div>
        </div>

        {/* Tabel barang */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="py-2 font-medium w-8">#</th>
              <th className="py-2 font-medium">Nama / Deskripsi Barang</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium">Satuan</th>
              <th className="py-2 font-medium">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {suratJalan.items.map((item, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="py-2 text-slate-400">{index + 1}</td>
                <td className="py-2">{item.itemDescription}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2">{item.unit}</td>
                <td className="py-2 text-slate-500">{item.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Catatan pengiriman */}
        {suratJalan.notes && (
          <div className="mb-6">
            <p className="text-xs uppercase text-slate-400 font-medium mb-1">Catatan Pengiriman</p>
            <p className="text-slate-600 whitespace-pre-line">{suratJalan.notes}</p>
          </div>
        )}

        {/* Tanda tangan */}
        <div className="grid grid-cols-2 gap-12 mt-16">
          <div className="text-center">
            <p className="text-slate-500 mb-16">Pengirim,</p>
            <div className="border-t border-slate-300 pt-1">
              <p className="text-xs text-slate-400">( Nama & Tanda Tangan )</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-slate-500 mb-16">Penerima,</p>
            <div className="border-t border-slate-300 pt-1">
              <p className="text-xs text-slate-400">( Nama & Tanda Tangan )</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
