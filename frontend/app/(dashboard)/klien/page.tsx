"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ClientResponse } from "@/lib/types";

const emptyForm = { name: "", email: "", phone: "", address: "" };

export default function KlienPage() {
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    apiRequest<ClientResponse[]>(`/clients?${params.toString()}`).then(setClients).catch((e) => setError(e.message));
  }

  useEffect(load, [search]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest("/clients", { method: "POST", body: form });
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan klien.");
    }
  }

  async function handleDelete(client: ClientResponse) {
    if (!confirm(`Hapus klien ${client.name}?`)) return;
    await apiRequest(`/clients/${client.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Katalog Klien</h1>
          <p className="text-sm text-slate-500">Simpan mitra korporasi, identitas administrasi penagihan, dan kontak logistik fisik.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          + Registrasi Klien Baru
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">Mitra aktif ({clients.length})</p>
        <input
          placeholder="Cari klien berdasarkan nama, email..."
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-5">
        {clients.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs text-slate-400">ID: {c.clientCode}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-1 mb-4">
              {c.email && <p>✉ {c.email}</p>}
              {c.phone && <p>☎ {c.phone}</p>}
              {c.address && <p>📍 {c.address}</p>}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-emerald-600">Terdaftar aktif</span>
              <button onClick={() => handleDelete(c)} className="text-xs text-red-600 hover:underline">Hapus</button>
            </div>
          </div>
        ))}
        {clients.length === 0 && <p className="text-sm text-slate-400 col-span-3 text-center py-10">Belum ada klien terdaftar.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Daftarkan Instansi Klien Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Instansi / Perusahaan *</label>
                <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telepon</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Alamat Gedung / HQ Lengkap</label>
                <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
                <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">Daftarkan Korporat Klien</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
