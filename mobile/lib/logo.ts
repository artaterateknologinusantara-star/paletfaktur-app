"use client";

import { useEffect, useState } from "react";
import { Directory, Filesystem } from "@capacitor/filesystem";

// Logo perusahaan disimpan sebagai file di storage privat aplikasi (Directory.Data/logo/…), bukan di-upload ke server.
// company_settings.logo_url hanya menyimpan path relatifnya, mis. "logo/logo-1729600000000.png".

const MAX_BYTES = 5_000_000; // sama dengan batas backend (RequestSizeLimit 5 MB)
const MAX_DIMENSION = 512; // logo hanya dipakai kecil di kop surat; perkecil agar ringan di DB/PDF
const ALLOWED = /\.(png|jpe?g|svg|webp)$/i;

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
}

function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("File gambar tidak dapat dibaca."));
    img.src = url;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File gambar tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
}

/**
 * Decode gambar dengan tiga jalur berurutan, karena file dari photo picker Android kadang gagal lewat
 * blob: URL (pernah teramati sekali di emulator): createImageBitmap → blob URL → data URL (FileReader).
 */
async function decodeImage(file: File): Promise<Decoded> {
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height };
    }
  } catch {
    // SVG atau format yang tidak didukung createImageBitmap: coba jalur berikutnya
  }
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await imageFromUrl(blobUrl);
    return { source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  } catch {
    // lanjut ke data URL
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
  const img = await imageFromUrl(await fileToDataUrl(file));
  return { source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
}

/** Validasi, perkecil (maks 512px, transparansi PNG dipertahankan), simpan ke Filesystem; kembalikan path relatif. */
export async function saveLogoFile(file: File): Promise<string> {
  if (!ALLOWED.test(file.name) && !file.type.startsWith("image/")) {
    throw new Error("Format file tidak didukung. Gunakan PNG, JPG, SVG, atau WEBP.");
  }
  if (file.size > MAX_BYTES) throw new Error("Ukuran logo maksimal 5 MB.");

  const img = await decodeImage(file);
  const srcW = img.width || MAX_DIMENSION;
  const srcH = img.height || MAX_DIMENSION;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(srcW * scale));
  canvas.height = Math.max(1, Math.round(srcH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal memproses gambar.");
  ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);

  const base64 = canvas.toDataURL("image/png").split(",")[1];
  const path = `logo/logo-${Date.now()}.png`;
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Data, recursive: true });
  return path;
}

export async function deleteLogoFile(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    // file sudah tidak ada; abaikan
  }
}

/** Baca file logo sebagai data URL (untuk <img> dan jsPDF.addImage). null bila tidak ada / gagal dibaca. */
export async function readLogoDataUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    const res = await Filesystem.readFile({ path, directory: Directory.Data });
    const data = typeof res.data === "string" ? res.data : await blobToBase64(res.data);
    return `data:image/png;base64,${data}`;
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function useLogoDataUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    void readLogoDataUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}
