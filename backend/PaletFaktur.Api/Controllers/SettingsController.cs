using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaletFaktur.Api.Data;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Models;

namespace PaletFaktur.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private static readonly string[] AllowedLogoExtensions = { ".png", ".jpg", ".jpeg", ".svg", ".webp" };
    private const string SignaturePrefix = "signature-";
    private const string StampPrefix = "stamp-";

    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public SettingsController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet]
    public async Task<ActionResult<CompanySettingsResponse>> Get()
    {
        var settings = await _db.CompanySettings.FirstOrDefaultAsync();
        settings ??= new CompanySettings();
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    public async Task<ActionResult<CompanySettingsResponse>> Update(CompanySettingsUpdateRequest request)
    {
        var settings = await _db.CompanySettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new CompanySettings { Id = 1 };
            _db.CompanySettings.Add(settings);
        }

        settings.LogoUrl = request.LogoUrl;
        settings.CompanyName = request.CompanyName;
        settings.Phone = request.Phone;
        settings.Email = request.Email;
        settings.SignatoryName = request.SignatoryName;
        settings.SignatoryTitle = request.SignatoryTitle;
        settings.Address = request.Address;
        settings.Tagline = request.Tagline;
        settings.Website = request.Website;
        settings.City = request.City;
        settings.BankName = request.BankName;
        settings.BankAccountNumber = request.BankAccountNumber;
        settings.BankAccountHolder = request.BankAccountHolder;
        settings.PpnRate = request.PpnRate;
        settings.InvoiceDueDays = request.InvoiceDueDays;

        ReplaceImage(settings.SignatureUrl, request.SignatureUrl, SignaturePrefix);
        ReplaceImage(settings.StampUrl, request.StampUrl, StampPrefix);
        settings.SignatureUrl = request.SignatureUrl;
        settings.StampUrl = request.StampUrl;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(settings));
    }

    [HttpPost("logo")]
    [RequestSizeLimit(5_000_000)]
    public async Task<ActionResult<LogoUploadResponse>> UploadLogo(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "File logo tidak boleh kosong." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedLogoExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Format file tidak didukung. Gunakan PNG, JPG, SVG, atau WEBP." });
        }

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var uploadsDir = Path.Combine(webRoot, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"logo-{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new LogoUploadResponse($"/uploads/{fileName}"));
    }

    [HttpPost("signature")]
    [RequestSizeLimit(5_000_000)]
    public Task<ActionResult<LogoUploadResponse>> UploadSignature(IFormFile? file) => SaveImageAsync(file, SignaturePrefix, "tanda tangan");

    [HttpPost("stamp")]
    [RequestSizeLimit(5_000_000)]
    public Task<ActionResult<LogoUploadResponse>> UploadStamp(IFormFile? file) => SaveImageAsync(file, StampPrefix, "stempel");

    private async Task<ActionResult<LogoUploadResponse>> SaveImageAsync(IFormFile? file, string prefix, string what)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = $"File {what} tidak boleh kosong." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedLogoExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Format file tidak didukung. Gunakan PNG, JPG, SVG, atau WEBP." });
        }

        var uploadsDir = UploadsDir();
        Directory.CreateDirectory(uploadsDir);
        var fileName = $"{prefix}{Guid.NewGuid():N}{ext}";
        await using (var stream = new FileStream(Path.Combine(uploadsDir, fileName), FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        return Ok(new LogoUploadResponse($"/uploads/{fileName}"));
    }

    private string UploadsDir() => Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");

    // Hapus berkas lama saat gambar diganti/dihapus (hanya berkas buatan kita: /uploads/<prefix>*).
    private void ReplaceImage(string? oldUrl, string? newUrl, string prefix)
    {
        if (string.IsNullOrEmpty(oldUrl) || oldUrl == newUrl) return;
        var name = Path.GetFileName(oldUrl);
        if (!name.StartsWith(prefix, StringComparison.Ordinal)) return;
        try { System.IO.File.Delete(Path.Combine(UploadsDir(), name)); } catch (IOException) { }
    }

    private static CompanySettingsResponse ToResponse(CompanySettings s) => new(
        s.LogoUrl, s.CompanyName, s.Phone, s.Email, s.SignatoryName, s.SignatoryTitle, s.Address, s.Tagline, s.Website, s.City,
        s.BankName, s.BankAccountNumber, s.BankAccountHolder, s.PpnRate, s.InvoiceDueDays, s.SignatureUrl, s.StampUrl);
}
