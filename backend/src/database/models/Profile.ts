import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ProfileDocument {
  _id: string;
  workspace_id: string;
  traits: Record<string, unknown>;
  // Denormalised identifiers / summary columns so the Users list never scans events.
  name: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  is_known: boolean;
  first_seen: Date;
  last_seen: Date;
  event_count: number;
  session_count: number;
  device_count: number;
  first_utm: Record<string, unknown> | null;
  last_utm: Record<string, unknown> | null;
  country: string | null;
  city: string | null;
  device: Record<string, unknown> | null;
  revenue: number;
  order_count: number;
  last_purchase_at: Date | null;
  // Bumped inside every identity-resolution transaction: two workers touching the same
  // profile write-conflict and one retries, which is Mongo's equivalent of a row lock.
  lock_version: number;
  created_at: Date;
  updated_at: Date;
}

const ProfileSchema = new Schema<ProfileDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true },
    traits: { type: Schema.Types.Mixed, default: {} },
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    user_id: { type: String, default: null },
    is_known: { type: Boolean, default: false },
    first_seen: { type: Date, default: () => new Date() },
    last_seen: { type: Date, default: () => new Date() },
    event_count: { type: Number, default: 0, min: 0 },
    session_count: { type: Number, default: 0, min: 0 },
    device_count: { type: Number, default: 0, min: 0 },
    first_utm: { type: Schema.Types.Mixed, default: null },
    last_utm: { type: Schema.Types.Mixed, default: null },
    country: { type: String, default: null },
    city: { type: String, default: null },
    device: { type: Schema.Types.Mixed, default: null },
    revenue: { type: Number, default: 0 },
    order_count: { type: Number, default: 0, min: 0 },
    last_purchase_at: { type: Date, default: null },
    lock_version: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

ProfileSchema.index({ workspace_id: 1, last_seen: -1, _id: 1 });
ProfileSchema.index({ workspace_id: 1, first_seen: -1, _id: 1 });
ProfileSchema.index({ workspace_id: 1, event_count: -1, _id: 1 });
ProfileSchema.index({ workspace_id: 1, revenue: -1, _id: 1 });
ProfileSchema.index({ workspace_id: 1, is_known: 1, last_seen: -1 });
ProfileSchema.index({ workspace_id: 1, email: 1 }, { sparse: true });
ProfileSchema.index({ workspace_id: 1, phone: 1 }, { sparse: true });
ProfileSchema.index({ workspace_id: 1, user_id: 1 }, { sparse: true });
ProfileSchema.index({ workspace_id: 1, country: 1 });
ProfileSchema.index({ 'traits.$**': 1 });

export const Profile = mongoose.models.Profile || mongoose.model<ProfileDocument>('Profile', ProfileSchema);
