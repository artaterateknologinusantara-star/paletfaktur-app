import type { CompanySettingsResponse, InvoiceResponse } from "../types";
import { COLORS, PAGE, RIGHT, dateId, drawLetterhead, ensureSpace, label, pdfToBase64, rupiah } from "./common";

/** PDF faktur (A4). Teks vektor, bukan screenshot: tajam, kecil (puluhan KB), dan bisa dicari/disalin. */
const COLUMN_ALIGN: Record<number, "right"> = { 2: "right", 3: "right", 4: "right" };

export async function buildInvoicePdf(
  invoice: InvoiceResponse,
  settings: CompanySettingsResponse,
  logoDataUrl: string | null,
): Promise<{ base64: string; fileName: string }> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawLetterhead(doc, settings, logoDataUrl);

  // Judul + nomor (kanan)
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...COLORS.text);
  doc.text("FAKTUR PENJUALAN", RIGHT, y + 2, { align: "right" });
  doc.setFontSize(10).setTextColor(...COLORS.brand);
  doc.text(invoice.invoiceNumber, RIGHT, y + 8, { align: "right" });

  // Ditagihkan kepada (kiri)
  label(doc, "Ditagihkan kepada", PAGE.margin, y);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...COLORS.text);
  doc.text(doc.splitTextToSize(invoice.clientName, 90), PAGE.margin, y + 6);

  // Tanggal (kiri bawah, agar kolom kanan hanya judul+nomor)
  y += 16;
  const meta: [string, string][] = [
    ["Tgl. Penerbitan", dateId(invoice.issueDate)],
    ["Jatuh Tempo", dateId(invoice.dueDate)],
  ];
  if (invoice.poNumber) meta.push(["No. PO", invoice.poNumber]);
  doc.setFontSize(9);
  for (const [k, v] of meta) {
    doc.setFont("helvetica", "normal").setTextColor(...COLORS.muted);
    doc.text(`${k}:`, PAGE.margin, y);
    doc.setTextColor(...COLORS.text);
    doc.text(v, PAGE.margin + 32, y);
    y += 5;
  }
  y += 3;

  // Tabel barang
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE.margin, right: PAGE.margin },
    head: [["Kode", "Nama Barang", "Qty", "Harga Satuan", "Jumlah"]],
    body: invoice.items.map((i) => [
      i.productSku,
      i.description ? `${i.description}\n(${i.productName})` : i.productName,
      String(i.quantity),
      rupiah(i.unitPrice),
      rupiah(i.lineTotal),
    ]),
    styles: { font: "helvetica", fontSize: 9, textColor: COLORS.text, cellPadding: 2.2, lineColor: COLORS.line, lineWidth: 0 },
    headStyles: { fillColor: [255, 255, 255], textColor: COLORS.muted, fontStyle: "bold", fontSize: 8, lineWidth: { bottom: 0.3 }, lineColor: COLORS.line },
    bodyStyles: { lineWidth: { bottom: 0.15 }, lineColor: COLORS.line },
    columnStyles: { 2: { halign: "right", cellWidth: 14 }, 3: { halign: "right", cellWidth: 34 }, 4: { halign: "right", cellWidth: 36 } },
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

  // Catatan
  if (invoice.notes) {
    const lines = doc.splitTextToSize(invoice.notes, RIGHT - PAGE.margin) as string[];
    y = ensureSpace(doc, y, 10 + lines.length * 4);
    label(doc, "Catatan", PAGE.margin, y);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...COLORS.muted);
    doc.text(lines, PAGE.margin, y + 5);
    y += 8 + lines.length * 4;
  }

  // Total (kanan) + pembayaran (kiri), dalam satu blok agar tidak terpisah halaman
  const totals: [string, string, boolean][] = [["Subtotal Penjualan", rupiah(invoice.subtotal), false]];
  if (invoice.applyTax) {
    totals.push(["DPP Nilai Lain", rupiah(invoice.dppNilaiLain), false]);
    totals.push([`PPN (${Math.round(invoice.ppnRateUsed * 10000) / 100}%)`, rupiah(invoice.ppnAmount), false]);
  }
  totals.push(["Total", rupiah(invoice.total), true]);

  y = ensureSpace(doc, y, 20 + totals.length * 6 + 45);
  const blockTop = y;

  let ty = y;
  for (const [k, v, bold] of totals) {
    if (bold) {
      doc.setDrawColor(...COLORS.line).setLineWidth(0.3).line(115, ty - 3.5, RIGHT, ty - 3.5);
    }
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 11 : 9).setTextColor(...(bold ? COLORS.text : COLORS.muted));
    doc.text(k, 115, ty);
    doc.setTextColor(...COLORS.text);
    doc.text(v, RIGHT, ty, { align: "right" });
    ty += bold ? 7 : 5.5;
  }

  if (settings.bankName) {
    label(doc, "Pembayaran", PAGE.margin, blockTop);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...COLORS.muted);
    doc.text("Transfer Bank ke:", PAGE.margin, blockTop + 5);
    doc.setFont("helvetica", "bold").setTextColor(...COLORS.text);
    doc.text(`${settings.bankName} ${settings.bankAccountNumber ?? ""}`.trim(), PAGE.margin, blockTop + 10);
    if (settings.bankAccountHolder) {
      doc.setFont("helvetica", "normal").setTextColor(...COLORS.muted);
      doc.text(`a.n. ${settings.bankAccountHolder}`, PAGE.margin, blockTop + 15);
    }
  }

  // Tanda tangan
  if (settings.signatoryName) {
    let sy = Math.max(ty, blockTop + 22) + 8;
    sy = ensureSpace(doc, sy, 40);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...COLORS.muted);
    doc.text("Hormat kami,", RIGHT, sy, { align: "right" });
    doc.setFont("helvetica", "bold").setTextColor(...COLORS.text);
    doc.text(settings.signatoryName, RIGHT, sy + 22, { align: "right" });
    if (settings.signatoryTitle) {
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...COLORS.muted);
      doc.text(settings.signatoryTitle, RIGHT, sy + 26.5, { align: "right" });
    }
  }

  return { base64: pdfToBase64(doc), fileName: `Faktur-${invoice.invoiceNumber}.pdf` };
}
