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

    public string NextSuratJalanNumber()
    {
        var count = _db.SuratJalans.Count();
        var sequence = (count + 1).ToString("D3");
        return $"SJ-{sequence}";
    }
}
