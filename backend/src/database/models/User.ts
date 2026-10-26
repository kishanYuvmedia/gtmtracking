import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface UserRow {
  id: string;
  workspace_id: string | null;
  name: string;
  email: string;
  password: string;
  role: string;
  company: string | null;
  business_type: string | null;
  category: string | null;
  phone: string | null;
  avatar: string | null;
  email_verified: boolean;
  email_verified_at: Date | null;
  otp_code: string | null;
  otp_expires_at: Date | null;
  reset_token: string | null;
  reset_token_expires: Date | null;
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
    workspace_id: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, default: 'customer' },
    company: { type: String, default: null },
    business_type: { type: String, default: null },
    category: { type: String, default: null },
    phone: { type: String, default: null },
    avatar: { type: String, default: null },
    email_verified: { type: Boolean, default: false },
    email_verified_at: { type: Date, default: null },
    otp_code: { type: String, default: null },
    otp_expires_at: { type: Date, default: null },
    reset_token: { type: String, default: null },
    reset_token_expires: { type: Date, default: null },
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
  business_type?: string | null;
  category?: string | null;
}) {
  const doc = await User.create({
    _id: user.id || uuidv4(),
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    business_type: user.business_type || null,
    category: user.category || null,
    timezone: 'UTC',
    locale: 'en',
  });
  const obj = doc.toObject();
  return { id: obj._id as string, name: obj.name, email: obj.email, role: obj.role, created_at: obj.created_at };
}

export async function updateLastLogin(id: string) {
  await User.updateOne({ _id: id }, { $set: { last_login_at: new Date() } });
}

export async function setUserWorkspaceId(userId: string, workspaceId: string) {
  await User.updateOne({ _id: userId }, { $set: { workspace_id: workspaceId } });
}

export async function setOtp(userId: string, code: string, expiresAt: Date) {
  await User.updateOne({ _id: userId }, { $set: { otp_code: code, otp_expires_at: expiresAt } });
}

export async function getOtpUser(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  return user ? mapUser(user) : null;
}

export async function verifyOtp(email: string, code: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) return null;
  if (user.otp_code !== code) return null;
  if (!user.otp_expires_at || user.otp_expires_at < new Date()) return null;
  await User.updateOne({ _id: user._id }, { $set: { email_verified: true, email_verified_at: new Date(), otp_code: null, otp_expires_at: null } });
  return mapUser(await User.findById(user._id).select('-password'));
}


export async function setResetToken(userId: string, token: string, expiresAt: Date) {
  await User.updateOne({ _id: userId }, { $set: { reset_token: token, reset_token_expires: expiresAt } });
}

export async function getUserByResetToken(token: string) {
  const user = await User.findOne({ reset_token: token });
  return user ? mapUser(user) : null;
}

export async function clearResetToken(userId: string) {
  await User.updateOne({ _id: userId }, { $set: { reset_token: null, reset_token_expires: null } });
}

export async function updatePassword(userId: string, hashedPassword: string) {
  await User.updateOne({ _id: userId }, { $set: { password: hashedPassword, password_changed_at: new Date() } });
}


export async function updateUserProfile(userId: string, data: { name?: string; business_type?: string | null; category?: string | null; company?: string | null }) {
  await User.updateOne({ _id: userId }, { $set: data });
  return getUserById(userId);
}

export async function updateUserPassword(userId: string, hashedPassword: string) {
  await User.updateOne({ _id: userId }, { $set: { password: hashedPassword, password_changed_at: new Date() } });
}
