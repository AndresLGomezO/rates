import crypto from 'node:crypto';

export function createCacheKey(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}
