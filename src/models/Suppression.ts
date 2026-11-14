import mongoose, { Document, Schema } from 'mongoose';

export type SuppressionReason = 'unsubscribe' | 'bounce' | 'complaint' | 'manual';

export interface ISuppression extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  reason: SuppressionReason;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const suppressionSchema = new Schema<ISuppression>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    reason: {
      type: String,
      enum: ['unsubscribe', 'bounce', 'complaint', 'manual'],
      default: 'unsubscribe',
      required: true,
    },
    source: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

suppressionSchema.index({ userId: 1, email: 1 }, { unique: true });
suppressionSchema.index({ email: 1 });

const Suppression =
  mongoose.models.Suppression ||
  mongoose.model<ISuppression>('Suppression', suppressionSchema);

export default Suppression;
