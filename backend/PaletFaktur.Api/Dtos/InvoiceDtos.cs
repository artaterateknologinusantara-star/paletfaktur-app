namespace PaletFaktur.Api.Dtos;

// Invoice dibuat dari penawaran berstatus Disetujui: barang, qty, dan harga diambil dari penawaran.
public record InvoiceCreateRequest(
    int QuotationId,
    DateTime? IssueDate,
    DateTime? DueDate,
    string? PoNumber,
    bool ApplyTax,
    decimal? PpnRateOverride,
    string? Notes);

public record InvoiceItemResponse(
    int ProductId,
    string ProductName,
    string ProductSku,
    string? Description,
    string? Condition,
    string? Color,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal);

public record InvoiceResponse(
    int Id,
    string InvoiceNumber,
    int ClientId,
    string ClientName,
    string? ClientAddress,
    DateTime IssueDate,
    DateTime DueDate,
    string? PoNumber,
    bool ApplyTax,
    string? Notes,
    string Status,
    decimal Subtotal,
    decimal DppNilaiLain,
    decimal PpnAmount,
    decimal PpnRateUsed,
    decimal Total,
    List<InvoiceItemResponse> Items);

public record InvoiceListItemResponse(
    int Id,
    string InvoiceNumber,
    string ClientName,
    DateTime IssueDate,
    DateTime DueDate,
    decimal Total,
    string Status);
