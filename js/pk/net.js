/* ============================================================
   net.js — 擂台的网络层
   ------------------------------------------------------------
   只有两种请求：
     ① 动作（建房 / 加入 / 取消 / 答题 / 离开）—— 一次性 POST
     ② 同步 —— 优先使用服务器持续推送，连接不可用时回退长轮询。

   断线策略：一轮请求失败不弹窗，退避 0.8s 重试；
   连续失败 5 次才认输，告诉上层「连接断了」。
   ============================================================ */

/* ============================================================
   沙盒模式：pk.html?free=1
   ------------------------------------------------------------
   给调试用的。整个页面不打星战：建房/加入不扣 50，赢了也不加 75，
   退出更不会白退一笔。改动只在服务端那一份状态里，档案里那颗星星
   连碰都不碰，所以调动作、调平衡可以随便开几十局。
   参数名除了 free 也认 sandbox / debug（都是同一个意思）。
   ============================================================ */
const SANDBOX_FLAG = (() => {
  try {
    const q = new URLSearchParams(location.search);
    for (const k of ['free', 'sandbox', 'debug']) {
      if (!q.has(k)) continue;
      const v = (q.get(k) || '').toLowerCase();
      if (v === '' || v === '1' || v === 'true' || v === 'yes') return true;
    }
  } catch (e) { /* 老浏览器没有 URLSearchParams 就当没开 */ }
  return false;
})();

export const SANDBOX = SANDBOX_FLAG;

export class Net {
  constructor(who) {
    this.who = who;
    this.code = '';
    this.lastV = 0;
    this.lastEv = 0;
    this.gotFirst = false;
    this.running = false;
    this.fails = 0;
    this.failLimit = 5;
    this.free = SANDBOX_FLAG;
    this.faction = 'female';
    this.deployment = 'left';
    this.onState = null;
    this.onGone = null;
    this._stop = false;
    this.stream = null;
    this.generation = 0;
  }

  async post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      cache: 'no-store',
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  /* ai 传 easy/normal/hard/boss 就是开一间 AI 练功房（服务器把机器人直接
     摆在 1 号位，状态直接是 playing，没有「等人」那一屏） */
  create(ai) {
    return this.post('/api/pk/create', { who: this.who, free: this.free, ai: ai || '', faction: this.faction, deployment: this.deployment });
  }
  join(code) {
    return this.post('/api/pk/join', { who: this.who, code: code, free: this.free });
  }
  cancel() { return this.post('/api/pk/cancel', { who: this.who, code: this.code }); }
  leave() { return this.post('/api/pk/leave', { who: this.who, code: this.code }); }
  answer(seq, ok) {
    return this.post('/api/pk/answer', { who: this.who, code: this.code, seq: seq, ok: ok });
  }
  /* 扣血买提示：血量归服务器管，扣多少由它说了算 */
  hint() {
    return this.post('/api/pk/hint', { who: this.who, code: this.code });
  }

  /* 关页面时用 beacon 兜底：不保证送达，但比什么都不发强 */
  beaconLeave() {
    if (!this.code) return;
    try {
      const body = JSON.stringify({ who: this.who, code: this.code });
      navigator.sendBeacon('/api/pk/leave', new Blob([body], { type: 'application/json' }));
    } catch (e) { /* ignore */ }
  }

  start(code) {
    this.stop();
    this.code = code;
    this.lastV = 0;
    this.lastEv = 0;
    this.gotFirst = false;
    this.fails = 0;
    this.running = true;
    this._stop = false;
    const generation = ++this.generation;
    if (typeof EventSource === 'undefined') { this.loop(generation); return; }
    const url = '/api/pk/stream?who=' + encodeURIComponent(this.who)
      + '&code=' + encodeURIComponent(this.code) + '&v=' + this.lastV + '&e=' + this.lastEv;
    const stream = new EventSource(url);
    this.stream = stream;
    stream.onmessage = (event) => {
      if (!this.running || generation !== this.generation) return;
      try { this.accept(JSON.parse(event.data)); }
      catch (e) { console.warn('[pk] 无法读取战场快照', e); }
    };
    stream.onerror = () => {
      if (!this.running || generation !== this.generation) return;
      stream.close();
      this.stream = null;
      this.loop(generation);
    };
  }

  stop() {
    this.running = false;
    this._stop = true;
    this.generation++;
    if (this.stream) this.stream.close();
    this.stream = null;
  }

  accept(snap) {
    if (!snap || !snap.ok) {
      this.stop();
      if (this.onGone) this.onGone((snap && snap.error) || '房间没了');
      return;
    }
    this.lastV = snap.v;
    if (!this.gotFirst) {
      this.gotFirst = true;
      snap.ev = [];
    } else {
      snap.ev = (snap.ev || []).filter((event) => event.i > this.lastEv);
    }
    this.lastEv = Math.max(this.lastEv, snap.evn || 0);
    if (this.onState) this.onState(snap);
  }

  async loop(generation) {
    while (this.running && generation === this.generation) {
      const url = '/api/pk/sync?who=' + encodeURIComponent(this.who)
        + '&code=' + encodeURIComponent(this.code) + '&v=' + this.lastV
        + '&e=' + this.lastEv;
      let snap = null;
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 6000);
        const r = await fetch(url, { cache: 'no-store', signal: ctl.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        snap = await r.json();
        this.fails = 0;
      } catch (e) {
        if (this._stop || generation !== this.generation) return;
        this.fails++;
        if (this.fails >= this.failLimit) {
          this.running = false;
          if (this.onGone) this.onGone('网络断了，回大厅重来一次');
          return;
        }
        await new Promise((res) => setTimeout(res, 800));
        continue;
      }

      if (!this.running || generation !== this.generation) return;

      this.accept(snap);
    }
  }
}
