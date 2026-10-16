'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../lib/auth-context';
import { productsApi } from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert, LoadingSpinner, EmptyState } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { Plus, Search, Edit2, Ban, Filter, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { Product } from '../../types';

const productSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(30),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category: z.string().min(2, 'Category is required').max(50),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
  stock: z.coerce.number().int('Stock must be an integer').min(0, 'Stock cannot be negative'),
  reorderLevel: z.coerce.number().int('Reorder level must be an integer').min(0)
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { stock: 0, reorderLevel: 5 }
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema)
  });

  const fetchProducts = async (page = 1) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await productsApi.list({
        q: searchQuery || undefined,
        category: selectedCategory || undefined,
        stockStatus: stockStatus || undefined,
        page,
        limit: 10
      });
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
  }, [searchQuery, selectedCategory, stockStatus]);

  const handleCreateProduct = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await productsApi.create(data);
      setIsCreateOpen(false);
      resetCreate();
      fetchProducts(1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (data: ProductFormValues) => {
    if (!editingProduct) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await productsApi.update(editingProduct._id, {
        name: data.name,
        category: data.category,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        reorderLevel: data.reorderLevel
      });
      setEditingProduct(null);
      fetchProducts(pagination.page);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate '${name}'? Deactivated items cannot be sold.`)) {
      return;
    }
    try {
      await productsApi.deactivate(id);
      fetchProducts(pagination.page);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deactivate product');
    }
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    resetEdit({
      sku: prod.sku,
      name: prod.name,
      category: prod.category,
      purchasePrice: prod.purchasePrice,
      sellingPrice: prod.sellingPrice,
      stock: prod.stock,
      reorderLevel: prod.reorderLevel
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Product Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage SKUs, prices, stock levels, and category groupings
          </p>
        </div>

        {isAdmin ? (
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="primary"
            className="gap-2 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <Shield size={14} className="text-emerald-400" />
            <span>Staff Mode (Catalog View)</span>
          </div>
        )}
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-slate-500 hidden sm:block shrink-0" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="flex-1 md:w-44 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:border-primary-500"
          >
            <option value="">All Categories</option>
            <option value="Beverages">Beverages</option>
            <option value="Snacks & Confectionery">Snacks & Confectionery</option>
            <option value="Bakery">Bakery</option>
            <option value="Dairy & Eggs">Dairy & Eggs</option>
            <option value="Fresh Produce">Fresh Produce</option>
            <option value="Household & Personal Care">Household & Personal Care</option>
          </select>

          <select
            value={stockStatus}
            onChange={e => setStockStatus(e.target.value)}
            className="flex-1 md:w-36 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:border-primary-500"
          >
            <option value="">All Stock Levels</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Fetching products catalog..." />
        ) : products.length === 0 ? (
          <EmptyState
            title="No Products Found"
            description="No items match your search or filter criteria. Try adjusting your query."
            action={
              isAdmin && (
                <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)}>
                  Create First Product
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Product Name</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold text-right">Cost Price</th>}
                  <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Reorder At</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map(prod => {
                  const isLow = prod.stock > 0 && prod.stock <= prod.reorderLevel;
                  const isOut = prod.stock === 0;

                  return (
                    <tr
                      key={prod._id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        !prod.isActive ? 'opacity-50 bg-slate-950/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {prod.sku}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100">
                        {prod.name}
                        {!prod.isActive && (
                          <span className="ml-2 text-[10px] text-rose-400 font-bold uppercase">
                            (Deactivated)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{prod.category}</td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatCurrency(prod.purchasePrice)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200">
                        {formatCurrency(prod.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span
                          className={
                            isOut
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {prod.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {prod.reorderLevel}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <Badge variant="danger">Out of Stock</Badge>
                        ) : isLow ? (
                          <Badge variant="warning">Low Stock</Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(prod)}
                              title="Edit Product"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            {prod.isActive && (
                              <button
                                onClick={() => handleDeactivate(prod._id, prod.name)}
                                title="Deactivate Product"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              >
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
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
              Showing page <span className="font-semibold text-slate-200">{pagination.page}</span>{' '}
              of <span className="font-semibold text-slate-200">{pagination.totalPages}</span> ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => fetchProducts(pagination.page - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchProducts(pagination.page + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Product Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Catalog Product"
      >
        <form onSubmit={handleSubmitCreate(handleCreateProduct)} className="space-y-4">
          <Input
            label="SKU Code"
            placeholder="e.g. BEV-COLD-005"
            error={createErrors.sku?.message}
            {...registerCreate('sku')}
          />
          <Input
            label="Product Name"
            placeholder="e.g. Vanilla Cold Brew Coffee"
            error={createErrors.name?.message}
            {...registerCreate('name')}
          />
          <Input
            label="Category"
            placeholder="e.g. Beverages"
            error={createErrors.category?.message}
            {...registerCreate('category')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Price (₹)"
              type="number"
              step="0.01"
              error={createErrors.purchasePrice?.message}
              {...registerCreate('purchasePrice')}
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.01"
              error={createErrors.sellingPrice?.message}
              {...registerCreate('sellingPrice')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Stock"
              type="number"
              error={createErrors.stock?.message}
              {...registerCreate('stock')}
            />
            <Input
              label="Reorder Threshold"
              type="number"
              error={createErrors.reorderLevel?.message}
              {...registerCreate('reorderLevel')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title={`Edit Product: ${editingProduct?.sku}`}
      >
        <form onSubmit={handleSubmitEdit(handleUpdateProduct)} className="space-y-4">
          <Input
            label="Product Name"
            error={editErrors.name?.message}
            {...registerEdit('name')}
          />
          <Input
            label="Category"
            error={editErrors.category?.message}
            {...registerEdit('category')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Price (₹)"
              type="number"
              step="0.01"
              error={editErrors.purchasePrice?.message}
              {...registerEdit('purchasePrice')}
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.01"
              error={editErrors.sellingPrice?.message}
              {...registerEdit('sellingPrice')}
            />
          </div>
          <Input
            label="Reorder Threshold"
            type="number"
            error={editErrors.reorderLevel?.message}
            {...registerEdit('reorderLevel')}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingProduct(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Update Product
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
