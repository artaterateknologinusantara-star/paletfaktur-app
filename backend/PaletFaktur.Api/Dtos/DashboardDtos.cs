namespace PaletFaktur.Api.Dtos;

public record DashboardSummaryResponse(
    decimal TotalInvoiceAmount,
    int TotalInvoiceCount,
    decimal PaidAmount,
    int PaidCount,
    decimal PendingAmount,
    int PendingCount,
    int LowStockCount,
    List<InvoiceListItemResponse> RecentInvoices,
    List<ProductResponse> LowStockProducts);

public record ReportSummaryResponse(
    decimal CollectedRevenue,
    decimal WarehouseAssetValue,
    decimal CollectedPpn,
    decimal OutstandingReceivable,
    int PaidInvoiceCount,
    int PendingInvoiceCount,
    int OverdueInvoiceCount,
    List<MonthlyRevenuePoint> MonthlyRevenue,
    List<TopProductResponse> TopProducts);

public record MonthlyRevenuePoint(string Month, decimal Revenue);

public record TopProductResponse(int Rank, string Sku, string Name, int UnitsSold, decimal RevenueValue);
