import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Strong: user_id, email, phone. Medium: browser/click identifiers.
// IP and user agent are deliberately not identity types: they never link profiles.
export const IDENTITY_TYPES = ['user_id', 'email', 'phone', 'anonymous_id', 'fbp', 'fbc', 'gclid'] as const;
export type IdentityType = typeof IDENTITY_TYPES[number];
export const STRONG_IDENTITY_TYPES: readonly IdentityType[] = ['user_id', 'email', 'phone'];

export interface IdentityDocument {
  _id: string;
  workspace_id: string;
  profile_id: string;
  type: IdentityType;
  value: string;
  first_seen: Date;
  last_seen: Date;
  created_at: Date;
}

const IdentitySchema = new Schema<IdentityDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true },
    profile_id: { type: String, required: true },
    type: { type: String, enum: IDENTITY_TYPES, required: true },
    value: { type: String, required: true, trim: true },
    first_seen: { type: Date, default: () => new Date() },
    last_seen: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

IdentitySchema.index({ workspace_id: 1, type: 1, value: 1 }, { unique: true });
IdentitySchema.index({ workspace_id: 1, profile_id: 1, type: 1 });
// Users-list search on identifiers (email/phone/user_id/anonymous_id prefix).
IdentitySchema.index({ workspace_id: 1, value: 1 });

export const Identity = mongoose.models.Identity || mongoose.model<IdentityDocument>('Identity', IdentitySchema);
