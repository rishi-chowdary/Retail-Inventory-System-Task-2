import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReturnItem {
  product: Types.ObjectId;
  quantity: number;
  refundAmount: number;
}

export interface ISaleReturn extends Document {
  sale: Types.ObjectId;
  items: IReturnItem[];
  reason: string;
  processedBy: Types.ObjectId;
  createdAt: Date;
}

const returnItemSchema = new Schema<IReturnItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Returned quantity must be an integer'
      }
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const saleReturnSchema = new Schema<ISaleReturn>(
  {
    sale: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      required: true
    },
    items: {
      type: [returnItemSchema],
      required: true,
      validate: {
        validator: (v: IReturnItem[]) => Array.isArray(v) && v.length > 0,
        message: 'Return must contain at least one item'
      }
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

saleReturnSchema.index({ sale: 1, createdAt: -1 });

export const SaleReturn = mongoose.model<ISaleReturn>(
  'SaleReturn',
  saleReturnSchema
);
