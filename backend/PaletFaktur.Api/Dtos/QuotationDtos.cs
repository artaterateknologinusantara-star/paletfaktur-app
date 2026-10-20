namespace PaletFaktur.Api.Dtos;

public record QuotationItemRequest(
    int? ProductId,
    string Name,
    string? Condition,
    string? Color,
    decimal UnitPrice,
    int Quantity,
    string? Unit);

public record QuotationRequest(
    int? ClientId,
    string RecipientName,
    DateTime QuotationDate,
    string? QuotationNumber,
    string? Subject,
    string? Attachment,
    string? IntroText,
    string? Notes,
    List<QuotationItemRequest> Items,
    List<QuotationPhotoDto>? Photos = null);

public record QuotationStatusRequest(string Status);

public record QuotationItemResponse(
    int? ProductId,
    string Name,
    string? Condition,
    string? Color,
    decimal UnitPrice,
    int Quantity,
    string Unit,
    decimal LineTotal);

public record QuotationResponse(
    int Id,
    string QuotationNumber,
    int? ClientId,
    string RecipientName,
    DateTime QuotationDate,
    string Subject,
    string? Attachment,
    string? IntroText,
    string? Notes,
    string Status,
    decimal Total,
    List<QuotationItemResponse> Items,
    List<QuotationPhotoDto> Photos);

public record QuotationPhotoDto(string Url, string? Caption);

public record QuotationPhotoUploadResponse(string Url);
