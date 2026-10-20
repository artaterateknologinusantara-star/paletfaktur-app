"use client";

import Link from "next/link";
import QuotationForm from "@/components/QuotationForm";

export default function BuatPenawaranPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/penawaran" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Penawaran</Link>
        <h1 className="text-2xl font-bold mt-1">Buat Penawaran Harga</h1>
      </div>
      <QuotationForm />
    </div>
  );
}
