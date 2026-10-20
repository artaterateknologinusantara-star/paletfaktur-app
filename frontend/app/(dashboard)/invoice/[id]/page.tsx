"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest, assetUrl, formatDate, formatRupiah } from "@/lib/api";
import { CompanySettingsResponse, InvoiceResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export default function InvoicePreviewPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [settings, setSettings] = useState<CompanySettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <Link href="/invoice" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Invoice</Link>
          <h1 className="text-2xl font-bold mt-1">Pratinjau Faktur Resmi</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700"
        >
          🖨 Cetak / Simpan PDF
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
            <h2 className="text-xl font-bold text-slate-800">FAKTUR PENJUALAN</h2>
            <p className="text-blue-600 font-semibold">{invoice.invoiceNumber}</p>
            <div className="mt-1 print:hidden"><StatusBadge status={invoice.status} /></div>
          </div>
        </div>

        {/* Info klien & tanggal */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase text-slate-400 font-medium mb-1">Ditagihkan Kepada</p>
            <p className="font-semibold">{invoice.clientName}</p>
            {invoice.clientAddress && <p className="text-slate-500 max-w-xs whitespace-pre-line">{invoice.clientAddress}</p>}
          </div>
          <div className="text-right space-y-0.5">
            <p><span className="text-slate-400">Tgl. Penerbitan: </span>{formatDate(invoice.issueDate)}</p>
            <p><span className="text-slate-400">Jatuh Tempo: </span>{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Tabel item */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="py-2 font-medium">Kode</th>
              <th className="py-2 font-medium">Nama Barang</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium text-right">Harga Satuan</th>
              <th className="py-2 font-medium text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="py-2">{item.productSku}</td>
                <td className="py-2">{item.productName}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatRupiah(item.unitPrice)}</td>
                <td className="py-2 text-right">{formatRupiah(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Catatan */}
        {invoice.notes && (
          <div className="mb-6">
            <p className="text-xs uppercase text-slate-400 font-medium mb-1">Catatan</p>
            <p className="text-slate-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Totals & Pembayaran */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase text-slate-400 font-medium mb-1">Pembayaran</p>
            <p className="text-slate-600">Transfer Bank ke:</p>
            <p className="font-semibold">{settings.bankName}</p>
            <p>{settings.bankAccountNumber}</p>
            <p className="text-slate-500">a.n. {settings.bankAccountHolder}</p>
          </div>
          <div className="space-y-1 max-w-xs ml-auto w-full">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal Penjualan</span><span>{formatRupiah(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">DPP Nilai Lain</span><span>{formatRupiah(invoice.dppNilaiLain)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">PPN</span><span>{formatRupiah(invoice.ppnAmount)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t border-slate-200 pt-2"><span>Total</span><span>{formatRupiah(invoice.total)}</span></div>
          </div>
        </div>

        {/* Tanda tangan */}
        <div className="flex justify-end mt-16">
          <div className="text-center">
            <p className="text-slate-500 mb-16">Hormat kami,</p>
            <p className="font-semibold border-t border-slate-300 pt-1">{settings.signatoryName}</p>
            <p className="text-xs text-slate-500">{settings.signatoryTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
