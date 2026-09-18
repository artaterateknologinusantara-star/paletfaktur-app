namespace PaletFaktur.Api.Dtos;

public record CompanySettingsResponse(
    string? LogoUrl,
    string CompanyName,
    string? Phone,
    string? Email,
    string? SignatoryName,
    string? SignatoryTitle,
    string? Address,
    string? BankName,
    string? BankAccountNumber,
    string? BankAccountHolder,
    decimal PpnRate,
    int InvoiceDueDays);

public record CompanySettingsUpdateRequest(
    string? LogoUrl,
    string CompanyName,
    string? Phone,
    string? Email,
    string? SignatoryName,
    string? SignatoryTitle,
    string? Address,
    string? BankName,
    string? BankAccountNumber,
    string? BankAccountHolder,
    decimal PpnRate,
    int InvoiceDueDays);

public record LogoUploadResponse(string Url);
