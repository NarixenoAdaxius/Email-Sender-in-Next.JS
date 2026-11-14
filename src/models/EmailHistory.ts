import mongoose from 'mongoose';

export type EmailHistoryStatus =
  | 'success'
  | 'partial'
  | 'failed'
  | 'pending'
  | 'bounced'
  | 'complained';

export interface IEmailFailureDetail {
  recipient: string;
  error: string;
}

export interface IEmailHistory {
  userId: mongoose.Types.ObjectId;
  templateId: string;
  subject: string;
  recipients: string[];
  content: string;
  sentAt: Date;
  status: EmailHistoryStatus;
  errorMessage?: string;
  succeededCount?: number;
  failedCount?: number;
  failedRecipients?: IEmailFailureDetail[];
  messageIds?: string[];
}

const emailHistorySchema = new mongoose.Schema<IEmailHistory>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    templateId: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    recipients: [
      {
        type: String,
        required: true,
      },
    ],
    content: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed', 'pending', 'bounced', 'complained'],
      required: true,
    },
    errorMessage: {
      type: String,
    },
    succeededCount: {
      type: Number,
    },
    failedCount: {
      type: Number,
    },
    failedRecipients: [
      {
        recipient: { type: String, required: true },
        error: { type: String, required: true },
      },
    ],
    messageIds: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

emailHistorySchema.index({ userId: 1, sentAt: -1 });
emailHistorySchema.index({ userId: 1, status: 1, sentAt: -1 });
emailHistorySchema.index({ messageIds: 1 });

const EmailHistory =
  mongoose.models.EmailHistory ||
  mongoose.model<IEmailHistory>('EmailHistory', emailHistorySchema);

export default EmailHistory;
