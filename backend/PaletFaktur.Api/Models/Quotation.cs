namespace PaletFaktur.Api.Models;

public enum QuotationStatus
{
    Draft,
    Terkirim,
    Disetujui,
    Ditolak
}

// "Surat Penawaran Harga" (SPH) - nomor berformat 47/SPH/MB/2026
public class Quotation
{
    public int Id { get; set; }
    public string QuotationNumber { get; set; } = string.Empty;
    public int Sequence { get; set; }                  // nomor urut per tahun, dipakai untuk penomoran otomatis
    public int? ClientId { get; set; }                 // opsional: penerima bisa calon klien yang belum terdaftar
    public Client? Client { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public DateTime QuotationDate { get; set; }
    public string Subject { get; set; } = "Penawaran Harga";   // "Hal"
    public string? Attachment { get; set; }            // "Lampiran", mis. "2 halaman"
    public string? IntroText { get; set; }             // paragraf pembuka (kosong = template bawaan di cetak)
    public string? Notes { get; set; }                 // "Catatan" di bawah tabel
    public QuotationStatus Status { get; set; } = QuotationStatus.Draft;
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<QuotationItem> Items { get; set; } = new List<QuotationItem>();
    public ICollection<QuotationPhoto> Photos { get; set; } = new List<QuotationPhoto>();
}

public class QuotationItem
{
    public int Id { get; set; }
    public int QuotationId { get; set; }
    public Quotation? Quotation { get; set; }
    public int? ProductId { get; set; }                // opsional: referensi katalog inventori
    public string Name { get; set; } = string.Empty;   // kolom "Ukuran (p x l x t)"
    public string? Condition { get; set; }             // Baru / Second
    public string? Color { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public string Unit { get; set; } = "Pcs";
    public decimal LineTotal { get; set; }
}

// Foto lampiran penawaran (halaman "Lampiran" di PDF)
public class QuotationPhoto
{
    public int Id { get; set; }
    public int QuotationId { get; set; }
    public Quotation? Quotation { get; set; }
    public string Url { get; set; } = string.Empty;    // mis. /uploads/quotation-xxxx.jpg
    public string? Caption { get; set; }
    public int SortOrder { get; set; }
}
