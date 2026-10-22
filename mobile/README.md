# PaletFaktur Mobile (Android, offline)

Versi Android dari PaletFaktur yang berjalan **100% di HP, tanpa internet dan tanpa backend**. Dibangun dengan Next.js
(static export) yang dibungkus Capacitor, dengan database SQLite lokal. Terpisah dari `backend/` dan `frontend/`.

> ## ⚠️ Peringatan untuk pemakai: data hanya ada di HP ini
> Semua data (produk, klien, invoice, surat jalan, pengaturan, logo) disimpan di **penyimpanan privat aplikasi**.
> - **Menghapus (uninstall) aplikasi = semua data hilang permanen.** Begitu juga "Hapus data" / "Clear storage" di setelan Android.
> - Data **tidak** ikut backup Google maupun transfer antar HP (sengaja dimatikan, lihat bagian Keamanan). HP hilang atau rusak = data hilang.
> - Aplikasi ini belum punya fitur ekspor/backup data. Satu-satunya salinan di luar HP adalah PDF yang Anda bagikan sendiri.
> - Memasang APK **dengan tanda tangan berbeda** di atas versi lama (mis. release di atas debug) memaksa uninstall dulu, dan itu menghapus data.

## Fitur
Dashboard, Invoice (pajak DPP Nilai Lain 11/12, potong stok otomatis), Surat Jalan, Inventori, Klien, Laporan, Pengaturan
(identitas perusahaan, rekening, PPN, jatuh tempo, logo), dan ekspor PDF faktur/surat jalan.
Tidak ada login atau akun: aplikasi satu pengguna di satu HP.

## Prasyarat (sekali saja)
| Kebutuhan | Versi |
|---|---|
| Node.js | 22 atau lebih baru |
| JDK | 21 (Temurin atau OpenJDK) |
| Android SDK | `platforms;android-36`, `build-tools;36.0.0`, `platform-tools` (dan `emulator` + system image bila tes di emulator) |

1. Pasang JDK 21 dan Android SDK (Android Studio atau cukup *command-line tools* + `sdkmanager`).
2. Setel variabel lingkungan, mis. di `~/.zshrc`:
   ```sh
   export JAVA_HOME=/path/ke/jdk-21
   export ANDROID_HOME=/path/ke/android-sdk
   export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
   ```
3. Buat `android/local.properties` (sudah di-gitignore) berisi lokasi SDK:
   ```properties
   sdk.dir=/path/ke/android-sdk
   ```
4. Pasang dependensi: `npm install`

## Alur kerja sehari-hari
Setiap kali kode (folder `app/`, `components/`, `lib/`) berubah, build web lalu sinkronkan ke proyek Android:

```sh
npm run build && npx cap sync android
```

`npm run build` menghasilkan `out/` (static export). `cap sync` menyalinnya ke `android/app/src/main/assets/public`
dan memperbarui plugin native. Lupa langkah ini = APK berisi kode lama.

## Build APK debug
```sh
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```
Hasil: `android/app/build/outputs/apk/debug/app-debug.apk`. Pasang ke HP/emulator:
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk` (`-r` mempertahankan data bila tanda tangannya sama).

Pintasan: `npm run apk:debug` menjalankan ketiga langkah di atas.

Catatan pengembangan: database hanya jalan di Android. `npm run dev` di browser hanya untuk melihat tampilan, dan halaman
yang membaca database akan menampilkan pesan error.

## Keamanan data lokal
- `AndroidManifest.xml`: `android:allowBackup="false"`, `android:fullBackupContent="false"`, dan
  `android:dataExtractionRules` menunjuk `res/xml/data_extraction_rules.xml` yang mengecualikan semua domain data dari
  cloud backup **dan** transfer antar perangkat (Android 12+).
- Tanpa permission `INTERNET`: OS memblokir semua akses jaringan dari aplikasi ini.
- Database SQLite **belum dienkripsi**. Perlindungannya adalah kunci layar HP dan sandbox Android. Bila nanti perlu PIN
  yang sungguhan, tambahkan enkripsi (SQLCipher) bersamaan dengan PIN lock, bukan PIN saja.
- Verifikasi hasil build: `aapt dump xmltree app-debug.apk AndroidManifest.xml | grep -i backup`
  (nilai `allowBackup` harus `0x0`).

## Release APK (dikerjakan manual oleh pemilik)
Proyek ini **sengaja tidak berisi keystore maupun signingConfig**: password keystore harus dipegang pemilik sendiri.
Langkah saat siap merilis:

1. **Buat keystore** (sekali; simpan file dan password di tempat aman, di luar repo. Kehilangannya berarti tidak bisa
   merilis pembaruan yang menimpa versi terpasang):
   ```sh
   keytool -genkeypair -v -keystore ~/paletfaktur-release.jks -alias paletfaktur \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
   `*.jks` dan `*.keystore` sudah di-gitignore, tetapi tetap simpan di luar folder proyek.
2. **Isi `android/app/build.gradle`** dengan `signingConfigs` dan arahkan `release` ke sana. Baca password dari
   `~/.gradle/gradle.properties` (di luar repo), jangan ditulis di file proyek:
   ```groovy
   android {
       signingConfigs {
           release {
               storeFile file(System.getProperty("user.home") + "/paletfaktur-release.jks")
               storePassword project.findProperty("PF_STORE_PASSWORD")
               keyAlias "paletfaktur"
               keyPassword project.findProperty("PF_KEY_PASSWORD")
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               // ...isi buildTypes.release yang sudah ada tetap dipertahankan
           }
       }
   }
   ```
   ```properties
   # ~/.gradle/gradle.properties  (bukan di repo)
   PF_STORE_PASSWORD=...
   PF_KEY_PASSWORD=...
   ```
3. **Build**: `npm run build && npx cap sync android && cd android && ./gradlew assembleRelease`.
   Hasil: `android/app/build/outputs/apk/release/app-release.apk`.
4. **Peringatan sebelum memasang**: APK release bertanda tangan berbeda dari APK debug, jadi HP yang sudah memakai versi
   debug harus uninstall dulu (data hilang). Pakai HP/emulator bersih untuk uji, atau pindahkan data penting dulu
   (misalnya lewat PDF).

## Struktur
- `lib/db/schema.ts`: skema SQLite dan migrasi (`PRAGMA user_version`), setara model C# di `backend/PaletFaktur.Api/Models/`
- `lib/db/*.ts`: repository, pengganti `frontend/lib/api.ts` (nama fungsi mengikuti endpoint backend)
- `lib/pdf/`: pembuat PDF (jsPDF). Layout-nya terpisah dari layar pratinjau; ubah keduanya bila tampilan faktur berubah
- `lib/logo.ts`: simpan/baca logo di `files/logo/` (Capacitor Filesystem)
- Halaman detail memakai query string (`/invoice/detail/?id=N`) karena route dinamis `[id]` tidak bisa di static export
- Beda yang disengaja dari backend: nomor INV/SJ memakai MAX+1 (backend COUNT+1 bentrok setelah ada yang dihapus);
  tanggal default memakai jam HP, bukan UTC; qty ≤ 0 ditolak
