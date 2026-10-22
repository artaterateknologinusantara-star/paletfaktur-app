interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
}

const toneClasses: Record<string, string> = {
  default: "text-slate-900",
  warning: "text-amber-600",
  danger: "text-red-600",
  success: "text-emerald-600",
};

export default function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
