/* B1 Passport – ứng dụng học 4 kỹ năng tiếng Anh B1 (HTML/CSS/JS thuần, chạy trên GitHub Pages) */
{
const D = window.B1;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const app = $("#app");
const today = () => new Date().toISOString().slice(0, 10);
const SK = ["listening", "speaking", "reading", "writing"];
const HEX = { listening: "#2d4bd8", speaking: "#e2462a", reading: "#0b8478", writing: "#7238e0" };

/* ---------- lưu trữ ---------- */
const KEY = "b1passport.v1";
const fresh = () => ({ name: "", xp: 0, done: {}, drafts: {}, shadow: {}, known: {}, tests: [], days: [] });
let S = fresh();
try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw && typeof raw === "object") S = Object.assign(fresh(), raw); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} updXP(); schedulePush(); }
function touchDay() { const d = today(); if (!S.days.includes(d)) { S.days.push(d); S.days = S.days.slice(-180); } }
function streak() {
  let n = 0; const d = new Date();
  if (!S.days.includes(today())) d.setDate(d.getDate() - 1);
  while (S.days.includes(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function updXP() { $("#xpBadge").textContent = S.xp + " XP"; }

/* ---------- dữ liệu bài học ---------- */
let ALL = [], BY = {}, CUR = null, VIEWTOK = 0;
function rebuild() {
  ALL = [];
  SK.forEach(k => D[k].forEach((l, i) => ALL.push(Object.assign(l, { skill: k, n: i + 1 }))));
  BY = Object.fromEntries(ALL.map(l => [l.id, l]));
  D.grammar.forEach((g, i) => { if (!g.id) g.id = "g" + (i + 1); });
  V = D.vstepSpeaking;
}
const skillDone = k => D[k].filter(l => S.done[l.id]).length;
const nextLesson = () => { for (const w of D.plan) for (const id of w.items) if (!S.done[id] && BY[id]) return BY[id]; return null; };

function complete(id, score, total) {
  const prev = S.done[id];
  const pct = total ? score / total : 0;
  let gain = prev ? 10 : 50 + Math.round(pct * 50);
  if (!prev || pct >= prev.score / prev.total) S.done[id] = { score, total, date: today() };
  S.xp += gain; touchDay(); save();
  logResult({ lesson_id: id, kind: "auto", score, total });
  toast(`+${gain} XP · Đã lưu kết quả ${score}/${total}`);
}

/* ---------- biểu tượng ---------- */
const P = {
  listening: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/>',
  speaking: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
  reading: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>',
  writing: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
  pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
  test: '<path d="M9 4h6v3H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="M8 13l3 3 5-6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V4h12"/>',
  down: '<path d="M12 3v13M6 11l6 6 6-6M4 21h16"/>',
  redo: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  shuffle: '<path d="M3 6h4l10 12h4M3 18h4l3-4M14 10l3-4h4M18 3l3 3-3 3M18 15l3 3-3 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

/* ---------- thông báo nhỏ ---------- */
let tT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tT); tT = setTimeout(() => t.classList.remove("show"), 2600); }

/* ---------- đọc văn bản (Text-to-Speech) ---------- */
const TTS = "speechSynthesis" in window;
let voices = [];
function loadV() {
  if (!TTS) return;
  const rank = v => (/Google|Natural|Online|Neural/i.test(v.name) ? 3 : 0) + (/en[-_](GB|US)/i.test(v.lang) ? 1 : 0);
  voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => rank(b) - rank(a));
}
if (TTS) { loadV(); speechSynthesis.onvoiceschanged = loadV; }
function utter(t, i, rate) {
  const u = new SpeechSynthesisUtterance(t);
  const v = voices.length ? voices[i % voices.length] : null;
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
  u.rate = rate || 0.95; u.pitch = i % 2 ? 0.88 : 1.05;
  return u;
}
let playTok = 0;
function say(t, rate) {
  if (!TTS) return toast("Trình duyệt chưa hỗ trợ đọc văn bản.");
  stopAudio(); speechSynthesis.speak(utter(t, 0, rate));
}
function playLines(lines, rate, onLine, onEnd) {
  stopAudio();
  const tok = ++playTok, spk = [...new Set(lines.map(l => l.s))];
  let i = 0;
  const next = () => {
    if (tok !== playTok) return;
    if (i >= lines.length) { onEnd && onEnd(); return; }
    const l = lines[i], u = utter(l.t, spk.indexOf(l.s), rate);
    u.onstart = () => tok === playTok && onLine && onLine(i);
    u.onend = () => { if (tok !== playTok) return; i++; setTimeout(next, 380); };
    speechSynthesis.speak(u);
  };
  setTimeout(next, 80);
}
function stopAudio() { playTok++; if (TTS) speechSynthesis.cancel(); }

/* ---------- nhận diện giọng nói ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const NUM = { 0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 15: "fifteen", 20: "twenty", 30: "thirty", 40: "forty", 50: "fifty" };
const norm = s => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean).map(w => NUM[w] || w.replace(/^'+|'+$/g, ""));
function compare(target, said) {
  const words = target.split(/\s+/), T = words.map(w => norm(w).join(" ")), A = norm(said);
  const L = Array.from({ length: T.length + 1 }, () => new Array(A.length + 1).fill(0));
  for (let i = T.length - 1; i >= 0; i--) for (let j = A.length - 1; j >= 0; j--)
    L[i][j] = T[i] === A[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ok = new Array(T.length).fill(false); let i = 0, j = 0;
  while (i < T.length && j < A.length) { if (T[i] === A[j]) { ok[i] = true; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  const pct = Math.round(100 * ok.filter(Boolean).length / T.length);
  return { pct, html: words.map((w, k) => `<span class="${ok[k] ? "w-ok" : "w-no"}">${esc(w)}</span>`).join(" ") };
}

/* ---------- hẹn giờ ---------- */
const timers = new Set();
function clearTimers() { timers.forEach(clearInterval); timers.clear(); }
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ---------- định tuyến ---------- */
let cleanup = [];
function route() {
  stopAudio(); clearTimers(); cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = [];
  hidePop();
  const h = (location.hash || "#home").slice(1);
  const lesson = BY[h];
  VIEWTOK++; CUR = lesson ? lesson.id : null;
  if (lesson) LESSON[lesson.skill](lesson);
  else if (SK.includes(h)) skillView(h);
  else (VIEWS[h] || VIEWS.home)();
  const key = lesson ? lesson.skill : h.startsWith("admin") ? "admin" : (VIEWS[h] || SK.includes(h) ? h : "home");
  $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.v === key));
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);

/* ---------- con dấu hộ chiếu ---------- */
function stamp(k, done, total) {
  const C = 2 * Math.PI * 52, pct = done / total, c = HEX[k], sk = D.skills[k];
  const rot = done === total ? -8 : 0;
  return `<div class="stamp"><svg viewBox="0 0 120 120" role="img" aria-label="${sk.name}: ${done}/${total} bài">
  <g transform="rotate(${rot} 60 60)">
  <circle cx="60" cy="60" r="52" fill="none" stroke="${c}" stroke-opacity=".15" stroke-width="7"/>
  <circle class="ring" cx="60" cy="60" r="52" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 60 60)"/>
  <circle cx="60" cy="60" r="41" fill="${done === total ? c : "none"}" fill-opacity=".1" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 3" opacity="${done ? 1 : .45}"/>
  <g transform="translate(48 30)" stroke="${c}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="scale(1)">${P[k]}</g></g>
  <text x="60" y="73" text-anchor="middle" font-size="13" font-weight="800" fill="${c}" font-family="Be Vietnam Pro,sans-serif" letter-spacing="1">${sk.en.toUpperCase()}</text>
  <text x="60" y="89" text-anchor="middle" font-size="11" font-weight="600" fill="#6b6a5c" font-family="Be Vietnam Pro,sans-serif">${done}/${total} bài</text>
  </g></svg></div>`;
}
function passport() {
  return `<div class="passport" aria-label="Hộ chiếu học tập">
    <div class="ph"><span>HỘ CHIẾU HỌC TẬP · B1</span><span>${streak()} ngày liên tiếp</span></div>
    <div class="pname">${esc(S.name || "Học viên mới")}</div>
    <div class="ph" style="margin-top:4px"><span>${Object.keys(S.done).length}/${ALL.length} con dấu</span><span>${S.xp} XP</span></div>
    <div class="stamps">${SK.map(k => stamp(k, skillDone(k), D[k].length)).join("")}</div>
  </div>`;
}

/* ================= TRANG CHỦ ================= */
const VIEWS = {};
VIEWS.home = () => {
  const nx = nextLesson();
  app.innerHTML = `
  <section class="band"><div class="wrap">
    <div>
      <span class="chip">Trình độ B1 · Khung tham chiếu châu Âu (CEFR)</span>
      <h1 style="margin-top:14px">Luyện Nghe, Nói, Đọc, Viết tiếng Anh B1 – mỗi bài học là một con dấu</h1>
      <p>${ALL.length} bài học theo chủ đề quen thuộc và theo định dạng đề VSTEP, có máy đọc mẫu, chấm phát âm bằng giọng nói, chấm bài tự động, thẻ từ vựng và bài kiểm tra tính giờ. Học theo lộ trình 4 tuần, tiến độ được lưu ngay trên trình duyệt.</p>
      ${S.name ? "" : `<form id="nameF" class="row" style="margin-bottom:16px"><input id="nameI" class="search" style="max-width:260px;background:#fff;color:#141a2e" placeholder="Nhập tên của bạn" aria-label="Tên của bạn"><button class="btn">Lưu tên</button></form>`}
      <div class="row">
        ${nx ? `<a class="btn pri" href="#${nx.id}">${ic("arrow")} ${Object.keys(S.done).length ? "Học tiếp" : "Bắt đầu"}: ${esc(nx.title)}</a>` : `<a class="btn pri" href="#progress">${ic("check")} Bạn đã hoàn thành tất cả bài học</a>`}
        <a class="btn" href="#test">${ic("test")} Bài kiểm tra nhanh</a>
      </div>
    </div>
    ${passport()}
  </div></section>
  <div class="wrap">
    <div class="section-head" style="margin-top:0"><h2>Bốn kỹ năng</h2><span class="muted">Chọn một kỹ năng để xem danh sách bài học</span></div>
    <div class="grid">${SK.map(k => {
      const s = D.skills[k], d = skillDone(k), t = D[k].length;
      return `<a class="card skill" href="#${k}" style="--k:${s.color}">
        <div class="ico">${ic(k)}</div><h3>${s.name} <span class="muted" style="font-weight:600;font-size:16px">· ${s.en}</span></h3>
        <p>${s.intro}</p><div class="bar"><i style="width:${100 * d / t}%"></i></div>
        <div class="meta"><span>${d}/${t} bài hoàn thành</span><span>${t} bài</span></div></a>`;
    }).join("")}</div>

    <div class="section-head"><h2>Lộ trình gợi ý 4 tuần</h2><span class="muted">Mỗi tuần một bài cho mỗi kỹ năng · khoảng 90 phút/tuần</span></div>
    <div class="card"><div class="plan">${D.plan.map(w => `<div class="wk"><b>${w.week}</b><div class="muted" style="font-size:14px;margin-bottom:6px">${w.focus}</div>
      ${w.items.filter(id => BY[id]).map(id => { const l = BY[id]; return `<a href="#${id}"><span>${D.skills[l.skill].name}: ${esc(l.title)}</span>${S.done[id] ? `<span class="ok">✓</span>` : ""}</a>`; }).join("")}</div>`).join("")}
      <div class="wk" style="border-color:var(--coral)"><b>Cuối lộ trình</b><div class="muted" style="font-size:14px;margin-bottom:6px">Tổng kết</div>
      <a href="#test"><span>Bài kiểm tra tổng hợp B1</span>${S.tests.length ? `<span class="ok">✓</span>` : ""}</a><a href="#vocab"><span>Ôn từ vựng bằng thẻ</span></a><a href="#progress"><span>Xem huy hiệu &amp; tiến độ</span></a></div>
    </div></div>

    <div class="section-head"><h2>Công cụ học tập</h2></div>
    <div class="grid">
      <a class="card skill" href="#vstep" style="--k:var(--c-s)"><div class="ico">${ic("mic")}</div><h3>Luyện thi VSTEP</h3><p>Nghe, Đọc, Viết theo định dạng đề VSTEP bậc 3, luyện nói Part 1–3 và thi thử nói 12 phút.</p></a>
      <a class="card skill" href="#vocab" style="--k:var(--brand)"><div class="ico">${ic("cards")}</div><h3>Thẻ từ vựng</h3><p>Toàn bộ từ vựng trong các bài, lật thẻ, nghe phát âm, đánh dấu từ đã thuộc.</p></a>
      <a class="card skill" href="#test" style="--k:var(--coral)"><div class="ico">${ic("test")}</div><h3>Kiểm tra nhanh</h3><p>20 câu ngữ pháp và từ vựng B1 trong 15 phút, có giải thích chi tiết.</p></a>
      <a class="card skill" href="#progress" style="--k:var(--ok)"><div class="ico">${ic("chart")}</div><h3>Tiến độ &amp; Huy hiệu</h3><p>Điểm từng bài, chuỗi ngày học, huy hiệu, sao lưu và khôi phục tiến độ.</p></a>
    </div>

    <div class="section-head"><h2>Trình độ B1 nghĩa là gì?</h2></div>
    <div class="card"><p>B1 (Threshold – Ngưỡng) là trình độ người học độc lập đầu tiên trong CEFR, tương đương <b>Bậc 3</b> theo Khung năng lực ngoại ngữ 6 bậc dùng cho Việt Nam. Người đạt B1 có thể hiểu ý chính của văn bản và lời nói rõ ràng về chủ đề quen thuộc, xử lý hầu hết tình huống khi đi du lịch, viết văn bản đơn giản và mạch lạc, đồng thời trình bày ngắn gọn lý do cho ý kiến và kế hoạch của mình.</p>
    <div class="grid" style="margin-top:10px">${SK.map(k => `<div><b style="color:${D.skills[k].color}">${D.skills[k].name}</b><ul style="margin:6px 0 0;padding-left:18px;font-size:15px">${D.skills[k].cando.map(c => `<li>${c}</li>`).join("")}</ul></div>`).join("")}</div></div>
  </div>`;
  const f = $("#nameF");
  if (f) f.addEventListener("submit", e => { e.preventDefault(); const v = $("#nameI").value.trim(); if (v) { S.name = v.slice(0, 40); save(); route(); } });
};

/* ================= DANH SÁCH BÀI CỦA KỸ NĂNG ================= */
function skillView(k) {
  const s = D.skills[k];
  app.innerHTML = `
  <section class="band"><div class="wrap">
    <div><div class="crumbs"><a href="#home">Tổng quan</a> › ${s.name}</div>
      <h1>Kỹ năng ${s.name} <span style="opacity:.7">· ${s.en}</span></h1><p>${s.intro}</p>
      <div class="row"><span class="chip">${skillDone(k)}/${D[k].length} bài hoàn thành</span><span class="chip">Trình độ B1</span></div></div>
    <div><b style="display:block;margin-bottom:10px">Sau phần này, bạn có thể:</b><ul class="cando">${s.cando.map(c => `<li>${c}</li>`).join("")}</ul></div>
  </div></section>
  <div class="wrap">${[["Bài học B1 theo chủ đề", D[k].filter(l => !l.vstep)], ["Luyện theo định dạng đề VSTEP (bậc 3)", D[k].filter(l => l.vstep)]].filter(g => g[1].length).map(([gt, list]) => `<div class="section-head" style="margin-top:8px"><h2>${gt}</h2><span class="muted">${list.filter(l => S.done[l.id]).length}/${list.length} bài</span></div><div class="grid" style="margin-bottom:28px">${list.map(l => {
    const d = S.done[l.id], ds = l.desc || l.prompt || (l.task && l.task.prompt) || "";
    return `<a class="card lesson" href="#${l.id}" style="--k:${s.color}">
      <span class="num">${l.vstep ? "VSTEP" : "BÀI " + l.n} · ${esc(l.type)}</span><h3>${esc(l.title)}</h3>
      <p class="muted" style="margin:0;font-size:15px">${esc(ds.length > 150 ? ds.slice(0, 147) + "…" : ds)}</p>
      <div class="row"><span class="chip">${esc(l.topic)}</span><span class="chip">${l.mins} phút</span></div>
      ${d ? `<span class="done-tag">${ic("check").replace("<svg", '<svg width="16" height="16"')} Đã hoàn thành · ${d.score}/${d.total}</span>` : `<span class="muted" style="font-size:14px">Chưa học</span>`}
    </a>`;
  }).join("")}</div>`).join("")}</div>`;
}

/* ---------- phần đầu & điều hướng bài học ---------- */
function head(l, extra = "") {
  const s = D.skills[l.skill], d = S.done[l.id];
  return `<section class="band slim"><div class="wrap"><div>
    <div class="crumbs"><a href="#home">Tổng quan</a> › <a href="#${l.skill}">${s.name}</a> › Bài ${l.n}</div>
    <h1>${esc(l.title)}</h1>
    <div class="row"><span class="chip">${esc(l.type)}</span><span class="chip">Chủ đề: ${esc(l.topic)}</span><span class="chip">${l.mins} phút</span>${d ? `<span class="chip">✓ Điểm cao nhất ${d.score}/${d.total}</span>` : ""}${extra}</div>
  </div></div></section>`;
}
function pager(l) {
  const list = D[l.skill], i = list.indexOf(l);
  const p = list[i - 1], n = list[i + 1];
  return `<div class="pager">${p ? `<a class="btn" href="#${p.id}">${ic("back")} ${esc(p.title)}</a>` : `<a class="btn" href="#${l.skill}">${ic("back")} Danh sách bài</a>`}
  ${n ? `<a class="btn pri" href="#${n.id}">${esc(n.title)} ${ic("arrow")}</a>` : `<a class="btn pri" href="#home">Về trang tổng quan ${ic("arrow")}</a>`}</div>`;
}

/* ---------- câu hỏi dùng chung ---------- */
const TF = { T: "True", F: "False", NG: "Not Given" };
function qsHTML(qs, p) {
  return qs.map((q, i) => {
    let b;
    if (q.type === "mc") b = `<div class="opts">${q.o.map((o, j) => `<label class="opt"><input type="radio" name="${p}${i}" value="${j}"><span>${esc(o)}</span></label>`).join("")}</div>`;
    else if (q.type === "tf") b = `<div class="tfrow">${Object.entries(TF).map(([v, t]) => `<label class="opt"><input type="radio" name="${p}${i}" value="${v}"><span>${t}</span></label>`).join("")}</div>`;
    else b = `<input class="gapin" name="${p}${i}" autocomplete="off" spellcheck="false" placeholder="Nhập đáp án" aria-label="Đáp án câu ${i + 1}">`;
    return `<div class="q" data-i="${i}"><div class="qt"><span>${i + 1}.</span>${esc(q.q)}${q.type === "tf" ? ' <em class="muted" style="font-weight:500">(True / False / Not Given)</em>' : ""}</div>${b}<div class="fbk"></div></div>`;
  }).join("");
}
function quiz(root, qs, id, label) {
  const p = id + "q";
  root.innerHTML = `<h2>${label}</h2><p class="muted">${qs.length} câu · bấm “Chấm điểm” khi làm xong để xem đáp án và giải thích.</p>
  <form class="qs">${qsHTML(qs, p)}</form><div class="out"></div>
  <div class="row" style="margin-top:16px"><button class="btn pri chk" type="button">${ic("check")} Chấm điểm</button><button class="btn rst" type="button" hidden>${ic("redo")} Làm lại</button></div>`;
  let warned = false;
  const form = $(".qs", root);
  $(".chk", root).onclick = () => {
    let un = 0;
    qs.forEach((q, i) => { const box = $(`.q[data-i="${i}"]`, form); if (q.type === "gap" ? !$("input", box).value.trim() : !$("input:checked", box)) un++; });
    if (un && !warned) { warned = true; toast(`Còn ${un} câu chưa làm – bấm Chấm điểm lần nữa để nộp bài.`); return; }
    let sc = 0;
    qs.forEach((q, i) => {
      const box = $(`.q[data-i="${i}"]`, form); let ok;
      if (q.type === "gap") {
        const inp = $("input", box), g = inp.value.trim().toLowerCase().replace(/[.!]$/, "");
        ok = q.a.some(a => a.toLowerCase() === g); inp.classList.add(ok ? "right" : "wrong"); inp.readOnly = true;
      } else {
        const sel = $("input:checked", box), correct = q.type === "mc" ? String(q.a) : q.a;
        ok = !!sel && sel.value === correct;
        $$(".opt", box).forEach(l => { const v = $("input", l).value; l.classList.toggle("right", v === correct); l.classList.toggle("wrong", !!sel && v === sel.value && !ok); $("input", l).disabled = true; });
      }
      if (ok) sc++;
      const ans = q.type === "mc" ? q.o[q.a] : q.type === "tf" ? TF[q.a] : q.a[0];
      $(".fbk", box).innerHTML = `<div class="exp"><b class="${ok ? "ok" : "no"}">${ok ? "Chính xác!" : "Chưa đúng."}</b> Đáp án: <b>${esc(ans)}</b>. ${esc(q.e)}</div>`;
    });
    const pct = sc / qs.length;
    $(".out", root).innerHTML = `<div class="score"><div class="big">${sc}/${qs.length}</div><div><b>${pct >= .8 ? "Xuất sắc! Bạn đạt yêu cầu B1 cho bài này." : pct >= .6 ? "Khá tốt! Hãy xem lại giải thích các câu sai." : "Cần luyện thêm – hãy xem lại bài và thử lần nữa."}</b><br><span class="muted">Kết quả đã được lưu vào hộ chiếu học tập.</span></div></div>`;
    $(".chk", root).hidden = true; $(".rst", root).hidden = false;
    complete(id, sc, qs.length);
    root.dispatchEvent(new CustomEvent("checked"));
  };
  $(".rst", root).onclick = () => quiz(root, qs, id, label);
}

