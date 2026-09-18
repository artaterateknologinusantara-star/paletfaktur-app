namespace PaletFaktur.Api.Models;

// "Katalog Stok Fisik Gudang" - PROD-001, PROD-002, dst.
public class Product
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;          // Kode SKU, e.g. PROD-001
    public string Name { get; set; } = string.Empty;          // Komersial Barang / Nama Dagang Barang
    public string Category { get; set; } = string.Empty;      // Kategori (Elektronik, Aksesoris, Pallet, dll.)
    public decimal UnitPrice { get; set; }                    // Harga Unit
    public int Stock { get; set; }                             // Stok saat ini
    public int MinStockThreshold { get; set; }                // Tingkat Limit Merah / Batas Minimum
    public bool IsActive { get; set; } = true;

    public ICollection<StockMutation> StockMutations { get; set; } = new List<StockMutation>();
}
