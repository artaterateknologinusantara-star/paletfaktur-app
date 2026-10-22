using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaletFaktur.Api.Data;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Models;
using PaletFaktur.Api.Services;

namespace PaletFaktur.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuotationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private static readonly string[] AllowedPhotoExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private const string PhotoPrefix = "quotation-";

    private readonly DocumentNumberService _numbers;
    private readonly IWebHostEnvironment _env;

    public QuotationsController(AppDbContext db, DocumentNumberService numbers, IWebHostEnvironment env)
    {
        _db = db;
        _numbers = numbers;
        _env = env;
    }

    private string UploadsDir => Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");

    // Hapus berkas foto penawaran dari disk (hanya yang kita buat sendiri: /uploads/quotation-*).
    private void DeletePhotoFiles(IEnumerable<string> urls)
    {
        foreach (var url in urls)
        {
            var name = Path.GetFileName(url);
            if (!name.StartsWith(PhotoPrefix, StringComparison.Ordinal)) continue;
            try { System.IO.File.Delete(Path.Combine(UploadsDir, name)); } catch (IOException) { }
        }
    }

    [HttpPost("photos")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<QuotationPhotoUploadResponse>> UploadPhoto(IFormFile? file)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "File foto tidak boleh kosong." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedPhotoExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP." });
        }

        Directory.CreateDirectory(UploadsDir);
        var fileName = $"{PhotoPrefix}{Guid.NewGuid():N}{ext}";
        await using (var stream = new FileStream(Path.Combine(UploadsDir, fileName), FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        return Ok(new QuotationPhotoUploadResponse($"/uploads/{fileName}"));
    }

    private static QuotationResponse ToResponse(Quotation q, (int Id, string Number)? invoice = null) => new(
        q.Id, q.QuotationNumber, q.ClientId, q.RecipientName, q.QuotationDate, q.Subject, q.Attachment,
        q.IntroText, q.Notes, q.Status.ToString(), q.Total,
        q.Items.OrderBy(i => i.Id)
            .Select(i => new QuotationItemResponse(i.ProductId, i.Name, i.Condition, i.Color, i.UnitPrice, i.Quantity, i.Unit, i.LineTotal))
            .ToList(),
        q.Photos.OrderBy(p => p.SortOrder).ThenBy(p => p.Id).Select(p => new QuotationPhotoDto(p.Url, p.Caption)).ToList(),
        invoice?.Id, invoice?.Number);

    private async Task<Dictionary<int, (int Id, string Number)>> InvoiceMapAsync(IEnumerable<int> quotationIds)
    {
        var ids = quotationIds.ToList();
        var rows = await _db.Invoices
            .Where(i => i.QuotationId != null && ids.Contains(i.QuotationId.Value))
            .Select(i => new { QuotationId = i.QuotationId!.Value, i.Id, i.InvoiceNumber })
            .ToListAsync();
        return rows.ToDictionary(r => r.QuotationId, r => (r.Id, r.InvoiceNumber));
    }

    private async Task<bool> HasInvoiceAsync(int quotationId) => await _db.Invoices.AnyAsync(i => i.QuotationId == quotationId);

    private async Task<QuotationResponse> ResponseAsync(Quotation q)
    {
        var map = await InvoiceMapAsync(new[] { q.Id });
        return ToResponse(q, map.TryGetValue(q.Id, out var inv) ? inv : null);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuotationResponse>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Quotations.Include(q => q.Items).Include(q => q.Photos).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(q => q.QuotationNumber.Contains(search) || q.RecipientName.Contains(search));
        }
        var list = await query.OrderByDescending(q => q.QuotationDate).ThenByDescending(q => q.Id).ToListAsync();
        var map = await InvoiceMapAsync(list.Select(x => x.Id));
        return Ok(list.Select(x => ToResponse(x, map.TryGetValue(x.Id, out var inv) ? inv : null)));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<QuotationResponse>> GetById(int id)
    {
        var q = await _db.Quotations.Include(x => x.Items).Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id);
        return q is null ? NotFound() : Ok(await ResponseAsync(q));
    }

    [HttpGet("next-number")]
    public ActionResult<object> NextNumber([FromQuery] int? year)
    {
        var (number, _) = _numbers.NextQuotationNumber(year ?? DateTime.Now.Year);
        return Ok(new { number });
    }

    [HttpPost]
    public async Task<ActionResult<QuotationResponse>> Create(QuotationRequest request)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var q = new Quotation { QuotationDate = request.QuotationDate.Date };
        if (!string.IsNullOrWhiteSpace(request.QuotationNumber))
        {
            q.QuotationNumber = request.QuotationNumber.Trim();
            q.Sequence = DocumentNumberService.ParseQuotationSequence(q.QuotationNumber);
        }
        else
        {
            (q.QuotationNumber, q.Sequence) = _numbers.NextQuotationNumber(q.QuotationDate.Year);
        }
        if (await _db.Quotations.AnyAsync(x => x.QuotationNumber == q.QuotationNumber))
        {
            return Conflict(new { message = "Nomor penawaran sudah dipakai." });
        }

        Apply(q, request);
        _db.Quotations.Add(q);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = q.Id }, ToResponse(q));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<QuotationResponse>> Update(int id, QuotationRequest request)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var q = await _db.Quotations.Include(x => x.Items).Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound();
        if (await HasInvoiceAsync(id))
        {
            return Conflict(new { message = "Penawaran sudah dibuatkan invoice dan tidak bisa diubah. Hapus invoice-nya terlebih dahulu." });
        }

        if (!string.IsNullOrWhiteSpace(request.QuotationNumber) && request.QuotationNumber.Trim() != q.QuotationNumber)
        {
            var number = request.QuotationNumber.Trim();
            if (await _db.Quotations.AnyAsync(x => x.QuotationNumber == number && x.Id != id))
            {
                return Conflict(new { message = "Nomor penawaran sudah dipakai." });
            }
            q.QuotationNumber = number;
            q.Sequence = DocumentNumberService.ParseQuotationSequence(number);
        }

        q.QuotationDate = request.QuotationDate.Date;
        var oldPhotoUrls = q.Photos.Select(p => p.Url).ToList();
        _db.QuotationItems.RemoveRange(q.Items);
        q.Items.Clear();
        _db.QuotationPhotos.RemoveRange(q.Photos);
        q.Photos.Clear();
        Apply(q, request);
        await _db.SaveChangesAsync();

        var keptUrls = q.Photos.Select(p => p.Url).ToHashSet();
        DeletePhotoFiles(oldPhotoUrls.Where(u => !keptUrls.Contains(u)));
        return Ok(ToResponse(q));
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<QuotationResponse>> UpdateStatus(int id, QuotationStatusRequest request)
    {
        if (!Enum.TryParse<QuotationStatus>(request.Status, out var status))
        {
            return BadRequest(new { message = "Status tidak valid." });
        }
        var q = await _db.Quotations.Include(x => x.Items).Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound();
        if (q.Status != status && await HasInvoiceAsync(id))
        {
            return Conflict(new { message = "Status tidak bisa diubah karena penawaran sudah dibuatkan invoice." });
        }
        q.Status = status;
        await _db.SaveChangesAsync();
        return Ok(await ResponseAsync(q));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var q = await _db.Quotations.Include(x => x.Items).Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id);
        if (q is null) return NotFound();
        if (await HasInvoiceAsync(id))
        {
            return Conflict(new { message = "Penawaran sudah dibuatkan invoice dan tidak bisa dihapus." });
        }
        var photoUrls = q.Photos.Select(p => p.Url).ToList();
        _db.Quotations.Remove(q);
        await _db.SaveChangesAsync();
        DeletePhotoFiles(photoUrls);
        return NoContent();
    }

    private static string? Validate(QuotationRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.RecipientName)) return "Nama penerima wajib diisi.";
        if (r.Items is null || r.Items.Count == 0) return "Minimal satu item penawaran.";
        if (r.Items.Any(i => string.IsNullOrWhiteSpace(i.Name))) return "Nama/ukuran item wajib diisi.";
        if (r.Items.Any(i => i.Quantity <= 0)) return "Jumlah item harus lebih dari 0.";
        if (r.Items.Any(i => i.UnitPrice < 0)) return "Harga satuan tidak boleh negatif.";
        return null;
    }

    private static void Apply(Quotation q, QuotationRequest r)
    {
        q.ClientId = r.ClientId;
        q.RecipientName = r.RecipientName.Trim();
        q.Subject = string.IsNullOrWhiteSpace(r.Subject) ? "Penawaran Harga" : r.Subject.Trim();
        q.Attachment = r.Attachment;
        q.IntroText = r.IntroText;
        q.Notes = r.Notes;
        foreach (var i in r.Items)
        {
            q.Items.Add(new QuotationItem
            {
                ProductId = i.ProductId,
                Name = i.Name.Trim(),
                Condition = i.Condition,
                Color = i.Color,
                UnitPrice = i.UnitPrice,
                Quantity = i.Quantity,
                Unit = string.IsNullOrWhiteSpace(i.Unit) ? "Pcs" : i.Unit.Trim(),
                LineTotal = i.UnitPrice * i.Quantity
            });
        }
        q.Total = q.Items.Sum(i => i.LineTotal);

        var order = 0;
        foreach (var p in r.Photos ?? new List<QuotationPhotoDto>())
        {
            // Hanya terima URL hasil upload kita; cegah path/URL luar disisipkan lewat API.
            if (!p.Url.StartsWith("/uploads/" + PhotoPrefix, StringComparison.Ordinal) || p.Url.Contains("..")) continue;
            q.Photos.Add(new QuotationPhoto { Url = p.Url, Caption = p.Caption, SortOrder = order++ });
        }
    }
}
