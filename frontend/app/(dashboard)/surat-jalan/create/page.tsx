"use client";

import Link from "next/link";
import SuratJalanForm from "@/components/SuratJalanForm";

export default function BuatSuratJalanPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/surat-jalan" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Surat Jalan</Link>
        <h1 className="text-2xl font-bold mt-1">Buat Surat Jalan</h1>
      </div>
      <SuratJalanForm />
    </div>
  );
}
