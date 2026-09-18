namespace PaletFaktur.Api.Dtos;

public record SuratJalanItemRequest(string ItemDescription, decimal Quantity, string Unit, string? Notes);

public record SuratJalanCreateRequest(
    int? InvoiceId,
    int ClientId,
    DateTime DeliveryDate,
    string DeliveryAddress,
    string DriverName,
    string VehicleNumber,
    string? Notes,
    List<SuratJalanItemRequest> Items);

public record SuratJalanItemResponse(string ItemDescription, decimal Quantity, string Unit, string? Notes);

public record SuratJalanResponse(
    int Id,
    string SuratJalanNumber,
    string? InvoiceNumber,
    string ClientName,
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
