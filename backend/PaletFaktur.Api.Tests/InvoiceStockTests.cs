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

    [Fact]
    public async Task Create_DeductsStock_AndRecordsStockMutation_ForEachItem()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, productB) = await SeedAsync(db);

        var controller = new InvoicesController(db, new DocumentNumberService(db));
        var request = new InvoiceCreateRequest(client.Id, DateTime.UtcNow.Date, new List<InvoiceItemRequest>
        {
            new(productA.Id, 5),
            new(productB.Id, 3)
        });

        var actionResult = await controller.Create(request);
        Assert.IsType<CreatedAtActionResult>(actionResult.Result);

        var updatedA = await db.Products.FindAsync(productA.Id);
        var updatedB = await db.Products.FindAsync(productB.Id);
        Assert.Equal(45, updatedA!.Stock);
        Assert.Equal(27, updatedB!.Stock);

        var mutations = db.StockMutations.ToList();
        Assert.Equal(2, mutations.Count);
        Assert.All(mutations, m => Assert.Equal(StockMutationType.InvoiceDeduction, m.Type));

        var mutationA = Assert.Single(mutations, m => m.ProductId == productA.Id);
        Assert.Equal(-5, mutationA.QuantityChange);

        var mutationB = Assert.Single(mutations, m => m.ProductId == productB.Id);
        Assert.Equal(-3, mutationB.QuantityChange);
    }

    [Fact]
    public async Task Create_Fails_WhenQuantityExceedsAvailableStock()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, _) = await SeedAsync(db);

        var controller = new InvoicesController(db, new DocumentNumberService(db));
        var request = new InvoiceCreateRequest(client.Id, DateTime.UtcNow.Date, new List<InvoiceItemRequest>
        {
            new(productA.Id, 999)
        });

        var actionResult = await controller.Create(request);
        Assert.IsType<BadRequestObjectResult>(actionResult.Result);

        var unchanged = await db.Products.FindAsync(productA.Id);
        Assert.Equal(50, unchanged!.Stock);
        Assert.Empty(db.StockMutations.ToList());
    }

    [Fact]
    public async Task Delete_RestoresStock_ToOriginalAmount()
    {
        await using var db = TestDbContextFactory.Create();
        var (client, productA, _) = await SeedAsync(db);
        var originalStock = productA.Stock;

        var controller = new InvoicesController(db, new DocumentNumberService(db));
        var createResult = await controller.Create(new InvoiceCreateRequest(client.Id, DateTime.UtcNow.Date, new List<InvoiceItemRequest>
        {
            new(productA.Id, 6)
        }));
        var created = Assert.IsType<InvoiceResponse>(Assert.IsType<CreatedAtActionResult>(createResult.Result).Value);

        var afterCreateStock = (await db.Products.FindAsync(productA.Id))!.Stock;
        Assert.Equal(originalStock - 6, afterCreateStock);

        var deleteResult = await controller.Delete(created.Id);
        Assert.IsType<NoContentResult>(deleteResult);

        var afterDeleteStock = (await db.Products.FindAsync(productA.Id))!.Stock;
        Assert.Equal(originalStock, afterDeleteStock);
    }
}
