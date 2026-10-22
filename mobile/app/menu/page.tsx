import Link from "next/link";

const ITEMS = [
  { href: "/klien/", label: "Klien", desc: "Katalog mitra dan kontak penagihan", icon: "◍" },
  { href: "/laporan/", label: "Laporan", desc: "Omset, piutang, aset gudang, produk terlaris", icon: "▲" },
  { href: "/pengaturan/", label: "Pengaturan", desc: "Identitas perusahaan, rekening, PPN & jatuh tempo", icon: "⚙" },
];

export default function MenuPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Menu</h1>
      <ul className="space-y-3">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4">
              <span className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-lg">{item.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-sm">{item.label}</span>
                <span className="block text-xs text-slate-500">{item.desc}</span>
              </span>
              <span className="text-slate-300">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-400 mt-6">
        Aplikasi offline satu pengguna: seluruh data tersimpan di perangkat ini. Tanpa akun/login; perlindungan data mengandalkan kunci layar HP.
      </p>
    </div>
  );
}
