namespace PaletFaktur.Api.Dtos;

public record ProductCreateRequest(
    string Sku,
    string Category,
    string Name,
    decimal UnitPrice,
    int InitialStock,
    int MinStockThreshold);

public record ProductUpdateStockRequest(int NewStock, string? Reason);

public record ProductUpdatePriceRequest(decimal NewPrice);

public record ProductResponse(
    int Id,
    string Sku,
    string Category,
    string Name,
    decimal UnitPrice,
    int Stock,
    int MinStockThreshold,
    bool IsActive);

public record StockMutationResponse(
    int Id,
    int ProductId,
    string ProductName,
    string ProductSku,
    int QuantityChange,
    string Type,
    string? SourceReference,
    DateTime CreatedAt);
