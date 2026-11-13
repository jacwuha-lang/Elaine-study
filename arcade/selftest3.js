/* ============================================================
   selftest3.js — 竖屏布局：字母盘搬出画布、DOM 键盘入口、前台闸门
   用法：node arcade/selftest3.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* 会数 fillRect 的 ctx：用来判断竖屏到底还画不画字母盘 */
let rectCount = 0;
function makeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k === 'canvas') return { width: 480, height: 270 };
      if (k === 'fillRect') return function () { rectCount++; };
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

/* 开局并把怪刷出来 */
function freshPlay() {
  A.setActive(true);
  A.start({ tier: 1, words: pool1 });
  for (let i = 0; i < 400; i++) wfy.update(1 / 60);
}
function firstAlive() {
  return S.enemies.filter(e => e.alive)[0] || null;
}

console.log('── 1. 布局开关 ──');
ok('默认是横屏布局', A.layout === 'land', A.layout);
A.setLayout('portrait');
ok('切成竖屏', A.layout === 'portrait', A.layout);
A.setLayout('nonsense');
ok('乱传值回落成横屏', A.layout === 'land', A.layout);
ok('不传值也不炸', (function () { A.setLayout(); return A.layout === 'land'; })());

console.log('\n── 2. 竖屏时字母盘不画进画布 ──');
freshPlay();
ok('怪已经出来了', !!firstAlive(), String(S.enemies.filter(e => e.alive).length));
const letters = wfy.paletteLetters();
ok('字母盘本来有一堆字母', letters.length > 4, letters.join(''));

A.setLayout('land');
rectCount = 0; wfy.render();
const landRects = rectCount;

A.setLayout('portrait');
rectCount = 0; wfy.render();
const portRects = rectCount;

ok('横屏画面里那一排字母块确实画了', landRects > 60, landRects + ' 个矩形');
ok('竖屏把这排字母省掉了', portRects < landRects - 30,
  landRects + ' → ' + portRects + '（省 ' + (landRects - portRects) + '）');
ok('省掉的只是字母盘那一层，战场照画', portRects > landRects * 0.3,
  '竖屏还剩 ' + (portRects / landRects * 100).toFixed(0) + '% 的绘制量');

console.log('\n── 3. DOM 键盘走的是同一个入口 ──');
freshPlay();
A.setLayout('portrait');
let tgt = firstAlive();
ok('有焦点怪', !!tgt, tgt ? tgt.word : '无');
if (tgt) {
  const word = tgt.word;
  A.kidLetter(word.charAt(0));
  ok('点一个字母进到拼写条', S.input === word.charAt(0), S.input);
  A.kidBack();
  ok('退格能撤掉', S.input === '', '「' + S.input + '」');
  const hpBefore = tgt.hp;
  for (let i = 0; i < word.length; i++) A.kidLetter(word.charAt(i));
  ok('拼完自动出招（输入清空）', S.input === '', '「' + S.input + '」');
  for (let i = 0; i < 180; i++) wfy.update(1 / 60);
  ok('这一刀真打出去了', !tgt.alive || tgt.hp < hpBefore,
    word + ' 血 ' + hpBefore + ' → ' + (tgt.alive ? tgt.hp : '击杀'));
}

console.log('\n── 4. 前台闸门 ──');
freshPlay();
A.setLayout('portrait');
const w2 = firstAlive();
if (w2) {
  A.setActive(false);          /* 主应用在别处填词了，键盘不能抢 */
  const before = S.input;
  A.kidLetter(w2.word.charAt(0));
  A.kidBack();
  A.kidBack();
  ok('不在前台时，键盘输入被吃掉', S.input === before, '「' + S.input + '」');
  A.setActive(true);
  A.kidLetter(w2.word.charAt(0));
  ok('回到前台就能接着点', S.input === w2.word.charAt(0), S.input);
}

console.log('\n── 5. 转屏来回切不出错 ──');
let threw = null;
try {
  for (let i = 0; i < 4; i++) {
    A.setLayout(i % 2 ? 'portrait' : 'land');
    wfy.render();
    wfy.update(1 / 60);
  }
} catch (e) { threw = e; }
ok('横竖来回切 4 次没抛异常', !threw, threw ? threw.message : 'ok');
ok('场景还在战斗中', S.scene === 'play', S.scene);

console.log('\n════════════════════════');
console.log(pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
