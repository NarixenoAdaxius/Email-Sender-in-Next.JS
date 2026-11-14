import mongoose, { Document, Schema } from 'mongoose';

export type TemplateDesignMode = 'studio' | 'visual' | 'code' | 'custom';

export interface IEmailTemplate extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  subject: string;
  html: string;
  css: string;
  variables: string[];
  isPublic: boolean;
  designMode?: TemplateDesignMode;
  blocks?: Record<string, unknown>[] | null;
  theme?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  content?: string;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a template name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Please provide an email subject'],
      trim: true,
    },
    html: {
      type: String,
      required: [true, 'Please provide HTML content'],
    },
    css: {
      type: String,
      default: '',
    },
    variables: {
      type: [String],
      default: [],
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    designMode: {
      type: String,
      enum: ['studio', 'visual', 'code', 'custom'],
      default: 'custom',
    },
    blocks: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    theme: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add a virtual 'content' field that maps to html
EmailTemplateSchema.virtual('content').get(function () {
  return this.html;
});

EmailTemplateSchema.virtual('content').set(function (content: string) {
  this.html = content;
});

EmailTemplateSchema.index({ userId: 1, createdAt: -1 });
EmailTemplateSchema.index({ isPublic: 1, createdAt: -1 });

export default mongoose.models.EmailTemplate ||
  mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
