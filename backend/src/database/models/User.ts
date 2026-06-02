import { query } from '../index';

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
  plan: string;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  trial_ends_at: Date | null;
  events_this_month: number;
  events_limit: number;
  password_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getUserByEmail(email: string) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

export async function getUserById(id: string) {
  const result = await query(
    `SELECT id, name, email, role, company, phone, avatar, email_verified, status, timezone, locale,
            plan, events_this_month, events_limit, last_login_at, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser(user: {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const result = await query(
    `INSERT INTO users (id, name, email, password, role, timezone, locale)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, email, role, created_at`,
    [user.id, user.name, user.email, user.password, user.role, 'UTC', 'en']
  );
  return result.rows[0];
}

export async function updateUser(id: string, updates: Partial<UserRow>) {
  const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at' && k !== 'password');
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map(k => {
    const val = (updates as Record<string, unknown>)[k];
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) return JSON.stringify(val);
    return val;
  });
  const result = await query(
    `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

export async function updateLastLogin(id: string) {
  await query(
    `UPDATE users SET last_login_at = NOW(), events_this_month = (
       SELECT COUNT(*) FROM events e JOIN websites w ON w.id = e.website_id WHERE w.user_id = $1
     ) WHERE id = $1`,
    [id]
  );
}
