"use client";

import { useEffect, useState } from "react";
import { apiRequest, assetUrl, uploadFile } from "@/lib/api";
import { CompanySettingsResponse, LogoUploadResponse } from "@/lib/types";

export default function PengaturanPage() {
  const [form, setForm] = useState<CompanySettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiRequest<CompanySettingsResponse>("/settings").then(setForm).catch((e) => setError(e.message));
  }, []);

  function update<K extends keyof CompanySettingsResponse>(key: K, value: CompanySettingsResponse[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const result = await uploadFile<LogoUploadResponse>("/settings/logo", file);
      update("logoUrl", result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah logo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form) return;
    setError(null);
    try {
      const updated = await apiRequest<CompanySettingsResponse>("/settings", { method: "PUT", body: form });
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.");
    }
  }

  if (!form) return <p className="text-sm text-slate-400">Memuat pengaturan...</p>;

  return (
    <div className="grid grid-cols-2 gap-6 max-w-4xl">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-4">Logo Perusahaan</h2>
        <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs mb-4 overflow-hidden">
          {form.logoUrl ? <img src={assetUrl(form.logoUrl)} alt="Logo" className="w-full h-full object-contain" /> : "Logo"}
        </div>
        <label className="block">
          <span className="sr-only">Pilih file logo</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            disabled={uploading}
            onChange={handleLogoUpload}
            className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
          />
        </label>
        <p className="text-xs text-slate-400 mt-2">{uploading ? "Mengunggah..." : "Format PNG, JPG, SVG, atau WEBP. Ukuran optimal: 200×200 px."}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-1">Informasi Perusahaan</h2>
        <Field label="Nama Perusahaan / PT *" value={form.companyName} onChange={(v) => update("companyName", v)} />
        <Field label="Nomor Telepon" value={form.phone ?? ""} onChange={(v) => update("phone", v)} />
        <Field label="Email Perusahaan" value={form.email ?? ""} onChange={(v) => update("email", v)} />
        <Field label="Tagline Kop Surat" value={form.tagline ?? ""} onChange={(v) => update("tagline", v)} />
        <Field label="Website" value={form.website ?? ""} onChange={(v) => update("website", v)} />
        <Field label="Kota Penerbitan Surat" value={form.city ?? ""} onChange={(v) => update("city", v)} />
        <Field label="Nama Penanda Tangan" value={form.signatoryName ?? ""} onChange={(v) => update("signatoryName", v)} />
        <Field label="Jabatan Penanda Tangan" value={form.signatoryTitle ?? ""} onChange={(v) => update("signatoryTitle", v)} />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Alamat Perusahaan</label>
          <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={form.address ?? ""} onChange={(e) => update("address", e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 col-span-2">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-4">Pengaturan Invoice</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tarif PPN (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.ppnRate * 100}
              onChange={(e) => update("ppnRate", Number(e.target.value) / 100)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Jatuh Tempo Invoice (hari)</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.invoiceDueDays}
              onChange={(e) => update("invoiceDueDays", Number(e.target.value))}
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">Dipakai backend saat menghitung PPN dan tanggal jatuh tempo invoice baru.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 col-span-2">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-4">Informasi Rekening Bank</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Nama Bank" value={form.bankName ?? ""} onChange={(v) => update("bankName", v)} />
          <Field label="No. Rekening" value={form.bankAccountNumber ?? ""} onChange={(v) => update("bankAccountNumber", v)} />
          <Field label="Atas Nama" value={form.bankAccountHolder ?? ""} onChange={(v) => update("bankAccountHolder", v)} />
        </div>
        <p className="text-xs text-slate-400 mt-2">Informasi ini akan ditampilkan di bagian "Pembayaran" pada cetak invoice.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 col-span-2">
        <h2 className="text-xs font-medium tracking-wide text-slate-400 uppercase mb-4">Pratinjau Kop Surat</h2>
        <div className="border border-slate-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            {form.logoUrl && <img src={assetUrl(form.logoUrl)} alt="Logo" className="w-8 h-8 object-contain" />}
            <div>
              <p className="font-semibold text-sm">{form.companyName}</p>
              <p className="text-xs text-slate-500">{form.address}</p>
              <p className="text-xs text-slate-500">Telp: {form.phone} • Email: {form.email}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
      {saved && <p className="col-span-2 text-sm text-emerald-600">Perubahan tersimpan.</p>}

      <div className="col-span-2 flex justify-end">
        <button onClick={handleSave} className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700">
          💾 Simpan Perubahan
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
