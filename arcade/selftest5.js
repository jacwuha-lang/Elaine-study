/* ============================================================
   selftest5.js — 提示按钮：扣 20 灵石 / 自动填词 / 暂停等确认 /
                  确认后才消怪 / 整局键入时限翻倍
   用法：node arcade/selftest5.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function makeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k === 'canvas') return { width: 480, height: 270 };
      if (k === 'measureText') return () => ({ width: 12 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() { } });
      if (k === 'createPattern') return () => ({});
      if (k === 'createImageData' || k === 'getImageData') {
        return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, (w || x) * (h || y) * 4)) });
      }
      if (k === 'putImageData') return function () { };
      if (k in t) return t[k];
      return function () { };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function makeCanvas(w, h) {
  return {
    width: w || 480, height: h || 270, style: {}, dataset: {},
    getContext: () => makeCtx(),
    addEventListener() { }, removeEventListener() { },
    getBoundingClientRect: () => ({ width: 480, height: 270, left: 0, top: 0 }),
    setAttribute() { }, appendChild() { }
  };
}
const gameCanvas = makeCanvas(480, 270);
const documentStub = {
  readyState: 'complete',
  getElementById: (id) => (id === 'game' ? gameCanvas : null),
  createElement(tag) {
    if (tag === 'canvas') return makeCanvas(240, 135);
    return { style: {}, dataset: {}, appendChild() { }, addEventListener() { }, classList: { add() { }, remove() { }, contains: () => false } };
  },
  querySelector: () => null, addEventListener() { },
  documentElement: { classList: { contains: () => false, add() { }, remove() { } } },
  body: { appendChild() { }, classList: { add() { }, remove() { } } }
};
const windowStub = {
  document: documentStub, innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
  addEventListener() { }, requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() },
  location: { search: '' },
  localStorage: { getItem: () => null, setItem() { }, removeItem() { } },
  Image: function () {
    this.addEventListener = function () { };
    Object.defineProperty(this, 'src', { set() { }, get() { return ''; } });
    this.style = {};
  },
  AudioContext: function () {
    this.state = 'running'; this.destination = {}; this.currentTime = 0;
    const node = () => ({ connect: () => node(), start() { }, stop() { } });
    this.createGain = () => ({ gain: { value: 1, setValueAtTime() { }, exponentialRampToValueAtTime() { }, linearRampToValueAtTime() { } }, connect: () => node() });
    this.createOscillator = () => ({ type: '', frequency: { setValueAtTime() { }, exponentialRampToValueAtTime() { }, linearRampToValueAtTime() { } }, connect: () => node(), start() { }, stop() { } });
    this.createBuffer = () => ({ getChannelData: () => new Float32Array(1024) });
    this.createBufferSource = () => ({ buffer: null, connect: () => node(), start() { }, stop() { } });
    this.createBiquadFilter = () => ({ type: '', frequency: { value: 0, setValueAtTime() { } }, Q: { value: 0 }, connect: () => node() });
    this.resume = () => Promise.resolve();
  },
  URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval, console
};
windowStub.window = windowStub;
const sandbox = vm.createContext(windowStub);

['font', 'sprites', 'art-backgrounds', 'art-player', 'art-creatures', 'art', 'vocab_t1', 'vocab_t2', 'vocab_t3', 'vocab_t4', 'vocab_t5',
  'vocab_t6', 'vocab_t7', 'vocab_t8', 'vocab', 'meta', 'levels', 'word-system', 'ambient', 'skills', 'effects', 'world-renderer', 'hud-renderer', 'game'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'arcade/src/' + f + '.js'), 'utf8'), sandbox, { filename: f });
  });

const W = sandbox.window;
const A = W.ARCADE;
const wfy = W.__wfy;
const S = A.state();

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  ' + extra : '')); }
}

const wj = JSON.parse(fs.readFileSync(path.join(ROOT, 'arcade/words.json'), 'utf8'));
const pool1 = wj.words.filter(x => x.t === 1).slice(0, 40).map(x => ({ w: x.w, m: x.m, p: x.p, tier: x.t }));

function freshPlay(stones) {
  A.setActive(true);
  A.start({ tier: 1, words: pool1 });
  for (let i = 0; i < 400; i++) wfy.update(1 / 60);
  S.player.stones = stones == null ? 100 : stones;
}
function firstAlive() {
  return S.enemies.filter(e => e.alive)[0] || null;
}
function tick(n) { for (let i = 0; i < n; i++) wfy.update(1 / 60); }

console.log('── 1. 灵石不够时点不动 ──');
freshPlay(10);
let e = firstAlive();
A.hint();
ok('没有进暂停', S.paused === false);
ok('输入框还是空的', S.input === '');
ok('灵石一点没扣', S.player.stones === 10, String(S.player.stones));

console.log('\n── 2. 花 20 灵石：填词 + 暂停 ──');
freshPlay(100);
e = firstAlive();
const word0 = e.word;
const hp0 = e.hp;
A.hint();
ok('扣掉 20 灵石', S.player.stones === 80, String(S.player.stones));
ok('整个词被填进输入框', S.input === word0, '「' + S.input + '」');
ok('游戏停住了', S.paused === true);
ok('键入时限翻倍', S.timeBuff === 2);
ok('记下了待确认的词', !!S.pendHint && S.pendHint.word === word0);

console.log('\n── 3. 暂停期间世界完全不转 ──');
const t0 = S.t, hpBefore = S.player.hp, ex = Math.round(e.x);
tick(180);
ok('时间没往前走', S.t === t0, 'dt=' + (S.t - t0));
ok('怪物没动', Math.round(e.x) === ex);
ok('怪物没掉血', e.hp === hp0, 'hp ' + e.hp + '/' + e.maxHp);
ok('主角没掉血', S.player.hp === hpBefore);
wfy.typeLetter('a');
ok('这时候按键不会改输入框', S.input === word0, '「' + S.input + '」');
S.hintCd = 0;
const stoneNow = S.player.stones;
A.hint();
ok('暂停时再点提示也不会重复扣钱', S.player.stones === stoneNow && S.paused);

console.log('\n── 4. 确认之后才真的消怪 ──');
A.confirmHint();
ok('解除暂停', S.paused === false);
ok('输入框清空', S.input === '');
ok('待确认清掉了', S.pendHint === null);
tick(60);
ok('那只怪被打掉了', !e.alive, 'hp ' + e.hp + '/' + e.maxHp);
const st0 = wfy.wordStat(word0);
ok('记成「看过提示」而不是「自己拼对」', st0.h === 1 && st0.c === 0,
  'c=' + st0.c + ' h=' + st0.h);
ok('不涨连击', (S.player.combo || 0) === 0, String(S.player.combo));

console.log('\n── 5. 取消：回到自己拼，灵石不退但倍率留着 ──');
freshPlay(100);
e = firstAlive();
wfy.typeLetter(e.word.charAt(0));
const partial = S.input;
const wordStill = e.word;
A.hint();
ok('提示后框里是整词', S.input === wordStill);
A.cancelHint();
ok('取消后恢复到原来拼到一半的样子', S.input === partial, '「' + S.input + '」');
ok('取消不退灵石', S.player.stones === 80, String(S.player.stones));
ok('倍率还留着', S.timeBuff === 2);
ok('怪一点事没有', e.alive && e.hp === e.maxHp);

console.log('\n── 6. 时限：基础值 × 倍率 ──');
S.timeBuff = 1;
const L1 = wfy.wordLimit('fast');
ok('时限按词长算', Math.abs(L1 - (wfy.TIME_BASE + 4 * wfy.TIME_PER_CHAR)) < 1e-6, L1.toFixed(2) + 's');
ok('小朋友够用：4 字母词至少 35 秒', wfy.wordLimit('fast') >= 35, L1.toFixed(1) + 's');
ok('10 字母长词至少 55 秒', wfy.wordLimit('abcdefghij') >= 55, wfy.wordLimit('abcdefghij').toFixed(1) + 's');
S.timeBuff = 2;
const L2 = wfy.wordLimit('fast');
ok('翻倍后正好是两倍', Math.abs(L2 - L1 * 2) < 1e-6, L1.toFixed(1) + 's → ' + L2.toFixed(1) + 's');

console.log('\n── 7. 超时：算一次卡壳，换个词 ──');
freshPlay(100);
S.timeBuff = 1;
e = firstAlive();
const slowWord = e.word;
const hpBefore2 = S.player.hp;
wfy.typeLetter(slowWord.charAt(0));
S.wordStart = S.t - (wfy.wordLimit(slowWord) + 0.4);   /* 把表拨到超时之后 */
tick(6);
ok('超时掉血', S.player.hp < hpBefore2, hpBefore2 + ' → ' + S.player.hp);
ok('输入框清空', S.input === '');
ok('这个词换掉了', e.word !== slowWord, slowWord + ' → ' + e.word);
ok('算了一次错', S.stats.wrong >= 1, String(S.stats.wrong));

