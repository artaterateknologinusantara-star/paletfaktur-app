using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaletFaktur.Api.Data;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Extensions;
using PaletFaktur.Api.Models;

namespace PaletFaktur.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ReportSummaryResponse>> Summary()
    {
        var invoices = await _db.Invoices.Include(i => i.Items).ToListAsync();
        var products = await _db.Products.Where(p => p.IsActive).ToListAsync();

        var paidInvoices = invoices.Where(i => i.Status == InvoiceStatus.Lunas).ToList();
        var pendingInvoices = invoices.Where(i => i.GetEffectiveStatus() == InvoiceStatus.Menunggu).ToList();
        var overdueInvoices = invoices.Where(i => i.GetEffectiveStatus() == InvoiceStatus.Terlambat).ToList();

        var collectedRevenue = paidInvoices.Sum(i => i.Total);
        var warehouseAssetValue = products.Sum(p => p.UnitPrice * p.Stock);
        var collectedPpn = paidInvoices.Sum(i => i.PpnAmount);
        var outstandingReceivable = invoices
            .Where(i => i.GetEffectiveStatus() is InvoiceStatus.Menunggu or InvoiceStatus.Terlambat)
            .Sum(i => i.Total);

        var monthlyRevenue = invoices
            .Where(i => i.Status == InvoiceStatus.Lunas)
            .GroupBy(i => new { i.IssueDate.Year, i.IssueDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new MonthlyRevenuePoint(
                new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM"),
                g.Sum(i => i.Total)))
            .ToList();

        var topProducts = invoices
            .SelectMany(i => i.Items)
            .GroupBy(item => new { item.ProductSkuSnapshot, item.ProductNameSnapshot })
            .Select(g => new { g.Key.ProductSkuSnapshot, g.Key.ProductNameSnapshot, Units = g.Sum(x => x.Quantity), Revenue = g.Sum(x => x.LineTotal) })
            .OrderByDescending(x => x.Units)
            .Take(5)
            .Select((x, index) => new TopProductResponse(index + 1, x.ProductSkuSnapshot, x.ProductNameSnapshot, x.Units, x.Revenue))
            .ToList();

        return Ok(new ReportSummaryResponse(
            collectedRevenue, warehouseAssetValue, collectedPpn, outstandingReceivable,
            paidInvoices.Count, pendingInvoices.Count, overdueInvoices.Count,
            monthlyRevenue, topProducts));
    }
}
