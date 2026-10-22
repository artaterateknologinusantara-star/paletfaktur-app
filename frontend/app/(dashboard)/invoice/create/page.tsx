"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, formatDate, formatRupiah } from "@/lib/api";
import { ClientResponse, CompanySettingsResponse, ProductResponse, QuotationResponse } from "@/lib/types";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr) return dateStr;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [quotationId, setQuotationId] = useState<number | "">("");
  const [loaded, setLoaded] = useState(false);

  const [applyTax, setApplyTax] = useState(true);
  const [issueDate, setIssueDate] = useState(todayDateString());
  const [dueDate, setDueDate] = useState("");
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [invoiceDueDays, setInvoiceDueDays] = useState(30);
  const [poNumber, setPoNumber] = useState("");
  const [ppnRatePercent, setPpnRatePercent] = useState(12);
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<QuotationResponse[]>("/quotations"),
      apiRequest<ClientResponse[]>("/clients"),
      apiRequest<ProductResponse[]>("/products"),
      apiRequest<CompanySettingsResponse>("/settings"),
    ])
      .then(([q, c, p, s]) => {
        const ready = q.filter((x) => x.status === "Disetujui" && x.invoiceId === null);
        setQuotations(ready);
        setClients(c);
        setProducts(p);
        setInvoiceDueDays(s.invoiceDueDays);
        setPpnRatePercent(s.ppnRate * 100);

        // Datang dari tombol "Buat Invoice" di daftar penawaran: ?quotationId=..
        const preselect = Number(new URLSearchParams(window.location.search).get("quotationId"));
        if (preselect && ready.some((x) => x.id === preselect)) setQuotationId(preselect);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!dueDateTouched) {
      setDueDate(addDaysToDateString(issueDate, invoiceDueDays));
    }
  }, [issueDate, invoiceDueDays, dueDateTouched]);

  const quotation = quotations.find((q) => q.id === quotationId);
  const client = quotation ? clients.find((c) => c.id === quotation.clientId) : undefined;

  // Baris penawaran + status keterhubungan katalog dan stok. Barang tidak bisa diubah di sini.
  const rows = useMemo(() => {
    if (!quotation) return [];
    const needed = new Map<number, number>();
    for (const item of quotation.items) {
      if (item.productId) needed.set(item.productId, (needed.get(item.productId) ?? 0) + item.quantity);
    }
    return quotation.items.map((item) => {
      const product = item.productId ? products.find((p) => p.id === item.productId) : undefined;
      let problem: string | null = null;
      if (!item.productId) problem = "Belum terhubung ke katalog inventori. Edit penawaran dan pilih barang dari inventori.";
      else if (!product) problem = "Barang sudah tidak ada di katalog.";
      else if ((needed.get(product.id) ?? 0) > product.stock) {
        problem = `Stok tidak cukup (butuh ${needed.get(product.id)}, tersedia ${product.stock}).`;
      }
      return { item, product, problem };
    });
  }, [quotation, products]);

  const hasProblems = rows.some((r) => r.problem);
  const subtotal = quotation ? quotation.total : 0;
  const dppNilaiLain = useMemo(() => Math.round((subtotal * 11) / 12), [subtotal]);
  const ppnAmount = useMemo(
    () => (applyTax ? Math.round(dppNilaiLain * (ppnRatePercent / 100)) : 0),
    [applyTax, dppNilaiLain, ppnRatePercent]
  );
  const total = applyTax ? subtotal + ppnAmount : subtotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quotation) {
      setError("Pilih penawaran yang sudah disetujui terlebih dahulu.");
      return;
    }
    if (hasProblems) {
      setError("Perbaiki barang bermasalah (katalog / stok) sebelum menyimpan.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/invoices", {
        method: "POST",
        body: {
          quotationId: quotation.id,
          issueDate,
          dueDate,
          poNumber: poNumber || null,
          applyTax,
          ppnRateOverride: applyTax ? ppnRatePercent / 100 : null,
          notes: notes || null,
        },
      });
      router.push("/invoice");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/invoice"
            className="w-9 h-9 shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Buat Invoice dari Penawaran</h1>
            <p className="text-sm text-slate-500">Barang, jumlah, dan harga diambil dari penawaran yang sudah disetujui.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/invoice" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting || !quotation || hasProblems}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "💾 Daftarkan Invoice & Potong Stok"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {loaded && quotations.length === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada penawaran yang siap diinvoice. Invoice hanya bisa dibuat dari penawaran berstatus <b>Disetujui</b> yang belum
          punya invoice.{" "}
          <Link href="/penawaran" className="font-medium underline">
            Buka daftar penawaran
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Faktur Pajak</span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            applyTax ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {applyTax ? "Aktif" : "Tidak Aktif"}
        </span>
        <button
          type="button"
          onClick={() => setApplyTax((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors ${applyTax ? "bg-blue-600" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              applyTax ? "translate-x-5" : ""
            }`}
          />
        </button>
        <span className="text-xs text-slate-400">
          {applyTax
            ? "ⓘ Faktur pajak akan ditampilkan dan perhitungan akan termasuk pajak."
            : "ⓘ Faktur pajak tidak akan ditampilkan dan perhitungan tidak termasuk pajak."}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-3">Penawaran Disetujui</h2>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pilih Penawaran</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={quotationId}
              onChange={(e) => setQuotationId(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">Pilih penawaran...</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quotationNumber} — {q.recipientName}
                </option>
              ))}
            </select>

            <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-3 min-h-[76px] flex items-center justify-center">
              {quotation ? (
                <div className="w-full text-xs text-slate-600 space-y-0.5">
                  <p className="font-semibold text-slate-800 text-sm">{quotation.recipientName}</p>
                  {client?.address && <p>{client.address}</p>}
                  {client?.email && <p>{client.email}</p>}
                  {client?.phone && <p>{client.phone}</p>}
                  <p className="text-slate-400 pt-1">Tgl. penawaran: {formatDate(quotation.quotationDate)}</p>
                  {!client && (
                    <p className="text-amber-600 pt-1">Penerima belum terdaftar sebagai klien; klien baru dibuat otomatis saat invoice disimpan.</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Penawaran belum dipilih.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-1">Jadwal Pembayaran</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Invoice</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Jatuh Tempo (Due Date)</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setDueDateTouched(true);
                }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nomor PO (opsional)</label>
              <input
                type="text"
                placeholder="Contoh: PO-20260526"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase">Produk / Layanan (dari penawaran)</h2>
              {quotation && (
                <Link href={`/penawaran/${quotation.id}`} className="text-xs text-blue-600 hover:underline">
                  Lihat penawaran {quotation.quotationNumber}
                </Link>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-2 font-medium w-8">#</th>
                  <th className="py-2 px-2 font-medium">Produk / Layanan</th>
                  <th className="py-2 px-2 font-medium w-16 text-right">Qty</th>
                  <th className="py-2 px-2 font-medium w-32 text-right">Harga Satuan</th>
                  <th className="py-2 pl-2 font-medium w-32 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, product, problem }, index) => (
                  <tr key={index} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="py-2 pr-2 text-slate-400">{index + 1}</td>
                    <td className="py-2 px-2">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {[item.condition, item.color].filter(Boolean).join(" · ")}
                        {product ? `${item.condition || item.color ? " · " : ""}${product.sku} (stok ${product.stock})` : ""}
                      </p>
                      {problem && <p className="text-[11px] text-red-600 mt-1">{problem}</p>}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2 px-2 text-right">{formatRupiah(item.unitPrice)}</td>
                    <td className="py-2 pl-2 text-right font-medium">{formatRupiah(item.lineTotal)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                      Pilih penawaran untuk menampilkan barangnya.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">{rows.length} item</span>
              <div className="text-sm">
                <span className="text-slate-400 mr-2">Subtotal (tanpa pajak)</span>
                <span className="font-semibold">{formatRupiah(subtotal)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-2">Catatan (opsional)</h2>
              <textarea
                rows={7}
                placeholder="Tulis catatan untuk invoice ini..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal Penjualan</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>

              {applyTax && (
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    DPP Nilai Lain
                    <span title="DPP Nilai Lain = Subtotal × 11/12, sesuai skema PPN Indonesia" className="text-slate-300 cursor-help">
                      ⓘ
                    </span>
                  </span>
                  <span>{formatRupiah(dppNilaiLain)}</span>
                </div>
              )}

              {applyTax && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Pajak Pertambahan Nilai (PPN)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs text-right"
                        value={ppnRatePercent}
                        onChange={(e) => setPpnRatePercent(Number(e.target.value))}
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 italic">
                    <span>Jumlah Pajak Terhitung</span>
                    <span>{formatRupiah(ppnAmount)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="font-semibold text-slate-800">Total Tagihan Akhir</span>
                <span className="font-bold text-blue-600 text-lg">{formatRupiah(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