console.log('\n── 8. 冷却与不叠加 ──');
freshPlay(200);
e = firstAlive();
A.hint(); A.confirmHint();
const after1 = S.player.stones;
A.hint();
ok('冷却期间点不动', S.player.stones === after1 && !S.paused, String(S.player.stones));
S.hintCd = 0;
e = firstAlive();
A.hint(); A.confirmHint();
ok('第二次提示的倍率仍是 ×2，不叠成 ×4', S.timeBuff === 2, '×' + S.timeBuff);
ok('两次共花 40 灵石', S.player.stones === 160, String(S.player.stones));

console.log('\n── 9. 面板按钮：横屏 / 竖屏两套尺寸 ──');
freshPlay(100);
e = firstAlive();
A.hint();
A.setLayout('land');
const Ll = wfy.hintLayout();
ok('横屏面板整个在画布里', Ll.x >= 0 && Ll.x + Ll.w <= 480 && Ll.y >= 0 && Ll.y + Ll.h <= 270,
  Ll.w + '×' + Ll.h + ' @' + Ll.x + ',' + Ll.y);
ok('两个按钮不重叠', Ll.no.x >= Ll.ok.x + Ll.ok.w);
ok('按钮没掉出面板', Ll.ok.y + Ll.ok.h <= Ll.y + Ll.h);
A.setLayout('portrait');
const Lp = wfy.hintLayout();
ok('竖屏面板明显放大', Lp.w > Ll.w * 1.5, Ll.w + ' → ' + Lp.w);
ok('竖屏按钮够高（手指点得到）', Lp.ok.h >= 40, String(Lp.ok.h));
ok('竖屏面板也不出画布', Lp.y + Lp.h <= 270 && Lp.x >= 0 && Lp.x + Lp.w <= 480);
ok('提示按钮不和商店按钮重叠', wfy.HINT_BTN.y >= 98, 'y=' + wfy.HINT_BTN.y);
A.setLayout('land');
A.cancelHint();

console.log('\n════════════════════════');
console.log(pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
