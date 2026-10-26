import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Trait change history for User 360. Written only when a trait value actually changes.
export interface ProfileTraitChangeDocument {
  _id: string;
  workspace_id: string;
  profile_id: string;
  key: string;
  old_value: unknown;
  new_value: unknown;
  event_id: string | null;
  // 'event' | 'merge' | 'backfill'
  source: string;
  changed_at: Date;
}

const ProfileTraitChangeSchema = new Schema<ProfileTraitChangeDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true },
    profile_id: { type: String, required: true },
    key: { type: String, required: true },
    old_value: { type: Schema.Types.Mixed, default: null },
    new_value: { type: Schema.Types.Mixed, default: null },
    event_id: { type: String, default: null },
    source: { type: String, default: 'event' },
    changed_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

ProfileTraitChangeSchema.index({ workspace_id: 1, profile_id: 1, changed_at: -1 });

export const ProfileTraitChange = mongoose.models.ProfileTraitChange
  || mongoose.model<ProfileTraitChangeDocument>('ProfileTraitChange', ProfileTraitChangeSchema);
