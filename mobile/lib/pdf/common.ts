import type { jsPDF } from "jspdf";
import type { CompanySettingsResponse } from "../types";

export const PAGE = { w: 210, h: 297, margin: 15 } as const;
export const RIGHT = PAGE.w - PAGE.margin;

export const COLORS = {
  text: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  light: [148, 163, 184] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  brand: [37, 99, 235] as [number, number, number],
};

/** Intl id-ID memakai NBSP di "Rp 1.000"; diganti spasi biasa supaya aman di font standar PDF (WinAnsi). */
export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(value)
    .replace(/ /g, " ");
}

export function dateId(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Kop surat: logo (opsional) + identitas perusahaan di kiri. Mengembalikan y setelah garis pemisah. */
export function drawLetterhead(doc: jsPDF, settings: CompanySettingsResponse, logoDataUrl: string | null): number {
  let textX = PAGE.margin;
  const top = PAGE.margin;

  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const box = 18;
      const scale = Math.min(box / props.width, box / props.height);
      const w = props.width * scale;
      const h = props.height * scale;
      doc.addImage(logoDataUrl, "PNG", PAGE.margin, top, w, h);
      textX = PAGE.margin + box + 4;
    } catch {
      // logo rusak: lanjut tanpa logo
    }
  }

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text(settings.companyName || "-", textX, top + 4);

  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...COLORS.muted);
  const lines: string[] = [];
  if (settings.address) lines.push(...doc.splitTextToSize(settings.address, 95));
  const contact = [settings.phone && `Telp: ${settings.phone}`, settings.email && `Email: ${settings.email}`].filter(Boolean).join("  |  ");
  if (contact) lines.push(...doc.splitTextToSize(contact, 95));
  doc.text(lines, textX, top + 9);

  const bottom = Math.max(top + 20, top + 9 + lines.length * 3.6);
  doc.setDrawColor(...COLORS.line).setLineWidth(0.3);
  doc.line(PAGE.margin, bottom + 2, RIGHT, bottom + 2);
  return bottom + 8;
}

export function label(doc: jsPDF, text: string, x: number, y: number, align: "left" | "right" = "left") {
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...COLORS.light);
  doc.text(text.toUpperCase(), x, y, { align });
}

/** Pindah halaman bila blok setinggi `needed` mm tidak muat. Mengembalikan y yang berlaku. */
export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE.h - PAGE.margin) {
    doc.addPage();
    return PAGE.margin;
  }
  return y;
}

/** Base64 murni (tanpa prefix data URI) dari dokumen jsPDF. */
export function pdfToBase64(doc: jsPDF): string {
  return doc.output("datauristring").split("base64,")[1];
}
