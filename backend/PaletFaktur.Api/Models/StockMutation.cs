namespace PaletFaktur.Api.Models;

public enum StockMutationType
{
    ManualAdjustment,   // opname manual
    InvoiceDeduction,   // dipotong otomatis saat invoice terbit
    RestockIn           // penambahan stok masuk
}

// "Mutasi Riwayat Stok" - bersifat audit-safe, terintegrasi dengan faktur
public class StockMutation
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int QuantityChange { get; set; }        // negatif = keluar, positif = masuk
    public StockMutationType Type { get; set; }
    public string? SourceReference { get; set; }   // e.g. nomor invoice INV-xxxx
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
