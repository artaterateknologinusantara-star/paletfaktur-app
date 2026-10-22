using Microsoft.AspNetCore.Mvc;
using PaletFaktur.Api.Controllers;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Models;
using PaletFaktur.Api.Services;
using PaletFaktur.Api.Tests.Helpers;

namespace PaletFaktur.Api.Tests;

public class InvoiceNumberingTests
{
    private static async Task<(Data.AppDbContext db, Client client, Product product)> SeedAsync()
    {
        var db = TestDbContextFactory.Create();
        var client = new Client { ClientCode = "CLT-1", Name = "PT Kanefusa Indonesia", Address = "EJIP Industrial Park" };
        var product = new Product { Sku = "SKU-A", Name = "Pallet A", Category = "Pallet", UnitPrice = 255_000, Stock = 500, MinStockThreshold = 5 };
        db.Clients.Add(client);
        db.Products.Add(product);
        db.CompanySettings.Add(new CompanySettings { PpnRate = 0.12m, InvoiceDueDays = 30 });
        await db.SaveChangesAsync();
        return (db, client, product);
    }

    private static async Task<InvoiceResponse> InvoiceAsync(Data.AppDbContext db, Client client, Product product, DateTime issueDate)
    {
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)product, 1, 255_000m) });
        var result = await new InvoicesController(db, new DocumentNumberService(db))
            .Create(new InvoiceCreateRequest(quotation.Id, issueDate, null, null, true, null, null));
        return Assert.IsType<InvoiceResponse>(Assert.IsType<CreatedAtActionResult>(result.Result).Value);
    }

    [Fact]
    public async Task Create_UsesNumberFormat_AndIncrementsPerYear()
    {
        var (db, client, product) = await SeedAsync();
        await using var _ = db;

        var first = await InvoiceAsync(db, client, product, new DateTime(2026, 10, 16));
        var second = await InvoiceAsync(db, client, product, new DateTime(2026, 10, 17));
        var nextYear = await InvoiceAsync(db, client, product, new DateTime(2027, 1, 3));

        Assert.Equal("001/INV/MBSTA/2026", first.InvoiceNumber);
        Assert.Equal("002/INV/MBSTA/2026", second.InvoiceNumber);
        Assert.Equal("001/INV/MBSTA/2027", nextYear.InvoiceNumber);
    }

    [Fact]
    public async Task Create_CopiesNameConditionAndColor_FromQuotationItem()
    {
        var (db, client, product) = await SeedAsync();
        await using var _ = db;
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)product, 50, 255_000m) });
        var item = quotation.Items.Single();
        item.Name = "Pallet Plastik Wajik 110x110x14cm";
        item.Condition = "Second";
        item.Color = "Abu Abu";
        await db.SaveChangesAsync();

        var result = await new InvoicesController(db, new DocumentNumberService(db))
            .Create(new InvoiceCreateRequest(quotation.Id, new DateTime(2026, 10, 16), null, "SL262570", true, null, null));
        var created = Assert.IsType<InvoiceResponse>(Assert.IsType<CreatedAtActionResult>(result.Result).Value);

        var line = Assert.Single(created.Items);
        Assert.Equal("Pallet Plastik Wajik 110x110x14cm", line.Description);
        Assert.Equal("Second", line.Condition);
        Assert.Equal("Abu Abu", line.Color);
        Assert.Equal(12_750_000m, created.Subtotal);
        Assert.Equal(11_687_500m, created.DppNilaiLain);
        Assert.Equal(1_402_500m, created.PpnAmount);
        Assert.Equal(14_152_500m, created.Total);
    }
}
