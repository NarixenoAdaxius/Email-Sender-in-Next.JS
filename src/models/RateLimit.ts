import mongoose from 'mongoose';

export interface IRateLimit {
  _id: string; // `${key}:${windowStart}`
  count: number;
  expiresAt: Date;
}

const rateLimitSchema = new mongoose.Schema<IRateLimit>(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

// TTL index: MongoDB removes documents once expiresAt has passed
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit: mongoose.Model<IRateLimit> =
  (mongoose.models.RateLimit as mongoose.Model<IRateLimit>) ||
  mongoose.model<IRateLimit>('RateLimit', rateLimitSchema);

export default RateLimit;
