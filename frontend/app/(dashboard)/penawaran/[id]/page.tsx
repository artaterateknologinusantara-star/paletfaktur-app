"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest, assetUrl, formatRupiah } from "@/lib/api";
import { CompanySettingsResponse, QuotationResponse } from "@/lib/types";
import SignatureBlock from "@/components/SignatureBlock";

const MIN_ROWS = 5;
const HEAD_BLUE = "#2f5597";

function longDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function PenawaranPreviewPage() {
  const params = useParams<{ id: string }>();
  const [q, setQ] = useState<QuotationResponse | null>(null);
  const [s, setS] = useState<CompanySettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(true);

  useEffect(() => {
    apiRequest<QuotationResponse>(`/quotations/${params.id}`).then(setQ).catch((e) => setError(e.message));
    apiRequest<CompanySettingsResponse>("/settings").then(setS).catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!q || !s) return <p className="text-sm text-slate-400">Memuat penawaran...</p>;

  const emptyRows = Math.max(0, MIN_ROWS - q.items.length);
  const cell = "border border-slate-400 px-2 py-1.5 text-center";
  const contact = [s.website, s.phone].filter(Boolean).join(" | ");

  const kop = (
    <div className="flex items-center gap-4 border-b-[3px] border-black pb-3">
      <div className="w-24 h-24 shrink-0 flex items-center justify-center">
        {s.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(s.logoUrl)} alt="Logo" className="max-w-full max-h-full object-contain mix-blend-multiply" />
        )}
      </div>
      <div className="flex-1 text-center">
        <p className="text-3xl font-extrabold leading-tight">{s.companyName}</p>
        {s.tagline && <p className="font-bold text-base mt-1">{s.tagline}</p>}
        {s.address && <p className="text-[10px] font-medium mt-1">{s.address}</p>}
        {(contact || s.email) && <p className="text-[10px] font-medium">{contact}</p>}
      </div>
    </div>
  );
  const footer = (
    <div className="border-t-[3px] border-black mt-4 pt-2 break-inside-avoid flex justify-between text-[9px] leading-snug">
      <div>
        <p className="font-bold">{s.companyName}</p>
        <p>Kantor Pusat:</p>
        <p className="max-w-xs">{s.address}</p>
      </div>
      <div>
        <p className="font-bold">Contact</p>
        {s.phone && <p>No. HP : {s.phone}</p>}
        {s.email && <p>Email : {s.email}</p>}
        {s.website && <p>Website : {s.website}</p>}
      </div>
    </div>
  );
  // Makin banyak foto, makin kecil tinggi maksimum tiap foto agar lampiran + footer muat satu halaman.
  const photoMax = q.photos.length <= 2 ? "max-h-[120mm]" : q.photos.length <= 4 ? "max-h-[72mm]" : "max-h-[50mm]";
  const captions = q.photos.map((p) => p.caption?.trim()).filter(Boolean) as string[];
  const page = "bg-white rounded-xl border border-slate-200 print:border-0 print:rounded-none a4-sheet px-12 py-8 text-[13px] print:text-[12px] text-black flex flex-col print:min-h-[268mm]";

  return (
    <div>
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <Link href="/penawaran" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Penawaran</Link>
          <h1 className="text-2xl font-bold mt-1">Pratinjau Surat Penawaran</h1>
        </div>
        <div className="flex gap-3 items-center">
          {(s.signatureUrl || s.stampUrl) && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
              Sertakan tanda tangan digital
            </label>
          )}
          <Link href={`/penawaran/${q.id}/edit`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Edit
          </Link>
          <button onClick={() => window.print()} className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700">
            🖨 Cetak / Simpan PDF
          </button>
        </div>
      </div>

      <div className={page}>
        <div className="flex-1">
          {kop}

          <h2 className="text-center font-bold underline text-base mt-2">SURAT PENAWARAN HARGA</h2>
          <p className="text-right mt-1">
            {s.city ? `${s.city}, ` : ""}
            {longDate(q.quotationDate)}
          </p>

          <table className="mt-1">
            <tbody>
              <tr><td className="pr-6 py-0.5">Nomor</td><td>: {q.quotationNumber}</td></tr>
              {q.attachment && <tr><td className="pr-6 py-0.5">Lampiran</td><td>: {q.attachment}</td></tr>}
              <tr><td className="pr-6 py-0.5">Hal</td><td>: {q.subject}</td></tr>
              <tr><td className="pr-6 py-0.5">Kepada</td><td>:</td></tr>
            </tbody>
          </table>
          <p className="font-bold mt-2 ml-6 text-sm">{q.recipientName}</p>

          <div className="mt-4 space-y-1 text-justify">
            <p>Dengan hormat,</p>
            {q.introText ? (
              <p className="whitespace-pre-line">{q.introText}</p>
            ) : (
              <p>
                Kami dari {s.companyName}, supplier pallet plastik serta keranjang plastik, bermaksud menawarkan produk kami kepada{" "}
                <b>{q.recipientName}</b>. Penawaran berikut dalam rangka mendukung kebutuhan pelanggan baru.
              </p>
            )}
          </div>

          <p className="mt-3 mb-1">Berikut daftar harga Pallet Plastik yang kami tawarkan:</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: HEAD_BLUE }} className="text-white">
                {["No.", "Ukuran (p x l x t)", "Kondisi", "Warna", "Harga Satuan", "Jumlah", "Harga"].map((h) => (
                  <th key={h} className="border border-slate-400 px-2 py-1.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.items.map((it, i) => (
                <tr key={i}>
                  <td className={cell}>{i + 1}</td>
                  <td className={`${cell} font-bold`}>{it.name}</td>
                  <td className={`${cell} font-bold`}>{it.condition}</td>
                  <td className={`${cell} font-bold`}>{it.color}</td>
                  <td className={`${cell} font-bold`}>{formatRupiah(it.unitPrice)}</td>
                  <td className={`${cell} font-bold`}>{it.quantity} {it.unit}</td>
                  <td className="border border-slate-400 px-2 py-1.5 text-right font-bold">{formatRupiah(it.lineTotal)}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`e${i}`} className="h-6">
                  {Array.from({ length: 7 }).map((__, c) => (
                    <td key={c} className="border border-slate-400" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {q.notes && (
            <div className="mt-3 flex gap-4">
              <span className="underline italic">Catatan :</span>
              <p className="font-bold whitespace-pre-line">{q.notes}</p>
            </div>
          )}

          <div className="mt-4 space-y-1 text-justify">
            <p>
              Jika berminat dengan penawaran kami dan ada pertanyaan mengenai perihal surat penawaran ini kami persilakan untuk menghubungi ke
              nomor <b>{s.phone}</b>.
            </p>
            <p>
              Demikian surat penawaran harga ini kami sampaikan dengan harapan Bapak/Ibu berminat pada produk yang kami tawarkan. Atas
              perhatian dan kerjasamanya, kami mengucapkan terima kasih.
            </p>
          </div>

          <div className="mt-5 flex justify-between items-start">
            <div className="text-sm leading-relaxed">
              {s.bankAccountNumber && (
                <>
                  <p>Pembayaran via transfer :</p>
                  <p>Nama Bank : {s.bankName}</p>
                  <p>No rekening : {s.bankAccountNumber}</p>
                  <p>Atas nama : {s.bankAccountHolder}</p>
                </>
              )}
            </div>
            <div className="text-sm text-left min-w-[200px]">
              <p>Salam hangat,</p>
              <p>{s.companyName}</p>
              <SignatureBlock settings={s} show={signed} className="h-14" />
              <p className="font-bold border-t border-black pt-1 inline-block min-w-[200px]">{s.signatoryName}</p>
              {s.signatoryTitle && <p className="text-xs">{s.signatoryTitle}</p>}
            </div>
          </div>
        </div>

        {footer}
      </div>

      {q.photos.length > 0 && (
        <div className={`${page} mt-6 print:mt-0 print:break-before-page`}>
          <div className="flex-1">
            {kop}
            <p className="font-bold mt-4">Hal : Lampiran</p>
            {captions.length > 0 && (
              <ol className="mt-3 space-y-1 list-decimal list-inside">
                {captions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            )}
            <div className="grid grid-cols-2 gap-6 mt-8">
              {q.photos.map((p, i) => (
                <div key={i} className="break-inside-avoid flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(p.url)} alt={p.caption ?? `Foto ${i + 1}`} className={`max-w-full ${photoMax} object-contain`} />
                </div>
              ))}
            </div>
          </div>
          {footer}
        </div>
      )}
    </div>
  );
}
