'use strict';
const app = document.getElementById('app');
const timerEl = document.getElementById('timer');
const SECTION_NAME = { reading: '閱讀 Reading', listening: '聽力 Listening', writing: '寫作 Writing' };
const COLORS = { reading: '#2457e6', listening: '#e0701a', writing: '#128a52' };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
const getHistory = () => store.get('ielts.history', []);
const fmtDate = t => new Date(t).toLocaleString('zh-TW', { hour12: false });
const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const roundHalf = x => Math.round(x * 2) / 2;
const findTest = (section, id) => TESTS[section].find(t => t.id === id);

/* ---------- 帳號與雲端同步 ---------- */
const getAuth = () => store.get('ielts.auth', null);
async function api(path, opts = {}) {
  const a = getAuth();
  const res = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', ...(a ? { authorization: 'Bearer ' + a.token } : {}) } });
  if (res.status === 401 && a) store.set('ielts.auth', null);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.status);
  return data;
}
// 雙向合併：本機與伺服器的紀錄取聯集（依 id），失敗時靜默保留本機資料
async function syncNow() {
  if (!getAuth()) return false;
  try {
    const d = await api('/api/ielts/sync', { method: 'POST', body: JSON.stringify({ history: getHistory(), mastered: store.get('ielts.mastered', []) }) });
    store.set('ielts.history', d.history);
    store.set('ielts.mastered', d.mastered);
    store.set('ielts.lastSync', Date.now());
    return true;
  } catch { return false; }
}
const syncDelete = q => getAuth() && api('/api/ielts/records' + q, { method: 'DELETE' }).catch(() => { });
function accountCard() {
  const a = getAuth(), last = store.get('ielts.lastSync', 0);
  if (a) return `<div class="card row"><span>☁️ 已登入 <b>${esc(a.name)}</b>${last ? ` · 上次同步 ${fmtDate(last)}` : ''}</span><span class="spacer"></span><button class="btn sm ghost" data-act="syncBtn">立即同步</button><button class="btn sm ghost" data-act="logout">登出</button></div>`;
  return `<div class="card"><b>☁️ 雲端同步（選用）</b> <span class="muted">登入後成績會自動備份，換裝置也能看到。</span>
    <form id="authForm" class="row" style="margin-top:8px"><input type="text" name="name" placeholder="暱稱" maxlength="30" required autocomplete="username"><input type="password" name="passcode" placeholder="密碼（至少 6 碼）" minlength="6" required autocomplete="current-password" style="width:180px;font:inherit;background:var(--bg);color:inherit;border:1px solid var(--line);border-radius:6px;padding:5px 9px">
    <button class="btn sm" type="submit" value="login">登入</button><button class="btn sm ghost" type="submit" value="register">註冊新帳號</button><span class="muted" id="authMsg"></span></form></div>`;
}
app.addEventListener('submit', async e => {
  if (e.target.id !== 'authForm') return;
  e.preventDefault();
  const f = e.target, msg = document.getElementById('authMsg');
  msg.textContent = '處理中…';
  try {
    const d = await api('/api/ielts/auth', { method: 'POST', body: JSON.stringify({ name: f.name.value, passcode: f.passcode.value, mode: e.submitter?.value || 'login' }) });
    store.set('ielts.auth', { token: d.token, name: d.name });
    await syncNow();
    route();
  } catch (err) { msg.textContent = '失敗：' + err.message; }
});

/* ---------- 評分 ---------- */
const BAND_TABLE = {
  reading: [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5]],
  listening: [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5]],
};
// 題數少於 40 題時，按比例換算成 40 題再查表（僅為估算）
function toBand(section, raw, total) {
  const scaled = Math.round(raw / total * 40);
  const hit = BAND_TABLE[section].find(([min]) => scaled >= min);
  return hit ? hit[1] : (scaled >= 1 ? 2 : 1);
}
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isRight = (q, v) => { const n = norm(v); return !!n && q.answer.some(a => norm(a) === n); };
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// 錯誤歸因：告訴考生「為什麼錯」，而不只是答案是什麼
function diagnose(q, v) {
  const val = String(v ?? '').trim();
  if (!val) return '未作答（IELTS 答錯不倒扣，務必全部作答）';
  if (q.type === 'gap') {
    if (val.split(/\s+/).length > q.limit) return `超出字數限制（最多 ${q.limit} 個字）`;
    if (q.answer.some(a => lev(norm(val), norm(a)) <= 2)) return '拼寫錯誤 — 意思對但拼法不對，考試會被判錯';
    return '答案與原文/錄音內容不符 — 定位到錯誤的位置';
  }
  if (q.type === 'tfng') {
    const a = q.answer[0];
    if ((a === 'not given' && val === 'false') || (a === 'false' && val === 'not given')) return '混淆 False 與 Not Given（矛盾 vs. 沒提到）';
    if (a === 'not given') return '把「原文沒提」誤判為有資訊 — 憑常識作答';
    return '判斷方向相反 — 重新檢查肯定/否定與程度詞';
  }
  if (q.type === 'mcq') return q.skill === 'distractor' ? '被說話者先前的說法（干擾資訊）誤導，沒聽到最終決定' : '選到干擾選項 — 先找原文證據再比對選項';
  return '段落定位錯誤 — 先用關鍵詞定位再核對同義改寫';
}

