import type { NextConfig } from "next";

// Sub-path deployment (mis. "/pallet" di bawah demo.arunapps.com). Kosong = root (dev lokal tidak berubah).
// Nilai ini ikut tertanam saat build, jadi harus tersedia di env saat `next build`.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
