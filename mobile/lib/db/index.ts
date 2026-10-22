// Pengganti lib/api.ts di frontend/: halaman cukup `import { getProducts, ... } from "@/lib/db"`.
export * from "./products";
export * from "./clients";
export * from "./invoices";
export * from "./suratJalan";
export * from "./settings";
export * from "./dashboard";
export * from "./reports";
export { computeInvoiceTotals } from "./money";
