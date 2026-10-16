'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { inventoryApi } from '../../../lib/api';
import { formatCurrency } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner, EmptyState } from '../../../components/ui/Alert';
import { AlertTriangle, PackageX, IndianRupee, ArrowRight, Truck } from 'lucide-react';
import { Product } from '../../../types';

export default function LowStockPage() {
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLowStock = async () => {
    setIsLoading(true);
    try {
      const items = await inventoryApi.getLowStock();
      setLowStockItems(items);
    } catch (err) {
      console.error('Failed to load low stock items', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  // Compute reorder suggestions
  const outOfStockCount = lowStockItems.filter(i => i.stock === 0).length;
  const totalSuggestedCost = lowStockItems.reduce((acc, item) => {
    // Formula: Suggest ordering enough to bring inventory to 3x reorder level
    const targetStock = Math.max(item.reorderLevel * 3, 10);
    const suggestedUnits = Math.max(0, targetStock - item.stock);
    return acc + suggestedUnits * item.purchasePrice;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <AlertTriangle className="text-amber-400" size={24} />
            <span>Low-Stock & Reorder Advisory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Active products operating at or below threshold levels with auto-calculated replenishment quantities
          </p>
        </div>

        <Link href="/inventory">
          <Button variant="secondary" size="sm" className="gap-2">
            <Truck size={14} />
            <span>Receive Inventory</span>
          </Button>
        </Link>
      </div>

      {/* Advisory Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Items Needing Reorder"
          value={lowStockItems.length}
          subtext="Stock <= Reorder Level"
          icon={<AlertTriangle size={20} className="text-amber-400" />}
        />
        <StatCard
          title="Completely Depleted"
          value={outOfStockCount}
          subtext="Zero units remaining"
          icon={<PackageX size={20} className="text-rose-400" />}
        />
        <StatCard
          title="Est. Replenishment Cost"
          value={formatCurrency(totalSuggestedCost)}
          subtext="Suggested purchase order total"
          icon={<IndianRupee size={20} className="text-emerald-400" />}
        />
      </div>

      {/* Replenishment Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Analyzing inventory levels..." />
        ) : lowStockItems.length === 0 ? (
          <EmptyState
            title="All Stock Levels Optimal"
            description="There are currently no products at or below their reorder thresholds."
            action={
              <Link href="/products">
                <Button size="sm" variant="secondary">
                  Browse Product Catalog
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Reorder Level</th>
                  <th className="py-3 px-4 font-semibold text-right text-indigo-400">
                    Suggested Order Qty
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">Est. Unit Cost</th>
                  <th className="py-3 px-4 font-semibold text-right text-emerald-400">
                    Est. Order Total
                  </th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lowStockItems.map(item => {
                  const targetStock = Math.max(item.reorderLevel * 3, 10);
                  const suggestedUnits = Math.max(0, targetStock - item.stock);
                  const estCost = suggestedUnits * item.purchasePrice;

                  return (
                    <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-100">{item.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{item.sku}</td>
                      <td className="py-3.5 px-4 text-slate-400">{item.category}</td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span className={item.stock === 0 ? 'text-rose-400' : 'text-amber-400'}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                        {item.reorderLevel}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-indigo-300 font-mono">
                        +{suggestedUnits} units
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {formatCurrency(item.purchasePrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-400 font-mono">
                        {formatCurrency(estCost)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={item.stock === 0 ? 'danger' : 'warning'}>
                          {item.stock === 0 ? 'Depleted' : 'Low Stock'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/inventory?restock=${item._id}`}>
                          <Button size="sm" variant="primary" className="py-1 px-3 text-[11px] gap-1">
                            <span>Restock</span>
                            <ArrowRight size={12} />
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
      </Card>
    </div>
  );
}
