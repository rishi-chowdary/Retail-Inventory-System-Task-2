import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  sku: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer'
      }
    },
    reorderLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Reorder level must be an integer'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

productSchema.index({ name: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
