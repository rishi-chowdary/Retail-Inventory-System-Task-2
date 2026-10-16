import { FilterQuery } from 'mongoose';
import { Sale, ISale } from '../models/Sale';
import { SaleReturn } from '../models/SaleReturn';
import { jsonToCsv } from '../utils/csv';

const buildDateFilter = (from?: string, to?: string): FilterQuery<ISale> => {
  const filter: FilterQuery<ISale> = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      const fromDate = new Date(from);
      fromDate.setUTCHours(0, 0, 0, 0);
      filter.createdAt.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }
  return filter;
};

export const getSalesReport = async (from?: string, to?: string) => {
  const dateFilter = buildDateFilter(from, to);
  const sales = await Sale.find(dateFilter).sort({ createdAt: 1 });

  let totalSales = 0;
  const productAggMap = new Map<
    string,
    { sku: string; name: string; quantity: number; revenue: number }
  >();
  const dailyMap = new Map<string, { totalSales: number; count: number }>();

  for (const sale of sales) {
    totalSales += sale.total;

    // Daily breakdown grouping
    const dateKey = sale.createdAt.toISOString().slice(0, 10);
    const dayStats = dailyMap.get(dateKey) || { totalSales: 0, count: 0 };
    dayStats.totalSales = Math.round((dayStats.totalSales + sale.total) * 100) / 100;
    dayStats.count += 1;
    dailyMap.set(dateKey, dayStats);

    // Aggregate product metrics
    for (const item of sale.items) {
      const key = item.skuSnapshot;
      const existing = productAggMap.get(key) || {
        sku: item.skuSnapshot,
        name: item.nameSnapshot,
        quantity: 0,
        revenue: 0
      };
      existing.quantity += item.quantity;
      existing.revenue = Math.round((existing.revenue + item.lineTotal) * 100) / 100;
      productAggMap.set(key, existing);
    }
  }

  const topSellingProducts = Array.from(productAggMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      totalSales: data.totalSales,
      transactionCount: data.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    transactionCount: sales.length,
    topSellingProducts,
    dailyBreakdown
  };
};

export const generateSalesCsv = async (from?: string, to?: string): Promise<string> => {
  const dateFilter = buildDateFilter(from, to);
  const sales = await Sale.find(dateFilter)
    .populate('soldBy', 'name email')
    .sort({ createdAt: -1 });

  const headers = [
    'Invoice Number',
    'Date',
    'Cashier',
    'Items Count',
    'Subtotal',
    'Discount Amount',
    'Tax Amount',
    'Total',
    'Status'
  ];

  const rows = sales.map(sale => {
    const cashierName = (sale.soldBy as any)?.name || 'Unknown';
    const itemsCount = sale.items.reduce((acc, i) => acc + i.quantity, 0);
    const dateStr = sale.createdAt.toISOString().slice(0, 10);

    return [
      sale.invoiceNumber,
      dateStr,
      cashierName,
      itemsCount,
      sale.subtotal.toFixed(2),
      sale.discountAmount.toFixed(2),
      sale.taxAmount.toFixed(2),
      sale.total.toFixed(2),
      sale.status
    ];
  });

  return jsonToCsv(headers, rows);
};

export const getProfitReport = async (from?: string, to?: string) => {
  const dateFilter = buildDateFilter(from, to);
  const sales = await Sale.find(dateFilter);
  const saleIds = sales.map(s => s._id);

  const returns = await SaleReturn.find({ sale: { $in: saleIds } });

  // Map returns by sale for quick lookup
  const returnsBySale = new Map<string, typeof returns>();
  for (const ret of returns) {
    const saleId = ret.sale.toString();
    const list = returnsBySale.get(saleId) || [];
    list.push(ret);
    returnsBySale.set(saleId, list);
  }

  let grossRevenue = 0;
  let totalDiscounts = 0;
  let grossCost = 0;
  let totalRefunds = 0;
  let returnedCostRestored = 0;

  for (const sale of sales) {
    grossRevenue += sale.total;
    totalDiscounts += sale.discountAmount;

    // Unit-level profit margin computation
    for (const item of sale.items) {
      grossCost += item.unitCost * item.quantity;
    }

    const saleReturns = returnsBySale.get(sale._id.toString()) || [];
    for (const ret of saleReturns) {
      for (const retItem of ret.items) {
        totalRefunds += retItem.refundAmount;

        const matchedItem = sale.items.find(
          i => i.product.toString() === retItem.product.toString()
        );
        if (matchedItem) {
          returnedCostRestored += matchedItem.unitCost * retItem.quantity;
        }
      }
    }
  }

  const netRevenue = Math.max(0, Math.round((grossRevenue - totalRefunds) * 100) / 100);
  const netCostOfGoodsSold = Math.max(0, Math.round((grossCost - returnedCostRestored) * 100) / 100);
  // Profit = sum((unitPrice - unitCost) * qty) - discounts, net of returns
  const netProfit = Math.round((netRevenue - netCostOfGoodsSold) * 100) / 100;
  const marginPercentage =
    netRevenue > 0 ? Math.round((netProfit / netRevenue) * 10000) / 100 : 0;

  return {
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
    netRevenue,
    costOfGoodsSold: netCostOfGoodsSold,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    netProfit,
    marginPercentage,
    salesCount: sales.length,
    returnsCount: returns.length
  };
};