/* ================= BÀI NGHE ================= */
const LESSON = {};
LESSON.listening = l => {
  app.innerHTML = head(l) + `<div class="wrap">
  <div class="two rev">
    <div>
      <div class="card player">
        <h2>Nghe</h2>
        <p class="muted" style="margin:0">${esc(l.desc)}</p>
        <div class="wave" id="wave" aria-hidden="true">${"<i></i>".repeat(32)}</div>
        <div class="row">
          <button class="btn pri" id="pPlay">${ic("play")} Phát</button>
          <button class="btn" id="pPause" disabled>${ic("pause")} Tạm dừng</button>
          <button class="btn" id="pStop" disabled>${ic("stop")} Dừng</button>
          <label class="row" style="gap:6px;font-size:14px">Tốc độ <select id="pRate"><option value=".75">0.75×</option><option value=".9" selected>0.9×</option><option value="1">1×</option><option value="1.15">1.15×</option></select></label>
        </div>
        <div class="meta"><span id="pCount">Đã nghe: 0 lần</span><span>Người nói: ${[...new Set(l.lines.map(x => x.s))].map(esc).join(", ")}</span></div>
        ${TTS ? "" : `<div class="note">Trình duyệt này chưa hỗ trợ đọc văn bản. Hãy dùng Chrome, Edge hoặc Safari bản mới; bạn vẫn có thể đọc lời thoại bên dưới.</div>`}
      </div>
      <div class="card">
        <h3>Trước khi nghe: từ vựng</h3>
        <div class="row">${l.vocab.map(([w, m]) => `<button class="btn sm" data-say="${esc(w)}">${ic("sound")} <b>${esc(w)}</b>&nbsp;<span class="muted">${esc(m)}</span></button>`).join("")}</div>
        <p class="muted" style="margin:12px 0 0;font-size:14px">Mẹo: đọc câu hỏi trước, gạch chân từ khóa (thời gian, số, địa điểm), nghe lần 1 để nắm ý chính, lần 2 để kiểm tra chi tiết.</p>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><h3 style="margin:0">Lời thoại (transcript)</h3><button class="btn sm" id="tBtn">Hiện lời thoại</button></div>
        <div class="transcript" id="tr" hidden>${l.lines.map((x, i) => `<p data-i="${i}"><b>${esc(x.s)}:</b> ${esc(x.t)}</p>`).join("")}</div>
      </div>
    </div>
    <div class="card" id="qz"></div>
  </div>${pager(l)}</div>`;
  quiz($("#qz"), l.questions, l.id, "Câu hỏi");
  $("#qz").addEventListener("checked", () => { $("#tr").hidden = false; $("#tBtn").textContent = "Ẩn lời thoại"; });
  let count = 0, paused = false;
  const wave = $("#wave"), pp = $("#pPause"), ps = $("#pStop");
  const setUI = on => { wave.classList.toggle("on", on); pp.disabled = ps.disabled = !on; };
  $$("#wave i").forEach((b, i) => b.style.animationDelay = (i % 7) * 0.12 + "s");
  $("#pPlay").onclick = () => {
    if (!TTS) return toast("Trình duyệt chưa hỗ trợ đọc văn bản.");
    paused = false; pp.innerHTML = ic("pause") + " Tạm dừng"; setUI(true);
    count++; $("#pCount").textContent = `Đã nghe: ${count} lần`;
    playLines(l.lines, +$("#pRate").value, i => { $$("#tr p").forEach(p => p.classList.toggle("now", +p.dataset.i === i)); }, () => { setUI(false); $$("#tr p").forEach(p => p.classList.remove("now")); });
  };
  pp.onclick = () => {
    if (!paused) { speechSynthesis.pause(); paused = true; pp.innerHTML = ic("play") + " Tiếp tục"; wave.classList.remove("on"); }
    else { speechSynthesis.resume(); paused = false; pp.innerHTML = ic("pause") + " Tạm dừng"; wave.classList.add("on"); }
  };
  ps.onclick = () => { stopAudio(); setUI(false); $$("#tr p").forEach(p => p.classList.remove("now")); };
  $("#tBtn").onclick = () => { const t = $("#tr"); t.hidden = !t.hidden; $("#tBtn").textContent = t.hidden ? "Hiện lời thoại" : "Ẩn lời thoại"; };
};

/* ================= BÀI ĐỌC ================= */
const gloss = t => esc(t).replace(/\{([^|}]+)\|([^}]+)\}/g, (m, w, mean) => `<button class="gl" type="button" data-w="${w}" data-m="${mean}">${w}</button>`);
const glossList = t => [...t.matchAll(/\{([^|}]+)\|([^}]+)\}/g)].map(m => [m[1], m[2]]);
LESSON.reading = l => {
  const src = l.text ? l.text : l.notices.map(n => n.text);
  const words = src.flatMap(glossList);
  const body = l.text
    ? `<div class="reading">${l.text.map(p => `<p>${gloss(p)}</p>`).join("")}</div>`
    : l.notices.map(n => `<div class="notice"><span class="lb">${n.label}</span><small>${esc(n.kind)}</small><div>${gloss(n.text)}</div></div>`).join("");
  app.innerHTML = head(l) + `<div class="wrap"><div class="two">
    <div>
      <div class="card">
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="muted" style="font-size:14px">${esc(l.source)}</span>
        ${l.text ? `<button class="btn sm" id="rRead">${ic("sound")} Nghe toàn bài</button>` : ""}</div>
        ${body}
        <p class="muted" style="font-size:14px;margin:8px 0 0">Bấm vào từ <span class="gl" style="cursor:default">được gạch chân</span> để xem nghĩa và nghe phát âm.</p>
      </div>
      <div class="card"><h3>Từ vựng trong bài (${words.length})</h3>
        <div class="row">${words.map(([w, m]) => `<button class="btn sm" data-say="${esc(w)}">${ic("sound")} <b>${esc(w)}</b>&nbsp;<span class="muted">${esc(m)}</span></button>`).join("")}</div>
        <p class="muted" style="font-size:14px;margin:12px 0 0">Các từ này cũng có trong mục <a href="#vocab">Thẻ từ vựng</a>.</p>
      </div>
      <div class="card"><h3>Chiến lược đọc B1</h3><ul style="margin:0;padding-left:20px">
        <li><b>Skimming:</b> đọc lướt câu đầu mỗi đoạn để nắm ý chính.</li>
        <li><b>Scanning:</b> tìm nhanh tên riêng, số liệu, ngày tháng trong câu hỏi.</li>
        <li><b>True/False/Not Given:</b> “False” khi bài nói điều ngược lại; “Not Given” khi bài không hề đề cập.</li></ul></div>
    </div>
    <div class="card stick" id="qz"></div>
  </div>${pager(l)}</div>`;
  quiz($("#qz"), l.questions, l.id, "Câu hỏi đọc hiểu");
  const rr = $("#rRead");
  if (rr) {
    const plain = l.text.map(p => p.replace(/\{([^|}]+)\|[^}]+\}/g, "$1"));
    let on = false;
    rr.onclick = () => {
      if (on) { stopAudio(); on = false; rr.innerHTML = ic("sound") + " Nghe toàn bài"; return; }
      if (!TTS) return toast("Trình duyệt chưa hỗ trợ đọc văn bản.");
      on = true; rr.innerHTML = ic("stop") + " Dừng đọc";
      const sents = plain.flatMap(p => p.match(/[^.!?]+[.!?]+["”]?\s*/g) || [p]).map(t => ({ s: "R", t: t.trim() }));
      playLines(sents, .92, null, () => { on = false; rr.innerHTML = ic("sound") + " Nghe toàn bài"; });
    };
  }
};

/* ---------- popup nghĩa từ ---------- */
const pop = $("#pop");
function hidePop() { pop.hidden = true; }
document.addEventListener("click", e => {
  const g = e.target.closest(".gl[data-m]");
  const s = e.target.closest("[data-say]");
  if (s) { say(s.dataset.say, .85); return; }
  if (g) {
    pop.innerHTML = `<b>${esc(g.dataset.w)}</b>${esc(g.dataset.m)}<br><button type="button" data-say="${esc(g.dataset.w)}">Nghe phát âm</button>`;
    pop.hidden = false;
    const r = g.getBoundingClientRect(), pw = pop.offsetWidth;
    pop.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left)) + "px";
    pop.style.top = (r.bottom + 8 + pop.offsetHeight > innerHeight ? r.top - pop.offsetHeight - 8 : r.bottom + 8) + "px";
    say(g.dataset.w, .85);
    return;
  }
  if (!e.target.closest("#pop")) hidePop();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") hidePop(); });
window.addEventListener("scroll", hidePop, { passive: true });

/* ================= BÀI NÓI ================= */
const PICS = {
  picnic: `<svg viewBox="0 0 600 340" role="img" aria-label="Tranh: một gia đình đi dã ngoại trong công viên">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd3ff"/><stop offset="1" stop-color="#e6f4ff"/></linearGradient></defs>
  <rect width="600" height="340" fill="url(#sky)"/><circle cx="520" cy="60" r="34" fill="#ffd166"/><circle cx="520" cy="60" r="48" fill="#ffd166" opacity=".25"/>
  <path d="M0 200 Q150 150 300 190 T600 180 V340 H0z" fill="#8fd18a"/><path d="M0 240 Q200 210 400 235 T600 230 V340 H0z" fill="#6cbf6a"/>
  <rect x="92" y="110" width="22" height="110" rx="6" fill="#8a5a3b"/><circle cx="103" cy="95" r="52" fill="#3f9b4f"/><circle cx="66" cy="120" r="34" fill="#4aa85a"/><circle cx="142" cy="118" r="36" fill="#4aa85a"/>
  <polygon points="150,300 420,300 380,250 190,250" fill="#e2462a"/>
  <g fill="#fff" opacity=".85"><polygon points="190,250 228,250 222,262 184,262"/><polygon points="266,250 304,250 302,262 262,262"/><polygon points="342,250 380,250 388,262 342,262"/><polygon points="178,275 218,275 212,288 170,288"/><polygon points="262,275 302,275 302,288 260,288"/><polygon points="346,275 386,275 396,288 348,288"/></g>
  <rect x="300" y="226" width="54" height="34" rx="6" fill="#c8893d"/><path d="M308 228 Q327 200 346 228" stroke="#8a5a3b" stroke-width="5" fill="none"/><circle cx="318" cy="224" r="7" fill="#e2462a"/><circle cx="332" cy="222" r="7" fill="#ffd166"/>
  <circle cx="206" cy="196" r="15" fill="#f1c7a3"/><path d="M190 190 q16-20 32 0" fill="#3b2a20"/><rect x="190" y="212" width="32" height="40" rx="12" fill="#2d4bd8"/>
  <circle cx="254" cy="192" r="16" fill="#e8b48c"/><path d="M238 186 q16-16 32 0" fill="#22201e"/><rect x="237" y="209" width="35" height="43" rx="12" fill="#0b8478"/>
  <circle cx="468" cy="214" r="12" fill="#f1c7a3"/><path d="M455 210 q13-17 26 0 v10 h-4 v-6 h-18 v6 h-4z" fill="#7a4a2a"/><rect x="456" y="226" width="24" height="34" rx="9" fill="#ffd166"/><rect x="458" y="258" width="7" height="20" rx="3" fill="#f1c7a3"/><rect x="471" y="258" width="7" height="20" rx="3" fill="#f1c7a3"/><path d="M480 232 l18 -8" stroke="#f1c7a3" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="528" cy="262" rx="26" ry="14" fill="#a0673d"/><circle cx="552" cy="246" r="12" fill="#a0673d"/><ellipse cx="558" cy="238" rx="5" ry="9" fill="#7a4a2a"/><rect x="510" y="268" width="6" height="16" fill="#a0673d"/><rect x="538" y="268" width="6" height="16" fill="#a0673d"/><path d="M502 256 q-12 -10 -6 -20" stroke="#a0673d" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="556" cy="244" r="2" fill="#222"/>
  <circle cx="500" cy="232" r="9" fill="#e2462a"/></svg>`
};
const RUBRIC = [
  ["Ngữ pháp & Từ vựng", "Dùng đúng cấu trúc đơn giản, có thử cấu trúc phức tạp hơn; từ vựng đủ cho chủ đề quen thuộc."],
  ["Tổ chức ý", "Nói thành đoạn, có từ nối (because, so, however…), ý rõ ràng, ít lặp lại."],
  ["Phát âm", "Dễ hiểu, trọng âm từ và ngữ điệu câu tương đối chính xác."],
  ["Hoàn thành nhiệm vụ", "Trả lời đủ các ý gợi ý, nói đủ thời gian, tự tin và tự nhiên."]
];
const LINKERS = ["and", "but", "because", "so", "however", "although", "also", "first", "firstly", "secondly", "then", "after that", "finally", "for example", "for instance", "in addition", "moreover", "what's more", "on the other hand", "in my opinion", "as a result", "therefore", "while", "when", "unless", "if", "in conclusion", "to sum up", "such as", "besides", "instead"];
const findLinkers = t => { const s = " " + t.toLowerCase().replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ") + " "; return LINKERS.filter(k => s.includes(" " + k + " ")); };

LESSON.speaking = l => {
  if (l.custom) return VS[l.custom](l);
  const tk = l.task;
  app.innerHTML = head(l) + `<div class="wrap"><div class="two">
  <div>
    <div class="card">
      <h2>1. Luyện phát âm (shadowing)</h2>
      <p class="muted">Nghe câu mẫu, sau đó bấm <b>Nói</b> và đọc to câu đó. Hệ thống nhận diện giọng nói sẽ tô <span style="color:var(--ok);font-weight:700">xanh</span> từ phát âm rõ và <span style="color:var(--bad);text-decoration:underline wavy">đỏ</span> từ cần luyện lại.</p>
      ${SR ? "" : `<div class="note" style="margin-bottom:12px">Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy mở trang bằng <b>Google Chrome</b> hoặc <b>Microsoft Edge</b> trên máy tính/Android. Bạn vẫn có thể nghe mẫu và tự luyện.</div>`}
      <div class="shadow">${l.shadow.map((t, i) => {
        const best = S.shadow[l.id + i];
        return `<div class="sline" data-i="${i}"><div class="txt">${esc(t)}</div>
        <div class="row" style="gap:6px"><button class="btn sm" data-say="${esc(t)}" aria-label="Nghe mẫu">${ic("sound")}</button><button class="btn sm hot sp" ${SR ? "" : "disabled"}>${ic("mic")} Nói</button></div>
        <div class="res muted">${best != null ? `Điểm cao nhất: <span class="pct">${best}%</span>` : "Chưa luyện"}</div></div>`;
      }).join("")}</div>
    </div>

    <div class="card">
      <h2>2. Nói theo chủ đề</h2>
      ${l.picture ? `<div class="pic" style="margin-bottom:14px">${PICS[l.picture]}</div>` : ""}
      <div class="cue"><b style="font-size:18px">${esc(tk.title)}</b><p style="margin:6px 0 0">${esc(tk.prompt)}</p>
        <div class="muted" style="margin-top:8px;font-size:14px;font-weight:600">${l.id === "s3" ? "Các lựa chọn:" : "Bạn nên nói về:"}</div>
        <ul>${tk.points.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>
      <div class="row" style="justify-content:space-between;margin-top:18px">
        <div><div class="muted" id="phase" style="font-weight:600">Sẵn sàng · chuẩn bị ${tk.prep} giây, nói ${tk.talk} giây</div><div class="timer" id="clock">${fmt(tk.prep)}</div></div>
        <div class="row"><button class="btn pri" id="tStart">${ic("clock")} Bắt đầu chuẩn bị</button><button class="btn" id="tTalk">${ic("mic")} Nói ngay</button></div>
      </div>
      <div class="row" style="margin-top:14px"><button class="btn hot" id="rec">${ic("mic")} Ghi âm bài nói</button><span class="muted" id="recSt" style="font-size:14px">Ghi âm để tự nghe lại và xem bản chép lời tự động.</span></div>
      <audio id="aud" controls hidden style="width:100%;margin-top:12px"></audio><div id="upl"></div>
      <div id="tx"></div>
    </div>
  </div>

  <div class="stick">
    <div class="card"><h3>Mẫu câu hữu ích</h3><div class="row">${l.phrases.map(p => `<button class="btn sm" data-say="${esc(p.replace(/…/g, ""))}">${esc(p)}</button>`).join("")}</div></div>
    <div class="card"><h3>Câu hỏi mở rộng</h3><ol style="margin:0;padding-left:20px">${l.followUp.map(q => `<li style="margin-bottom:6px">${esc(q)} <button class="btn sm ghost" data-say="${esc(q)}" aria-label="Nghe câu hỏi" style="min-height:30px;padding:2px 6px">${ic("sound")}</button></li>`).join("")}</ol></div>
    <div class="card"><details><summary>Bài nói mẫu (B1)</summary><p style="margin-top:0">${esc(l.model)}</p><button class="btn sm" data-say="${esc(l.model)}">${ic("sound")} Nghe bài mẫu</button></details></div>
    <div class="card"><h3>3. Tự đánh giá</h3><p class="muted" style="font-size:14px">Nghe lại bản ghi âm và chấm mỗi tiêu chí từ 1 (yếu) đến 5 (rất tốt).</p>
      <div class="rubric">${RUBRIC.map(([n, d], i) => `<label><b>${n}</b><span class="muted" style="font-size:13.5px">${d}</span><div class="rr" data-c="${i}">${[1, 2, 3, 4, 5].map(v => `<button type="button" data-v="${v}">${v}</button>`).join("")}</div></label>`).join("")}</div>
      <div class="row" style="margin-top:14px;justify-content:space-between"><b id="rTot">Tổng: 0/20</b><button class="btn pri" id="rSave">${ic("check")} Lưu đánh giá</button></div>
    </div>
  </div></div>${pager(l)}</div>`;

  /* shadowing */
  let activeR = null;
  cleanup.push(() => activeR && activeR.abort());
  $$(".sp").forEach(b => b.onclick = () => {
    const row = b.closest(".sline"), i = +row.dataset.i, target = l.shadow[i], res = $(".res", row);
    if (activeR) { activeR.abort(); activeR = null; }
    stopAudio();
    const r = new SR(); activeR = r;
    r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 4;
    b.innerHTML = ic("mic") + " Đang nghe…"; b.disabled = true; res.innerHTML = `<span class="muted">Hãy đọc to câu trên…</span>`;
    r.onresult = e => {
      const alts = [...e.results[0]].map(a => a.transcript);
      const best = alts.map(a => compare(target, a)).sort((x, y) => y.pct - x.pct)[0];
      const key = l.id + i; S.shadow[key] = Math.max(S.shadow[key] || 0, best.pct); touchDay(); save();
      res.innerHTML = `<span class="pct" style="color:${best.pct >= 80 ? "var(--ok)" : best.pct >= 50 ? "var(--coral)" : "var(--bad)"}">${best.pct}%</span> · ${best.html}<br><span class="muted">Máy nghe được: “${esc(alts[0])}”</span>`;
    };
    r.onerror = e => { res.innerHTML = `<span class="muted">${e.error === "not-allowed" || e.error === "service-not-allowed" ? "Chưa được cấp quyền micro. Hãy cho phép trình duyệt dùng micro rồi thử lại." : e.error === "no-speech" ? "Không nghe thấy giọng nói – hãy nói to và rõ hơn." : "Có lỗi nhận diện (" + esc(e.error) + "). Hãy thử lại."}</span>`; };
    r.onend = () => { b.innerHTML = ic("mic") + " Nói"; b.disabled = false; activeR = null; };
    try { r.start(); } catch (err) { r.onend(); }
  });

  /* hẹn giờ chuẩn bị / nói */
  const clock = $("#clock"), phase = $("#phase");
  function run(sec, label, done) {
    clearTimers(); let s = sec; clock.textContent = fmt(s); phase.textContent = label; clock.classList.remove("warn");
    const t = setInterval(() => { s--; clock.textContent = fmt(Math.max(s, 0)); clock.classList.toggle("warn", s <= 10); if (s <= 0) { clearInterval(t); timers.delete(t); done(); } }, 1000);
    timers.add(t);
  }
  const talk = () => { run(tk.talk, "Đang nói – hãy trình bày đủ các ý", () => { phase.textContent = "Hết giờ! Nghe lại bản ghi và tự đánh giá."; if (recording) stopRec(); toast("Hết thời gian nói"); }); if (!recording) startRec(); };
  $("#tStart").onclick = () => run(tk.prep, "Chuẩn bị – ghi chú ý chính", () => { toast("Bắt đầu nói!"); talk(); });
  $("#tTalk").onclick = talk;

  /* ghi âm + chép lời */
  let recording = false, mr = null, stream = null, chunks = [], sr2 = null, finalTx = "", t0 = 0;
  const recBtn = $("#rec"), recSt = $("#recSt");
  async function startRec() {
    recording = true; finalTx = ""; t0 = Date.now(); $("#tx").innerHTML = "";
    recBtn.innerHTML = ic("stop") + " Dừng ghi âm"; recSt.textContent = "Đang ghi âm…";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mr = new MediaRecorder(stream); chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => { const a = $("#aud"); if (!a) return; const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" }); a.src = URL.createObjectURL(blob); a.hidden = false; stream.getTracks().forEach(t => t.stop()); offerUpload($("#upl"), blob, l.id, () => finalTx); };
      mr.start();
    } catch (e) { recSt.textContent = "Không truy cập được micro để ghi âm (cần cho phép micro, trang chạy qua https)."; }
    if (SR) {
      sr2 = new SR(); sr2.lang = "en-US"; sr2.continuous = true; sr2.interimResults = true;
      sr2.onresult = e => { let interim = ""; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) finalTx += e.results[i][0].transcript + " "; else interim += e.results[i][0].transcript; } $("#tx").innerHTML = `<div class="exp" style="margin-top:12px"><b>Chép lời trực tiếp:</b> ${esc(finalTx)}<span class="muted">${esc(interim)}</span></div>`; };
      sr2.onend = () => { if (recording) try { sr2.start(); } catch (e) {} };
      try { sr2.start(); } catch (e) {}
    }
  }
  function stopRec() {
    recording = false; recBtn.innerHTML = ic("mic") + " Ghi âm lại"; recSt.textContent = "Đã dừng. Nghe lại bên dưới.";
    try { mr && mr.state !== "inactive" && mr.stop(); } catch (e) {}
    try { sr2 && sr2.stop(); } catch (e) {}
    const secs = Math.max(1, (Date.now() - t0) / 1000), words = norm(finalTx).length;
    if (words) {
      const lk = findLinkers(finalTx);
      $("#tx").innerHTML = `<div class="card" style="margin-top:14px;box-shadow:none"><h3>Phân tích bài nói</h3>
      <div class="stat"><div><b>${words}</b><span>từ đã nói</span></div><div><b>${Math.round(words / secs * 60)}</b><span>từ/phút (B1: 90–130)</span></div><div><b>${Math.round(secs)}s</b><span>thời lượng</span></div><div><b>${lk.length}</b><span>từ nối khác nhau</span></div></div>
      <p style="margin:12px 0 4px"><b>Từ nối đã dùng:</b> ${lk.length ? lk.map(esc).join(", ") : "chưa có – hãy thêm because, so, however…"}</p>
      <p class="muted" style="margin:0;font-size:15px"><b>Bản chép lời:</b> ${esc(finalTx)}</p></div>`;
    }
  }
  cleanup.push(() => { recording = false; try { mr && mr.state !== "inactive" && mr.stop(); } catch (e) {} try { sr2 && sr2.abort(); } catch (e) {} try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) {} });
  recBtn.onclick = () => recording ? stopRec() : startRec();

  /* tự đánh giá */
  const marks = [0, 0, 0, 0];
  $$(".rr").forEach(g => g.onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    marks[+g.dataset.c] = +b.dataset.v;
    $$("button", g).forEach(x => x.classList.toggle("on", +x.dataset.v <= +b.dataset.v));
    $("#rTot").textContent = `Tổng: ${marks.reduce((a, c) => a + c, 0)}/20`;
  });
  $("#rSave").onclick = () => {
    if (marks.includes(0)) return toast("Hãy chấm đủ 4 tiêu chí.");
    complete(l.id, marks.reduce((a, c) => a + c, 0), 20);
  };
};

