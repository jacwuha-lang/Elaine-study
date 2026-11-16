/* ============================================================
   net.js — 马拉松房间的网络层
   ------------------------------------------------------------
   只做四件事：建房、加入、上报本题对错、长轮询拉快照。
   星星的加减全在服务器，这一层不碰余额。
   ============================================================ */

export class MpkNet {
  constructor(who) {
    this.who = who || '';
    this.code = '';
    this.side = 0;
    this.v = -1;
    this.stopped = false;
    this.polling = false;
    this.onSnapshot = null;
    this.onError = null;
    this._timer = 0;
  }

  async _post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  async create(opts) {
    const res = await this._post('/api/mpk/create', {
      who: this.who,
      free: !!(opts && opts.free),
      ai: (opts && opts.ai) || '',
      robot: (opts && opts.robot) || 'jifeng'
    });
    if (res && res.ok) {
      this.code = res.code;
      this.side = res.side || 0;
      this.v = -1;
    }
    return res;
  }

  async join(code, robot, free) {
    const res = await this._post('/api/mpk/join', {
      who: this.who, code: code, robot: robot || 'jifeng', free: !!free
    });
    if (res && res.ok) {
      this.code = res.code;
      this.side = res.side || 0;
      this.v = -1;
    }
    return res;
  }

  async cancel() {
    if (!this.code) return { ok: true };
    return this._post('/api/mpk/cancel', { who: this.who, code: this.code });
  }

  async leave() {
    if (!this.code) return { ok: true };
    return this._post('/api/mpk/leave', { who: this.who, code: this.code });
  }

  /** 上报一题；调用方可以拿回包显示「+0.24 m/s」，失败不挡下一题 */
  answer(seq, ok) {
    if (!this.code) return Promise.resolve(null);
    return this._post('/api/mpk/answer', {
      who: this.who, code: this.code, seq: seq, ok: !!ok
    }).catch((e) => {
      console.warn('[mpk] answer', e);
      return null;
    });
  }

  start(onSnapshot, onError) {
    if (this.polling) return;
    this.polling = true;
    this.stopped = false;
    this.onSnapshot = onSnapshot;
    this.onError = onError;
    this._loop();
  }

  async _loop() {
    while (!this.stopped && this.code) {
      try {
        const qs = 'who=' + encodeURIComponent(this.who) +
          '&code=' + encodeURIComponent(this.code) +
          '&v=' + this.v + '&e=0';
        const r = await fetch('/api/mpk/sync?' + qs, { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const snap = await r.json();
        if (this.stopped) return;
        if (!snap || snap.ok === false) {
          if (snap && snap.gone) {
            this.stopped = true;
            if (this.onError) this.onError(snap);
            return;
          }
          throw new Error((snap && snap.error) || 'sync bad');
        }
        if (typeof snap.v === 'number' && snap.v > this.v) this.v = snap.v;
        if (this.onSnapshot) this.onSnapshot(snap);
        if (snap.state === 'over') {
          /* 结算后停轮询，避免房间 180 秒后关掉刷错误 */
          this.stopped = true;
          return;
        }
      } catch (e) {
        if (this.stopped) return;
        if (this.onError) this.onError({ error: String(e && e.message || e) });
        await new Promise((res) => setTimeout(res, 800));
      }
    }
  }

  stop() {
    this.stopped = true;
    this.polling = false;
    if (this._timer) clearTimeout(this._timer);
  }
}
