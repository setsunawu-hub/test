import { json, readJson } from '../../lib/http.js';
import { isRateLimited } from '../../lib/ratelimit.js';

const MODEL = '@cf/zai-org/glm-4.7-flash';
const SUMMARIES_PER_HOUR = 20;
const MAX_MESSAGES = 50;

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

// The model page does not document the output shape, so accept both the legacy
// `response` field and the OpenAI-style `choices` array.
function extractText(result) {
  const text = result?.response ?? result?.choices?.[0]?.message?.content ?? '';
  return String(text).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export async function onRequestPost({ request, env }) {
  const { tooLarge, body } = await readJson(request);
  if (tooLarge) return json({ error: 'payload too large' }, 413);

  const lang = SUMMARY_LANGS[body.lang] ? body.lang : 'zh';
  const copy = SUMMARY_LANGS[lang];

  if (await isRateLimited(env.DB, request, 'summary', SUMMARIES_PER_HOUR, 3600)) {
    return json({ error: 'too many requests' }, 429);
  }

  const { results: rows } = await env.DB.prepare(
    'SELECT name, message FROM messages ORDER BY id DESC LIMIT ?'
  )
    .bind(MAX_MESSAGES)
    .all();

  if (!rows.length) return json({ summary: copy.empty });

  const stats = await env.DB.prepare('SELECT MAX(id) AS last_id, COUNT(*) AS total FROM messages').first();
  const signature = `${stats.last_id}:${stats.total}`;

  const cached = await env.DB.prepare('SELECT summary FROM summaries WHERE lang = ? AND signature = ?')
    .bind(lang, signature)
    .first();
  if (cached) return json({ summary: cached.summary });

  if (!env.AI) {
    console.error('AI binding is not configured');
    return json({ error: 'AI summary request failed' }, 500);
  }

  let summary;
  try {
    const list = rows.map((r) => `${r.name}:${r.message}`).join('\n');
    const result = await env.AI.run(MODEL, {
      messages: [{ role: 'user', content: copy.prompt(list) }],
      max_completion_tokens: 600,
    });
    summary = extractText(result);
  } catch (err) {
    console.error('Workers AI error:', err.message);
    return json({ error: 'AI summary request failed' }, 502);
  }

  if (!summary) return json({ summary: copy.fallback });

  await env.DB.prepare(
    `INSERT INTO summaries (lang, signature, summary) VALUES (?, ?, ?)
     ON CONFLICT(lang) DO UPDATE SET signature = excluded.signature, summary = excluded.summary`
  )
    .bind(lang, signature, summary)
    .run();

  return json({ summary });
}
