import mongoose, { Document, Schema } from 'mongoose';

export type ScheduledRecipientType = 'group' | 'individual' | 'manual';

export interface IScheduledEmail extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  recipientGroup?: string;
  recipients?: string[];
  recipientType?: ScheduledRecipientType;
  recipientCount: number;
  scheduledDate: Date;
  template: string;
  templateId: mongoose.Types.ObjectId | string;
  variables?: Record<string, string>;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly';
  anchorDay?: number;
  status: 'scheduled' | 'processing' | 'sent' | 'cancelled' | 'failed';
  lastSent?: Date;
  nextSendDate?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledEmailSchema = new Schema<IScheduledEmail>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    recipientGroup: {
      type: String,
      default: 'individual',
      trim: true,
    },
    recipients: {
      type: [String],
      default: [],
    },
    recipientType: {
      type: String,
      enum: ['group', 'individual', 'manual'],
      default: 'group',
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    template: {
      type: String,
      required: true,
    },
    templateId: {
      type: Schema.Types.Mixed,
      required: true,
    },
    variables: {
      type: Schema.Types.Mixed,
      default: {},
    },
    recurrence: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly'],
      default: 'once',
    },
    anchorDay: {
      type: Number,
      min: 1,
      max: 31,
    },
    status: {
      type: String,
      enum: ['scheduled', 'processing', 'sent', 'cancelled', 'failed'],
      default: 'scheduled',
    },
    lastSent: {
      type: Date,
    },
    nextSendDate: {
      type: Date,
    },
    lastError: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

ScheduledEmailSchema.pre('validate', function (next) {
  const hasGroup =
    typeof this.recipientGroup === 'string' && this.recipientGroup.trim().length > 0;
  const hasRecipients = Array.isArray(this.recipients) && this.recipients.length > 0;

  if (!hasGroup && !hasRecipients) {
    return next(new Error('Either recipientGroup or non-empty recipients must be provided'));
  }

  if (!hasGroup && hasRecipients) {
    this.recipientGroup = 'individual';
  }

  next();
});

// Indexes for efficient querying
ScheduledEmailSchema.index({ userId: 1, status: 1 });
ScheduledEmailSchema.index({ status: 1, scheduledDate: 1 });
ScheduledEmailSchema.index({ status: 1, nextSendDate: 1 });
ScheduledEmailSchema.index({ userId: 1, scheduledDate: 1 });

export default mongoose.models.ScheduledEmail ||
  mongoose.model<IScheduledEmail>('ScheduledEmail', ScheduledEmailSchema);
