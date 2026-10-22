"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteSuratJalan, getCompanySettings, getSuratJalanById, updateSuratJalanStatus } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { CompanySettingsResponse, SuratJalanResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ExportPdfButton from "@/components/ExportPdfButton";
import { readLogoDataUrl, useLogoDataUrl } from "@/lib/logo";
import { buildSuratJalanPdf } from "@/lib/pdf/suratJalanPdf";
import BackLink from "@/components/BackLink";

const STATUSES = ["Proses", "Terkirim", "Dibatalkan"];

export default function SuratJalanDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Memuat surat jalan...</p>}>
      <SuratJalanDetail />
    </Suspense>
  );
}

function SuratJalanDetail() {
  const id = Number(useSearchParams().get("id"));
  const router = useRouter();
  const [sj, setSj] = useState<SuratJalanResponse | null>(null);
  const [settings, setSettings] = useState<CompanySettingsResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const logo = useLogoDataUrl(settings?.logoUrl);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getSuratJalanById(id)
      .then((r) => (r ? setSj(r) : setNotFound(true)))
      .catch((e) => setError(e.message));
    getCompanySettings().then(setSettings).catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  async function handleStatus(status: string) {
    try {
      setSj(await updateSuratJalanStatus(id, status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus surat jalan ini?")) return;
    try {
      await deleteSuratJalan(id);
      router.replace("/surat-jalan/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus surat jalan.");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (notFound) return <p className="text-sm text-slate-500">Surat jalan tidak ditemukan.</p>;
  if (!sj || !settings) return <p className="text-sm text-slate-400">Memuat surat jalan...</p>;

  return (
    <div>
      <BackLink href="/surat-jalan/" label="Daftar Surat Jalan" />
      <h1 className="text-xl font-bold mb-4">Pratinjau Surat Jalan</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm">
        <div className="border-b border-slate-200 pb-4 mb-4 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="Logo" className="w-12 h-12 object-contain shrink-0" />}
          <div className="min-w-0">
          <p className="font-bold text-base">{settings.companyName}</p>
          {settings.address && <p className="text-xs text-slate-500">{settings.address}</p>}
          {(settings.phone || settings.email) && (
            <p className="text-xs text-slate-500">
              {settings.phone && `Telp: ${settings.phone}`}
              {settings.phone && settings.email && " • "}
              {settings.email && `Email: ${settings.email}`}
            </p>
          )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">SURAT JALAN</h2>
            <p className="text-blue-600 font-semibold">{sj.suratJalanNumber}</p>
            <p className="text-xs text-slate-400">Ref. Invoice: {sj.invoiceNumber ?? "-"}</p>
          </div>
          <StatusBadge status={sj.status} />
        </div>

        <div className="mb-4">
          <p className="text-[11px] uppercase text-slate-400 font-medium">Kepada / Penerima</p>
          <p className="font-semibold">{sj.clientName}</p>
          <p className="text-slate-500">{sj.deliveryAddress}</p>
        </div>
        <div className="text-xs space-y-0.5 mb-4">
          <p><span className="text-slate-400">Tanggal Pengiriman: </span>{formatDate(sj.deliveryDate, true)}</p>
          <p><span className="text-slate-400">Driver: </span>{sj.driverName}</p>
          <p><span className="text-slate-400">No. Kendaraan: </span>{sj.vehicleNumber}</p>
        </div>

        <div className="border-t border-slate-200">
          {sj.items.map((item, index) => (
            <div key={index} className="py-3 border-b border-slate-100 flex justify-between gap-3">
              <div>
                <p className="font-medium">{index + 1}. {item.itemDescription}</p>
                {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
              </div>
              <p className="shrink-0 text-slate-700">{item.quantity} {item.unit}</p>
            </div>
          ))}
        </div>

        {sj.notes && (
          <div className="mt-4">
            <p className="text-[11px] uppercase text-slate-400 font-medium mb-1">Catatan Pengiriman</p>
            <p className="text-slate-600 whitespace-pre-line">{sj.notes}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mt-8 text-center">
          <div>
            <p className="text-slate-500 mb-10">Pengirim,</p>
            <p className="border-t border-slate-300 pt-1 text-xs text-slate-400">( Nama & Tanda Tangan )</p>
          </div>
          <div>
            <p className="text-slate-500 mb-10">Penerima,</p>
            <p className="border-t border-slate-300 pt-1 text-xs text-slate-400">( Nama & Tanda Tangan )</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ExportPdfButton
          title={`Surat Jalan ${sj.suratJalanNumber}`}
          build={async () => buildSuratJalanPdf(sj, settings, await readLogoDataUrl(settings.logoUrl))}
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-slate-500 mb-2">Ubah status</p>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              disabled={sj.status === s}
              className={`rounded-lg border py-2 text-xs ${sj.status === s ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 bg-white"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={handleDelete} className="w-full mt-3 rounded-lg border border-red-200 text-red-600 py-2.5 text-sm">Hapus Surat Jalan</button>
      </div>
    </div>
  );
}