/* ================= BÀI VIẾT ================= */
const STOP = new Set("the a an and or but to of in on at for with is are was were be been i you he she it we they my your his her our their this that these those me him them us so as if then than there here do does did have has had not no yes can could will would should just very really also from by about up out what which who when where how all some any more most".split(" "));
LESSON.writing = l => {
  const draft = S.drafts[l.id] || "";
  app.innerHTML = head(l, `<span class="chip">${l.min}–${l.max} từ</span>`) + `<div class="wrap"><div class="two">
  <div>
    <div class="card"><h2>Đề bài</h2><p class="prompt">${esc(l.prompt)}</p>
      <b>Trong bài viết, bạn cần:</b><ul style="margin:6px 0 0;padding-left:20px">${l.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>
    <div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <div class="counter"><span class="wc" id="wc">0</span> từ <span>· mục tiêu ${l.min}–${l.max}</span><span id="saved"></span></div>
        <div class="row" style="gap:6px"><span class="timer" id="wclock" style="font-size:26px">${fmt(l.mins * 60)}</span><button class="btn sm" id="wT">${ic("clock")} Bấm giờ</button></div>
      </div>
      <div class="bar" style="--k:var(--c-w);margin-bottom:12px"><i id="wbar" style="width:0"></i></div>
      <textarea class="editor" id="ed" spellcheck="true" lang="en" placeholder="Viết bài của bạn bằng tiếng Anh tại đây… Bài viết được tự động lưu trên trình duyệt." aria-label="Khung soạn bài viết">${esc(draft)}</textarea>
      <div class="row" style="margin-top:14px">
        <button class="btn pri" id="wCheck">${ic("check")} Nhận xét bài viết</button>
        <button class="btn" id="wCopy">${ic("copy")} Sao chép</button>
        <button class="btn" id="wDown">${ic("down")} Tải về .txt</button>
        <button class="btn ghost" id="wClear">Xóa bài</button>
        ${ONLINE ? `<button class="btn hot" id="wSubmit">${ic("check")} Nộp bài cho giáo viên</button>` : ""}
      </div>
    </div>
    <div id="fb"></div>
    ${ONLINE ? `<div class="card"><h3>Bài đã nộp &amp; nhận xét</h3><div id="wSubs">${USER ? '<p class="muted">Đang tải…</p>' : '<p class="muted" style="margin:0"><a href="#login">Đăng nhập</a> để nộp bài và nhận nhận xét của giáo viên.</p>'}</div></div>` : ""}
  </div>
  <div class="stick">
    <div class="card">
      <details open><summary>Dàn ý gợi ý</summary><ol class="outline">${l.outline.map(o => `<li>${esc(o)}</li>`).join("")}</ol></details>
      <details open><summary>Ngôn ngữ hữu ích (bấm để chèn)</summary><div class="phr">${l.language.map(p => `<button type="button" data-ins="${esc(p)}">${esc(p)}</button>`).join("")}</div></details>
      <details><summary>Bảng kiểm trước khi nộp</summary><div style="display:grid;gap:6px">${["Trả lời đủ tất cả các ý của đề bài", "Chia đoạn rõ ràng", "Dùng từ nối đa dạng", "Kiểm tra thì của động từ", "Kiểm tra chính tả, chữ hoa, dấu câu", "Văn phong phù hợp (thân mật/ trang trọng)"].map((c, i) => `<label class="opt" style="min-height:40px;padding:8px 12px"><input type="checkbox" data-ck="${i}"><span>${c}</span></label>`).join("")}</div></details>
      <details><summary>Bài viết mẫu</summary><div class="model">${esc(l.model)}</div></details>
    </div>
  </div></div>${pager(l)}</div>`;

  const ed = $("#ed");
  const countW = t => (t.match(/[A-Za-z0-9’'-]+/g) || []).length;
  const upd = () => {
    const n = countW(ed.value), wc = $("#wc");
    wc.textContent = n; wc.className = "wc" + (n >= l.min && n <= l.max ? " good" : n > l.max ? " over" : "");
    $("#wbar").style.width = Math.min(100, 100 * n / l.max) + "%";
  };
  let st;
  ed.addEventListener("input", () => { upd(); clearTimeout(st); st = setTimeout(() => { S.drafts[l.id] = ed.value; save(); $("#saved").textContent = " · đã lưu nháp"; }, 600); });
  cleanup.push(() => { clearTimeout(st); S.drafts[l.id] = ed.value; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} });
  upd();

  $$("[data-ins]").forEach(b => b.onclick = () => {
    const t = b.dataset.ins.replace(/…/g, " "), s = ed.selectionStart, e = ed.selectionEnd;
    ed.setRangeText(t, s, e, "end"); ed.focus(); ed.dispatchEvent(new Event("input"));
  });

  let wLeft = l.mins * 60, wRun = null;
  $("#wT").onclick = () => {
    if (wRun) { clearInterval(wRun); timers.delete(wRun); wRun = null; $("#wT").innerHTML = ic("clock") + " Tiếp tục"; return; }
    $("#wT").innerHTML = ic("pause") + " Tạm dừng";
    wRun = setInterval(() => { wLeft--; $("#wclock").textContent = fmt(Math.max(0, wLeft)); $("#wclock").classList.toggle("warn", wLeft <= 120); if (wLeft <= 0) { clearInterval(wRun); timers.delete(wRun); wRun = null; toast("Hết giờ làm bài viết!"); } }, 1000);
    timers.add(wRun);
  };
  $("#wCopy").onclick = async () => { try { await navigator.clipboard.writeText(ed.value); toast("Đã sao chép bài viết"); } catch (e) { ed.select(); toast("Hãy nhấn Ctrl+C để sao chép"); } };
  $("#wDown").onclick = () => {
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`${l.title}\n\n${ed.value}`], { type: "text/plain" })); a.download = `${l.id}-${l.title.replace(/\W+/g, "-").toLowerCase()}.txt`; document.body.append(a); a.click(); a.remove(); }
    catch (e) { toast("Không tải được – hãy dùng nút Sao chép"); }
  };
  let lastAuto = null;
  const ws = $("#wSubmit");
  if (ws) ws.onclick = async () => {
    if (!USER) { location.hash = "#login"; return toast("Hãy đăng nhập để nộp bài"); }
    const t = ed.value.trim(), n = countW(t);
    if (n < 20) return toast("Bài viết quá ngắn để nộp");
    if (ws.dataset.armed !== "1") { ws.dataset.armed = "1"; ws.innerHTML = ic("check") + " Bấm lần nữa để nộp"; return; }
    ws.disabled = true;
    const err = await logResult({ lesson_id: l.id, kind: "writing", score: lastAuto ? lastAuto.sc : null, total: lastAuto ? lastAuto.n : null, detail: { text: t.slice(0, 20000), words: n } });
    ws.disabled = false; ws.dataset.armed = ""; ws.innerHTML = ic("check") + " Nộp bài cho giáo viên";
    if (err) return toast("Chưa nộp được: " + err.message);
    toast("Đã nộp bài cho giáo viên"); mySubs($("#wSubs"), l.id);
  };
  if (USER) mySubs($("#wSubs"), l.id);
  let clr = false;
  $("#wClear").onclick = () => { if (!clr) { clr = true; $("#wClear").textContent = "Bấm lần nữa để xóa"; setTimeout(() => { clr = false; const b = $("#wClear"); if (b) b.textContent = "Xóa bài"; }, 3000); return; } ed.value = ""; ed.dispatchEvent(new Event("input")); $("#fb").innerHTML = ""; clr = false; $("#wClear").textContent = "Xóa bài"; };

  $("#wCheck").onclick = () => {
    const t = ed.value.trim();
    if (countW(t) < 20) return toast("Hãy viết ít nhất 20 từ trước khi nhận xét.");
    const words = (t.match(/[A-Za-z’']+/g) || []).map(w => w.toLowerCase());
    const n = countW(t);
    const sents = t.split(/(?<=[.!?])\s+/).filter(s => /[a-z]/i.test(s));
    const paras = t.split(/\n\s*\n/).filter(p => p.trim());
    const lk = findLinkers(t);
    const content = words.filter(w => !STOP.has(w) && w.length > 2);
    const freq = {}; content.forEach(w => freq[w] = (freq[w] || 0) + 1);
    const rep = Object.entries(freq).filter(([, c]) => c >= 4).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const variety = Math.round(100 * new Set(words).size / Math.max(1, words.length));
    const avg = Math.round(n / Math.max(1, sents.length));
    const items = [
      [n >= l.min && n <= l.max, `Độ dài phù hợp (${n} từ; yêu cầu ${l.min}–${l.max})`],
      [paras.length >= (l.paras || 3), `Chia đoạn rõ ràng (${paras.length} đoạn; nên có ít nhất ${l.paras || 3} – để một dòng trống giữa các đoạn)`],
      [lk.length >= 4, `Từ nối đa dạng (${lk.length}: ${lk.slice(0, 8).join(", ") || "chưa có"})`],
      ...l.checks.map(c => {
        const re = new RegExp(c.re, c.f);
        const ok = c.min ? (t.match(re) || []).length >= c.min : re.test(t);
        return [ok, c.label];
      })
    ];
    const tips = [];
    if (/(^|[\s.,!?])i([\s',.!?]|$)/.test(t)) tips.push("Đại từ <b>I</b> luôn viết hoa.");
    const lowStart = sents.filter(s => /^[a-z]/.test(s.trim())).length; if (lowStart) tips.push(`Có ${lowStart} câu bắt đầu bằng chữ thường – hãy viết hoa chữ cái đầu câu.`);
    const long = sents.filter(s => countW(s) > 30).length; if (long) tips.push(`Có ${long} câu dài trên 30 từ – nên tách thành câu ngắn hơn cho rõ ý.`);
    if (/ {2,}/.test(t)) tips.push("Có khoảng trắng thừa giữa các từ.");
    if (/\s[,.!?]/.test(t)) tips.push("Không đặt khoảng trắng trước dấu câu (, . ! ?).");
    if (rep.length) tips.push(`Một số từ lặp lại nhiều: ${rep.map(([w, c]) => `<b>${esc(w)}</b> (${c} lần)`).join(", ")} – thử dùng từ đồng nghĩa.`);
    if (avg < 8) tips.push("Câu khá ngắn – hãy nối câu bằng because, which, when, although để đa dạng cấu trúc.");
    if (variety < 45) tips.push("Vốn từ còn lặp lại – hãy dùng thêm tính từ, trạng từ và cụm từ trong mục Ngôn ngữ hữu ích.");
    const sc = items.filter(i => i[0]).length;
    $("#fb").innerHTML = `<div class="card"><h2>Nhận xét tự động</h2>
      <div class="stat"><div><b>${n}</b><span>số từ</span></div><div><b>${sents.length}</b><span>số câu</span></div><div><b>${avg}</b><span>từ/câu (TB)</span></div><div><b>${variety}%</b><span>độ đa dạng từ</span></div></div>
      <h3 style="margin-top:18px">Yêu cầu bài viết</h3>
      <ul class="checks">${items.map(([ok, lb]) => `<li class="${ok ? "y" : "n"}"><span class="d">${ok ? "✓" : "!"}</span><span>${esc(lb)}</span></li>`).join("")}</ul>
      ${tips.length ? `<h3 style="margin-top:18px">Gợi ý cải thiện</h3><ul style="margin:0;padding-left:20px">${tips.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}
      <div class="score"><div class="big">${sc}/${items.length}</div><div><b>${sc === items.length ? "Rất tốt! Bài viết đáp ứng đầy đủ các tiêu chí kiểm tra tự động." : "Hãy sửa các mục có dấu “!” rồi nhận xét lại."}</b><br><span class="muted">Công cụ chỉ kiểm tra hình thức; hãy so sánh với bài mẫu và nhờ giáo viên chữa phần ngữ pháp, nội dung.</span></div></div>
    </div>`;
    complete(l.id, sc, items.length);
    lastAuto = { sc, n: items.length };
    $("#fb").scrollIntoView({ behavior: "smooth", block: "start" });
  };
};

/* ================= TỪ VỰNG ================= */
function deck() {
  const out = [], seen = new Set();
  D.reading.forEach(l => (l.text || l.notices.map(n => n.text)).flatMap(glossList).forEach(([w, m]) => { if (!seen.has(w)) { seen.add(w); out.push({ w, m, src: l.id, t: l.title }); } }));
  D.listening.forEach(l => l.vocab.forEach(([w, m]) => { if (!seen.has(w)) { seen.add(w); out.push({ w, m, src: l.id, t: l.title }); } }));
  return out;
}
VIEWS.vocab = () => {
  const all = deck();
  let filter = "all", list = all.slice(), i = 0;
  app.innerHTML = `<section class="band slim"><div class="wrap"><div><div class="crumbs"><a href="#home">Tổng quan</a> › Từ vựng</div>
    <h1>Thẻ từ vựng B1</h1><p>${all.length} từ và cụm từ lấy từ các bài Nghe và Đọc. Bấm vào thẻ để lật, nghe phát âm và đánh dấu từ đã thuộc.</p>
    <div class="row"><span class="chip" id="vk"></span></div></div></div></section>
  <div class="wrap">
    <div class="row" style="justify-content:center;margin-bottom:18px">
      <select id="vf" aria-label="Lọc thẻ"><option value="all">Tất cả từ</option><option value="new">Chưa thuộc</option><option value="known">Đã thuộc</option>${[...D.listening, ...D.reading].map(l => `<option value="${l.id}">${D.skills[l.skill].name}: ${esc(l.title)}</option>`).join("")}</select>
      <button class="btn" id="vs">${ic("shuffle")} Trộn thẻ</button>
    </div>
    <div class="flash"><div class="fc" id="fc" tabindex="0" role="button" aria-label="Lật thẻ"><div class="f"></div><div class="b"></div></div>
      <div class="row" style="justify-content:space-between;margin-top:16px">
        <button class="btn" id="vp" aria-label="Thẻ trước">${ic("back")}</button>
        <div class="row" style="gap:8px"><button class="btn" id="vsay">${ic("sound")} Nghe</button><button class="btn" id="vno">Học lại</button><button class="btn pri" id="vyes">${ic("check")} Đã thuộc</button></div>
        <button class="btn" id="vn" aria-label="Thẻ tiếp">${ic("arrow")}</button>
      </div>
      <p class="kbd" style="text-align:center">Phím tắt: Space lật thẻ · ← → chuyển thẻ · K đã thuộc</p>
    </div>
    <div class="section-head"><h2>Danh sách từ</h2><input class="search" id="vq" style="max-width:320px" placeholder="Tìm từ hoặc nghĩa…" aria-label="Tìm từ"></div>
    <div class="card" style="padding:8px 12px"><table class="stack"><thead><tr><th>Từ</th><th>Nghĩa</th><th>Bài học</th><th>Trạng thái</th></tr></thead><tbody id="vt"></tbody></table></div>
  </div>`;
  const fc = $("#fc");
  const stat = () => { $("#vk").textContent = `Đã thuộc ${all.filter(x => S.known[x.w]).length}/${all.length} từ`; };
  const show = () => {
    fc.classList.remove("flip");
    if (!list.length) { $(".f", fc).innerHTML = `<div><div class="m">Không có thẻ nào</div><small>Hãy chọn bộ lọc khác</small></div>`; $(".b", fc).innerHTML = ""; return; }
    i = (i + list.length) % list.length; const c = list[i];
    $(".f", fc).innerHTML = `<div><div class="w">${esc(c.w)}</div><small>${i + 1}/${list.length} · bấm để lật</small>${S.known[c.w] ? `<small style="color:var(--ok);font-weight:700">✓ Đã thuộc</small>` : ""}</div>`;
    $(".b", fc).innerHTML = `<div><div class="m">${esc(c.m)}</div><small>${esc(c.w)} · từ bài “${esc(c.t)}”</small></div>`;
  };
  const table = () => {
    const q = ($("#vq").value || "").toLowerCase();
    $("#vt").innerHTML = all.filter(x => !q || x.w.toLowerCase().includes(q) || x.m.toLowerCase().includes(q)).map(x => `<tr><td><button class="btn sm ghost" data-say="${esc(x.w)}" style="padding:2px 6px;min-height:30px">${ic("sound")}</button> <b>${esc(x.w)}</b></td><td>${esc(x.m)}</td><td><a href="#${x.src}">${esc(x.t)}</a></td><td>${S.known[x.w] ? '<span style="color:var(--ok);font-weight:700">Đã thuộc</span>' : '<span class="muted">Đang học</span>'}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">Không tìm thấy từ phù hợp.</td></tr>`;
  };
  const apply = () => { list = all.filter(x => filter === "all" || (filter === "new" && !S.known[x.w]) || (filter === "known" && S.known[x.w]) || x.src === filter); i = 0; show(); };
  const mark = v => { if (!list.length) return; const c = list[i]; if (v) S.known[c.w] = 1; else delete S.known[c.w]; touchDay(); save(); stat(); table(); toast(v ? `Đã thuộc “${c.w}”` : `Sẽ ôn lại “${c.w}”`); if (filter === "new" || filter === "known") { list.splice(i, 1); show(); } else { i++; show(); } };
  fc.onclick = () => fc.classList.toggle("flip");
  $("#vp").onclick = () => { i--; show(); }; $("#vn").onclick = () => { i++; show(); };
  $("#vsay").onclick = () => list.length && say(list[i].w, .85);
  $("#vyes").onclick = () => mark(1); $("#vno").onclick = () => mark(0);
  $("#vf").onchange = e => { filter = e.target.value; apply(); };
  $("#vs").onclick = () => { for (let k = list.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [list[k], list[j]] = [list[j], list[k]]; } i = 0; show(); };
  $("#vq").oninput = table;
  const key = e => {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === " ") { e.preventDefault(); fc.classList.toggle("flip"); }
    else if (e.key === "ArrowRight") { i++; show(); } else if (e.key === "ArrowLeft") { i--; show(); } else if (e.key.toLowerCase() === "k") mark(1);
  };
  document.addEventListener("keydown", key); cleanup.push(() => document.removeEventListener("keydown", key));
  stat(); apply(); table();
};

/* ================= KIỂM TRA ================= */
VIEWS.test = () => {
  app.innerHTML = `<section class="band slim"><div class="wrap"><div><div class="crumbs"><a href="#home">Tổng quan</a> › Kiểm tra</div>
    <h1>Bài kiểm tra nhanh B1</h1><p>20 câu trắc nghiệm (12 ngữ pháp + 8 từ vựng), thời gian 15 phút. Câu hỏi được chọn ngẫu nhiên mỗi lần làm.</p></div></div></section>
  <div class="wrap" id="tw"></div>`;
  intro();
  function intro() {
    const best = S.tests.reduce((m, t) => Math.max(m, Math.round(100 * t.score / t.total)), 0);
    $("#tw").innerHTML = `<div class="two"><div class="card"><h2>Hướng dẫn</h2><ul style="padding-left:20px">
      <li>Chọn một đáp án đúng nhất cho mỗi câu; có thể chuyển qua lại giữa các câu.</li><li>Bài tự nộp khi hết 15 phút.</li>
      <li>Sau khi nộp, bạn sẽ thấy đáp án và giải thích từng câu.</li><li>Kết quả được quy đổi để tham khảo: ≥ 80% vững B1; 60–79% đạt B1; 40–59% gần B1; dưới 40% cần ôn lại A2.</li></ul>
      <button class="btn pri" id="go">${ic("play")} Bắt đầu làm bài</button></div>
      <div class="card"><h3>Lịch sử làm bài</h3>${S.tests.length ? `<p>Điểm cao nhất: <b>${best}%</b></p><table><thead><tr><th>Ngày</th><th style="text-align:right">Điểm</th></tr></thead><tbody>${S.tests.slice(-8).reverse().map(t => `<tr><td>${esc(t.date)}</td><td class="n">${t.score}/${t.total}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Bạn chưa làm bài kiểm tra nào.</p>`}</div></div>`;
    $("#go").onclick = start;
  }
  function start() {
    const shuf = a => a.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const g = shuf(D.grammar).slice(0, 12).map(q => ({ ...q, kind: "Ngữ pháp" }));
    const dk = deck(), v = shuf(dk).slice(0, 8).map(c => {
      const wrong = shuf(dk.filter(x => x.m !== c.m)).slice(0, 3).map(x => x.m);
      const o = shuf([c.m, ...wrong]);
      return { q: `What does “${c.w}” mean?`, o, a: o.indexOf(c.m), e: `${c.w} = ${c.m} (từ bài “${c.t}”).`, kind: "Từ vựng" };
    });
    const qs = shuf([...g, ...v]), ans = new Array(qs.length).fill(null);
    let cur = 0, left = 15 * 60;
    $("#tw").innerHTML = `<div class="two"><div class="card" id="tq"></div>
      <div class="card stick"><div class="row" style="justify-content:space-between"><div><div class="muted" style="font-size:14px;font-weight:600">Thời gian còn lại</div><div class="timer" id="tc">${fmt(left)}</div></div><button class="btn hot" id="sub">Nộp bài</button></div>
      <div class="qnav" id="qn" style="margin-top:16px"></div><p class="muted" style="font-size:14px;margin:12px 0 0" id="tp"></p></div></div>`;
    const nav = () => {
      $("#qn").innerHTML = qs.map((q, k) => `<button class="${ans[k] != null ? "a" : ""} ${k === cur ? "cur" : ""}" data-k="${k}" aria-label="Câu ${k + 1}">${k + 1}</button>`).join("");
      $("#tp").textContent = `Đã làm ${ans.filter(a => a != null).length}/${qs.length} câu`;
    };
    const showQ = () => {
      const q = qs[cur];
      $("#tq").innerHTML = `<span class="chip">${q.kind}</span><h2 style="margin-top:12px">Câu ${cur + 1}/${qs.length}</h2><p style="font-size:19px;font-weight:600">${esc(q.q)}</p>
      <div class="opts">${q.o.map((o, j) => `<label class="opt"><input type="radio" name="tq" value="${j}" ${ans[cur] === j ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div>
      <div class="row" style="justify-content:space-between;margin-top:18px"><button class="btn" id="pv" ${cur ? "" : "disabled"}>${ic("back")} Câu trước</button><button class="btn pri" id="nx">${cur < qs.length - 1 ? "Câu tiếp" : "Xem lại"} ${ic("arrow")}</button></div>`;
      $$('#tq input').forEach(r => r.onchange = () => { ans[cur] = +r.value; nav(); });
      $("#pv").onclick = () => { cur--; showQ(); nav(); };
      $("#nx").onclick = () => { if (cur < qs.length - 1) { cur++; showQ(); nav(); } else toast("Đã đến câu cuối – bấm Nộp bài khi sẵn sàng."); };
    };
    $("#qn").onclick = e => { const b = e.target.closest("button"); if (b) { cur = +b.dataset.k; showQ(); nav(); } };
    let confirmSub = false;
    $("#sub").onclick = () => {
      const un = ans.filter(a => a == null).length;
      if (un && !confirmSub) { confirmSub = true; $("#sub").textContent = `Còn ${un} câu – bấm lần nữa để nộp`; return; }
      finish();
    };
    const t = setInterval(() => { left--; $("#tc").textContent = fmt(Math.max(0, left)); $("#tc").classList.toggle("warn", left <= 60); if (left <= 0) { toast("Hết giờ – bài đã được nộp tự động"); finish(); } }, 1000);
    timers.add(t);
    function finish() {
      clearInterval(t); timers.delete(t);
      const sc = qs.filter((q, k) => ans[k] === q.a).length, pct = Math.round(100 * sc / qs.length);
      S.tests.push({ date: today(), score: sc, total: qs.length }); S.xp += 20 + sc * 5; touchDay(); save(); logResult({ lesson_id: "test", kind: "test", score: sc, total: qs.length });
      const lvl = pct >= 80 ? ["Vững B1", "Bạn nắm chắc ngữ pháp và từ vựng B1. Hãy thử thách bản thân với tài liệu B2."] : pct >= 60 ? ["Đạt B1", "Bạn đã đạt yêu cầu. Xem lại các câu sai để củng cố."] : pct >= 40 ? ["Gần B1 (A2+)", "Bạn đang tiến bộ. Hãy ôn lại các chủ điểm ngữ pháp trong phần giải thích."] : ["Cần ôn lại A2", "Hãy học lại các bài theo lộ trình 4 tuần rồi làm lại bài kiểm tra."];
      $("#tw").innerHTML = `<div class="card"><div class="score" style="margin-top:0"><div class="big">${pct}%</div><div><b style="font-size:20px">${lvl[0]} · ${sc}/${qs.length} câu đúng</b><br><span class="muted">${lvl[1]}</span></div></div>
      <div class="qnav" style="margin:16px 0">${qs.map((q, k) => `<button class="${ans[k] === q.a ? "r" : "x"}" data-rv="${k}" aria-label="Xem câu ${k + 1}">${k + 1}</button>`).join("")}</div>
      <div class="row"><button class="btn pri" id="again">${ic("redo")} Làm bài mới</button><a class="btn" href="#progress">${ic("chart")} Xem tiến độ</a></div></div>
      <div class="card"><h2>Đáp án &amp; giải thích</h2>${qs.map((q, k) => { const ok = ans[k] === q.a; return `<div class="q" id="rv${k}"><div class="qt"><span>${k + 1}.</span>${esc(q.q)} <em class="muted" style="font-weight:500">(${q.kind})</em></div>
        <div class="opts">${q.o.map((o, j) => `<div class="opt ${j === q.a ? "right" : j === ans[k] ? "wrong" : ""}" style="cursor:default">${esc(o)}</div>`).join("")}</div>
        <div class="exp"><b class="${ok ? "ok" : "no"}">${ok ? "Đúng." : ans[k] == null ? "Chưa trả lời." : "Sai."}</b> ${esc(q.e)}</div></div>`; }).join("")}</div>`;
      $("#again").onclick = () => { window.scrollTo(0, 0); start(); };
      $$("[data-rv]").forEach(b => b.onclick = () => $("#rv" + b.dataset.rv).scrollIntoView({ behavior: "smooth", block: "center" }));
      window.scrollTo(0, 0);
    }
    nav(); showQ();
  }
};

/* ================= TIẾN ĐỘ ================= */
const BADGES = [
  ["Bước đầu tiên", "Hoàn thành 1 bài học", () => Object.keys(S.done).length >= 1, "#2d4bd8"],
  ["Đôi tai tinh", `Hoàn thành ${D.listening.length} bài Nghe`, () => skillDone("listening") === D.listening.length, HEX.listening],
  ["Tự tin nói", `Hoàn thành ${D.speaking.length} bài Nói`, () => skillDone("speaking") === D.speaking.length, HEX.speaking],
  ["Mọt sách", `Hoàn thành ${D.reading.length} bài Đọc`, () => skillDone("reading") === D.reading.length, HEX.reading],
  ["Cây bút vàng", `Hoàn thành ${D.writing.length} bài Viết`, () => skillDone("writing") === D.writing.length, HEX.writing],
  ["Hộ chiếu B1", `Hoàn thành cả ${ALL.length} bài`, () => Object.keys(S.done).length >= ALL.length, "#f2522f"],
  ["Chăm chỉ", "Học 3 ngày liên tiếp", () => streak() >= 3, "#0b8a5a"],
  ["Thi thử", "Làm 1 bài kiểm tra", () => S.tests.length >= 1, "#c78a00"],
  ["Xuất sắc", "Đạt ≥ 80% bài kiểm tra", () => S.tests.some(t => t.score / t.total >= .8), "#c78a00"],
  ["Từ điển sống", "Thuộc 30 từ vựng", () => Object.keys(S.known).length >= 30, "#7238e0"]
];
const medal = c => `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 4h10l4 16H24zM34 4h10l-4 16H30z" fill="${c}" opacity=".55"/><circle cx="32" cy="40" r="20" fill="${c}"/><circle cx="32" cy="40" r="14" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/><path d="M32 30l3 6.5 7 .8-5.2 4.8 1.5 7L32 45.6 25.7 49l1.5-7L22 37.3l7-.8z" fill="#fff"/></svg>`;
VIEWS.progress = () => {
  const done = Object.values(S.done), n = done.length;
  const avg = n ? Math.round(100 * done.reduce((a, d) => a + d.score / d.total, 0) / n) : 0;
  const best = S.tests.reduce((m, t) => Math.max(m, Math.round(100 * t.score / t.total)), 0);
  app.innerHTML = `<section class="band"><div class="wrap">
    <div><div class="crumbs"><a href="#home">Tổng quan</a> › Tiến độ</div><h1>Tiến độ học tập</h1>
      <form id="pn" class="row" style="margin:12px 0 18px"><input id="pni" class="search" style="max-width:260px;background:#fff;color:#141a2e" value="${esc(S.name)}" placeholder="Tên của bạn" aria-label="Tên của bạn"><button class="btn">Lưu tên</button></form>
      <div class="stat" style="color:var(--ink)"><div><b>${n}/${ALL.length}</b><span>bài hoàn thành</span></div><div><b>${avg}%</b><span>điểm trung bình</span></div><div><b>${streak()}</b><span>ngày liên tiếp</span></div><div><b>${best}%</b><span>kiểm tra cao nhất</span></div></div>
    </div>${passport()}</div></section>
  <div class="wrap">
    <div class="section-head" style="margin-top:0"><h2>Theo kỹ năng</h2></div>
    <div class="grid">${SK.map(k => { const s = D.skills[k], ds = D[k].map(l => S.done[l.id]).filter(Boolean); const a = ds.length ? Math.round(100 * ds.reduce((x, d) => x + d.score / d.total, 0) / ds.length) : 0;
      return `<div class="card" style="--k:${s.color}"><h3 style="color:${s.color}">${s.name}</h3><div class="bar"><i style="width:${100 * ds.length / D[k].length}%"></i></div><div class="meta" style="margin-top:8px"><span>${ds.length}/${D[k].length} bài</span><span>TB ${a}%</span></div></div>`; }).join("")}</div>

    <div class="section-head"><h2>Huy hiệu</h2><span class="muted">${BADGES.filter(b => b[2]()).length}/${BADGES.length} đã mở khóa</span></div>
    <div class="badges">${BADGES.map(([t, d, f, c]) => `<div class="badge ${f() ? "" : "off"}">${medal(c)}<b>${t}</b><span>${d}</span></div>`).join("")}</div>

    <div class="section-head"><h2>Chi tiết từng bài</h2></div>
    <div class="card" style="padding:8px 12px"><table class="stack"><thead><tr><th>Kỹ năng</th><th>Bài học</th><th style="text-align:right">Điểm cao nhất</th><th>Ngày</th></tr></thead><tbody>
      ${ALL.map(l => { const d = S.done[l.id]; return `<tr><td>${D.skills[l.skill].name}</td><td><a href="#${l.id}">${esc(l.title)}</a></td><td class="n">${d ? `${d.score}/${d.total} (${Math.round(100 * d.score / d.total)}%)` : "–"}</td><td>${d ? esc(d.date) : '<span class="muted">Chưa học</span>'}</td></tr>`; }).join("")}
    </tbody></table></div>

    <div class="section-head"><h2>Sao lưu &amp; khôi phục</h2></div>
    <div class="two"><div class="card"><h3>Sao lưu tiến độ</h3><p class="muted" style="font-size:15px">Tiến độ chỉ lưu trên trình duyệt này. Hãy sao chép hoặc tải mã sao lưu để chuyển sang máy khác hoặc nộp cho giáo viên.</p>
      <textarea class="editor" id="bk" style="min-height:120px;font-size:13px;font-family:ui-monospace,monospace" readonly>${esc(JSON.stringify(S))}</textarea>
      <div class="row" style="margin-top:10px"><button class="btn" id="bkc">${ic("copy")} Sao chép</button><button class="btn" id="bkd">${ic("down")} Tải tệp .json</button></div></div>
    <div class="card"><h3>Khôi phục</h3><p class="muted" style="font-size:15px">Dán mã sao lưu vào ô dưới rồi bấm Khôi phục.</p>
      <textarea class="editor" id="im" style="min-height:120px;font-size:13px;font-family:ui-monospace,monospace" placeholder='{"name": "...", "xp": ...}'></textarea>
      <div class="row" style="margin-top:10px"><button class="btn pri" id="imb">Khôi phục</button><button class="btn ghost" id="rs">Xóa toàn bộ tiến độ</button></div></div></div>
  </div>`;
  $("#pn").onsubmit = e => { e.preventDefault(); S.name = $("#pni").value.trim().slice(0, 40); save(); toast("Đã lưu tên"); route(); };
  $("#bkc").onclick = async () => { try { await navigator.clipboard.writeText($("#bk").value); toast("Đã sao chép mã sao lưu"); } catch (e) { $("#bk").select(); toast("Hãy nhấn Ctrl+C để sao chép"); } };
  $("#bkd").onclick = () => { try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([$("#bk").value], { type: "application/json" })); a.download = `b1-passport-${today()}.json`; document.body.append(a); a.click(); a.remove(); } catch (e) { toast("Không tải được – hãy dùng nút Sao chép"); } };
  $("#imb").onclick = () => { try { const o = JSON.parse($("#im").value); if (!o || typeof o !== "object" || !("done" in o)) throw 0; S = Object.assign(fresh(), o); save(); toast("Đã khôi phục tiến độ"); route(); } catch (e) { toast("Mã sao lưu không hợp lệ"); } };
  let rs = false;
  $("#rs").onclick = () => { if (!rs) { rs = true; $("#rs").textContent = "Bấm lần nữa để xóa hết"; return; } S = fresh(); save(); toast("Đã xóa toàn bộ tiến độ"); route(); };
};

/* ================= VSTEP: TRANG TỔNG QUAN & LUYỆN NÓI ================= */
let V = D.vstepSpeaking;
const VRUB = [
  ["Ngữ pháp", "Dùng đúng và đa dạng cấu trúc câu (đơn, ghép, phức)."],
  ["Từ vựng", "Đủ từ để diễn đạt ý, dùng từ chính xác, có cụm từ theo chủ đề."],
  ["Phát âm", "Rõ ràng, dễ hiểu; trọng âm và ngữ điệu tương đối tự nhiên."],
  ["Độ trôi chảy", "Ít ngập ngừng, nói đủ thời gian quy định."],
  ["Tổ chức diễn ngôn", "Ý mạch lạc, có từ nối, có lý do và ví dụ."]
];
const pick = a => a[Math.floor(Math.random() * a.length)];
function rubricBox(id) {
  return `<div class="card"><h3>Tự đánh giá theo tiêu chí VSTEP</h3><p class="muted" style="font-size:14px">Nghe lại bản ghi âm và chấm mỗi tiêu chí từ 1 (yếu) đến 5 (rất tốt).</p>
  <div class="rubric">${VRUB.map(([n, d], i) => `<label><b>${n}</b><span class="muted" style="font-size:13.5px">${d}</span><div class="rr" data-c="${i}">${[1, 2, 3, 4, 5].map(v => `<button type="button" data-v="${v}">${v}</button>`).join("")}</div></label>`).join("")}</div>
  <div class="row" style="margin-top:14px;justify-content:space-between"><b id="vTot">Tổng: 0/25</b><button class="btn pri" id="vSave">${ic("check")} Lưu đánh giá</button></div></div>`;
}
function bindRubric(id) {
  const m = VRUB.map(() => 0);
  $$(".rr").forEach(g => g.onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    m[+g.dataset.c] = +b.dataset.v;
    $$("button", g).forEach(x => x.classList.toggle("on", +x.dataset.v <= +b.dataset.v));
    $("#vTot").textContent = `Tổng: ${m.reduce((a, c) => a + c, 0)}/25`;
  });
  $("#vSave").onclick = () => { if (m.includes(0)) return toast("Hãy chấm đủ 5 tiêu chí."); complete(id, m.reduce((a, c) => a + c, 0), 25); };
}

/* ghi âm + chép lời dùng chung */
function makeRec(box) {
  let on = false, mr = null, stream = null, chunks = [], sr = null, tx = "", t0 = 0;
  const st = $(".rst", box), aud = $("audio", box), out = $(".rtx", box);
  const api = {
    get on() { return on; },
    async start() {
      if (on) return; on = true; tx = ""; t0 = Date.now(); out.innerHTML = ""; aud.hidden = true;
      st.textContent = "● Đang ghi âm…"; st.style.color = "var(--coral)";
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mr = new MediaRecorder(stream); chunks = [];
        mr.ondataavailable = e => chunks.push(e.data);
        const lid = CUR;
        mr.onstop = () => { const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" }); aud.src = URL.createObjectURL(blob); aud.hidden = false; stream.getTracks().forEach(t => t.stop()); offerUpload($(".rupl", box), blob, lid, () => tx); };
        mr.start();
      } catch (e) { st.textContent = "Không ghi âm được (cần cho phép micro và trang chạy qua https). Bạn vẫn có thể luyện nói theo đồng hồ."; st.style.color = ""; }
      if (SR) {
        sr = new SR(); sr.lang = "en-US"; sr.continuous = true; sr.interimResults = true;
        sr.onresult = e => { let it = ""; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) tx += e.results[i][0].transcript + " "; else it += e.results[i][0].transcript; } out.innerHTML = `<div class="exp" style="margin-top:12px"><b>Chép lời trực tiếp:</b> ${esc(tx)}<span class="muted">${esc(it)}</span></div>`; };
        sr.onend = () => { if (on) try { sr.start(); } catch (e) {} };
        try { sr.start(); } catch (e) {}
      }
    },
    stop() {
      if (!on) return; on = false; st.textContent = "Đã dừng ghi âm. Nghe lại bên dưới."; st.style.color = "";
      try { mr && mr.state !== "inactive" && mr.stop(); } catch (e) {}
      try { sr && sr.stop(); } catch (e) {}
      const secs = Math.max(1, (Date.now() - t0) / 1000), words = norm(tx).length;
      if (words) {
        const lk = findLinkers(tx);
        out.innerHTML = `<div class="card" style="margin-top:14px;box-shadow:none"><h3>Phân tích bài nói</h3>
        <div class="stat"><div><b>${words}</b><span>từ đã nói</span></div><div><b>${Math.round(words / secs * 60)}</b><span>từ/phút</span></div><div><b>${fmt(Math.round(secs))}</b><span>thời lượng</span></div><div><b>${lk.length}</b><span>từ nối khác nhau</span></div></div>
        <p style="margin:12px 0 4px"><b>Từ nối đã dùng:</b> ${lk.length ? lk.map(esc).join(", ") : "chưa có – hãy thêm because, so, however, for example…"}</p>
        <p class="muted" style="margin:0;font-size:15px"><b>Bản chép lời:</b> ${esc(tx)}</p></div>`;
      }
    },
    kill() { on = false; try { mr && mr.state !== "inactive" && mr.stop(); } catch (e) {} try { sr && sr.abort(); } catch (e) {} try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) {} }
  };
  cleanup.push(api.kill);
  return api;
}
const recHTML = `<div class="recbox" style="margin-top:16px"><div class="row"><span class="rst muted" style="font-size:14px">Bản ghi âm sẽ tự bắt đầu khi bạn bấm “Bắt đầu”.</span></div><audio controls hidden style="width:100%;margin-top:10px"></audio><div class="rupl"></div><div class="rtx"></div></div>`;

