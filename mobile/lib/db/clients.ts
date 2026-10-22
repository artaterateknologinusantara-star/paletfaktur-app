"use client";

import { getDb, runInTx, withTransaction } from "./connection";
import type { ClientResponse } from "../types";

// Padanan ClientsController.cs: GET /clients -> getClients, POST -> createClient, DELETE -> deleteClient

interface ClientRow {
  id: number;
  client_code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: number;
  created_at: string;
}

function toClient(r: ClientRow): ClientResponse {
  return {
    id: r.id,
    clientCode: r.client_code,
    name: r.name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    address: r.address ?? null,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
  };
}

export async function getClients(opts: { search?: string } = {}): Promise<ClientResponse[]> {
  const db = await getDb();
  const where = ["is_active = 1"];
  const params: unknown[] = [];

  const search = opts.search?.trim();
  if (search) {
    where.push("(name LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const res = await db.query(`SELECT * FROM clients WHERE ${where.join(" AND ")} ORDER BY id`, params as never[]);
  return ((res.values ?? []) as ClientRow[]).map(toClient);
}

export interface ClientCreateRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

const blankToNull = (v?: string) => (v && v.trim() ? v.trim() : null);

export async function createClient(req: ClientCreateRequest): Promise<ClientResponse> {
  const id = await withTransaction(async (tx) => {
    // Sama seperti backend: kode = CLT-{jumlah seluruh klien + 1} (klien nonaktif tetap dihitung).
    const count = (await tx.query("SELECT COUNT(*) AS n FROM clients")).values?.[0]?.n ?? 0;
    return runInTx(
      tx,
      `INSERT INTO clients (client_code, name, email, phone, address, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [`CLT-${count + 1}`, req.name.trim(), blankToNull(req.email), blankToNull(req.phone), blankToNull(req.address), new Date().toISOString()],
    );
  });

  const db = await getDb();
  const res = await db.query("SELECT * FROM clients WHERE id = ?", [id]);
  return toClient(res.values![0] as ClientRow);
}

/** Soft delete (is_active = 0), sama seperti backend, agar invoice lama tetap merujuk klien ini. */
export async function deleteClient(id: number): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE clients SET is_active = 0 WHERE id = ?", [id]);
}
