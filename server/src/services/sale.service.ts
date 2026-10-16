import mongoose, { FilterQuery, Types } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { Sale, ISale, ISaleItem, DiscountType } from '../models/Sale';
import { StockMovement } from '../models/StockMovement';
import { SaleReturn, ISaleReturn } from '../models/SaleReturn';
import { IUser } from '../models/User';
import { generateInvoiceNumber } from '../utils/invoice-generator';
import { AppError } from '../utils/app-error';

interface InputSaleItem {
  productId: string;
  quantity: number;
}

interface CreateSalePayload {
  items: InputSaleItem[];
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
}

// Merges any duplicate products submitted in the cart
const mergeDuplicateItems = (rawItems: InputSaleItem[]): Map<string, number> => {
  const merged = new Map<string, number>();
  for (const item of rawItems) {
    const currentQty = merged.get(item.productId) || 0;
    merged.set(item.productId, currentQty + item.quantity);
  }
  return merged;
};

// Computes billing totals with strict rounding to 2 decimal places
export const calculateOrderTotals = (
  subtotal: number,
  discountType: DiscountType = 'none',
  discountValue = 0,
  taxRate = 0
) => {
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100;
  } else if (discountType === 'fixed') {
    discountAmount = Math.round(discountValue * 100) / 100;
  }

  // Prevent negative net totals if a discount is misconfigured
  if (discountAmount > subtotal) {
    throw new AppError('Discount cannot exceed subtotal', 422, 'INVALID_DISCOUNT');
  }

  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(((taxableSubtotal * taxRate) / 100) * 100) / 100;
  const total = Math.round((taxableSubtotal + taxAmount) * 100) / 100;

  return { discountAmount, taxAmount, total };
};

export const createSale = async (
  payload: CreateSalePayload,
  user: IUser
): Promise<ISale> => {
  const mergedItems = mergeDuplicateItems(payload.items);
  const productIds = Array.from(mergedItems.keys());

  const session = await mongoose.startSession();
  let createdSale: ISale | null = null;

  try {
    // Sales require full transaction atomicity so stock and receipts never desync
    await session.withTransaction(async () => {
      const products = await Product.find({ _id: { $in: productIds } }).session(session);

      if (products.length !== productIds.length) {
        throw new AppError('One or more selected products do not exist', 404, 'NOT_FOUND');
      }

      const productMap = new Map<string, IProduct>();
      products.forEach(p => productMap.set(p._id.toString(), p));

      const saleItems: ISaleItem[] = [];
      let subtotal = 0;

      // 1. Validate status, verify stock, and snapshot server prices
      for (const [productId, quantity] of mergedItems.entries()) {
        const product = productMap.get(productId)!;

        if (!product.isActive) {
          throw new AppError(
            `Product '${product.name}' is deactivated and cannot be sold`,
            400,
            'PRODUCT_DEACTIVATED'
          );
        }

        if (product.stock < quantity) {
          throw new AppError(
            `Insufficient stock for '${product.name}'. Available: ${product.stock}`,
            409,
            'INSUFFICIENT_STOCK',
            {
              productName: product.name,
              availableStock: product.stock,
              requestedQuantity: quantity
            }
          );
        }

        // Re-fetch price and cost from DB so client tampering is ignored
        const lineTotal = Math.round(product.sellingPrice * quantity * 100) / 100;
        subtotal += lineTotal;

        saleItems.push({
          product: product._id as Types.ObjectId,
          skuSnapshot: product.sku,
          nameSnapshot: product.name,
          unitPrice: product.sellingPrice,
          unitCost: product.purchasePrice,
          quantity,
          lineTotal
        });
      }

      subtotal = Math.round(subtotal * 100) / 100;
      const { discountAmount, taxAmount, total } = calculateOrderTotals(
        subtotal,
        payload.discountType || 'none',
        payload.discountValue || 0,
        payload.taxRate || 0
      );

      const invoiceNumber = await generateInvoiceNumber(session);

      // 2. Conditionally deduct stock atomically to block race-condition overselling
      for (const [productId, quantity] of mergedItems.entries()) {
        const product = productMap.get(productId)!;
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { session, new: true }
        );

        if (!updatedProduct) {
          throw new AppError(
            `Stock conflict for '${product.name}'. Available: ${product.stock}`,
            409,
            'INSUFFICIENT_STOCK',
            {
              productName: product.name,
              availableStock: product.stock,
              requestedQuantity: quantity
            }
          );
        }

        // Append-only stock movement audit log
        await StockMovement.create(
          [
            {
              product: product._id,
              type: 'SALE',
              quantity,
              quantityBefore: product.stock,
              quantityAfter: updatedProduct.stock,
              reason: `Sale ${invoiceNumber}`,
              reference: invoiceNumber,
              user: user._id
            }
          ],
          { session }
        );
      }

      // 3. Persist the confirmed sale record
      const [sale] = await Sale.create(
        [
          {
            invoiceNumber,
            items: saleItems,
            subtotal,
            discountType: payload.discountType || 'none',
            discountValue: payload.discountValue || 0,
            discountAmount,
            taxRate: payload.taxRate || 0,
            taxAmount,
            total,
            status: 'Completed',
            soldBy: user._id
          }
        ],
        { session }
      );

      createdSale = sale;
    });

    return createdSale!;
  } finally {
    await session.endSession();
  }
};

