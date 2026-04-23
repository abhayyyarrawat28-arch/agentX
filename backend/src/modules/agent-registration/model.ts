import mongoose, { Schema, Types, Document } from 'mongoose';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface IAgentRegistration extends Document {
  _id: Types.ObjectId;
  fullName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  employeeId: string;
  branchId: string;
  mobile: string;
  email: string;
  panNumber: string;
  licenseNumber: string;
  licenseExpiry: Date;
  yearsOfExperience: number;
  status: RegistrationStatus;
  rejectionNote: string | null;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  userId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AgentRegistrationSchema = new Schema<IAgentRegistration>(
  {
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    employeeId: { type: String, required: true, trim: true, uppercase: true },
    branchId: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, match: /^\d{10}$/ },
    email: { type: String, required: true, lowercase: true, trim: true },
    panNumber: { type: String, required: true, uppercase: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseExpiry: { type: Date, required: true },
    yearsOfExperience: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionNote: { type: String, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

AgentRegistrationSchema.index({ status: 1, createdAt: -1 });
AgentRegistrationSchema.index({ employeeId: 1 });
AgentRegistrationSchema.index({ mobile: 1 });
AgentRegistrationSchema.index({ panNumber: 1 });
AgentRegistrationSchema.index({ email: 1 });

export const AgentRegistration = mongoose.model<IAgentRegistration>('AgentRegistration', AgentRegistrationSchema);
