'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  Package,
  TrendingUp,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { reportsApi, inventoryApi, productsApi } from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/Alert';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [salesReport, setSalesReport] = useState<any>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('30d');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      let fromDate: string | undefined = undefined;
      const now = new Date();

      if (dateFilter === '7d') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        fromDate = d.toISOString().slice(0, 10);
      } else if (dateFilter === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        fromDate = d.toISOString().slice(0, 10);
      }

      const [salesData, lowStock, productsData] = await Promise.all([
        reportsApi.getSales({ from: fromDate }),
        inventoryApi.getLowStock(),
        productsApi.list({ limit: 1 })
      ]);

      setSalesReport(salesData);
      setLowStockProducts(lowStock);
      setTotalProductsCount(productsData.pagination.total);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  if (isLoading && !salesReport) {
    return <LoadingSpinner text="Compiling dashboard analytics..." />;
  }

  const chartData =
    salesReport?.dailyBreakdown?.map((day: any) => ({
      date: day.date.slice(5),
      sales: day.totalSales,
      transactions: day.transactionCount
    })) || [];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Overview Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Welcome back, <span className="text-indigo-400 font-medium">{user?.name}</span> ({user?.role})
          </p>
        </div>

        {/* Date-Range Filter */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
          <Calendar size={14} className="text-slate-400 ml-2" />
          <button
            onClick={() => setDateFilter('7d')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              dateFilter === '7d'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateFilter('30d')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              dateFilter === '30d'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              dateFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales"
          value={formatCurrency(salesReport?.totalSales || 0)}
          subtext="Net confirmed sales"
          icon={<DollarSign size={22} />}
          trend={{ positive: true, text: 'Live POS tracking' }}
        />
        <StatCard
          title="Transactions"
          value={salesReport?.transactionCount || 0}
          subtext="Completed invoices"
          icon={<ShoppingBag size={22} />}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockProducts.length}
          subtext="Require attention"
          icon={<AlertTriangle size={22} className={lowStockProducts.length > 0 ? 'text-amber-400' : ''} />}
          trend={
            lowStockProducts.length > 0
              ? { positive: false, text: 'Stock <= Reorder Level' }
              : { positive: true, text: 'Inventory healthy' }
          }
        />
        <StatCard
          title="Catalog SKUs"
          value={totalProductsCount}
          subtext="Active products"
          icon={<Package size={22} />}
        />
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-400" />
                Sales Velocity & Daily Revenue
              </h2>
              <p className="text-xs text-slate-400">Daily revenue trend in selected timeframe</p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#818CF8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                    name="Daily Sales ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No sales recorded in this date range
              </div>
            )}
          </div>
        </Card>

        {/* Top-Selling Products */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Top-Selling Products</h2>
          <div className="space-y-3">
            {salesReport?.topSellingProducts?.length > 0 ? (
              salesReport.topSellingProducts.map((p: any, idx: number) => (
                <div
                  key={p.sku}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800"
                >
                  <div className="space-y-0.5 max-w-[170px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-indigo-400">#{idx + 1}</span>
                      <p className="text-xs font-medium text-slate-200 truncate">{p.name}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-100">{p.quantity} sold</p>
                    <p className="text-[10px] text-emerald-400 font-medium">{formatCurrency(p.revenue)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No sales recorded yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts Section */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Low Stock Warnings (Requires Action)
            </h2>
            <p className="text-xs text-slate-400">Products currently at or below their defined reorder level</p>
          </div>
          <Link href="/inventory/low-stock">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <span>View All Suggestions</span>
              <ArrowRight size={13} />
            </Button>
          </Link>
        </div>

        {lowStockProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Product</th>
                  <th className="py-2.5 px-3 font-medium">SKU</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium text-right">Current Stock</th>
                  <th className="py-2.5 px-3 font-medium text-right">Reorder Level</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lowStockProducts.slice(0, 5).map(prod => (
                  <tr key={prod._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-200">{prod.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{prod.sku}</td>
                    <td className="py-3 px-3 text-slate-400">{prod.category}</td>
                    <td className="py-3 px-3 text-right font-bold text-amber-400">{prod.stock}</td>
                    <td className="py-3 px-3 text-right text-slate-400">{prod.reorderLevel}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={prod.stock === 0 ? 'danger' : 'warning'}>
                        {prod.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link href={`/inventory?restock=${prod._id}`}>
                        <Button size="sm" variant="secondary" className="text-[11px] py-1 px-2.5">
                          Restock
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-emerald-400/90 py-4 text-center">
            All inventory levels are currently above reorder thresholds!
          </p>
        )}
      </Card>
    </div>
  );
}
