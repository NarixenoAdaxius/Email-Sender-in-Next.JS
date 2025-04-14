import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailTemplate extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  subject: string;
  html: string;
  css: string;
  variables: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
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
      required: [true, 'Please provide a template description'],
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema); 