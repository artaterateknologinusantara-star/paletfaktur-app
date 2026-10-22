namespace PaletFaktur.Api.Models;

public enum InvoiceStatus
{
    Draft,
    Menunggu,
    Lunas,
    Terlambat,
    Dibatalkan
}

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty; // 030/INV/MBSTA/2026 (data lama: INV-20260526-0011)
    public int Sequence { get; set; }                         // nomor urut per tahun untuk penomoran otomatis
    public int ClientId { get; set; }
    public Client? Client { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime DueDate { get; set; }
    public int? QuotationId { get; set; }          // invoice hanya dibuat dari penawaran berstatus Disetujui
    public Quotation? Quotation { get; set; }
    public string? PoNumber { get; set; }
    public bool ApplyTax { get; set; } = true;
    public string? Notes { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

    public decimal Subtotal { get; set; }      // Subtotal Penjualan
    public decimal DppNilaiLain { get; set; }  // DPP Nilai Lain = 11/12 * Subtotal
    public decimal PpnAmount { get; set; }     // PPN = PpnRate * DppNilaiLain
    public decimal Total { get; set; }         // Subtotal + PPN

    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<SuratJalan> SuratJalans { get; set; } = new List<SuratJalan>();
}
