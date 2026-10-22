import type { CompanySettingsResponse, SuratJalanResponse } from "../types";
import { COLORS, PAGE, RIGHT, dateId, drawLetterhead, ensureSpace, label, pdfToBase64 } from "./common";

const COLUMN_ALIGN: Record<number, "right"> = { 2: "right" };

export async function buildSuratJalanPdf(
  sj: SuratJalanResponse,
  settings: CompanySettingsResponse,
  logoDataUrl: string | null,
): Promise<{ base64: string; fileName: string }> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawLetterhead(doc, settings, logoDataUrl);

  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...COLORS.text);
  doc.text("SURAT JALAN", RIGHT, y + 2, { align: "right" });
  doc.setFontSize(10).setTextColor(...COLORS.brand);
  doc.text(sj.suratJalanNumber, RIGHT, y + 8, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...COLORS.light);
  doc.text(`Ref. Invoice: ${sj.invoiceNumber ?? "-"}`, RIGHT, y + 12.5, { align: "right" });

  label(doc, "Kepada / Penerima", PAGE.margin, y);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...COLORS.text);
  doc.text(doc.splitTextToSize(sj.clientName, 90), PAGE.margin, y + 6);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...COLORS.muted);
  const addr = doc.splitTextToSize(sj.deliveryAddress, 90) as string[];
  doc.text(addr, PAGE.margin, y + 11);

  y += 14 + addr.length * 4;
  const meta: [string, string][] = [
    ["Tanggal Pengiriman", dateId(sj.deliveryDate)],
    ["Nama Pengantar / Driver", sj.driverName],
    ["No. Kendaraan", sj.vehicleNumber],
  ];
  doc.setFontSize(9);
  for (const [k, v] of meta) {
    doc.setFont("helvetica", "normal").setTextColor(...COLORS.muted);
    doc.text(`${k}:`, PAGE.margin, y);
    doc.setTextColor(...COLORS.text);
    doc.text(v, PAGE.margin + 44, y);
    y += 5;
  }
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [["#", "Nama / Deskripsi Barang", "Qty", "Satuan", "Keterangan"]],
    body: sj.items.map((i, idx) => [String(idx + 1), i.itemDescription, String(i.quantity), i.unit, i.notes ?? "-"]),
    styles: { font: "helvetica", fontSize: 9, textColor: COLORS.text, cellPadding: 2.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: COLORS.muted, fontStyle: "bold", fontSize: 8, lineWidth: { bottom: 0.3 }, lineColor: COLORS.line },
    bodyStyles: { lineWidth: { bottom: 0.15 }, lineColor: COLORS.line },
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: "right", cellWidth: 18 }, 3: { cellWidth: 22 } },
    theme: "plain",
    // Judul kolom angka mengikuti perataan isinya (columnStyles tidak otomatis berlaku untuk baris judul).
    didParseCell: (data) => {
      if (data.section === "head") {
        const align = COLUMN_ALIGN[data.column.index];
        if (align) data.cell.styles.halign = align;
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (sj.notes) {
    const lines = doc.splitTextToSize(sj.notes, RIGHT - PAGE.margin) as string[];
    y = ensureSpace(doc, y, 10 + lines.length * 4);
    label(doc, "Catatan Pengiriman", PAGE.margin, y);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...COLORS.muted);
    doc.text(lines, PAGE.margin, y + 5);
    y += 8 + lines.length * 4;
  }

  // Dua kolom tanda tangan
  y = ensureSpace(doc, y + 8, 40);
  const colW = 70;
  const cols = [
    { x: PAGE.margin, title: "Pengirim," },
    { x: RIGHT - colW, title: "Penerima," },
  ];
  for (const c of cols) {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...COLORS.muted);
    doc.text(c.title, c.x + colW / 2, y, { align: "center" });
    doc.setDrawColor(...COLORS.line).setLineWidth(0.3).line(c.x, y + 24, c.x + colW, y + 24);
    doc.setFontSize(8).setTextColor(...COLORS.light);
    doc.text("( Nama & Tanda Tangan )", c.x + colW / 2, y + 28, { align: "center" });
  }

  return { base64: pdfToBase64(doc), fileName: `SuratJalan-${sj.suratJalanNumber}.pdf` };
}