/* ---------- 計時與流程 ---------- */
let run = null, tick = null;
const saveDraft = () => { if (run) { const { test, ...rest } = run; store.set('ielts.draft', rest); } };
const getDraft = () => store.get('ielts.draft', null);
function stopTimer() { clearInterval(tick); tick = null; timerEl.hidden = true; }
function startTimer() {
  stopTimer();
  timerEl.hidden = false;
  const update = () => {
    const left = Math.max(0, Math.round((run.endAt - Date.now()) / 1000));
    timerEl.textContent = '⏱ ' + fmtTime(left);
    timerEl.className = 'timer' + (left <= 60 ? ' crit' : left <= 300 ? ' low' : '');
    if (left <= 0) { stopTimer(); alert('時間到！系統將自動交卷。'); finish(true); }
  };
  update();
  tick = setInterval(update, 500);
}
window.addEventListener('beforeunload', e => { if (run) { e.preventDefault(); e.returnValue = ''; } });

function startRun(section, id) {
  const test = findTest(section, id);
  if (!test) return (location.hash = '#/');
  const d = getDraft();
  if (d && d.section === section && d.testId === id) run = { ...d, test };
  else {
    const now = Date.now();
    run = { section, testId: id, test, answers: {}, startedAt: now, endAt: now + test.minutes * 60000 };
    saveDraft();
  }
  renderRun();
  startTimer();
}

