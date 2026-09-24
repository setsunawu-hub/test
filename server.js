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

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
