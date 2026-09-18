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
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> Summary()
    {
        var invoices = await _db.Invoices.Include(i => i.Client).ToListAsync();
        var totalAmount = invoices.Sum(i => i.Total);
        var paid = invoices.Where(i => i.Status == InvoiceStatus.Lunas).ToList();
        var pending = invoices.Where(i => i.GetEffectiveStatus() is InvoiceStatus.Menunggu or InvoiceStatus.Terlambat).ToList();

        var lowStockProducts = await _db.Products
            .Where(p => p.IsActive && p.Stock <= p.MinStockThreshold)
            .OrderBy(p => p.Stock)
            .ToListAsync();

        var recent = invoices
            .OrderByDescending(i => i.IssueDate).ThenByDescending(i => i.Id)
            .Take(5)
            .Select(i => new InvoiceListItemResponse(i.Id, i.InvoiceNumber, i.Client!.Name, i.IssueDate, i.DueDate, i.Total, i.GetEffectiveStatus().ToString()))
            .ToList();

        return Ok(new DashboardSummaryResponse(
            totalAmount, invoices.Count,
            paid.Sum(i => i.Total), paid.Count,
            pending.Sum(i => i.Total), pending.Count,
            lowStockProducts.Count,
            recent,
            lowStockProducts.Select(p => new ProductResponse(p.Id, p.Sku, p.Category, p.Name, p.UnitPrice, p.Stock, p.MinStockThreshold, p.IsActive)).ToList()));
    }
}
