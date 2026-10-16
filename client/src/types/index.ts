export type UserRole = 'Admin' | 'Staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Product {
  _id: string;
  sku: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  product: string;
  skuSnapshot: string;
  nameSnapshot: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  items: SaleItem[];
  subtotal: number;
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'Completed' | 'PartiallyReturned' | 'Returned';
  soldBy: {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    category?: string;
  };
  type: 'RECEIVED' | 'SALE' | 'ADJUSTMENT_ADD' | 'ADJUSTMENT_REMOVE' | 'RETURN';
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  reference?: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  createdAt: string;
}

export interface ReturnItem {
  product: string;
  quantity: number;
  refundAmount: number;
}

export interface SaleReturn {
  _id: string;
  sale: string;
  items: ReturnItem[];
  reason: string;
  processedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface SalesReport {
  totalSales: number;
  transactionCount: number;
  topSellingProducts: {
    sku: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  dailyBreakdown: {
    date: string;
    totalSales: number;
    transactionCount: number;
  }[];
}

export interface ProfitReport {
  grossRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  costOfGoodsSold: number;
  totalDiscounts: number;
  netProfit: number;
  marginPercentage: number;
  salesCount: number;
  returnsCount: number;
}
