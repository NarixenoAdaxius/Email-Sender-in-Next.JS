import mongoose, { HydratedDocument, Model } from 'mongoose';

export interface ISession {
  userId: mongoose.Schema.Types.ObjectId;
  token: string;
  deviceInfo: {
    browser: string;
    os: string;
    ip: string;
    deviceType: string;
  };
  lastActive: Date;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionMethods {
  updateActivity: () => Promise<HydratedDocument<ISession, ISessionMethods>>;
  revoke: () => Promise<HydratedDocument<ISession, ISessionMethods>>;
}

export interface SessionModel extends Model<ISession, Record<string, never>, ISessionMethods> {
  findActiveSessionsByUserId: (
    userId: mongoose.Types.ObjectId | mongoose.Schema.Types.ObjectId
  ) => Promise<Array<HydratedDocument<ISession, ISessionMethods>>>;
  findByToken: (
    token: string
  ) => Promise<HydratedDocument<ISession, ISessionMethods> | null>;
  revokeAllExcept: (
    userId: mongoose.Types.ObjectId | mongoose.Schema.Types.ObjectId,
    currentToken: string
  ) => Promise<mongoose.UpdateWriteOpResult>;
}

const sessionSchema = new mongoose.Schema<ISession, SessionModel, ISessionMethods>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    deviceInfo: {
      browser: {
        type: String,
        default: 'Unknown',
      },
      os: {
        type: String,
        default: 'Unknown',
      },
      ip: {
        type: String,
        default: 'Unknown',
      },
      deviceType: {
        type: String,
        default: 'Unknown',
      },
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.methods.updateActivity = function () {
  this.lastActive = new Date();
  return this.save();
};

sessionSchema.methods.revoke = function () {
  this.isRevoked = true;
  return this.save();
};

sessionSchema.statics.findActiveSessionsByUserId = function (
  userId: mongoose.Types.ObjectId | mongoose.Schema.Types.ObjectId
) {
  return this.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActive: -1 });
};

sessionSchema.statics.findByToken = function (token: string) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
};

sessionSchema.statics.revokeAllExcept = function (
  userId: mongoose.Types.ObjectId | mongoose.Schema.Types.ObjectId,
  currentToken: string
) {
  return this.updateMany(
    {
      userId,
      token: { $ne: currentToken },
      isRevoked: false,
    },
    {
      $set: { isRevoked: true },
    }
  );
};

const Session =
  (mongoose.models.Session as SessionModel | undefined) ||
  mongoose.model<ISession, SessionModel>('Session', sessionSchema);

export default Session;
