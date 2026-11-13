/* ============================================================
   selftest8.js — 同一个词不再反复拼：拼对没死就换词 / BOSS 砍血 /
                  超时只算「输入真属于谁」那只怪
   用法：node arcade/selftest8.js
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
  document: documentStub, innerWidth: 960, innerHeight: 540, devicePixelRatio: 1,
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
const pool1 = wj.words.filter(x => x.t === 1).slice(0, 50).map(x => ({ w: x.w, m: x.m, p: x.p, tier: x.t }));

/* 造一只可控的怪：词、血量、位置都由测试指定 */
let eid = 9000;
function mkMonster(word, meaning, hp, elite) {
  const e = {
    id: ++eid, x: 300, y: 140, alive: true, elite: !!elite,
    hp: hp, maxHp: hp, word: word, meaning: meaning || '测试', pos: 'n.',
    targetX: 300, targetY: 140, seed: 0, kind: 0, segs: 1,
    castT: 10, castMax: 10, baseCast: 10, flash: 0, kx: 0, ky: 0, hitT: 0,
    dying: 0, frozen: 0, busy: 0, rage: 0, rageT: 0
  };
  S.enemies.push(e);
  return e;
}

/* 开一局：把 ARCADE.on 立起来，词池灌满 */
A.start({ tier: 1, words: pool1 });
S.enemies = [];

console.log('── 1. 小怪拼对没死，词必须换（第 1 档 segs=1 也要换）──');
{
  const e = mkMonster('apple', '苹果', 22, false);
  const oldWord = e.word, oldMean = e.meaning;
  wfy.applyHit(e, 12, false, 'word');
  ok('怪还活着', e.alive === true);
  ok('血掉了', e.hp === 10, 'hp=' + e.hp);
  ok('词换了', e.word !== oldWord, oldWord + ' → ' + e.word);
  ok('中文跟着换', e.meaning !== oldMean, oldMean + ' → ' + e.meaning);
  ok('新词不在场上其他怪身上', S.enemies.filter(x => x.alive && x.word === e.word).length === 1);
  S.enemies = [];
}

console.log('\n── 2. 连打 8 刀：相邻两次不会是同一个词 ──');
{
  S.enemies = [];
  const e = mkMonster('apple', '苹果', 200, false);
  const seq = [];
  for (let i = 0; i < 8; i++) {
    seq.push(e.word);
    wfy.applyHit(e, 1, false, 'word');   /* 每刀只掉 1 血，保证打不死 */
  }
  seq.push(e.word);
  let dup = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) dup++;
  ok('8 刀换了 8 次词', e.word !== 'apple', seq.join(' → '));
  ok('相邻没有重复', dup === 0, 'dup=' + dup);
  ok('词不重复（同一次刷怪内）', new Set(seq).size === seq.length, new Set(seq).size + '/' + seq.length);
  S.enemies = [];
}

console.log('\n── 3. BOSS 拼对没死也换词 ──');
{
  S.enemies = [];
  const b = mkMonster('banana', '香蕉', 200, true);
  const w0 = b.word;
  wfy.applyHit(b, 20, false, 'word');
  ok('BOSS 换词了', b.word !== w0, w0 + ' → ' + b.word);
  ok('BOSS 掉血但没死', b.hp === 180 && b.alive === true, 'hp=' + b.hp);
  S.enemies = [];
}

console.log('\n── 4. 超时只算「输入真属于谁」那只，不牵连旁人 ──');
{
  S.meta.wordStat = {};
  S.enemies = [];
  /* A 是玩家实际在拼的（输入 app 对得上），B 是旁边的三好学生 */
  const a = mkMonster('apple', '苹果', 22, false);
  const b = mkMonster('banana', '香蕉', 22, false);
  S.scene = 'play';
  S.input = 'app';
  S.lockId = a.id;
  S.wordStart = S.t - 999;         /* 早就超时 */
  wfy.wordTimeout();
  ok('时的那只被记了一笔错', (S.meta.wordStat['apple'] || {}).w === 1, JSON.stringify(S.meta.wordStat['apple']));
  ok('旁边那只一根汗毛没动', (S.meta.wordStat['banana'] || {}).w === undefined, JSON.stringify(S.meta.wordStat['banana']));
  ok('输入被清空', S.input === '');
  S.enemies = [];
}

console.log('\n── 5. 拼到一半目标被换词/打死：输入清掉，不记到别人头上 ──');
{
  S.meta.wordStat = {};
  S.enemies = [];
  const a = mkMonster('apple', '苹果', 22, false);
  mkMonster('banana', '香蕉', 22, false);
  S.scene = 'play';
  S.input = 'app';
  S.lockId = a.id;
  a.word = 'cat';                  /* 目标被换词，'app' 已经对不上 */
  S.wordStart = S.t - 999;
  S.mistakeLock = 0; S.hitstop = 0; S.paused = false;   /* applyHit 会留顿帧，清掉才走得到时限判定 */
  wfy.update(1 / 60);
  ok('输入被清空', S.input === '', 'input=' + S.input);
  ok('没有词被冤枉记错', Object.keys(S.meta.wordStat).filter(k => (S.meta.wordStat[k] || {}).w).length === 0,
    JSON.stringify(Object.keys(S.meta.wordStat)));
  S.enemies = [];
}

console.log('\n── 6. 血条短了：每只怪 2-4 刀，不再 8 刀 ──');
{
  function need(hp) {
    let c = 1, d = 0, n = 0;
    while (d < hp && n < 40) { d += Math.round(12 * 1.5 * (1 + Math.min(33, c - 1) * 0.06)); c++; n++; }
    return n;
  }
  A.tier = 1; const hp1 = wfy.mobHp(1);
  A.tier = 8; const hp8 = wfy.mobHp(8), b8 = wfy.bossHp(8);
  A.tier = 1;
  ok('第 1 档小怪 2 刀内', need(hp1) <= 2, hp1 + ' 血 / ' + need(hp1) + ' 刀');
  ok('第 8 档小怪 4 刀内', need(hp8) <= 4, hp8 + ' 血 / ' + need(hp8) + ' 刀');
  ok('第 8 档 BOSS 不超过 8 刀（原来是 15-19）', need(b8) <= 8, b8 + ' 血 / ' + need(b8) + ' 刀');
}

console.log('\n通过 ' + pass + ' / ' + (pass + fail));
if (fail) process.exitCode = 1;
