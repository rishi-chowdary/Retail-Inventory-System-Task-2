'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { reportsApi } from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Alert, LoadingSpinner } from '../../components/ui/Alert';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { SalesReport, ProfitReport } from '../../types';

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'sales' | 'profit'>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const sales = await reportsApi.getSales({
        from: dateFrom || undefined,
        to: dateTo || undefined
      });
      setSalesReport(sales);

      if (isAdmin) {
        const profit = await reportsApi.getProfit({
          from: dateFrom || undefined,
          to: dateTo || undefined
        });
        setProfitReport(profit);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch report metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateFrom, dateTo]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await reportsApi.downloadCsv({
        from: dateFrom || undefined,
        to: dateTo || undefined
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to download CSV export');
    } finally {
      setIsExporting(false);
    }
  };

  const avgOrderValue =
    salesReport && salesReport.transactionCount > 0
      ? salesReport.totalSales / salesReport.transactionCount
      : 0;

  return (
    <div className="space-y-6">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="text-primary-400" size={24} />
            <span>Reports & Performance Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregate revenue, daily breakdown, profitability margins, and CSV export
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          variant="secondary"
          size="sm"
          isLoading={isExporting}
          className="gap-2 self-start sm:self-auto border-indigo-700/50 text-indigo-300 hover:bg-indigo-950/40"
        >
          <Download size={15} />
          <span>Download Sales CSV</span>
        </Button>
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Filter and Tab Navigation */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sales'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sales Breakdown
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'profit'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Profit & Margins</span>
            {!isAdmin && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400">
                Admin
              </span>
            )}
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 text-xs focus:outline-none"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 text-xs focus:outline-none"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner text="Computing analytics data..." />
      ) : activeTab === 'sales' ? (
        <div className="space-y-6">
          {/* Sales KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Sales Revenue"
              value={formatCurrency(salesReport?.totalSales || 0)}
              subtext="Selected date range"
              icon={<DollarSign size={20} className="text-emerald-400" />}
            />
            <StatCard
              title="Total Completed Orders"
              value={salesReport?.transactionCount || 0}
              subtext="Customer receipts"
              icon={<Receipt size={20} className="text-indigo-400" />}
            />
            <StatCard
              title="Average Order Value"
              value={formatCurrency(avgOrderValue)}
              subtext="Per transaction"
              icon={<TrendingUp size={20} className="text-amber-400" />}
            />
          </div>

          {/* Daily Breakdown Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-200">Daily Sales Activity</h2>
            </div>
            {salesReport?.dailyBreakdown && salesReport.dailyBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Date</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Transactions</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Revenue</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Avg Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {salesReport.dailyBreakdown.map(day => (
                      <tr key={day.date} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-300 font-sans">{day.date}</td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {day.transactionCount}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {formatCurrency(day.totalSales)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {formatCurrency(
                            day.transactionCount > 0 ? day.totalSales / day.transactionCount : 0
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                No transactions recorded in this date range.
              </p>
            )}
          </Card>
        </div>
      ) : (
        /* Profit Report Tab */
        <div>
          {!isAdmin ? (
            <Card className="text-center py-12 space-y-3">
              <ShieldAlert size={36} className="text-amber-400 mx-auto" />
              <h3 className="text-base font-semibold text-slate-200">
                Restricted to Administrators
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Profit margin reports and purchase cost data require Administrator authorization.
                Please sign in as an Admin to review net profitability.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Profit Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Net Revenue"
                  value={formatCurrency(profitReport?.netRevenue || 0)}
                  subtext={`Gross: ${formatCurrency(profitReport?.grossRevenue || 0)}`}
                  icon={<DollarSign size={20} className="text-indigo-400" />}
                />
                <StatCard
                  title="Cost of Goods Sold"
                  value={formatCurrency(profitReport?.costOfGoodsSold || 0)}
                  subtext="Net inventory acquisition cost"
                  icon={<Receipt size={20} className="text-slate-400" />}
                />
                <StatCard
                  title="Net Profit"
                  value={formatCurrency(profitReport?.netProfit || 0)}
                  subtext="Net of discounts & returns"
                  icon={<TrendingUp size={20} className="text-emerald-400" />}
                  trend={{
                    positive: (profitReport?.netProfit || 0) >= 0,
                    text: `${profitReport?.marginPercentage || 0}% margin`
                  }}
                />
                <StatCard
                  title="Profit Margin"
                  value={`${profitReport?.marginPercentage || 0}%`}
                  subtext="Net Profit / Net Revenue"
                  icon={<Percent size={20} className="text-amber-400" />}
                />
              </div>

              {/* Profit Ledger Breakdown */}
              <Card className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-200">
                  Profitability Calculation Ledger
                </h2>
                <div className="space-y-3 divide-y divide-slate-800 text-xs">
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span>Gross Sales Volume ({profitReport?.salesCount} transactions)</span>
                    <span className="font-mono">{formatCurrency(profitReport?.grossRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-rose-400">
                    <span>Less: Customer Returns & Refunds ({profitReport?.returnsCount} returns)</span>
                    <span className="font-mono">-{formatCurrency(profitReport?.totalRefunds || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-semibold text-slate-100">
                    <span>Effective Net Revenue</span>
                    <span className="font-mono">{formatCurrency(profitReport?.netRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-rose-400">
                    <span>Less: Cost of Goods Sold (Unit acquisition costs)</span>
                    <span className="font-mono">-{formatCurrency(profitReport?.costOfGoodsSold || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-amber-400">
                    <span>Discounts Applied</span>
                    <span className="font-mono">-{formatCurrency(profitReport?.totalDiscounts || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-3 text-base font-bold text-emerald-400 border-t border-slate-700">
                    <span>Final Net Profit Realized</span>
                    <span className="font-mono">{formatCurrency(profitReport?.netProfit || 0)}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
