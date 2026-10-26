import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type WorkspaceRole = 'admin' | 'viewer';

export interface WorkspaceMemberDocument {
  _id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: Date;
  updated_at: Date;
}

const WorkspaceMemberSchema = new Schema<WorkspaceMemberDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true },
    user_id: { type: String, required: true, index: true },
    role: { type: String, enum: ['admin', 'viewer'], required: true, default: 'viewer' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

WorkspaceMemberSchema.index({ workspace_id: 1, user_id: 1 }, { unique: true });

export const WorkspaceMember = mongoose.models.WorkspaceMember
  || mongoose.model<WorkspaceMemberDocument>('WorkspaceMember', WorkspaceMemberSchema);

export async function ensureWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole) {
  await WorkspaceMember.updateOne(
    { workspace_id: workspaceId, user_id: userId },
    { $setOnInsert: { _id: uuidv4(), workspace_id: workspaceId, user_id: userId, role } },
    { upsert: true }
  );
}
