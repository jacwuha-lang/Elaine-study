/* ============================================================
   main.js — 机器人马拉松主流程
   ------------------------------------------------------------
   大厅 → 选机器人 → 建房/加入（或 AI 练习）→ 倒计时 → 比赛
        → 答题（本地判分，服务器记账）→ 结算 → 回大厅

   这一层只负责流程和 DOM；3D 在 race.js，题目在 questions.js，
   网络在 net.js，结算在 result.js。
   ============================================================ */

import { MpkNet } from './net.js';
import { QuestionSource, judgeNumeric, answerText } from './questions.js';
import { ROBOTS, robotById, createPreview } from './robots.js';
import { RaceView } from './race.js';
import { Hud } from './hud.js';
import { ResultPanel } from './result.js';
import { sfx } from './sfx.js';
import { TOTAL } from './track.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const S = {
  who: '',
  stars: 0,
  robot: 'jifeng',
  mode: 'rank',
  ai: '',
  side: 0,
  phase: 'lobby',
  net: null,
  snap: null,
  race: null,
  hud: null,
  result: null,
  qsrc: null,
  q: null,
  qIndex: 0,
  input: '',
  locked: false,
  wrongs: [],
  answerSeq: 0,
  lastCount: 9,
  resultShown: false,
  preview: null
};

/* ---------------- 启动 ---------------- */

function boot() {
  let saved = '';
  let savedRobot = 'jifeng';
  try {
    saved = localStorage.getItem('sm_profile') || '';
    savedRobot = localStorage.getItem('sm_mpk_robot') || 'jifeng';
  } catch (e) { /* 隐私模式 */ }
  S.who = (params.get('who') || saved || '').trim();
  S.robot = robotById(savedRobot).id;

  S.hud = new Hud();
  S.result = new ResultPanel($('result'));
  S.result.onAction = onResultAction;
  S.qsrc = new QuestionSource();

  $('whoTag').textContent = S.who ? S.who : '还没选档案';
  renderRobots();
  selectRobot(S.robot, true);
  bindLobby();

  if (!S.who) {
    hint('先去首页「设置 → 学习档案」填个名字，再回来比赛', true);
    $('btnCreate').disabled = true;
    $('btnJoin').disabled = true;
  } else {
    loadStars();
  }

  try {
    S.preview = createPreview($('preview'));
    S.preview.setRobot(S.robot);
  } catch (e) {
    console.warn('[mpk] 预览画不出来', e);
  }

  initScratch();
  window.addEventListener('keydown', onKey);
  window.addEventListener('pagehide', () => {
    if (S.phase === 'racing' && S.net && S.net.code) {
      try {
        const body = JSON.stringify({ who: S.who, code: S.net.code });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/mpk/leave', new Blob([body], { type: 'application/json' }));
        }
      } catch (e) { /* 走了就走了 */ }
    }
    saveWrongs();
  });
}

async function loadStars() {
  try {
    const r = await fetch('/api/profile?name=' + encodeURIComponent(S.who), { cache: 'no-store' });
    const j = await r.json();
    if (j && j.ok && j.data) {
      S.stars = Number(j.data.sm_stars || 0);
      $('starTag').textContent = S.stars;
      return true;
    }
  } catch (e) { /* 服务器没开 */ }
  return false;
}

/* ---------------- 大厅 ---------------- */

function bindLobby() {
  $('modeRank').onclick = () => setMode('rank');
  $('modePractice').onclick = () => setMode('practice');
  $('btnCreate').onclick = createRoom;
  $('btnJoin').onclick = joinRoom;
  $('btnCancel').onclick = cancelRoom;
  $('codeInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
  });
  $('codeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom();
  });
  const rank = $('rankStart');
  document.querySelectorAll('#aiRow [data-ai]').forEach((b) => {
    b.onclick = () => startPractice(b.dataset.ai);
  });
  /* 选模式时把排位入口藏起来，练习只需要点 AI 难度 */
  S.rankStartEl = rank;
}

function setMode(mode) {
  S.mode = mode;
  $('modeRank').classList.toggle('active', mode === 'rank');
  $('modePractice').classList.toggle('active', mode === 'practice');
  $('aiRow').classList.toggle('hidden', mode !== 'practice');
  $('rankStart').classList.toggle('hidden', mode !== 'rank');
  hint(mode === 'practice' ? '选一个 AI 难度就开始，练习不扣星也不发星。' : '');
  sfx.click();
}

