'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';
import { salesApi } from '../../../lib/api';
import { formatCurrency, formatDateTime } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Alert, LoadingSpinner } from '../../../components/ui/Alert';
import { Printer, ArrowLeft, RotateCcw, CheckCircle, ShieldAlert } from 'lucide-react';
import { Sale, SaleReturn } from '../../../types';

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const saleId = params.id as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnStatusAlert, setReturnStatusAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Return form state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState('Customer returned item');

  const fetchSale = async () => {
    setIsLoading(true);
    try {
      const data = await salesApi.getById(saleId);
      setSale(data.sale);
      setReturns(data.returns || []);
      if (data.sale.items.length > 0) {
        setSelectedProductId(data.sale.items[0].product);
      }
    } catch (err: any) {
      setReturnStatusAlert({
        type: 'error',
        message: err.message || 'Failed to load sale details'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (saleId) fetchSale();
  }, [saleId]);

  const handlePrint = () => {
    window.print();
  };

  // Calculate already returned quantities
  const returnedQuantitiesMap = new Map<string, number>();
  returns.forEach(ret => {
    ret.items.forEach(item => {
      const pId = item.product.toString();
      returnedQuantitiesMap.set(pId, (returnedQuantitiesMap.get(pId) || 0) + item.quantity);
    });
  });

  const selectedItem = sale?.items.find(i => i.product.toString() === selectedProductId);
  const alreadyReturnedForSelected = selectedProductId
    ? returnedQuantitiesMap.get(selectedProductId) || 0
    : 0;
  const maxReturnable = selectedItem ? selectedItem.quantity - alreadyReturnedForSelected : 0;

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || returnQty <= 0) return;

    setIsSubmittingReturn(true);
    setReturnStatusAlert(null);

    try {
      await salesApi.processReturn(saleId, {
        items: [{ productId: selectedProductId, quantity: returnQty }],
        reason: returnReason
      });

      setReturnStatusAlert({
        type: 'success',
        message: 'Return successfully processed! Inventory stock has been restored.'
      });
      setIsReturnModalOpen(false);
      fetchSale();
    } catch (err: any) {
      setReturnStatusAlert({
        type: 'error',
        message: err.message || 'Failed to process return.'
      });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Generating invoice details..." />;
  }

  if (!sale) {
    return (
      <div className="space-y-4">
        <Alert type="error" message="Sale invoice not found." />
        <Link href="/sales">
          <Button variant="secondary" size="sm">
            Back to Sales
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top action header (hidden during printing) */}
      <div className="flex items-center justify-between no-print">
        <Link href="/sales">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-400">
            <ArrowLeft size={14} />
            <span>Back to Sales List</span>
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          {isAdmin && sale.status !== 'Returned' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsReturnModalOpen(true)}
              className="gap-2 border-amber-600/50 text-amber-300 hover:bg-amber-950/40"
            >
              <RotateCcw size={14} />
              <span>Process Return</span>
            </Button>
          )}

          <Button variant="primary" size="sm" onClick={handlePrint} className="gap-2">
            <Printer size={14} />
            <span>Print Invoice</span>
          </Button>
        </div>
      </div>

      {returnStatusAlert && (
        <div className="no-print">
          <Alert
            type={returnStatusAlert.type}
            message={returnStatusAlert.message}
            onDismiss={() => setReturnStatusAlert(null)}
          />
        </div>
      )}

      {/* Printable Invoice Container */}
      <div className="printable-invoice bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                RP
              </div>
              <span className="font-bold text-xl text-slate-100">RetailPulse Store</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">100 Tech Blvd, Innovation Park</p>
            <p className="text-xs text-slate-400">support@retailpulse.demo</p>
          </div>

          <div className="text-right space-y-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Tax Receipt / Invoice
            </span>
            <p className="text-xl font-bold font-mono text-slate-100">{sale.invoiceNumber}</p>
            <p className="text-xs text-slate-400 font-mono">{formatDateTime(sale.createdAt)}</p>
            <div className="pt-1">
              <Badge
                variant={
                  sale.status === 'Completed'
                    ? 'success'
                    : sale.status === 'PartiallyReturned'
                    ? 'warning'
                    : 'danger'
                }
              >
                {sale.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Transaction Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Cashier Operator
            </p>
            <p className="text-slate-200 font-medium mt-0.5">{sale.soldBy?.name || 'Staff'}</p>
            <p className="text-slate-500">{sale.soldBy?.email}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Payment Status
            </p>
            <p className="text-emerald-400 font-medium mt-0.5">Paid in Full</p>
            <p className="text-slate-500">Point of Sale Electronic Receipt</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 border-y border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">SKU Snapshot</th>
                <th className="py-2.5 px-3 font-semibold">Item Description</th>
                <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sale.items.map((item, idx) => {
                const returnedQty = returnedQuantitiesMap.get(item.product.toString()) || 0;

                return (
                  <tr key={idx}>
                    <td className="py-3 px-3 text-slate-400">{item.skuSnapshot}</td>
                    <td className="py-3 px-3 text-slate-200 font-sans">
                      {item.nameSnapshot}
                      {returnedQty > 0 && (
                        <span className="block text-[10px] text-amber-400">
                          ({returnedQty} units returned)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-100 font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-100 font-bold">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>
                  Discount ({sale.discountType === 'percentage' ? `${sale.discountValue}%` : 'Fixed'}):
                </span>
                <span className="font-mono">-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-400">
              <span>Tax ({sale.taxRate}%):</span>
              <span className="font-mono">{formatCurrency(sale.taxAmount)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-100 pt-2 border-t border-slate-700">
              <span>Grand Total:</span>
              <span className="text-emerald-400 font-mono">{formatCurrency(sale.total)}</span>
            </div>
          </div>
        </div>

        {/* Return Audit Records */}
        {returns.length > 0 && (
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <RotateCcw size={13} className="text-amber-400" />
              <span>Processed Returns on this Sale</span>
            </h4>
            <div className="space-y-2">
              {returns.map(ret => (
                <div
                  key={ret._id}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-slate-200">
                      Reason: <span className="font-medium text-slate-300">"{ret.reason}"</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Processed on {formatDateTime(ret.createdAt)} by {ret.processedBy?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {ret.items.map((item, i) => (
                      <p key={i} className="text-amber-400 font-semibold font-mono">
                        Returned {item.quantity}x • Refund {formatCurrency(item.refundAmount)}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-8 border-t border-slate-800/60 text-[11px] text-slate-500">
          Thank you for shopping with RetailPulse. All sales are protected by atomic replica transactions.
        </div>
      </div>

      {/* Process Return Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Process Return for Invoice ${sale.invoiceNumber}`}
      >
        <form onSubmit={handleProcessReturn} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Select Product to Return
            </label>
            <select
              value={selectedProductId}
              onChange={e => {
                setSelectedProductId(e.target.value);
                setReturnQty(1);
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none"
            >
              {sale.items.map(item => {
                const returnedQty = returnedQuantitiesMap.get(item.product.toString()) || 0;
                const remaining = item.quantity - returnedQty;
                return (
                  <option
                    key={item.product.toString()}
                    value={item.product.toString()}
                    disabled={remaining <= 0}
                  >
                    {item.nameSnapshot} ({item.skuSnapshot}) — {remaining} refundable (of {item.quantity})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Quantity to Return (Max: {maxReturnable})
            </label>
            <Input
              type="number"
              min="1"
              max={maxReturnable}
              value={returnQty}
              onChange={e => setReturnQty(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Return Reason
            </label>
            <Input
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              placeholder="e.g. Customer purchased incorrect size or defective seal"
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-300 flex items-start gap-2">
            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
            <span>
              Approving this return will execute a MongoDB atomic transaction, restore {returnQty} unit(s) to inventory, and log an audit movement of type RETURN.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReturnModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isSubmittingReturn}
              disabled={maxReturnable <= 0}
            >
              Approve Return & Restore Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
