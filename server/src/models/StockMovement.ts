import mongoose, { Document, Schema, Types } from 'mongoose';

export type MovementType =
  | 'RECEIVED'
  | 'SALE'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_REMOVE'
  | 'RETURN';

export interface IStockMovement extends Document {
  product: Types.ObjectId;
  type: MovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  reference?: string;
  user: Types.ObjectId;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    type: {
      type: String,
      enum: ['RECEIVED', 'SALE', 'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE', 'RETURN'],
      required: true
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
    quantityBefore: {
      type: Number,
      required: true,
      min: 0
    },
    quantityAfter: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    reference: {
      type: String,
      trim: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>(
  'StockMovement',
  stockMovementSchema
);
