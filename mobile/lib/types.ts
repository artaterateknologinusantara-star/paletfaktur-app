// Tipe response sama dengan frontend/lib/types.ts supaya porting halaman tinggal ganti import.
export interface ProductResponse {
  id: number;
  sku: string;
  category: string;
  name: string;
  unitPrice: number;
  stock: number;
  minStockThreshold: number;
  isActive: boolean;
}

export interface StockMutationResponse {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantityChange: number;
  type: string;
  sourceReference: string | null;
  createdAt: string;
}

export interface ClientResponse {
  id: number;
  clientCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface InvoiceItemResponse {
  productId: number;
  productName: string;
  productSku: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceResponse {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  issueDate: string;
  dueDate: string;
  poNumber: string | null;
  applyTax: boolean;
  notes: string | null;
  status: string;
  subtotal: number;
  dppNilaiLain: number;
  ppnAmount: number;
  ppnRateUsed: number;
  total: number;
  items: InvoiceItemResponse[];
}

export interface InvoiceListItemResponse {
  id: number;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  total: number;
  status: string;
}

export interface SuratJalanListItemResponse {
  id: number;
  suratJalanNumber: string;
  invoiceNumber: string | null;
  recipientName: string;
  deliveryDate: string;
  driverName: string;
  status: string;
}

export interface SuratJalanResponse {
  id: number;
  suratJalanNumber: string;
  invoiceNumber: string | null;
  clientName: string;
  deliveryDate: string;
  deliveryAddress: string;
  driverName: string;
  vehicleNumber: string;
  notes: string | null;
  status: string;
  items: { itemDescription: string; quantity: number; unit: string; notes: string | null }[];
}

export interface CompanySettingsResponse {
  logoUrl: string | null;
  companyName: string;
  phone: string | null;
  email: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  address: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  ppnRate: number;
  invoiceDueDays: number;
}

export interface DashboardSummaryResponse {
  totalInvoiceAmount: number;
  totalInvoiceCount: number;
  paidAmount: number;
  paidCount: number;
  pendingAmount: number;
  pendingCount: number;
  lowStockCount: number;
  recentInvoices: InvoiceListItemResponse[];
  lowStockProducts: ProductResponse[];
}

export interface ReportSummaryResponse {
  collectedRevenue: number;
  warehouseAssetValue: number;
  collectedPpn: number;
  outstandingReceivable: number;
  paidInvoiceCount: number;
  pendingInvoiceCount: number;
  overdueInvoiceCount: number;
  /** month = label singkat (Jan..Des), key = "YYYY-MM" (urut kronologis, unik antar tahun) */
  monthlyRevenue: { month: string; key: string; revenue: number }[];
  topProducts: { rank: number; sku: string; name: string; unitsSold: number; revenueValue: number }[];
}
