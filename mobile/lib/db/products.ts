"use client";

import { getDb, runInTx, withTransaction } from "./connection";
import type { ProductResponse, StockMutationResponse } from "../types";

// Padanan ProductsController.cs. Nama fungsi mengikuti endpoint:
//   GET /products -> getProducts, POST /products -> createProduct,
//   PUT /products/{id}/stock -> updateProductStock, DELETE /products/{id} -> deleteProduct,
//   GET /products/mutations -> getStockMutations

interface ProductRow {
  id: number;
  sku: string;
  category: string;
  name: string;
  unit_price: number;
  stock: number;
  min_stock_threshold: number;
  is_active: number;
}

function toProduct(r: ProductRow): ProductResponse {
  return {
    id: r.id,
    sku: r.sku,
    category: r.category,
    name: r.name,
    unitPrice: r.unit_price,
    stock: r.stock,
    minStockThreshold: r.min_stock_threshold,
    isActive: r.is_active === 1,
  };
}

export async function getProducts(opts: { search?: string; category?: string } = {}): Promise<ProductResponse[]> {
  const db = await getDb();
  const where = ["is_active = 1"];
  const params: unknown[] = [];

  const search = opts.search?.trim();
  if (search) {
    where.push("(sku LIKE ? OR name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (opts.category && opts.category !== "Semua Kategori") {
    where.push("category = ?");
    params.push(opts.category);
  }

  const res = await db.query(`SELECT * FROM products WHERE ${where.join(" AND ")} ORDER BY sku`, params as never[]);
  return ((res.values ?? []) as ProductRow[]).map(toProduct);
}

export async function getProduct(id: number): Promise<ProductResponse | null> {
  const db = await getDb();
  const res = await db.query("SELECT * FROM products WHERE id = ?", [id]);
  const row = res.values?.[0] as ProductRow | undefined;
  return row ? toProduct(row) : null;
}

export interface ProductCreateRequest {
  sku: string;
  category: string;
  name: string;
  unitPrice: number;
  initialStock: number;
  minStockThreshold: number;
}

export async function createProduct(req: ProductCreateRequest): Promise<ProductResponse> {
  const sku = req.sku.trim();
  const db = await getDb();

  // Sama seperti backend: SKU dicek terhadap semua produk, termasuk yang sudah dinonaktifkan.
  const dup = await db.query("SELECT 1 FROM products WHERE sku = ? LIMIT 1", [sku]);
  if (dup.values?.length) throw new Error("Kode SKU sudah terdaftar.");

  const id = await withTransaction(async (tx) => {
    const productId = await runInTx(
      tx,
      `INSERT INTO products (sku, name, category, unit_price, stock, min_stock_threshold, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [sku, req.name.trim(), req.category.trim(), req.unitPrice, req.initialStock, req.minStockThreshold],
    );
    await runInTx(
      tx,
      `INSERT INTO stock_mutations (product_id, quantity_change, type, source_reference, created_at)
       VALUES (?, ?, 'RestockIn', 'Registrasi Unit Katalog Baru', ?)`,
      [productId, req.initialStock, new Date().toISOString()],
    );
    return productId;
  });

  return (await getProduct(id))!;
}

export async function updateProductStock(id: number, newStock: number, reason?: string): Promise<ProductResponse> {
  await withTransaction(async (tx) => {
    const res = await tx.query("SELECT stock FROM products WHERE id = ?", [id]);
    const current = res.values?.[0]?.stock as number | undefined;
    if (current === undefined) throw new Error("Produk tidak ditemukan.");

    const delta = newStock - current;
    await runInTx(tx, "UPDATE products SET stock = ? WHERE id = ?", [newStock, id]);
    if (delta !== 0) {
      await runInTx(
        tx,
        `INSERT INTO stock_mutations (product_id, quantity_change, type, source_reference, created_at)
         VALUES (?, ?, 'ManualAdjustment', ?, ?)`,
        [id, delta, reason ?? "Opname manual", new Date().toISOString()],
      );
    }
  });
  return (await getProduct(id))!;
}

/** Soft delete (is_active = 0), sama seperti backend, agar riwayat mutasi/invoice tetap utuh. */
export async function deleteProduct(id: number): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE products SET is_active = 0 WHERE id = ?", [id]);
}

export async function getStockMutations(take = 20): Promise<StockMutationResponse[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT m.id, m.product_id, p.name AS product_name, p.sku AS product_sku,
            m.quantity_change, m.type, m.source_reference, m.created_at
     FROM stock_mutations m JOIN products p ON p.id = m.product_id
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ?`,
    [take],
  );
  return (res.values ?? []).map((r) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    productSku: r.product_sku,
    quantityChange: r.quantity_change,
    type: r.type,
    sourceReference: r.source_reference ?? null,
    createdAt: r.created_at,
  }));
}
