import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { DestinationType } from './Destination';

export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'skipped';

export const MAX_DELIVERY_ATTEMPTS = 5;

export interface DeliveryDocument {
  _id: string;
  workspace_id: string;
  event_id: string;
  destination_id: string;
  destination_type: DestinationType;
  mapping_id: string | null;
  event_name: string;
  target_event: string;
  status: DeliveryStatus;
  request: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  attempts: number;
  error: string | null;
  next_attempt_at: Date | null;
  // Set once attempts reach MAX_DELIVERY_ATTEMPTS; the job is parked instead of retried.
  dead_letter: boolean;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const DeliverySchema = new Schema<DeliveryDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true },
    event_id: { type: String, required: true },
    destination_id: { type: String, required: true },
    destination_type: { type: String, enum: ['meta_capi', 'google_ads'], required: true },
    mapping_id: { type: String, default: null },
    event_name: { type: String, required: true },
    target_event: { type: String, required: true },
    status: { type: String, enum: ['pending', 'success', 'failed', 'skipped'], default: 'pending' },
    request: { type: Schema.Types.Mixed, default: null },
    response: { type: Schema.Types.Mixed, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    error: { type: String, default: null },
    next_attempt_at: { type: Date, default: null },
    dead_letter: { type: Boolean, default: false },
    sent_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

DeliverySchema.index({ workspace_id: 1, created_at: -1 });
DeliverySchema.index({ workspace_id: 1, destination_id: 1, created_at: -1 });
DeliverySchema.index({ workspace_id: 1, status: 1, created_at: -1 });
DeliverySchema.index({ event_id: 1, destination_id: 1 }, { unique: true });

export const Delivery = mongoose.models.Delivery || mongoose.model<DeliveryDocument>('Delivery', DeliverySchema);
