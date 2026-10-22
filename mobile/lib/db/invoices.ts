"use client";

import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { addDaysToDateString, dateStringToIso, todayLocal } from "../format";
import type { InvoiceListItemResponse, InvoiceResponse } from "../types";
import { getDb, runInTx, withTransaction } from "./connection";
import { getEffectiveStatus } from "./invoiceStatus";
import { computeInvoiceTotals, roundHalfEven } from "./money";

// Padanan InvoicesController.cs:
//   GET /invoices -> getInvoices, GET /invoices/{id} -> getInvoiceById, POST -> createInvoice,
//   PUT /invoices/{id}/mark-paid -> markInvoicePaid, DELETE -> deleteInvoice

export interface InvoiceItemRequest {
  productId: number;
  quantity: number;
  descriptionOverride?: string | null;
  unitPriceOverride?: number | null;
}

export interface InvoiceCreateRequest {
  clientId: number;
  /** "YYYY-MM-DD"; default hari ini */
  issueDate?: string | null;
  /** "YYYY-MM-DD"; default issueDate + invoice_due_days dari pengaturan */
  dueDate?: string | null;
  poNumber?: string | null;
  applyTax: boolean;
  /** Pecahan, mis. 0.12; default tarif dari pengaturan perusahaan */
  ppnRateOverride?: number | null;
  notes?: string | null;
  items: InvoiceItemRequest[];
}

const blankToNull = (v?: string | null) => (v && v.trim() ? v.trim() : null);

/**
 * Nomor INV-YYYYMMDD-000N. Backend memakai COUNT(hari itu)+1, yang bentrok dengan UNIQUE setelah ada
 * invoice yang dihapus; di sini MAX(urutan)+1 — hasilnya identik selama tidak ada penghapusan.
 */
