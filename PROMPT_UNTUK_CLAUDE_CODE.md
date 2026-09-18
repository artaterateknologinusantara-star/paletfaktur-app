# Prompt untuk Claude Code — Aplikasi PaletFaktur (Invoice & Inventori Penjualan Pallet)

Salin seluruh isi di bawah ini ke Claude Code (di VS Code, jalankan di root folder project ini) untuk melanjutkan pembangunan aplikasi.

---

## PROMPT

Saya sedang membangun aplikasi **invoice & inventori** untuk bisnis penjualan pallet plastik milik **CV Menjemput Berkah**, dengan meng-clone alur dan tampilan dari sistem referensi bernama "FakturStock" (screenshot fitur ada, dijelaskan lengkap di bawah). Nama aplikasi ini **PaletFaktur**.

Sebagian struktur project **sudah di-scaffold** di folder ini (`backend/` dan `frontend/`) — tolong review dulu semua file yang ada, lalu lengkapi, perbaiki, dan sempurnakan sesuai spesifikasi di bawah. Jangan menulis ulang dari nol kalau file yang sudah ada sudah benar; cukup lanjutkan atau perbaiki.

### 1. Tech Stack (wajib, jangan diganti)

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15 (App Router) |
| Bahasa Frontend | TypeScript |
| UI | React + Tailwind CSS |
| Backend | ASP.NET Core 8 Web API |
| Bahasa Backend | C# |
| ORM | Entity Framework Core 8 (Code First + Migrations) |
| Database | Microsoft SQL Server (2022/2025) |
| Autentikasi | JWT Bearer |
| Keamanan Password | BCrypt |
| Dokumentasi API | Swagger / OpenAPI |
| Web Server (produksi) | IIS |

### 2. Konteks Bisnis

CV Menjemput Berkah menjual pallet plastik ke klien korporat (pabrik, gudang, distributor). Alur kerja: klien pesan pallet → staf buat **Invoice** (otomatis memotong stok gudang) → staf buat **Surat Jalan** untuk pengiriman fisik → staf pantau pelunasan invoice → owner lihat **Laporan** omset, piutang, dan aset gudang.

Identitas perusahaan default (dipakai di kop surat & Pengaturan):
- Nama: CV Menjemput Berkah
- Alamat: Jl. Inspeksi Kalimalang Kp. Pasir Iimus RT.008 / 004 Kec. Cikarang Utara Kab. Bekasi
- Telepon: 081292977009
- Bank: BCA, No. Rek 12391795817598, a.n. CV Menjemput Berkah
- Penanda tangan: Ach Lukman H (CEO)

### 3. Modul & Fitur (clone dari sistem referensi)

**a. Login**
Form login sederhana (username & password) → dapat JWT token, disimpan di localStorage. Semua endpoint API (kecuali login) wajib `[Authorize]`.

**b. Dashboard**
- 4 kartu statistik: Total Invoice (nominal + jumlah), Sudah Dibayar/Lunas, Menunggu Pembayaran, Peringatan Stok Rendah.
- Tabel "Invoice Terbaru" (5 invoice terakhir): No. Invoice, Klien, Tanggal, Total, Status.
- Panel "Alert Stok Barang": daftar produk dengan stok ≤ batas minimum; tampilkan "Stok Barang Aman" jika tidak ada.

**c. Invoice (daftar)**
- Tabel: No. Invoice, Klien, Tgl. Penerbitan, Jatuh Tempo, Total Invoice, Status (Draft/Menunggu/Lunas/Terlambat/Dibatalkan), Aksi (Pratinjau, Surat Jalan, Hapus).
- Filter tab status (Semua/Lunas/Menunggu/Terlambat/Draft) + pencarian by kode invoice / nama klien.
- Modal/halaman "Pratinjau Faktur Resmi": kop surat perusahaan, info klien, tanggal transaksi & jatuh tempo, tabel item (kode, qty, harga satuan, jumlah), lalu **Subtotal Penjualan**, **DPP Nilai Lain**, **PPN**, **Total**, info rekening bank di bagian pembayaran, tombol Cetak/Simpan PDF.

