using PaletFaktur.Api.Data;

namespace PaletFaktur.Api.Services;

// Menghasilkan nomor dokumen: {urut}/INV/MBSTA/{tahun}, {urut}/SJ/MBSTA/{tahun}, {urut}/SPH/MB/{tahun}
public class DocumentNumberService
{
    private readonly AppDbContext _db;

    public DocumentNumberService(AppDbContext db)
    {
        _db = db;
    }

    // Format: {urut 3 digit}/INV/MBSTA/{tahun}; urut berlanjut dari nomor terbesar tahun tsb.
    public (string Number, int Sequence) NextInvoiceNumber(DateTime issueDate)
    {
        var suffix = $"/INV/MBSTA/{issueDate.Year}";
        var max = _db.Invoices
            .Where(i => i.InvoiceNumber.EndsWith(suffix))
            .Max(i => (int?)i.Sequence) ?? 0;
        var next = max + 1;
        return ($"{next:D3}{suffix}", next);
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

    // Format: {urut 3 digit}/SJ/MBSTA/{tahun}, urut berlanjut dari nomor terbesar tahun tsb.
    public (string Number, int Sequence) NextSuratJalanNumber(int year)
    {
        var suffix = $"/SJ/MBSTA/{year}";
        var max = _db.SuratJalans
            .Where(s => s.SuratJalanNumber.EndsWith(suffix))
            .Max(s => (int?)s.Sequence) ?? 0;
        var next = max + 1;
        return ($"{next:D3}{suffix}", next);
    }

    public static int ParseSequence(string number)
    {
        var head = number.Split('/')[0];
        return int.TryParse(head, out var n) ? n : 0;
    }
}
