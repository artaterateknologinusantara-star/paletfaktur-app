"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { deleteInvoice, getCompanySettings, getInvoiceById, markInvoicePaid } from "@/lib/db";
import { formatDate, formatRupiah } from "@/lib/format";
import type { CompanySettingsResponse, InvoiceResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ExportPdfButton from "@/components/ExportPdfButton";
import { readLogoDataUrl, useLogoDataUrl } from "@/lib/logo";
import { buildInvoicePdf } from "@/lib/pdf/invoicePdf";
import BackLink from "@/components/BackLink";

// Route dinamis /invoice/[id] tidak bisa di static export (ID baru ada saat runtime) -> /invoice/detail/?id=N
export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Memuat faktur...</p>}>
      <InvoiceDetail />
    </Suspense>
  );
}

function InvoiceDetail() {
  const id = Number(useSearchParams().get("id"));
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [settings, setSettings] = useState<CompanySettingsResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const logo = useLogoDataUrl(settings?.logoUrl);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getInvoiceById(id)
      .then((inv) => (inv ? setInvoice(inv) : setNotFound(true)))
      .catch((e) => setError(e.message));
    getCompanySettings().then(setSettings).catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  async function handleMarkPaid() {
    if (!confirm("Tandai invoice ini sebagai Lunas?")) return;
    try {
      await markInvoicePaid(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menandai invoice lunas.");
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus invoice ini? Stok yang terpakai akan dikembalikan.")) return;
    try {
      await deleteInvoice(id);
      router.replace("/invoice/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus invoice.");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (notFound) return <p className="text-sm text-slate-500">Invoice tidak ditemukan.</p>;
  if (!invoice || !settings) return <p className="text-sm text-slate-400">Memuat faktur...</p>;

  return (
    <div>
      <BackLink href="/invoice/" label="Daftar Invoice" />
      <h1 className="text-xl font-bold mb-4">Pratinjau Faktur</h1>

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
            <h2 className="text-lg font-bold text-slate-800">FAKTUR PENJUALAN</h2>
            <p className="text-blue-600 font-semibold">{invoice.invoiceNumber}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="mb-4">
          <p className="text-[11px] uppercase text-slate-400 font-medium">Ditagihkan Kepada</p>
          <p className="font-semibold">{invoice.clientName}</p>
        </div>
        <div className="text-xs space-y-0.5 mb-4">
          <p><span className="text-slate-400">Tgl. Penerbitan: </span>{formatDate(invoice.issueDate, true)}</p>
          <p><span className="text-slate-400">Jatuh Tempo: </span>{formatDate(invoice.dueDate, true)}</p>
          {invoice.poNumber && <p><span className="text-slate-400">No. PO: </span>{invoice.poNumber}</p>}
        </div>

        <div className="border-t border-slate-200">
          {invoice.items.map((item, index) => (
            <div key={index} className="py-3 border-b border-slate-100">
              <p className="text-xs text-slate-400">{item.productSku}</p>
              <p className="font-medium">{item.description || item.productName}</p>
              {item.description && <p className="text-xs text-slate-400">{item.productName}</p>}
              <div className="flex justify-between mt-1 text-slate-600">
                <span>{item.quantity} × {formatRupiah(item.unitPrice)}</span>
                <span className="font-medium text-slate-800">{formatRupiah(item.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>

        {invoice.notes && (
          <div className="mt-4">
            <p className="text-[11px] uppercase text-slate-400 font-medium mb-1">Catatan</p>
            <p className="text-slate-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        <div className="mt-4 space-y-1">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal Penjualan</span><span>{formatRupiah(invoice.subtotal)}</span></div>
          {invoice.applyTax && (
            <>
              <div className="flex justify-between"><span className="text-slate-500">DPP Nilai Lain</span><span>{formatRupiah(invoice.dppNilaiLain)}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">PPN ({Math.round(invoice.ppnRateUsed * 10000) / 100}%)</span>
                <span>{formatRupiah(invoice.ppnAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-semibold text-base border-t border-slate-200 pt-2">
            <span>Total</span><span>{formatRupiah(invoice.total)}</span>
          </div>
        </div>

        {settings.bankName && (
          <div className="mt-5">
            <p className="text-[11px] uppercase text-slate-400 font-medium mb-1">Pembayaran</p>
            <p className="text-slate-600">Transfer Bank ke:</p>
            <p className="font-semibold">{settings.bankName} {settings.bankAccountNumber}</p>
            {settings.bankAccountHolder && <p className="text-slate-500">a.n. {settings.bankAccountHolder}</p>}
          </div>
        )}

        {settings.signatoryName && (
          <div className="mt-8 text-right">
            <p className="text-slate-500 mb-10">Hormat kami,</p>
            <p className="font-semibold">{settings.signatoryName}</p>
            {settings.signatoryTitle && <p className="text-xs text-slate-500">{settings.signatoryTitle}</p>}
          </div>
        )}
      </div>

      <div className="mt-4">
        <ExportPdfButton
          title={`Faktur ${invoice.invoiceNumber}`}
          build={async () => buildInvoicePdf(invoice, settings, await readLogoDataUrl(settings.logoUrl))}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {invoice.status !== "Lunas" && invoice.status !== "Dibatalkan" && (
          <button onClick={handleMarkPaid} className="rounded-lg border border-emerald-200 text-emerald-700 py-2.5 text-sm">Tandai Lunas</button>
        )}
        <Link href={`/surat-jalan/create/?invoiceId=${invoice.id}`} className="rounded-lg border border-slate-200 py-2.5 text-sm text-center">Buat Surat Jalan</Link>
        <button onClick={handleDelete} className="rounded-lg border border-red-200 text-red-600 py-2.5 text-sm">Hapus Invoice</button>
      </div>
    </div>
  );
}
