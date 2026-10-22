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
  condition: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceResponse {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  clientAddress: string | null;
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

export interface SuratJalanItemResponse {
  itemDescription: string;
  color: string | null;
  quantity: number;
  unit: string;
  notes: string | null;
}

export interface SuratJalanResponse {
  id: number;
  suratJalanNumber: string;
  invoiceId: number | null;
  invoiceNumber: string | null;
  clientId: number;
  clientName: string;
  recipientDescription: string | null;
  poNumber: string | null;
  deliveryDate: string;
  deliveryAddress: string;
  driverName: string;
  vehicleNumber: string;
  notes: string | null;
  status: string;
  items: SuratJalanItemResponse[];
}

export interface LogoUploadResponse {
  url: string;
}

export interface CompanySettingsResponse {
  logoUrl: string | null;
  companyName: string;
  phone: string | null;
  email: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  address: string | null;
  tagline: string | null;
  website: string | null;
  city: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  ppnRate: number;
  invoiceDueDays: number;
  signatureUrl: string | null;
  stampUrl: string | null;
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
  monthlyRevenue: { month: string; revenue: number }[];
  topProducts: { rank: number; sku: string; name: string; unitsSold: number; revenueValue: number }[];
}

export type QuotationStatus = "Draft" | "Terkirim" | "Disetujui" | "Ditolak";

export interface QuotationItemResponse {
  productId: number | null;
  name: string;
  condition: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
  unit: string;
  lineTotal: number;
}

export interface QuotationResponse {
  id: number;
  quotationNumber: string;
  clientId: number | null;
  recipientName: string;
  quotationDate: string;
  subject: string;
  attachment: string | null;
  introText: string | null;
  notes: string | null;
  status: QuotationStatus;
  total: number;
  items: QuotationItemResponse[];
  photos: QuotationPhotoResponse[];
  invoiceId: number | null;
  invoiceNumber: string | null;
}

export interface QuotationPhotoResponse {
  url: string;
  caption: string | null;
}
