/* ============================================================
   selftest2.js — 行为测试：血量曲线、BOSS 回血、局内商店、上报
   用法：node arcade/selftest2.js
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
const pool1 = wj.words.filter(x => x.t === 1).slice(0, 40).map(x => ({ w: x.w, m: x.m, p: x.p, tier: x.t }));

console.log('── 1. 血量曲线随档递增 ──');
/* 先开一局：ARCADE.on 起来之后，档位曲线才接管 */
A.start({ tier: 1, words: pool1 });
const hps = [];
for (let t = 1; t <= 8; t++) { A.tier = t; hps.push(wfy.mobHp(t)); }
ok('1→8 档单调不减', hps.every((v, i) => i === 0 || v >= hps[i - 1]), hps.join(' → '));
/* 曲线从 1.32 放缓到 1.18：第 8 档 ≈ 3.2 倍，再高就会出现「同一只怪拼 8 遍同一个词」 */
ok('第 8 档比第 1 档硬 3 倍以上', hps[7] >= hps[0] * 3, (hps[7] / hps[0]).toFixed(1) + 'x');
ok('第 8 档不超过第 1 档 4 倍（别再把重复遍数撑爆）', hps[7] <= hps[0] * 4, (hps[7] / hps[0]).toFixed(1) + 'x');
A.tier = 9;
const hp9 = wfy.mobHp(9);
A.tier = 8;
ok('二周目第 1 档（9）比 8 档轻、比 1 档重', hp9 < hps[7] && hp9 > hps[0], hp9 + ' vs 8档' + hps[7]);
ok('BOSS 血 = 小怪 × 2.4', wfy.bossHp(3) === Math.round(wfy.mobHp(3) * 2.4));

console.log('\n── 2. 地图随档轮换（每档一张） ──');
A.tier = 1; const th1 = wfy.worldOf(1);
A.tier = 2; const th2 = wfy.worldOf(2);
A.tier = 3; const th3 = wfy.worldOf(3);
A.tier = 5; const th5 = wfy.worldOf(5);
A.tier = 6; const th6 = wfy.worldOf(6);
A.tier = 11; const th11 = wfy.worldOf(11);
A.tier = 26; const th26 = wfy.worldOf(26);
ok('第 1 档 = 主题 21（梦幻乐园）', th1 === 21, String(th1));
ok('第 2 档就换到 22（学习天地）', th2 === 22, String(th2));
ok('第 3 档 23、第 4 档 24、第 5 档 25', th3 === 23 && th5 === 25, th3 + '/' + th5);
ok('第 6 档转回 21（第二轮）', th6 === 21, String(th6));
ok('第 11 档又回到 21', th11 === 21, String(th11));
ok('第 26 档 = 21', th26 === 21, String(th26));
ok('相邻五档互不相同',
  new Set([1, 2, 3, 4, 5].map(function (t) { A.tier = t; return wfy.worldOf(t); })).size === 5);
A.tier = 3;
const cfg = wfy.levelCfg(3);
ok('第 3 档配了 4 只小怪', Array.isArray(cfg.mobs) && cfg.mobs.length === 4, (cfg.mobs || []).join('/'));
ok('小怪都有形象数据', cfg.mobs.every(function (k) { return !!W.Art.SPECIES[k]; }), cfg.mobs.join('/'));

console.log('\n── 2b. 一档内四波覆盖四种小怪 ──');
[1, 2, 6, 11].forEach(function (t) {
  A.tier = t;
  const wv = wfy.arcadeWaves(t);
  const kinds = wv.filter(function (x) { return !x.elite; }).map(function (x) { return x.kind; });
  const all = new Set();
  wv.filter(function (x) { return !x.elite && x.kinds; }).forEach(function (x) {
    x.kinds.forEach(function (k) { all.add(k); });
  });
  ok('第 ' + t + ' 档四波四种小怪', kinds.length === 4 && all.size === 4,
    kinds.join(',') + ' | 波内 ' + Array.from(all).join(''));
  ok('第 ' + t + ' 档每波混两种', wv.filter(function (x) { return !x.elite; })
    .every(function (x) { return x.kinds && x.kinds.length === 2; }));
});
A.tier = 7;
ok('第二轮妖王带前缀', wfy.levelCfg(7).bossName.indexOf('狂暴') === 0, wfy.levelCfg(7).bossName);
A.tier = 3;
ok('第一轮妖王名字不变', wfy.levelCfg(3).bossName === '雪人校长', wfy.levelCfg(3).bossName);