/* trình chạy kịch bản: đọc câu hỏi → đếm giờ → … */
let seqTok = 0, seqSkip = null;
function runSteps(steps, ui) {
  const tok = ++seqTok; let i = 0;
  cleanup.push(() => { seqTok++; });
  const next = () => {
    if (tok !== seqTok) return;
    clearTimers(); seqSkip = null;
    if (i >= steps.length) { ui.done(); return; }
    const s = steps[i++];
    ui.step(s, i, steps.length);
    if (s.say) {
      seqSkip = () => { if (TTS) speechSynthesis.cancel(); next(); };
      if (!TTS) { setTimeout(() => tok === seqTok && next(), 2500); return; }
      speechSynthesis.cancel();
      const u = utter(s.say, 1, .9);
      let fired = false;
      const go = () => { if (fired || tok !== seqTok) return; fired = true; setTimeout(next, 350); };
      u.onend = go; u.onerror = go;
      setTimeout(() => speechSynthesis.speak(u), 60);
      const guard = setTimeout(go, 4000 + s.say.split(" ").length * 600);
      cleanup.push(() => clearTimeout(guard));
    } else if (s.wait) {
      let left = s.wait; ui.clock(left, s);
      const t = setInterval(() => { left--; ui.clock(Math.max(0, left), s); if (left <= 0) { clearInterval(t); timers.delete(t); next(); } }, 1000);
      timers.add(t);
      seqSkip = () => { clearInterval(t); timers.delete(t); next(); };
    } else next();
  };
  next();
  return { skip: () => seqSkip && seqSkip(), stop: () => { seqTok++; clearTimers(); if (TTS) speechSynthesis.cancel(); } };
}
function stageCard(extra = "") {
  return `<div class="card">
    <div class="row" style="justify-content:space-between;align-items:flex-end">
      <div><div class="muted" id="sLabel" style="font-weight:600">Sẵn sàng</div><div class="timer" id="sClock">--:--</div></div>
      <div class="row"><button class="btn pri" id="sGo">${ic("play")} Bắt đầu</button><button class="btn" id="sSkip" disabled>Bỏ qua bước này ${ic("arrow")}</button><button class="btn ghost" id="sStop" disabled>${ic("stop")} Dừng</button></div>
    </div>
    <div class="bar" style="--k:var(--c-s);margin-top:14px"><i id="sBar" style="width:0"></i></div>
    ${extra}${recHTML}</div>`;
}
function wireStage(buildSteps, onStep) {
  const rec = makeRec($(".recbox"));
  let run = null;
  const ui = {
    step: (s, i, n) => { $("#sBar").style.width = (100 * i / n) + "%"; $("#sLabel").textContent = s.label || (s.say ? "Giám khảo đang hỏi…" : ""); if (s.say) $("#sClock").textContent = "··"; onStep && onStep(s); },
    clock: (left, s) => { const c = $("#sClock"); if (!c) return; c.textContent = fmt(left); c.classList.toggle("warn", left <= 10 && !s.prep); },
    done: () => { rec.stop(); $("#sLabel").textContent = "Hoàn thành! Nghe lại bản ghi và tự đánh giá bên dưới."; $("#sClock").textContent = "✓"; $("#sGo").disabled = false; $("#sGo").innerHTML = ic("redo") + " Làm lại"; $("#sSkip").disabled = $("#sStop").disabled = true; toast("Đã hoàn thành phần nói"); }
  };
  $("#sGo").onclick = () => {
    stopAudio(); $("#sGo").disabled = true; $("#sSkip").disabled = $("#sStop").disabled = false;
    rec.start(); run = runSteps(buildSteps(), ui);
  };
  $("#sSkip").onclick = () => run && run.skip();
  $("#sStop").onclick = () => { if (run) run.stop(); rec.stop(); $("#sLabel").textContent = "Đã dừng."; $("#sGo").disabled = false; $("#sGo").innerHTML = ic("redo") + " Làm lại"; $("#sSkip").disabled = $("#sStop").disabled = true; };
}
function chooser(list, label, cur) {
  return `<div class="row" style="margin-bottom:14px"><label class="row" style="gap:8px;font-weight:600">${label}
    <select id="vPick" style="max-width:min(100%,520px)">${list.map((x, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>${i + 1}. ${esc(x)}</option>`).join("")}</select></label>
    <button class="btn sm" id="vRand">${ic("shuffle")} Ngẫu nhiên</button></div>`;
}
function bindChooser(n, set) {
  const go = i => { stopAudio(); clearTimers(); cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = []; set(i); window.scrollTo(0, 0); };
  $("#vPick").onchange = e => go(+e.target.value);
  $("#vRand").onclick = () => go(Math.floor(Math.random() * n));
}
const vHead = (l, intro) => head(l) + `<div class="wrap"><p class="muted" style="max-width:75ch;margin-top:-8px">${intro}</p>`;
const mindmap = t => `<div class="mind"><div class="mc">${esc(t.topic)}</div><div class="mb">${t.ideas.map(x => `<div>${esc(x)}</div>`).join("")}<div class="own">Ý của riêng bạn…</div></div></div>`;
const optCards = (sv, show) => `<div class="opts3">${sv.options.map((o, i) => `<div class="oc"><b>${"ABC"[i]}. ${esc(o)}</b>${sv.ideas && show ? `<div class="pc"><span>+</span> ${esc(sv.ideas[i][0])}</div><div class="pc n"><span>–</span> ${esc(sv.ideas[i][1])}</div>` : ""}</div>`).join("")}</div>`;

const VS = {};
VS.p1 = (l, cur = Math.floor(Math.random() * V.part1.length)) => {
  const t = V.part1[cur];
  app.innerHTML = vHead(l, "Part 1 kéo dài khoảng 3 phút. Giám khảo hỏi 3–6 câu về 2 chủ đề quen thuộc. Trả lời trực tiếp, thêm lý do hoặc ví dụ, khoảng 20–30 giây mỗi câu.") + `<div class="two"><div>
    ${chooser(V.part1.map(x => x.topic), "Chủ đề:", cur)}
    <div class="card"><h2>${esc(t.topic)}</h2><ol class="p1q">${t.qs.map((q, i) => `<li data-i="${i}">${esc(q)} <button class="btn sm ghost" data-say="${esc(q)}" aria-label="Nghe câu hỏi" style="min-height:30px;padding:2px 6px">${ic("sound")}</button></li>`).join("")}</ol></div>
    ${stageCard()}
  </div><div class="stick">
    <div class="card"><h3>Cách mở đầu câu trả lời</h3><div class="row">${V.starters.map(p => `<button class="btn sm" data-say="${esc(p.replace(/…/g, ""))}">${esc(p)}</button>`).join("")}</div>
    <p class="muted" style="font-size:14px;margin:12px 0 0">Công thức gợi ý: <b>Trả lời trực tiếp → Lý do → Ví dụ/ chi tiết</b>. Tránh trả lời chỉ “Yes/No”.</p></div>
    ${rubricBox(l.id)}
  </div></div>${pager(l)}</div>`;
  bindChooser(V.part1.length, i => VS.p1(l, i));
  wireStage(() => [
    { say: `Let's talk about ${t.topic.toLowerCase()}.`, label: "Giới thiệu chủ đề" },
    ...t.qs.flatMap((q, i) => [{ say: q, label: `Câu hỏi ${i + 1}`, qi: i }, { wait: 30, label: `Trả lời câu ${i + 1} (30 giây)`, qi: i }])
  ], s => { if (s.qi != null) $$(".p1q li").forEach(li => li.classList.toggle("now", +li.dataset.i === s.qi)); });
  bindRubric(l.id);
};
VS.p2 = (l, cur = Math.floor(Math.random() * V.part2.length)) => {
  const sv = V.part2[cur];
  app.innerHTML = vHead(l, "Part 2 kéo dài khoảng 4 phút: 1 phút chuẩn bị và khoảng 2–3 phút nói. Chọn phương án tốt nhất, giải thích vì sao chọn và vì sao không chọn hai phương án còn lại.") + `<div class="two"><div>
    ${chooser(V.part2.map(x => x.sit), "Tình huống:", cur)}
    <div class="card"><h2>Situation</h2><p style="font-size:18px">${esc(sv.sit)}</p><div id="oc">${optCards(sv, false)}</div>
    <button class="btn sm" id="ideaT" style="margin-top:12px">Hiện gợi ý ưu/ nhược điểm</button></div>
    ${stageCard()}
  </div><div class="stick">
    <div class="card"><h3>Khung trả lời</h3><ol style="margin:0;padding-left:20px">${V.frame.map(p => `<li style="margin-bottom:4px">${esc(p)}</li>`).join("")}</ol></div>
    ${sv.model ? `<div class="card"><details><summary>Bài nói mẫu</summary><p style="margin-top:0">${esc(sv.model)}</p><button class="btn sm" data-say="${esc(sv.model)}">${ic("sound")} Nghe bài mẫu</button></details></div>` : `<div class="card"><p class="muted" style="margin:0;font-size:15px">Tình huống có bài mẫu: số 1, 3, 4 và 12. Hãy tham khảo cách lập luận rồi áp dụng cho tình huống này.</p></div>`}
    ${rubricBox(l.id)}
  </div></div>${pager(l)}</div>`;
  bindChooser(V.part2.length, i => VS.p2(l, i));
  let show = false;
  $("#ideaT").onclick = () => { show = !show; $("#oc").innerHTML = optCards(sv, show); $("#ideaT").textContent = show ? "Ẩn gợi ý" : "Hiện gợi ý ưu/ nhược điểm"; };
  wireStage(() => [
    { say: `Here is the situation. ${sv.sit} The options are: ${sv.options.join("; ")}. You have one minute to prepare.`, label: "Giám khảo đọc tình huống" },
    { wait: 60, label: "Chuẩn bị (1 phút) – ghi chú lý do", prep: true },
    { say: "Now, please tell me which option you choose and why.", label: "Bắt đầu nói" },
    { wait: 150, label: "Trình bày (2 phút 30 giây)" }
  ]);
  bindRubric(l.id);
};
VS.p3 = (l, cur = Math.floor(Math.random() * V.part3.length)) => {
  const t = V.part3[cur];
  app.innerHTML = vHead(l, "Part 3 kéo dài khoảng 5 phút: 1 phút chuẩn bị, khoảng 2 phút trình bày theo sơ đồ ý (có thể thêm ý riêng), sau đó trả lời câu hỏi mở rộng.") + `<div class="two"><div>
    ${chooser(V.part3.map(x => x.topic), "Chủ đề:", cur)}
    <div class="card"><h2>Topic</h2>${mindmap(t)}
      <h3 style="margin-top:18px">Câu hỏi mở rộng</h3><ol class="p1q" style="margin:0">${t.follow.map((q, i) => `<li data-i="${i}">${esc(q)}</li>`).join("")}</ol></div>
    ${stageCard()}
  </div><div class="stick">
    <div class="card"><h3>Ngôn ngữ trình bày</h3><div class="row">${V.p3lang.map(p => `<button class="btn sm" data-say="${esc(p.replace(/…/g, ""))}">${esc(p)}</button>`).join("")}</div></div>
    ${t.model ? `<div class="card"><details><summary>Bài nói mẫu</summary><p style="margin-top:0">${esc(t.model)}</p><button class="btn sm" data-say="${esc(t.model)}">${ic("sound")} Nghe bài mẫu</button></details></div>` : `<div class="card"><p class="muted" style="margin:0;font-size:15px">Chủ đề có bài mẫu: số 1 và 7. Cấu trúc gợi ý: mở đầu → 3 ý (mỗi ý có giải thích + ví dụ) → ý riêng → kết luận.</p></div>`}
    ${rubricBox(l.id)}
  </div></div>${pager(l)}</div>`;
  bindChooser(V.part3.length, i => VS.p3(l, i));
  wireStage(() => [
    { say: `Your topic is: ${t.topic} You can use the ideas given and your own ideas. You have one minute to prepare.`, label: "Giám khảo giới thiệu chủ đề" },
    { wait: 60, label: "Chuẩn bị (1 phút)", prep: true },
    { say: "Please begin your talk.", label: "Bắt đầu trình bày" },
    { wait: 120, label: "Trình bày (2 phút)" },
    ...t.follow.flatMap((q, i) => [{ say: q, label: `Câu hỏi mở rộng ${i + 1}`, qi: i }, { wait: 30, label: `Trả lời câu hỏi mở rộng ${i + 1}`, qi: i }])
  ], s => { if (s.qi != null) $$(".p1q li").forEach(li => li.classList.toggle("now", +li.dataset.i === s.qi)); });
  bindRubric(l.id);
};
VS.mock = l => {
  app.innerHTML = vHead(l, "Bài thi mô phỏng 12 phút theo đúng trình tự VSTEP. Đề được chọn ngẫu nhiên từ ngân hàng câu hỏi. Hãy đeo tai nghe, cho phép micro, và nói liên tục như khi thi thật.") + `<div class="two"><div>
    <div class="card" id="stage"><h2>Sẵn sàng?</h2><p>Bài thi gồm: <b>Part 1</b> (2 chủ đề × 3 câu, 30 giây/câu) → <b>Part 2</b> (1 phút chuẩn bị, 2 phút nói) → <b>Part 3</b> (1 phút chuẩn bị, 2 phút trình bày, 2 câu hỏi mở rộng).</p><p class="muted" style="margin:0">Bấm “Bắt đầu” để nhận đề.</p></div>
    ${stageCard()}
  </div><div class="stick">
    <div class="card"><h3>Lưu ý khi thi nói VSTEP</h3><ul style="margin:0;padding-left:20px;font-size:15px">
      <li>Part 1: trả lời trực tiếp + lý do + ví dụ, đừng chỉ nói “Yes/No”.</li>
      <li>Part 2: nói rõ lựa chọn, giải thích, phản bác 2 lựa chọn còn lại.</li>
      <li>Part 3: dùng cả 3 ý gợi ý và thêm ít nhất 1 ý riêng.</li>
      <li>Thang VSTEP: từ 4.0/10 trở lên được xếp bậc 3 (B1).</li></ul></div>
    ${rubricBox(l.id)}
  </div></div>${pager(l)}</div>`;
  const stage = $("#stage");
  wireStage(() => {
    const [a, b] = [...V.part1].sort(() => Math.random() - .5);
    const p2 = pick(V.part2), p3 = pick(V.part3), f = [...p3.follow].sort(() => Math.random() - .5).slice(0, 2);
    const v1 = (t, q) => `<span class="chip">Part 1 · Social interaction</span><h2 style="margin-top:10px">${esc(t.topic)}</h2><p style="font-size:19px;font-weight:600">${esc(q)}</p>`;
    const v2 = `<span class="chip">Part 2 · Solution discussion</span><p style="font-size:18px;margin-top:10px">${esc(p2.sit)}</p>${optCards(p2, false)}`;
    const v3 = `<span class="chip">Part 3 · Topic development</span>${mindmap(p3)}`;
    return [
      { say: "Welcome to the speaking test. Part one. Social interaction.", label: "Part 1", view: `<span class="chip">Part 1 · Social interaction</span><h2 style="margin-top:10px">Part 1</h2>` },
      ...[a, b].flatMap(t => [
        { say: `Let's talk about ${t.topic.toLowerCase()}.`, label: "Part 1 – chủ đề mới", view: v1(t, "") },
        ...t.qs.flatMap(q => [{ say: q, label: "Part 1 – câu hỏi", view: v1(t, q) }, { wait: 30, label: "Part 1 – trả lời (30 giây)" }])
      ]),
      { say: `Part two. Solution discussion. ${p2.sit} The options are: ${p2.options.join("; ")}. You have one minute to prepare.`, label: "Part 2", view: v2 },
      { wait: 60, label: "Part 2 – chuẩn bị (1 phút)", prep: true },
      { say: "Please start now.", label: "Part 2 – bắt đầu nói" },
      { wait: 120, label: "Part 2 – trình bày (2 phút)" },
      { say: `Part three. Topic development. Your topic is: ${p3.topic} You have one minute to prepare.`, label: "Part 3", view: v3 },
      { wait: 60, label: "Part 3 – chuẩn bị (1 phút)", prep: true },
      { say: "Please begin.", label: "Part 3 – bắt đầu trình bày" },
      { wait: 120, label: "Part 3 – trình bày (2 phút)" },
      ...f.flatMap(q => [{ say: q, label: "Part 3 – câu hỏi mở rộng", view: v3 + `<p style="font-size:18px;font-weight:600;margin-top:14px">${esc(q)}</p>` }, { wait: 30, label: "Part 3 – trả lời (30 giây)" }]),
      { say: "That is the end of the speaking test. Thank you.", label: "Kết thúc", view: `<h2>Kết thúc bài thi</h2><p>Nghe lại bản ghi âm, xem phân tích bên dưới và tự đánh giá theo 5 tiêu chí.</p>` }
    ];
  }, s => { if (s.view) stage.innerHTML = s.view; });
  bindRubric(l.id);
};

