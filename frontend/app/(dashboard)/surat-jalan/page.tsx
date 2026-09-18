"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, formatDate } from "@/lib/api";
import { ClientResponse, InvoiceListItemResponse, SuratJalanListItemResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const TABS = ["Semua", "Proses", "Terkirim", "Dibatalkan"];

const emptyForm = {
  invoiceId: "",
  clientId: "",
  deliveryDate: new Date().toISOString().slice(0, 10),
  deliveryAddress: "",
  driverName: "",
  vehicleNumber: "",
  notes: "",
  itemDescription: "",
  quantity: "1",
  unit: "pcs",
};

export default function SuratJalanPage() {
  const [list, setList] = useState<SuratJalanListItemResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItemResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    const params = new URLSearchParams();
    if (tab !== "Semua") params.set("status", tab);
    if (search) params.set("search", search);
    apiRequest<SuratJalanListItemResponse[]>(`/suratjalan?${params.toString()}`).then(setList).catch((e) => setError(e.message));
  }

  useEffect(load, [tab, search]);
  useEffect(() => {
    apiRequest<InvoiceListItemResponse[]>("/invoices").then(setInvoices).catch(() => {});
    apiRequest<ClientResponse[]>("/clients").then(setClients).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      setError("Pilih penerima / klien.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/suratjalan", {
        method: "POST",
        body: {
          invoiceId: form.invoiceId ? Number(form.invoiceId) : null,
          clientId: Number(form.clientId),
          deliveryDate: form.deliveryDate,
          deliveryAddress: form.deliveryAddress,
          driverName: form.driverName,
          vehicleNumber: form.vehicleNumber,
          notes: form.notes || null,
          items: [{ itemDescription: form.itemDescription, quantity: Number(form.quantity), unit: form.unit, notes: null }],
        },
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat surat jalan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus surat jalan ini?")) return;
    await apiRequest(`/suratjalan/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Surat Jalan</h1>
      <p className="text-sm text-slate-500 mb-6">Buat, kelola, dan cetak surat jalan pengiriman barang secara otomatis dari invoice.</p>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-sm mb-4">Form Surat Jalan</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Referensi Invoice (opsional)</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
              <option value="">Tanpa referensi invoice</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.clientName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Penerima / Klien *</label>
            <select required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Pilih klien...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Pengiriman *</label>
            <input required type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Alamat Pengiriman *</label>
            <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Pengantar / Driver *</label>
            <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">No. Kendaraan *</label>
            <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
          </div>

          <div className="col-span-2 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nama / Deskripsi Barang *</label>
              <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Qty *</label>
              <input required type="number" min={1} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Catatan Pengiriman (opsional)</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

          <div className="col-span-2 flex justify-end gap-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {submitting ? "Menyimpan..." : "Simpan & Lihat Surat Jalan"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <input
            placeholder="Cari no. SJ, klien, atau invoice..."
            className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
              <th className="py-3 px-5 font-medium">No. SJ</th>
              <th className="py-3 px-5 font-medium">Ref. Invoice</th>
              <th className="py-3 px-5 font-medium">Penerima</th>
              <th className="py-3 px-5 font-medium">Tgl. Kirim</th>
              <th className="py-3 px-5 font-medium">Driver</th>
              <th className="py-3 px-5 font-medium">Status</th>
              <th className="py-3 px-5 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((sj) => (
              <tr key={sj.id} className="border-b border-slate-50 last:border-0">
                <td className="py-3 px-5 text-blue-600 font-medium">{sj.suratJalanNumber}</td>
                <td className="py-3 px-5">{sj.invoiceNumber ?? "-"}</td>
                <td className="py-3 px-5">{sj.recipientName}</td>
                <td className="py-3 px-5 text-slate-500">{formatDate(sj.deliveryDate)}</td>
                <td className="py-3 px-5">{sj.driverName}</td>
                <td className="py-3 px-5"><StatusBadge status={sj.status} /></td>
                <td className="py-3 px-5">
                  <div className="flex gap-2">
                    <Link href={`/surat-jalan/${sj.id}`} className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50">
                      Lihat
                    </Link>
                    <button onClick={() => handleDelete(sj.id)} className="text-xs rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 hover:bg-red-50">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Belum ada surat jalan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
