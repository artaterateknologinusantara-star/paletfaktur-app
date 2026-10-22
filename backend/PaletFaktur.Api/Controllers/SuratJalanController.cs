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
public class SuratJalanController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DocumentNumberService _docNumbers;

    public SuratJalanController(AppDbContext db, DocumentNumberService docNumbers)
    {
        _db = db;
        _docNumbers = docNumbers;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SuratJalanListItemResponse>>> GetAll([FromQuery] string? status, [FromQuery] string? search)
    {
        var query = _db.SuratJalans.Include(s => s.Invoice).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "Semua")
        {
            if (Enum.TryParse<SuratJalanStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(s => s.Status == parsedStatus);
            }
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(s => s.SuratJalanNumber.Contains(search) || s.RecipientName.Contains(search));
        }

        var result = await query
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SuratJalanListItemResponse(
                s.Id, s.SuratJalanNumber, s.Invoice != null ? s.Invoice.InvoiceNumber : null,
                s.RecipientName, s.DeliveryDate, s.DriverName, s.Status.ToString()))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("next-number")]
    public ActionResult<object> NextNumber([FromQuery] int? year)
    {
        var (number, _) = _docNumbers.NextSuratJalanNumber(year ?? DateTime.Now.Year);
        return Ok(new { number });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SuratJalanResponse>> GetById(int id)
    {
        var sj = await LoadAsync(id);
        if (sj is null) return NotFound();
        return Ok(ToResponse(sj));
    }

    [HttpPost]
    public async Task<ActionResult<SuratJalanResponse>> Create(SuratJalanCreateRequest request)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var client = await _db.Clients.FindAsync(request.ClientId);
        if (client is null) return BadRequest(new { message = "Klien tidak ditemukan." });

        var sj = new SuratJalan { Status = SuratJalanStatus.Proses };
        var year = request.DeliveryDate.Year;
        if (!string.IsNullOrWhiteSpace(request.SuratJalanNumber))
        {
            sj.SuratJalanNumber = request.SuratJalanNumber.Trim();
            sj.Sequence = DocumentNumberService.ParseSequence(sj.SuratJalanNumber);
        }
        else
        {
            (sj.SuratJalanNumber, sj.Sequence) = _docNumbers.NextSuratJalanNumber(year);
        }
        if (await _db.SuratJalans.AnyAsync(x => x.SuratJalanNumber == sj.SuratJalanNumber))
        {
            return Conflict(new { message = "Nomor surat jalan sudah dipakai." });
        }

        await ApplyAsync(sj, request, client);
        _db.SuratJalans.Add(sj);
        await _db.SaveChangesAsync();

        var created = await LoadAsync(sj.Id);
        return CreatedAtAction(nameof(GetById), new { id = sj.Id }, ToResponse(created!));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SuratJalanResponse>> Update(int id, SuratJalanCreateRequest request)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var sj = await LoadAsync(id);
        if (sj is null) return NotFound();

        var client = await _db.Clients.FindAsync(request.ClientId);
        if (client is null) return BadRequest(new { message = "Klien tidak ditemukan." });

        if (!string.IsNullOrWhiteSpace(request.SuratJalanNumber) && request.SuratJalanNumber.Trim() != sj.SuratJalanNumber)
        {
            var number = request.SuratJalanNumber.Trim();
            if (await _db.SuratJalans.AnyAsync(x => x.SuratJalanNumber == number && x.Id != id))
            {
                return Conflict(new { message = "Nomor surat jalan sudah dipakai." });
            }
            sj.SuratJalanNumber = number;
            sj.Sequence = DocumentNumberService.ParseSequence(number);
        }

        _db.SuratJalanItems.RemoveRange(sj.Items);
        sj.Items.Clear();
        await ApplyAsync(sj, request, client);
        await _db.SaveChangesAsync();

        return Ok(ToResponse((await LoadAsync(id))!));
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<SuratJalanResponse>> UpdateStatus(int id, [FromBody] string status)
    {
        var sj = await LoadAsync(id);
        if (sj is null) return NotFound();

        if (!Enum.TryParse<SuratJalanStatus>(status, true, out var parsedStatus))
        {
            return BadRequest(new { message = "Status tidak valid." });
        }

        sj.Status = parsedStatus;
        await _db.SaveChangesAsync();
        return Ok(ToResponse(sj));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var sj = await _db.SuratJalans.FindAsync(id);
        if (sj is null) return NotFound();
        _db.SuratJalans.Remove(sj);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private Task<SuratJalan?> LoadAsync(int id) =>
        _db.SuratJalans.Include(s => s.Invoice).Include(s => s.Client).Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id);

    private static string? Validate(SuratJalanCreateRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.DeliveryAddress)) return "Alamat pengiriman wajib diisi.";
        if (r.Items is null || r.Items.Count == 0) return "Minimal satu barang.";
        if (r.Items.Any(i => string.IsNullOrWhiteSpace(i.ItemDescription))) return "Nama barang wajib diisi.";
        if (r.Items.Any(i => i.Quantity <= 0)) return "Jumlah barang harus lebih dari 0.";
        return null;
    }

    private async Task ApplyAsync(SuratJalan sj, SuratJalanCreateRequest r, Client client)
    {
        Invoice? invoice = null;
        if (r.InvoiceId.HasValue)
        {
            invoice = await _db.Invoices.FindAsync(r.InvoiceId.Value);
        }

        sj.InvoiceId = invoice?.Id;
        sj.ClientId = client.Id;
        sj.RecipientName = client.Name;
        sj.RecipientDescription = string.IsNullOrWhiteSpace(r.RecipientDescription) ? null : r.RecipientDescription.Trim();
        sj.PoNumber = string.IsNullOrWhiteSpace(r.PoNumber) ? null : r.PoNumber.Trim();
        sj.DeliveryDate = r.DeliveryDate;
        sj.DeliveryAddress = r.DeliveryAddress.Trim();
        sj.DriverName = r.DriverName?.Trim() ?? string.Empty;
        sj.VehicleNumber = r.VehicleNumber?.Trim() ?? string.Empty;
        sj.Notes = r.Notes;

        foreach (var item in r.Items)
        {
            sj.Items.Add(new SuratJalanItem
            {
                ItemDescription = item.ItemDescription.Trim(),
                Color = string.IsNullOrWhiteSpace(item.Color) ? null : item.Color.Trim(),
                Quantity = item.Quantity,
                Unit = string.IsNullOrWhiteSpace(item.Unit) ? "pcs" : item.Unit.Trim(),
                Notes = item.Notes
            });
        }
    }

    private static SuratJalanResponse ToResponse(SuratJalan sj) => new(
        sj.Id,
        sj.SuratJalanNumber,
        sj.InvoiceId,
        sj.Invoice?.InvoiceNumber,
        sj.ClientId,
        sj.Client?.Name ?? sj.RecipientName,
        sj.RecipientDescription,
        sj.PoNumber,
        sj.DeliveryDate,
        sj.DeliveryAddress,
        sj.DriverName,
        sj.VehicleNumber,
        sj.Notes,
        sj.Status.ToString(),
        sj.Items.OrderBy(i => i.Id).Select(i => new SuratJalanItemResponse(i.ItemDescription, i.Color, i.Quantity, i.Unit, i.Notes)).ToList());
}
