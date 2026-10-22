import type { NextConfig } from "next";

// Static export: hasil build ada di ./out dan dibungkus Capacitor (webDir: "out").
// Tidak ada server Next.js / backend ASP.NET di versi mobile ini.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
