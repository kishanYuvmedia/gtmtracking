import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { normalizeHost } from '../../utils/domain';

export type SourceType = 'web' | 'server';

export interface SourceDocument {
  _id: string;
  workspace_id: string;
  website_id: string | null;
  name: string;
  type: SourceType;
  write_key: string;
  secret_key_hash: string | null;
  allowed_domains: string[];
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

const SourceSchema = new Schema<SourceDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, required: true, index: true },
    website_id: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ['web', 'server'], required: true },
    write_key: { type: String, required: true, unique: true, index: true },
    secret_key_hash: { type: String, default: null, select: false },
    allowed_domains: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

SourceSchema.index({ workspace_id: 1, website_id: 1 }, { unique: true, partialFilterExpression: { website_id: { $type: 'string' } } });

export const Source = mongoose.models.Source || mongoose.model<SourceDocument>('Source', SourceSchema);

export async function ensureWebsiteSource(
  workspaceId: string,
  website: { id: string; name: string | null; domain: string; api_key: string }
) {
  const source = await Source.findOneAndUpdate(
    { website_id: website.id },
    {
      $set: {
        workspace_id: workspaceId,
        name: website.name || website.domain,
        type: 'web',
        write_key: website.api_key,
        allowed_domains: [normalizeHost(website.domain)],
        enabled: true,
      },
      $setOnInsert: { _id: uuidv4(), website_id: website.id },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  if (!source) throw new Error(`Unable to create source for website ${website.id}`);
  return source;
}

export async function createServerSource(workspaceId: string, name: string) {
  const writeKey = `src_${crypto.randomBytes(24).toString('hex')}`;
  const secretKey = crypto.randomBytes(32).toString('base64url');
  const source = await Source.create({
    _id: uuidv4(),
    workspace_id: workspaceId,
    website_id: null,
    name: name.trim(),
    type: 'server',
    write_key: writeKey,
    secret_key_hash: crypto.createHash('sha256').update(secretKey).digest('hex'),
    allowed_domains: [],
    enabled: true,
  });
  return {
    source: {
      id: source._id,
      workspace_id: source.workspace_id,
      name: source.name,
      type: source.type,
      write_key: source.write_key,
      enabled: source.enabled,
    },
    secret_key: secretKey,
  };
}
