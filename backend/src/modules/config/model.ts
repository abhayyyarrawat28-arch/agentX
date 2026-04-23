import mongoose, { Schema, Types, Document } from 'mongoose';

export interface ICommissionConfig extends Document {
  _id: Types.ObjectId;
  slabs: Array<{
    minPremium: number;
    maxPremium: number | null;
    bonusRate: number;
  }>;
  simulationConditions: Array<{
    key: string;
    label: string;
    description: string;
    basePersistency: number;
    annualBoost: number;
    premiumSensitivity: number;
    volumeSensitivity: number;
    productAdjustments: {
      termPlan: number;
      savingsPlan: number;
      ulip: number;
      endowment: number;
    };
  }>;
  persistencyThreshold: number;
  mdrtTarget: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionConfigSchema = new Schema<ICommissionConfig>(
  {
    slabs: [
      {
        minPremium: { type: Number, required: true, min: 0 },
        maxPremium: { type: Number, default: null },
        bonusRate: { type: Number, required: true, min: 0, max: 1 },
      },
    ],
    simulationConditions: [
      {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        description: { type: String, default: '', trim: true },
        basePersistency: { type: Number, required: true, min: 0, max: 1 },
        annualBoost: { type: Number, default: 0, min: -0.25, max: 0.25 },
        premiumSensitivity: { type: Number, default: 0, min: -0.25, max: 0.25 },
        volumeSensitivity: { type: Number, default: 0, min: -0.25, max: 0.25 },
        productAdjustments: {
          termPlan: { type: Number, default: 0, min: -0.25, max: 0.25 },
          savingsPlan: { type: Number, default: 0, min: -0.25, max: 0.25 },
          ulip: { type: Number, default: 0, min: -0.25, max: 0.25 },
          endowment: { type: Number, default: 0, min: -0.25, max: 0.25 },
        },
      },
    ],
    persistencyThreshold: { type: Number, required: true, min: 0, max: 1 },
    mdrtTarget: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CommissionConfigSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

export const CommissionConfig = mongoose.model<ICommissionConfig>('CommissionConfig', CommissionConfigSchema);
