using Microsoft.AspNetCore.Mvc;
using PaletFaktur.Api.Controllers;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Models;
using PaletFaktur.Api.Services;
using PaletFaktur.Api.Tests.Helpers;

namespace PaletFaktur.Api.Tests;

public class SuratJalanTests
{
    private static async Task<(Data.AppDbContext db, Client client)> SeedAsync()
    {
        var db = TestDbContextFactory.Create();
        var client = new Client { ClientCode = "CLT-1", Name = "PT Kanefusa Indonesia", Address = "EJIP Industrial Park" };
        db.Clients.Add(client);
        await db.SaveChangesAsync();
        return (db, client);
    }

    private static SuratJalanController NewController(Data.AppDbContext db) => new(db, new DocumentNumberService(db));

    private static SuratJalanCreateRequest Request(int clientId, DateTime date, params SuratJalanItemRequest[] items) =>
        new(null, clientId, date, "EJIP Industrial Park", null, "A 8961 AG", null, items.ToList(), PoNumber: "SL262570");

    [Fact]
    public async Task Create_SupportsMultipleItems_AndUsesNewNumberFormat()
    {
        var (db, client) = await SeedAsync();
        await using var _ = db;

        var result = await NewController(db).Create(Request(client.Id, new DateTime(2026, 10, 16),
            new SuratJalanItemRequest("Pallet Plastik Wajik 110x110x14cm", "Abu - Abu", 50, "pcs", null),
            new SuratJalanItemRequest("Pallet Plastik 120x100x15cm", "Hitam", 10, "pcs", null)));

        var created = Assert.IsType<SuratJalanResponse>(Assert.IsType<CreatedAtActionResult>(result.Result).Value);
        Assert.Equal("001/SJ/MBSTA/2026", created.SuratJalanNumber);
        Assert.Equal("SL262570", created.PoNumber);
        Assert.Equal("A 8961 AG", created.VehicleNumber);
        Assert.Equal(2, created.Items.Count);
        Assert.Equal("Abu - Abu", created.Items[0].Color);
    }

    [Fact]
    public async Task Create_IncrementsSequencePerYear()
    {
        var (db, client) = await SeedAsync();
        await using var _ = db;
        var controller = NewController(db);
        var item = new SuratJalanItemRequest("Pallet", null, 1, "pcs", null);

        await controller.Create(Request(client.Id, new DateTime(2026, 1, 5), item));
        var second = await controller.Create(Request(client.Id, new DateTime(2026, 2, 5), item));
        var otherYear = await controller.Create(Request(client.Id, new DateTime(2027, 1, 5), item));

        Assert.Equal("002/SJ/MBSTA/2026", Assert.IsType<SuratJalanResponse>(Assert.IsType<CreatedAtActionResult>(second.Result).Value).SuratJalanNumber);
        Assert.Equal("001/SJ/MBSTA/2027", Assert.IsType<SuratJalanResponse>(Assert.IsType<CreatedAtActionResult>(otherYear.Result).Value).SuratJalanNumber);
    }

    [Fact]
    public async Task Create_Fails_WithoutItems_OrWithZeroQuantity()
    {
        var (db, client) = await SeedAsync();
        await using var _ = db;
        var controller = NewController(db);

        var none = await controller.Create(Request(client.Id, DateTime.UtcNow));
        var zero = await controller.Create(Request(client.Id, DateTime.UtcNow, new SuratJalanItemRequest("Pallet", null, 0, "pcs", null)));

        Assert.IsType<BadRequestObjectResult>(none.Result);
        Assert.IsType<BadRequestObjectResult>(zero.Result);
        Assert.Empty(db.SuratJalans.ToList());
    }

    [Fact]
    public async Task Update_ReplacesItems_AndKeepsNumber()
    {
        var (db, client) = await SeedAsync();
        await using var _ = db;
        var controller = NewController(db);
        var created = Assert.IsType<SuratJalanResponse>(Assert.IsType<CreatedAtActionResult>(
            (await controller.Create(Request(client.Id, new DateTime(2026, 10, 16), new SuratJalanItemRequest("Lama", null, 5, "pcs", null)))).Result).Value);

        var updated = await controller.Update(created.Id, Request(client.Id, new DateTime(2026, 10, 16),
            new SuratJalanItemRequest("Baru A", "Hitam", 7, "pcs", null),
            new SuratJalanItemRequest("Baru B", null, 3, "set", null)));

        var response = Assert.IsType<SuratJalanResponse>(Assert.IsType<OkObjectResult>(updated.Result).Value);
        Assert.Equal(created.SuratJalanNumber, response.SuratJalanNumber);
        Assert.Equal(new[] { "Baru A", "Baru B" }, response.Items.Select(i => i.ItemDescription));
        Assert.Equal(2, db.SuratJalanItems.Count());
    }
}
