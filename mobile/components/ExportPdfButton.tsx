"use client";

import { useState } from "react";
import { savePdfAndShare } from "@/lib/pdf/share";

interface Props {
  /** Dipanggil saat tombol ditekan; mengembalikan PDF base64 + nama file. */
  build: () => Promise<{ base64: string; fileName: string }>;
  title: string;
}

export default function ExportPdfButton({ build, title }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleClick() {
    setBusy(true);
    setMessage(null);
    try {
      const { base64, fileName } = await build();
      const res = await savePdfAndShare(fileName, base64, title);
      setMessage({
        ok: true,
        text: `PDF tersimpan: ${fileName}${res.shareAvailable ? "" : " (perangkat ini tidak punya menu bagikan)"}`,
      });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal membuat PDF." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={busy}
        className="w-full rounded-lg bg-blue-600 text-white py-3 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "Membuat PDF..." : "Ekspor PDF & Bagikan"}
      </button>
      {message && <p className={`text-xs mt-2 ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}
