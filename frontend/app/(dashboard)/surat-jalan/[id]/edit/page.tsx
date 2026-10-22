"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { SuratJalanResponse } from "@/lib/types";
import SuratJalanForm from "@/components/SuratJalanForm";

export default function EditSuratJalanPage() {
  const params = useParams<{ id: string }>();
  const [suratJalan, setSuratJalan] = useState<SuratJalanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<SuratJalanResponse>(`/suratjalan/${params.id}`).then(setSuratJalan).catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!suratJalan) return <p className="text-sm text-slate-400">Memuat surat jalan...</p>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/surat-jalan" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Surat Jalan</Link>
        <h1 className="text-2xl font-bold mt-1">Edit Surat Jalan {suratJalan.suratJalanNumber}</h1>
      </div>
      <SuratJalanForm existing={suratJalan} />
    </div>
  );
}
