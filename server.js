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

const SUMMARY_LANGS = {
  zh: {
    empty: '目前還沒有留言可以總結。',
    fallback: '目前無法產生總結。',
    prompt: (list) => `以下是網站留言板上的訪客留言,請用一句繁體中文總結這些留言的整體氣氛或重點。只回傳一句話,不要加引號、前言或其他說明。\n\n${list}`,
  },
  en: {
    empty: 'There are no messages to summarize yet.',
    fallback: 'No summary is available right now.',
    prompt: (list) => `Below are guest messages left on a website's guestbook. Summarize their overall mood or key themes in exactly one sentence, in English. Reply with only that sentence — no quotes, preamble, or explanation.\n\n${list}`,
  },
  ko: {
    empty: '아직 요약할 메시지가 없습니다.',
    fallback: '지금은 요약을 생성할 수 없습니다.',
    prompt: (list) => `다음은 웹사이트 방명록에 남겨진 방문자 메시지입니다. 이 메시지들의 전반적인 분위기나 핵심 내용을 한국어 한 문장으로 요약해 주세요. 인용부호나 서두, 설명 없이 그 한 문장만 답해 주세요.\n\n${list}`,
  },
  ja: {
    empty: 'まだ要約できるメッセージがありません。',
    fallback: '只今要約を生成できません。',
    prompt: (list) => `以下はウェブサイトのゲストブックに残された訪問者からのメッセージです。これらのメッセージ全体の雰囲気や要点を、日本語で一文にまとめてください。引用符や前置き、説明を付けず、その一文だけを返してください。\n\n${list}`,
  },
  vi: {
    empty: 'Hiện chưa có lời nhắn nào để tóm tắt.',
    fallback: 'Hiện chưa thể tạo bản tóm tắt.',
    prompt: (list) => `Dưới đây là các lời nhắn của khách để lại trên sổ lưu bút của một trang web. Hãy tóm tắt không khí chung hoặc nội dung chính của các lời nhắn này trong đúng một câu, bằng tiếng Việt. Chỉ trả lời đúng một câu đó — không thêm dấu ngoặc kép, lời mở đầu hay giải thích.\n\n${list}`,
  },
};

app.post('/api/summary', async (req, res) => {
  const lang = SUMMARY_LANGS[req.body?.lang] ? req.body.lang : 'zh';
  const copy = SUMMARY_LANGS[lang];

  const rows = db
    .prepare('SELECT name, message FROM messages ORDER BY id DESC LIMIT 200')
    .all();

  if (!rows.length) {
    return res.json({ summary: copy.empty });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const list = rows.map((r) => `${r.name}:${r.message}`).join('\n');
  const prompt = copy.prompt(list);

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

    res.json({ summary: summary || copy.fallback });
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
