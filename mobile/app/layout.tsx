import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "PaletFaktur Mobile",
  description: "Invoice & Inventori penjualan pallet (offline)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <main className="min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-28">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
