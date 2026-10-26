import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface DestinationMappingDocument {
  _id: string;
  workspace_id: string;
  destination_id: string;
  source_event: string;
  target_event: string;
  filter: Record<string, unknown>;
  value_field: string | null;
  currency_field: string | null;
  custom_param_map: Record<string, string>;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

const DestinationMappingSchema = new Schema<DestinationMappingDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true, index: true },
    destination_id: { type: String, required: true, index: true },
    source_event: { type: String, required: true, trim: true },
    target_event: { type: String, required: true, trim: true },
    filter: { type: Schema.Types.Mixed, default: {} },
    value_field: { type: String, default: null },
    currency_field: { type: String, default: null },
    custom_param_map: { type: Map, of: String, default: {} },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

DestinationMappingSchema.index({ destination_id: 1, source_event: 1 });

export const DestinationMapping = mongoose.models.DestinationMapping
  || mongoose.model<DestinationMappingDocument>('DestinationMapping', DestinationMappingSchema);
