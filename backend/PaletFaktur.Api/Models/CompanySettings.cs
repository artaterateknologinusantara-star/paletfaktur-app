namespace PaletFaktur.Api.Models;

// "Pengaturan" - single-row identitas perusahaan untuk kop surat / faktur
public class CompanySettings
{
    public int Id { get; set; } = 1;
    public string? LogoUrl { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? SignatoryName { get; set; }
    public string? SignatoryTitle { get; set; }
    public string? Address { get; set; }

    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankAccountHolder { get; set; }

    // Aturan PPN (default 12% dengan skema DPP Nilai Lain 11/12 sesuai ketentuan PPN Indonesia)
    public decimal PpnRate { get; set; } = 0.12m;
    public int InvoiceDueDays { get; set; } = 30;
}
