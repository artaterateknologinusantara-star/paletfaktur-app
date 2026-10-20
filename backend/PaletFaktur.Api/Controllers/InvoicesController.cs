using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaletFaktur.Api.Data;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Extensions;
using PaletFaktur.Api.Models;
using PaletFaktur.Api.Services;

namespace PaletFaktur.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DocumentNumberService _docNumbers;

    public InvoicesController(AppDbContext db, DocumentNumberService docNumbers)
    {
        _db = db;
        _docNumbers = docNumbers;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvoiceListItemResponse>>> GetAll([FromQuery] string? status, [FromQuery] string? search)
    {
        var query = _db.Invoices.Include(i => i.Client).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(i => i.InvoiceNumber.Contains(search) || i.Client!.Name.Contains(search));
        }

        var invoices = await query
            .OrderByDescending(i => i.IssueDate).ThenByDescending(i => i.Id)
            .ToListAsync();

        IEnumerable<Invoice> filtered = invoices;
        if (!string.IsNullOrWhiteSpace(status) && status != "Semua" && Enum.TryParse<InvoiceStatus>(status, true, out var parsedStatus))
        {
            filtered = filtered.Where(i => i.GetEffectiveStatus() == parsedStatus);
        }

        var result = filtered
            .Select(i => new InvoiceListItemResponse(
                i.Id, i.InvoiceNumber, i.Client!.Name, i.IssueDate, i.DueDate, i.Total, i.GetEffectiveStatus().ToString()))
            .ToList();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<InvoiceResponse>> GetById(int id)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Client)
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null) return NotFound();

        return Ok(ToResponse(invoice));
    }

    [HttpPost]
    public async Task<ActionResult<InvoiceResponse>> Create(InvoiceCreateRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
        {
            return BadRequest(new { message = "Invoice harus memiliki minimal satu barang." });
        }

        var client = await _db.Clients.FindAsync(request.ClientId);
        if (client is null) return BadRequest(new { message = "Klien tidak ditemukan." });

        var settings = await _db.CompanySettings.FirstOrDefaultAsync() ?? new CompanySettings();
        var issueDate = request.IssueDate ?? DateTime.UtcNow.Date;
        var dueDate = request.DueDate ?? issueDate.AddDays(settings.InvoiceDueDays);

        var invoice = new Invoice
        {
            InvoiceNumber = _docNumbers.NextInvoiceNumber(issueDate),
            ClientId = client.Id,
            IssueDate = issueDate,
            DueDate = dueDate,
            PoNumber = request.PoNumber,
            ApplyTax = request.ApplyTax,
            Notes = request.Notes,
            Status = InvoiceStatus.Menunggu
        };

        decimal subtotal = 0;

        foreach (var itemRequest in request.Items)
        {
            var product = await _db.Products.FindAsync(itemRequest.ProductId);
            if (product is null)
            {
                return BadRequest(new { message = $"Produk id {itemRequest.ProductId} tidak ditemukan." });
            }
            if (product.Stock < itemRequest.Quantity)
            {
                return BadRequest(new { message = $"Stok {product.Name} tidak mencukupi. Sisa stok: {product.Stock}." });
            }

            var unitPrice = itemRequest.UnitPriceOverride ?? product.UnitPrice;
            var lineTotal = unitPrice * itemRequest.Quantity;
            subtotal += lineTotal;

            invoice.Items.Add(new InvoiceItem
            {
                ProductId = product.Id,
                ProductNameSnapshot = product.Name,
                ProductSkuSnapshot = product.Sku,
                Description = itemRequest.DescriptionOverride,
                Quantity = itemRequest.Quantity,
                UnitPrice = unitPrice,
                LineTotal = lineTotal
            });

            product.Stock -= itemRequest.Quantity;
            _db.StockMutations.Add(new StockMutation
            {
                ProductId = product.Id,
                QuantityChange = -itemRequest.Quantity,
                Type = StockMutationType.InvoiceDeduction,
                SourceReference = invoice.InvoiceNumber
            });
        }

        invoice.Subtotal = subtotal;

        if (request.ApplyTax)
        {
            // Perhitungan PPN dengan skema DPP Nilai Lain (11/12 x harga jual) x tarif PPN
            var ppnRate = request.PpnRateOverride ?? settings.PpnRate;
            var dppNilaiLain = Math.Round(subtotal * 11 / 12, 2);
            var ppnAmount = Math.Round(dppNilaiLain * ppnRate, 2);

            invoice.DppNilaiLain = dppNilaiLain;
            invoice.PpnAmount = ppnAmount;
            invoice.Total = subtotal + ppnAmount;
        }
        else
        {
            invoice.DppNilaiLain = 0;
            invoice.PpnAmount = 0;
            invoice.Total = subtotal;
        }

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        var created = await _db.Invoices
            .Include(i => i.Client)
            .Include(i => i.Items)
            .FirstAsync(i => i.Id == invoice.Id);

        return CreatedAtAction(nameof(GetById), new { id = invoice.Id }, ToResponse(created));
    }

    [HttpPut("{id}/mark-paid")]
    public async Task<ActionResult<InvoiceResponse>> MarkPaid(int id)
    {
        var invoice = await _db.Invoices.Include(i => i.Client).Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return NotFound();

        invoice.Status = InvoiceStatus.Lunas;
        invoice.PaidAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToResponse(invoice));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var invoice = await _db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return NotFound();

        // Kembalikan stok karena invoice dibatalkan/dihapus
        foreach (var item in invoice.Items)
        {
            var product = await _db.Products.FindAsync(item.ProductId);
            if (product is not null)
            {
                product.Stock += item.Quantity;
                _db.StockMutations.Add(new StockMutation
                {
                    ProductId = product.Id,
                    QuantityChange = item.Quantity,
                    Type = StockMutationType.ManualAdjustment,
                    SourceReference = $"Pembatalan {invoice.InvoiceNumber}"
                });
            }
        }

        _db.Invoices.Remove(invoice);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static InvoiceResponse ToResponse(Invoice invoice) => new(
        invoice.Id,
        invoice.InvoiceNumber,
        invoice.ClientId,
        invoice.Client?.Name ?? string.Empty,
        invoice.Client?.Address,
        invoice.IssueDate,
        invoice.DueDate,
        invoice.PoNumber,
        invoice.ApplyTax,
        invoice.Notes,
        invoice.GetEffectiveStatus().ToString(),
        invoice.Subtotal,
        invoice.DppNilaiLain,
        invoice.PpnAmount,
        invoice.DppNilaiLain != 0 ? Math.Round(invoice.PpnAmount / invoice.DppNilaiLain, 4) : 0,
        invoice.Total,
        invoice.Items.Select(i => new InvoiceItemResponse(
            i.ProductId, i.ProductNameSnapshot, i.ProductSkuSnapshot, i.Description, i.Quantity, i.UnitPrice, i.LineTotal)).ToList());
}