function renderRobots() {
  $('robotList').innerHTML = ROBOTS.map((r) =>
    '<button class="robot-card" type="button" data-robot="' + r.id + '">'
    + '<i class="robot-swatch" style="--robot-color:#' + r.colors.accent.toString(16).padStart(6, '0') + '"></i>'
    + '<b>' + r.name + '</b><span>' + r.trait + '</span></button>').join('');
  $('robotList').querySelectorAll('[data-robot]').forEach((b) => {
    b.onclick = () => selectRobot(b.dataset.robot);
  });
}

function selectRobot(id, silent) {
  const def = robotById(id);
  S.robot = def.id;
  try { localStorage.setItem('sm_mpk_robot', def.id); } catch (e) { /* ignore */ }
  $('robotList').querySelectorAll('[data-robot]').forEach((b) => {
    b.classList.toggle('active', b.dataset.robot === def.id);
    b.setAttribute('aria-pressed', String(b.dataset.robot === def.id));
  });
  $('robotName').textContent = def.name;
  $('robotTrait').textContent = def.trait;
  $('robotDesc').textContent = def.desc;
  if (S.preview) S.preview.setRobot(def.id);
  if (!silent) sfx.click();
}

function hint(msg, bad) {
  const el = $('lobbyHint');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('bad', !!bad);
}

async function createRoom() {
  if (!S.who) { hint('先去首页填个学习档案的名字', true); return; }
  if (S.stars < 50) { hint('星星还差 ' + (50 - S.stars) + ' 颗，先去学习赚星星', true); return; }
  sfx.unlock();
  sfx.click();
  $('btnCreate').disabled = true;
  hint('正在开房…');
  S.net = new MpkNet(S.who);
  try {
    const r = await S.net.create({ robot: S.robot });
    if (!r || !r.ok) {
      hint((r && r.error) || '开房失败，再试一次', true);
      $('btnCreate').disabled = false;
      S.net = null;
      return;
    }
    S.stars = r.stars;
    $('starTag').textContent = S.stars;
    S.side = r.side || 0;
    S.ai = '';
    $('roomCode').textContent = r.code;
    $('waiting').classList.remove('hidden');
    startPolling();
  } catch (e) {
    hint('连不上服务器，检查一下再试', true);
    $('btnCreate').disabled = false;
    S.net = null;
  }
}

async function joinRoom() {
  const code = ($('codeInput').value || '').trim();
  if (!S.who) { hint('先去首页填个学习档案的名字', true); return; }
  if (code.length !== 4) { hint('房间号是 4 位数字', true); return; }
  sfx.unlock();
  sfx.click();
  $('btnJoin').disabled = true;
  hint('正在进房…');
  S.net = new MpkNet(S.who);
  try {
    const r = await S.net.join(code, S.robot, false);
    if (!r || !r.ok) {
      hint((r && r.error) || '进不去，房间号对不对？', true);
      $('btnJoin').disabled = false;
      S.net = null;
      return;
    }
    S.stars = r.stars;
    $('starTag').textContent = S.stars;
    S.side = r.side || 1;
    S.ai = '';
    startPolling();
  } catch (e) {
    hint('连不上服务器，检查一下再试', true);
    $('btnJoin').disabled = false;
    S.net = null;
  }
}

async function startPractice(level) {
  if (!S.who) { hint('先去首页填个学习档案的名字', true); return; }
  sfx.unlock();
  sfx.click();
  hint('正在让 AI 上场…');
  S.net = new MpkNet(S.who);
  S.ai = level;
  try {
    const r = await S.net.create({ robot: S.robot, ai: level, free: true });
    if (!r || !r.ok) {
      hint((r && r.error) || '练习开不起来', true);
      S.net = null;
      return;
    }
    S.side = r.side || 0;
    startPolling();
  } catch (e) {
    hint('连不上服务器，检查一下再试', true);
    S.net = null;
  }
}

