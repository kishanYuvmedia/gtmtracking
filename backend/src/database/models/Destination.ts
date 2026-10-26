import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type DestinationType = 'meta_capi' | 'google_ads';

export interface EncryptedCredentials {
  ciphertext: string;
  iv: string;
  auth_tag: string;
  key_version: number;
}

export interface DestinationDocument {
  _id: string;
  workspace_id: string;
  type: DestinationType;
  name: string;
  // Non-secret settings: pixel_id / test_event_code (Meta), customer_id / login_customer_id (Google Ads).
  config: Record<string, unknown>;
  credentials_encrypted: EncryptedCredentials | null;
  enabled: boolean;
  test_mode: boolean;
  created_at: Date;
  updated_at: Date;
}

const EncryptedCredentialsSchema = new Schema<EncryptedCredentials>(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    auth_tag: { type: String, required: true },
    key_version: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const DestinationSchema = new Schema<DestinationDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true, index: true },
    type: { type: String, enum: ['meta_capi', 'google_ads'], required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    config: { type: Schema.Types.Mixed, default: {} },
    credentials_encrypted: { type: EncryptedCredentialsSchema, default: null, select: false },
    enabled: { type: Boolean, default: false },
    test_mode: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

DestinationSchema.index({ workspace_id: 1, type: 1 });

export const Destination = mongoose.models.Destination
  || mongoose.model<DestinationDocument>('Destination', DestinationSchema);
