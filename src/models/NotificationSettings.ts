import mongoose from 'mongoose';

export interface INotificationSettings {
  userId: mongoose.Schema.Types.ObjectId;
  email: {
    marketing: boolean;
    emailDelivery: boolean;
    newFeatures: boolean;
    security: boolean;
  };
  app: {
    emailSent: boolean;
    emailOpened: boolean;
    emailClicked: boolean;
    emailBounced: boolean;
    newTemplates: boolean;
    teamInvites: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSettingsSchema = new mongoose.Schema<INotificationSettings>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    email: {
      marketing: {
        type: Boolean,
        default: true,
      },
      emailDelivery: {
        type: Boolean,
        default: true,
      },
      newFeatures: {
        type: Boolean,
        default: true,
      },
      security: {
        type: Boolean,
        default: true,
      },
    },
    app: {
      emailSent: {
        type: Boolean,
        default: true,
      },
      emailOpened: {
        type: Boolean,
        default: true,
      },
      emailClicked: {
        type: Boolean,
        default: true,
      },
      emailBounced: {
        type: Boolean,
        default: true,
      },
      newTemplates: {
        type: Boolean,
        default: true,
      },
      teamInvites: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

const NotificationSettings = mongoose.models.NotificationSettings || 
  mongoose.model<INotificationSettings>('NotificationSettings', notificationSettingsSchema);

export default NotificationSettings; 