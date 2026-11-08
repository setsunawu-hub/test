import { json, readJson } from '../../lib/http.js';
import { isRateLimited } from '../../lib/ratelimit.js';

const MAX_NAME = 40;
const MAX_MESSAGE = 280;
const POSTS_PER_HOUR = 10;

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, message, created_at FROM messages ORDER BY id DESC LIMIT 200'
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const { tooLarge, body } = await readJson(request);
  if (tooLarge) return json({ error: 'payload too large' }, 413);

  if (await isRateLimited(env.DB, request, 'messages', POSTS_PER_HOUR, 3600)) {
    return json({ error: 'too many requests' }, 429);
  }

  const name = String(body.name ?? '').trim().slice(0, MAX_NAME);
  const message = String(body.message ?? '').trim().slice(0, MAX_MESSAGE);
  if (!name || !message) return json({ error: 'name and message are required' }, 400);

  const result = await env.DB.prepare('INSERT INTO messages (name, message) VALUES (?, ?)').bind(name, message).run();
  const row = await env.DB.prepare('SELECT id, name, message, created_at FROM messages WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return json(row, 201);
}
