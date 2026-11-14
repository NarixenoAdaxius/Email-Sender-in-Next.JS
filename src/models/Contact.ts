import mongoose, { Document, Schema } from 'mongoose';

export type ContactStatus = 'active' | 'unsubscribed' | 'bounced';

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  company?: string;
  tags: string[];
  status?: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    company: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    status: {
      type: String,
      enum: ['active', 'unsubscribed', 'bounced'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for userId and email to ensure uniqueness per user
ContactSchema.index({ userId: 1, email: 1 }, { unique: true });
ContactSchema.index({ userId: 1, name: 1 });
ContactSchema.index({ userId: 1, tags: 1 });

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema); 