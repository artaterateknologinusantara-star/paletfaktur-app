"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Tambah item di sini saat fitur lain di-port (Dashboard, Laporan, Pengaturan menyusul).
const NAV_ITEMS = [
  { href: "/dashboard/", label: "Dashboard", icon: "▦", match: ["/dashboard"] },
  { href: "/invoice/", label: "Invoice", icon: "▤", match: ["/invoice"] },
  { href: "/surat-jalan/", label: "Surat Jalan", icon: "▭", match: ["/surat-jalan"] },
  { href: "/inventori/", label: "Inventori", icon: "▣", match: ["/inventori"] },
  // Klien, Laporan, Pengaturan ada di halaman Menu agar bar bawah tidak sesak.
  { href: "/menu/", label: "Menu", icon: "☰", match: ["/menu", "/klien", "/laporan", "/pengaturan"] },
];

/**
 * True selama keyboard layar benar-benar terbuka. Dengan adjustResize WebView mengecil saat keyboard muncul, dan
 * elemen fixed bottom-0 ikut naik di atas keyboard (memakan ruang ketik). Deteksi lewat ukuran viewport, BUKAN lewat
 * fokus field: menutup keyboard dengan tombol Back membiarkan field tetap fokus, sementara viewport kembali penuh.
 */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const height = () => vv?.height ?? window.innerHeight;
    let full = Math.max(height(), window.innerHeight);

    const update = () => {
      const h = height();
      // Viewport penuh baru (rotasi / bar sistem berubah) saat tidak ada keyboard: perbarui acuan.
      if (h > full) full = h;
      setOpen(full - h > 150);
    };
    const onOrientation = () => {
      full = height();
      setOpen(false);
    };

    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", onOrientation);
    return () => {
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, []);
  return open;
}

export default function BottomNav() {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  if (keyboardOpen) return null;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950 text-slate-300 flex pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map((item) => {
        const active = item.match.some((base) => pathname === base || pathname.startsWith(`${base}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? "text-white font-semibold" : ""}`}
          >
            <span className={`text-lg leading-none px-3.5 py-1 rounded-full ${active ? "bg-blue-600" : ""}`}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
