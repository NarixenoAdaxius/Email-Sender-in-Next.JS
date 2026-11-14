import mongoose from 'mongoose';

export interface ISecuritySettings {
  userId: mongoose.Schema.Types.ObjectId;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  pendingTwoFactorSecret?: string | null;
  failedTwoFactorAttempts?: number;
  twoFactorLockUntil?: Date | null;
  lastVerifiedTotpStep?: number | null;
  recoveryCodes?: string[];
  activeSessions?: string[];
  lastPasswordChange?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const securitySettingsSchema = new mongoose.Schema<ISecuritySettings>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    pendingTwoFactorSecret: {
      type: String,
      default: null,
    },
    failedTwoFactorAttempts: {
      type: Number,
      default: 0,
    },
    twoFactorLockUntil: {
      type: Date,
      default: null,
    },
    lastVerifiedTotpStep: {
      type: Number,
      default: null,
    },
    recoveryCodes: {
      type: [String],
      default: [],
    },
    activeSessions: {
      type: [String],
      default: [],
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const SecuritySettings = 
  mongoose.models.SecuritySettings || 
  mongoose.model<ISecuritySettings>('SecuritySettings', securitySettingsSchema);

export default SecuritySettings; 