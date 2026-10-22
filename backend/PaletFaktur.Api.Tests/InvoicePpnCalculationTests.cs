using Microsoft.AspNetCore.Mvc;
using PaletFaktur.Api.Controllers;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Models;
using PaletFaktur.Api.Services;
using PaletFaktur.Api.Tests.Helpers;

namespace PaletFaktur.Api.Tests;

public class InvoicePpnCalculationTests
{
    [Theory]
    [InlineData(1, 1_000_000, 0.12)]
    [InlineData(3, 250_000, 0.11)]
    [InlineData(10, 99_999, 0.12)]
    public async Task Create_ComputesDppAndPpn_AccordingToFormula(int quantity, decimal unitPrice, decimal ppnRate)
    {
        await using var db = TestDbContextFactory.Create();

        var client = new Client { ClientCode = "CLT-1", Name = "PT Uji Coba" };
        var product = new Product { Sku = "SKU-1", Name = "Pallet Plastik", Category = "Pallet", UnitPrice = unitPrice, Stock = quantity + 100, MinStockThreshold = 5 };
        db.Clients.Add(client);
        db.Products.Add(product);
        db.CompanySettings.Add(new CompanySettings { PpnRate = ppnRate, InvoiceDueDays = 30 });
        await db.SaveChangesAsync();
        var quotation = await QuotationFactory.CreateAsync(db, client, new[] { ((Product?)product, quantity, unitPrice) });

        var controller = new InvoicesController(db, new DocumentNumberService(db));
        var actionResult = await controller.Create(new InvoiceCreateRequest(quotation.Id, DateTime.UtcNow.Date, null, null, true, null, null));
        var createdResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        var created = Assert.IsType<InvoiceResponse>(createdResult.Value);

        // Rumus dari InvoicesController.Create: DPP Nilai Lain = Subtotal * 11/12, PPN = DPP * tarif
        var expectedSubtotal = unitPrice * quantity;
        var expectedDpp = Math.Round(expectedSubtotal * 11 / 12, 2);
        var expectedPpn = Math.Round(expectedDpp * ppnRate, 2);

        Assert.Equal(expectedSubtotal, created.Subtotal);
        Assert.Equal(expectedDpp, created.DppNilaiLain);
        Assert.Equal(expectedPpn, created.PpnAmount);
        Assert.Equal(expectedSubtotal + expectedPpn, created.Total);
    }
}
