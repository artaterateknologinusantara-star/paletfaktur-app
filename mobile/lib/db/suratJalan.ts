"use client";

import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { dateStringToIso } from "../format";
import type { SuratJalanListItemResponse, SuratJalanResponse } from "../types";
import { getDb, runInTx, withTransaction } from "./connection";

// Padanan SuratJalanController.cs:
//   GET /suratjalan -> getSuratJalanList, GET /{id} -> getSuratJalanById, POST -> createSuratJalan,
//   PUT /{id}/status -> updateSuratJalanStatus, DELETE -> deleteSuratJalan

const STATUSES = ["Proses", "Terkirim", "Dibatalkan"];

export interface SuratJalanItemRequest {
  itemDescription: string;
  quantity: number;
  unit: string;
  notes?: string | null;
}

export interface SuratJalanCreateRequest {
  invoiceId?: number | null;
  clientId: number;
  /** "YYYY-MM-DD" */
  deliveryDate: string;
  deliveryAddress: string;
  driverName: string;
  vehicleNumber: string;
  notes?: string | null;
  items: SuratJalanItemRequest[];
}

const blankToNull = (v?: string | null) => (v && v.trim() ? v.trim() : null);

/** SJ-00N. MAX(urutan)+1 (backend: COUNT+1, bentrok dengan UNIQUE setelah ada yang dihapus). */
async function nextSuratJalanNumber(tx: SQLiteDBConnection): Promise<string> {
  const res = await tx.query("SELECT surat_jalan_number FROM surat_jalan");
  let max = 0;
  for (const row of res.values ?? []) {
    const n = parseInt(String(row.surat_jalan_number).replace(/^SJ-/, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `SJ-${String(max + 1).padStart(3, "0")}`;
}

export async function createSuratJalan(req: SuratJalanCreateRequest): Promise<SuratJalanResponse> {
  if (!req.items || req.items.length === 0) throw new Error("Surat jalan harus memiliki minimal satu barang.");

  const id = await withTransaction(async (tx) => {
    const client = (await tx.query("SELECT id, name FROM clients WHERE id = ?", [req.clientId])).values?.[0];
    if (!client) throw new Error("Klien tidak ditemukan.");

    // Referensi invoice opsional; bila id tidak ditemukan, diabaikan (null) seperti backend.
    let invoiceId: number | null = null;
    if (req.invoiceId) {
      const inv = (await tx.query("SELECT id FROM invoices WHERE id = ?", [req.invoiceId])).values?.[0];
      invoiceId = inv ? inv.id : null;
    }

    const sjId = await runInTx(
      tx,
      `INSERT INTO surat_jalan (surat_jalan_number, invoice_id, client_id, recipient_name, delivery_date,
                                delivery_address, driver_name, vehicle_number, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Proses', ?)`,
      [
        await nextSuratJalanNumber(tx),
        invoiceId,
        client.id,
        client.name,
        dateStringToIso(req.deliveryDate),
        req.deliveryAddress.trim(),
        req.driverName.trim(),
        req.vehicleNumber.trim(),
        blankToNull(req.notes),
        new Date().toISOString(),
      ],
    );

    for (const item of req.items) {
      await runInTx(
        tx,
        "INSERT INTO surat_jalan_items (surat_jalan_id, item_description, quantity, unit, notes) VALUES (?, ?, ?, ?, ?)",
        [sjId, item.itemDescription.trim(), item.quantity, item.unit.trim() || "pcs", blankToNull(item.notes)],
      );
    }
    return sjId;
  });

  return (await getSuratJalanById(id))!;
}

export async function getSuratJalanList(opts: { status?: string; search?: string } = {}): Promise<SuratJalanListItemResponse[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  const status = STATUSES.find((s) => s.toLowerCase() === opts.status?.toLowerCase());
  if (status) {
    where.push("s.status = ?");
    params.push(status);
  }
  const search = opts.search?.trim();
  if (search) {
    where.push("(s.surat_jalan_number LIKE ? OR s.recipient_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const res = await db.query(
    `SELECT s.id, s.surat_jalan_number, i.invoice_number, s.recipient_name, s.delivery_date, s.driver_name, s.status
     FROM surat_jalan s LEFT JOIN invoices i ON i.id = s.invoice_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY s.created_at DESC, s.id DESC`,
    params as never[],
  );

  return (res.values ?? []).map((r) => ({
    id: r.id,
    suratJalanNumber: r.surat_jalan_number,
    invoiceNumber: r.invoice_number ?? null,
    recipientName: r.recipient_name,
    deliveryDate: r.delivery_date,
    driverName: r.driver_name,
    status: r.status,
  }));
}

export async function getSuratJalanById(id: number): Promise<SuratJalanResponse | null> {
  const db = await getDb();
  const r = (
    await db.query(
      `SELECT s.*, i.invoice_number, c.name AS client_name
       FROM surat_jalan s
       JOIN clients c ON c.id = s.client_id
       LEFT JOIN invoices i ON i.id = s.invoice_id
       WHERE s.id = ?`,
      [id],
    )
  ).values?.[0];
  if (!r) return null;

  const items = (await db.query("SELECT * FROM surat_jalan_items WHERE surat_jalan_id = ? ORDER BY id", [id])).values ?? [];

  return {
    id: r.id,
    suratJalanNumber: r.surat_jalan_number,
    invoiceNumber: r.invoice_number ?? null,
    clientName: r.client_name ?? r.recipient_name,
    deliveryDate: r.delivery_date,
    deliveryAddress: r.delivery_address,
    driverName: r.driver_name,
    vehicleNumber: r.vehicle_number,
    notes: r.notes ?? null,
    status: r.status,
    items: items.map((i) => ({
      itemDescription: i.item_description,
      quantity: i.quantity,
      unit: i.unit,
      notes: i.notes ?? null,
    })),
  };
}

export async function updateSuratJalanStatus(id: number, status: string): Promise<SuratJalanResponse> {
  const parsed = STATUSES.find((s) => s.toLowerCase() === status.toLowerCase());
  if (!parsed) throw new Error("Status tidak valid.");

  const db = await getDb();
  const res = await db.run("UPDATE surat_jalan SET status = ? WHERE id = ?", [parsed, id]);
  if (!res.changes?.changes) throw new Error("Surat jalan tidak ditemukan.");
  return (await getSuratJalanById(id))!;
}

export async function deleteSuratJalan(id: number): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM surat_jalan WHERE id = ?", [id]); // surat_jalan_items ikut terhapus (CASCADE)
}
