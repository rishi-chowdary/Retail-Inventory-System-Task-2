'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { productsApi, salesApi } from '../../../lib/api';
import { formatCurrency } from '../../../lib/formatters';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Alert, LoadingSpinner } from '../../../components/ui/Alert';
import { Modal } from '../../../components/ui/Modal';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Receipt,
  Percent,
  IndianRupee
} from 'lucide-react';
import { Product } from '../../../types';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Billing configuration
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(5); // 5% default tax

  // Post-sale confirmation modal
  const [confirmedSale, setConfirmedSale] = useState<any | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      try {
        const data = await productsApi.list({ limit: 100 });
        setProducts(data.products.filter(p => p.isActive));
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load catalog');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      if (existing) {
        // Enforce cart limit based on available stock
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item; // limit to stock
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product._id !== productId));
  };

  // Live total estimation
  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.sellingPrice * item.quantity,
    0
  );

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100;
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(subtotal, Math.round(discountValue * 100) / 100);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: cart.map(item => ({
          productId: item.product._id,
          quantity: item.quantity
        })),
        discountType,
        discountValue,
        taxRate
      };

      const sale = await salesApi.create(payload);
      setConfirmedSale(sale);
      setCart([]);
      setDiscountType('none');
      setDiscountValue(0);

      // Refresh product stock levels in catalog
      const freshData = await productsApi.list({ limit: 100 });
      setProducts(freshData.products.filter(p => p.isActive));
    } catch (err: any) {
      setErrorMessage(err.message || 'Transaction could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <ShoppingCart className="text-primary-400" size={24} />
            <span>Point of Sale Terminal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build orders, apply discounts, verify live stock, and process atomic sales
          </p>
        </div>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />
      )}

      {/* POS Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Selection Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search catalog by product name or SKU..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </Card>

          {isLoading ? (
            <LoadingSpinner text="Loading catalog items..." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredProducts.map(prod => {
                const cartQty = cart.find(i => i.product._id === prod._id)?.quantity || 0;
                const remainingAvailable = prod.stock - cartQty;
                const isOutOfStock = prod.stock === 0;
                const isMaxedInCart = remainingAvailable <= 0;

                return (
                  <div
                    key={prod._id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-semibold text-slate-100 line-clamp-1">
                          {prod.name}
                        </h3>
                        <Badge
                          variant={
                            isOutOfStock
                              ? 'danger'
                              : prod.stock <= prod.reorderLevel
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {prod.stock} in stock
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{prod.sku}</p>
                      <p className="text-[10px] text-slate-500">{prod.category}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {formatCurrency(prod.sellingPrice)}
                      </span>
                      <Button
                        size="sm"
                        variant={isOutOfStock || isMaxedInCart ? 'outline' : 'primary'}
                        disabled={isOutOfStock || isMaxedInCart}
                        onClick={() => addToCart(prod)}
                        className="py-1 px-3 text-[11px] gap-1"
                      >
                        <Plus size={12} />
                        <span>{isOutOfStock ? 'Depleted' : isMaxedInCart ? 'Maxed' : 'Add'}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Checkout Cart & Order Calculation */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 space-y-4 border-slate-800 bg-slate-900/90 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt size={17} className="text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-100">Order Summary</h2>
              </div>
              <span className="text-xs text-slate-400">
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </span>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <ShoppingCart className="mx-auto text-slate-600" size={32} />
                <p className="text-xs text-slate-400">The cart is currently empty.</p>
                <p className="text-[11px] text-slate-500">Select products from the catalog to build a sale.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 divide-y divide-slate-800/60">
                {cart.map(item => (
                  <div key={item.product._id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-200 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatCurrency(item.product.sellingPrice)} each • Stock: {item.product.stock}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-800/60">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product._id, -1)}
                          className="p-1 hover:bg-slate-700 text-slate-300"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-100 font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product._id, 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="p-1 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product._id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Discounts and Taxes */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
                {/* Discount Select */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Apply Promotional Discount
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType('none')}
                      className={`p-1.5 rounded-lg border text-center transition-colors ${
                        discountType === 'none'
                          ? 'border-primary-500 bg-primary-600/20 text-primary-300'
                          : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`p-1.5 rounded-lg border text-center transition-colors flex items-center justify-center gap-1 ${
                        discountType === 'percentage'
                          ? 'border-primary-500 bg-primary-600/20 text-primary-300'
                          : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Percent size={11} />
                      <span>Percent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`p-1.5 rounded-lg border text-center transition-colors flex items-center justify-center gap-1 ${
                        discountType === 'fixed'
                          ? 'border-primary-500 bg-primary-600/20 text-primary-300'
                          : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <IndianRupee size={11} />
                      <span>Fixed (₹)</span>
                    </button>
                  </div>

                  {discountType !== 'none' && (
                    <div className="pt-1.5">
                      <Input
                        type="number"
                        min="0"
                        step={discountType === 'fixed' ? '0.01' : '1'}
                        value={discountValue}
                        onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder={discountType === 'percentage' ? 'e.g. 10 for 10%' : 'e.g. 5.00'}
                      />
                    </div>
                  )}
                </div>

                {/* Tax Rate */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Sales Tax Rate (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxRate}
                    onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-right rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none"
                  />
                </div>

                {/* Live Totals Estimate */}
                <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Fixed'})</span>
                      <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Tax ({taxRate}%)</span>
                    <span className="font-mono">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-100 pt-2 border-t border-slate-700">
                    <span>Grand Total</span>
                    <span className="text-emerald-400 font-mono">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {/* Submit Checkout */}
                <Button
                  onClick={handleCompleteSale}
                  variant="primary"
                  className="w-full py-3 mt-4 text-sm font-semibold tracking-wide"
                  isLoading={isSubmitting}
                  disabled={cart.length === 0}
                >
                  Complete Sale & Print Receipt
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Sale Confirmation Modal */}
      <Modal
        isOpen={!!confirmedSale}
        onClose={() => setConfirmedSale(null)}
        title="Sale Confirmed & Stock Deducted"
      >
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={26} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-100">Transaction Successful</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Invoice #{confirmedSale?.invoiceNumber}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Items Total:</span>
              <span className="font-semibold text-slate-200">
                {confirmedSale?.items?.reduce((a: number, b: any) => a + b.quantity, 0)} units
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(confirmedSale?.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tax Amount:</span>
              <span className="font-mono">{formatCurrency(confirmedSale?.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-100 pt-2 border-t border-slate-700">
              <span>Final Total Paid:</span>
              <span className="text-emerald-400 font-mono">
                {formatCurrency(confirmedSale?.total)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmedSale(null)}
              className="text-xs"
            >
              Start Next Sale
            </Button>
            <Link href={`/sales/${confirmedSale?._id}`}>
              <Button variant="primary" className="text-xs gap-1.5">
                <Receipt size={14} />
                <span>View / Print Invoice</span>
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
