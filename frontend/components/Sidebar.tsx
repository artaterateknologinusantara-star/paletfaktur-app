"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/invoice", label: "Invoice", icon: "▤" },
  { href: "/invoice/create", label: "Invoice dari Penawaran", icon: "＋" },
  { href: "/penawaran", label: "Penawaran", icon: "✉" },
  { href: "/surat-jalan", label: "Surat Jalan", icon: "▭" },
  { href: "/inventori", label: "Inventori", icon: "▣" },
  { href: "/klien", label: "Klien", icon: "◍" },
  { href: "/laporan", label: "Laporan", icon: "▲" },
  { href: "/pengaturan", label: "Pengaturan", icon: "⚙" },
  { href: "/akun", label: "Akun", icon: "●" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <aside className="print:hidden w-60 shrink-0 bg-slate-950 text-slate-200 min-h-screen flex flex-col">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
          INV
        </div>
        <div>
          <p className="font-bold leading-tight text-sm">PaletFaktur</p>
          <p className="text-[11px] text-slate-400 leading-tight">Invoice & Inventori</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-slate-400 hover:text-white transition"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
