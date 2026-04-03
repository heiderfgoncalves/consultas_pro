import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 10);
}

export async function comparePassword(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}

export function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
