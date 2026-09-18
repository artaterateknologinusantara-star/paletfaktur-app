namespace PaletFaktur.Api.Dtos;

public record ClientCreateRequest(string Name, string? Email, string? Phone, string? Address);

public record ClientResponse(
    int Id,
    string ClientCode,
    string Name,
    string? Email,
    string? Phone,
    string? Address,
    bool IsActive,
    DateTime CreatedAt);
