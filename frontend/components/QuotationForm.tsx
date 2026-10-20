"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, assetUrl, formatRupiah, uploadFile } from "@/lib/api";
import { ClientResponse, ProductResponse, QuotationPhotoResponse, QuotationResponse } from "@/lib/types";

const MAX_PHOTO_EDGE = 1600;

// Kecilkan foto (mis. dari kamera HP 8-12 MP) sebelum diunggah: upload cepat, PDF ringan.
async function shrinkPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Gagal memproses foto.");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`, { type: "image/jpeg" });
}

interface ItemForm {
  productId: number | null;
  name: string;
  condition: string;
  color: string;
  unitPrice: string;
  quantity: string;
  unit: string;
}

const emptyItem: ItemForm = { productId: null, name: "", condition: "", color: "", unitPrice: "", quantity: "", unit: "Pcs" };

const DEFAULT_NOTES = "Pembayaran COD (Transfer Setelah Barang Sampai)\ndan sudah free ongkir min 40pcs";

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const label = "block text-xs font-medium text-slate-600 mb-1";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function QuotationForm({ existing }: { existing?: QuotationResponse }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [nextNumber, setNextNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [number, setNumber] = useState(existing?.quotationNumber ?? "");
  const [date, setDate] = useState(existing ? existing.quotationDate.slice(0, 10) : todayIso());
  const [recipient, setRecipient] = useState(existing?.recipientName ?? "");
  const [subject, setSubject] = useState(existing?.subject ?? "Penawaran Harga");
  const [attachment, setAttachment] = useState(existing?.attachment ?? "");
  const [intro, setIntro] = useState(existing?.introText ?? "");
  const [notes, setNotes] = useState(existing ? existing.notes ?? "" : DEFAULT_NOTES);
  const [photos, setPhotos] = useState<QuotationPhotoResponse[]>(existing?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<ItemForm[]>(
    existing
      ? existing.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          condition: i.condition ?? "",
          color: i.color ?? "",
          unitPrice: String(i.unitPrice),
          quantity: String(i.quantity),
          unit: i.unit,
        }))
      : [{ ...emptyItem }]
  );

  useEffect(() => {
    apiRequest<ClientResponse[]>("/clients").then(setClients).catch(() => {});
    apiRequest<ProductResponse[]>("/products").then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    if (existing) return;
    apiRequest<{ number: string }>(`/quotations/next-number?year=${date.slice(0, 4)}`)
      .then((r) => setNextNumber(r.number))
      .catch(() => {});
  }, [date, existing]);

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function pickProduct(index: number, value: string) {
    if (!value) {
      updateItem(index, { productId: null });
      return;
    }
    const p = products.find((x) => x.id === Number(value));
    if (!p) return;
    updateItem(index, { productId: p.id, name: p.name, unitPrice: String(p.unitPrice) });
  }

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const small = await shrinkPhoto(file);
        const result = await uploadFile<{ url: string }>("/quotations/photos", small);
        setPhotos((prev) => [...prev, { url: result.url, caption: "" }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(false);
    }
  }

  const total = items.reduce((sum, i) => sum + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const matched = clients.find((c) => c.name.toLowerCase() === recipient.trim().toLowerCase());
      const body = {
        clientId: matched?.id ?? null,
        recipientName: recipient,
        quotationDate: date,
        quotationNumber: number.trim() || null,
        subject,
        attachment: attachment.trim() || null,
        introText: intro.trim() || null,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          condition: i.condition.trim() || null,
          color: i.color.trim() || null,
          unitPrice: Number(i.unitPrice),
          quantity: Number(i.quantity),
          unit: i.unit,
        })),
        photos: photos.map((p) => ({ url: p.url, caption: p.caption?.trim() || null })),
      };
      const saved = existing
        ? await apiRequest<QuotationResponse>(`/quotations/${existing.id}`, { method: "PUT", body })
        : await apiRequest<QuotationResponse>("/quotations", { method: "POST", body });
      router.push(`/penawaran/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan penawaran.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Nomor Surat</label>
          <input className={input} value={number} placeholder={nextNumber || "Otomatis"} onChange={(e) => setNumber(e.target.value)} />
          <p className="text-[11px] text-slate-400 mt-1">Kosongkan untuk nomor otomatis{nextNumber ? ` (${nextNumber})` : ""}.</p>
        </div>
        <div>
          <label className={label}>Tanggal Surat *</label>
          <input required type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={label}>Kepada (Nama Perusahaan / Penerima) *</label>
          <input required list="client-names" className={input} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <datalist id="client-names">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="text-[11px] text-slate-400 mt-1">Pilih dari daftar klien atau ketik nama calon klien baru.</p>
        </div>
        <div>
          <label className={label}>Hal</label>
          <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className={label}>Lampiran</label>
          <input className={input} placeholder="mis. 2 halaman" value={attachment} onChange={(e) => setAttachment(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={label}>Paragraf Pembuka</label>
          <textarea
            className={input}
            rows={3}
            placeholder="Kosongkan untuk memakai kalimat pembuka bawaan."
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-4">Daftar Harga Ditawarkan</h2>
        <div className="space-y-3">
          {items.map((it, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end border-b border-slate-100 pb-3">
              <div className="col-span-12">
                <label className={label}>Ambil dari Inventori (opsional)</label>
                <select className={input} value={it.productId ?? ""} onChange={(e) => pickProduct(index, e.target.value)}>
                  <option value="">— Ketik manual —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} · {p.name} · {formatRupiah(p.unitPrice)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-4">
                <label className={label}>Ukuran / Nama Barang *</label>
                <input required className={input} placeholder="Pallet Plastik 110x110x12cm" value={it.name} onChange={(e) => updateItem(index, { name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={label}>Kondisi</label>
                <input className={input} list="kondisi" placeholder="Second" value={it.condition} onChange={(e) => updateItem(index, { condition: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className={label}>Warna</label>
                <input className={input} placeholder="Hitam" value={it.color} onChange={(e) => updateItem(index, { color: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={label}>Harga Satuan *</label>
                <input required type="number" min={0} className={input} value={it.unitPrice} onChange={(e) => updateItem(index, { unitPrice: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className={label}>Jumlah *</label>
                <input required type="number" min={1} className={input} value={it.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className={label}>Satuan</label>
                <input className={input} value={it.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} />
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
          <datalist id="kondisi">
            <option value="Baru" />
            <option value="Second" />
          </datalist>
        </div>
        <div className="flex items-center justify-between mt-4">
          <button type="button" onClick={() => setItems((prev) => [...prev, { ...emptyItem }])} className="text-sm text-blue-600 font-medium hover:underline">
            + Tambah Baris
          </button>
          <p className="text-sm">
            Total: <span className="font-semibold">{formatRupiah(total)}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-1">Lampiran Foto</h2>
        <p className="text-[11px] text-slate-400 mb-4">Foto akan dicetak di halaman Lampiran pada PDF. Foto otomatis dikecilkan sebelum diunggah.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            🖼 Pilih Foto / File
            <input type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple className="hidden" disabled={uploading} onChange={handlePhotos} />
          </label>
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            📷 Ambil dari Kamera
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading} onChange={handlePhotos} />
          </label>
          {uploading && <span className="text-sm text-slate-400 self-center">Mengunggah...</span>}
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {photos.map((p, index) => (
              <div key={p.url} className="border border-slate-200 rounded-lg p-2 space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(p.url)} alt={p.caption ?? "Foto"} className="w-full h-40 object-cover rounded" />
                <input
                  className={input}
                  placeholder="Keterangan (mis. Ukuran 110x110x12cm)"
                  value={p.caption ?? ""}
                  onChange={(e) => setPhotos((prev) => prev.map((x, i) => (i === index ? { ...x, caption: e.target.value } : x)))}
                />
                <div className="flex justify-between text-xs">
                  <span className="space-x-2">
                    <button type="button" disabled={index === 0} onClick={() => setPhotos((prev) => { const a = [...prev]; [a[index - 1], a[index]] = [a[index], a[index - 1]]; return a; })} className="text-slate-500 disabled:opacity-30">← Geser</button>
                    <button type="button" disabled={index === photos.length - 1} onClick={() => setPhotos((prev) => { const a = [...prev]; [a[index + 1], a[index]] = [a[index], a[index + 1]]; return a; })} className="text-slate-500 disabled:opacity-30">Geser →</button>
                  </span>
                  <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))} className="text-red-600 hover:underline">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <label className={label}>Catatan</label>
        <textarea className={input} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving || uploading} className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Menyimpan..." : existing ? "Simpan Perubahan" : "Simpan Penawaran"}
        </button>
        <Link href="/penawaran" className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium hover:bg-slate-50">
          Batal
        </Link>
      </div>
    </form>
  );
}
