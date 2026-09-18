# PaletFaktur — Invoice & Inventori Penjualan Pallet

Scaffold aplikasi untuk CV Menjemput Berkah, hasil clone alur & tampilan sistem invoice/inventori referensi.

## Mulai di sini

Buka **`PROMPT_UNTUK_CLAUDE_CODE.md`** dan salin isinya ke Claude Code (jalankan di root folder ini melalui VS Code) untuk melanjutkan pengembangan.

## Struktur folder

- `backend/PaletFaktur.Api` — ASP.NET Core 8 Web API (EF Core, JWT, BCrypt, Swagger)
- `frontend` — Next.js 15 + TypeScript + Tailwind
- `docker-compose.yml` — jalankan `docker compose up -d` untuk SQL Server lokal (opsional, kalau belum punya instance sendiri)

## Konfigurasi & secret

`backend/PaletFaktur.Api/appsettings.json` sengaja di-commit dengan nilai **placeholder** (`CHANGE_THIS_...`) untuk `ConnectionStrings:DefaultConnection` dan `Jwt:Key` — bukan kredensial asli, aman untuk repo publik.

Sebelum menjalankan backend secara lokal, buat file `backend/PaletFaktur.Api/appsettings.Development.json` sendiri (file ini di-`.gitignore`, tidak ikut ter-commit) dengan connection string database Anda yang sebenarnya, contoh:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=PaletFakturDb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;"
  }
}
```

Password di atas harus sama dengan `MSSQL_SA_PASSWORD` di `docker-compose.yml` kalau pakai SQL Server via docker lokal. Untuk deploy production, lihat bagian "Deploy Backend ke IIS" di bawah — jangan pernah pakai nilai development di server production.

## Quick start

```bash
# 1. Database (opsional pakai docker)
docker compose up -d

# 2. Backend — buat dulu appsettings.Development.json sesuai bagian "Konfigurasi & secret" di atas
cd backend/PaletFaktur.Api
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
dotnet run

# 3. Frontend (terminal baru)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Login default: `admin` / `Admin123!` — segera ganti setelah setup pertama.

## Testing backend

```bash
cd backend/PaletFaktur.Api.Tests
dotnet test
```

Cakupan: perhitungan PPN (DPP Nilai Lain & PPN sesuai rumus di `InvoicesController`), pemotongan & pengembalian stok saat invoice dibuat/dihapus, pencatatan `StockMutation`, dan logika status "Terlambat" on-the-fly (`GetEffectiveStatus()`). Pakai EF Core InMemory provider, jadi tidak menyentuh SQL Server asli.

## Deploy Backend ke IIS (Production)

1. **Publish** dengan in-process hosting model (default untuk `Microsoft.NET.Sdk.Web` di .NET 8, tidak perlu konfigurasi tambahan):

   ```bash
   cd backend/PaletFaktur.Api
   dotnet publish -c Release -o ./publish
   ```

2. **Install ASP.NET Core Hosting Bundle** di server IIS — bukan sekadar .NET Runtime biasa. Hosting Bundle menyertakan ASP.NET Core Module v2 (ANCM), jembatan antara IIS dan proses .NET. Download dari halaman resmi .NET 8 (`dotnet-hosting-8.x.x-win.exe`), install, lalu restart IIS supaya ANCM terdaftar:

   ```powershell
   net stop was /y
   net start w3svc
   ```

3. **Setup Application Pool**:
   - .NET CLR version: **No Managed Code** — ASP.NET Core tidak jalan lewat CLR bawaan `w3wp.exe`; ANCM yang mengelola proses .NET secara terpisah (in-process maupun out-of-process).
   - Managed pipeline mode: **Integrated**.
   - Start mode: `AlwaysRunning` (opsional, supaya proses tidak mati saat idle).

4. **Buat Site/Application** di IIS Manager yang mengarah ke folder hasil `publish`, pakai Application Pool di atas.

5. **Connection string production** — jangan pernah pakai kredensial development (`sa` / `YourStrong!Passw0rd` dari `docker-compose.yml`). Set `ConnectionStrings:DefaultConnection` lewat salah satu dari:
   - File `appsettings.Production.json` baru di folder publish (jangan edit `appsettings.Development.json`), atau
   - Environment Variable `ConnectionStrings__DefaultConnection` di level Application Pool / `web.config`.

   Arahkan ke SQL Server production dengan user berhak terbatas (bukan `sa`), dan ganti `Jwt:Key` dengan secret baru yang berbeda dari development.

6. Pastikan `ASPNETCORE_ENVIRONMENT=Production` ter-set (biasanya otomatis lewat `web.config` hasil `dotnet publish`, atau set manual di Environment Variables Application Pool).

7. Beri izin **write** untuk folder `wwwroot/uploads` di hasil publish kepada identity Application Pool (`IIS AppPool\<NamaPool>`), supaya fitur upload logo perusahaan berfungsi.
