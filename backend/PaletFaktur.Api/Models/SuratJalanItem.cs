namespace PaletFaktur.Api.Models;

public class SuratJalanItem
{
    public int Id { get; set; }
    public int SuratJalanId { get; set; }
    public SuratJalan? SuratJalan { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "pcs";
    public string? Notes { get; set; }
}
