"use client";

import { useEffect, useRef, useState } from "react";
import { getCompanySettings, updateCompanySettings } from "@/lib/db";
import { deleteLogoFile, saveLogoFile, useLogoDataUrl } from "@/lib/logo";
import type { CompanySettingsResponse } from "@/lib/types";
import BackLink from "@/components/BackLink";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const cardCls = "bg-white rounded-xl border border-slate-200 p-4 mb-4";
const titleCls = "text-xs font-medium tracking-wide text-slate-400 uppercase mb-3";

export default function PengaturanPage() {
  const [form, setForm] = useState<CompanySettingsResponse | null>(null);
  // Angka disimpan sebagai string agar field bisa dikosongkan saat mengetik.
  const [ppnPercent, setPpnPercent] = useState("12");
  const [dueDays, setDueDays] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const savedLogo = useRef<string | null>(null); // logo yang sudah tersimpan di DB
  const logoDataUrl = useLogoDataUrl(form?.logoUrl);

  useEffect(() => {
    getCompanySettings()
      .then((s) => {
        setForm(s);
        savedLogo.current = s.logoUrl;
        setPpnPercent(String(Math.round(s.ppnRate * 10000) / 100));
        setDueDays(String(s.invoiceDueDays));
      })
      .catch((e) => setError(e.message));
  }, []);

  function update<K extends keyof CompanySettingsResponse>(key: K, value: CompanySettingsResponse[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form) return;

    setError(null);
    setUploading(true);
    try {
      const path = await saveLogoFile(file);
      // Logo yang dipilih tapi belum disimpan (pilihan sebelumnya) dibuang agar tidak menumpuk.
      if (form.logoUrl && form.logoUrl !== savedLogo.current) await deleteLogoFile(form.logoUrl);
      update("logoUrl", path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan logo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    if (!form) return;
    if (form.logoUrl && form.logoUrl !== savedLogo.current) await deleteLogoFile(form.logoUrl);
    update("logoUrl", null);
  }

  async function handleSave() {
    if (!form) return;
    setError(null);
    try {
      const updated = await updateCompanySettings({
        ...form,
        ppnRate: Number(ppnPercent) / 100,
        invoiceDueDays: Number(dueDays),
      });
      // Logo lama dihapus dari storage hanya setelah pengaturan baru berhasil disimpan.
      if (savedLogo.current && savedLogo.current !== updated.logoUrl) await deleteLogoFile(savedLogo.current);
      savedLogo.current = updated.logoUrl;
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setSaved(false);
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.");
    }
  }

  if (!form) return error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-slate-400">Memuat pengaturan...</p>;

  return (
    <div>
      <BackLink href="/menu/" label="Menu" />
      <h1 className="text-xl font-bold mb-4">Pengaturan</h1>

      <div className={cardCls}>
        <h2 className={titleCls}>Logo Perusahaan</h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 shrink-0 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoDataUrl ? <img src={logoDataUrl} alt="Logo" className="w-full h-full object-contain" /> : "Logo"}
          </div>
          <div className="flex-1 min-w-0">
            <label className="block">
              <span className="sr-only">Pilih file logo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                disabled={uploading}
                onChange={handleLogo}
                className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-blue-700 disabled:opacity-60"
              />
            </label>
            <p className="text-[11px] text-slate-400 mt-2">
              {uploading ? "Menyimpan logo..." : "PNG, JPG, SVG, atau WEBP (maks 5 MB). Disimpan di perangkat ini."}
            </p>
            {form.logoUrl && (
              <button type="button" onClick={handleRemoveLogo} className="text-xs text-red-600 mt-1">
                Hapus logo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <h2 className={titleCls}>Informasi Perusahaan</h2>
        <Field label="Nama Perusahaan / PT *" value={form.companyName} onChange={(v) => update("companyName", v)} />
        <Field label="Nomor Telepon" value={form.phone ?? ""} onChange={(v) => update("phone", v)} type="tel" />
        <Field label="Email Perusahaan" value={form.email ?? ""} onChange={(v) => update("email", v)} />
        <Field label="Nama Penanda Tangan" value={form.signatoryName ?? ""} onChange={(v) => update("signatoryName", v)} />
        <Field label="Jabatan Penanda Tangan" value={form.signatoryTitle ?? ""} onChange={(v) => update("signatoryTitle", v)} />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Alamat Perusahaan</label>
          <textarea className={inputCls} rows={3} value={form.address ?? ""} onChange={(e) => update("address", e.target.value)} />
        </div>
      </div>

      <div className={cardCls}>
        <h2 className={titleCls}>Pengaturan Invoice</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tarif PPN (%)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.1}
              className={inputCls}
              value={ppnPercent}
              onChange={(e) => {
                setPpnPercent(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Jatuh Tempo (hari)</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className={inputCls}
              value={dueDays}
              onChange={(e) => {
                setDueDays(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Dipakai saat menghitung PPN dan tanggal jatuh tempo invoice baru.</p>
      </div>

      <div className={`${cardCls} space-y-3`}>
        <h2 className={titleCls}>Rekening Bank</h2>
        <Field label="Nama Bank" value={form.bankName ?? ""} onChange={(v) => update("bankName", v)} />
        <Field label="No. Rekening" value={form.bankAccountNumber ?? ""} onChange={(v) => update("bankAccountNumber", v)} />
        <Field label="Atas Nama" value={form.bankAccountHolder ?? ""} onChange={(v) => update("bankAccountHolder", v)} />
        <p className="text-[11px] text-slate-400">Tampil di bagian "Pembayaran" pada faktur.</p>
      </div>

      <div className={cardCls}>
        <h2 className={titleCls}>Pratinjau Kop Surat</h2>
        <div className="border border-slate-100 rounded-lg p-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoDataUrl && <img src={logoDataUrl} alt="Logo" className="w-10 h-10 object-contain" />}
          <div className="min-w-0">
            <p className="font-semibold text-sm">{form.companyName}</p>
            <p className="text-xs text-slate-500">{form.address}</p>
            <p className="text-xs text-slate-500">Telp: {form.phone} • Email: {form.email}</p>
          </div>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="mb-3 text-sm text-emerald-600">Perubahan tersimpan.</p>}

      <button onClick={handleSave} disabled={uploading} className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-semibold disabled:opacity-60">
        Simpan Perubahan
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
