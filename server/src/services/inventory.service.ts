import { FilterQuery, Types } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { StockMovement, IStockMovement, MovementType } from '../models/StockMovement';
import { IUser } from '../models/User';
import { AppError } from '../utils/app-error';

export const getLowStockProducts = async (): Promise<IProduct[]> => {
  return Product.find({
    isActive: true,
    $expr: { $lte: ['$stock', '$reorderLevel'] }
  }).sort({ stock: 1 });
};

export const adjustStock = async (
  productId: string,
  adjustmentType: 'received' | 'add' | 'remove',
  quantity: number,
  reason: string,
  reference: string | undefined,
  user: IUser
): Promise<{ product: IProduct; movement: IStockMovement }> => {
  // Enforce staff permissions: staff can only receive stock
  if (user.role === 'Staff' && adjustmentType !== 'received') {
    throw new AppError(
      'Staff members can only receive stock. Manual adjustments require Admin.',
      403,
      'FORBIDDEN'
    );
  }

  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  const quantityBefore = existingProduct.stock;
  let quantityAfter = quantityBefore;
  let movementType: MovementType;
  let updatedProduct: IProduct | null = null;

  if (adjustmentType === 'remove') {
    if (existingProduct.stock < quantity) {
      throw new AppError(
        `Insufficient stock for '${existingProduct.name}'. Current stock is ${existingProduct.stock}.`,
        409,
        'INSUFFICIENT_STOCK',
        { availableStock: existingProduct.stock, requestedQuantity: quantity }
      );
    }

    movementType = 'ADJUSTMENT_REMOVE';
    // Atomic deduction ensuring stock never goes below zero
    updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );

    if (!updatedProduct) {
      throw new AppError('Stock adjustment conflict. Please retry.', 409, 'STOCK_CONFLICT');
    }
    quantityAfter = updatedProduct.stock;
  } else {
    movementType = adjustmentType === 'received' ? 'RECEIVED' : 'ADJUSTMENT_ADD';
    updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantity } },
      { new: true }
    );

    if (!updatedProduct) {
      throw new AppError('Product not found during update', 404, 'NOT_FOUND');
    }
    quantityAfter = updatedProduct.stock;
  }

  // Audit log entry for every stock change
  const movement = await StockMovement.create({
    product: existingProduct._id,
    type: movementType,
    quantity,
    quantityBefore,
    quantityAfter,
    reason,
    reference: reference || 'Manual adjustment',
    user: user._id
  });

  return { product: updatedProduct, movement };
};

interface MovementQueryParams {
  product?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
}

export const getMovements = async (query: MovementQueryParams) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '15', 10)));
  const skip = (page - 1) * limit;

  const filter: FilterQuery<IStockMovement> = {};

  if (query.product) {
    filter.product = new Types.ObjectId(query.product);
  }

  if (query.type) {
    filter.type = query.type as MovementType;
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      const fromDate = new Date(query.from);
      fromDate.setUTCHours(0, 0, 0, 0);
      filter.createdAt.$gte = fromDate;
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setUTCHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  const [movements, total] = await Promise.all([
    StockMovement.find(filter)
      .populate('product', 'name sku category')
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StockMovement.countDocuments(filter)
  ]);

  return {
    movements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
