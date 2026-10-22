using PaletFaktur.Api.Data;
using PaletFaktur.Api.Models;

namespace PaletFaktur.Api.Tests.Helpers;

public static class QuotationFactory
{
    // Penawaran siap-invoice: invoice hanya boleh dibuat dari penawaran berstatus Disetujui.
    public static async Task<Quotation> CreateAsync(
        AppDbContext db,
        Client? client,
        IEnumerable<(Product? product, int quantity, decimal unitPrice)> items,
        QuotationStatus status = QuotationStatus.Disetujui,
        string recipientName = "PT Uji Coba")
    {
        var sequence = db.Quotations.Count() + 1;
        var quotation = new Quotation
        {
            QuotationNumber = $"{sequence}/SPH/MB/2026",
            Sequence = sequence,
            ClientId = client?.Id,
            RecipientName = client?.Name ?? recipientName,
            QuotationDate = DateTime.UtcNow.Date,
            Status = status
        };
        foreach (var (product, quantity, unitPrice) in items)
        {
            quotation.Items.Add(new QuotationItem
            {
                ProductId = product?.Id,
                Name = product?.Name ?? "Barang manual",
                Quantity = quantity,
                UnitPrice = unitPrice,
                LineTotal = unitPrice * quantity
            });
        }
        quotation.Total = quotation.Items.Sum(i => i.LineTotal);
        db.Quotations.Add(quotation);
        await db.SaveChangesAsync();
        return quotation;
    }
}
