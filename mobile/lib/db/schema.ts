// Skema SQLite lokal, setara dengan model C# di backend/PaletFaktur.Api/Models/.
//
// Konvensi pemetaan:
//  - Nama tabel & kolom snake_case dari properti C# PascalCase (ClientCode -> client_code).
//  - bool        -> INTEGER 0/1
//  - DateTime    -> TEXT ISO-8601 UTC
//  - decimal     -> REAL (rupiah, tanpa pecahan di praktik)
//  - enum        -> TEXT berisi nama enum C# (mis. 'Menunggu', 'RestockIn') agar sama dengan backend
//  - navigation property (Client, Items, ...) tidak jadi kolom; diganti FOREIGN KEY.
//  - User.cs sengaja tidak dibawa: mobile offline tidak punya login.

/** Naikkan SCHEMA_VERSION dan tambah entri baru di MIGRATIONS setiap kali skema berubah. */
export const SCHEMA_VERSION = 2;

export const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS products (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      sku                 TEXT NOT NULL UNIQUE,
      name                TEXT NOT NULL,
      category            TEXT NOT NULL,
      unit_price          REAL NOT NULL DEFAULT 0,
      stock               INTEGER NOT NULL DEFAULT 0,
      min_stock_threshold INTEGER NOT NULL DEFAULT 0,
      is_active           INTEGER NOT NULL DEFAULT 1
    )`,

    `CREATE TABLE IF NOT EXISTS clients (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      client_code TEXT NOT NULL,
      name        TEXT NOT NULL,
      email       TEXT,
      phone       TEXT,
      address     TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS invoices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      client_id      INTEGER NOT NULL REFERENCES clients(id),
      issue_date     TEXT NOT NULL,
      due_date       TEXT NOT NULL,
      po_number      TEXT,
      apply_tax      INTEGER NOT NULL DEFAULT 1,
      notes          TEXT,
      status         TEXT NOT NULL DEFAULT 'Draft'
                     CHECK (status IN ('Draft','Menunggu','Lunas','Terlambat','Dibatalkan')),
      subtotal       REAL NOT NULL DEFAULT 0,
      dpp_nilai_lain REAL NOT NULL DEFAULT 0,
      ppn_amount     REAL NOT NULL DEFAULT 0,
      total          REAL NOT NULL DEFAULT 0,
      paid_at        TEXT,
      created_at     TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS invoice_items (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id            INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id            INTEGER NOT NULL REFERENCES products(id),
      product_name_snapshot TEXT NOT NULL,
      product_sku_snapshot  TEXT NOT NULL,
      description           TEXT,
      quantity              INTEGER NOT NULL,
      unit_price            REAL NOT NULL,
      line_total            REAL NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS surat_jalan (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      surat_jalan_number TEXT NOT NULL UNIQUE,
      invoice_id         INTEGER REFERENCES invoices(id),
      client_id          INTEGER NOT NULL REFERENCES clients(id),
      recipient_name     TEXT NOT NULL,
      delivery_date      TEXT NOT NULL,
      delivery_address   TEXT NOT NULL,
      driver_name        TEXT NOT NULL,
      vehicle_number     TEXT NOT NULL,
      notes              TEXT,
      status             TEXT NOT NULL DEFAULT 'Proses'
                         CHECK (status IN ('Proses','Terkirim','Dibatalkan')),
      created_at         TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS surat_jalan_items (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      surat_jalan_id   INTEGER NOT NULL REFERENCES surat_jalan(id) ON DELETE CASCADE,
      item_description TEXT NOT NULL,
      quantity         REAL NOT NULL,
      unit             TEXT NOT NULL DEFAULT 'pcs',
      notes            TEXT
    )`,

    // Single-row (id selalu 1), seperti CompanySettings.cs
    `CREATE TABLE IF NOT EXISTS company_settings (
      id                  INTEGER PRIMARY KEY CHECK (id = 1),
      logo_url            TEXT,
      company_name        TEXT NOT NULL DEFAULT '',
      phone               TEXT,
      email               TEXT,
      signatory_name      TEXT,
      signatory_title     TEXT,
      address             TEXT,
      bank_name           TEXT,
      bank_account_number TEXT,
      bank_account_holder TEXT,
      ppn_rate            REAL NOT NULL DEFAULT 0.12,
      invoice_due_days    INTEGER NOT NULL DEFAULT 30
    )`,
    `INSERT OR IGNORE INTO company_settings (id) VALUES (1)`,

    `CREATE TABLE IF NOT EXISTS stock_mutations (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id       INTEGER NOT NULL REFERENCES products(id),
      quantity_change  INTEGER NOT NULL,
      type             TEXT NOT NULL
                       CHECK (type IN ('ManualAdjustment','InvoiceDeduction','RestockIn')),
      source_reference TEXT,
      created_at       TEXT NOT NULL
    )`,

    `CREATE INDEX IF NOT EXISTS ix_invoices_client ON invoices(client_id)`,
    `CREATE INDEX IF NOT EXISTS ix_invoice_items_invoice ON invoice_items(invoice_id)`,
    `CREATE INDEX IF NOT EXISTS ix_surat_jalan_invoice ON surat_jalan(invoice_id)`,
    `CREATE INDEX IF NOT EXISTS ix_surat_jalan_items_sj ON surat_jalan_items(surat_jalan_id)`,
    `CREATE INDEX IF NOT EXISTS ix_stock_mutations_product ON stock_mutations(product_id)`,
    `CREATE INDEX IF NOT EXISTS ix_stock_mutations_created ON stock_mutations(created_at)`,
  ],

  // v2: surat_jalan.invoice_id harus ON DELETE SET NULL (seperti DeleteBehavior.SetNull di AppDbContext),
  // supaya menghapus invoice tidak gagal / tidak ikut menghapus surat jalan. SQLite tidak bisa ALTER FK,
  // jadi tabel dibangun ulang (migrate() mematikan foreign_keys selama migrasi ini).
  // Juga mengisi identitas perusahaan awal sama seperti seed data backend (hanya jika masih kosong).
  2: [
    `CREATE TABLE surat_jalan_new (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      surat_jalan_number TEXT NOT NULL UNIQUE,
      invoice_id         INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      client_id          INTEGER NOT NULL REFERENCES clients(id),
      recipient_name     TEXT NOT NULL,
      delivery_date      TEXT NOT NULL,
      delivery_address   TEXT NOT NULL,
      driver_name        TEXT NOT NULL,
      vehicle_number     TEXT NOT NULL,
      notes              TEXT,
      status             TEXT NOT NULL DEFAULT 'Proses'
                         CHECK (status IN ('Proses','Terkirim','Dibatalkan')),
      created_at         TEXT NOT NULL
    )`,
    `INSERT INTO surat_jalan_new SELECT * FROM surat_jalan`,
    `DROP TABLE surat_jalan`,
    `ALTER TABLE surat_jalan_new RENAME TO surat_jalan`,
    `CREATE INDEX IF NOT EXISTS ix_surat_jalan_invoice ON surat_jalan(invoice_id)`,
    `UPDATE company_settings SET
       company_name = 'CV Menjemput Berkah',
       phone = '081292977009',
       email = 'www.palletplastikpalingmurah.com',
       signatory_name = 'Ach Lukman H',
       signatory_title = 'CEO',
       address = 'Jl. Inspeksi Kalimalang Kp. Pasir Iimus RT.008 / 004 Kec. Cikarang Utara Kab. Bekasi',
       bank_name = 'BCA',
       bank_account_number = '12391795817598',
       bank_account_holder = 'CV Menjemput Berkah'
     WHERE id = 1 AND company_name = ''`,
  ],
};