async function cancelRoom() {
  if (!S.net) return;
  try { await S.net.cancel(); } catch (e) { /* ignore */ }
  S.net.stop();
  S.net = null;
  $('waiting').classList.add('hidden');
  $('btnCreate').disabled = false;
  $('btnJoin').disabled = false;
  hint('已取消，报名费退回来了。');
  loadStars();
}

function startPolling() {
  S.net.start(onSnapshot, onNetError);
}

function onNetError(err) {
  if (S.phase === 'lobby') {
    if (err && err.gone) {
      $('waiting').classList.add('hidden');
      hint('房间已经关了，重新建一个吧', true);
      $('btnCreate').disabled = false;
      $('btnJoin').disabled = false;
    }
    return;
  }
  if (S.phase === 'racing') {
    S.phase = 'over';
    leaveToLobby();
    alert((err && err.error) || '连接断了，这局先结束');
  }
}

/* ---------------- 比赛 ---------------- */

function onSnapshot(snap) {
  if (!snap || !snap.ok) return;
  if (S.phase === 'lobby') {
    if (snap.state === 'playing') beginRace(snap);
    else if (snap.state === 'over') {
      /* 极端情况：还没开始就结束了 */
      beginRace(snap);
      finishRace(snap);
    }
    return;
  }
  if (S.phase !== 'racing') return;

  S.snap = snap;
  S.side = snap.me ? snap.me.side : S.side;
  if (S.race) S.race.setSnapshot(snap);
  S.hud.update(snap);

  if (snap.t < 0) {
    const n = Math.ceil(-snap.t);
    S.hud.countdown(-snap.t);
    if (n !== S.lastCount && n > 0) {
      S.lastCount = n;
      sfx.count();
    }
  } else {
    S.hud.hideCountdown();
    if (S.lastCount !== 0) {
      S.lastCount = 0;
      sfx.go();
    }
    maybeAsk();
  }

  if (snap.me) {
    if (snap.me.crash > 0) S.hud.crash(snap.me.crash);
    /* 本地倒计时还没走完就别让快照提前收掉遮罩：
       偶尔会先收到一帧 crash=0 的旧快照，孩子就只闪一下。 */
    else if (!S.crashTimer) S.hud.crash(0);
  }

  if (snap.state === 'over' && !S.resultShown) finishRace(snap);
}

function beginRace(snap) {
  S.phase = 'racing';
  S.snap = snap;
  S.side = snap.me ? snap.me.side : S.side;
  S.qIndex = 0;
  S.answerSeq = 0;
  S.q = null;
  S.input = '';
  S.locked = false;
  S.wrongs = [];
  S.resultShown = false;
  S.lastCount = 9;
  S.qsrc.startGame();

  $('lobby').classList.add('hidden');
  $('waiting').classList.add('hidden');
  $('result').classList.add('hidden');
  $('question').classList.remove('hidden');
  S.hud.reset();
  S.hud.show(true);
  hint('');

  if (!S.race) {
    S.race = new RaceView($('stage'), $('minimap'), snap.code);
    const list = (snap.racers && snap.racers.length)
      ? snap.racers.slice()
      : [snap.me, snap.op].filter(Boolean);
    const mySlot = snap.me ? snap.me.slot : 0;
    const meItem = list.filter((r) => r.slot === mySlot)[0] || snap.me;
    const metas = [Object.assign({}, meItem, { label: '我' })]
      .concat(list.filter((r) => r.slot !== mySlot).map((r) => Object.assign({}, r, {
        label: r.who || (r.ai ? 'AI' : '对手')
      })));
    S.race.setPlayers(metas);
    S.race.start();
  }
  S.race.setSnapshot(snap);
  sfx.unlock();
}

/* ---------------- 出题与作答 ---------------- */

function maybeAsk() {
  if (S.phase !== 'racing') return;
  if (!S.snap || S.snap.t < 0.6) return;
  if (S.q || S.locked) return;
  if (S.snap.me && S.snap.me.crash > 0) return;
  if (S.snap.state === 'over') return;
  ask();
}

