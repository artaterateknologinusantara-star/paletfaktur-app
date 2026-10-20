"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { QuotationResponse } from "@/lib/types";
import QuotationForm from "@/components/QuotationForm";

export default function EditPenawaranPage() {
  const params = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<QuotationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<QuotationResponse>(`/quotations/${params.id}`).then(setQuotation).catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!quotation) return <p className="text-sm text-slate-400">Memuat penawaran...</p>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/penawaran" className="text-sm text-blue-600 hover:underline">← Kembali ke Daftar Penawaran</Link>
        <h1 className="text-2xl font-bold mt-1">Edit Penawaran {quotation.quotationNumber}</h1>
      </div>
      <QuotationForm existing={quotation} />
    </div>
  );
}
