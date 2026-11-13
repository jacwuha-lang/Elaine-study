/* ============================================================
   core.js — 基础工具 / 状态 / 存储 / 音效 / 粒子特效
   全局命名空间 SM，普通 script 加载（file:// 也能跑）
   ============================================================ */
window.SM = window.SM || {};

(function (SM) {
  'use strict';

  /* ---------------- 工具 ---------------- */
  const U = {};

  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  U.rand = function (n) { return Math.floor(Math.random() * n); };

  U.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  U.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  U.nl = function (s) {
    return U.esc(s).replace(/\n/g, '<br>').replace(/_{2,}/g, '<span class="blk"></span>');
  };

  U.cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  /* 判定用的规范化：忽略大小写、标点、缩写差异、漏打撇号 */
  const CONTR = {
    "what's": "what is", "it's": "it is", "that's": "that is", "he's": "he is", "she's": "she is",
    "there's": "there is", "who's": "who is", "where's": "where is", "here's": "here is",
    "let's": "let us", "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are",
    "isn't": "is not", "aren't": "are not", "don't": "do not", "doesn't": "does not", "didn't": "did not",
    "can't": "can not", "cannot": "can not", "won't": "will not", "wasn't": "was not", "weren't": "were not",
    "i've": "i have", "i'll": "i will", "you'll": "you will", "hasn't": "has not", "haven't": "have not",
    "isnt": "is not", "arent": "are not", "dont": "do not", "doesnt": "does not", "didnt": "did not",
    "cant": "can not", "wont": "will not", "wasnt": "was not", "werent": "were not", "hasnt": "has not",
    "havent": "have not", "im": "i am", "theyre": "they are", "youre": "you are",
    "lets": "let us", "whats": "what is", "thats": "that is",
    /* cannot 是标准写法（一个词），但 can't / can not 也是对的。
       三者归一成同一个串，判分时才不会因为写法不同判错。 */
    "cannot": "can not"
  };

  U.norm = function (s) {
    let t = String(s || '').toLowerCase().replace(/[\u2018\u2019`]/g, "'");
    t = t.replace(/[^a-z0-9' ]+/g, ' ');
    const out = [];
    t.split(/\s+/).forEach(function (w) {
      if (!w) return;
      const r = CONTR[w];
      if (r) out.push.apply(out, r.split(' '));
      else out.push(w);
    });
    return out.join(' ').replace(/'/g, '');
  };

  U.same = function (a, b) { return U.norm(a) === U.norm(b); };

  /* ---------------- 存储 ----------------
     两种模式：
       ① 档案模式（设了名字）：index.html 已经把 profiles/<名字>.json 同步取回来，
          之后所有读写都在内存里，攒 400ms 再写回服务器 —— 换设备填同一个名字
          就能接着用，这才是「无缝切换」。
       ② 本机模式（还没设名字）：沿用 localStorage，不联网也能用。
     对外接口保持同步，调用方不用改。 */
  const S = {};
  const PROFILE = window.__SM_PROFILE || '';
  const PDB = (window.__SM_DATA && typeof window.__SM_DATA === 'object') ? window.__SM_DATA : {};
  const SERVER = !!PROFILE;
  let saveTimer = null;

  function flush() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!SERVER) return;
    try {
      fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: PROFILE, data: PDB })
      }).catch(function () { /* 断网就等下次改动再存 */ });
    } catch (e) { /* ignore */ }
  }
  function queue() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 400);
  }

  S.get = function (k, d) {
    if (SERVER) return Object.prototype.hasOwnProperty.call(PDB, k) ? PDB[k] : d;
    try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }
    catch (e) { return d; }
  };
  S.set = function (k, v) {
    if (SERVER) { PDB[k] = v; queue(); return; }
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 隐私模式忽略 */ }
  };
  S.profile = function () { return PROFILE; };
  S.all = function () { return PDB; };
  S.flush = flush;

  /* 关页面/切后台时把没写完的存掉 */
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });

  /* ---------------- 音效（Web Audio 合成，无外部文件） ---------------- */
  const A = {};
  let ctx = null;

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  function tone(freq, at, dur, type, vol) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol || 0.14, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  A.unlock = function () { ac(); };
  A.tap = function () { tone(780, 0, 0.055, 'sine', 0.06); };
  A.ok = function () {
    tone(523.25, 0, 0.12, 'triangle', 0.15);
    tone(659.25, 0.08, 0.12, 'triangle', 0.15);
    tone(783.99, 0.16, 0.22, 'triangle', 0.15);
  };
  A.no = function () {
    tone(311.13, 0, 0.14, 'sine', 0.14);
    tone(233.08, 0.12, 0.24, 'sine', 0.14);
  };
  A.level = function () {
    [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.085, 0.2, 'triangle', 0.14); });
  };
  A.pop = function () { tone(880, 0, 0.08, 'sine', 0.1); tone(1174, 0.06, 0.1, 'sine', 0.08); };

  /* 小鲸唱歌：小星星前两句，现场合成，不需要音频文件 */
  A.sing = function () {
    const seq = [
      523.25, 523.25, 783.99, 783.99, 880.00, 880.00, 783.99,
      698.46, 698.46, 659.25, 659.25, 587.33, 587.33, 523.25
    ];
    const step = 0.185;
    seq.forEach(function (f, i) { tone(f, i * step, step * 0.9, 'triangle', 0.13); });
  };

  /* 小鲸跳舞：四拍鼓点 + 上行琶音收尾 */
  A.dance = function () {
    for (let i = 0; i < 4; i++) {
      tone(118, i * 0.215, 0.13, 'sine', 0.2);            // 底鼓
      tone(1500, i * 0.215 + 0.108, 0.045, 'square', 0.028); // 踩镲
      tone(392, i * 0.215, 0.1, 'triangle', 0.07);        // 贝斯
    }
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
      tone(f, 0.9 + i * 0.095, 0.16, 'triangle', 0.12);
    });
  };

  A.blip = function (pitch) { tone(pitch || 640, 0, 0.07, 'sine', 0.075); };

  A.buzz = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  /* ---------------- 粒子 ---------------- */
  const FX = {};

  FX.burst = function (x, y, count) {
    const colors = ['#FFC93C', '#FF7A59', '#4C8DFF', '#22C79A', '#A78BFA', '#FF6B81'];
    const n = count || 16;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'spark';
      const sz = 6 + Math.random() * 7;
      el.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz +
        'px;background:' + colors[i % colors.length];
      if (i % 3 === 0) el.style.borderRadius = '2px';
      document.body.appendChild(el);
      const ang = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 110;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 40;
      const anim = el.animate([
        { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.2) rotate(' + (Math.random() * 540 - 270) + 'deg)', opacity: 0 }
      ], { duration: 650 + Math.random() * 450, easing: 'cubic-bezier(.15,.75,.4,1)' });
      anim.onfinish = function () { el.remove(); };
    }
  };

  /* 飘音符：小鲸唱歌时从头顶冒出来 */
  FX.notes = function (x, y, count) {
    const chars = ['♪', '♫', '♩', '♬'];
    const colors = ['#FF7A59', '#22C79A', '#4C8DFF', '#A78BFA', '#FFC93C'];
    const n = count || 7;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'note';
      el.textContent = chars[i % chars.length];
      el.style.left = (x + (Math.random() - 0.5) * 40) + 'px';
      el.style.top = y + 'px';
      el.style.color = colors[i % colors.length];
      el.style.animationDelay = (i * 90) + 'ms';
      document.body.appendChild(el);
      const dx = (Math.random() - 0.5) * 120;
      const anim = el.animate([
        { transform: 'translate(-50%,6px) scale(.5) rotate(-8deg)', opacity: 0 },
        { transform: 'translate(calc(-50% + ' + (dx * 0.35) + 'px), -36px) scale(1) rotate(6deg)', opacity: 1, offset: 0.22 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), -124px) scale(.85) rotate(-14deg)', opacity: 0 }
      ], { duration: 1250 + Math.random() * 550, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
      anim.onfinish = function () { el.remove(); };
    }
  };

  /* 星星四散：庆祝用（连击、升级之类） */
  FX.stars = function (x, y, count) {
    const n = count || 12;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'note';
      el.textContent = '✨';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.fontSize = (13 + Math.random() * 9) + 'px';
      document.body.appendChild(el);
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const dist = 55 + Math.random() * 65;
      const anim = el.animate([
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
        { transform: 'translate(calc(-50% + ' + (Math.cos(ang) * dist * 0.55) + 'px), calc(-50% + ' + (Math.sin(ang) * dist * 0.55) + 'px)) scale(1)', opacity: 1, offset: 0.3 },
        { transform: 'translate(calc(-50% + ' + (Math.cos(ang) * dist) + 'px), calc(-50% + ' + (Math.sin(ang) * dist) + 'px)) scale(.2)', opacity: 0 }
      ], { duration: 780 + Math.random() * 320, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
      anim.onfinish = function () { el.remove(); };
    }
  };

  FX.toast = function (msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(FX._tt);
    FX._tt = setTimeout(function () { el.classList.remove('show'); }, 1700);
  };

  FX.combo = function (n) {
    const el = document.getElementById('combo');
    if (!el) return;
    el.textContent = '连击 x' + n + ' 🔥';
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  };

  /* ---------------- 全局状态 ---------------- */
  const ST = {
    screen: 'hub',
    mod: null,
    stars: S.get('sm_stars', 0),
    qstat: S.get('sm_q', {}),   // 每题 {w:错次, c:对次}
    best: S.get('sm_best', {}),
    session: null,
    combo: 0
  };

  ST.saveStars = function () { S.set('sm_stars', ST.stars); };
  ST.saveQ = function () { S.set('sm_q', ST.qstat); };

  SM.U = U;
  SM.store = S;
  SM.sfx = A;
  SM.fx = FX;
  SM.state = ST;

  /* 模块注册表 */
  SM.modules = {};
  SM.order = [];
  SM.register = function (m) {
    SM.modules[m.id] = m;
    SM.order.push(m.id);
  };

})(window.SM);
