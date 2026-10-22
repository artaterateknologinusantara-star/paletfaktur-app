const STYLES: Record<string, string> = {
  Lunas: "bg-emerald-100 text-emerald-700",
  Menunggu: "bg-amber-100 text-amber-700",
  Terlambat: "bg-red-100 text-red-700",
  Draft: "bg-slate-100 text-slate-600",
  Dibatalkan: "bg-slate-100 text-slate-500 line-through",
  Proses: "bg-amber-100 text-amber-700",
  Terkirim: "bg-emerald-100 text-emerald-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
