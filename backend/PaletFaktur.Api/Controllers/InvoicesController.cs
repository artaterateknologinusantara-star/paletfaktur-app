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
        var quotation = await _db.Quotations.Include(q => q.Items).FirstOrDefaultAsync(q => q.Id == request.QuotationId);
        if (quotation is null) return BadRequest(new { message = "Penawaran tidak ditemukan." });
        if (quotation.Status != QuotationStatus.Disetujui)
        {
            return BadRequest(new { message = "Invoice hanya bisa dibuat dari penawaran berstatus Disetujui." });
        }
        if (await _db.Invoices.AnyAsync(i => i.QuotationId == quotation.Id))
        {
            return Conflict(new { message = "Penawaran ini sudah dibuatkan invoice." });
        }
        if (quotation.Items.Count == 0)
        {
            return BadRequest(new { message = "Penawaran tidak memiliki barang." });
        }
        var unlinked = quotation.Items.Where(i => i.ProductId is null).Select(i => i.Name).ToList();
        if (unlinked.Count > 0)
        {
            return BadRequest(new { message = $"Barang berikut belum terhubung ke katalog inventori: {string.Join(", ", unlinked)}. Edit penawaran dan pilih barang dari inventori." });
        }

        var client = await ResolveClientAsync(quotation);

        var settings = await _db.CompanySettings.FirstOrDefaultAsync() ?? new CompanySettings();
        var issueDate = request.IssueDate ?? DateTime.UtcNow.Date;
        var dueDate = request.DueDate ?? issueDate.AddDays(settings.InvoiceDueDays);

        var (invoiceNumber, invoiceSequence) = _docNumbers.NextInvoiceNumber(issueDate);
        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            Sequence = invoiceSequence,
            ClientId = client.Id,
            Client = client,
            QuotationId = quotation.Id,
            IssueDate = issueDate,
            DueDate = dueDate,
            PoNumber = request.PoNumber,
            ApplyTax = request.ApplyTax,
            Notes = request.Notes,
            Status = InvoiceStatus.Menunggu
        };

        decimal subtotal = 0;

        // Satu produk bisa muncul di beberapa baris penawaran: cek stok terhadap total qty per produk.
        var needed = quotation.Items.GroupBy(i => i.ProductId!.Value).ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

        foreach (var item in quotation.Items)
        {
            var product = await _db.Products.FindAsync(item.ProductId!.Value);
            if (product is null)
            {
                return BadRequest(new { message = $"Produk untuk \"{item.Name}\" sudah tidak ada di katalog." });
            }
            if (product.Stock < needed[product.Id])
            {
                return BadRequest(new { message = $"Stok {product.Name} tidak mencukupi. Dibutuhkan: {needed[product.Id]}, sisa stok: {product.Stock}." });
            }

            subtotal += item.LineTotal;

            invoice.Items.Add(new InvoiceItem
            {
                ProductId = product.Id,
                ProductNameSnapshot = product.Name,
                ProductSkuSnapshot = product.Sku,
                Description = item.Name,
                Condition = item.Condition,
                Color = item.Color,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = item.LineTotal
            });

            product.Stock -= item.Quantity;
            _db.StockMutations.Add(new StockMutation
            {
                ProductId = product.Id,
                QuantityChange = -item.Quantity,
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

    // Klien dari penawaran; bila penerima belum terdaftar, cocokkan berdasarkan nama atau buat klien baru.
    private async Task<Client> ResolveClientAsync(Quotation quotation)
    {
        if (quotation.ClientId is int id)
        {
            var existing = await _db.Clients.FindAsync(id);
            if (existing is not null) return existing;
        }

        var name = quotation.RecipientName.Trim();
        var byName = await _db.Clients.FirstOrDefaultAsync(c => c.Name == name);
        if (byName is not null) return byName;

        var client = new Client
        {
            ClientCode = $"CLT-{await _db.Clients.CountAsync() + 1}",
            Name = name
        };
        _db.Clients.Add(client);
        return client;
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
            i.ProductId, i.ProductNameSnapshot, i.ProductSkuSnapshot, i.Description, i.Condition, i.Color, i.Quantity, i.UnitPrice, i.LineTotal)).ToList());
}
