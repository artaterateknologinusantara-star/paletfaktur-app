"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, formatRupiah } from "@/lib/api";
import { ClientResponse, CompanySettingsResponse, ProductResponse } from "@/lib/types";

interface LineItem {
  productId: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

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
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [clientId, setClientId] = useState<number | "">("");

  const [applyTax, setApplyTax] = useState(true);
  const [issueDate, setIssueDate] = useState(todayDateString());
  const [dueDate, setDueDate] = useState("");
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [invoiceDueDays, setInvoiceDueDays] = useState(30);
  const [poNumber, setPoNumber] = useState("");
  const [ppnRatePercent, setPpnRatePercent] = useState(12);
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<LineItem[]>([{ productId: 0, description: "", quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<ClientResponse[]>("/clients").then(setClients).catch((e) => setError(e.message));
    apiRequest<ProductResponse[]>("/products").then(setProducts).catch((e) => setError(e.message));
    apiRequest<CompanySettingsResponse>("/settings")
      .then((s) => {
        setInvoiceDueDays(s.invoiceDueDays);
        setPpnRatePercent(s.ppnRate * 100);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!dueDateTouched) {
      setDueDate(addDaysToDateString(issueDate, invoiceDueDays));
    }
  }, [issueDate, invoiceDueDays, dueDateTouched]);

  const selectedClient = clients.find((c) => c.id === clientId);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleProductChange(index: number, productId: number) {
    const product = products.find((p) => p.id === productId);
    updateItem(index, { productId, unitPrice: product?.unitPrice ?? 0 });
  }

  function addRow() {
    setItems((prev) => [...prev, { productId: 0, description: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);

  const stockErrors = useMemo(() => {
    const totalByProduct = new Map<number, number>();
    for (const item of items) {
      if (item.productId > 0) {
        totalByProduct.set(item.productId, (totalByProduct.get(item.productId) ?? 0) + item.quantity);
      }
    }

    const errors: Record<number, string> = {};
    items.forEach((item, index) => {
      if (item.productId <= 0) return;
      const product = products.find((p) => p.id === item.productId);
      if (!product) return;
      const totalQty = totalByProduct.get(item.productId) ?? 0;
      if (totalQty > product.stock) {
        errors[index] =
          totalQty !== item.quantity
            ? `Total qty "${product.name}" di semua baris (${totalQty}) melebihi stok tersedia (${product.stock}).`
            : `Qty melebihi stok tersedia (${product.stock}).`;
      }
    });
    return errors;
  }, [items, products]);

  const hasStockErrors = Object.keys(stockErrors).length > 0;

  const dppNilaiLain = useMemo(() => Math.round((subtotal * 11) / 12), [subtotal]);
  const ppnAmount = useMemo(
    () => (applyTax ? Math.round(dppNilaiLain * (ppnRatePercent / 100)) : 0),
    [applyTax, dppNilaiLain, ppnRatePercent]
  );
  const total = applyTax ? subtotal + ppnAmount : subtotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Pilih klien terlebih dahulu.");
      return;
    }
    const validItems = items.filter((i) => i.productId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      setError("Tambahkan minimal satu barang.");
      return;
    }
    if (hasStockErrors) {
      setError("Perbaiki qty yang melebihi stok tersedia sebelum menyimpan.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/invoices", {
        method: "POST",
        body: {
          clientId,
          issueDate,
          dueDate,
          poNumber: poNumber || null,
          applyTax,
          ppnRateOverride: applyTax ? ppnRatePercent / 100 : null,
          notes: notes || null,
          items: validItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            descriptionOverride: i.description || null,
            unitPriceOverride: i.unitPrice,
          })),
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
            <h1 className="text-2xl font-bold">Buat Invoice</h1>
            <p className="text-sm text-slate-500">Buat penjualan baru, kelola produk, dan tentukan jadwal pengiriman.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/invoice" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting || hasStockErrors}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "💾 Daftarkan Invoice & Potong Stok"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
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
            <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-3">Informasi Klien</h2>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pilih Klien / Customer</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={clientId}
              onChange={(e) => setClientId(Number(e.target.value))}
              required
            >
              <option value="">Pilih atau cari klien...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-3 min-h-[76px] flex items-center justify-center">
              {selectedClient ? (
                <div className="w-full text-xs text-slate-600 space-y-0.5">
                  <p className="font-semibold text-slate-800 text-sm">{selectedClient.name}</p>
                  {selectedClient.address && <p>{selectedClient.address}</p>}
                  {selectedClient.email && <p>{selectedClient.email}</p>}
                  {selectedClient.phone && <p>{selectedClient.phone}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Klien belum terpilih.</p>
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
              <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase">Produk / Layanan</h2>
              <button
                type="button"
                onClick={addRow}
                className="text-xs rounded-lg bg-blue-50 text-blue-700 px-3 py-1.5 font-medium hover:bg-blue-100"
              >
                + Tambah Produk
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-2 font-medium w-8">#</th>
                  <th className="py-2 px-2 font-medium">Produk / Layanan</th>
                  <th className="py-2 px-2 font-medium">Deskripsi</th>
                  <th className="py-2 px-2 font-medium w-16">Qty</th>
                  <th className="py-2 px-2 font-medium w-32">Harga Satuan</th>
                  <th className="py-2 px-2 font-medium w-28 text-right">Total</th>
                  <th className="py-2 pl-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const rowError = stockErrors[index];
                  return (
                    <tr key={index} className="border-b border-slate-50 last:border-0 align-top">
                      <td className="py-2 pr-2 text-slate-400">{index + 1}</td>
                      <td className="py-2 px-2">
                        <select
                          className={`w-full rounded-lg border px-2 py-1.5 text-sm ${rowError ? "border-red-300" : "border-slate-300"}`}
                          value={item.productId}
                          onChange={(e) => handleProductChange(index, Number(e.target.value))}
                        >
                          <option value={0}>Pilih produk...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.sku} — {p.name} (stok {p.stock})</option>
                          ))}
                        </select>
                        {rowError && <p className="text-[11px] text-red-600 mt-1">{rowError}</p>}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          placeholder="Nama produk/jasa..."
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={1}
                          className={`w-16 rounded-lg border px-2 py-1.5 text-sm ${rowError ? "border-red-300" : "border-slate-300"}`}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-medium">{formatRupiah(item.quantity * item.unitPrice)}</td>
                      <td className="py-2 pl-2">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-red-500 hover:text-red-600"
                          title="Hapus baris"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">{items.length} item</span>
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
