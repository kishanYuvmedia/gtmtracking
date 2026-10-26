import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { IdentityType } from './Identity';

// One row per merged-away profile. Doubles as the redirect table: merged_id → survivor_id.
// When a survivor is later merged itself, existing rows are repointed so lookups stay one hop.
export interface ProfileMergeDocument {
  _id: string;
  workspace_id: string;
  survivor_id: string;
  merged_id: string;
  reason: string;
  identifier: { type: IdentityType; value: string } | null;
  event_id: string | null;
  merged_at: Date;
}

const ProfileMergeSchema = new Schema<ProfileMergeDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true },
    survivor_id: { type: String, required: true },
    merged_id: { type: String, required: true },
    reason: { type: String, required: true },
    identifier: {
      type: new Schema({ type: { type: String, required: true }, value: { type: String, required: true } }, { _id: false }),
      default: null,
    },
    event_id: { type: String, default: null },
    merged_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

ProfileMergeSchema.index({ workspace_id: 1, merged_id: 1 }, { unique: true });
ProfileMergeSchema.index({ workspace_id: 1, survivor_id: 1, merged_at: -1 });

export const ProfileMerge = mongoose.models.ProfileMerge
  || mongoose.model<ProfileMergeDocument>('ProfileMerge', ProfileMergeSchema);

/** Follows the merge redirect for a profile id that may have been merged away. */
export async function resolveProfileRedirect(workspaceId: string, profileId: string): Promise<string> {
  const redirect = await ProfileMerge.findOne({ workspace_id: workspaceId, merged_id: profileId })
    .select('survivor_id').lean<{ survivor_id: string }>();
  return redirect?.survivor_id || profileId;
}
