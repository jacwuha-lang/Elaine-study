/* ============================================================
   hud.js — 比赛中的数字与提示
   ------------------------------------------------------------
   只碰 DOM，不碰 3D。快照 20Hz 进来，这里按需刷新，
   避免数字每帧跳动。
   ============================================================ */

import { LAP, LAPS, TOTAL } from './track.js';

function fmtTime(s) {
  const v = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(v / 60);
  const r = v % 60;
  return m + ':' + (r < 10 ? '0' + r : r);
}

function el(id) {
  return document.getElementById(id);
}

export class Hud {
  constructor() {
    this.box = el('hud');
    this.lap = el('hudLap');
    this.dist = el('hudDist');
    this.time = el('hudTime');
    this.rank = el('hudRank');
    this.gap = el('hudGap');
    this.speedMe = el('speedMe');
    this.speedMeVal = el('speedMeVal');
    this.speedOp = el('speedOp');
    this.speedOpVal = el('speedOpVal');
    this.comboMe = el('comboMe');
    this.comboOp = el('comboOp');
    this.accMe = el('accMe');
    this.noticeEl = el('notice');
    this.penaltyEl = el('penalty');
    this.countdownEl = el('countdown');
    this.crashEl = el('crashMask');
    this.crashText = el('crashText');
    this._noticeTimer = 0;
    this._lastLap = [0, 0];
    this._lastCombo = [0, 0];
    this._lastCount = 9;
  }

  show(on) {
    if (this.box) this.box.classList.toggle('hidden', !on);
  }

  update(snap) {
    if (!snap || !snap.me) return;
    const me = snap.me;
    const racers = (snap.racers || []).filter((r) => !r.left);
    const sorted = racers.slice().sort((a, b) => b.dist - a.dist);
    const place = Math.max(1, sorted.findIndex((r) => r.slot === me.slot) + 1);
    const leader = sorted[0] || me;

    const lapNow = Math.min(LAPS, Math.floor(me.dist / LAP) + 1);
    if (this.lap) this.lap.textContent = lapNow + '/' + LAPS;
    if (this.dist) this.dist.textContent = Math.round(me.dist) + ' / ' + TOTAL + ' m';
    if (this.time) this.time.textContent = fmtTime(snap.t);

    if (this.rank) {
      this.rank.textContent = '第 ' + place + '/' + racers.length;
      this.rank.className = 'rank' + (place === 1 ? ' first' : (place === 2 ? ' second' : ''));
    }
    if (this.gap) {
      const d = Math.max(0, leader.dist - me.dist);
      if (place === 1) {
        const back = sorted.length > 1 ? me.dist - sorted[1].dist : 0;
        this.gap.textContent = back < 3 ? '贴身领跑' : '领先 ' + Math.round(back) + ' m';
      } else {
        this.gap.textContent = d < 5 ? '咬住了' : '落后 ' + Math.round(d) + ' m';
      }
    }

    this._bar(this.speedMe, this.speedMeVal, me.speed);
    this._bar(this.speedOp, this.speedOpVal, leader ? leader.speed : 0);

    if (this.comboMe) {
      this.comboMe.textContent = me.combo > 0 ? '连击 ×' + me.combo : '连击 —';
      this.comboMe.classList.toggle('hot', me.combo >= 6);
    }
    if (this.comboOp) {
      this.comboOp.textContent = leader && leader.combo > 0 ? '×' + leader.combo : '×0';
    }
    if (this.accMe) {
      const total = me.right + me.wrong;
      this.accMe.textContent = total ? Math.round((me.right / total) * 100) + '%' : '—';
    }

    this.penalty(me.idle >= 5, me.idle);

    if (lapNow > this._lastLap[0] && lapNow > 1) {
      this.notice(lapNow === LAPS ? '最后一圈！' : '第 ' + lapNow + ' 圈', 'lap');
    }
    this._lastLap[0] = lapNow;

    if (me.combo > this._lastCombo[0]) {
      if (me.combo === 3) this.notice('连击 ×3 · 提速加强', 'combo');
      else if (me.combo === 6) this.notice('连击 ×6 · 速度线打开', 'combo');
      else if (me.combo === 10) this.notice('超频！连击 ×10', 'overdrive');
      else if (me.combo === 15) this.notice('超频爆发 · 连击 ×15', 'overdrive');
    }
    this._lastCombo[0] = me.combo;
  }

  _bar(bar, val, speed) {
    if (bar) {
      const pct = Math.max(0, Math.min(100, ((speed - 2.5) / (9.2 - 2.5)) * 100));
      bar.style.width = pct + '%';
    }
    if (val) val.textContent = (speed || 0).toFixed(1);
  }

  countdown(left) {
    if (!this.countdownEl) return;
    const n = Math.ceil(left);
    if (n <= 0) {
      this.countdownEl.textContent = 'GO!';
      this.countdownEl.className = 'countdown go';
      this._lastCount = 0;
      return;
    }
    if (n !== this._lastCount) {
      this.countdownEl.textContent = String(n);
      this.countdownEl.className = 'countdown';
      this._lastCount = n;
      return 'tick';
    }
    return '';
  }

  hideCountdown() {
    if (this.countdownEl) this.countdownEl.classList.add('hidden');
  }

  notice(text, cls) {
    if (!this.noticeEl) return;
    this.noticeEl.textContent = text;
    this.noticeEl.className = 'notice show ' + (cls || '');
    clearTimeout(this._noticeTimer);
    this._noticeTimer = setTimeout(() => {
      this.noticeEl.className = 'notice';
    }, 1500);
  }

  crash(sec) {
    if (!this.crashEl) return;
    if (sec > 0) {
      this.crashEl.classList.remove('hidden');
      if (this.crashText) this.crashText.textContent = '机器人重启中 ' + sec.toFixed(1) + 's';
    } else {
      this.crashEl.classList.add('hidden');
    }
  }

  penalty(on, idle) {
    if (!this.penaltyEl) return;
    if (!on) {
      this.penaltyEl.classList.add('hidden');
      return;
    }
    this.penaltyEl.classList.remove('hidden');
    this.penaltyEl.textContent = '已经 ' + Math.floor(idle || 0) + ' 秒没答题，机器人正在掉速！';
  }

  reset() {
    this._lastLap = [0, 0];
    this._lastCombo = [0, 0];
    this._lastCount = 9;
    if (this.countdownEl) {
      this.countdownEl.classList.remove('hidden', 'go');
      this.countdownEl.textContent = '';
    }
    if (this.noticeEl) this.noticeEl.className = 'notice';
    if (this.penaltyEl) this.penaltyEl.classList.add('hidden');
    this.crash(0);
  }
}
