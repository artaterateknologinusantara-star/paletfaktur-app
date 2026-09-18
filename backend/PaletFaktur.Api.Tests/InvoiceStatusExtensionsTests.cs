using PaletFaktur.Api.Extensions;
using PaletFaktur.Api.Models;

namespace PaletFaktur.Api.Tests;

public class InvoiceStatusExtensionsTests
{
    [Fact]
    public void GetEffectiveStatus_ReturnsTerlambat_WhenMenungguAndPastDueDate_WithoutMutatingStoredStatus()
    {
        var invoice = new Invoice
        {
            Status = InvoiceStatus.Menunggu,
            DueDate = DateTime.UtcNow.AddDays(-1)
        };

        var effective = invoice.GetEffectiveStatus();

        Assert.Equal(InvoiceStatus.Terlambat, effective);
        // Kolom Status yang tersimpan tidak boleh berubah — Terlambat murni dihitung on-the-fly.
        Assert.Equal(InvoiceStatus.Menunggu, invoice.Status);
    }

    [Fact]
    public void GetEffectiveStatus_ReturnsMenunggu_WhenNotYetDue()
    {
        var invoice = new Invoice
        {
            Status = InvoiceStatus.Menunggu,
            DueDate = DateTime.UtcNow.AddDays(5)
        };

        Assert.Equal(InvoiceStatus.Menunggu, invoice.GetEffectiveStatus());
    }

    [Theory]
    [InlineData(InvoiceStatus.Lunas)]
    [InlineData(InvoiceStatus.Draft)]
    [InlineData(InvoiceStatus.Dibatalkan)]
    public void GetEffectiveStatus_LeavesOtherStatusesUnchanged_EvenIfPastDueDate(InvoiceStatus status)
    {
        var invoice = new Invoice
        {
            Status = status,
            DueDate = DateTime.UtcNow.AddDays(-10)
        };

        Assert.Equal(status, invoice.GetEffectiveStatus());
    }
}
