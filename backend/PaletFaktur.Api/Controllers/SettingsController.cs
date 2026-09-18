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
        settings.BankName = request.BankName;
        settings.BankAccountNumber = request.BankAccountNumber;
        settings.BankAccountHolder = request.BankAccountHolder;
        settings.PpnRate = request.PpnRate;
        settings.InvoiceDueDays = request.InvoiceDueDays;

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

    private static CompanySettingsResponse ToResponse(CompanySettings s) => new(
        s.LogoUrl, s.CompanyName, s.Phone, s.Email, s.SignatoryName, s.SignatoryTitle, s.Address,
        s.BankName, s.BankAccountNumber, s.BankAccountHolder, s.PpnRate, s.InvoiceDueDays);
}
