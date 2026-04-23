import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IAgentPolicy extends Document {
  _id: Types.ObjectId;
  agentId: Types.ObjectId;
  policyHolderId: Types.ObjectId;
  saleTransactionId: string;
  productId: Types.ObjectId;
  productName: string;
  policyNumber: string;
  annualPremium: number;
  sumAssured: number;
  policyTerm: number;
  premiumPayingTerm: number;
  paymentFrequency: 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
  issueDate: Date;
  maturityDate: Date;
  persistencyStatus: 'active' | 'lapsed' | 'surrendered';
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AgentPolicySchema = new Schema<IAgentPolicy>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    policyHolderId: { type: Schema.Types.ObjectId, ref: 'PolicyHolder', required: true },
    saleTransactionId: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    policyNumber: { type: String, required: true, unique: true },
    annualPremium: { type: Number, required: true },
    sumAssured: { type: Number, required: true },
    policyTerm: { type: Number, required: true },
    premiumPayingTerm: { type: Number, required: true },
    paymentFrequency: { type: String, enum: ['annual', 'semi-annual', 'quarterly', 'monthly'], default: 'annual' },
    issueDate: { type: Date, required: true },
    maturityDate: { type: Date, required: true },
    persistencyStatus: { type: String, enum: ['active', 'lapsed', 'surrendered'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AgentPolicySchema.index({ agentId: 1, issueDate: -1 });
AgentPolicySchema.index({ policyHolderId: 1 });
AgentPolicySchema.index({ saleTransactionId: 1 });
AgentPolicySchema.index({ persistencyStatus: 1 });
AgentPolicySchema.index({ isDeleted: 1 });

AgentPolicySchema.pre('find', function () {
  if ((this.getFilter() as any).isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

AgentPolicySchema.pre('findOne', function () {
  if ((this.getFilter() as any).isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

export const AgentPolicy = mongoose.model<IAgentPolicy>('AgentPolicy', AgentPolicySchema);