**d. Buat Invoice**
- Pilih klien, tambah baris barang (pilih produk dari inventori + qty), qty tidak boleh melebihi stok tersedia.
- Nomor invoice otomatis format `INV-YYYYMMDD-000N`.
- Jatuh tempo = tanggal terbit + 30 hari (dari Pengaturan).
- **Perhitungan pajak** (PPN Indonesia dengan skema DPP Nilai Lain):
  - `Subtotal = Σ(harga_unit × qty)`
  - `DPP Nilai Lain = Subtotal × 11 / 12`
  - `PPN = DPP Nilai Lain × tarif_ppn` (default 12%, ambil dari Pengaturan)
  - `Total = Subtotal + PPN`
- Saat invoice tersimpan: stok produk otomatis berkurang + catat di Mutasi Riwayat Stok (tipe "InvoiceDeduction", referensi nomor invoice).
- Saat invoice dihapus/dibatalkan: stok dikembalikan otomatis.

**e. Surat Jalan**
- Form: Referensi Invoice (opsional, dropdown), Nama Penerima/Klien, Tanggal Pengiriman, Alamat Pengiriman, Nama Pengantar/Driver, No. Kendaraan, Daftar Barang (bisa tambah baris: nama/deskripsi, qty, satuan, keterangan opsional), Catatan Pengiriman (opsional).
- Nomor surat jalan otomatis format `SJ-00N`.
- Tabel daftar: No. SJ, Ref. Invoice, Penerima, Tgl. Kirim, Driver, Status (Proses/Terkirim/Dibatalkan), Aksi (Lihat, Hapus).

**f. Inventori**
- 3 kartu statistik: Total Jenis Produk (SKU), Stok Kritis (≤ batas minimum), Stok Habis/Kosong (0).
- Tabel "Katalog Stok Fisik Gudang": Kode SKU, Komersial Barang (nama + batas minimum), Kategori, Harga Unit, Stok (badge warna beda jika kritis), Aksi (Ubah Stok, Hapus).
- Panel "Mutasi Riwayat Stok": riwayat terbaru (tanggal, ± qty, nama produk, SKU, sumber referensi seperti nomor invoice) — bersifat audit-safe, read-only.
- Modal "Registrasi Unit Katalog Baru": Sandi SKU/Kode, Kategori Barang, Nama Dagang Barang, Harga Unit Satuan (Rupiah), Stok Awal Gudang, Tingkat Limit Merah (batas minimum untuk alert).
- Filter: cari SKU/nama, filter kategori.

**g. Klien**
- Card grid per klien: inisial nama, Nama Instansi, ID klien (format `CLT-N`), Email, Telepon, Alamat, status "Terdaftar aktif", tombol Hapus.
- Modal "Daftarkan Instansi Klien Baru": Nama Instansi/Perusahaan (wajib), Email, Telepon, Alamat Gedung/HQ Lengkap.
- Pencarian by nama/email.

**h. Laporan**
- 4 kartu: Omset Terkumpul (Lunas), Kapitalisasi Aset Gudang (Σ harga_unit × stok semua produk aktif), Kewajiban PPN Terkumpul (Σ PPN invoice lunas), Piutang Berjalan/Unpaid (Σ total invoice belum lunas).
- Chart bar "Tren Pendapatan Bulanan" (omset invoice lunas per bulan, Jan–bulan berjalan).
- Chart donut "Rasio Pelunasan": persentase invoice lunas vs total, breakdown jumlah Lunas/Menunggu/Terlambat.
- Tabel "Top 5 Produk Terlaris (Volume Unit)": Peringkat, Kode SKU, Deskripsi Komoditas, Unit Terjual, Nilai Rupiah — diurutkan dari qty terjual terbanyak (agregat dari semua item invoice).

**i. Pengaturan**
- Upload/URL Logo Perusahaan (preview).
- Form Informasi Perusahaan: Nama Perusahaan/PT, No. Telepon, Email, Nama Penanda Tangan, Jabatan Penanda Tangan, Alamat.
- Form Informasi Rekening Bank: Nama Bank, No. Rekening, Atas Nama (tampil di bagian "Pembayaran" saat cetak invoice).
- Preview kop surat live (logo + nama + alamat + kontak).
- Simpan tarif PPN & jumlah hari jatuh tempo invoice (default 12% & 30 hari) — dipakai backend saat hitung invoice baru.

### 4. Struktur Data Inti (backend, sudah ada di `backend/PaletFaktur.Api/Models/`)

