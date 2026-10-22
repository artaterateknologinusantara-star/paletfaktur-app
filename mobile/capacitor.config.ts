import type { CapacitorConfig } from "@capacitor/cli";

// Sengaja TIDAK ada `server.url`: aplikasi memuat aset statis dari APK (folder out/), 100% offline.
const config: CapacitorConfig = {
  appId: "com.menjemputberkah.paletfaktur",
  appName: "PaletFaktur",
  webDir: "out",
};

export default config;