interface SaleQueryParams {
  from?: string;
  to?: string;
  status?: string;
  page?: string;
  limit?: string;
}

export const getSales = async (query: SaleQueryParams) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '15', 10)));
  const skip = (page - 1) * limit;

  const filter: FilterQuery<ISale> = {};

  if (query.status) {
    filter.status = query.status;
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

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate('soldBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Sale.countDocuments(filter)
  ]);

  return {
    sales,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getSaleById = async (id: string): Promise<{ sale: ISale; returns: ISaleReturn[] }> => {
  const sale = await Sale.findById(id).populate('soldBy', 'name email role');
  if (!sale) {
    throw new AppError('Sale record not found', 404, 'NOT_FOUND');
  }

  const returns = await SaleReturn.find({ sale: sale._id })
    .populate('processedBy', 'name email role')
    .sort({ createdAt: -1 });

  return { sale, returns };
};

export const processSaleReturn = async (
  saleId: string,
  returnedItems: InputSaleItem[],
  reason: string,
  user: IUser
): Promise<{ saleReturn: ISaleReturn; updatedSale: ISale }> => {
  const session = await mongoose.startSession();
  let result: { saleReturn: ISaleReturn; updatedSale: ISale } | null = null;

  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findById(saleId).session(session);
      if (!sale) {
        throw new AppError('Sale record not found', 404, 'NOT_FOUND');
      }

      if (sale.status === 'Returned') {
        throw new AppError('This sale has already been fully returned', 400, 'ALREADY_RETURNED');
      }

      // Fetch previous returns to calculate already-returned quantities
      const existingReturns = await SaleReturn.find({ sale: sale._id }).session(session);
      const alreadyReturnedMap = new Map<string, number>();

      for (const ret of existingReturns) {
        for (const item of ret.items) {
          const key = item.product.toString();
          alreadyReturnedMap.set(key, (alreadyReturnedMap.get(key) || 0) + item.quantity);
        }
      }

      const saleItemMap = new Map<string, ISaleItem>();
      sale.items.forEach(item => saleItemMap.set(item.product.toString(), item));

      const processedReturnItems = [];
      let totalRefund = 0;

      // Validate quantities against unreturned portions of original sale
      for (const reqItem of returnedItems) {
        const originalItem = saleItemMap.get(reqItem.productId);
        if (!originalItem) {
          throw new AppError(
            'Product was not part of this sale',
            400,
            'INVALID_RETURN_ITEM'
          );
        }

        const previouslyReturned = alreadyReturnedMap.get(reqItem.productId) || 0;
        const availableToReturn = originalItem.quantity - previouslyReturned;

        if (reqItem.quantity > availableToReturn) {
          throw new AppError(
            `Cannot return ${reqItem.quantity} units of '${originalItem.nameSnapshot}'. Only ${availableToReturn} remain refundable.`,
            400,
            'EXCESS_RETURN_QUANTITY'
          );
        }

        // Pro-rate refund based on discounted effective price
        const effectiveRatio = sale.subtotal > 0 ? (sale.subtotal - sale.discountAmount) / sale.subtotal : 1;
        const refundAmount = Math.round(originalItem.unitPrice * reqItem.quantity * effectiveRatio * 100) / 100;
        totalRefund += refundAmount;

        processedReturnItems.push({
          product: originalItem.product,
          quantity: reqItem.quantity,
          refundAmount
        });

        // Restore inventory and write RETURN audit log
        const updatedProduct = await Product.findByIdAndUpdate(
          originalItem.product,
          { $inc: { stock: reqItem.quantity } },
          { session, new: true }
        );

        if (updatedProduct) {
          await StockMovement.create(
            [
              {
                product: originalItem.product,
                type: 'RETURN',
                quantity: reqItem.quantity,
                quantityBefore: updatedProduct.stock - reqItem.quantity,
                quantityAfter: updatedProduct.stock,
                reason: `Sale Return (${sale.invoiceNumber}): ${reason}`,
                reference: sale.invoiceNumber,
                user: user._id
              }
            ],
            { session }
          );
        }

        // Update local returned map for overall sale status calculation
        alreadyReturnedMap.set(reqItem.productId, previouslyReturned + reqItem.quantity);
      }

      // Check if all products across the entire sale are now returned
      let allFullyReturned = true;
      for (const item of sale.items) {
        const returnedQty = alreadyReturnedMap.get(item.product.toString()) || 0;
        if (returnedQty < item.quantity) {
          allFullyReturned = false;
          break;
        }
      }

      sale.status = allFullyReturned ? 'Returned' : 'PartiallyReturned';
      await sale.save({ session });

      const [createdReturn] = await SaleReturn.create(
        [
          {
            sale: sale._id,
            items: processedReturnItems,
            reason,
            processedBy: user._id
          }
        ],
        { session }
      );

      result = { saleReturn: createdReturn, updatedSale: sale };
    });

    return result!;
  } finally {
    await session.endSession();
  }
};
