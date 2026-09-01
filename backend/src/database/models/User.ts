import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  company: string | null;
  phone: string | null;
  avatar: string | null;
  email_verified: boolean;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  status: string;
  timezone: string;
  locale: string;
  notification_settings: Record<string, unknown>;
  password_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_active_at: Date | null;
}

export interface UserDocument extends Omit<UserRow, 'id'> {
  _id: string;
}

const UserSchema = new Schema<UserDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, default: 'customer' },
    company: { type: String, default: null },
    phone: { type: String, default: null },
    avatar: { type: String, default: null },
    email_verified: { type: Boolean, default: false },
    email_verified_at: { type: Date, default: null },
    last_login_at: { type: Date, default: null },
    status: { type: String, default: 'active' },
    timezone: { type: String, default: 'UTC' },
    locale: { type: String, default: 'en' },
    notification_settings: { type: Schema.Types.Mixed, default: {} },
    password_changed_at: { type: Date, default: null },
    last_active_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

export const User = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

function mapUser(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id as string };
}

export async function getUserByEmail(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  return user ? mapUser(user) : null;
}

export async function getUserById(id: string) {
  const user = await User.findById(id).select('-password');
  return user ? mapUser(user) : null;
}

export async function createUser(user: {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const doc = await User.create({
    _id: user.id || uuidv4(),
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    timezone: 'UTC',
    locale: 'en',
  });
  const obj = doc.toObject();
  return { id: obj._id as string, name: obj.name, email: obj.email, role: obj.role, created_at: obj.created_at };
}

export async function updateLastLogin(id: string) {
  await User.updateOne({ _id: id }, { $set: { last_login_at: new Date() } });
}
