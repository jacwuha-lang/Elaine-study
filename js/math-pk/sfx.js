/* ============================================================
   sfx.js — 马拉松专用音效（WebAudio，不依赖音频文件）
   ============================================================ */

let ctx = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type, vol, delay) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + (delay || 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol == null ? 0.12 : vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function slide(f1, f2, dur, vol) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
  g.gain.setValueAtTime(vol == null ? 0.09 : vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  unlock() { ac(); },
  click() { tone(660, 0.06, 'square', 0.05); },
  count() { tone(520, 0.12, 'sine', 0.12); },
  go() { tone(880, 0.25, 'sine', 0.16); tone(1320, 0.3, 'sine', 0.08, 0.05); },
  right() { tone(740, 0.1, 'sine', 0.1); tone(1100, 0.14, 'sine', 0.08, 0.08); },
  wrong() { tone(190, 0.18, 'square', 0.07); },
  combo(n) {
    const f = 620 + Math.min(10, n) * 45;
    tone(f, 0.12, 'triangle', 0.09);
  },
  crash() {
    slide(320, 60, 0.45, 0.12);
    tone(90, 0.35, 'square', 0.08, 0.02);
  },
  lap() { tone(520, 0.1, 'sine', 0.1); tone(780, 0.16, 'sine', 0.08, 0.09); },
  finish() {
    [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.22, 'sine', 0.11, i * 0.09));
  },
  lose() {
    [440, 380, 300, 220].forEach((f, i) => tone(f, 0.24, 'triangle', 0.09, i * 0.12));
  }
};
