"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest, assetUrl } from "@/lib/api";
import { CompanySettingsResponse, SuratJalanResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import DocumentHeader from "@/components/DocumentHeader";
import SignatureBlock from "@/components/SignatureBlock";

const MIN_ROWS = 3;
const HEAD_RED = "#7a1410";

function longDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function SuratJalanPreviewPage() {
  const params = useParams<{ id: string }>();
  const [sj, setSj] = useState<SuratJalanResponse | null>(null);
  const [s, setS] = useState<CompanySettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(true);

  useEffect(() => {
    apiRequest<SuratJalanResponse>(`/suratjalan/${params.id}`).then(setSj).catch((e) => setError(e.message));
    apiRequest<CompanySettingsResponse>("/settings").then(setS).catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!sj || !s) return <p className="text-sm text-slate-400">Memuat surat jalan...</p>;

  const total = sj.items.reduce((sum, i) => sum + i.quantity, 0);
  const emptyRows = Math.max(0, MIN_ROWS - sj.items.length);
  const th = "border border-slate-300 px-2 py-1.5 font-bold text-center";
  const td = "border border-slate-300 px-3 py-1.5";
  const label = "py-1 pr-3 align-top whitespace-nowrap";

  return (
    <div>
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <Link href="/surat-jalan" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Surat Jalan</Link>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-3">
            Pratinjau Surat Jalan <StatusBadge status={sj.status} />
          </h1>
        </div>
        <div className="flex gap-3 items-center">
          {(s.signatureUrl || s.stampUrl) && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
              Sertakan tanda tangan digital
            </label>
          )}
          <Link href={`/surat-jalan/${sj.id}/edit`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Edit
          </Link>
          <button onClick={() => window.print()} className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700">
            🖨 Cetak / Simpan PDF
          </button>
        </div>
      </div>

      <div className="a4-sheet relative overflow-hidden bg-white rounded-xl border border-slate-200 px-12 py-10 text-[13px] print:text-[12px] text-black print:min-h-[268mm]">
        {s.logoUrl && (
          // Watermark logo perusahaan (samar) di bagian bawah kiri, seperti contoh.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(s.logoUrl)}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-0 bottom-0 w-[95mm] opacity-[0.12] mix-blend-multiply select-none"
          />
        )}

        <div className="relative">
          <DocumentHeader settings={s} />

          <div className="text-center mt-6">
            <h2 className="text-3xl font-extrabold tracking-tight leading-none">SURAT JALAN</h2>
            <p className="mt-1">
              No: <b>{sj.suratJalanNumber}</b>
            </p>
          </div>

          <div className="grid grid-cols-[1.6fr_1fr] gap-x-8 mt-6">
            <table className="self-start">
              <tbody>
                <tr>
                  <td className={label}>Tanggal Pengiriman</td>
                  <td className="py-1 pr-2 align-top">:</td>
                  <td className="py-1">{longDate(sj.deliveryDate)}</td>
                </tr>
                <tr>
                  <td className={label}>Penerima</td>
                  <td className="py-1 pr-2 align-top">:</td>
                  <td className="py-1 font-bold uppercase">
                    <p>{sj.clientName}</p>
                    {sj.recipientDescription && <p>{sj.recipientDescription}</p>}
                  </td>
                </tr>
                <tr>
                  <td className={`${label} pt-3`}>Alamat Pengiriman</td>
                  <td className="py-1 pr-2 align-top pt-3"></td>
                  <td className="py-1 pt-3 whitespace-pre-line">{sj.deliveryAddress}</td>
                </tr>
              </tbody>
            </table>

            <table className="self-start">
              <tbody>
                <tr>
                  <td className={label}>Nomor P.O</td>
                  <td className="py-1">: {sj.poNumber}</td>
                </tr>
                <tr>
                  <td className={label}>Nomor Plat Mobil</td>
                  <td className="py-1">: {sj.vehicleNumber}</td>
                </tr>
                {sj.driverName && (
                  <tr>
                    <td className={label}>Nama Sopir</td>
                    <td className="py-1">: {sj.driverName}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <table className="w-full border-collapse mt-8">
            <thead>
              <tr style={{ backgroundColor: HEAD_RED }} className="text-white">
                <th className={`${th} w-10`}>No.</th>
                <th className={th}>Nama Barang</th>
                <th className={`${th} w-32`}>Warna</th>
                <th className={`${th} w-24`}>Satuan</th>
                <th className={`${th} w-28`}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {sj.items.map((item, i) => (
                <tr key={i}>
                  <td className={td}>{i + 1}</td>
                  <td className={`${td} font-bold`}>{item.itemDescription}</td>
                  <td className={`${td} text-center`}>{item.color}</td>
                  <td className={`${td} text-center`}>{item.unit}</td>
                  <td className={`${td} text-center`}>{item.quantity}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`e${i}`} className="h-9">
                  <td className={td}>{sj.items.length + i + 1}</td>
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
                </tr>
              ))}
              <tr>
                <td colSpan={4} className={`${td} font-bold text-base`}>
                  TOTAL
                </td>
                <td className={`${td} text-center font-bold text-base`}>{total}</td>
              </tr>
            </tbody>
          </table>

          {sj.notes && <p className="mt-3 text-xs whitespace-pre-line">Catatan: {sj.notes}</p>}

          <div className="break-inside-avoid">
          <p className="text-center mt-6">Mengetahui,</p>

          <div className="grid grid-cols-2 gap-12 mt-6">
            <div>
              <p className="tracking-[0.12em]">{sj.clientName}</p>
              <div className="h-14" />
              <p>
                ( <span className="inline-block w-56 border-b border-black align-bottom">&nbsp;</span> )
              </p>
            </div>
            <div className="text-center">
              <p className="tracking-[0.12em]">{s.companyName}</p>
              <SignatureBlock settings={s} show={signed} className="h-14" />
              <p>
                ({" "}
                <span className="inline-block min-w-56 border-b border-black px-4 align-bottom">{s.signatoryName || " "}</span>{" "}
                )
              </p>
            </div>
          </div>

          <div className="mt-5 text-center leading-7">
            <p>
              <b>DITERIMA</b> pada,
            </p>
            <p>
              tanggal : <span className="inline-block w-64 border-b border-black align-bottom">&nbsp;</span>
            </p>
            <p>
              jam : <span className="inline-block w-64 border-b border-black align-bottom">&nbsp;</span>
            </p>
            <p>Bagian Pengiriman</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
