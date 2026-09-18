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

    [HttpGet("{id}")]
    public async Task<ActionResult<SuratJalanResponse>> GetById(int id)
    {
        var sj = await _db.SuratJalans
            .Include(s => s.Invoice)
            .Include(s => s.Client)
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sj is null) return NotFound();
        return Ok(ToResponse(sj));
    }

    [HttpPost]
    public async Task<ActionResult<SuratJalanResponse>> Create(SuratJalanCreateRequest request)
    {
        var client = await _db.Clients.FindAsync(request.ClientId);
        if (client is null) return BadRequest(new { message = "Klien tidak ditemukan." });

        Invoice? invoice = null;
        if (request.InvoiceId.HasValue)
        {
            invoice = await _db.Invoices.FindAsync(request.InvoiceId.Value);
        }

        var sj = new SuratJalan
        {
            SuratJalanNumber = _docNumbers.NextSuratJalanNumber(),
            InvoiceId = invoice?.Id,
            ClientId = client.Id,
            RecipientName = client.Name,
            DeliveryDate = request.DeliveryDate,
            DeliveryAddress = request.DeliveryAddress,
            DriverName = request.DriverName,
            VehicleNumber = request.VehicleNumber,
            Notes = request.Notes,
            Status = SuratJalanStatus.Proses
        };

        foreach (var item in request.Items)
        {
            sj.Items.Add(new SuratJalanItem
            {
                ItemDescription = item.ItemDescription,
                Quantity = item.Quantity,
                Unit = item.Unit,
                Notes = item.Notes
            });
        }

        _db.SuratJalans.Add(sj);
        await _db.SaveChangesAsync();

        var created = await _db.SuratJalans
            .Include(s => s.Invoice).Include(s => s.Client).Include(s => s.Items)
            .FirstAsync(s => s.Id == sj.Id);

        return CreatedAtAction(nameof(GetById), new { id = sj.Id }, ToResponse(created));
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<SuratJalanResponse>> UpdateStatus(int id, [FromBody] string status)
    {
        var sj = await _db.SuratJalans.Include(s => s.Invoice).Include(s => s.Client).Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id);
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

    private static SuratJalanResponse ToResponse(SuratJalan sj) => new(
        sj.Id,
        sj.SuratJalanNumber,
        sj.Invoice?.InvoiceNumber,
        sj.Client?.Name ?? sj.RecipientName,
        sj.DeliveryDate,
        sj.DeliveryAddress,
        sj.DriverName,
        sj.VehicleNumber,
        sj.Notes,
        sj.Status.ToString(),
        sj.Items.Select(i => new SuratJalanItemResponse(i.ItemDescription, i.Quantity, i.Unit, i.Notes)).ToList());
}
