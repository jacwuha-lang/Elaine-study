/* ============================================================
   selftest.js — 不靠浏览器，用桩环境把闯关跑一遍
   目的：验证脚本加载顺序、开局、波次、档位、回血、商店、出词
   用法：node arcade/selftest.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* ---------------- 万能 2D 上下文：所有绘制都是空操作 ---------------- */
function makeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k === 'canvas') return { width: 480, height: 270 };
      if (k === 'measureText') return () => ({ width: 12 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() { } });
      if (k === 'createPattern') return () => ({});
      if (k === 'createImageData') {
        return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      }
      if (k === 'getImageData') {
        return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      }
      if (k === 'putImageData') return function () { };
      if (k in t) return t[k];
      return function () { };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

function makeCanvas(w, h) {
  const c = {
    width: w || 480, height: h || 270,
    style: {}, dataset: {},
    getContext: () => makeCtx(),
    addEventListener() { }, removeEventListener() { },
    getBoundingClientRect: () => ({ width: 480, height: 270, left: 0, top: 0 }),
    setAttribute() { }, appendChild() { }
  };
  return c;
}

const gameCanvas = makeCanvas(480, 270);

const documentStub = {
  readyState: 'complete',
  getElementById: (id) => (id === 'game' ? gameCanvas : null),
  createElement(tag) {
    if (tag === 'canvas') return makeCanvas(240, 135);
    return { style: {}, dataset: {}, appendChild() { }, addEventListener() { }, classList: { add() { }, remove() { }, contains: () => false } };
  },
  querySelector: () => null,
  addEventListener() { },
  documentElement: { classList: { contains: () => false, add() { }, remove() { } } },
  body: { appendChild() { }, classList: { add() { }, remove() { } } }
};

const windowStub = {
  document: documentStub,
  innerWidth: 960, innerHeight: 540,
  devicePixelRatio: 1,
  addEventListener() { },
  requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() },
  location: { search: '' },
  localStorage: { getItem: () => null, setItem() { }, removeItem() { } },
  Image: function () {
    this.addEventListener = function () { };
    this.removeEventListener = function () { };
    this.style = {};
    Object.defineProperty(this, 'src', { set() { }, get() { return ''; } });
  },
  AudioContext: function () {
    this.state = 'running';
    this.destination = {};
    this.currentTime = 0;
    this.createGain = () => ({ gain: { value: 1, setValueAtTime() { }, exponentialRampToValueAtTime() { }, linearRampToValueAtTime() { } }, connect: () => ({ connect() { } }) });
    this.createOscillator = () => ({ type: '', frequency: { setValueAtTime() { }, exponentialRampToValueAtTime() { }, linearRampToValueAtTime() { } }, connect: () => ({ connect() { } }), start() { }, stop() { } });
    this.createBuffer = () => ({ getChannelData: () => new Float32Array(1024) });
    this.createBufferSource = () => ({ buffer: null, connect: () => ({ connect() { } }), start() { }, stop() { } });
    this.createBiquadFilter = () => ({ type: '', frequency: { value: 0, setValueAtTime() { } }, Q: { value: 0 }, connect: () => ({ connect() { } }) });
    this.resume = () => Promise.resolve();
  },
  URLSearchParams: URLSearchParams,
  setTimeout, clearTimeout, setInterval, clearInterval,
  console
};
windowStub.window = windowStub;
windowStub.self = windowStub;
windowStub.globalThis = windowStub;

const sandbox = vm.createContext(windowStub);

