using PaletFaktur.Api.Models;

namespace PaletFaktur.Api.Extensions;

public static class InvoiceStatusExtensions
{
    /// <summary>
    /// Status "Terlambat" dihitung on-the-fly (Menunggu + lewat jatuh tempo), tidak pernah disimpan ke database.
    /// Dipakai konsisten oleh InvoicesController, DashboardController, dan ReportsController.
    /// </summary>
    public static InvoiceStatus GetEffectiveStatus(this Invoice invoice)
    {
        if (invoice.Status == InvoiceStatus.Menunggu && invoice.DueDate < DateTime.UtcNow)
        {
            return InvoiceStatus.Terlambat;
        }

        return invoice.Status;
    }
}
