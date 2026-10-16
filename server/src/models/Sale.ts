import mongoose, { Document, Schema, Types } from 'mongoose';

export type DiscountType = 'percentage' | 'fixed' | 'none';
export type SaleStatus = 'Completed' | 'PartiallyReturned' | 'Returned';

export interface ISaleItem {
  product: Types.ObjectId;
  skuSnapshot: string;
  nameSnapshot: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  lineTotal: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  items: ISaleItem[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: SaleStatus;
  soldBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    skuSnapshot: {
      type: String,
      required: true
    },
    nameSnapshot: {
      type: String,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer'
      }
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (v: ISaleItem[]) => Array.isArray(v) && v.length > 0,
        message: 'Sale must have at least one item'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'none'],
      default: 'none'
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['Completed', 'PartiallyReturned', 'Returned'],
      default: 'Completed'
    },
    soldBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ soldBy: 1 });
saleSchema.index({ status: 1 });

export const Sale = mongoose.model<ISale>('Sale', saleSchema);
