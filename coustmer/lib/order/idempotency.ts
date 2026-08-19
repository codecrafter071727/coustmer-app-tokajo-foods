/** Place-order Idempotency-Key: 8–64 chars (order-service contract). */
export function createIdempotencyKey(prefix = 'place'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12);
  const key = `${prefix}_${time}_${rand}`;
  return key.length > 64 ? key.slice(0, 64) : key;
}
