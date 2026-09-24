const path = require('path');
const fs = require('fs');
const express = require('express');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'guestbook.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const MAX_NAME = 40;
const MAX_MESSAGE = 280;

const app = express();
app.use(express.json({ limit: '10kb' }));

app.get('/api/messages', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, message, created_at FROM messages ORDER BY id DESC LIMIT 200')
    .all();
  res.json(rows);
});

app.post('/api/messages', (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, MAX_NAME);
  const message = String(req.body?.message ?? '').trim().slice(0, MAX_MESSAGE);

  if (!name || !message) {
    return res.status(400).json({ error: 'name and message are required' });
  }

  const info = db
    .prepare('INSERT INTO messages (name, message) VALUES (?, ?)')
    .run(name, message);
  const row = db
    .prepare('SELECT id, name, message, created_at FROM messages WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json(row);
});

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

app.post('/api/summary', async (req, res) => {
  const rows = db
    .prepare('SELECT name, message FROM messages ORDER BY id DESC LIMIT 200')
    .all();

  if (!rows.length) {
    return res.json({ summary: '目前還沒有留言可以總結。' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const list = rows.map((r) => `${r.name}:${r.message}`).join('\n');
  const prompt = `以下是網站留言板上的訪客留言,請用一句繁體中文總結這些留言的整體氣氛或重點。只回傳一句話,不要加引號、前言或其他說明。\n\n${list}`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('Anthropic API error:', apiRes.status, errText);
      return res.status(502).json({ error: 'AI summary request failed' });
    }

    const data = await apiRes.json();
    const summary = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    res.json({ summary: summary || '目前無法產生總結。' });
  } catch (err) {
    console.error('Anthropic API request error:', err);
    res.status(502).json({ error: 'AI summary request failed' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
