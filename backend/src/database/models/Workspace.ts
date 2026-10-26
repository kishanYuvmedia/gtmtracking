import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Property keys searched (in traits, properties and form fields) for email / phone / user_id.
// Editable per workspace from Settings → Identity fields so custom form names also match.
export const DEFAULT_IDENTITY_SETTINGS = {
  email_keys: ['email', 'user_email', 'billing_email', 'customer_email', 'contact_email', 'email_address'],
  phone_keys: ['phone', 'mobile', 'phone_number', 'mobile_number', 'billing_phone', 'contact_phone', 'whatsapp'],
  user_id_keys: ['user_id', 'userId', 'customer_id', 'customerId', 'external_id'],
  // ISO country used to complete national phone numbers into E.164 (e.g. 9876543210 → +919876543210).
  default_country: 'IN',
};

export interface IdentitySettings {
  email_keys: string[];
  phone_keys: string[];
  user_id_keys: string[];
  default_country: string;
}

export interface WorkspaceDocument {
  _id: string;
  owner_user_id: string;
  name: string;
  timezone: string;
  currency: string;
  identity_settings: IdentitySettings;
  created_at: Date;
  updated_at: Date;
}

const WorkspaceSchema = new Schema<WorkspaceDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    owner_user_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD', uppercase: true, minlength: 3, maxlength: 3 },
    identity_settings: {
      type: new Schema<IdentitySettings>({
        email_keys: { type: [String], default: DEFAULT_IDENTITY_SETTINGS.email_keys },
        phone_keys: { type: [String], default: DEFAULT_IDENTITY_SETTINGS.phone_keys },
        user_id_keys: { type: [String], default: DEFAULT_IDENTITY_SETTINGS.user_id_keys },
        default_country: { type: String, default: DEFAULT_IDENTITY_SETTINGS.default_country, uppercase: true, minlength: 2, maxlength: 2 },
      }, { _id: false }),
      default: () => ({ ...DEFAULT_IDENTITY_SETTINGS }),
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

export const Workspace = mongoose.models.Workspace
  || mongoose.model<WorkspaceDocument>('Workspace', WorkspaceSchema);

export async function ensureWorkspaceForUser(userId: string, name = 'My Workspace', timezone = 'UTC') {
  const workspace = await Workspace.findOneAndUpdate(
    { owner_user_id: userId },
    { $setOnInsert: { _id: uuidv4(), owner_user_id: userId, name: name.trim() || 'My Workspace', timezone, currency: 'USD' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  if (!workspace) throw new Error(`Unable to create workspace for user ${userId}`);
  return workspace;
}
