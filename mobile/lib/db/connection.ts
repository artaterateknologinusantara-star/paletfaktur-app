"use client";

import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { MIGRATIONS, SCHEMA_VERSION } from "./schema";

const DB_NAME = "paletfaktur";

const sqlite = new SQLiteConnection(CapacitorSQLite);
let dbPromise: Promise<SQLiteDBConnection> | null = null;

async function openDb(): Promise<SQLiteDBConnection> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Database lokal hanya tersedia di aplikasi Android (Capacitor). Jalankan lewat APK/emulator.");
  }

  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const db =
    consistent && exists
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);

  await db.open();
  await db.execute("PRAGMA foreign_keys = ON;", false);
  await migrate(db);
  return db;
}

/** Migrasi berbasis PRAGMA user_version: jalankan tiap versi yang belum diterapkan, berurutan. */
async function migrate(db: SQLiteDBConnection) {
  const res = await db.query("PRAGMA user_version;");
  const current: number = res.values?.[0]?.user_version ?? 0;

  if (current >= SCHEMA_VERSION) return;

  // Rebuild tabel (DROP + RENAME) aman hanya bila FK dimatikan; PRAGMA ini tidak berlaku di dalam transaksi.
  await db.execute("PRAGMA foreign_keys = OFF;", false);
  try {
    for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
      const statements = MIGRATIONS[v];
      if (!statements) throw new Error(`Migrasi database versi ${v} tidak ditemukan.`);
      await db.execute(statements.join(";\n") + ";", true);
      await db.execute(`PRAGMA user_version = ${v};`, false);
    }
    const violations = await db.query("PRAGMA foreign_key_check;");
    if (violations.values?.length) throw new Error("Migrasi database menghasilkan data yang melanggar foreign key.");
  } finally {
    await db.execute("PRAGMA foreign_keys = ON;", false);
  }
}

/** Koneksi singleton; dibuka & dimigrasi sekali saat pertama dipanggil. */
export function getDb(): Promise<SQLiteDBConnection> {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      dbPromise = null; // izinkan retry
      throw err;
    });
  }
  return dbPromise;
}

/** Jalankan beberapa statement secara atomik (rollback otomatis bila ada yang gagal). */
export async function withTransaction<T>(fn: (db: SQLiteDBConnection) => Promise<T>): Promise<T> {
  const db = await getDb();
  await db.beginTransaction();
  try {
    const result = await fn(db);
    await db.commitTransaction();
    return result;
  } catch (err) {
    await db.rollbackTransaction();
    throw err;
  }
}

/** Gunakan ini (bukan db.run langsung) di dalam withTransaction agar tidak membuka transaksi bersarang. */
export async function runInTx(db: SQLiteDBConnection, sql: string, values: unknown[] = []) {
  const res = await db.run(sql, values as never[], false);
  return res.changes?.lastId ?? 0;
}
