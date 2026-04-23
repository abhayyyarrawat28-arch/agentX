import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: 'Term Plan' | 'Savings Plan' | 'ULIP' | 'Endowment';
  fyCommissionRate: number;
  renewalRates: {
    year2: number;
    year3: number;
    year4: number;
    year5: number;
  };
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, enum: ['Term Plan', 'Savings Plan', 'ULIP', 'Endowment'], required: true },
    fyCommissionRate: { type: Number, required: true, min: 0, max: 1 },
    renewalRates: {
      year2: { type: Number, required: true, min: 0, max: 1 },
      year3: { type: Number, required: true, min: 0, max: 1 },
      year4: { type: Number, required: true, min: 0, max: 1 },
      year5: { type: Number, required: true, min: 0, max: 1 },
    },
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1, effectiveFrom: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