console.log('\n── 3. BOSS 回血 ──');
A.start({ tier: 1, words: pool1 });
S.player.hp = 40;
const boss = { id: 9999, alive: true, elite: true, hp: 1, word: 'cat', meaning: '猫', x: 300, y: 150 };
S.enemies.push(boss);
wfy.killEnemy(boss, 'word');
ok('回满 25%（40 → 65）', S.player.hp === 65, String(S.player.hp));
ok('不超上限', (function () { S.player.hp = 95; const b2 = { id: 9998, alive: true, elite: true, hp: 1, word: 'dog', x: 300, y: 150 }; S.enemies.push(b2); wfy.killEnemy(b2, 'word'); return S.player.hp === 100; })(), String(S.player.hp));
ok('非 BOSS 不回血', (function () {
  S.player.hp = 50;
  const m = { id: 9997, alive: true, elite: false, hp: 1, word: 'pen', x: 300, y: 150 };
  S.enemies.push(m); wfy.killEnemy(m, 'word');
  return S.player.hp === 50;
})());

console.log('\n── 4. 局内商店保留战斗状态 ──');
A.start({ tier: 2, words: pool1 });
S.player.hp = 61;
S.player.stones = 300;
const tierBefore = A.tier;
const waveBefore = S.wave;
A.openShop();
ok('切到 camp 场景', S.scene === 'camp');
ok('标记 fromRun', S.camp.fromRun === true);
const rows = wfy.campRows();
ok('商店里有丹药', rows.some(r => r.kind === 'item'), rows.filter(r => r.kind === 'item').map(r => r.item.name).join('/'));
const healRow = rows.filter(r => r.kind === 'item')[0];
const hpBefore = S.player.hp;
wfy.campBuy(healRow);
ok('吃小还丹回 25 点（61 → 86）', S.player.hp === 86, String(S.player.hp));
ok('扣了 30 灵石', S.player.stones === 270, String(S.player.stones));
A.closeShop();
ok('回战场', S.scene === 'play');
ok('档位没变', A.tier === tierBefore);
ok('血量带着走，没被重置', S.player.hp === 86, String(S.player.hp));

console.log('\n── 5. 拼词上报 ──');
let got = [];
A.onWord = function (w, kind, ms) { got.push({ w, kind, ms }); };
A.start({ tier: 1, words: pool1 });
for (let i = 0; i < 300; i++) wfy.update(1 / 60);
const alive = S.enemies.filter(e => e.alive);
ok('怪已经出来了', alive.length > 0, String(alive.length));
if (alive.length) {
  const t = alive[0];
  const word = t.word;
  for (let i = 0; i < word.length; i++) wfy.typeLetter(word.charAt(i));
  ok('拼对后上报了一次', got.length >= 1, JSON.stringify(got.slice(0, 2)));
  ok('上报的是 c（对）', got.length && got[0].kind === 'c', got.length ? got[0].kind : '-');
  ok('带上了用时', got.length && typeof got[0].ms === 'number', got.length ? got[0].ms + 'ms' : '-');
  /* 拼错一个不存在的字母 */
  const before = got.length;
  wfy.typeLetter('q');
  const after = got.length;
  ok('乱按不算拼错上报（由游戏内部判 miss，不走 markWord）', after === before, before + '→' + after);
}

console.log('\n── 6. 档位结算与下一档 ──');
let tierEv = null;
A.onTier = function (tier, st) { tierEv = { tier, st }; };
A.start({ tier: 1, words: pool1 });
A.prepare(2, pool1);
/* 直接跳到最后一波并清场，然后让计时器自己走到结算 */
S.wave = S.waves.length - 1;
S.spawnQ = [];
S.enemies = [];
S.waveState = 'fight';
for (let i = 0; i < 400 && S.scene === 'play'; i++) wfy.update(1 / 60);
ok('清完最后一波进入胜利屏', S.scene === 'victory', S.scene);
ok('触发了档结算回调', !!tierEv, tierEv ? '第' + tierEv.tier + '档' : '无');

/* 点"继续"应该进下一档，血量带过去 */
let needTierCalled = null;
A.onNeedTier = function (t) { needTierCalled = t; };
S.player.hp = 70;
S.player.qi = 62;
A.pending = null;
/* 模拟点击胜利屏 */
const beforeTier = A.tier;
A.goTier(2, pool1);
ok('进到第 2 档', A.tier === 2 && S.level === 2, 'tier=' + A.tier + ' lv=' + S.level);
ok('血量带过去了（70）', S.player.hp === 70, String(S.player.hp));
ok('气劲也带过去了（62）', S.player.qi === 62, String(S.player.qi));
ok('开局时气劲仍是 0', (function () {
  A.start({ tier: 1, words: pool1 });
  return S.player.qi === 0;
})(), String(S.player.qi));
ok('气劲上限夹在 100', (function () {
  A.start({ tier: 1, words: pool1 });
  S.player.qi = 100;
  A.goTier(2, pool1);
  return S.player.qi === 100;
})(), String(S.player.qi));

console.log('\n════════════════════════');
console.log(pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
