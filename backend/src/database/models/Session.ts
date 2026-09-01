import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface SessionRow {
  id: string;
  visitor_id: string;
  website_id: string;
  referrer: string | null;
  landing_page: string | null;
  exit_page: string | null;
  page_views: number;
  duration_seconds: number;
  browser_timezone: string | null;
  user_agent: string | null;
  ip_address: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  device_info: Record<string, unknown> | null;
  location_info: Record<string, unknown> | null;
  started_at: Date;
  last_activity: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SessionDocument extends Omit<SessionRow, 'id'> {
  _id: string;
}

const SessionSchema = new Schema<SessionDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    visitor_id: { type: String, required: true, index: true },
    website_id: { type: String, required: true, index: true },
    referrer: { type: String, default: null },
    landing_page: { type: String, default: null },
    exit_page: { type: String, default: null },
    page_views: { type: Number, default: 1 },
    duration_seconds: { type: Number, default: 0 },
    browser_timezone: { type: String, default: null },
    user_agent: { type: String, default: null },
    ip_address: { type: String, default: null },
    utm_source: { type: String, default: null },
    utm_medium: { type: String, default: null },
    utm_campaign: { type: String, default: null },
    utm_term: { type: String, default: null },
    utm_content: { type: String, default: null },
    device_info: { type: Schema.Types.Mixed, default: null },
    location_info: { type: Schema.Types.Mixed, default: null },
    started_at: { type: Date, default: () => new Date() },
    last_activity: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

export const Session = mongoose.models.Session || mongoose.model<SessionDocument>('Session', SessionSchema);
