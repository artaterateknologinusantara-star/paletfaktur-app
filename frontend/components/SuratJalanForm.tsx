"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { ClientResponse, InvoiceListItemResponse, InvoiceResponse, SuratJalanResponse } from "@/lib/types";

interface ItemForm {
  itemDescription: string;
  color: string;
  unit: string;
  quantity: string;
}

const emptyItem: ItemForm = { itemDescription: "", color: "", unit: "pcs", quantity: "" };

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const label = "block text-xs font-medium text-slate-600 mb-1";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Baris invoice (nama, warna dari penawaran) menjadi baris barang surat jalan.
function itemFromInvoice(i: InvoiceResponse["items"][number]): ItemForm {
  return {
    itemDescription: i.description || i.productName,
    color: i.color ?? "",
    unit: "pcs",
    quantity: String(i.quantity),
  };
}

export default function SuratJalanForm({ existing }: { existing?: SuratJalanResponse }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItemResponse[]>([]);
  const [nextNumber, setNextNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [invoiceId, setInvoiceId] = useState(existing?.invoiceId ? String(existing.invoiceId) : "");
  const [number, setNumber] = useState(existing?.suratJalanNumber ?? "");
  const [date, setDate] = useState(existing ? existing.deliveryDate.slice(0, 10) : todayIso());
  const [clientId, setClientId] = useState(existing ? String(existing.clientId) : "");
  const [description, setDescription] = useState(existing?.recipientDescription ?? "");
  const [address, setAddress] = useState(existing?.deliveryAddress ?? "");
  const [poNumber, setPoNumber] = useState(existing?.poNumber ?? "");
  const [vehicle, setVehicle] = useState(existing?.vehicleNumber ?? "");
  const [driver, setDriver] = useState(existing?.driverName ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [items, setItems] = useState<ItemForm[]>(
    existing
      ? existing.items.map((i) => ({ itemDescription: i.itemDescription, color: i.color ?? "", unit: i.unit, quantity: String(i.quantity) }))
      : [{ ...emptyItem }]
  );

  useEffect(() => {
    apiRequest<ClientResponse[]>("/clients").then(setClients).catch(() => {});
    apiRequest<InvoiceListItemResponse[]>("/invoices").then(setInvoices).catch(() => {});
  }, []);

  useEffect(() => {
    if (existing) return;
    apiRequest<{ number: string }>(`/suratjalan/next-number?year=${date.slice(0, 4)}`)
      .then((r) => setNextNumber(r.number))
      .catch(() => {});
  }, [date, existing]);

  function pickClient(value: string) {
    setClientId(value);
    const c = clients.find((x) => x.id === Number(value));
    if (c?.address && !address.trim()) setAddress(c.address);
  }

  // Memilih invoice mengisi penerima, alamat, nomor PO, dan barang (bisa diubah lagi).
  async function pickInvoice(value: string) {
    setInvoiceId(value);
    if (!value) return;
    try {
      const inv = await apiRequest<InvoiceResponse>(`/invoices/${value}`);
      setClientId(String(inv.clientId));
      if (inv.clientAddress) setAddress(inv.clientAddress);
      if (inv.poNumber) setPoNumber(inv.poNumber);
      if (inv.items.length > 0) setItems(inv.items.map(itemFromInvoice));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat invoice.");
    }
  }

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  const total = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Pilih penerima / klien.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        invoiceId: invoiceId ? Number(invoiceId) : null,
        clientId: Number(clientId),
        suratJalanNumber: number.trim() || null,
        deliveryDate: date,
        recipientDescription: description.trim() || null,
        deliveryAddress: address,
        poNumber: poNumber.trim() || null,
        vehicleNumber: vehicle.trim() || null,
        driverName: driver.trim() || null,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          itemDescription: i.itemDescription,
          color: i.color.trim() || null,
          quantity: Number(i.quantity),
          unit: i.unit,
          notes: null,
        })),
      };
      const saved = existing
        ? await apiRequest<SuratJalanResponse>(`/suratjalan/${existing.id}`, { method: "PUT", body })
        : await apiRequest<SuratJalanResponse>("/suratjalan", { method: "POST", body });
      router.push(`/surat-jalan/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan surat jalan.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Referensi Invoice (opsional)</label>
          <select className={input} value={invoiceId} onChange={(e) => pickInvoice(e.target.value)}>
            <option value="">Tanpa referensi invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.clientName}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">Memilih invoice mengisi penerima, alamat, nomor PO, dan barang otomatis.</p>
        </div>
        <div>
          <label className={label}>Nomor Surat Jalan</label>
          <input className={input} value={number} placeholder={nextNumber || "Otomatis"} onChange={(e) => setNumber(e.target.value)} />
          <p className="text-[11px] text-slate-400 mt-1">Kosongkan untuk nomor otomatis{nextNumber ? ` (${nextNumber})` : ""}.</p>
        </div>

        <div>
          <label className={label}>Tanggal Pengiriman *</label>
          <input required type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className={label}>Nomor P.O</label>
          <input className={input} value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
        </div>

        <div>
          <label className={label}>Penerima *</label>
          <select required className={input} value={clientId} onChange={(e) => pickClient(e.target.value)}>
            <option value="">Pilih klien...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Nomor Plat Mobil</label>
          <input className={input} placeholder="mis. A 8961 AG" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        </div>

        <div>
          <label className={label}>Keterangan Penerima (baris di bawah nama)</label>
          <input
            className={input}
            placeholder="mis. MANUFACTURER OF INDUSTRIAL MACHINE KNIVES AND SAW"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className={label}>Nama Sopir (opsional)</label>
          <input className={input} value={driver} onChange={(e) => setDriver(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className={label}>Alamat Pengiriman *</label>
          <textarea required className={input} rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-4">Daftar Barang</h2>
        <div className="space-y-3">
          {items.map((it, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className={label}>Nama Barang *</label>
                <input
                  required
                  className={input}
                  placeholder="Pallet Plastik Wajik 110x110x14cm"
                  value={it.itemDescription}
                  onChange={(e) => updateItem(index, { itemDescription: e.target.value })}
                />
              </div>
              <div className="col-span-3">
                <label className={label}>Warna</label>
                <input className={input} placeholder="Abu - Abu" value={it.color} onChange={(e) => updateItem(index, { color: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className={label}>Satuan</label>
                <input className={input} value={it.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={label}>Jumlah *</label>
                <input
                  required
                  type="number"
                  min={1}
                  className={input}
                  value={it.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                />
              </div>
              <div className="col-span-1 pb-2 text-right">
                {items.length > 1 && (
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} className="text-xs text-red-600 hover:underline">
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button type="button" onClick={() => setItems((prev) => [...prev, { ...emptyItem }])} className="text-sm text-blue-600 font-medium hover:underline">
            + Tambah Barang
          </button>
          <p className="text-sm">
            Total jumlah: <span className="font-semibold">{total}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <label className={label}>Catatan Pengiriman (opsional, dicetak di bawah tabel)</label>
        <textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Menyimpan..." : existing ? "Simpan Perubahan" : "Simpan & Lihat Surat Jalan"}
        </button>
        <Link href="/surat-jalan" className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium hover:bg-slate-50">
          Batal
        </Link>
      </div>
    </form>
  );
}
