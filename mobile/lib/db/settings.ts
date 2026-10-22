"use client";

import { getDb } from "./connection";
import type { CompanySettingsResponse } from "../types";

// Padanan GET /settings (SettingsController). Tahap ini hanya baca; halaman Pengaturan untuk edit menyusul.

export async function getCompanySettings(): Promise<CompanySettingsResponse> {
  const db = await getDb();
  const r = (await db.query("SELECT * FROM company_settings WHERE id = 1")).values?.[0];
  if (!r) throw new Error("Pengaturan perusahaan tidak ditemukan.");
  return {
    logoUrl: r.logo_url ?? null,
    companyName: r.company_name,
    phone: r.phone ?? null,
    email: r.email ?? null,
    signatoryName: r.signatory_name ?? null,
    signatoryTitle: r.signatory_title ?? null,
    address: r.address ?? null,
    bankName: r.bank_name ?? null,
    bankAccountNumber: r.bank_account_number ?? null,
    bankAccountHolder: r.bank_account_holder ?? null,
    ppnRate: r.ppn_rate,
    invoiceDueDays: r.invoice_due_days,
  };
}

export type CompanySettingsUpdateRequest = CompanySettingsResponse;

const blankToNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** Padanan PUT /settings. Backend tidak memvalidasi; di sini ditambah pengaman agar PPN/jatuh tempo tidak merusak invoice berikutnya. */
export async function updateCompanySettings(req: CompanySettingsUpdateRequest): Promise<CompanySettingsResponse> {
  if (!req.companyName.trim()) throw new Error("Nama perusahaan wajib diisi.");
  if (!(req.ppnRate >= 0 && req.ppnRate <= 1)) throw new Error("Tarif PPN harus antara 0% dan 100%.");
  if (!Number.isInteger(req.invoiceDueDays) || req.invoiceDueDays < 1) throw new Error("Jatuh tempo invoice minimal 1 hari.");

  const db = await getDb();
  await db.run(
    `UPDATE company_settings SET
       logo_url = ?, company_name = ?, phone = ?, email = ?, signatory_name = ?, signatory_title = ?, address = ?,
       bank_name = ?, bank_account_number = ?, bank_account_holder = ?, ppn_rate = ?, invoice_due_days = ?
     WHERE id = 1`,
    [
      blankToNull(req.logoUrl), req.companyName.trim(), blankToNull(req.phone), blankToNull(req.email),
      blankToNull(req.signatoryName), blankToNull(req.signatoryTitle), blankToNull(req.address),
      blankToNull(req.bankName), blankToNull(req.bankAccountNumber), blankToNull(req.bankAccountHolder),
      req.ppnRate, req.invoiceDueDays,
    ],
  );
  return getCompanySettings();
}