function ask() {
  const q = S.qsrc.next(S.qIndex);
  S.qIndex += 1;
  S.q = q;
  S.input = '';
  S.locked = false;

  $('qType').textContent = q.typeName;
  $('qSkill').textContent = q.skillName || '';
  const me = S.snap && S.snap.me;
  $('qCombo').textContent = me && me.combo > 0 ? '连击 ×' + me.combo : '连击 —';
  $('qCombo').classList.toggle('hot', !!(me && me.combo >= 6));
  $('qAcc').textContent = me ? '正确率 ' + accuracy(me) : '正确率 —';
  $('qStem').textContent = q.q;
  $('qFeedback').textContent = '';
  $('qFeedback').className = 'q-feedback';
  $('btnSkip').disabled = false;
  clearScratch();

  if (q.mode === 'num') renderNumeric(q);
  else renderChoice(q);
}

function accuracy(p) {
  const total = (p.right || 0) + (p.wrong || 0);
  return total ? Math.round(((p.right || 0) / total) * 100) + '%' : '—';
}

function renderNumeric() {
  const keys = [
    ['1', '1'], ['2', '2'], ['3', '3'], ['del', '⌫'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['clear', 'C'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['.', '.'],
    ['', ''], ['0', '0'], ['', ''], ['ok', '提交']
  ];
  const keyHtml = keys.map((k) => {
    if (!k[0]) return '<button class="k-empty" disabled></button>';
    const cls = k[0] === 'ok' ? 'k-ok' : k[0] === 'del' ? 'k-del' : k[0] === 'clear' ? 'k-clear' : '';
    return '<button class="' + cls + '" type="button" data-key="' + k[0] + '">' + k[1] + '</button>';
  }).join('');
  $('qBody').innerHTML =
    '<div class="num-wrap">'
    + '<div id="ansDisplay" class="ans-display empty">输入答案</div>'
    + '<div class="keypad">' + keyHtml + '</div>'
    + '</div>';
  $('qBody').querySelectorAll('[data-key]').forEach((b) => {
    b.onclick = () => onNumKey(b.dataset.key);
  });
}

function renderChoice(q) {
  const letters = ['A', 'B', 'C', 'D'];
  $('qBody').innerHTML = '<div class="opt-grid">' + q.o.map((text, i) =>
    '<button class="opt-btn" type="button" data-opt="' + i + '"><i>' + letters[i] + '</i><span>' + esc(text) + '</span></button>'
  ).join('') + '</div>';
  $('qBody').querySelectorAll('[data-opt]').forEach((b) => {
    b.onclick = () => onChoice(Number(b.dataset.opt));
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function onNumKey(k) {
  if (S.locked || !S.q) return;
  if (k === 'ok') { submitNumeric(); return; }
  if (k === 'del') S.input = S.input.slice(0, -1);
  else if (k === 'clear') S.input = '';
  else if (k === '.') {
    if (S.input.indexOf('.') >= 0) return;
    S.input = (S.input || '0') + '.';
  } else {
    if (S.input.length >= 10) return;
    S.input += k;
  }
  paintInput();
}

function paintInput() {
  const el = $('ansDisplay');
  if (!el) return;
  el.textContent = S.input || '输入答案';
  el.classList.toggle('empty', !S.input);
}

function submitNumeric() {
  if (S.locked || !S.q || S.q.mode !== 'num') return;
  if (!S.input) {
    flash('先输入答案', 'bad');
    return;
  }
  const ok = judgeNumeric(S.input, S.q.a);
  answer(ok, S.input);
}

function onChoice(idx) {
  if (S.locked || !S.q || S.q.mode !== 'choice') return;
  const q = S.q;
  q.o.forEach((text, i) => {
    const b = $('qBody').querySelector('[data-opt="' + i + '"]');
    if (!b) return;
    b.disabled = true;
    if (i === q.a) b.classList.add('correct');
  });
  if (idx !== q.a) {
    const b = $('qBody').querySelector('[data-opt="' + idx + '"]');
    if (b) b.classList.add('wrong');
  }
  answer(idx === q.a, q.o[idx]);
}

function answer(ok, mine) {
  if (S.locked || !S.q) return;
  S.locked = true;
  const q = S.q;
  const seq = ++S.answerSeq;
  $('btnSkip').disabled = true;

  if (!ok) {
    S.wrongs.push({ q: q, mine: mine });
    revealAnswer();
    flash('答错：正确答案是 ' + answerText(q) + (q.tip ? ' · ' + q.tip : ''), 'bad');
    sfx.wrong();
  } else {
    flash('答对了，机器人加速！', 'good');
    sfx.right();
    if (S.race) S.race.cheer(0.55);
  }

  if (S.net) {
    S.net.answer(seq, ok).then((r) => {
      if (!r || !S.q || S.q !== q) return;
      if (ok && r.gain) {
        flash('答对 +' + Number(r.gain).toFixed(2) + ' m/s' + (r.combo >= 3 ? ' · 连击 ×' + r.combo : ''), 'good');
      }
      if (r.crash > 0) {
        flash('连续答错 3 题，机器人摔倒了，重启 ' + Number(r.crash).toFixed(1) + ' 秒', 'bad');
        sfx.crash();
        crashCountdown(Number(r.crash));
      }
    });
  }

  const wait = ok ? 380 : 1200;
  setTimeout(() => {
    S.q = null;
    S.locked = false;
    waitCrashThenAsk();
  }, wait);
}

function waitCrashThenAsk() {
  if (S.phase !== 'racing') return;
  const me = S.snap && S.snap.me;
  if (me && me.crash > 0) {
    setTimeout(waitCrashThenAsk, 250);
    return;
  }
  maybeAsk();
}

/* 摔倒遮罩用本地倒计时兜底：服务端快照可能因为轮询节流晚到，
   只靠快照的话孩子看不到「摔倒了、正在重启」这段反馈。 */
function crashCountdown(sec) {
  clearInterval(S.crashTimer);
  let left = sec;
  S.hud.crash(left);
  S.crashTimer = setInterval(() => {
    left = Math.round((left - 0.1) * 10) / 10;
    if (left <= 0) {
      clearInterval(S.crashTimer);
      S.crashTimer = 0;
      S.hud.crash(0);
      return;
    }
    S.hud.crash(left);
  }, 100);
}

function revealAnswer() {
  const q = S.q;
  if (!q) return;
  if (q.mode === 'choice') {
    q.o.forEach((text, i) => {
      const b = $('qBody').querySelector('[data-opt="' + i + '"]');
      if (b) {
        b.disabled = true;
        if (i === q.a) b.classList.add('correct');
      }
    });
  } else if (!S.input) {
    paintInput();
  }
}

function flash(text, cls) {
  const el = $('qFeedback');
  if (!el) return;
  el.textContent = text;
  el.className = 'q-feedback ' + (cls || '');
}

function skipQuestion() {
  if (S.locked || !S.q) return;
  const q = S.q;
  if (q.mode === 'choice') {
    q.o.forEach((text, i) => {
      const b = $('qBody').querySelector('[data-opt="' + i + '"]');
      if (b) {
        b.disabled = true;
        if (i === q.a) b.classList.add('correct');
      }
    });
  }
  answer(false, '跳过');
}

/* ---------------- 结算 ---------------- */

function finishRace(snap) {
  S.resultShown = true;
  S.phase = 'over';
  S.q = null;
  S.locked = true;
  clearInterval(S.crashTimer);
  S.crashTimer = 0;
  S.hud.crash(0);
  S.hud.show(false);
  $('question').classList.add('hidden');
  if (S.race) S.race.setSnapshot(snap);
  S.qsrc.commit();
  saveWrongs();

  const mySlot = snap.me ? snap.me.slot : 0;
  const over = snap.over;
  const place = (over && over.place && over.place[String(mySlot)]) || 0;
  const draw = !!(over && over.draw);
  const win = place === 1 && !draw;
  if (snap.free) sfx.finish();
  else if (win) sfx.finish();
  else if (draw) sfx.count();
  else if (place === 2) sfx.right();
  else sfx.lose();

  $('result').classList.remove('hidden');
  S.result.show({
    snap: snap, place: place, draw: draw,
    total: (snap.racers || []).length || 4,
    wrongs: S.wrongs.slice()
  });
}

function saveWrongs() {
  if (!S.wrongs.length) return;
  try {
    const list = S.wrongs.map((w) => ({
      skill: w.q.skill,
      q: w.q.q,
      a: answerText(w.q),
      tip: w.q.tip || '',
      mine: String(w.mine == null ? '' : w.mine),
      t: Date.now()
    }));
    const old = JSON.parse(localStorage.getItem('sm_mpk_wrong') || '[]');
    localStorage.setItem('sm_mpk_wrong', JSON.stringify(old.concat(list).slice(-300)));
  } catch (e) { /* 存不下不影响比赛 */ }
}

function onResultAction(act) {
  if (act === 'again' || act === 'robot' || act === 'lobby') {
    leaveToLobby();
  }
}

async function leaveToLobby() {
  if (S.net) {
    try { await S.net.leave(); } catch (e) { /* ignore */ }
    S.net.stop();
  }
  S.net = null;
  S.phase = 'lobby';
  S.snap = null;
  S.q = null;
  S.locked = false;
  S.resultShown = false;
  $('result').classList.add('hidden');
  $('question').classList.add('hidden');
  $('waiting').classList.add('hidden');
  $('lobby').classList.remove('hidden');
  $('btnCreate').disabled = false;
  $('btnJoin').disabled = false;
  S.hud.show(false);
  clearInterval(S.crashTimer);
  S.crashTimer = 0;
  S.hud.crash(0);
  if (S.race) {
    S.race.dispose();
    S.race = null;
  }
  hint('');
  await loadStars();
  if (S.preview) S.preview.setRobot(S.robot);
}

/* ---------------- 草稿纸 ---------------- */

const scratch = {
  canvas: null, ctx: null, dpr: 1, drawing: false,
  last: null, open: false
};

function initScratch() {
  scratch.canvas = $('scratch');
  scratch.ctx = scratch.canvas.getContext('2d');
  $('btnScratch').onclick = toggleScratch;
  $('btnScratchClose').onclick = toggleScratch;
  $('btnScratchClear').onclick = clearScratch;
  $('btnSkip').onclick = skipQuestion;

  const c = scratch.canvas;
  c.addEventListener('pointerdown', (e) => {
    if (!scratch.open) return;
    e.preventDefault();
    scratch.drawing = true;
    scratch.last = pt(e);
    drawDot(scratch.last);
    try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  c.addEventListener('pointermove', (e) => {
    if (!scratch.drawing) return;
    e.preventDefault();
    const p = pt(e);
    const ctx = scratch.ctx;
    ctx.beginPath();
    ctx.moveTo(scratch.last.x, scratch.last.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = 'rgba(180, 235, 255, .92)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    scratch.last = p;
  });
  const end = () => { scratch.drawing = false; };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('pointerleave', end);

  window.addEventListener('resize', () => {
    if (scratch.open) sizeScratch(true);
  });
}

function pt(e) {
  const r = scratch.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function drawDot(p) {
  const ctx = scratch.ctx;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(180, 235, 255, .92)';
  ctx.fill();
}

function toggleScratch() {
  scratch.open = !scratch.open;
  $('scratch').classList.toggle('hidden', !scratch.open);
  $('scratchBar').classList.toggle('hidden', !scratch.open);
  if (scratch.open) sizeScratch(true);
}

function sizeScratch(clear) {
  const c = scratch.canvas;
  const r = c.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  scratch.dpr = dpr;
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = scratch.ctx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (clear) ctx.clearRect(0, 0, r.width, r.height);
}

function clearScratch() {
  const r = scratch.canvas.getBoundingClientRect();
  scratch.ctx.clearRect(0, 0, r.width, r.height);
}

/* ---------------- 键盘 ---------------- */

function onKey(e) {
  if (S.phase !== 'racing' || !S.q || S.locked) return;
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;

  if (e.key === 'Escape') {
    toggleScratch();
    return;
  }
  if (S.q.mode === 'num') {
    if (/^\d$/.test(e.key)) { e.preventDefault(); onNumKey(e.key); }
    else if (e.key === '.') { e.preventDefault(); onNumKey('.'); }
    else if (e.key === 'Backspace') { e.preventDefault(); onNumKey('del'); }
    else if (e.key === 'Enter') { e.preventDefault(); submitNumeric(); }
  } else if (S.q.mode === 'choice') {
    if (/^[1-4]$/.test(e.key)) {
      e.preventDefault();
      onChoice(Number(e.key) - 1);
    }
  }
}

/* ---------------- 起跑 ---------------- */

boot();

/* 供控制台排查用（不影响游戏） */
window.__MPK = S;
