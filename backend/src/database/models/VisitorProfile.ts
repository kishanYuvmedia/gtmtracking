import mongoose, { Schema } from 'mongoose';

export interface VisitorProfileRow {
  workspace_id: string | null;
  visitor_id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  birth_date: string | null;
  gender: string | null;
  custom_data: Record<string, unknown>;
  device_info: Record<string, unknown>;
  location_info: Record<string, unknown>;
  first_seen_at: Date;
  last_seen_at: Date;
  total_sessions: number;
  created_at: Date;
  updated_at: Date;
}

export interface VisitorProfileDocument extends VisitorProfileRow {
  _id: string;
}

const VisitorProfileSchema = new Schema<VisitorProfileDocument>(
  {
    _id: { type: String, required: true },
    workspace_id: { type: String, default: null, index: true },
    email: { type: String, default: null, index: true },
    phone: { type: String, default: null },
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    city: { type: String, default: null },
    country: { type: String, default: null },
    zip: { type: String, default: null },
    birth_date: { type: String, default: null },
    gender: { type: String, default: null },
    custom_data: { type: Schema.Types.Mixed, default: {} },
    device_info: { type: Schema.Types.Mixed, default: {} },
    location_info: { type: Schema.Types.Mixed, default: {} },
    first_seen_at: { type: Date, default: () => new Date() },
    last_seen_at: { type: Date, default: () => new Date() },
    total_sessions: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

export const VisitorProfile = mongoose.models.VisitorProfile || mongoose.model<VisitorProfileDocument>('VisitorProfile', VisitorProfileSchema);
