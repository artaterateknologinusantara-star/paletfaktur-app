import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaletFaktur | CV Menjemput Berkah",
  description: "Sistem Invoice & Inventori penjualan pallet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