VIEWS.vstep = () => {
  const vs = ALL.filter(l => l.vstep), dn = vs.filter(l => S.done[l.id]).length;
  const rows = [
    ["Nghe", "3 phần, 35 câu trắc nghiệm: thông báo ngắn (8), hội thoại (12), bài giảng/ bài nói (15)", "khoảng 40 phút", "listening"],
    ["Đọc", "4 bài đọc, 40 câu trắc nghiệm (ý chính, chi tiết, từ vựng, suy luận)", "60 phút", "reading"],
    ["Viết", "Task 1: thư/ email ≥ 120 từ (1/3 điểm) · Task 2: bài luận ≥ 250 từ (2/3 điểm)", "60 phút", "writing"],
    ["Nói", "Part 1 tương tác xã hội · Part 2 thảo luận giải pháp · Part 3 phát triển chủ đề", "12 phút", "speaking"]
  ];
  app.innerHTML = `<section class="band"><div class="wrap">
    <div><div class="crumbs"><a href="#home">Tổng quan</a> › VSTEP</div>
      <h1>Luyện thi VSTEP bậc 3 (B1)</h1>
      <p>VSTEP là bài thi đánh giá năng lực tiếng Anh từ bậc 3 đến bậc 5 theo Khung năng lực ngoại ngữ 6 bậc dùng cho Việt Nam. Điểm trung bình 4 kỹ năng từ 4.0/10 được xếp bậc 3 (B1). Khu vực này gồm ${vs.length} hoạt động mới, biên soạn theo đúng định dạng từng phần thi.</p>
      <div class="row"><a class="btn pri" href="#vsmock">${ic("mic")} Thi thử nói 12 phút</a><a class="btn" href="#test">${ic("test")} Kiểm tra ngữ pháp & từ vựng</a></div></div>
    <div class="card" style="color:var(--ink)"><h3>Tiến độ VSTEP</h3><div class="stat"><div><b>${dn}/${vs.length}</b><span>hoạt động đã xong</span></div>${SK.map(k => { const a = vs.filter(l => l.skill === k); return `<div><b>${a.filter(l => S.done[l.id]).length}/${a.length}</b><span>${D.skills[k].name}</span></div>`; }).join("")}</div></div>
  </div></section>
  <div class="wrap">
    <div class="section-head" style="margin-top:0"><h2>Cấu trúc bài thi</h2></div>
    <div class="card" style="padding:8px 12px"><table class="stack"><thead><tr><th>Kỹ năng</th><th>Cấu trúc</th><th>Thời gian</th></tr></thead><tbody>${rows.map(r => `<tr><td><b style="color:${D.skills[r[3]].color}">${r[0]}</b></td><td>${r[1]}</td><td style="white-space:nowrap">${r[2]}</td></tr>`).join("")}</tbody></table></div>
    ${SK.map(k => { const a = vs.filter(l => l.skill === k); return `<div class="section-head"><h2>${D.skills[k].name}</h2><a href="#${k}">Xem tất cả bài ${D.skills[k].name.toLowerCase()}</a></div>
      <div class="grid">${a.map(l => `<a class="card lesson" href="#${l.id}" style="--k:${D.skills[k].color}"><span class="num">${esc(l.type)}</span><h3>${esc(l.title)}</h3><div class="row"><span class="chip">${esc(l.topic)}</span><span class="chip">${l.mins} phút</span></div>${S.done[l.id] ? `<span class="done-tag">✓ ${S.done[l.id].score}/${S.done[l.id].total}</span>` : `<span class="muted" style="font-size:14px">Chưa làm</span>`}</a>`).join("")}</div>`; }).join("")}
    <p class="muted" style="font-size:14px;margin-top:28px">Toàn bộ bài nghe, bài đọc, đề viết, đề nói và bài mẫu trong khu vực này được biên soạn mới theo cấu trúc đề VSTEP; không trích từ đề thi chính thức hay sách luyện thi đã xuất bản.</p>
  </div>`;
};

/* ================= TÀI KHOẢN & MÁY CHỦ (Supabase) ================= */
const CFG = window.B1_CONFIG || {};
const ONLINE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase && window.supabase.createClient);
let sb = null, USER = null, PROFILE = null, MYCLASS = null;
const clone = o => JSON.parse(JSON.stringify(o));
const BASE = { lessons: {}, grammar: [], vstepSpeaking: null, plan: [] };
let DBROWS = {};
const isStaff = () => !!PROFILE && (PROFILE.role === "teacher" || PROFILE.role === "admin");
const isAdmin = () => !!PROFILE && PROFILE.role === "admin";
const fmtDate = s => s ? new Date(s).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "–";
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;

function snapshotBase() {
  D.grammar.forEach((g, i) => { if (!g.id) g.id = "g" + (i + 1); });
  SK.forEach(k => D[k].forEach(l => { const c = clone(l); delete c.n; c.skill = k; BASE.lessons[l.id] = c; }));
  BASE.grammar = clone(D.grammar); BASE.vstepSpeaking = clone(D.vstepSpeaking); BASE.plan = clone(D.plan);
}
function applyContent() {
  SK.forEach(k => { D[k] = Object.values(BASE.lessons).filter(l => l.skill === k).map(clone); });
  D.grammar = clone(BASE.grammar); D.vstepSpeaking = clone(BASE.vstepSpeaking); D.plan = clone(BASE.plan);
  Object.values(DBROWS).sort((a, b) => String(a.updated_at || "").localeCompare(String(b.updated_at || ""))).forEach(r => {
    if (r.kind === "lesson") {
      const arr = D[r.skill]; if (!arr) return;
      const i = arr.findIndex(l => l.id === r.id);
      if (r.hidden) { if (i >= 0) arr.splice(i, 1); return; }
      const o = Object.assign(clone(r.data), { id: r.id });
      if (i >= 0) arr[i] = o; else arr.push(o);
    } else if (r.kind === "grammar") {
      const i = D.grammar.findIndex(g => g.id === r.id);
      if (r.hidden) { if (i >= 0) D.grammar.splice(i, 1); return; }
      const o = Object.assign(clone(r.data), { id: r.id });
      if (i >= 0) D.grammar[i] = o; else D.grammar.push(o);
    } else if (r.kind === "bank" && !r.hidden) {
      if (r.id === "vstepSpeaking" && r.data && r.data.part1) D.vstepSpeaking = clone(r.data);
      if (r.id === "plan" && Array.isArray(r.data)) D.plan = clone(r.data);
    }
  });
  rebuild();
}

/* ---- đồng bộ tiến độ ---- */
let pushT = null;
function schedulePush() { if (!USER) return; clearTimeout(pushT); pushT = setTimeout(pushState, 2500); }
async function pushState() {
  if (!USER) return;
  const { error } = await sb.from("progress").upsert({ user_id: USER.id, state: S, updated_at: new Date().toISOString() });
  if (error) console.warn("progress sync", error);
}
function mergeState(a, b) {
  b = b || {};
  const o = fresh();
  o.name = a.name || b.name || ""; o.xp = Math.max(a.xp || 0, b.xp || 0);
  o.done = Object.assign({}, b.done);
  for (const [k, v] of Object.entries(a.done || {})) { const r = o.done[k]; if (!r || v.score / v.total > r.score / r.total) o.done[k] = v; }
  o.drafts = Object.assign({}, b.drafts, Object.fromEntries(Object.entries(a.drafts || {}).filter(([, v]) => v && v.trim())));
  o.shadow = Object.assign({}, b.shadow); for (const [k, v] of Object.entries(a.shadow || {})) o.shadow[k] = Math.max(v, o.shadow[k] || 0);
  o.known = Object.assign({}, b.known, a.known);
  const seen = new Set();
  o.tests = [...(b.tests || []), ...(a.tests || [])].filter(t => { const k = JSON.stringify(t); if (seen.has(k)) return false; seen.add(k); return true; });
  o.days = [...new Set([...(b.days || []), ...(a.days || [])])].sort().slice(-180);
  return o;
}
function logResult(row) {
  if (!USER) return Promise.resolve();
  return sb.from("results").insert(Object.assign({ user_id: USER.id, kind: "auto", detail: {} }, row)).then(({ error }) => { if (error) console.warn("result", error); return error; });
}
async function loadProfile() {
  const { data: p } = await sb.from("profiles").select("*").eq("id", USER.id);
  PROFILE = (p && p[0]) || { id: USER.id, email: USER.email, role: "student" };
  MYCLASS = null;
  if (PROFILE.class_id) { const { data: c } = await sb.from("classes").select("*").eq("id", PROFILE.class_id); MYCLASS = (c && c[0]) || null; }
}
async function onLogin(user) {
  USER = user;
  await loadProfile();
  const { data: pr } = await sb.from("progress").select("*").eq("user_id", user.id);
  const local = (S.owner && S.owner !== user.id) ? fresh() : S;
  S = mergeState(local, pr && pr[0] && pr[0].state);
  S.owner = user.id;
  if (PROFILE.full_name) S.name = PROFILE.full_name;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  updXP(); updAcct();
  await pushState();
}
async function logout() {
  clearTimeout(pushT); await pushState();
  await sb.auth.signOut();
  USER = PROFILE = MYCLASS = null; S = fresh(); ADM.loaded = false;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  updXP(); updAcct(); toast("Đã đăng xuất"); location.hash = "#home"; route();
}
function updAcct() {
  const a = $("#acct"), n = $("#navAdmin");
  if (!a) return;
  a.hidden = !ONLINE; n.hidden = !isStaff();
  if (USER) { a.textContent = (PROFILE && PROFILE.full_name || USER.email || "Tài khoản").split(" ").slice(-1)[0]; a.href = "#account"; a.title = "Tài khoản của tôi"; }
  else { a.textContent = "Đăng nhập"; a.href = "#login"; a.title = "Đăng nhập hoặc đăng ký"; }
}

