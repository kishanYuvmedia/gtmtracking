import { createHash } from 'crypto';

export function sha256(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export function hashUserData(data: Record<string, string>): Record<string, string> {
  const hashed: Record<string, string> = {};
  const fieldsToHash = ['email', 'phone', 'first_name', 'last_name', 'city', 'state', 'zip', 'country'];

  for (const [key, value] of Object.entries(data)) {
    if (fieldsToHash.includes(key) && value) {
      hashed[key] = sha256(value);
    } else {
      hashed[key] = value;
    }
  }

  return hashed;
}
