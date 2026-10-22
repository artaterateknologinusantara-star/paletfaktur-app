"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest, assetUrl, formatRupiah } from "@/lib/api";
import { CompanySettingsResponse, InvoiceResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import SignatureBlock from "@/components/SignatureBlock";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

const MIN_ROWS = 3;
const HEAD_MAROON = "#4a0a0a";

function longDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
}

export default function InvoicePreviewPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [settings, setSettings] = useState<CompanySettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(true);

  useEffect(() => {
    apiRequest<InvoiceResponse>(`/invoices/${params.id}`).then(setInvoice).catch((e) => setError(e.message));
    apiRequest<CompanySettingsResponse>("/settings").then(setSettings).catch((e) => setError(e.message));
  }, [params.id]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!invoice || !settings) {
    return <p className="text-sm text-slate-400">Memuat faktur...</p>;
  }

  const s = settings;
  const emptyRows = Math.max(0, MIN_ROWS - invoice.items.length);
  const noteLines = (invoice.notes ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const termDays = daysBetween(invoice.issueDate, invoice.dueDate);
  const th = "border border-slate-300 px-2 py-2 font-bold text-center";
  const td = "border border-slate-300 px-2 py-1.5";
  const sumLabel = "border border-slate-300 px-2 py-1";
  const sumValue = "border border-slate-300 px-2 py-1 text-right font-bold whitespace-nowrap";

  return (
    <div>
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <Link href="/invoice" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Invoice</Link>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-3">
            Pratinjau Faktur Resmi <StatusBadge status={invoice.status} />
          </h1>
        </div>
        <div className="flex gap-3 items-center">
          {(settings.signatureUrl || settings.stampUrl) && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
              Sertakan tanda tangan digital
            </label>
          )}
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700"
          >
            🖨 Cetak / Simpan PDF
          </button>
        </div>
      </div>

      <div className="a4-sheet relative overflow-hidden bg-white rounded-xl border border-slate-200 px-12 py-10 text-[13px] print:text-[12px] text-black flex flex-col print:min-h-[268mm]">
        {s.logoUrl && (
          // Watermark logo (samar) di bagian bawah kiri.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(s.logoUrl)}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-0 bottom-0 w-[90mm] opacity-[0.12] mix-blend-multiply select-none"
          />
        )}

        <div className="relative flex-1">
          <DocumentHeader settings={s} />

          <div className="text-center mt-4">
            <h2 className="text-2xl font-extrabold tracking-[0.5em] pl-[0.5em]">INVOICE</h2>
            <p>
              No: <b>{invoice.invoiceNumber}</b>
            </p>
          </div>

          <div className="flex justify-between items-start mt-4">
            <div className="max-w-[60%]">
              <p className="mb-3">Kepada:</p>
              <p className="font-bold uppercase text-sm">{invoice.clientName}</p>
              {invoice.clientAddress && <p className="whitespace-pre-line mt-1">{invoice.clientAddress}</p>}
            </div>
            <table>
              <tbody>
                <tr>
                  <td className="pr-6 py-0.5">Tanggal</td>
                  <td>: {longDate(invoice.issueDate)}</td>
                </tr>
                <tr>
                  <td className="pr-6 py-0.5">Jatuh Tempo</td>
                  <td>: {termDays} Hari</td>
                </tr>
                {invoice.poNumber && (
                  <tr>
                    <td className="pr-6 py-0.5 pt-3">Nomor P.O</td>
                    <td className="pt-3">: {invoice.poNumber}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <table className="w-full border-collapse mt-4 text-xs">
            <thead>
              <tr style={{ backgroundColor: HEAD_MAROON }} className="text-white">
                <th className={`${th} w-10`}>No.</th>
                <th className={th}>
                  Nama Barang <i>(p x l x t)</i>
                </th>
                <th className={`${th} w-20`}>Kondisi</th>
                <th className={`${th} w-20`}>Warna</th>
                <th className={`${th} w-28`}>Harga Satuan</th>
                <th className={`${th} w-12`}>Qty</th>
                <th className={`${th} w-32`}>Harga</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td className={`${td} text-center font-bold`}>{i + 1}</td>
                  <td className={`${td} font-bold`}>{item.description || item.productName}</td>
                  <td className={`${td} text-center font-bold`}>{item.condition}</td>
                  <td className={`${td} text-center`}>{item.color}</td>
                  <td className={`${td} text-center font-bold whitespace-nowrap`}>{formatRupiah(item.unitPrice)}</td>
                  <td className={`${td} text-center font-bold`}>{item.quantity}</td>
                  <td className={`${td} text-right font-bold whitespace-nowrap`}>{formatRupiah(item.lineTotal)}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`e${i}`} className="h-8">
                  <td className={`${td} text-center font-bold`}>{invoice.items.length + i + 1}</td>
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
                  <td className={td} />
                </tr>
              ))}
              {invoice.applyTax && (
                <>
                  <tr>
                    <td colSpan={6} className={sumLabel}>Total</td>
                    <td className={sumValue}>{formatRupiah(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={6} className={sumLabel}>DPP Nilai Lain</td>
                    <td className={sumValue}>{formatRupiah(invoice.dppNilaiLain)}</td>
                  </tr>
                  <tr>
                    <td colSpan={6} className={sumLabel}>VAT</td>
                    <td className={sumValue}>{formatRupiah(invoice.ppnAmount)}</td>
                  </tr>
                  <tr className="h-5">
                    <td colSpan={6} className={sumLabel} />
                    <td className={sumValue} />
                  </tr>
                </>
              )}
              <tr>
                <td colSpan={6} className={`${sumLabel} font-bold text-sm`}>TOTAL HARGA</td>
                <td className={`${sumValue} text-sm`}>{formatRupiah(invoice.total)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3">
            <p className="italic">Catatan</p>
            <ul className="list-disc ml-8 min-h-6">
              {noteLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between items-start mt-6 break-inside-avoid">
            <div className="leading-snug">
              <p className="font-bold">PEMBAYARAN :</p>
              <p>Transfer via Bank</p>
              <table>
                <tbody>
                  <tr>
                    <td className="pr-8">Nama Bank</td>
                    <td>
                      : <b className="uppercase">{s.bankName}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>No. Rekening</td>
                    <td>
                      : <b>{s.bankAccountNumber}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>Atas Nama</td>
                    <td>
                      : <b className="uppercase">{s.bankAccountHolder}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="min-w-[220px]">
              <p>{s.companyName},</p>
              <SignatureBlock settings={s} show={signed} className="h-14" />
              <p className="font-bold border-b border-black inline-block min-w-[200px] text-center">( {s.signatoryName} )</p>
            </div>
          </div>
        </div>

        <div className="relative mt-4 break-inside-avoid">
          <DocumentFooter settings={s} />
        </div>
      </div>
    </div>
  );
}