/* ---- nộp bài ghi âm ---- */
function offerUpload(el, blob, lessonId, getTx) {
  if (!el) return;
  if (!USER || !lessonId) { el.innerHTML = ONLINE ? `<p class="muted" style="font-size:14px;margin:8px 0 0"><a href="#login">Đăng nhập</a> để gửi bản ghi cho giáo viên nhận xét.</p>` : ""; return; }
  el.innerHTML = `<div class="row" style="margin-top:10px"><button class="btn sm pri" type="button">${ic("down").replace("M12 3v13M6 11l6 6 6-6", "M12 21V8M6 13l6-6 6 6")} Gửi bản ghi cho giáo viên</button><span class="muted" style="font-size:14px"></span></div>`;
  const b = $("button", el), st = $("span", el);
  b.onclick = async () => {
    b.disabled = true; st.textContent = "Đang tải lên…";
    const path = `${USER.id}/${lessonId}-${Date.now()}.webm`;
    const up = await sb.storage.from("recordings").upload(path, blob, { contentType: blob.type || "audio/webm" });
    if (up.error) { st.textContent = "Lỗi tải lên: " + up.error.message; b.disabled = false; return; }
    const err = await logResult({ lesson_id: lessonId, kind: "speaking", detail: { path, transcript: (getTx && getTx() || "").slice(0, 5000), size: blob.size } });
    st.textContent = err ? "Đã tải bản ghi nhưng chưa lưu được thông tin bài nộp." : "Đã gửi! Giáo viên sẽ nhận xét trong mục Tài khoản.";
  };
}

/* ---- bài nộp của tôi ---- */
async function mySubs(el, lessonId) {
  if (!el || !USER) return;
  let q = sb.from("results").select("*").eq("user_id", USER.id);
  if (lessonId) q = q.eq("lesson_id", lessonId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
  if (error) { el.innerHTML = `<p class="muted">Không tải được bài nộp.</p>`; return; }
  const subs = (data || []).filter(r => r.kind === "writing" || r.kind === "speaking");
  el.innerHTML = subs.length ? subs.map(r => `<div class="sub">
    <div class="row" style="justify-content:space-between"><b>${esc((BY[r.lesson_id] || {}).title || r.lesson_id)}</b><span class="muted" style="font-size:13px">${r.kind === "writing" ? "Bài viết" : "Bản ghi âm"} · ${fmtDate(r.created_at)}</span></div>
    ${r.kind === "writing" ? `<details><summary>Xem bài đã nộp (${esc(r.detail.words || "")} từ)</summary><div class="model">${esc(r.detail.text || "")}</div></details>` : r.detail.transcript ? `<p class="muted" style="font-size:14px;margin:6px 0">Chép lời: ${esc(r.detail.transcript)}</p>` : ""}
    ${r.reviewed_at ? `<div class="fbk-t"><b>Nhận xét của giáo viên${r.teacher_score != null ? ` · Điểm ${esc(r.teacher_score)}/10` : ""}</b><p style="margin:4px 0 0;white-space:pre-line">${esc(r.feedback || "")}</p></div>` : `<span class="chip">Đang chờ giáo viên nhận xét</span>`}
  </div>`).join("") : `<p class="muted" style="margin:0">Chưa có bài nộp nào.</p>`;
}

/* ================= TRANG ĐĂNG NHẬP / TÀI KHOẢN ================= */
const offlineNote = `<div class="card"><h2>Chưa kết nối máy chủ</h2><p>Website đang chạy ở chế độ học cá nhân (tiến độ lưu trên trình duyệt). Để bật tài khoản học viên, lớp học và trang quản trị, quản trị viên cần cấu hình Supabase trong tệp <code>assets/config.js</code> theo hướng dẫn trong README.</p><a class="btn" href="#home">Về trang chủ</a></div>`;
const simpleBand = (t, sub) => `<section class="band slim"><div class="wrap"><div><div class="crumbs"><a href="#home">Tổng quan</a> › ${t}</div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ""}</div></div></section>`;
VIEWS.login = () => {
  if (!ONLINE) { app.innerHTML = simpleBand("Đăng nhập") + `<div class="wrap">${offlineNote}</div>`; return; }
  if (USER) { location.hash = "#account"; return; }
  app.innerHTML = simpleBand("Đăng nhập", "Đăng nhập để lưu tiến độ lên tài khoản, tham gia lớp học và nộp bài cho giáo viên.") + `<div class="wrap"><div class="auth card">
    <div class="tabs" role="tablist"><button class="on" data-t="in" role="tab">Đăng nhập</button><button data-t="up" role="tab">Đăng ký</button><button data-t="fg" role="tab">Quên mật khẩu</button></div>
    <form id="fIn" class="fgrid"><label class="field">Email<input type="email" name="email" required autocomplete="email"></label><label class="field">Mật khẩu<input type="password" name="pw" required autocomplete="current-password"></label><button class="btn pri">Đăng nhập</button></form>
    <form id="fUp" class="fgrid" hidden><label class="field">Họ và tên<input name="name" required maxlength="120" autocomplete="name"></label><label class="field">Email<input type="email" name="email" required autocomplete="email"></label><label class="field">Mật khẩu (ít nhất 6 ký tự)<input type="password" name="pw" required minlength="6" autocomplete="new-password"></label><label class="field">Mã lớp (do giáo viên cung cấp, có thể bỏ trống)<input name="code" maxlength="12" style="text-transform:uppercase" autocomplete="off"></label><button class="btn pri">Tạo tài khoản</button></form>
    <form id="fFg" class="fgrid" hidden><label class="field">Email đã đăng ký<input type="email" name="email" required></label><button class="btn pri">Gửi email đặt lại mật khẩu</button></form>
    <p id="aMsg" class="muted" style="margin:14px 0 0" role="status"></p></div></div>`;
  const msg = t => $("#aMsg").textContent = t;
  $$(".tabs button").forEach(b => b.onclick = () => { $$(".tabs button").forEach(x => x.classList.toggle("on", x === b)); $("#fIn").hidden = b.dataset.t !== "in"; $("#fUp").hidden = b.dataset.t !== "up"; $("#fFg").hidden = b.dataset.t !== "fg"; msg(""); });
  const busy = (f, on) => { $("button", f).disabled = on; };
  $("#fIn").onsubmit = async e => {
    e.preventDefault(); const f = e.target; busy(f, true); msg("Đang đăng nhập…");
    const { data, error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.pw.value });
    busy(f, false);
    if (error) return msg(/confirm/i.test(error.message) ? "Email chưa được xác nhận. Hãy mở email xác nhận rồi thử lại." : "Đăng nhập không thành công: sai email hoặc mật khẩu.");
    await onLogin(data.user); toast("Xin chào " + (PROFILE.full_name || "")); location.hash = isStaff() ? "#admin" : "#home";
  };
  $("#fUp").onsubmit = async e => {
    e.preventDefault(); const f = e.target; busy(f, true); msg("Đang tạo tài khoản…");
    const { data, error } = await sb.auth.signUp({ email: f.email.value.trim(), password: f.pw.value, options: { data: { full_name: f.name.value.trim(), class_code: f.code.value.trim().toUpperCase() }, emailRedirectTo: location.origin + location.pathname } });
    busy(f, false);
    if (error) return msg("Không tạo được tài khoản: " + error.message);
    if (data.session) { await onLogin(data.user); toast("Đã tạo tài khoản"); location.hash = "#account"; }
    else msg("Đã tạo tài khoản. Hãy mở email để xác nhận, sau đó đăng nhập.");
  };
  $("#fFg").onsubmit = async e => {
    e.preventDefault(); const f = e.target; busy(f, true);
    const { error } = await sb.auth.resetPasswordForEmail(f.email.value.trim(), { redirectTo: location.origin + location.pathname });
    busy(f, false); msg(error ? "Không gửi được email: " + error.message : "Đã gửi email. Hãy mở liên kết trong email để đặt mật khẩu mới.");
  };
};
VIEWS.reset = () => {
  if (!ONLINE) { app.innerHTML = simpleBand("Đặt lại mật khẩu") + `<div class="wrap">${offlineNote}</div>`; return; }
  app.innerHTML = simpleBand("Đặt lại mật khẩu") + `<div class="wrap"><form class="card auth fgrid" id="fRs"><label class="field">Mật khẩu mới (ít nhất 6 ký tự)<input type="password" name="pw" minlength="6" required autocomplete="new-password"></label><button class="btn pri">Lưu mật khẩu mới</button><p id="rMsg" class="muted" style="margin:0"></p></form></div>`;
  $("#fRs").onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: e.target.pw.value });
    $("#rMsg").textContent = error ? "Không đổi được mật khẩu: " + error.message : "Đã đổi mật khẩu.";
    if (!error) setTimeout(() => location.hash = "#account", 900);
  };
};
VIEWS.account = async () => {
  if (!ONLINE) { app.innerHTML = simpleBand("Tài khoản") + `<div class="wrap">${offlineNote}</div>`; return; }
  if (!USER) { location.hash = "#login"; return; }
  const RL = { student: "Học viên", teacher: "Giáo viên", admin: "Quản trị viên" };
  app.innerHTML = simpleBand("Tài khoản của tôi") + `<div class="wrap"><div class="two"><div>
    <div class="card"><h2>Thông tin</h2>
      <form id="fName" class="row"><input class="search" name="n" value="${esc(PROFILE.full_name || "")}" maxlength="120" style="max-width:320px" aria-label="Họ và tên"><button class="btn">Lưu họ tên</button></form>
      <p style="margin:12px 0 0">Email: <b>${esc(USER.email || "")}</b> · Vai trò: <span class="chip">${RL[PROFILE.role] || PROFILE.role}</span></p>
      <p style="margin:8px 0 0">Lớp: ${MYCLASS ? `<b>${esc(MYCLASS.name)}</b>` : `<span class="muted">chưa tham gia lớp nào</span>`}</p>
      <form id="fJoin" class="row" style="margin-top:12px"><input class="search" name="c" placeholder="Nhập mã lớp" maxlength="12" style="max-width:200px;text-transform:uppercase" aria-label="Mã lớp"><button class="btn">${MYCLASS ? "Chuyển lớp" : "Tham gia lớp"}</button></form>
      <div class="row" style="margin-top:16px">${isStaff() ? `<a class="btn pri" href="#admin">Vào trang quản trị</a>` : ""}<a class="btn" href="#reset">Đổi mật khẩu</a><button class="btn ghost" id="out">Đăng xuất</button></div>
    </div>
    <div class="card"><h2>Bài nộp &amp; nhận xét của giáo viên</h2><div id="subs"><p class="muted">Đang tải…</p></div></div>
  </div><div class="stick"><div class="card"><h3>Đồng bộ tiến độ</h3><p class="muted" style="font-size:15px;margin:0">Tiến độ, điểm, từ vựng đã thuộc và bài viết nháp được tự động lưu lên tài khoản. Bạn có thể học tiếp trên máy khác bằng cách đăng nhập cùng tài khoản.</p>
    <div class="stat" style="margin-top:12px"><div><b>${Object.keys(S.done).length}</b><span>bài hoàn thành</span></div><div><b>${S.xp}</b><span>XP</span></div></div></div></div></div></div>`;
  $("#fName").onsubmit = async e => {
    e.preventDefault(); const v = e.target.n.value.trim().slice(0, 120);
    const { error } = await sb.from("profiles").update({ full_name: v }).eq("id", USER.id);
    if (error) return toast("Không lưu được: " + error.message);
    PROFILE.full_name = v; S.name = v; save(); updAcct(); toast("Đã lưu họ tên");
  };
  $("#fJoin").onsubmit = async e => {
    e.preventDefault(); const c = e.target.c.value.trim().toUpperCase(); if (!c) return;
    const { data, error } = await sb.rpc("join_class", { p_code: c });
    if (error) return toast(/tồn tại|exist/i.test(error.message) ? "Mã lớp không đúng" : "Lỗi: " + error.message);
    await loadProfile(); toast("Đã vào lớp " + (data && data.name || "")); route();
  };
  $("#out").onclick = logout;
  mySubs($("#subs"));
};

/* ================= TRANG QUẢN TRỊ ================= */
const ADM = { loaded: false, profiles: [], classes: [], progress: {}, results: [], sel: null, cls: "all", q: "", subF: "pending", subK: "all", skill: "listening", edit: null };
const ATABS = [["admin", "Tổng quan"], ["admin-classes", "Lớp học"], ["admin-students", "Học viên"], ["admin-subs", "Bài nộp"], ["admin-content", "Nội dung", 1], ["admin-bank", "Ngân hàng câu hỏi", 1], ["admin-users", "Người dùng & quyền", 1], ["admin-export", "Xuất dữ liệu"]];
async function admLoad(force) {
  if (ADM.loaded && !force) return;
  const [p, c, pr, r] = await Promise.all([
    sb.from("profiles").select("*").order("created_at", { ascending: false }),
    sb.from("classes").select("*").order("created_at", { ascending: false }),
    sb.from("progress").select("*"),
    sb.from("results").select("*").order("created_at", { ascending: false }).limit(5000)
  ]);
  for (const x of [p, c, pr, r]) if (x.error) throw x.error;
  ADM.profiles = p.data || []; ADM.classes = c.data || [];
  ADM.progress = Object.fromEntries((pr.data || []).map(x => [x.user_id, x])); ADM.results = r.data || [];
  ADM.loaded = true;
}
async function reloadContent() {
  const { data, error } = await sb.from("content").select("*");
  if (error) throw error;
  DBROWS = Object.fromEntries((data || []).map(r => [r.id, r]));
  applyContent();
}
const students = () => ADM.profiles.filter(p => p.role === "student" && p.id !== (USER && USER.id));
const className = id => { const c = ADM.classes.find(x => x.id === id); return c ? c.name : ""; };
const personName = id => { const p = ADM.profiles.find(x => x.id === id); return p ? (p.full_name || p.email || "?") : "?"; };
function stStats(p) {
  const row = ADM.progress[p.id], st = (row && row.state) || {}, done = st.done || {};
  const ids = Object.keys(done).filter(id => BY[id]);
  const avg = ids.length ? Math.round(100 * ids.reduce((a, id) => a + done[id].score / done[id].total, 0) / ids.length) : 0;
  return { done, n: ids.length, avg, xp: st.xp || 0, last: row && row.updated_at, tests: st.tests || [], known: Object.keys(st.known || {}).length };
}
function admShell(tab, inner) {
  const tabs = ATABS.filter(t => !t[2] || isAdmin());
  return `<section class="band slim"><div class="wrap"><div><div class="crumbs"><a href="#home">Tổng quan</a> › Quản trị</div>
    <h1>Trang quản trị</h1><p style="margin:0">${esc(PROFILE.full_name || USER.email)} · ${isAdmin() ? "Quản trị viên" : "Giáo viên"}${isAdmin() ? "" : " – bạn quản lý các lớp do mình tạo"}</p></div></div></section>
  <div class="wrap"><div class="atabs scroll">${tabs.map(([h, t]) => `<a href="#${h}" class="${h === tab ? "on" : ""}">${t}</a>`).join("")}<button class="btn sm" id="aRef" style="margin-left:auto">${ic("redo")} Làm mới</button></div>${inner}</div>`;
}
function admGuard() {
  if (!ONLINE) { app.innerHTML = simpleBand("Quản trị") + `<div class="wrap">${offlineNote}</div>`; return false; }
  if (!USER) { app.innerHTML = simpleBand("Quản trị") + `<div class="wrap"><div class="card"><p>Bạn cần đăng nhập bằng tài khoản giáo viên hoặc quản trị viên.</p><a class="btn pri" href="#login">Đăng nhập</a></div></div>`; return false; }
  if (!isStaff()) { app.innerHTML = simpleBand("Quản trị") + `<div class="wrap"><div class="card"><p>Tài khoản của bạn không có quyền truy cập trang quản trị.</p></div></div>`; return false; }
  return true;
}
function admPage(tab, adminOnly, render) {
  return async () => {
    if (!admGuard()) return;
    if (adminOnly && !isAdmin()) { app.innerHTML = admShell(tab, `<div class="card"><p>Chỉ quản trị viên được dùng mục này.</p></div>`); return; }
    const tok = VIEWTOK;
    app.innerHTML = admShell(tab, `<div class="card"><p class="muted">Đang tải dữ liệu…</p></div>`);
    try { await admLoad(); } catch (e) { if (tok === VIEWTOK) app.innerHTML = admShell(tab, `<div class="card"><p>Không tải được dữ liệu: ${esc(e.message || e)}</p></div>`); return; }
    if (tok !== VIEWTOK) return;
    const draw = () => { app.innerHTML = admShell(tab, render()); $("#aRef").onclick = async () => { $("#aRef").disabled = true; try { await admLoad(true); await reloadContent(); } catch (e) { toast("Lỗi: " + (e.message || e)); } draw(); toast("Đã làm mới dữ liệu"); }; render.wire && render.wire(draw); };
    draw();
  };
}
const tbl = (head, rows, cls = "stack") => `<div class="card" style="padding:8px 12px"><div class="scroll"><table class="${cls}"><thead><tr>${head.map(h => `<th${/^(Điểm|Hoàn thành|XP|Số|Lượt)/.test(h) ? ' style="text-align:right"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${head.length}" class="muted">Chưa có dữ liệu.</td></tr>`}</tbody></table></div></div>`;
const statBox = items => `<div class="stat big">${items.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>`;

/* --- Tổng quan --- */
const rOverview = () => {
  const st = students(), wk = Date.now() - 7 * 864e5;
  const active = st.filter(p => { const s = stStats(p); return s.last && new Date(s.last) > wk; }).length;
  const comp = st.length ? Math.round(st.reduce((a, p) => a + pct(stStats(p).n, ALL.length), 0) / st.length) : 0;
  const pend = ADM.results.filter(r => (r.kind === "writing" || r.kind === "speaking") && !r.reviewed_at).length;
  const lessonRows = ALL.map(l => {
    const ds = st.map(p => stStats(p).done[l.id]).filter(Boolean);
    const avg = ds.length ? Math.round(100 * ds.reduce((a, d) => a + d.score / d.total, 0) / ds.length) : null;
    return `<tr><td>${D.skills[l.skill].name}</td><td><a href="#${l.id}">${esc(l.title)}</a>${l.vstep ? ' <span class="chip">VSTEP</span>' : ""}</td><td class="n">${ds.length}/${st.length}</td><td class="n">${avg == null ? "–" : avg + "%"}</td></tr>`;
  });
  const classRows = ADM.classes.map(c => {
    const m = st.filter(p => p.class_id === c.id), ss = m.map(stStats);
    return `<tr><td><b>${esc(c.name)}</b></td><td><code>${esc(c.code)}</code></td><td class="n">${m.length}</td><td class="n">${m.length ? Math.round(ss.reduce((a, s) => a + pct(s.n, ALL.length), 0) / m.length) + "%" : "–"}</td><td class="n">${m.length ? Math.round(ss.reduce((a, s) => a + s.avg, 0) / m.length) + "%" : "–"}</td></tr>`;
  });
  return statBox([[st.length, "học viên"], [ADM.classes.length, "lớp học"], [active, "hoạt động 7 ngày qua"], [comp + "%", "tỉ lệ hoàn thành TB"], [pend, "bài chờ nhận xét"]])
    + (pend ? `<p style="margin:14px 0 0"><a class="btn hot sm" href="#admin-subs">Nhận xét ${pend} bài đang chờ ${ic("arrow")}</a></p>` : "")
    + `<div class="section-head"><h2>Theo lớp</h2></div>` + tbl(["Lớp", "Mã lớp", "Số học viên", "Hoàn thành TB", "Điểm TB"], classRows)
    + `<div class="section-head"><h2>Theo bài học</h2><span class="muted">Điểm cao nhất của mỗi học viên</span></div>` + tbl(["Kỹ năng", "Bài học", "Hoàn thành", "Điểm TB"], lessonRows);
};

/* --- Lớp học --- */
const genCode = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const rClasses = () => {
  const teachers = ADM.profiles.filter(p => p.role !== "student");
  return `<div class="card"><h2>Tạo lớp mới</h2><form id="fCls" class="fgrid3">
      <label class="field">Tên lớp<input name="name" required maxlength="120" placeholder="VD: K66 Ngôn ngữ Anh – Nhóm 1"></label>
      <label class="field">Mã lớp (4–12 chữ/số)<span class="row" style="gap:6px;flex-wrap:nowrap"><input name="code" required maxlength="12" pattern="[A-Za-z0-9]{4,12}" value="${genCode()}" style="text-transform:uppercase;flex:1"><button type="button" class="btn sm" id="gen" aria-label="Tạo mã ngẫu nhiên">${ic("shuffle")}</button></span></label>
      ${isAdmin() ? `<label class="field">Giáo viên phụ trách<select name="t">${teachers.map(t => `<option value="${t.id}" ${t.id === USER.id ? "selected" : ""}>${esc(t.full_name || t.email)}</option>`).join("")}</select></label>` : ""}
      <button class="btn pri" style="align-self:end">Tạo lớp</button></form>
    <p class="muted" style="font-size:14px;margin:10px 0 0">Gửi mã lớp cho học viên. Họ nhập mã khi đăng ký hoặc trong mục Tài khoản.</p></div>
    <div class="section-head"><h2>Danh sách lớp (${ADM.classes.length})</h2></div>
    ${tbl(["Tên lớp", "Mã lớp", "Giáo viên", "Số học viên", "Thao tác"], ADM.classes.map(c => `<tr data-id="${c.id}"><td><input class="inl" value="${esc(c.name)}" data-f="name" aria-label="Tên lớp" maxlength="120"></td><td><code style="font-size:16px">${esc(c.code)}</code> <button class="btn sm ghost" data-copy="${esc(c.code)}">${ic("copy")}</button></td><td>${esc(personName(c.teacher_id))}</td><td class="n">${students().filter(p => p.class_id === c.id).length}</td><td><div class="row" style="gap:6px"><button class="btn sm" data-act="see">Xem học viên</button><button class="btn sm ghost" data-act="del">Xóa</button></div></td></tr>`))}`;
};
rClasses.wire = draw => {
  $("#gen").onclick = () => $("#fCls").code.value = genCode();
  $("#fCls").onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const row = { name: f.name.value.trim(), code: f.code.value.trim().toUpperCase(), teacher_id: (f.t && f.t.value) || USER.id };
    const { error } = await sb.from("classes").insert(row);
    if (error) return toast(/duplicate|unique/i.test(error.message) ? "Mã lớp đã tồn tại, hãy chọn mã khác" : "Lỗi: " + error.message);
    await admLoad(true); draw(); toast("Đã tạo lớp " + row.name);
  };
  $$("[data-copy]").forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast("Đã sao chép mã lớp"); } catch (e) { toast(b.dataset.copy); } });
  $$("tr[data-id]").forEach(tr => {
    const id = tr.dataset.id;
    const inp = $(".inl", tr);
    inp.onchange = async () => { const { error } = await sb.from("classes").update({ name: inp.value.trim() }).eq("id", id); toast(error ? "Lỗi: " + error.message : "Đã đổi tên lớp"); if (!error) ADM.classes.find(c => c.id === id).name = inp.value.trim(); };
    $('[data-act="see"]', tr).onclick = () => { ADM.cls = id; ADM.sel = null; location.hash = "#admin-students"; };
    let armed = false;
    $('[data-act="del"]', tr).onclick = async e => {
      if (!armed) { armed = true; e.target.textContent = "Bấm lần nữa để xóa"; return; }
      const { error } = await sb.from("classes").delete().eq("id", id);
      if (error) return toast("Lỗi: " + error.message);
      await admLoad(true); draw(); toast("Đã xóa lớp (học viên vẫn giữ tài khoản)");
    };
  });
};

