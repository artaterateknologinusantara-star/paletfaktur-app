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
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProductsController(AppDbContext db)
    {
        _db = db;
    }

    private static ProductResponse ToResponse(Product p) => new(
        p.Id, p.Sku, p.Category, p.Name, p.UnitPrice, p.Stock, p.MinStockThreshold, p.IsActive);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductResponse>>> GetAll([FromQuery] string? search, [FromQuery] string? category)
    {
        var query = _db.Products.Where(p => p.IsActive).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p => p.Sku.Contains(search) || p.Name.Contains(search));
        }
        if (!string.IsNullOrWhiteSpace(category) && category != "Semua Kategori")
        {
            query = query.Where(p => p.Category == category);
        }

        var products = await query.OrderBy(p => p.Sku).ToListAsync();
        return Ok(products.Select(ToResponse));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductResponse>> GetById(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();
        return Ok(ToResponse(product));
    }

    [HttpPost]
    public async Task<ActionResult<ProductResponse>> Create(ProductCreateRequest request)
    {
        if (await _db.Products.AnyAsync(p => p.Sku == request.Sku))
        {
            return Conflict(new { message = "Kode SKU sudah terdaftar." });
        }

        var product = new Product
        {
            Sku = request.Sku,
            Category = request.Category,
            Name = request.Name,
            UnitPrice = request.UnitPrice,
            Stock = request.InitialStock,
            MinStockThreshold = request.MinStockThreshold
        };
        _db.Products.Add(product);

        _db.StockMutations.Add(new StockMutation
        {
            Product = product,
            QuantityChange = request.InitialStock,
            Type = StockMutationType.RestockIn,
            SourceReference = "Registrasi Unit Katalog Baru"
        });

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, ToResponse(product));
    }

    [HttpPut("{id}/stock")]
    public async Task<ActionResult<ProductResponse>> UpdateStock(int id, ProductUpdateStockRequest request)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();

        var delta = request.NewStock - product.Stock;
        product.Stock = request.NewStock;

        if (delta != 0)
        {
            _db.StockMutations.Add(new StockMutation
            {
                ProductId = product.Id,
                QuantityChange = delta,
                Type = StockMutationType.ManualAdjustment,
                SourceReference = request.Reason ?? "Opname manual"
            });
        }

        await _db.SaveChangesAsync();
        return Ok(ToResponse(product));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound();
        product.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("mutations")]
    public async Task<ActionResult<IEnumerable<StockMutationResponse>>> GetMutations([FromQuery] int take = 20)
    {
        var mutations = await _db.StockMutations
            .Include(m => m.Product)
            .OrderByDescending(m => m.CreatedAt)
            .Take(take)
            .Select(m => new StockMutationResponse(
                m.Id, m.ProductId, m.Product!.Name, m.Product!.Sku,
                m.QuantityChange, m.Type.ToString(), m.SourceReference, m.CreatedAt))
            .ToListAsync();

        return Ok(mutations);
    }
}