/* ---------- 作答畫面 ---------- */
const INSTR = {
  tfng: 'Do the following statements agree with the information given in the passage? Choose TRUE, FALSE or NOT GIVEN.',
  mcq: 'Choose the correct letter.',
  match: 'Which paragraph contains the following information? Choose the correct letter, A–E.',
};
function instr(q, section) {
  if (q.type === 'gap') return section === 'reading' ? 'Complete the sentences. Write NO MORE THAN TWO WORDS (or a number) from the passage.' : 'Complete the notes. Write ONE WORD AND/OR A NUMBER for each answer.';
  return INSTR[q.type];
}
function renderQ(q, i, val) {
  let body;
  const d = `data-q="${q.id}"`;
  if (q.type === 'tfng') body = ['True', 'False', 'Not Given'].map(o => `<label><input type="radio" name="${q.id}" ${d} value="${o.toLowerCase()}" ${val === o.toLowerCase() ? 'checked' : ''}> ${o.toUpperCase()}</label>`).join('');
  else if (q.type === 'mcq') body = q.options.map((o, k) => { const l = String.fromCharCode(97 + k); return `<label><input type="radio" name="${q.id}" ${d} value="${l}" ${val === l ? 'checked' : ''}> <b>${l.toUpperCase()}</b> ${esc(o)}</label>`; }).join('');
  else if (q.type === 'match') body = `<select ${d}><option value="">—</option>${q.options.map(o => `<option value="${o.toLowerCase()}" ${val === o.toLowerCase() ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  else {
    const [a, b = ''] = q.text.split('______');
    return `<div class="q"><span class="n">${i + 1}</span>${esc(a)}<input type="text" ${d} value="${esc(val || '')}" autocomplete="off" spellcheck="false" aria-label="Answer ${i + 1}">${esc(b)}</div>`;
  }
  return `<div class="q"><span class="n">${i + 1}</span>${esc(q.text)}<div>${body}</div></div>`;
}
function renderQuestions() {
  let last = '';
  return run.test.questions.map((q, i) => {
    const head = q.type !== last ? `<p class="muted" style="margin:14px 0 0"><b>${esc(instr(q, run.section))}</b></p>` : '';
    last = q.type;
    return head + renderQ(q, i, run.answers[q.id]);
  }).join('');
}
function renderRun() {
  const { section, test } = run;
  let html = `<div class="row"><h1>${esc(test.title)}</h1><span class="spacer"></span><button class="btn" id="submit">交卷</button></div>`;
  if (section === 'reading') {
    html += `<div class="split"><div class="card pane passage">${test.passage.map(([l, t]) => `<p><b class="pl">${l}</b>${esc(t)}</p>`).join('')}</div><div class="card pane">${renderQuestions()}</div></div>`;
  } else if (section === 'listening') {
    const supported = 'speechSynthesis' in window;
    html += `<div class="card"><p>${esc(test.intro)}</p>
      <div class="player" id="player"><button class="btn" id="play" ${supported ? '' : 'disabled'}>▶ 開始播放（只播一次）</button><span class="dot"></span><span class="muted" id="pstat">${supported ? '使用瀏覽器語音合成朗讀對話；建議使用 Chrome / Edge / Safari 並戴上耳機。' : '此瀏覽器不支援語音合成，請改用其他瀏覽器。'}</span></div></div>
      <div class="card">${renderQuestions()}</div>`;
  } else {
    const t1 = test.task1, t2 = test.task2;
    html += `<div class="tabs"><button data-tab="1" class="on">Task 1</button><button data-tab="2">Task 2</button></div>
    <div id="wtask1" class="card"><p class="muted">建議用時 ${t1.suggest} 分鐘 · 至少 ${t1.minWords} 字</p><p><b>${esc(t1.prompt)}</b></p>
      <table class="t"><tr>${t1.table.head.map(h => `<th>${h}</th>`).join('')}</tr>${t1.table.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
      <p><textarea data-w="t1" placeholder="Write your answer here…">${esc(run.answers.t1 || '')}</textarea></p><div class="wc" id="wc1"></div></div>
    <div id="wtask2" class="card" hidden><p class="muted">建議用時 ${t2.suggest} 分鐘 · 至少 ${t2.minWords} 字</p><p><b>${esc(t2.prompt)}</b></p>
      <p><textarea data-w="t2" placeholder="Write your essay here…">${esc(run.answers.t2 || '')}</textarea></p><div class="wc" id="wc2"></div></div>`;
  }
  app.innerHTML = html;
  if (section === 'writing') { updateWc(1); updateWc(2); }
}
const wordCount = t => (String(t).match(/[A-Za-z0-9'’-]+/g) || []).length;
function updateWc(n) {
  const min = run.test['task' + n].minWords, c = wordCount(run.answers['t' + n] || '');
  const el = document.getElementById('wc' + n);
  el.textContent = `${c} 字（建議至少 ${min} 字）`;
  el.className = 'wc' + (c < min ? ' bad' : '');
}

app.addEventListener('input', e => {
  if (!run) return;
  const t = e.target;
  if (t.dataset.q) { run.answers[t.dataset.q] = t.value; saveDraft(); }
  else if (t.dataset.w) { run.answers[t.dataset.w] = t.value; saveDraft(); updateWc(t.dataset.w === 't1' ? 1 : 2); }
});
app.addEventListener('click', e => {
  const t = e.target;
  if (t.id === 'submit') {
    const un = run.section === 'writing' ? 0 : run.test.questions.filter(q => !String(run.answers[q.id] || '').trim()).length;
    if (confirm(un ? `還有 ${un} 題未作答，確定交卷？` : '確定交卷？')) finish(false);
  } else if (t.dataset.tab) {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b === t));
    document.getElementById('wtask1').hidden = t.dataset.tab !== '1';
    document.getElementById('wtask2').hidden = t.dataset.tab !== '2';
  } else if (t.id === 'play') playScript();
  else if (t.dataset.act) actions[t.dataset.act]?.(t);
});

/* ---------- 聽力播放（瀏覽器 TTS） ---------- */
let playing = false;
function playScript() {
  if (playing || run.played) return;
  playing = run.played = true;
  const btn = document.getElementById('play'), player = document.getElementById('player'), stat = document.getElementById('pstat');
  btn.disabled = true;
  player.classList.add('playing');
  stat.textContent = '播放中… 請專心聆聽，不能重播。';
  const voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  const pick = re => voices.find(v => re.test(v.name));
  const vf = pick(/female|samantha|zira|susan|karen|hazel|google uk english female/i) || voices[0];
  const vm = pick(/(?<!fe)male|daniel|david|alex|mark|google uk english male/i) || voices[1] || voices[0];
  const lines = run.test.script;
  let i = 0;
  const next = () => {
    if (!playing || i >= lines.length) { playing = false; player.classList.remove('playing'); stat.textContent = '播放結束。請檢查答案後交卷。'; return; }
    const [who, text] = lines[i++];
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB'; u.rate = 0.92;
    const female = who === 'Anna';
    u.voice = female ? vf : vm; u.pitch = female ? 1.15 : 0.85;
    u.onend = () => setTimeout(next, 350);
    u.onerror = () => setTimeout(next, 0);
    speechSynthesis.speak(u);
  };
  next();
}
function stopAudio() { playing = false; try { speechSynthesis.cancel(); } catch { } }

/* ---------- 交卷與批改 ---------- */
async function finish(auto) {
  stopTimer(); stopAudio();
  const r = run, used = Math.min(r.test.minutes * 60, Math.round((Date.now() - r.startedAt) / 1000));
  const rec = { id: 'a' + Date.now(), date: Date.now(), section: r.section, testId: r.testId, title: r.test.title, limitSec: r.test.minutes * 60, usedSec: used, auto: !!auto };
  if (r.section === 'writing') {
    app.innerHTML = '<div class="card"><h1>批改中…</h1><p class="muted">AI 考官正在逐項評分並標出可修正之處，約需 20–40 秒。若無法連線，將改用本機規則估算。</p></div>';
    run = null;
    rec.tasks = {};
    for (const n of [1, 2]) {
      const text = (r.answers['t' + n] || '').trim(), task = r.test['task' + n];
      rec.tasks[n] = { text, words: wordCount(text), minWords: task.minWords, prompt: task.prompt, eval: wordCount(text) < 20 ? emptyEval() : await gradeWriting(n, task, text) };
    }
    const e1 = rec.tasks[1].eval.overall, e2 = rec.tasks[2].eval.overall;
    rec.band = roundHalf((e1 + 2 * e2) / 3);
  } else {
    rec.results = r.test.questions.map(q => {
      const user = r.answers[q.id] ?? '', ok = isRight(q, user);
      return { id: q.id, skill: q.skill, user, ok, diag: ok ? '' : diagnose(q, user) };
    });
    rec.raw = rec.results.filter(x => x.ok).length;
    rec.total = rec.results.length;
    rec.band = toBand(r.section, rec.raw, rec.total);
    run = null;
  }
  const h = getHistory(); h.push(rec);
  if (!store.set('ielts.history', h)) alert('無法寫入瀏覽器儲存空間，成績可能不會保留。請使用「匯出備份」。');
  store.set('ielts.draft', null);
  location.hash = '#/result/' + rec.id;
  syncNow();
}
const emptyEval = () => ({ method: 'none', criteria: { ta: 1, cc: 1, lr: 1, gra: 1 }, overall: 1, strengths: [], improvements: ['幾乎沒有作答（少於 20 字），無法評分。'], corrections: [] });

async function gradeWriting(n, task, essay) {
  try {
    const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 90000);
    const res = await fetch('/api/ielts/writing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: n, prompt: task.prompt, essay }), signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) throw new Error(res.status);
    const { result } = await res.json();
    if (!result?.criteria) throw new Error('bad');
    return { ...result, method: 'ai' };
  } catch { return localWriting(n, task, essay); }
}
const STOP = new Set('the a an and or but of to in on at for with is are was were be been it this that these those as by from not have has had will would can could should may might their there they them he she his her we our you your i my me so if than then also very more most such which who whom what when where while'.split(' '));
const CONNECTORS = ['however', 'moreover', 'furthermore', 'in addition', 'therefore', 'consequently', 'for example', 'for instance', 'on the other hand', 'in contrast', 'whereas', 'although', 'while', 'overall', 'in conclusion', 'to sum up', 'as a result', 'despite', 'nevertheless', 'firstly', 'secondly', 'finally'];
function localWriting(n, task, essay) {
  const words = (essay.match(/[A-Za-z'’-]+/g) || []).map(w => w.toLowerCase());
  const cnt = words.length, lower = essay.toLowerCase();
  const sents = essay.split(/[.!?]+\s/).filter(s => s.trim()).length || 1;
  const paras = essay.split(/\n\s*\n/).filter(s => s.trim()).length;
  const uniq = new Set(words).size / Math.max(1, cnt);
  const longR = words.filter(w => w.length >= 7).length / Math.max(1, cnt);
  const conn = CONNECTORS.filter(c => lower.includes(c)).length;
  const complex = (lower.match(/\b(which|although|while|whereas|because|if|unless|since|who|whereby|despite)\b/g) || []).length;
  const avgLen = cnt / sents;
  const opinion = n === 2 ? /(in my opinion|i believe|i think|i would argue|from my perspective|i agree|i disagree)/.test(lower) : /(overall|in summary|to summarise|to summarize)/.test(lower);
  const clamp = x => Math.max(3, Math.min(7, roundHalf(x)));
  const ta = clamp(4 + 2 * Math.min(1, cnt / task.minWords) + (opinion ? .5 : 0) + (paras >= (n === 2 ? 4 : 3) ? .5 : 0));
  const cc = clamp(4.5 + Math.min(1.5, conn / 6) + (paras >= 3 ? .75 : 0));
  const lr = clamp(4.5 + Math.max(0, Math.min(1.5, (uniq - .35) * 6)) + Math.max(0, Math.min(1, (longR - .08) * 8)));
  const gra = clamp(4.5 + (avgLen >= 12 && avgLen <= 26 ? 1 : .3) + Math.min(1.25, complex / 6));
  const overall = roundHalf((ta + cc + lr + gra) / 4);
  const freq = {}; words.forEach(w => { if (w.length > 3 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const over = Object.entries(freq).filter(([, c]) => c >= 5).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w, c]) => `"${w}"（${c} 次）`);
  const strengths = [], improvements = [];
  if (cnt >= task.minWords) strengths.push(`字數達標（${cnt} 字）。`); else improvements.push(`字數不足：${cnt}/${task.minWords}。字數不夠會直接影響 ${n === 1 ? 'Task Achievement' : 'Task Response'} 分數。`);
  if (paras >= (n === 2 ? 4 : 3)) strengths.push('段落結構清楚。'); else improvements.push(n === 2 ? '建議分為四段：引言、觀點一、觀點二、結論（含個人立場）。' : '建議分為三段：引言改寫題目、overview、細節比較。');
  if (!opinion) improvements.push(n === 2 ? '沒有明確的個人立場（如 "In my opinion…"）。題目要求 give your opinion。' : '缺少 overview（如 "Overall, …"）。Task 1 沒有 overview 很難超過 Band 5.5。');
  if (conn >= 5) strengths.push('使用了多樣的連接詞。'); else improvements.push('連接詞偏少；可加入 however / whereas / as a result 等，但勿濫用。');
  if (over.length) improvements.push('重複用詞過多：' + over.join('、') + '。請用同義詞或改寫句型。');
  if (avgLen < 12) improvements.push('句子偏短，嘗試用 which / although / while 合併成複雜句。');
  if (avgLen > 28) improvements.push('平均句長過長，可能造成語意不清，適度拆句。');
  if (complex >= 4) strengths.push('有使用複雜句型。');
  return { method: 'local', criteria: { ta, cc, lr, gra }, overall, strengths, improvements, corrections: [] };
}

/* ---------- 建議產生 ---------- */
const WTIPS = { ta: 'Task Achievement/Response：回應題目所有部分；Task 1 先寫 overview，Task 2 全文維持一致立場並充分展開論點。', cc: 'Coherence & Cohesion：每段一個中心句；用代名詞與指涉詞（this trend, the latter）而非只堆連接詞。', lr: 'Lexical Resource：累積主題詞組（collocations）與 paraphrase，避免重複，並注意拼寫與詞性。', gra: 'Grammar：混用簡單/複雜句，檢查時態、主謂一致、冠詞與單複數，這四項是最常見的失分點。' };
const CNAME = { ta: 'Task Achievement / Response', cc: 'Coherence & Cohesion', lr: 'Lexical Resource', gra: 'Grammatical Range & Accuracy' };
function skillStats(records) {
  const s = {};
  records.filter(r => r.results).forEach(r => r.results.forEach(x => { const o = s[x.skill] ||= { ok: 0, n: 0 }; o.n++; if (x.ok) o.ok++; }));
  return s;
}
function advice(rec, hist) {
  const out = [];
  const prev = hist.filter(h => h.section === rec.section && h.date < rec.date).sort((a, b) => b.date - a.date)[0];
  if (prev) {
    const d = rec.band - prev.band;
    out.push(d > 0 ? `📈 比上次（Band ${prev.band}）進步 ${d} 分，繼續保持。` : d < 0 ? `📉 比上次（Band ${prev.band}）下降 ${-d} 分，先看下方錯題歸因，通常是同一類題型反覆失分。` : `➖ 與上次持平（Band ${prev.band}），要突破請集中改善最弱題型。`);
  } else out.push('🆕 這是你第一次做這個科目，之後的成績會與此次比較，產生進步曲線。');
  if (rec.results) {
    const st = skillStats([rec]);
    Object.entries(st).filter(([, o]) => o.ok / o.n < .7).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 2)
      .forEach(([k, o]) => out.push(`🎯 加強「${SKILL_INFO[k].name}」（${o.ok}/${o.n}）：${SKILL_INFO[k].tip}`));
    const blank = rec.results.filter(x => !String(x.user).trim()).length;
    if (blank) out.push(`⚠️ 有 ${blank} 題空白。IELTS 不倒扣，沒把握也要填。`);
    const sp = rec.results.filter(x => /拼寫/.test(x.diag)).length;
    if (sp) out.push(`✍️ ${sp} 題是「拼寫錯誤」——內容對但白白丟分。交卷前花 30 秒檢查拼寫、單複數。`);
    if (rec.usedSec > rec.limitSec * .97 && rec.raw < rec.total) out.push('⏱ 幾乎用盡時間。練習時為每題設定上限（閱讀約 1.5 分鐘），卡住就先跳過。');
    out.push(rec.band >= 7 ? '💡 目標 Band 7+：精進同義改寫辨識，並練習全真 40 題的專注力。' : rec.band >= 5.5 ? '💡 下一步：每天精讀 1 篇文章並整理錯題本，一週後重做同一份題目比較。' : '💡 先打好基礎：累積核心詞彙與句型，並每天做 1 組單一題型練習，再回來做整份模擬。');
  } else {
    const worst = Object.entries(rec.tasks).flatMap(([n, t]) => Object.entries(t.eval.criteria).map(([k, v]) => ({ k, v, n }))).reduce((m, x) => { m[x.k] = (m[x.k] || 0) + x.v; return m; }, {});
    Object.entries(worst).sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([k]) => out.push('🎯 ' + WTIPS[k]));
    const short = Object.entries(rec.tasks).filter(([, t]) => t.words < t.minWords);
    if (short.length) out.push(`⚠️ Task ${short.map(([n]) => n).join('、')} 字數不足；Task 2 佔寫作總分 2/3，時間分配建議 Task 1 約 20 分、Task 2 約 40 分。`);
    out.push('💡 改寫練習：把批改中標出的錯句自己重寫一次，隔天再看一遍，錯誤才會真正消失。');
  }
  return out;
}

/* ---------- 畫面：首頁 ---------- */
function trendChart(hist) {
  if (hist.length < 2) return '<p class="muted">完成至少 2 次考試後，這裡會顯示成績進步曲線。</p>';
  const list = [...hist].sort((a, b) => a.date - b.date), W = 640, H = 220, P = 32;
  const x = i => P + i * (W - 2 * P) / (list.length - 1), y = b => H - P - b / 9 * (H - 2 * P);
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Band trend">`;
  [0, 3, 6, 9].forEach(b => svg += `<line x1="${P}" x2="${W - P}" y1="${y(b)}" y2="${y(b)}" stroke="currentColor" opacity=".15"/><text x="4" y="${y(b) + 4}" font-size="11" fill="currentColor" opacity=".6">${b}</text>`);
  Object.keys(COLORS).forEach(sec => {
    const pts = list.map((r, i) => [r, i]).filter(([r]) => r.section === sec);
    if (!pts.length) return;
    svg += `<polyline fill="none" stroke="${COLORS[sec]}" stroke-width="2" points="${pts.map(([r, i]) => `${x(i)},${y(r.band)}`).join(' ')}"/>`;
    pts.forEach(([r, i]) => svg += `<circle cx="${x(i)}" cy="${y(r.band)}" r="4" fill="${COLORS[sec]}"><title>${SECTION_NAME[sec]} Band ${r.band} · ${fmtDate(r.date)}</title></circle>`);
  });
  svg += '</svg><div class="row muted">' + Object.entries(COLORS).map(([k, c]) => `<span><span style="color:${c}">●</span> ${SECTION_NAME[k]}</span>`).join('') + '</div>';
  return svg;
}
function viewHome() {
  const hist = getHistory(), d = getDraft();
  let html = accountCard() + '<h1>IELTS 模擬考</h1><p class="muted">計時作答 → 自動批改 → 錯誤歸因 → 保存紀錄 → 弱點與進步建議。題目為原創練習題，成績僅供估算參考。</p>';
  if (d) {
    const t = findTest(d.section, d.testId);
    if (t) html += `<div class="card" style="background:var(--warnbg)"><b>有一份未完成的考試：</b>${esc(t.title)}（${Math.max(0, Math.round((d.endAt - Date.now()) / 60000))} 分鐘剩餘）
      <div class="row" style="margin-top:8px"><a class="btn sm" href="#/test/${d.section}/${d.testId}">繼續作答</a><button class="btn sm ghost" data-act="dropDraft">放棄</button></div></div>`;
  }
  html += '<div class="grid">' + Object.keys(TESTS).map(sec => {
    const last = hist.filter(h => h.section === sec).sort((a, b) => b.date - a.date)[0];
    return TESTS[sec].map(t => `<div class="card"><h3 style="color:${COLORS[sec]}">${SECTION_NAME[sec]}</h3><p><b>${esc(t.title.split('·')[1] || t.title)}</b></p>
      <p class="muted">${t.minutes} 分鐘${t.questions ? ' · ' + t.questions.length + ' 題' : ' · Task 1 + Task 2'}${last ? ` · 最近 Band ${last.band}` : ''}</p>
      <a class="btn" href="#/test/${sec}/${t.id}">${d && d.testId === t.id ? '繼續' : '開始'}考試</a></div>`).join('');
  }).join('') + '</div>';
  html += `<h2>成績趨勢</h2><div class="card">${trendChart(hist)}</div>`;
  const st = skillStats(hist);
  const rows = Object.entries(st).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n);
  html += '<h2>弱點分析（累計）</h2><div class="card">' + (rows.length ? rows.map(([k, o], i) => {
    const p = Math.round(o.ok / o.n * 100);
    return `<div style="margin:10px 0"><div class="row"><b>${SKILL_INFO[k].name}</b><span class="spacer"></span><span class="muted">${o.ok}/${o.n} · ${p}%</span></div><div class="bar ${p < 60 ? 'low' : p < 80 ? 'mid' : 'hi'}"><i style="width:${p}%"></i></div>${i < 2 && p < 80 ? `<div class="muted">💡 ${SKILL_INFO[k].tip}</div>` : ''}</div>`;
  }).join('') : '<p class="muted">完成閱讀或聽力後，這裡會統計各題型的正確率。</p>') + '</div>';
  app.innerHTML = html;
}

/* ---------- 畫面：結果 ---------- */
function criteriaBlock(ev) {
  return `<table class="t"><tr>${Object.keys(CNAME).map(k => `<th>${CNAME[k]}</th>`).join('')}<th>Overall</th></tr><tr>${Object.keys(CNAME).map(k => `<td>${ev.criteria[k]}</td>`).join('')}<td><b>${ev.overall}</b></td></tr></table>`;
}
function viewResult(id) {
  const hist = getHistory(), rec = hist.find(h => h.id === id);
  if (!rec) return viewHome();
  const adv = advice(rec, hist);
  let html = `<div class="row"><h1>${esc(rec.title)}</h1><span class="spacer"></span><a class="btn ghost sm" href="#/">回首頁</a></div>
  <div class="card row" style="gap:28px"><div><div class="muted">預估 Band</div><div class="band">${rec.band}</div></div>
  ${rec.results ? `<div><div class="muted">答對</div><b style="font-size:24px">${rec.raw} / ${rec.total}</b></div>` : ''}
  <div><div class="muted">用時</div><b style="font-size:24px">${fmtTime(rec.usedSec)}</b> <span class="muted">/ ${fmtTime(rec.limitSec)}${rec.auto ? ' · 時間到自動交卷' : ''}</span></div>
  <div class="muted">${fmtDate(rec.date)}${rec.results && rec.total < 40 ? '<br>※ 題數少於 40 題，Band 為按比例換算的估算值' : ''}</div></div>
  <h2>進步與加強建議</h2><div class="card"><ul class="clean">${adv.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
  if (rec.results) {
    const st = skillStats([rec]);
    html += '<h2>各題型表現</h2><div class="card">' + Object.entries(st).map(([k, o]) => { const p = Math.round(o.ok / o.n * 100); return `<div style="margin:8px 0"><div class="row"><b>${SKILL_INFO[k].name}</b><span class="spacer"></span><span class="muted">${o.ok}/${o.n}</span></div><div class="bar ${p < 60 ? 'low' : p < 80 ? 'mid' : 'hi'}"><i style="width:${p}%"></i></div></div>`; }).join('') + '</div>';
    const test = findTest(rec.section, rec.testId);
    html += `<h2>逐題批改與糾錯</h2><label class="muted"><input type="checkbox" id="onlyWrong" ${store.get('ielts.onlyWrong', false) ? 'checked' : ''}> 只顯示錯題</label><div id="reviews">${rec.results.map((x, i) => reviewCard(test.questions[i], x, i)).join('')}</div>`;
    if (rec.section === 'listening') html += `<h2>錄音原文</h2><div class="card">${test.script.map(([w, t]) => `<p><b>${w}:</b> ${esc(t)}</p>`).join('')}</div>`;
    else html += `<h2>原文</h2><div class="card passage">${test.passage.map(([l, t]) => `<p><b class="pl">${l}</b>${esc(t)}</p>`).join('')}</div>`;
  } else {
    html += Object.entries(rec.tasks).map(([n, t]) => {
      const ev = t.eval;
      return `<h2>Task ${n} <span class="pill ${ev.method === 'ai' ? 'ok' : 'warn'}">${ev.method === 'ai' ? 'AI 考官批改' : ev.method === 'local' ? '本機規則估算' : '未作答'}</span></h2><div class="card">
      <p class="muted">${esc(t.prompt)}</p>${criteriaBlock(ev)}
      ${ev.method === 'local' ? '<p class="muted">※ AI 批改目前無法使用，以下為依字數、結構、連接詞、詞彙多樣性等指標的粗略估算，無法判斷內容正確性。</p>' : ''}
      ${ev.strengths?.length ? `<h3 style="margin-top:12px">👍 優點</h3><ul class="clean">${ev.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      ${ev.improvements?.length ? `<h3>🔧 待改進</h3><ul class="clean">${ev.improvements.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      ${ev.corrections?.length ? `<h3>✏️ 糾錯</h3><table class="t"><tr><th>原句</th><th>修正</th><th>原因</th></tr>${ev.corrections.map(c => `<tr><td>${esc(c.original)}</td><td>${esc(c.fixed)}</td><td>${esc(c.reason)}</td></tr>`).join('')}</table>` : ''}
      <details style="margin-top:10px"><summary>我的作答（${t.words} 字）</summary><p style="white-space:pre-wrap">${esc(t.text)}</p></details></div>`;
    }).join('');
  }
  app.innerHTML = html;
  const cb = document.getElementById('onlyWrong');
  if (cb) { const apply = () => document.querySelectorAll('.review.right').forEach(e => e.hidden = cb.checked); cb.onchange = () => { store.set('ielts.onlyWrong', cb.checked); apply(); }; apply(); }
}
function answerLabel(q, v) {
  if (!String(v ?? '').trim()) return '（空白）';
  if (q.type === 'mcq') { const k = v.charCodeAt(0) - 97; return `${v.toUpperCase()}. ${q.options[k] ?? ''}`; }
  return q.type === 'tfng' ? v.toUpperCase() : String(v).toUpperCase() === String(v) || q.type !== 'match' ? v : v.toUpperCase();
}
function correctLabel(q) {
  const a = q.answer[0];
  if (q.type === 'mcq') return `${a.toUpperCase()}. ${q.options[a.charCodeAt(0) - 97]}`;
  if (q.type === 'match') return a.toUpperCase();
  return q.type === 'tfng' ? a.toUpperCase() : q.answer.join(' / ');
}
function reviewCard(q, x, i) {
  return `<div class="card review ${x.ok ? 'right' : 'wrong'}"><div class="row"><b>Q${i + 1}</b> <span class="pill ${x.ok ? 'ok' : 'bad'}">${x.ok ? '正確' : '錯誤'}</span><span class="pill">${esc(SKILL_INFO[q.skill].name)}</span></div>
  <p>${esc(q.text)}</p><dl><dt>你的答案</dt><dd>${esc(answerLabel(q, x.user))}</dd><dt>正確答案</dt><dd><b>${esc(correctLabel(q))}</b></dd>
  ${x.ok ? '' : `<dt>錯因</dt><dd>${esc(x.diag)}</dd>`}<dt>解析</dt><dd>${esc(q.explain)}</dd><dt>證據句</dt><dd class="ev">${esc(q.evidence)}</dd></dl></div>`;
}

/* ---------- 畫面：紀錄 / 錯題本 ---------- */
const actions = {
  dropDraft() { if (confirm('放棄未完成的考試？')) { store.set('ielts.draft', null); route(); } },
  del(t) { if (confirm('刪除這筆紀錄？')) { store.set('ielts.history', getHistory().filter(h => h.id !== t.dataset.id)); syncDelete('?id=' + encodeURIComponent(t.dataset.id)); route(); } },
  mastered(t) { store.set('ielts.mastered', [...store.get('ielts.mastered', []), t.dataset.id]); syncNow(); route(); },
  export() {
    const blob = new Blob([JSON.stringify({ history: getHistory(), mastered: store.get('ielts.mastered', []) }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ielts-records.json'; a.click();
  },
  import() { document.getElementById('file').click(); },
  clear() { if (confirm('清除所有成績紀錄？此動作無法復原（建議先匯出備份）。')) { store.set('ielts.history', []); store.set('ielts.mastered', []); syncDelete(''); route(); } },
  async syncBtn(t) { t.textContent = '同步中…'; const ok = await syncNow(); if (!ok) alert('同步失敗，請確認網路或重新登入。'); route(); },
  async logout() { await api('/api/ielts/logout', { method: 'POST' }).catch(() => { }); store.set('ielts.auth', null); route(); },
};
app.addEventListener('change', e => {
  if (e.target.id !== 'file' || !e.target.files[0]) return;
  e.target.files[0].text().then(txt => {
    const d = JSON.parse(txt);
    if (!Array.isArray(d.history)) throw 0;
    const have = new Set(getHistory().map(h => h.id));
    store.set('ielts.history', [...getHistory(), ...d.history.filter(h => h && h.id && !have.has(h.id))]);
    store.set('ielts.mastered', [...new Set([...store.get('ielts.mastered', []), ...(d.mastered || [])])]);
    syncNow();
    route();
  }).catch(() => alert('檔案格式不正確。'));
});
function viewHistory() {
  const hist = [...getHistory()].sort((a, b) => b.date - a.date);
  app.innerHTML = `<div class="row"><h1>成績紀錄</h1><span class="spacer"></span><button class="btn sm ghost" data-act="export">匯出備份</button><button class="btn sm ghost" data-act="import">匯入</button><button class="btn sm ghost" data-act="clear">清除全部</button><input id="file" type="file" accept="application/json" hidden></div>
  ${accountCard()}<p class="muted">未登入時紀錄只保存在這台裝置的瀏覽器中；登入後會同步到雲端。也可以隨時匯出 JSON 備份。</p>
  <div class="card">${hist.length ? `<table class="t"><tr><th>日期</th><th>科目</th><th>Band</th><th>得分</th><th>用時</th><th></th></tr>${hist.map(h => `<tr><td>${fmtDate(h.date)}</td><td>${esc(SECTION_NAME[h.section])}</td><td><b>${h.band}</b></td><td>${h.results ? h.raw + '/' + h.total : '—'}</td><td>${fmtTime(h.usedSec)}</td><td><a href="#/result/${h.id}">詳情</a> · <a href="#/history" data-act="del" data-id="${h.id}">刪除</a></td></tr>`).join('')}</table>` : '<p class="muted">尚無紀錄。</p>'}</div>`;
}
app.addEventListener('click', e => { if (e.target.dataset.act === 'del' || e.target.dataset.act === 'mastered') e.preventDefault(); });
function viewMistakes() {
  const mastered = new Set(store.get('ielts.mastered', [])), latest = {};
  [...getHistory()].sort((a, b) => a.date - b.date).forEach(r => (r.results || []).forEach(x => { latest[x.id] = { ...x, section: r.section, testId: r.testId }; }));
  const list = Object.values(latest).filter(x => !x.ok && !mastered.has(x.id));
  app.innerHTML = `<h1>錯題本</h1><p class="muted">彙整每題「最近一次」仍答錯的題目。理解後按「已掌握」移除。</p>` + (list.length ? list.map(x => {
    const test = findTest(x.section, x.testId), q = test.questions.find(q => q.id === x.id), i = test.questions.indexOf(q);
    return reviewCard(q, x, i).replace('</dl></div>', `</dl><button class="btn sm" data-act="mastered" data-id="${x.id}">已掌握</button></div>`);
  }).join('') : '<div class="card">🎉 目前沒有待複習的錯題。</div>');
}

/* ---------- 路由 ---------- */
function route() {
  const p = location.hash.slice(1).split('/').filter(Boolean);
  if (!(p[0] === 'test' && run)) { stopTimer(); stopAudio(); run = null; }
  window.scrollTo(0, 0);
  if (p[0] === 'test') { if (!run) startRun(p[1], p[2]); }
  else if (p[0] === 'result') viewResult(p[1]);
  else if (p[0] === 'history') viewHistory();
  else if (p[0] === 'mistakes') viewMistakes();
  else viewHome();
}
window.addEventListener('hashchange', route);
route();
if (getAuth()) syncNow().then(ok => ok && !location.hash.startsWith('#/test') && route());