async function nextInvoiceNumber(tx: SQLiteDBConnection, issueDate: string): Promise<string> {
  const datePart = issueDate.replace(/-/g, "");
  const prefix = `INV-${datePart}-`;
  const res = await tx.query("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ?", [`${prefix}%`]);
  let max = 0;
  for (const row of res.values ?? []) {
    const n = parseInt(String(row.invoice_number).slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function createInvoice(req: InvoiceCreateRequest): Promise<InvoiceResponse> {
  if (!req.items || req.items.length === 0) {
    throw new Error("Invoice harus memiliki minimal satu barang.");
  }

  const id = await withTransaction(async (tx) => {
    const client = (await tx.query("SELECT id FROM clients WHERE id = ?", [req.clientId])).values?.[0];
    if (!client) throw new Error("Klien tidak ditemukan.");

    const settings = (await tx.query("SELECT ppn_rate, invoice_due_days FROM company_settings WHERE id = 1")).values?.[0];
    const defaultPpnRate: number = settings?.ppn_rate ?? 0.12;
    const dueDays: number = settings?.invoice_due_days ?? 30;

    const issueDate = req.issueDate || todayLocal();
    const dueDate = req.dueDate || addDaysToDateString(issueDate, dueDays);
    const invoiceNumber = await nextInvoiceNumber(tx, issueDate);
    const now = new Date().toISOString();

    // Total diisi nol dulu; di-UPDATE setelah semua item diproses. Semua dalam satu transaksi,
    // jadi error stok di tengah jalan me-rollback invoice, item, pemotongan stok, dan mutasi.
    const invoiceId = await runInTx(
      tx,
      `INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, po_number, apply_tax, notes, status,
                             subtotal, dpp_nilai_lain, ppn_amount, total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Menunggu', 0, 0, 0, 0, ?)`,
      [
        invoiceNumber,
        req.clientId,
        dateStringToIso(issueDate),
        dateStringToIso(dueDate),
        blankToNull(req.poNumber),
        req.applyTax ? 1 : 0,
        blankToNull(req.notes),
        now,
      ],
    );

    let subtotal = 0;

    for (const item of req.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Qty harus berupa bilangan bulat lebih dari 0.");
      }

      // Stok dibaca ulang tiap baris (setelah dipotong baris sebelumnya), jadi produk yang sama di
      // beberapa baris dihitung kumulatif — sama seperti identity map EF di backend.
      const product = (await tx.query("SELECT id, sku, name, unit_price, stock FROM products WHERE id = ?", [item.productId])).values?.[0];
      if (!product) throw new Error(`Produk id ${item.productId} tidak ditemukan.`);
      if (product.stock < item.quantity) {
        throw new Error(`Stok ${product.name} tidak mencukupi. Sisa stok: ${product.stock}.`);
      }

      const unitPrice: number = item.unitPriceOverride ?? product.unit_price;
      const lineTotal = roundHalfEven(unitPrice * item.quantity, 2);
      subtotal += lineTotal;

      await runInTx(
        tx,
        `INSERT INTO invoice_items (invoice_id, product_id, product_name_snapshot, product_sku_snapshot,
                                    description, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, product.id, product.name, product.sku, item.descriptionOverride ?? null, item.quantity, unitPrice, lineTotal],
      );

      await runInTx(tx, "UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, product.id]);
      await runInTx(
        tx,
        `INSERT INTO stock_mutations (product_id, quantity_change, type, source_reference, created_at)
         VALUES (?, ?, 'InvoiceDeduction', ?, ?)`,
        [product.id, -item.quantity, invoiceNumber, now],
      );
    }

    subtotal = roundHalfEven(subtotal, 2);
    const totals = computeInvoiceTotals(subtotal, req.applyTax, req.ppnRateOverride ?? defaultPpnRate);
    await runInTx(
      tx,
      "UPDATE invoices SET subtotal = ?, dpp_nilai_lain = ?, ppn_amount = ?, total = ? WHERE id = ?",
      [totals.subtotal, totals.dppNilaiLain, totals.ppnAmount, totals.total, invoiceId],
    );

    return invoiceId;
  });

  return (await getInvoiceById(id))!;
}

export async function getInvoices(opts: { status?: string; search?: string; limit?: number } = {}): Promise<InvoiceListItemResponse[]> {
  const db = await getDb();
  const params: unknown[] = [];
  let where = "";

  const search = opts.search?.trim();
  if (search) {
    where = "WHERE (i.invoice_number LIKE ? OR c.name LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  // LIMIT hanya aman di SQL bila tidak ada filter status (status efektif difilter di JS di bawah).
  const noStatusFilter = !opts.status || opts.status === "Semua";
  const limitSql = opts.limit && noStatusFilter ? `LIMIT ${Math.floor(opts.limit)}` : "";

  const res = await db.query(
    `SELECT i.id, i.invoice_number, c.name AS client_name, i.issue_date, i.due_date, i.total, i.status
     FROM invoices i JOIN clients c ON c.id = i.client_id
     ${where}
     ORDER BY i.issue_date DESC, i.id DESC
     ${limitSql}`,
    params as never[],
  );

  let rows = (res.values ?? []).map((r) => ({
    id: r.id as number,
    invoiceNumber: r.invoice_number as string,
    clientName: r.client_name as string,
    issueDate: r.issue_date as string,
    dueDate: r.due_date as string,
    total: r.total as number,
    status: getEffectiveStatus(r.status, r.due_date),
  }));

  // Filter pada status efektif (Terlambat dihitung dinamis), bukan kolom tersimpan.
  const wanted = opts.status;
  if (wanted && wanted !== "Semua") {
    const match = ["Draft", "Menunggu", "Lunas", "Terlambat", "Dibatalkan"].find((s) => s.toLowerCase() === wanted.toLowerCase());
    if (match) rows = rows.filter((r) => r.status === match);
  }
  return opts.limit ? rows.slice(0, Math.floor(opts.limit)) : rows;
}

export async function getInvoiceById(id: number): Promise<InvoiceResponse | null> {
  const db = await getDb();
  const r = (
    await db.query(
      `SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.id = ?`,
      [id],
    )
  ).values?.[0];
  if (!r) return null;

  const items = (await db.query("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id", [id])).values ?? [];

  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    clientId: r.client_id,
    clientName: r.client_name,
    issueDate: r.issue_date,
    dueDate: r.due_date,
    poNumber: r.po_number ?? null,
    applyTax: r.apply_tax === 1,
    notes: r.notes ?? null,
    status: getEffectiveStatus(r.status, r.due_date),
    subtotal: r.subtotal,
    dppNilaiLain: r.dpp_nilai_lain,
    ppnAmount: r.ppn_amount,
    ppnRateUsed: r.dpp_nilai_lain !== 0 ? roundHalfEven(r.ppn_amount / r.dpp_nilai_lain, 4) : 0,
    total: r.total,
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name_snapshot,
      productSku: i.product_sku_snapshot,
      description: i.description ?? null,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
    })),
  };
}

/** Sama seperti backend: status langsung jadi Lunas + paid_at, tanpa cek status sebelumnya. */
export async function markInvoicePaid(id: number): Promise<InvoiceResponse> {
  const db = await getDb();
  const res = await db.run("UPDATE invoices SET status = 'Lunas', paid_at = ? WHERE id = ?", [new Date().toISOString(), id]);
  if (!res.changes?.changes) throw new Error("Invoice tidak ditemukan.");
  return (await getInvoiceById(id))!;
}

/** Hapus invoice dan kembalikan stok (mutasi ManualAdjustment "Pembatalan INV-..."), persis seperti backend. */
export async function deleteInvoice(id: number): Promise<void> {
  await withTransaction(async (tx) => {
    const inv = (await tx.query("SELECT invoice_number FROM invoices WHERE id = ?", [id])).values?.[0];
    if (!inv) throw new Error("Invoice tidak ditemukan.");

    const items = (await tx.query("SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?", [id])).values ?? [];
    const now = new Date().toISOString();

    for (const item of items) {
      const product = (await tx.query("SELECT id FROM products WHERE id = ?", [item.product_id])).values?.[0];
      if (!product) continue;
      await runInTx(tx, "UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, product.id]);
      await runInTx(
        tx,
        `INSERT INTO stock_mutations (product_id, quantity_change, type, source_reference, created_at)
         VALUES (?, ?, 'ManualAdjustment', ?, ?)`,
        [product.id, item.quantity, `Pembatalan ${inv.invoice_number}`, now],
      );
    }

    // invoice_items ikut terhapus (ON DELETE CASCADE); surat_jalan.invoice_id jadi NULL (ON DELETE SET NULL).
    await runInTx(tx, "DELETE FROM invoices WHERE id = ?", [id]);
  });
}
