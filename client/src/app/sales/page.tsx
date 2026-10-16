'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { salesApi } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner, EmptyState } from '../../components/ui/Alert';
import { Receipt, Eye, Plus, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Sale } from '../../types';

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchSales = async (page = 1) => {
    setIsLoading(true);
    try {
      const data = await salesApi.list({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15
      });
      setSales(data.sales);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load sales', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [statusFilter, dateFrom, dateTo]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'PartiallyReturned':
        return <Badge variant="warning">Partially Returned</Badge>;
      case 'Returned':
        return <Badge variant="danger">Fully Returned</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Receipt className="text-primary-400" size={24} />
            <span>Sales & Invoices</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse transaction records, inspect receipts, and manage sales returns
          </p>
        </div>

        <Link href="/sales/new">
          <Button variant="primary" size="sm" className="gap-2">
            <Plus size={15} />
            <span>New Sale</span>
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-slate-500 hidden sm:block shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="PartiallyReturned">Partially Returned</option>
            <option value="Returned">Returned</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
          <span className="text-xs text-slate-400">Date Range:</span>
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
        </div>
      </Card>

      {/* Sales Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Retrieving sales records..." />
        ) : sales.length === 0 ? (
          <EmptyState
            title="No Sales Transactions Found"
            description="No sales matched your date or status filters."
            action={
              <Link href="/sales/new">
                <Button size="sm" variant="primary">
                  Process New Sale
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Cashier</th>
                  <th className="py-3 px-4 font-semibold text-right">Items Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                  <th className="py-3 px-4 font-semibold text-right">Discount</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Paid</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sales.map(s => {
                  const itemsCount = s.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <tr key={s._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {s.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {formatDateTime(s.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {s.soldBy?.name || 'Staff'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-300">
                        {itemsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatCurrency(s.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-400">
                        {s.discountAmount > 0 ? `-${formatCurrency(s.discountAmount)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(s.total)}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(s.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/sales/${s._id}`}>
                          <Button size="sm" variant="secondary" className="py-1 px-2.5 text-[11px] gap-1.5">
                            <Eye size={12} />
                            <span>Details</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/60">
            <span className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} sales)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => fetchSales(pagination.page - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSales(pagination.page + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
