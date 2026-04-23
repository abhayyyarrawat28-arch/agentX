import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IPolicyHolder extends Document {
  _id: Types.ObjectId;
  agentId: Types.ObjectId;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  panNumber: string;
  aadhaarLast4: string;
  mobile: string;
  email: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  relationToProposer: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  isPriorityCustomer: boolean;
  fixedMonthlyReturn: boolean;
  monthlyRenewalAmount: number | null;
  totalActivePolicies: number;
  totalAnnualPremium: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PolicyHolderSchema = new Schema<IPolicyHolder>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    panNumber: { type: String, required: true, uppercase: true },
    aadhaarLast4: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    relationToProposer: { type: String, enum: ['self', 'spouse', 'child', 'parent', 'other'], default: 'self' },
    isPriorityCustomer: { type: Boolean, default: false },
    fixedMonthlyReturn: { type: Boolean, default: false },
    monthlyRenewalAmount: { type: Number, default: null },
    totalActivePolicies: { type: Number, default: 0 },
    totalAnnualPremium: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PolicyHolderSchema.index({ agentId: 1, panNumber: 1 }, { unique: true });
PolicyHolderSchema.index({ agentId: 1 });
PolicyHolderSchema.index({ mobile: 1 });

export const PolicyHolder = mongoose.model<IPolicyHolder>('PolicyHolder', PolicyHolderSchema);
