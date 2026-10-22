"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeInvoiceTotals, createInvoice, getClients, getCompanySettings, getProducts } from "@/lib/db";
import { addDaysToDateString, formatRupiah, todayLocal } from "@/lib/format";
import type { ClientResponse, ProductResponse } from "@/lib/types";
import BackLink from "@/components/BackLink";

interface LineItem {
  productId: number;
  description: string;
  // String agar field bisa dikosongkan saat mengetik (input number yang di-bind ke Number() langsung snap ke "0").
  quantity: string;
  unitPrice: string;
}

const num = (v: string) => (v.trim() === "" ? 0 : Number(v) || 0);

const newRow = (): LineItem => ({ productId: 0, description: "", quantity: "1", unitPrice: "0" });
const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-slate-600 mb-1";
const cardCls = "bg-white rounded-xl border border-slate-200 p-4 mb-4";

export default function CreateInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [clientId, setClientId] = useState<number | "">("");

  const [applyTax, setApplyTax] = useState(true);
  const [issueDate, setIssueDate] = useState(todayLocal());
  const [dueDate, setDueDate] = useState("");
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [invoiceDueDays, setInvoiceDueDays] = useState(30);
  const [poNumber, setPoNumber] = useState("");
  const [ppnRatePercent, setPpnRatePercent] = useState(12);
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<LineItem[]>([newRow()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getClients().then(setClients).catch((e) => setError(e.message));
    getProducts().then(setProducts).catch((e) => setError(e.message));
    getCompanySettings()
      .then((s) => {
        setInvoiceDueDays(s.invoiceDueDays);
        setPpnRatePercent(Math.round(s.ppnRate * 10000) / 100);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!dueDateTouched && issueDate) setDueDate(addDaysToDateString(issueDate, invoiceDueDays));
  }, [issueDate, invoiceDueDays, dueDateTouched]);

  const selectedClient = clients.find((c) => c.id === clientId);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleProductChange(index: number, productId: number) {
    const product = products.find((p) => p.id === productId);
    updateItem(index, { productId, unitPrice: String(product?.unitPrice ?? 0) });
  }

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + num(item.quantity) * num(item.unitPrice), 0), [items]);
  const totals = useMemo(() => computeInvoiceTotals(subtotal, applyTax, ppnRatePercent / 100), [subtotal, applyTax, ppnRatePercent]);

  // Produk yang sama di beberapa baris dijumlahkan untuk validasi stok.
  const stockErrors = useMemo(() => {
    const totalByProduct = new Map<number, number>();
    for (const item of items) {
      if (item.productId > 0) totalByProduct.set(item.productId, (totalByProduct.get(item.productId) ?? 0) + num(item.quantity));
    }
    const errors: Record<number, string> = {};
    items.forEach((item, index) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return;
      const totalQty = totalByProduct.get(item.productId) ?? 0;
      if (totalQty > product.stock) {
        errors[index] =
          totalQty !== num(item.quantity)
            ? `Total qty "${product.name}" di semua baris (${totalQty}) melebihi stok tersedia (${product.stock}).`
            : `Qty melebihi stok tersedia (${product.stock}).`;
      }
    });
    return errors;
  }, [items, products]);
  const hasStockErrors = Object.keys(stockErrors).length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return setError("Pilih klien terlebih dahulu.");
    const validItems = items.filter((i) => i.productId > 0 && num(i.quantity) > 0);
    if (validItems.length === 0) return setError("Tambahkan minimal satu barang.");
    if (hasStockErrors) return setError("Perbaiki qty yang melebihi stok tersedia sebelum menyimpan.");

    setSubmitting(true);
    setError(null);
    try {
      await createInvoice({
        clientId,
        issueDate,
        dueDate,
        poNumber: poNumber || null,
        applyTax,
        ppnRateOverride: applyTax ? ppnRatePercent / 100 : null,
        notes: notes || null,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: num(i.quantity),
          descriptionOverride: i.description || null,
          unitPriceOverride: num(i.unitPrice),
        })),
      });
      router.push("/invoice/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <BackLink href="/invoice/" label="Daftar Invoice" />
      <h1 className="text-xl font-bold mb-4">Buat Invoice</h1>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className={`${cardCls} flex items-center justify-between gap-3`}>
        <div>
          <p className="text-sm font-medium text-slate-700">Faktur Pajak</p>
          <p className="text-[11px] text-slate-400">{applyTax ? "Perhitungan termasuk PPN." : "Tanpa pajak."}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={applyTax}
          aria-label="Faktur Pajak"
          onClick={() => setApplyTax((v) => !v)}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${applyTax ? "bg-blue-600" : "bg-slate-300"}`}
        >
          <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${applyTax ? "translate-x-5" : ""}`} />
        </button>
      </div>

      <div className={cardCls}>
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-3">Klien</h2>
        <label className={labelCls}>Pilih Klien</label>
        <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Pilih klien...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {clients.length === 0 && <p className="text-xs text-amber-600 mt-2">Belum ada klien. Tambahkan dulu di menu Klien.</p>}
        {selectedClient && (
          <div className="mt-3 text-xs text-slate-600 space-y-0.5 rounded-lg border border-dashed border-slate-200 p-3">
            <p className="font-semibold text-slate-800 text-sm">{selectedClient.name}</p>
            {selectedClient.address && <p>{selectedClient.address}</p>}
            {selectedClient.email && <p>{selectedClient.email}</p>}
            {selectedClient.phone && <p>{selectedClient.phone}</p>}
          </div>
        )}
      </div>

      <div className={`${cardCls} space-y-3`}>
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase">Jadwal Pembayaran</h2>
        <div>
          <label className={labelCls}>Tanggal Invoice</label>
          <input type="date" required className={inputCls} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Jatuh Tempo</label>
          <input
            type="date"
            required
            className={inputCls}
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              setDueDateTouched(true);
            }}
          />
        </div>
        <div>
          <label className={labelCls}>Nomor PO (opsional)</label>
          <input className={inputCls} placeholder="Contoh: PO-20260526" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase">Produk / Layanan</h2>
        <button type="button" onClick={() => setItems((p) => [...p, newRow()])} className="text-xs rounded-lg bg-blue-50 text-blue-700 px-3 py-1.5 font-medium">
          + Tambah Produk
        </button>
      </div>

      {items.map((item, index) => {
        const rowError = stockErrors[index];
        return (
          <div key={index} className={`${cardCls} mb-3 ${rowError ? "border-red-300" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Item {index + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== index))} className="text-xs text-red-600 px-1">
                  Hapus baris
                </button>
              )}
            </div>
            <select className={inputCls} value={item.productId} onChange={(e) => handleProductChange(index, Number(e.target.value))}>
              <option value={0}>Pilih produk...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name} (stok {p.stock})</option>
              ))}
            </select>
            {rowError && <p className="text-[11px] text-red-600 mt-1">{rowError}</p>}
            <input
              className={`${inputCls} mt-2`}
              placeholder="Deskripsi (opsional, menimpa nama produk)"
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className={labelCls}>Qty</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className={`${inputCls} ${rowError ? "border-red-300" : ""}`}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Harga Satuan</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className={inputCls}
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                />
              </div>
            </div>
            <p className="text-right text-sm font-medium mt-2">{formatRupiah(num(item.quantity) * num(item.unitPrice))}</p>
          </div>
        );
      })}

      <div className={cardCls}>
        <label className={labelCls}>Catatan (opsional)</label>
        <textarea rows={3} className={`${inputCls} resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className={`${cardCls} text-sm space-y-2`}>
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal Penjualan</span>
          <span>{formatRupiah(totals.subtotal)}</span>
        </div>
        {applyTax && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">DPP Nilai Lain (11/12)</span>
              <span>{formatRupiah(totals.dppNilaiLain)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-2">
                PPN
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.1}
                  aria-label="Tarif PPN persen"
                  className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs text-right"
                  value={ppnRatePercent}
                  onChange={(e) => setPpnRatePercent(Number(e.target.value))}
                />
                %
              </span>
              <span>{formatRupiah(totals.ppnAmount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
          <span className="font-semibold">Total Tagihan</span>
          <span className="font-bold text-blue-600 text-lg">{formatRupiah(totals.total)}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || hasStockErrors}
        className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-semibold disabled:opacity-60"
      >
        {submitting ? "Menyimpan..." : "Daftarkan Invoice & Potong Stok"}
      </button>
    </form>
  );
}
