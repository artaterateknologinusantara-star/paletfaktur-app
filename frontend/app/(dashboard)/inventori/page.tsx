"use client";

import { useEffect, useState } from "react";
import { apiRequest, formatRupiah, formatDate } from "@/lib/api";
import { ProductResponse, StockMutationResponse } from "@/lib/types";

const emptyForm = { sku: "", category: "", name: "", unitPrice: "", initialStock: "", minStockThreshold: "" };

export default function InventoriPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [mutations, setMutations] = useState<StockMutationResponse[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    apiRequest<ProductResponse[]>(`/products?${params.toString()}`).then(setProducts).catch((e) => setError(e.message));
    apiRequest<StockMutationResponse[]>("/products/mutations?take=10").then(setMutations).catch(() => {});
  }

  useEffect(load, [search]);

  const lowStock = products.filter((p) => p.stock <= p.minStockThreshold && p.stock > 0);
  const outOfStock = products.filter((p) => p.stock === 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest("/products", {
        method: "POST",
        body: {
          sku: form.sku,
          category: form.category,
          name: form.name,
          unitPrice: Number(form.unitPrice),
          initialStock: Number(form.initialStock),
          minStockThreshold: Number(form.minStockThreshold),
        },
      });
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan produk.");
    }
  }

  async function handleUpdateStock(product: ProductResponse) {
    const input = prompt(`Stok baru untuk ${product.name}:`, String(product.stock));
    if (input === null) return;
    const newStock = Number(input);
    if (Number.isNaN(newStock) || newStock < 0) return;
    await apiRequest(`/products/${product.id}/stock`, { method: "PUT", body: { newStock, reason: "Opname manual" } });
    load();
  }

  async function handleDelete(product: ProductResponse) {
    if (!confirm(`Hapus produk ${product.name}?`)) return;
    await apiRequest(`/products/${product.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sistem Inventori</h1>
          <p className="text-sm text-slate-500">Katalog komoditas, tingkat stok, penyesuaian opname manual, dan riwayat mutasi.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          + Katalog Produk Baru
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Total Jenis Produk</p>
          <p className="text-2xl font-bold mt-1">{products.length} SKU</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Stok Kritis (≤ batas)</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{lowStock.length} Barang</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Stok Habis / Kosong</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{outOfStock.length} SKU</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Katalog Stok Fisik Gudang</h2>
            <input
              placeholder="Cari SKU atau nama produk..."
              className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Kode SKU</th>
                <th className="py-2 font-medium">Komersial Barang</th>
                <th className="py-2 font-medium">Kategori</th>
                <th className="py-2 font-medium">Harga Unit</th>
                <th className="py-2 font-medium">Stok</th>
                <th className="py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 font-medium">{p.sku}</td>
                  <td className="py-2">
                    <p>{p.name}</p>
                    <p className="text-xs text-slate-400">Batas Minimum: {p.minStockThreshold} unit</p>
                  </td>
                  <td className="py-2"><span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{p.category}</span></td>
                  <td className="py-2">{formatRupiah(p.unitPrice)}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${p.stock <= p.minStockThreshold ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateStock(p)} className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">Ubah Stok</button>
                      <button onClick={() => handleDelete(p)} className="text-xs rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 hover:bg-red-50">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-sm mb-4">Mutasi Riwayat Stok</h2>
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {mutations.map((m) => (
              <li key={m.id} className="text-sm border-b border-slate-50 pb-3 last:border-0">
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
          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
            Catatan mutasi stok bersifat audit-safe dan terintegrasi dengan sistem faktur.
          </p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Registrasi Unit Katalog Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sandi SKU / Kode *</label>
                  <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kategori Barang *</label>
                  <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Dagang Barang *</label>
                <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Harga Unit Satuan (Rupiah) *</label>
                <input required type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Stok Awal Gudang *</label>
                  <input required type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tingkat Limit Merah</label>
                  <input required type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.minStockThreshold} onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
                <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">Daftarkan Masuk Gudang</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
