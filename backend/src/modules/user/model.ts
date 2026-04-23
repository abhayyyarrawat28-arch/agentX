import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  employeeId: string;
  passwordHash: string;
  role: 'agent' | 'admin';
  name: string;
  branchId: string;
  isActive: boolean;
  mustChangePassword: boolean;
  registrationId: Types.ObjectId | null;
  onboardedBy: 'self_registration' | 'admin_created';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    employeeId: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['agent', 'admin'], required: true },
    name: { type: String, required: true, trim: true },
    branchId: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    registrationId: { type: Schema.Types.ObjectId, ref: 'AgentRegistration', default: null },
    onboardedBy: { type: String, enum: ['self_registration', 'admin_created'], default: 'admin_created' },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, branchId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
