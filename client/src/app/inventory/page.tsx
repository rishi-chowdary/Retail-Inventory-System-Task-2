'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../lib/auth-context';
import { inventoryApi, productsApi } from '../../lib/api';
import { formatDateTime } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Alert, LoadingSpinner, EmptyState } from '../../components/ui/Alert';
import { Layers, ArrowDownLeft, ArrowUpRight, Plus, History, Filter } from 'lucide-react';
import { StockMovement, Product } from '../../types';

const adjustmentSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  type: z.enum(['received', 'add', 'remove']),
  quantity: z.coerce.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
  reason: z.string().min(2, 'Reason must be at least 2 characters'),
  reference: z.string().optional()
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('restock') || '';

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Filters for movement audit log
  const [filterType, setFilterType] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: preselectedProductId,
      type: 'received',
      quantity: 1,
      reason: 'Shipment restock'
    }
  });

  const loadData = async (page = 1) => {
    setIsLoading(true);
    try {
      const [allProds, movesData] = await Promise.all([
        productsApi.list({ limit: 100 }),
        inventoryApi.getMovements({
          type: filterType || undefined,
          page,
          limit: 15
        })
      ]);

      setProductsList(allProds.products);
      setMovements(movesData.movements);
      setPagination(movesData.pagination);

      if (preselectedProductId) {
        setValue('productId', preselectedProductId);
      }
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to load inventory data' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [filterType]);

  const handleStockAdjustment = async (data: AdjustmentFormValues) => {
    setIsSubmitting(true);
    setStatusAlert(null);
    try {
      const res = await inventoryApi.adjustStock(data);
      setStatusAlert({
        type: 'success',
        message: `Successfully adjusted stock for '${res.product.name}'. New stock level: ${res.product.stock}`
      });
      reset({
        productId: '',
        type: 'received',
        quantity: 1,
        reason: 'Shipment restock',
        reference: ''
      });
      loadData(pagination.page);
    } catch (err: any) {
      setStatusAlert({
        type: 'error',
        message: err.message || 'Failed to complete stock adjustment'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'RECEIVED':
        return <Badge variant="success">RECEIVED (+)</Badge>;
      case 'SALE':
        return <Badge variant="neutral">SALE (-)</Badge>;
      case 'ADJUSTMENT_ADD':
        return <Badge variant="info">CORRECTION (+)</Badge>;
      case 'ADJUSTMENT_REMOVE':
        return <Badge variant="danger">DAMAGE/REMOVE (-)</Badge>;
      case 'RETURN':
        return <Badge variant="warning">RETURN (+)</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Inventory Adjustments & Stock Audit
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Receive shipments, manage manual corrections, and trace append-only stock logs
        </p>
      </div>

      {statusAlert && (
        <Alert
          type={statusAlert.type}
          message={statusAlert.message}
          onDismiss={() => setStatusAlert(null)}
        />
      )}

      {/* Stock Adjustment Form Card */}
      <Card className="space-y-4 border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2 text-slate-200">
          <Layers size={18} className="text-primary-400" />
          <h2 className="text-sm font-semibold">Stock Adjustment & Receipt Form</h2>
        </div>

        <form onSubmit={handleSubmit(handleStockAdjustment)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Product selection */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300">
                Target Product
              </label>
              <select
                {...register('productId')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:border-primary-500"
              >
                <option value="">-- Choose a product to adjust --</option>
                {productsList.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku}) — Current Stock: {p.stock}
                  </option>
                ))}
              </select>
              {errors.productId && (
                <p className="text-xs text-rose-400 mt-1">{errors.productId.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Action Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:border-primary-500"
              >
                <option value="received">Receive Stock (Supplier restock)</option>
                {isAdmin && <option value="add">Add Correction (Admin found items)</option>}
                {isAdmin && <option value="remove">Remove Damage/Expired (Admin)</option>}
              </select>
              {errors.type && (
                <p className="text-xs text-rose-400 mt-1">{errors.type.message}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <Input
                label="Quantity"
                type="number"
                min="1"
                error={errors.quantity?.message}
                {...register('quantity')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Adjustment Reason"
                placeholder="e.g. Received weekly shipment from supplier"
                error={errors.reason?.message}
                {...register('reason')}
              />
            </div>
            <div>
              <Input
                label="Reference (Optional PO / Note)"
                placeholder="e.g. PO-2026-904"
                error={errors.reference?.message}
                {...register('reference')}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="gap-2">
              <Plus size={15} />
              <span>Submit Stock Adjustment</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Movements Audit Log */}
      <Card className="p-0 overflow-hidden space-y-0">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Stock Movement Audit Trail (Append-Only)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 text-xs focus:outline-none focus:border-primary-500"
            >
              <option value="">All Movement Types</option>
              <option value="RECEIVED">RECEIVED</option>
              <option value="SALE">SALE</option>
              <option value="ADJUSTMENT_ADD">ADJUSTMENT_ADD</option>
              <option value="ADJUSTMENT_REMOVE">ADJUSTMENT_REMOVE</option>
              <option value="RETURN">RETURN</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Retrieving audit records..." />
        ) : movements.length === 0 ? (
          <EmptyState
            title="No Movements Logged"
            description="No inventory movement records match your criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold text-right">Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">Before → After</th>
                  <th className="py-3 px-4 font-semibold">Reason & Ref</th>
                  <th className="py-3 px-4 font-semibold">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movements.map(mov => (
                  <tr key={mov._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {formatDateTime(mov.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {mov.product?.name || 'Unknown Product'}
                      <span className="block text-[10px] font-mono text-slate-400">
                        {mov.product?.sku}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getMovementBadge(mov.type)}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span
                        className={
                          mov.type === 'SALE' || mov.type === 'ADJUSTMENT_REMOVE'
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }
                      >
                        {mov.type === 'SALE' || mov.type === 'ADJUSTMENT_REMOVE' ? '-' : '+'}
                        {mov.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {mov.quantityBefore} →{' '}
                      <span className="font-semibold text-slate-100">{mov.quantityAfter}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {mov.reason}
                      {mov.reference && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Ref: {mov.reference}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {mov.user?.name || 'System'}
                      <span className="block text-[10px] text-slate-400">
                        ({mov.user?.role || 'User'})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/60">
            <span className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} movements)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => loadData(pagination.page - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadData(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
