import { FilterQuery, Types } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { AppError } from '../utils/app-error';

interface ProductQueryParams {
  q?: string;
  category?: string;
  stockStatus?: 'in' | 'low' | 'out';
  page?: string;
  limit?: string;
}

export const getProducts = async (query: ProductQueryParams) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;

  const filter: FilterQuery<IProduct> = {};

  if (query.q) {
    const searchRegex = new RegExp(query.q.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { sku: searchRegex }];
  }

  if (query.category) {
    filter.category = query.category.trim();
  }

  if (query.stockStatus === 'in') {
    filter.$expr = { $gt: ['$stock', '$reorderLevel'] };
  } else if (query.stockStatus === 'low') {
    // Low stock: at or below reorder level, but above zero
    filter.$expr = {
      $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$reorderLevel'] }]
    };
  } else if (query.stockStatus === 'out') {
    filter.stock = 0;
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter)
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getProductById = async (id: string): Promise<IProduct> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }
  return product;
};

export const createProduct = async (
  payload: {
    sku: string;
    name: string;
    category: string;
    purchasePrice: number;
    sellingPrice: number;
    stock?: number;
    reorderLevel?: number;
  },
  userId: string
): Promise<IProduct> => {
  const normalizedSku = payload.sku.trim().toUpperCase();
  const existingProduct = await Product.findOne({ sku: normalizedSku });
  if (existingProduct) {
    throw new AppError(`Product with SKU '${normalizedSku}' already exists`, 409, 'DUPLICATE_SKU');
  }

  const initialStock = payload.stock || 0;
  const product = await Product.create({
    ...payload,
    sku: normalizedSku,
    stock: initialStock
  });

  // Write an initial audit log entry if product starts with stock
  if (initialStock > 0) {
    await StockMovement.create({
      product: product._id,
      type: 'RECEIVED',
      quantity: initialStock,
      quantityBefore: 0,
      quantityAfter: initialStock,
      reason: 'Initial inventory entry',
      user: new Types.ObjectId(userId)
    });
  }

  return product;
};

export const updateProduct = async (
  id: string,
  updates: Partial<Pick<IProduct, 'name' | 'category' | 'purchasePrice' | 'sellingPrice' | 'reorderLevel' | 'isActive'>>
): Promise<IProduct> => {
  const product = await Product.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  return product;
};

export const deactivateProduct = async (id: string): Promise<IProduct> => {
  const product = await Product.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true }
  );

  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  return product;
};
