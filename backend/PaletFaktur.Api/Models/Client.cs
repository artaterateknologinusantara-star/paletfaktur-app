namespace PaletFaktur.Api.Models;

// "Katalog Klien" - mitra korporasi
public class Client
{
    public int Id { get; set; }
    public string ClientCode { get; set; } = string.Empty; // CLT-1, CLT-2, ...
    public string Name { get; set; } = string.Empty;        // Nama Instansi / Perusahaan
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}