/* --- Học viên --- */
const rStudents = () => {
  const q = ADM.q.toLowerCase();
  const list = students().filter(p => (ADM.cls === "all" || (ADM.cls === "none" ? !p.class_id : p.class_id === ADM.cls)) && (!q || (p.full_name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)));
  const sel = ADM.sel && ADM.profiles.find(p => p.id === ADM.sel);
  return `<div class="row" style="margin-bottom:14px"><select id="sCls" aria-label="Lọc theo lớp"><option value="all">Tất cả lớp</option>${ADM.classes.map(c => `<option value="${c.id}" ${ADM.cls === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}<option value="none" ${ADM.cls === "none" ? "selected" : ""}>Chưa có lớp</option></select>
    <input class="search" id="sQ" placeholder="Tìm theo tên hoặc email…" value="${esc(ADM.q)}" style="max-width:320px" aria-label="Tìm học viên"><span class="muted">${list.length} học viên</span></div>
    ${sel ? stDetail(sel) : ""}
    ${tbl(["Họ tên", "Email", "Lớp", "Hoàn thành", "Điểm TB", "XP", "Hoạt động gần nhất", ""], list.map(p => { const s = stStats(p); return `<tr${p.id === ADM.sel ? ' class="hl"' : ""}><td><b>${esc(p.full_name || "(chưa có tên)")}</b></td><td>${esc(p.email || "")}</td><td>${esc(className(p.class_id)) || '<span class="muted">–</span>'}</td><td class="n">${s.n}/${ALL.length}</td><td class="n">${s.n ? s.avg + "%" : "–"}</td><td class="n">${s.xp}</td><td>${fmtDate(s.last)}</td><td><button class="btn sm" data-sel="${p.id}">Chi tiết</button></td></tr>`; }))}`;
};
function stDetail(p) {
  const s = stStats(p), rs = ADM.results.filter(r => r.user_id === p.id);
  const myClasses = isAdmin() ? ADM.classes : ADM.classes.filter(c => c.teacher_id === USER.id);
  return `<div class="card detail"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(p.full_name || p.email)}</h2><button class="btn sm ghost" id="dClose">Đóng ✕</button></div>
    <p class="muted" style="margin:4px 0 12px">${esc(p.email || "")} · tham gia ${fmtDate(p.created_at)}</p>
    <div class="row" style="margin-bottom:14px"><label class="row" style="gap:6px">Lớp <select id="dCls"><option value="">— Không thuộc lớp nào —</option>${myClasses.map(c => `<option value="${c.id}" ${c.id === p.class_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div>
    ${statBox([[`${s.n}/${ALL.length}`, "bài hoàn thành"], [s.n ? s.avg + "%" : "–", "điểm TB"], [s.xp, "XP"], [s.known, "từ đã thuộc"], [s.tests.length, "lần kiểm tra"]])}
    <div class="grid" style="margin-top:14px">${SK.map(k => { const a = D[k].filter(l => s.done[l.id]).length; return `<div style="--k:${D.skills[k].color}"><b style="color:${D.skills[k].color}">${D.skills[k].name}</b><div class="bar" style="margin:6px 0"><i style="width:${pct(a, D[k].length)}%"></i></div><span class="muted" style="font-size:14px">${a}/${D[k].length} bài</span></div>`; }).join("")}</div>
    <details style="margin-top:16px"><summary>Điểm từng bài</summary><table class="stack"><thead><tr><th>Bài</th><th style="text-align:right">Điểm cao nhất</th><th>Ngày</th></tr></thead><tbody>${ALL.map(l => { const d = s.done[l.id]; return `<tr><td>${D.skills[l.skill].name}: ${esc(l.title)}</td><td class="n">${d ? `${d.score}/${d.total} (${pct(d.score, d.total)}%)` : "–"}</td><td>${d ? esc(d.date) : ""}</td></tr>`; }).join("")}</tbody></table></details>
    <details><summary>Lịch sử làm bài (${rs.length})</summary><table class="stack"><thead><tr><th>Thời gian</th><th>Bài</th><th>Loại</th><th style="text-align:right">Điểm</th></tr></thead><tbody>${rs.slice(0, 100).map(r => `<tr><td>${fmtDate(r.created_at)}</td><td>${esc(r.lesson_id === "test" ? "Bài kiểm tra nhanh" : (BY[r.lesson_id] || {}).title || r.lesson_id)}</td><td>${{ auto: "Tự chấm", writing: "Nộp bài viết", speaking: "Nộp ghi âm", test: "Kiểm tra" }[r.kind]}</td><td class="n">${r.score != null ? `${r.score}/${r.total}` : "–"}${r.teacher_score != null ? ` · GV: ${r.teacher_score}` : ""}</td></tr>`).join("")}</tbody></table></details></div>`;
}
rStudents.wire = draw => {
  $("#sCls").onchange = e => { ADM.cls = e.target.value; draw(); };
  $("#sQ").oninput = e => { ADM.q = e.target.value; const pos = e.target.selectionStart; draw(); const n = $("#sQ"); n.focus(); n.setSelectionRange(pos, pos); };
  $$("[data-sel]").forEach(b => b.onclick = () => { ADM.sel = b.dataset.sel; draw(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  const c = $("#dClose"); if (c) c.onclick = () => { ADM.sel = null; draw(); };
  const dc = $("#dCls");
  if (dc) dc.onchange = async () => {
    const { error } = await sb.rpc("set_class", { p_user: ADM.sel, p_class: dc.value || null });
    if (error) return toast("Lỗi: " + error.message);
    await admLoad(true); toast("Đã cập nhật lớp"); draw();
  };
};

/* --- Bài nộp --- */
const rSubs = () => {
  let list = ADM.results.filter(r => r.kind === "writing" || r.kind === "speaking");
  if (ADM.subF === "pending") list = list.filter(r => !r.reviewed_at); else if (ADM.subF === "done") list = list.filter(r => r.reviewed_at);
  if (ADM.subK !== "all") list = list.filter(r => r.kind === ADM.subK);
  if (ADM.cls !== "all") list = list.filter(r => { const p = ADM.profiles.find(x => x.id === r.user_id); return p && (ADM.cls === "none" ? !p.class_id : p.class_id === ADM.cls); });
  return `<div class="row" style="margin-bottom:14px">
    <select id="fS" aria-label="Trạng thái"><option value="pending" ${ADM.subF === "pending" ? "selected" : ""}>Chờ nhận xét</option><option value="done" ${ADM.subF === "done" ? "selected" : ""}>Đã nhận xét</option><option value="all" ${ADM.subF === "all" ? "selected" : ""}>Tất cả</option></select>
    <select id="fK" aria-label="Loại bài"><option value="all">Viết &amp; Nói</option><option value="writing" ${ADM.subK === "writing" ? "selected" : ""}>Bài viết</option><option value="speaking" ${ADM.subK === "speaking" ? "selected" : ""}>Bản ghi âm</option></select>
    <select id="fC" aria-label="Lớp"><option value="all">Tất cả lớp</option>${ADM.classes.map(c => `<option value="${c.id}" ${ADM.cls === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
    <span class="muted">${list.length} bài</span></div>
    ${list.length ? list.slice(0, 60).map(r => { const p = ADM.profiles.find(x => x.id === r.user_id) || {}; const l = BY[r.lesson_id] || {}; return `<div class="card subm" data-id="${r.id}">
      <div class="row" style="justify-content:space-between"><div><b>${esc(p.full_name || p.email || "?")}</b> <span class="muted">· ${esc(className(p.class_id) || "chưa có lớp")}</span></div><span class="muted" style="font-size:14px">${fmtDate(r.created_at)}</span></div>
      <h3 style="margin:8px 0">${r.kind === "writing" ? "Bài viết" : "Bản ghi âm"}: ${esc(l.title || r.lesson_id)}</h3>
      ${r.kind === "writing" ? `${l.prompt ? `<details><summary>Đề bài</summary><p class="prompt" style="font-size:15px">${esc(l.prompt)}</p></details>` : ""}<div class="model">${esc(r.detail.text || "")}</div><p class="muted" style="font-size:14px;margin:6px 0 0">${esc(r.detail.words || 0)} từ${r.score != null ? ` · Chấm tự động: ${r.score}/${r.total}` : ""}</p>`
        : `<div class="row"><button class="btn sm" data-play="${esc(r.detail.path || "")}">${ic("play")} Tải bản ghi để nghe</button></div><div class="aud"></div>${r.detail.transcript ? `<p class="muted" style="font-size:14px;margin:8px 0 0"><b>Chép lời tự động:</b> ${esc(r.detail.transcript)}</p>` : ""}`}
      <form class="fb fgrid" style="margin-top:14px"><label class="field">Nhận xét cho học viên<textarea name="fb" rows="3" maxlength="4000">${esc(r.feedback || "")}</textarea></label>
        <div class="row"><label class="row" style="gap:6px">Điểm (0–10) <input name="sc" type="number" min="0" max="10" step="0.5" value="${r.teacher_score ?? ""}" style="width:90px;min-height:40px;border-radius:10px;border:1.5px solid var(--line);padding:6px;background:var(--card)"></label><button class="btn pri sm">${r.reviewed_at ? "Cập nhật nhận xét" : "Lưu nhận xét"}</button>${r.reviewed_at ? `<span class="muted" style="font-size:13px">Đã nhận xét ${fmtDate(r.reviewed_at)}</span>` : ""}</div></form></div>`; }).join("") : `<div class="card"><p class="muted" style="margin:0">Không có bài nộp phù hợp.</p></div>`}`;
};
rSubs.wire = draw => {
  $("#fS").onchange = e => { ADM.subF = e.target.value; draw(); };
  $("#fK").onchange = e => { ADM.subK = e.target.value; draw(); };
  $("#fC").onchange = e => { ADM.cls = e.target.value; draw(); };
  $$("[data-play]").forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { data, error } = await sb.storage.from("recordings").createSignedUrl(b.dataset.play, 3600);
    if (error) { b.disabled = false; return toast("Không tải được bản ghi: " + error.message); }
    b.closest(".subm").querySelector(".aud").innerHTML = `<audio controls src="${esc(data.signedUrl)}" style="width:100%;margin-top:8px"></audio>`;
  });
  $$(".subm form").forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const id = +f.closest(".subm").dataset.id;
    const sc = f.sc.value === "" ? null : Math.max(0, Math.min(10, +f.sc.value));
    const patch = { feedback: f.fb.value.trim(), teacher_score: sc, reviewed_by: USER.id, reviewed_at: new Date().toISOString() };
    const { error } = await sb.from("results").update(patch).eq("id", id);
    if (error) return toast("Lỗi: " + error.message);
    Object.assign(ADM.results.find(r => r.id === id), patch); toast("Đã lưu nhận xét"); draw();
  });
};

/* --- Nội dung --- */
const lines = a => (a || []).join("\n");
const toLines = t => String(t || "").split("\n").map(s => s.trim()).filter(Boolean);
function qsToText(qs) {
  return (qs || []).map(q => {
    const e = q.e ? `\n= ${q.e}` : "";
    if (q.type === "tf") return `?TF ${q.q} => ${q.a}${e}`;
    if (q.type === "gap") return `?GAP ${q.q} => ${(q.a || []).join(" | ")}${e}`;
    return `? ${q.q}\n${(q.o || []).map((o, i) => (i === q.a ? "* " : "- ") + o).join("\n")}${e}`;
  }).join("\n\n");
}
function textToQs(t) {
  const qs = [], errs = [];
  String(t || "").split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).forEach((b, bi) => {
    const ls = b.split("\n").map(s => s.trim()).filter(Boolean), h = ls[0];
    const e = (ls.find(x => x.startsWith("=")) || "").replace(/^=\s*/, "");
    let m;
    if ((m = h.match(/^\?TF\s+(.+?)\s*=>\s*(T|F|NG)\s*$/i))) qs.push({ type: "tf", q: m[1], a: m[2].toUpperCase(), e });
    else if ((m = h.match(/^\?GAP\s+(.+?)\s*=>\s*(.+)$/i))) qs.push({ type: "gap", q: m[1], a: m[2].split("|").map(s => s.trim()).filter(Boolean), e });
    else if ((m = h.match(/^\?\s*(.+)$/))) {
      const opts = ls.slice(1).filter(x => /^[-*]\s*/.test(x) && !x.startsWith("="));
      const a = opts.findIndex(x => x.startsWith("*"));
      if (opts.length < 2 || a < 0) errs.push(`Câu ${bi + 1}: cần ít nhất 2 lựa chọn (bắt đầu bằng "-") và đánh dấu đáp án đúng bằng "*".`);
      else qs.push({ type: "mc", q: m[1], o: opts.map(x => x.replace(/^[-*]\s*/, "")), a, e });
    } else errs.push(`Câu ${bi + 1}: dòng đầu phải bắt đầu bằng "?", "?TF" hoặc "?GAP".`);
  });
  return { qs, errs };
}
const TPL = {
  listening: () => ({ title: "New listening lesson", topic: "Chủ đề", type: "Hội thoại", mins: 15, desc: "", vocab: [], lines: [{ s: "A", t: "Hello!" }, { s: "B", t: "Hi there." }], questions: [{ type: "mc", q: "Question?", o: ["Option A", "Option B", "Option C"], a: 0, e: "" }] }),
  reading: () => ({ title: "New reading lesson", topic: "Chủ đề", type: "Bài đọc", mins: 20, source: "", text: ["Paragraph one with a {word|nghĩa}."], questions: [{ type: "tf", q: "Statement.", a: "T", e: "" }] }),
  writing: () => ({ title: "New writing task", topic: "Chủ đề", type: "Email", mins: 25, min: 100, max: 140, paras: 3, prompt: "Write…", notes: [], outline: [], language: [], checks: [], model: "" }),
  speaking: () => ({ title: "New speaking lesson", topic: "Chủ đề", type: "Nói theo chủ đề", mins: 20, shadow: ["Sentence to practise."], task: { title: "Task", prompt: "Talk about…", points: [], prep: 60, talk: 120 }, phrases: [], followUp: [], model: "" })
};
const F = (label, name, val, opt = {}) => opt.area
  ? `<label class="field${opt.wide ? " wide" : ""}">${label}${opt.hint ? `<small class="muted">${opt.hint}</small>` : ""}<textarea name="${name}" rows="${opt.rows || 4}" ${opt.mono ? 'class="mono"' : ""}>${esc(val ?? "")}</textarea></label>`
  : `<label class="field">${label}<input name="${name}" type="${opt.type || "text"}" value="${esc(val ?? "")}" ${opt.req ? "required" : ""}></label>`;
function editorForm(skill, d) {
  const common = F("Tên bài (tiếng Anh)", "title", d.title, { req: 1 }) + F("Chủ đề", "topic", d.topic) + F("Dạng bài", "type", d.type) + F("Thời lượng (phút)", "mins", d.mins, { type: "number" });
  const qhint = 'Mỗi câu cách nhau 1 dòng trống. Trắc nghiệm: dòng "? Câu hỏi", các lựa chọn "- sai", "* đúng". Đúng/Sai: "?TF Câu => T/F/NG". Điền từ: "?GAP Câu có ___ => đáp án | đáp án khác". Giải thích: dòng "= …".';
  let x = "";
  if (d.custom) x = `<p class="note wide">Đây là bài luyện nói VSTEP đặc biệt; câu hỏi lấy từ “Ngân hàng câu hỏi → Nói VSTEP”. Ở đây chỉ sửa thông tin hiển thị.</p>` + F("Mô tả", "desc", d.desc, { area: 1, wide: 1, rows: 2 });
  else if (skill === "listening") x = F("Mô tả ngắn", "desc", d.desc, { area: 1, wide: 1, rows: 2 })
    + F("Lời thoại (mỗi dòng: Người nói: câu nói)", "lines", (d.lines || []).map(l => `${l.s}: ${l.t}`).join("\n"), { area: 1, wide: 1, rows: 8, hint: "Máy đọc sẽ dùng giọng khác nhau cho mỗi người nói." })
    + F("Từ vựng (mỗi dòng: từ = nghĩa)", "vocab", (d.vocab || []).map(v => `${v[0]} = ${v[1]}`).join("\n"), { area: 1, rows: 5 })
    + F("Câu hỏi", "questions", qsToText(d.questions), { area: 1, wide: 1, rows: 12, mono: 1, hint: qhint });
  else if (skill === "reading") x = F("Nguồn/ ghi chú", "source", d.source)
    + (d.notices ? F("Văn bản ngắn (mỗi dòng: Nhãn | Loại | Nội dung)", "notices", d.notices.map(n => `${n.label} | ${n.kind} | ${n.text}`).join("\n"), { area: 1, wide: 1, rows: 7 })
      : F("Bài đọc (các đoạn cách nhau 1 dòng trống)", "text", (d.text || []).join("\n\n"), { area: 1, wide: 1, rows: 12, hint: "Đánh dấu từ cần chú giải bằng {word|nghĩa}." }))
    + F("Câu hỏi", "questions", qsToText(d.questions), { area: 1, wide: 1, rows: 12, mono: 1, hint: qhint });
  else if (skill === "writing") x = F("Đề bài", "prompt", d.prompt, { area: 1, wide: 1, rows: 5 })
    + F("Số từ tối thiểu", "min", d.min, { type: "number" }) + F("Số từ tối đa", "max", d.max, { type: "number" }) + F("Số đoạn tối thiểu", "paras", d.paras || 3, { type: "number" })
    + F("Yêu cầu (mỗi dòng một ý)", "notes", lines(d.notes), { area: 1 }) + F("Dàn ý gợi ý (mỗi dòng)", "outline", lines(d.outline), { area: 1 })
    + F("Ngôn ngữ hữu ích (mỗi dòng)", "language", lines(d.language), { area: 1 })
    + F("Bài mẫu", "model", d.model, { area: 1, wide: 1, rows: 10 });
  else if (skill === "speaking") x = F("Câu luyện phát âm (mỗi dòng một câu)", "shadow", lines(d.shadow), { area: 1, wide: 1, rows: 5 })
    + F("Tiêu đề thẻ chủ đề", "ttitle", d.task && d.task.title) + F("Yêu cầu", "tprompt", d.task && d.task.prompt) + F("Thời gian chuẩn bị (giây)", "prep", d.task && d.task.prep, { type: "number" }) + F("Thời gian nói (giây)", "talk", d.task && d.task.talk, { type: "number" })
    + F("Gợi ý nội dung (mỗi dòng)", "points", lines(d.task && d.task.points), { area: 1 }) + F("Mẫu câu hữu ích (mỗi dòng)", "phrases", lines(d.phrases), { area: 1 })
    + F("Câu hỏi mở rộng (mỗi dòng)", "followUp", lines(d.followUp), { area: 1 }) + F("Bài nói mẫu", "model", d.model, { area: 1, wide: 1, rows: 8 });
  return `<div class="fgrid3">${common}<label class="field" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="vstep" ${d.vstep ? "checked" : ""} style="width:20px;min-height:20px"> Thuộc mục luyện thi VSTEP</label>${x}</div>`;
}
function formToData(skill, f, base) {
  const d = clone(base); const v = n => f[n] ? f[n].value : "";
  d.title = v("title").trim(); d.topic = v("topic").trim(); d.type = v("type").trim(); d.mins = +v("mins") || 15; d.vstep = f.vstep.checked || undefined;
  const errs = []; if (!d.title) errs.push("Thiếu tên bài.");
  if (d.custom) { d.desc = v("desc"); return { d, errs }; }
  if (skill === "listening" || skill === "reading") {
    const r = textToQs(v("questions")); errs.push(...r.errs); d.questions = r.qs; if (!r.qs.length) errs.push("Cần ít nhất 1 câu hỏi.");
  }
  if (skill === "listening") {
    d.desc = v("desc").trim();
    d.lines = toLines(v("lines")).map(s => { const i = s.indexOf(":"); return i > 0 ? { s: s.slice(0, i).trim(), t: s.slice(i + 1).trim() } : { s: "Speaker", t: s }; });
    d.vocab = toLines(v("vocab")).map(s => { const [a, ...b] = s.split("="); return [a.trim(), b.join("=").trim()]; }).filter(x => x[0]);
    if (!d.lines.length) errs.push("Cần có lời thoại.");
  } else if (skill === "reading") {
    d.source = v("source").trim();
    if (f.notices) d.notices = toLines(v("notices")).map(s => { const [label, kind, ...t] = s.split("|"); return { label: (label || "").trim(), kind: (kind || "").trim(), text: t.join("|").trim() }; });
    else d.text = v("text").split(/\n\s*\n/).map(s => s.trim().replace(/\s*\n\s*/g, " ")).filter(Boolean);
    if (!(d.text || d.notices || []).length) errs.push("Cần có nội dung bài đọc.");
  } else if (skill === "writing") {
    d.prompt = v("prompt").trim(); d.min = +v("min") || 80; d.max = +v("max") || 150; d.paras = +v("paras") || 3;
    d.notes = toLines(v("notes")); d.outline = toLines(v("outline")); d.language = toLines(v("language")); d.model = v("model").trim(); d.checks = d.checks || [];
    if (!d.prompt) errs.push("Thiếu đề bài."); if (d.min >= d.max) errs.push("Số từ tối thiểu phải nhỏ hơn tối đa.");
  } else if (skill === "speaking") {
    d.shadow = toLines(v("shadow")); d.task = Object.assign({}, d.task, { title: v("ttitle").trim(), prompt: v("tprompt").trim(), points: toLines(v("points")), prep: +v("prep") || 60, talk: +v("talk") || 120 });
    d.phrases = toLines(v("phrases")); d.followUp = toLines(v("followUp")); d.model = v("model").trim();
    if (!d.shadow.length) errs.push("Cần ít nhất 1 câu luyện phát âm."); if (!d.task.prompt) errs.push("Thiếu yêu cầu của thẻ chủ đề.");
  }
  return { d, errs };
}
function lessonStatus(id) {
  const r = DBROWS[id], b = BASE.lessons[id];
  if (r && r.kind === "lesson" && r.hidden) return ["Đang ẩn", "off"];
  if (r && r.kind === "lesson") return b ? ["Đã chỉnh sửa", "mod"] : ["Bài mới", "new"];
  return ["Bản gốc", ""];
}
const rContent = () => {
  if (ADM.edit) {
    const e = ADM.edit;
    return `<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${e.isNew ? "Thêm bài mới" : "Sửa bài"} – ${D.skills[e.skill].name}</h2><span class="muted">Mã bài: <code>${esc(e.id)}</code></span></div>
      <div class="tabs" style="margin:14px 0"><button class="${e.json ? "" : "on"}" data-m="form">Biểu mẫu</button><button class="${e.json ? "on" : ""}" data-m="json">JSON nâng cao</button></div>
      <form id="fEd">${e.json ? `<label class="field wide">Dữ liệu bài học (JSON)<textarea name="json" rows="24" class="mono">${esc(JSON.stringify(e.data, null, 2))}</textarea></label>` : editorForm(e.skill, e.data)}
      <div id="edErr" class="note" hidden style="margin-top:12px"></div>
      <div class="row" style="margin-top:16px"><button class="btn pri">${ic("check")} Lưu &amp; xuất bản</button><button type="button" class="btn" id="edCancel">Hủy</button>${e.isNew ? "" : `<a class="btn ghost" href="#${esc(e.id)}">Xem bài hiện tại</a>`}</div></form></div>`;
  }
  const ids = [...Object.values(BASE.lessons).filter(l => l.skill === ADM.skill).map(l => l.id), ...Object.values(DBROWS).filter(r => r.kind === "lesson" && r.skill === ADM.skill && !BASE.lessons[r.id]).map(r => r.id)];
  return `<div class="row" style="margin-bottom:14px">${SK.map(k => `<button class="btn sm ${k === ADM.skill ? "pri" : ""}" data-sk="${k}">${D.skills[k].name}</button>`).join("")}<button class="btn sm hot" id="cNew" style="margin-left:auto">+ Thêm bài ${D.skills[ADM.skill].name.toLowerCase()}</button></div>
    <p class="muted" style="font-size:14px">Bài “Bản gốc” nằm trong mã nguồn; khi sửa, bản sửa được lưu trên máy chủ và hiển thị thay cho bản gốc. “Khôi phục” trả bài về bản gốc.</p>
    ${tbl(["Mã", "Tên bài", "Dạng", "Trạng thái", "Thao tác"], ids.map(id => {
      const r = DBROWS[id], d = (r && r.kind === "lesson" ? r.data : null) || BASE.lessons[id] || {}, [st, cls] = lessonStatus(id), hidden = r && r.hidden;
      return `<tr data-id="${esc(id)}"><td><code>${esc(id)}</code></td><td><b>${esc(d.title || id)}</b>${d.vstep ? ' <span class="chip">VSTEP</span>' : ""}</td><td>${esc(d.type || "")}</td><td><span class="st ${cls}">${st}</span></td><td><div class="row" style="gap:6px">
        <button class="btn sm" data-a="edit">Sửa</button><button class="btn sm" data-a="${hidden ? "show" : "hide"}">${hidden ? "Hiện" : "Ẩn"}</button>
        ${r ? `<button class="btn sm ghost" data-a="${BASE.lessons[id] ? "restore" : "delete"}">${BASE.lessons[id] ? "Khôi phục gốc" : "Xóa"}</button>` : ""}</div></td></tr>`;
    }))}`;
};
async function saveRow(row) {
  row.updated_at = new Date().toISOString(); row.updated_by = USER.id;
  const { error } = await sb.from("content").upsert(row);
  if (error) { toast("Lỗi lưu: " + error.message); return false; }
  DBROWS[row.id] = row; applyContent(); return true;
}
async function deleteRow(id) {
  const { error } = await sb.from("content").delete().eq("id", id);
  if (error) { toast("Lỗi: " + error.message); return false; }
  delete DBROWS[id]; applyContent(); return true;
}
rContent.wire = draw => {
  if (ADM.edit) {
    const e = ADM.edit;
    $$(".tabs button").forEach(b => b.onclick = () => {
      if ((b.dataset.m === "json") === !!e.json) return;
      if (!e.json) { const r = formToData(e.skill, $("#fEd"), e.data); e.data = r.d; } else { try { e.data = JSON.parse($("#fEd").json.value); } catch (er) { return toast("JSON không hợp lệ: " + er.message); } }
      e.json = b.dataset.m === "json"; draw();
    });
    $("#edCancel").onclick = () => { ADM.edit = null; draw(); };
    $("#fEd").onsubmit = async ev => {
      ev.preventDefault(); let d, errs = [];
      if (e.json) { try { d = JSON.parse($("#fEd").json.value); if (!d || typeof d !== "object" || !d.title) errs.push("JSON phải là một đối tượng có trường title."); } catch (er) { errs.push("JSON không hợp lệ: " + er.message); } }
      else ({ d, errs } = formToData(e.skill, $("#fEd"), e.data));
      const box = $("#edErr");
      if (errs.length) { box.hidden = false; box.innerHTML = errs.map(esc).join("<br>"); return; }
      delete d.id; delete d.n; delete d.skill;
      if (await saveRow({ id: e.id, kind: "lesson", skill: e.skill, data: d, hidden: false })) { toast("Đã lưu và xuất bản bài “" + d.title + "”"); ADM.edit = null; draw(); }
    };
    return;
  }
  $$("[data-sk]").forEach(b => b.onclick = () => { ADM.skill = b.dataset.sk; draw(); });
  $("#cNew").onclick = () => { ADM.edit = { id: "c" + ADM.skill[0] + Date.now().toString(36).slice(-6), skill: ADM.skill, isNew: true, data: TPL[ADM.skill]() }; draw(); };
  $$("tr[data-id]").forEach(tr => {
    const id = tr.dataset.id, r = DBROWS[id], cur = (r && r.kind === "lesson" ? r.data : null) || BASE.lessons[id];
    $$("[data-a]", tr).forEach(b => b.onclick = async () => {
      const a = b.dataset.a;
      if (a === "edit") { const d = clone(cur); delete d.skill; delete d.id; ADM.edit = { id, skill: ADM.skill, isNew: false, data: d }; draw(); window.scrollTo(0, 0); return; }
      if (a === "hide" || a === "show") { const d = clone(cur); delete d.skill; delete d.id; if (await saveRow({ id, kind: "lesson", skill: ADM.skill, data: d, hidden: a === "hide" })) { toast(a === "hide" ? "Đã ẩn bài với học viên" : "Đã hiện bài"); draw(); } return; }
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Bấm lần nữa để xác nhận"; return; }
      if (await deleteRow(id)) { toast(a === "restore" ? "Đã khôi phục bản gốc" : "Đã xóa bài"); draw(); }
    });
  });
};

/* --- Ngân hàng câu hỏi --- */
const rBank = () => {
  const e = ADM.gEdit;
  return `<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Ngữ pháp cho bài kiểm tra (${D.grammar.length} câu)</h2><button class="btn sm hot" id="gNew">+ Thêm câu</button></div>
    ${e ? `<form id="fG" class="fgrid3" style="margin-top:14px"><label class="field wide">Câu hỏi (dùng ___ cho chỗ trống)<input name="q" required value="${esc(e.q)}"></label>
      ${[0, 1, 2, 3].map(i => `<label class="field">Lựa chọn ${"ABCD"[i]}<span class="row" style="gap:6px;flex-wrap:nowrap"><input type="radio" name="a" value="${i}" ${e.a === i ? "checked" : ""} aria-label="Đáp án đúng ${"ABCD"[i]}" style="width:20px;min-height:20px"><input name="o${i}" value="${esc(e.o[i] || "")}" ${i < 2 ? "required" : ""} style="flex:1"></span></label>`).join("")}
      <label class="field wide">Giải thích<input name="e" value="${esc(e.e || "")}"></label>
      <div class="row wide"><button class="btn pri">Lưu câu hỏi</button><button type="button" class="btn" id="gCancel">Hủy</button><span class="muted" style="font-size:14px">Chọn nút tròn bên cạnh đáp án đúng.</span></div></form>` : ""}
    <div class="scroll" style="margin-top:12px"><table class="stack"><thead><tr><th>Câu hỏi</th><th>Đáp án</th><th>Nguồn</th><th></th></tr></thead><tbody>${D.grammar.map(g => `<tr data-id="${esc(g.id)}"><td>${esc(g.q)}</td><td><b>${esc(g.o[g.a])}</b></td><td>${DBROWS[g.id] ? (BASE.grammar.some(b => b.id === g.id) ? "Đã sửa" : "Mới") : "Gốc"}</td><td><div class="row" style="gap:6px"><button class="btn sm" data-g="edit">Sửa</button><button class="btn sm ghost" data-g="del">Xóa</button></div></td></tr>`).join("")}</tbody></table></div></div>
    <div class="card"><h2>Ngân hàng nói VSTEP (Part 1–3)</h2><p class="muted" style="font-size:14px">Dữ liệu JSON gồm <code>part1</code> (topic, qs), <code>part2</code> (sit, options, ideas, model), <code>part3</code> (topic, ideas, follow, model), cùng các mẫu câu. Sửa trực tiếp rồi bấm Lưu.</p>
      <form id="fV"><textarea name="j" rows="16" class="editor mono">${esc(JSON.stringify(D.vstepSpeaking, null, 2))}</textarea><div class="row" style="margin-top:10px"><button class="btn pri">Lưu ngân hàng nói</button>${DBROWS.vstepSpeaking ? `<button type="button" class="btn ghost" id="vReset">Khôi phục mặc định</button>` : ""}</div></form></div>
    <div class="card"><h2>Lộ trình học</h2><p class="muted" style="font-size:14px">Mảng JSON các tuần: <code>{"week","focus","items":[mã bài…]}</code>. Mã bài xem ở mục Nội dung.</p>
      <form id="fP"><textarea name="j" rows="10" class="editor mono">${esc(JSON.stringify(D.plan, null, 2))}</textarea><div class="row" style="margin-top:10px"><button class="btn pri">Lưu lộ trình</button>${DBROWS.plan ? `<button type="button" class="btn ghost" id="pReset">Khôi phục mặc định</button>` : ""}</div></form></div>`;
};
rBank.wire = draw => {
  $("#gNew").onclick = () => { ADM.gEdit = { id: "g" + Date.now().toString(36), q: "", o: ["", "", "", ""], a: 0, e: "", isNew: true }; draw(); };
  const gc = $("#gCancel"); if (gc) gc.onclick = () => { ADM.gEdit = null; draw(); };
  const fg = $("#fG");
  if (fg) fg.onsubmit = async ev => {
    ev.preventDefault();
    const o = [0, 1, 2, 3].map(i => fg["o" + i].value.trim()).filter(Boolean), a = +((fg.querySelector("input[name=a]:checked") || {}).value || 0);
    if (a >= o.length) return toast("Đáp án đúng phải là một lựa chọn có nội dung");
    const g = { q: fg.q.value.trim(), o, a, e: fg.e.value.trim() };
    if (await saveRow({ id: ADM.gEdit.id, kind: "grammar", skill: null, data: g, hidden: false })) { ADM.gEdit = null; toast("Đã lưu câu hỏi"); draw(); }
  };
  $$("tr[data-id]").forEach(tr => {
    const id = tr.dataset.id, g = D.grammar.find(x => x.id === id);
    $('[data-g="edit"]', tr).onclick = () => { ADM.gEdit = { id, q: g.q, o: [...g.o, "", "", "", ""].slice(0, 4), a: g.a, e: g.e }; draw(); window.scrollTo(0, 0); };
    $('[data-g="del"]', tr).onclick = async ev => {
      const b = ev.target; if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Xác nhận xóa"; return; }
      const isBase = BASE.grammar.some(x => x.id === id);
      const ok = isBase ? await saveRow({ id, kind: "grammar", skill: null, data: g, hidden: true }) : await deleteRow(id);
      if (ok) { toast("Đã xóa câu hỏi"); draw(); }
    };
  });
  $("#fV").onsubmit = async ev => {
    ev.preventDefault(); let j;
    try { j = JSON.parse(ev.target.j.value); if (!Array.isArray(j.part1) || !Array.isArray(j.part2) || !Array.isArray(j.part3)) throw new Error("cần có part1, part2, part3"); } catch (er) { return toast("JSON không hợp lệ: " + er.message); }
    if (await saveRow({ id: "vstepSpeaking", kind: "bank", skill: null, data: j, hidden: false })) { toast("Đã lưu ngân hàng nói VSTEP"); draw(); }
  };
  $("#fP").onsubmit = async ev => {
    ev.preventDefault(); let j;
    try { j = JSON.parse(ev.target.j.value); if (!Array.isArray(j) || j.some(w => !w.week || !Array.isArray(w.items))) throw new Error("mỗi tuần cần week và items"); } catch (er) { return toast("JSON không hợp lệ: " + er.message); }
    const bad = j.flatMap(w => w.items).filter(id => !BY[id]); if (bad.length) return toast("Mã bài không tồn tại: " + bad.join(", "));
    if (await saveRow({ id: "plan", kind: "bank", skill: null, data: j, hidden: false })) { toast("Đã lưu lộ trình"); draw(); }
  };
  const vr = $("#vReset"); if (vr) vr.onclick = async () => { if (await deleteRow("vstepSpeaking")) { toast("Đã khôi phục"); draw(); } };
  const pr = $("#pReset"); if (pr) pr.onclick = async () => { if (await deleteRow("plan")) { toast("Đã khôi phục"); draw(); } };
};

/* --- Người dùng & quyền --- */
const rUsers = () => `<p class="muted" style="font-size:15px">Giáo viên: tạo lớp, xem học viên trong lớp của mình và nhận xét bài nộp. Quản trị viên: toàn quyền, gồm sửa nội dung và phân quyền. Để xóa hẳn một tài khoản, vào Supabase → Authentication → Users.</p>
  ${tbl(["Họ tên", "Email", "Vai trò", "Lớp", "Ngày tạo"], ADM.profiles.map(p => `<tr data-id="${p.id}"><td><b>${esc(p.full_name || "")}</b>${p.id === USER.id ? ' <span class="chip">bạn</span>' : ""}</td><td>${esc(p.email || "")}</td>
    <td><select data-f="role" ${p.id === USER.id ? "disabled" : ""} aria-label="Vai trò">${[["student", "Học viên"], ["teacher", "Giáo viên"], ["admin", "Quản trị viên"]].map(([v, t]) => `<option value="${v}" ${p.role === v ? "selected" : ""}>${t}</option>`).join("")}</select></td>
    <td><select data-f="cls" aria-label="Lớp"><option value="">—</option>${ADM.classes.map(c => `<option value="${c.id}" ${c.id === p.class_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></td><td>${fmtDate(p.created_at)}</td></tr>`))}`;
rUsers.wire = draw => {
  $$("tr[data-id]").forEach(tr => {
    const id = tr.dataset.id;
    $('[data-f="role"]', tr).onchange = async e => { const { error } = await sb.rpc("set_role", { p_user: id, p_role: e.target.value }); if (error) { toast("Lỗi: " + error.message); return draw(); } ADM.profiles.find(p => p.id === id).role = e.target.value; toast("Đã đổi vai trò"); };
    $('[data-f="cls"]', tr).onchange = async e => { const { error } = await sb.rpc("set_class", { p_user: id, p_class: e.target.value || null }); if (error) { toast("Lỗi: " + error.message); return draw(); } ADM.profiles.find(p => p.id === id).class_id = e.target.value || null; toast("Đã đổi lớp"); };
  });
};

/* --- Xuất dữ liệu --- */
const csvCell = v => { const s = v == null ? "" : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function download(name, text, type) {
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); toast("Đã tải " + name); }
  catch (e) { toast("Trình duyệt không cho tải tệp ở đây"); }
}
const csv = (name, rows) => download(name, "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
const rExport = () => `<div class="grid">
  <div class="card"><h3>Tổng hợp học viên</h3><p class="muted" style="font-size:15px">Họ tên, email, lớp, số bài hoàn thành, điểm TB, XP, lần hoạt động gần nhất.</p><button class="btn pri" id="x1">${ic("down")} Tải CSV</button></div>
  <div class="card"><h3>Bảng điểm chi tiết</h3><p class="muted" style="font-size:15px">Mỗi học viên một dòng, mỗi bài một cột (% điểm cao nhất). Mở được bằng Excel.</p><button class="btn pri" id="x2">${ic("down")} Tải CSV</button></div>
  <div class="card"><h3>Lịch sử làm bài</h3><p class="muted" style="font-size:15px">Mọi lượt làm bài, bài nộp và nhận xét của giáo viên.</p><button class="btn pri" id="x3">${ic("down")} Tải CSV</button></div>
  ${isAdmin() ? `<div class="card"><h3>Sao lưu nội dung</h3><p class="muted" style="font-size:15px">Toàn bộ bài học, câu hỏi đã thêm/sửa trên máy chủ (JSON).</p><button class="btn" id="x4">${ic("down")} Tải JSON</button>
    <label class="field" style="margin-top:12px">Khôi phục từ tệp JSON<input type="file" id="x5" accept="application/json,.json"></label></div>` : ""}</div>`;
rExport.wire = () => {
  const st = students(), cls = ADM.cls;
  $("#x1").onclick = () => csv(`hoc-vien-${today()}.csv`, [["Họ tên", "Email", "Lớp", "Số bài hoàn thành", "Tổng số bài", "Điểm TB (%)", "XP", "Hoạt động gần nhất"], ...st.map(p => { const s = stStats(p); return [p.full_name, p.email, className(p.class_id), s.n, ALL.length, s.n ? s.avg : "", s.xp, s.last ? fmtDate(s.last) : ""]; })]);
  $("#x2").onclick = () => csv(`bang-diem-${today()}.csv`, [["Họ tên", "Email", "Lớp", ...ALL.map(l => `${l.id} – ${l.title}`)], ...st.map(p => { const s = stStats(p); return [p.full_name, p.email, className(p.class_id), ...ALL.map(l => s.done[l.id] ? pct(s.done[l.id].score, s.done[l.id].total) : "")]; })]);
  $("#x3").onclick = () => csv(`lich-su-${today()}.csv`, [["Thời gian", "Họ tên", "Email", "Lớp", "Mã bài", "Tên bài", "Loại", "Điểm", "Tổng", "Điểm GV", "Nhận xét", "Bài viết"], ...ADM.results.map(r => { const p = ADM.profiles.find(x => x.id === r.user_id) || {}; return [fmtDate(r.created_at), p.full_name, p.email, className(p.class_id), r.lesson_id, (BY[r.lesson_id] || {}).title || "", r.kind, r.score, r.total, r.teacher_score, r.feedback, r.kind === "writing" ? r.detail.text : ""]; })]);
  const x4 = $("#x4"); if (x4) x4.onclick = () => download(`noi-dung-${today()}.json`, JSON.stringify(Object.values(DBROWS), null, 2), "application/json");
  const x5 = $("#x5");
  if (x5) x5.onchange = async () => {
    const f = x5.files[0]; if (!f) return;
    let rows; try { rows = JSON.parse(await f.text()); if (!Array.isArray(rows)) throw 0; } catch (e) { return toast("Tệp không hợp lệ"); }
    rows = rows.filter(r => r && r.id && r.kind && r.data).map(r => ({ id: r.id, kind: r.kind, skill: r.skill || null, data: r.data, hidden: !!r.hidden, updated_at: new Date().toISOString(), updated_by: USER.id }));
    const { error } = await sb.from("content").upsert(rows);
    if (error) return toast("Lỗi: " + error.message);
    await reloadContent(); toast(`Đã khôi phục ${rows.length} mục nội dung`);
  };
};

VIEWS.admin = admPage("admin", false, rOverview);
VIEWS["admin-classes"] = admPage("admin-classes", false, rClasses);
VIEWS["admin-students"] = admPage("admin-students", false, rStudents);
VIEWS["admin-subs"] = admPage("admin-subs", false, rSubs);
VIEWS["admin-content"] = admPage("admin-content", true, rContent);
VIEWS["admin-bank"] = admPage("admin-bank", true, rBank);
VIEWS["admin-users"] = admPage("admin-users", true, rUsers);
VIEWS["admin-export"] = admPage("admin-export", false, rExport);

/* ---------- khởi động ---------- */
async function boot() {
  snapshotBase(); rebuild(); updXP();
  if (ONLINE) {
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    updAcct();
    try { await reloadContent(); } catch (e) { console.warn("content", e); }
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) await onLogin(data.session.user);
    } catch (e) { console.warn("session", e); }
    sb.auth.onAuthStateChange((ev, session) => {
      if (ev === "PASSWORD_RECOVERY") { location.hash = "#reset"; }
      else if (ev === "SIGNED_IN" && session && !USER) onLogin(session.user).then(route);
    });
    window.addEventListener("beforeunload", () => { if (USER && pushT) { clearTimeout(pushT); pushState(); } });
  }
  updAcct(); route();
}
/* nhãn cột cho bảng dạng thẻ trên điện thoại */
new MutationObserver(() => {
  for (const c of document.querySelectorAll(".stack td:not([data-l])")) {
    let i = 0, p = c; while ((p = p.previousElementSibling)) i += p.colSpan;
    const t = c.closest("table"), h = t && t.tHead && t.tHead.rows[0] && t.tHead.rows[0].cells[i];
    c.dataset.l = h ? h.textContent : "";
  }
}).observe(document.body, { childList: true, subtree: true });
boot();
}
