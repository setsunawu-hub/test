async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const KEEP_SECONDS = 24 * 60 * 60;

// D1-backed per-IP limiter; in-memory counters do not survive across Worker isolates.
export async function isRateLimited(db, request, bucket, limit, windowSeconds) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(ip);
  const now = Math.floor(Date.now() / 1000);

  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM rate_limits WHERE bucket = ? AND ip_hash = ? AND ts > ?')
    .bind(bucket, ipHash, now - windowSeconds)
    .first();
  if (row.n >= limit) return true;

  await db.batch([
    db.prepare('DELETE FROM rate_limits WHERE ts <= ?').bind(now - KEEP_SECONDS),
    db.prepare('INSERT INTO rate_limits (bucket, ip_hash, ts) VALUES (?, ?, ?)').bind(bucket, ipHash, now),
  ]);
  return false;
}