`User`, `Product` (+ `StockMutation`), `Client`, `Invoice` (+ `InvoiceItem`), `SuratJalan` (+ `SuratJalanItem`), `CompanySettings`. Review relasinya di `Data/AppDbContext.cs`, sesuaikan bila ada kebutuhan tambahan (misalnya kategori produk sebagai master data terpisah bila diperlukan nanti).

### 5. Yang Perlu Kamu Kerjakan (urutan disarankan)

1. **Review scaffold yang ada**: baca semua file di `backend/PaletFaktur.Api/` dan `frontend/`, pahami konvensi yang dipakai (DTO, controller, service, komponen React) sebelum menambah kode baru.
2. **Setup database**: buat `appsettings.Development.json` dengan connection string SQL Server lokal Anda, lalu jalankan:
   ```
   cd backend/PaletFaktur.Api
   dotnet restore
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```
3. **Jalankan backend**: `dotnet run` → cek Swagger di `https://localhost:{port}/swagger`, pastikan semua endpoint (`/api/auth/login`, `/api/products`, `/api/clients`, `/api/invoices`, `/api/suratjalan`, `/api/reports/summary`, `/api/dashboard/summary`, `/api/settings`) berjalan dan ter-autentikasi dengan benar. User admin default: `admin` / `Admin123!` (auto-seed saat startup — **wajib ganti password ini setelah setup pertama, buat endpoint ganti password**).
4. **Jalankan frontend**: `cd frontend && npm install && npm run dev`, set `.env.local` dari `.env.local.example` (`NEXT_PUBLIC_API_BASE_URL` mengarah ke backend). Login lalu pastikan semua 8 halaman (Dashboard, Invoice, Buat Invoice, Surat Jalan, Inventori, Klien, Laporan, Pengaturan) terhubung ke API dan berfungsi end-to-end.
5. **Lengkapi bagian yang belum sempurna**, terutama:
   - Halaman detail/pratinjau invoice (cetak/print view) dengan kop surat dari Pengaturan — belum ada, buat halaman `/invoice/[id]` dengan tampilan siap cetak (`window.print()` atau generate PDF).
   - Upload logo perusahaan sungguhan (saat ini hanya menerima URL) — tambahkan endpoint upload file di backend (simpan ke `wwwroot/uploads` atau storage pilihanmu) dan wire ke form Pengaturan.
   - Validasi form yang lebih lengkap di frontend (pesan error per field, bukan hanya alert).
   - Halaman ganti password admin.
   - Update status invoice ke "Lunas" (tombol "Tandai Lunas" di daftar invoice — endpoint `PUT /api/invoices/{id}/mark-paid` sudah ada di backend, tinggal wire ke UI).
   - Job/logic penanda status "Terlambat" otomatis untuk invoice yang lewat jatuh tempo tapi belum lunas (bisa dihitung on-the-fly saat query, atau background job).
6. **Testing**: tambahkan unit test dasar untuk logika perhitungan PPN dan pemotongan stok di backend (xUnit), dan pastikan `npm run build` sukses tanpa error di frontend.
7. **Siapkan untuk deploy ke IIS**: pastikan `dotnet publish` menghasilkan output yang bisa di-host di IIS (in-process hosting model), dan buat catatan singkat langkah publish di README.

### 6. Panduan Gaya UI

- Sidebar gelap (`#0f172a`) dengan aksen biru (`#2563eb`) untuk item aktif, ikon di tiap menu.
- Layout konten utama: card putih dengan border tipis (`border-slate-200`), sudut membulat (`rounded-xl`).
- Badge status berwarna: Lunas = hijau, Menunggu/Proses = kuning, Terlambat = merah, Draft/Dibatalkan = abu-abu.
- Tabel bersih, header huruf kecil abu-abu, hover halus.
- Semua label & teks UI dalam **Bahasa Indonesia**, format Rupiah pakai `Intl.NumberFormat('id-ID')`.

### 7. Kriteria Selesai

- Semua 8 halaman berfungsi dan terhubung API asli (bukan data dummy).
- Alur end-to-end berhasil: buat klien → tambah produk ke inventori → buat invoice → stok berkurang otomatis → buat surat jalan dari invoice tsb → tandai invoice lunas → laporan ter-update.
- `dotnet build` dan `npm run build` sukses tanpa error.
- Login admin default bisa diganti passwordnya.

---

Silakan mulai dari langkah 1 (review scaffold) dan kerjakan berurutan. Kalau ada bagian spesifikasi yang ambigu, tanyakan dulu sebelum berasumsi.
