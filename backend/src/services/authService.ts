import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createUser, getUserByEmail, getUserById, updateLastLogin, setOtp, verifyOtp, setResetToken, getUserByResetToken, clearResetToken, updatePassword, updateUserProfile, updateUserPassword, setUserWorkspaceId } from '../database/models/User';
import { ensureWorkspaceForUser } from '../database/models/Workspace';
import { ensureWorkspaceMember } from '../database/models/WorkspaceMember';
import { AppError } from '../middleware/errorHandler';
import { sendOtpEmail, sendResetEmail } from './mailService';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const SALT_ROUNDS = 12;

async function ensureUserWorkspace(user: { id: string; name: string; workspace_id?: string | null; timezone?: string }) {
  if (user.workspace_id) {
    await ensureWorkspaceMember(user.workspace_id, user.id, 'admin');
    return user.workspace_id;
  }
  const workspace = await ensureWorkspaceForUser(user.id, user.name, user.timezone || 'UTC');
  await setUserWorkspaceId(user.id, workspace.id);
  await ensureWorkspaceMember(workspace.id, user.id, 'admin');
  return workspace.id;
}

export const authService = {
  async register(name: string, email: string, password: string, business_type?: string | null, category?: string | null) {
    const existing = await getUserByEmail(email);
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'customer',
      business_type,
      category,
    });
    const workspace = await ensureWorkspaceForUser(user.id, name);
    await setUserWorkspaceId(user.id, workspace.id);
    await ensureWorkspaceMember(workspace.id, user.id, 'admin');

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await setOtp(user.id, code, expiresAt);
    try {
      await sendOtpEmail(email, code);
    } catch (e) {
      console.error('Failed to send OTP email', e);
    }

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role, workspace_id: workspace.id }, message: 'OTP sent to email', requiresVerification: true };
  },

  async login(email: string, password: string) {
    const user = await getUserByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.email_verified) {
      throw new AppError(403, 'Email not verified. Please verify OTP.');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    await updateLastLogin(user.id);
    const workspaceId = await ensureUserWorkspace(user);

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role, workspace_id: workspaceId }, token };
  },

  async verifyOtp(email: string, code: string) {
    const user = await verifyOtp(email, code);
    if (!user) {
      throw new AppError(400, 'Invalid or expired OTP');
    }
    const workspaceId = await ensureUserWorkspace(user);
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role, workspace_id: workspaceId }, token };
  },

  async resendOtp(email: string) {
    const user = await getUserByEmail(email);
    if (!user) throw new AppError(404, 'User not found');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await setOtp(user.id, code, expiresAt);
    try { await sendOtpEmail(email, code); } catch (e) { console.error(e); }
    return { message: 'OTP resent' };
  },

  async forgotPassword(email: string) {
    const user = await getUserByEmail(email);
    if (!user) {
      // do not reveal
      return { message: 'If the email exists, a reset link has been sent' };
    }
    const token = (await import('uuid')).v4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await setResetToken(user.id, token, expiresAt);
    const link = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    try { await sendResetEmail(email, link); } catch (e) { console.error(e); }
    return { message: 'If the email exists, a reset link has been sent' };
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await getUserByResetToken(token);
    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token');
    }
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await updatePassword(user.id, hashed);
    await clearResetToken(user.id);
    return { message: 'Password reset successful' };
  },

  async updateProfile(userId: string, data: { name?: string; business_type?: string | null; category?: string | null }) {
    const user = await updateUserProfile(userId, data);
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await getUserByEmail((await getUserById(userId))?.email || '');
    if (!user) throw new AppError(404, 'User not found');
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new AppError(400, 'Current password is incorrect');
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await updateUserPassword(userId, hashed);
    return { message: 'Password updated' };
  },

  async getProfile(userId: string) {
    const user = await getUserById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    return user;
  },
};
