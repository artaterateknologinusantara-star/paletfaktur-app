using PaletFaktur.Api.Data;

namespace PaletFaktur.Api.Services;

// Menghasilkan nomor dokumen berformat INV-YYYYMMDD-000N dan SJ-00N
public class DocumentNumberService
{
    private readonly AppDbContext _db;

    public DocumentNumberService(AppDbContext db)
    {
        _db = db;
    }

    public string NextInvoiceNumber(DateTime issueDate)
    {
        var datePart = issueDate.ToString("yyyyMMdd");
        var countToday = _db.Invoices.Count(i => i.InvoiceNumber.Contains(datePart));
        var sequence = (countToday + 1).ToString("D4");
        return $"INV-{datePart}-{sequence}";
    }

    // Format: {urut}/SPH/MB/{tahun}; urut berlanjut dari nomor terbesar tahun tsb (aman bila ada yang dihapus).
    public (string Number, int Sequence) NextQuotationNumber(int year)
    {
        var suffix = $"/SPH/MB/{year}";
        var max = _db.Quotations
            .Where(q => q.QuotationNumber.EndsWith(suffix))
            .Max(q => (int?)q.Sequence) ?? 0;
        var next = max + 1;
        return ($"{next}{suffix}", next);
    }

    public static int ParseQuotationSequence(string number)
    {
        var head = number.Split('/')[0];
        return int.TryParse(head, out var n) ? n : 0;
    }

    public string NextSuratJalanNumber()
    {
        var count = _db.SuratJalans.Count();
        var sequence = (count + 1).ToString("D3");
        return $"SJ-{sequence}";
    }
}
