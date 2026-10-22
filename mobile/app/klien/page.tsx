"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, deleteClient, getClients } from "@/lib/db";
import type { ClientResponse } from "@/lib/types";
import BackLink from "@/components/BackLink";

const emptyForm = { name: "", email: "", phone: "", address: "" };
const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export default function KlienPage() {
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    getClients({ search }).then(setClients).then(() => setError(null)).catch((e) => setError(e.message));
  }, [search]);

  useEffect(load, [load]);

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
      await createClient(form);
      closeModal();
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan klien.");
    }
  }

  async function handleDelete(client: ClientResponse) {
    if (!confirm(`Hapus klien ${client.name}?`)) return;
    await deleteClient(client.id);
    load();
  }

  return (
    <div>
      <BackLink href="/menu/" label="Menu" />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">Katalog Klien</h1>
          <p className="text-xs text-slate-500">Mitra korporasi dan kontak penagihan.</p>
        </div>
        <button onClick={openModal} className="shrink-0 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium">
          + Klien
        </button>
      </div>

      <input placeholder="Cari nama atau email..." className={`${inputCls} mb-1`} value={search} onChange={(e) => setSearch(e.target.value)} />
      <p className="text-xs text-slate-500 mb-3">Mitra aktif ({clients.length})</p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="space-y-3">
        {clients.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs text-slate-400">ID: {c.clientCode}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-1 mb-3">
              {c.email && <p>✉ {c.email}</p>}
              {c.phone && <p>☎ {c.phone}</p>}
              {c.address && <p>📍 {c.address}</p>}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-emerald-600">Terdaftar aktif</span>
              <button onClick={() => handleDelete(c)} className="text-xs text-red-600 px-2 py-1">Hapus</button>
            </div>
          </div>
        ))}
        {clients.length === 0 && !error && <p className="text-sm text-slate-400 text-center py-8">Belum ada klien terdaftar.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-5 w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Daftarkan Klien Baru</h3>
              <button onClick={closeModal} className="text-slate-400 px-2">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Instansi / Perusahaan *</label>
                <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telepon</label>
                <input type="tel" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Alamat</label>
                <textarea className={inputCls} rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
    </div>
  );
}
