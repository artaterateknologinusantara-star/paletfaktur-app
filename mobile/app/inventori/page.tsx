"use client";

import { useCallback, useEffect, useState } from "react";
import { createProduct, deleteProduct, getProducts, getStockMutations, updateProductStock } from "@/lib/db";
import { formatDate, formatRupiah } from "@/lib/format";
import type { ProductResponse, StockMutationResponse } from "@/lib/types";

const emptyForm = { sku: "", category: "", name: "", unitPrice: "", initialStock: "", minStockThreshold: "" };
const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export default function InventoriPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [mutations, setMutations] = useState<StockMutationResponse[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [stockTarget, setStockTarget] = useState<ProductResponse | null>(null);
  const [stockInput, setStockInput] = useState("");
  const [stockError, setStockError] = useState<string | null>(null);

  const load = useCallback(() => {
    getProducts({ search }).then(setProducts).then(() => setError(null)).catch((e) => setError(e.message));
    getStockMutations(10).then(setMutations).catch(() => {});
  }, [search]);

  useEffect(load, [load]);

  const lowStock = products.filter((p) => p.stock <= p.minStockThreshold && p.stock > 0);
  const outOfStock = products.filter((p) => p.stock === 0);

  function openModal() {
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await createProduct({
        sku: form.sku,
        category: form.category,
        name: form.name,
        unitPrice: Number(form.unitPrice),
        initialStock: Number(form.initialStock),
        minStockThreshold: Number(form.minStockThreshold),
      });
      closeModal();
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan produk.");
    }
  }

  // Dialog sendiri (bukan window.prompt): prompt() bawaan WebView Android tidak menampilkan nilai default.
  function openStockDialog(product: ProductResponse) {
    setStockTarget(product);
    setStockInput(String(product.stock));
    setStockError(null);
  }

  function closeStockDialog() {
    setStockTarget(null);
    setStockInput("");
    setStockError(null);
  }

  async function handleUpdateStock(e: React.FormEvent) {
    e.preventDefault();
    if (!stockTarget) return;
    const newStock = Number(stockInput);
    if (stockInput.trim() === "" || !Number.isInteger(newStock) || newStock < 0) {
      setStockError("Masukkan bilangan bulat 0 atau lebih.");
      return;
    }
    try {
      await updateProductStock(stockTarget.id, newStock, "Opname manual");
      closeStockDialog();
      load();
    } catch (err) {
      setStockError(err instanceof Error ? err.message : "Gagal mengubah stok.");
    }
  }

  async function handleDelete(product: ProductResponse) {
    if (!confirm(`Hapus produk ${product.name}?`)) return;
    await deleteProduct(product.id);
    load();
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">Sistem Inventori</h1>
          <p className="text-xs text-slate-500">Katalog stok, opname manual, dan riwayat mutasi.</p>
        </div>
        <button onClick={openModal} className="shrink-0 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium">
          + Produk
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Total SKU" value={String(products.length)} />
        <Stat label="Stok Kritis" value={String(lowStock.length)} tone="text-amber-600" />
        <Stat label="Stok Habis" value={String(outOfStock.length)} tone="text-red-600" />
      </div>

      <input placeholder="Cari SKU atau nama produk..." className={`${inputCls} mb-3`} value={search} onChange={(e) => setSearch(e.target.value)} />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="space-y-3 mb-6">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{p.sku}</p>
                <p className="font-semibold text-sm">{p.name}</p>
                <span className="inline-block mt-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded-full">{p.category}</span>
              </div>
              <span className={`px-2.5 py-1 rounded text-sm font-semibold ${p.stock <= p.minStockThreshold ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {p.stock}
              </span>
            </div>
            <p className="text-sm mt-2">{formatRupiah(p.unitPrice)}</p>
            <p className="text-xs text-slate-400">Batas minimum: {p.minStockThreshold} unit</p>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <button onClick={() => openStockDialog(p)} className="flex-1 text-xs rounded-lg border border-slate-200 py-2">Ubah Stok</button>
              <button onClick={() => handleDelete(p)} className="flex-1 text-xs rounded-lg border border-red-200 text-red-600 py-2">Hapus</button>
            </div>
          </div>
        ))}
        {products.length === 0 && !error && <p className="text-sm text-slate-400 text-center py-8">Belum ada produk.</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold text-sm mb-3">Mutasi Riwayat Stok</h2>
        <ul className="space-y-3">
          {mutations.map((m) => (
            <li key={m.id} className="text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{formatDate(m.createdAt)}</span>
                <span className={`text-xs font-semibold px-1.5 rounded ${m.quantityChange < 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}`}>
                  {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                </span>
              </div>
              <p className="font-medium">{m.productName}</p>
              <p className="text-xs text-slate-400">SKU: {m.productSku}</p>
              {m.sourceReference && <p className="text-xs text-blue-600">{m.sourceReference}</p>}
            </li>
          ))}
          {mutations.length === 0 && <p className="text-sm text-slate-400">Belum ada mutasi stok.</p>}
        </ul>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-5 w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Registrasi Produk Baru</h3>
              <button onClick={closeModal} className="text-slate-400 px-2">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kode SKU *"><input required className={inputCls} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
                <Field label="Kategori *"><input required className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
              </div>
              <Field label="Nama Dagang Barang *"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Harga Unit (Rupiah) *"><input required type="number" inputMode="numeric" min={0} className={inputCls} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stok Awal *"><input required type="number" inputMode="numeric" min={0} className={inputCls} value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} /></Field>
                <Field label="Batas Minimum *"><input required type="number" inputMode="numeric" min={0} className={inputCls} value={form.minStockThreshold} onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })} /></Field>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
                <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stockTarget && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 px-6">
          <form onSubmit={handleUpdateStock} className="bg-white rounded-xl p-5 w-full max-w-sm">
            <h3 className="font-semibold mb-1">Ubah Stok (Opname)</h3>
            <p className="text-xs text-slate-500 mb-3">{stockTarget.name} — stok saat ini: {stockTarget.stock}</p>
            <label className="block text-xs font-medium text-slate-600 mb-1">Stok baru</label>
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              min={0}
              className={inputCls}
              value={stockInput}
              onChange={(e) => setStockInput(e.target.value)}
            />
            {stockError && <p className="text-sm text-red-600 mt-2">{stockError}</p>}
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={closeStockDialog} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
              <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${tone}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