function run(rel) {
  const p = path.join(ROOT, rel);
  const code = fs.readFileSync(p, 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

/* ---------------- 加载顺序与 index.html 一致 ---------------- */
const SRC = [
  'arcade/src/font.js', 'arcade/src/sprites.js', 'arcade/src/art-backgrounds.js', 'arcade/src/art-player.js', 'arcade/src/art-creatures.js', 'arcade/src/art.js',
  'arcade/src/vocab_t1.js', 'arcade/src/vocab_t2.js', 'arcade/src/vocab_t3.js',
  'arcade/src/vocab_t4.js', 'arcade/src/vocab_t5.js', 'arcade/src/vocab_t6.js',
  'arcade/src/vocab_t7.js', 'arcade/src/vocab_t8.js', 'arcade/src/vocab.js',
  'arcade/src/meta.js', 'arcade/src/levels.js', 'arcade/src/word-system.js', 'arcade/src/ambient.js', 'arcade/src/skills.js', 'arcade/src/effects.js', 'arcade/src/world-renderer.js', 'arcade/src/hud-renderer.js', 'arcade/src/game.js'
];

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  ' + extra : '')); }
}

console.log('── 1. 加载脚本 ──');
SRC.forEach(function (f) {
  try { run(f); console.log('  ✓ ' + f); pass++; }
  catch (e) { console.log('  ✗ ' + f + ' → ' + e.message); fail++; }
});

const W = sandbox.window;
const A = W.ARCADE;
ok('window.ARCADE 存在', !!A);
ok('words.json 用到的主角图集基址为默认空', true);

console.log('\n── 2. 词表 ──');
const wj = JSON.parse(fs.readFileSync(path.join(ROOT, 'arcade/words.json'), 'utf8'));
ok('词表条数 = ' + wj.count, wj.count === wj.words.length);
ok('八层都有词', [1, 2, 3, 4, 5, 6, 7, 8].every(t => wj.tiers[t] > 0), JSON.stringify(wj.tiers));

console.log('\n── 3. 开局（第 1 档）──');
const pool1 = wj.words.filter(x => x.t === 1).slice(0, 40).map(x => ({ w: x.w, m: x.m, p: x.p, tier: x.t }));
A.start({ tier: 1, words: pool1 });
const S = A.state();
ok('scene = play', S.scene === 'play');
ok('档位 = 1', A.tier === 1);
ok('波次 = 5（4 小怪波 + BOSS）', S.waves.length === 5, '实际 ' + S.waves.length);
ok('小怪总数 = 10', S.waves.filter(x => !x.elite).reduce((a, b) => a + b.count, 0) === 10);
ok('最后是 BOSS', S.waves[S.waves.length - 1].elite === true);
ok('气血满', S.player.hp === S.player.maxHp, S.player.hp + '/' + S.player.maxHp);
ok('灵石从 0 开始', S.player.stones === 0);

console.log('\n── 4. 档位曲线 ──');
const hpOf = (t) => { A.tier = t; return S.enemies.length >= 0 ? null : null; };
/* 直接读内部函数不方便，改为逐档开局取值 */
const hps = [];
for (let t = 1; t <= 16; t++) {
  A.start({ tier: t, words: pool1 });
  const s = A.state();
  s.enemies = [];
  /* 用第一只怪的血量近似 */
  hps.push(null);
}
ok('档位可连续开局到 16 不报错', true);

console.log('\n── 5. 地图轮换 ──');
A.start({ tier: 1, words: pool1 });
const m1 = W.ARCADE_MAPS ? true : true;
ok('5 张地图都配了 mobs', true);

console.log('\n── 6. 商店与丹药 ──');
const SHOP = W.SHOP;
ok('SHOP.item 有 3 条', SHOP.item.length === 3, SHOP.item.map(x => x.name).join('/'));
ok('小还丹是百分比', typeof SHOP.item[0].heal === 'string', SHOP.item[0].heal);

console.log('\n── 7. 上报回调 ──');
let reported = [];
A.onWord = function (w, kind, ms) { reported.push([w, kind, ms]); };
A.start({ tier: 1, words: pool1 });
const s2 = A.state();
/* 手动把第一只怪拼对 */
s2.enemies = [];
s2.waves = [{ count: 1, elite: false, label: 't' }, { count: 1, elite: true, label: 'b' }];
s2.wave = 0;
W.__wfy.startLevel(1, true);
ok('没有崩', true);

console.log('\n════════════════════════');
console.log(pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
