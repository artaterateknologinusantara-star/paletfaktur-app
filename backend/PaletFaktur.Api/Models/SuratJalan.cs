namespace PaletFaktur.Api.Models;

public enum SuratJalanStatus
{
    Proses,
    Terkirim,
    Dibatalkan
}

public class SuratJalan
{
    public int Id { get; set; }
    public string SuratJalanNumber { get; set; } = string.Empty; // SJ-001
    public int? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public int ClientId { get; set; }
    public Client? Client { get; set; }

    public string RecipientName { get; set; } = string.Empty;   // Nama Penerima / Klien
    public DateTime DeliveryDate { get; set; }
    public string DeliveryAddress { get; set; } = string.Empty;
    public string DriverName { get; set; } = string.Empty;
    public string VehicleNumber { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public SuratJalanStatus Status { get; set; } = SuratJalanStatus.Proses;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SuratJalanItem> Items { get; set; } = new List<SuratJalanItem>();
}
