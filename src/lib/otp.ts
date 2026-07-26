import { createHash, randomInt } from 'node:crypto';
import { query, queryOne } from './db';

const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

function hash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// Tạo OTP 6 số cho grant, lưu hash, trả code THÔ để gửi email.
export async function createOtp(grantId: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await query(
    `INSERT INTO deck_otp (grant_id, code_hash, expires_at)
     VALUES ($1,$2, now() + ($3 || ' minutes')::interval)`,
    [grantId, hash(code), String(OTP_TTL_MIN)],
  );
  return code;
}

// Xác thực OTP mới nhất còn hạn của grant. Trả true nếu khớp.
export async function verifyOtp(grantId: string, code: string): Promise<boolean> {
  const row = await queryOne<{ id: string; code_hash: string; attempts: number }>(
    `SELECT id, code_hash, attempts FROM deck_otp
     WHERE grant_id=$1 AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [grantId],
  );
  if (!row) return false;
  if (row.attempts >= MAX_ATTEMPTS) return false;
  const ok = row.code_hash === hash(code);
  await query('UPDATE deck_otp SET attempts = attempts + 1 WHERE id=$1', [row.id]);
  return ok;
}
