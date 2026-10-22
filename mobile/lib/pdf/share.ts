import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface PdfExportResult {
  /** URI file di storage perangkat */
  uri: string;
  /** false hanya bila perangkat tidak punya menu Bagikan sama sekali (file tetap tersimpan) */
  shareAvailable: boolean;
}

/**
 * Simpan PDF ke storage aplikasi (Directory.External → Android/data/<paket>/files/PaletFaktur/),
 * lalu buka share sheet Android. Semua lokal; hanya pengiriman (WhatsApp/email) yang butuh internet.
 */
export async function savePdfAndShare(fileName: string, base64: string, title: string): Promise<PdfExportResult> {
  const saved = await Filesystem.writeFile({
    path: `PaletFaktur/${fileName}`,
    data: base64,
    directory: Directory.External,
    recursive: true,
  });

  const shareAvailable = (await Share.canShare()).value;
  if (shareAvailable) {
    try {
      await Share.share({ title, text: title, url: saved.uri, dialogTitle: "Bagikan PDF" });
    } catch (err) {
      // Pengguna menutup share sheet tanpa memilih aplikasi → bukan error; file tetap tersimpan.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancel/i.test(msg)) throw err;
    }
  }
  return { uri: saved.uri, shareAvailable };
}
