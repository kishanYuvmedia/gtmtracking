import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Logged instead of merging when the profiles an event links carry different user_ids.
export interface IdentityConflictDocument {
  _id: string;
  workspace_id: string;
  event_id: string | null;
  profile_ids: string[];
  conflicting_type: string;
  conflicting_values: string[];
  linking_identifiers: { type: string; value: string }[];
  // Same profiles + user_ids → same row; repeats bump occurrences instead of adding rows.
  fingerprint: string;
  occurrences: number;
  last_event_id: string | null;
  last_seen_at: Date;
  resolved: boolean;
  created_at: Date;
}

const IdentityConflictSchema = new Schema<IdentityConflictDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true },
    event_id: { type: String, default: null },
    profile_ids: { type: [String], required: true },
    conflicting_type: { type: String, required: true },
    conflicting_values: { type: [String], default: [] },
    linking_identifiers: { type: [{ type: { type: String }, value: { type: String }, _id: false }], default: [] },
    fingerprint: { type: String, required: true },
    occurrences: { type: Number, default: 1 },
    last_event_id: { type: String, default: null },
    last_seen_at: { type: Date, default: () => new Date() },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

IdentityConflictSchema.index({ workspace_id: 1, created_at: -1 });
IdentityConflictSchema.index({ workspace_id: 1, profile_ids: 1 });
IdentityConflictSchema.index({ workspace_id: 1, fingerprint: 1 }, { unique: true });

export const IdentityConflict = mongoose.models.IdentityConflict
  || mongoose.model<IdentityConflictDocument>('IdentityConflict', IdentityConflictSchema);
