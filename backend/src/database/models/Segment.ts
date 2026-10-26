import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface SegmentDocument {
  _id: string;
  workspace_id: string;
  name: string;
  filter: Record<string, unknown>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const SegmentSchema = new Schema<SegmentDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    filter: { type: Schema.Types.Mixed, required: true },
    created_by: { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

SegmentSchema.index({ workspace_id: 1, name: 1 }, { unique: true });

export const Segment = mongoose.models.Segment || mongoose.model<SegmentDocument>('Segment', SegmentSchema);
