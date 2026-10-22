using Microsoft.AspNetCore.Mvc;
using PaletFaktur.Api.Controllers;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Models;
using PaletFaktur.Api.Services;
using PaletFaktur.Api.Tests.Helpers;

namespace PaletFaktur.Api.Tests;

public class InvoiceStockTests
{
    private static async Task<(Client client, Product productA, Product productB)> SeedAsync(Data.AppDbContext db)
    {
        var client = new Client { ClientCode = "CLT-1", Name = "PT Uji Coba" };
        var productA = new Product { Sku = "SKU-A", Name = "Pallet A", Category = "Pallet", UnitPrice = 100_000, Stock = 50, MinStockThreshold = 5 };
        var productB = new Product { Sku = "SKU-B", Name = "Pallet B", Category = "Pallet", UnitPrice = 200_000, Stock = 30, MinStockThreshold = 5 };
        db.Clients.Add(client);
        db.Products.AddRange(productA, productB);
        db.CompanySettings.Add(new CompanySettings { PpnRate = 0.12m, InvoiceDueDays = 30 });
        await db.SaveChangesAsync();
        return (client, productA, productB);
    }

    private static InvoicesController NewController(Data.AppDbContext db) => new(db, new DocumentNumberService(db));

    private static InvoiceCreateRequest From(Quotation q) => new(q.Id, DateTime.UtcNow.Date, null, null, true, null, null);

    [Fact]
    public async Task Create_DeductsStock_AndRecordsStockMutation_ForEachItem()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, productB) = await SeedAsync(db);
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)productA, 5, 100_000m), (productB, 3, 200_000m) });

        var actionResult = await NewController(db).Create(From(quotation));
        Assert.IsType<CreatedAtActionResult>(actionResult.Result);

        Assert.Equal(45, (await db.Products.FindAsync(productA.Id))!.Stock);
        Assert.Equal(27, (await db.Products.FindAsync(productB.Id))!.Stock);

        var mutations = db.StockMutations.ToList();
        Assert.Equal(2, mutations.Count);
        Assert.All(mutations, m => Assert.Equal(StockMutationType.InvoiceDeduction, m.Type));
        Assert.Equal(-5, Assert.Single(mutations, m => m.ProductId == productA.Id).QuantityChange);
        Assert.Equal(-3, Assert.Single(mutations, m => m.ProductId == productB.Id).QuantityChange);
    }

    [Fact]
    public async Task Create_UsesQuotationPrice_NotCatalogPrice()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, _) = await SeedAsync(db);
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)productA, 2, 85_000m) });

        var result = await NewController(db).Create(From(quotation));
        var created = Assert.IsType<InvoiceResponse>(Assert.IsType<CreatedAtActionResult>(result.Result).Value);

        Assert.Equal(170_000m, created.Subtotal);
        Assert.Equal(85_000m, Assert.Single(created.Items).UnitPrice);
    }

    [Fact]
    public async Task Create_Fails_WhenQuantityExceedsAvailableStock()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, _) = await SeedAsync(db);
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)productA, 999, 100_000m) });

        var actionResult = await NewController(db).Create(From(quotation));
        Assert.IsType<BadRequestObjectResult>(actionResult.Result);

        Assert.Equal(50, (await db.Products.FindAsync(productA.Id))!.Stock);
        Assert.Empty(db.StockMutations.ToList());
        Assert.Empty(db.Invoices.ToList());
    }

    [Theory]
    [InlineData(QuotationStatus.Draft)]
    [InlineData(QuotationStatus.Terkirim)]
    [InlineData(QuotationStatus.Ditolak)]
    public async Task Create_Fails_WhenQuotationNotApproved(QuotationStatus status)
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, _) = await SeedAsync(db);
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)productA, 1, 100_000m) }, status);

        var actionResult = await NewController(db).Create(From(quotation));

        Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        Assert.Empty(db.Invoices.ToList());
        Assert.Equal(50, (await db.Products.FindAsync(productA.Id))!.Stock);
    }

    [Fact]
    public async Task Create_Fails_WhenQuotationItemNotLinkedToCatalog()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, _) = await SeedAsync(db);
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)productA, 1, 100_000m), (null, 5, 50_000m) });

        var actionResult = await NewController(db).Create(From(quotation));

        var bad = Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        Assert.Contains("katalog", bad.Value!.ToString()!);
        Assert.Empty(db.Invoices.ToList());
        Assert.Equal(50, (await db.Products.FindAsync(productA.Id))!.Stock);
    }

    [Fact]
    public async Task Create_Fails_WhenQuotationAlreadyInvoiced()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, _) = await SeedAsync(db);
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)productA, 2, 100_000m) });
        var controller = NewController(db);

        Assert.IsType<CreatedAtActionResult>((await controller.Create(From(quotation))).Result);
        var second = await controller.Create(From(quotation));

        Assert.IsType<ConflictObjectResult>(second.Result);
        Assert.Single(db.Invoices.ToList());
        Assert.Equal(48, (await db.Products.FindAsync(productA.Id))!.Stock);
    }

    [Fact]
    public async Task Create_CreatesClient_WhenRecipientNotRegistered()
    {
        await using var db = TestDbContextFactory.Create();
        var (_, productA, _) = await SeedAsync(db);
        var quotation = await QuotationFactory.CreateAsync(db, null, new[] { ((Product?)productA, 1, 100_000m) }, recipientName: "PT Calon Baru");

        var result = await NewController(db).Create(From(quotation));
        var created = Assert.IsType<InvoiceResponse>(Assert.IsType<CreatedAtActionResult>(result.Result).Value);

        Assert.Equal("PT Calon Baru", created.ClientName);
        Assert.Equal(2, db.Clients.Count());
    }

    [Fact]
    public async Task Delete_RestoresStock_AndFreesQuotationForReinvoicing()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, _) = await SeedAsync(db);
        var originalStock = productA.Stock;
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)productA, 6, 100_000m) });

        var controller = NewController(db);
        var created = Assert.IsType<InvoiceResponse>(Assert.IsType<CreatedAtActionResult>((await controller.Create(From(quotation))).Result).Value);
        Assert.Equal(originalStock - 6, (await db.Products.FindAsync(productA.Id))!.Stock);

        Assert.IsType<NoContentResult>(await controller.Delete(created.Id));
        Assert.Equal(originalStock, (await db.Products.FindAsync(productA.Id))!.Stock);

        Assert.IsType<CreatedAtActionResult>((await controller.Create(From(quotation))).Result);
    }
}
