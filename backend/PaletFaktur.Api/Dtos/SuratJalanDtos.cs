namespace PaletFaktur.Api.Dtos;

public record SuratJalanItemRequest(string ItemDescription, string? Color, decimal Quantity, string? Unit, string? Notes);

public record SuratJalanCreateRequest(
    int? InvoiceId,
    int ClientId,
    DateTime DeliveryDate,
    string DeliveryAddress,
    string? DriverName,
    string? VehicleNumber,
    string? Notes,
    List<SuratJalanItemRequest> Items,
    string? SuratJalanNumber = null,
    string? PoNumber = null,
    string? RecipientDescription = null);

public record SuratJalanItemResponse(string ItemDescription, string? Color, decimal Quantity, string Unit, string? Notes);

public record SuratJalanResponse(
    int Id,
    string SuratJalanNumber,
    int? InvoiceId,
    string? InvoiceNumber,
    int ClientId,
    string ClientName,
    string? RecipientDescription,
    string? PoNumber,
    DateTime DeliveryDate,
    string DeliveryAddress,
    string DriverName,
    string VehicleNumber,
    string? Notes,
    string Status,
    List<SuratJalanItemResponse> Items);

public record SuratJalanListItemResponse(
    int Id,
    string SuratJalanNumber,
    string? InvoiceNumber,
    string RecipientName,
    DateTime DeliveryDate,
    string DriverName,
    string Status);
