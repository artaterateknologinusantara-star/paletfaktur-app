"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSuratJalan, getClients, getInvoiceById, getInvoices } from "@/lib/db";
import { todayLocal } from "@/lib/format";
import type { ClientResponse, InvoiceListItemResponse } from "@/lib/types";
import BackLink from "@/components/BackLink";

interface ItemRow {
  itemDescription: string;
  quantity: string;
  unit: string;
}

const newRow = (): ItemRow => ({ itemDescription: "", quantity: "1", unit: "pcs" });
const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const labelCls = "block text-xs font-medium text-slate-600 mb-1";
const cardCls = "bg-white rounded-xl border border-slate-200 p-4 mb-4";

// Dibuka dari invoice: /surat-jalan/create/?invoiceId=N -> klien, alamat, dan barang terisi dari invoice itu.
export default function CreateSuratJalanPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Memuat...</p>}>
      <CreateSuratJalan />
    </Suspense>
  );
}

function CreateSuratJalan() {
  const router = useRouter();
  const presetInvoiceId = useSearchParams().get("invoiceId");

  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItemResponse[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [clientId, setClientId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayLocal());
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([newRow()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getClients().then(setClients).catch((e) => setError(e.message));
    getInvoices().then(setInvoices).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (presetInvoiceId) void applyInvoice(presetInvoiceId);
  }, [presetInvoiceId]);

  /** Pilih invoice -> isi klien, alamat klien, dan daftar barang dari item invoice (masih bisa diedit). */
  async function applyInvoice(idStr: string) {
    setInvoiceId(idStr);
    if (!idStr) return;
    try {
      const inv = await getInvoiceById(Number(idStr));
      if (!inv) return;
      setClientId(String(inv.clientId));
      setItems(inv.items.map((i) => ({ itemDescription: i.description || i.productName, quantity: String(i.quantity), unit: "pcs" })));
      const client = (await getClients()).find((c) => c.id === inv.clientId);
      if (client?.address) setDeliveryAddress(client.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat invoice.");
    }
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function handleClientChange(value: string) {
    setClientId(value);
    const client = clients.find((c) => c.id === Number(value));
    if (client?.address && !deliveryAddress) setDeliveryAddress(client.address);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return setError("Pilih penerima / klien.");
    const validItems = items.filter((i) => i.itemDescription.trim() && Number(i.quantity) > 0);
    if (validItems.length === 0) return setError("Tambahkan minimal satu barang.");

    setSubmitting(true);
    setError(null);
    try {
      const sj = await createSuratJalan({
        invoiceId: invoiceId ? Number(invoiceId) : null,
        clientId: Number(clientId),
        deliveryDate,
        deliveryAddress,
        driverName,
        vehicleNumber,
        notes: notes || null,
        items: validItems.map((i) => ({ itemDescription: i.itemDescription, quantity: Number(i.quantity), unit: i.unit, notes: null })),
      });
      router.replace(`/surat-jalan/detail/?id=${sj.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat surat jalan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <BackLink href="/surat-jalan/" label="Daftar Surat Jalan" />
      <h1 className="text-xl font-bold mb-4">Buat Surat Jalan</h1>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className={`${cardCls} space-y-3`}>
        <div>
          <label className={labelCls}>Referensi Invoice (opsional)</label>
          <select className={inputCls} value={invoiceId} onChange={(e) => void applyInvoice(e.target.value)}>
            <option value="">Tanpa referensi invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.clientName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Nama Penerima / Klien *</label>
          <select required className={inputCls} value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
            <option value="">Pilih klien...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tanggal Pengiriman *</label>
          <input required type="date" className={inputCls} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Alamat Pengiriman *</label>
          <textarea required rows={2} className={inputCls} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Nama Pengantar / Driver *</label>
          <input required className={inputCls} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>No. Kendaraan *</label>
          <input required className={inputCls} value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase">Barang</h2>
        <button type="button" onClick={() => setItems((p) => [...p, newRow()])} className="text-xs rounded-lg bg-blue-50 text-blue-700 px-3 py-1.5 font-medium">
          + Tambah Barang
        </button>
      </div>

      {items.map((item, index) => (
        <div key={index} className={`${cardCls} mb-3`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Barang {index + 1}</span>
            {items.length > 1 && (
              <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== index))} className="text-xs text-red-600 px-1">
                Hapus baris
              </button>
            )}
          </div>
          <input
            className={inputCls}
            placeholder="Nama / deskripsi barang"
            value={item.itemDescription}
            onChange={(e) => updateItem(index, { itemDescription: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className={labelCls}>Qty</label>
              <input type="number" inputMode="decimal" min={0} step="any" className={inputCls} value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Satuan</label>
              <input className={inputCls} value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} />
            </div>
          </div>
        </div>
      ))}

      <div className={cardCls}>
        <label className={labelCls}>Catatan Pengiriman (opsional)</label>
        <textarea rows={2} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-semibold disabled:opacity-60">
        {submitting ? "Menyimpan..." : "Simpan Surat Jalan"}
      </button>
    </form>
  );
}
