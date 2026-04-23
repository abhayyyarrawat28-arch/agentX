import mongoose, { Schema, Types, Document } from 'mongoose';

export type AuditAction =
  | 'commission_config_updated'
  | 'user_created'
  | 'user_updated'
  | 'product_updated'
  | 'policy_created'
  | 'policy_deleted'
  | 'customer_created'
  | 'registration_rejected';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  action: AuditAction;
  performedBy: Types.ObjectId;
  targetId: Types.ObjectId;
  diff: { before: Record<string, unknown>; after: Record<string, unknown> };
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: [
        'commission_config_updated', 'user_created', 'user_updated',
        'product_updated', 'policy_created', 'policy_deleted',
        'customer_created', 'registration_rejected',
      ],
      required: true,
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    diff: {
      before: { type: Schema.Types.Mixed, default: {} },
      after: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true }
);

AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
