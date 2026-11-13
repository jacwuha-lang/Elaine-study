/* ============================================================
   selftest9.js — 新手教程热区 / 结算词单 / 提示拼读
   用法：node arcade/selftest9.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const bad = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; bad.push(name + (extra ? '  ' + extra : '')); console.log('  ✗ ' + name + (extra ? '  ' + extra : '')); }
}

/* ---------------------------------------------------------------
   Part A：game.js —— 教程热区
   --------------------------------------------------------------- */
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
const gDoc = {
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
const gWin = {
  document: gDoc, innerWidth: 960, innerHeight: 540, devicePixelRatio: 1,
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
gWin.window = gWin;
const gSandbox = vm.createContext(gWin);
['font', 'sprites', 'art-backgrounds', 'art-player', 'art-creatures', 'art', 'vocab_t1', 'vocab_t2', 'vocab_t3', 'vocab_t4', 'vocab_t5',
  'vocab_t6', 'vocab_t7', 'vocab_t8', 'vocab', 'meta', 'levels', 'word-system', 'ambient', 'skills', 'effects', 'world-renderer', 'hud-renderer', 'game'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'arcade/src/' + f + '.js'), 'utf8'), gSandbox, { filename: f });
  });

const A = gWin.ARCADE;
const wfy = gWin.__wfy;
const GS = A.state();
const wj = JSON.parse(fs.readFileSync(path.join(ROOT, 'arcade/words.json'), 'utf8'));
const pool1 = wj.words.filter(x => x.t === 1).slice(0, 50).map(x => ({ w: x.w, m: x.m, p: x.p, tier: x.t }));

console.log('── 1. 战斗界面热区 ──');
{
  A.start({ tier: 1, words: pool1 });
  A.setLayout('land');
  const hs = wfy.hotspots('play');
  const ids = hs.map(h => h.id);
  ok('横屏：技能栏 / 气劲 / 提示 / 大小写 / 商店都在',
    ['skills', 'qi', 'hint', 'case', 'shop'].every(k => ids.indexOf(k) >= 0), ids.join(','));
  ok('横屏：字母盘与切换 / 跳过 / 退格都在',
    ['palette', 'sw', 'skip', 'bs'].every(k => ids.indexOf(k) >= 0), ids.join(','));
  /* sw / skip / bs 的说明并进字母盘那一条，qi 并进技能栏那一条 —— 这几个框只画不写字，
     挤在 480 宽的画布上分头写一定会互相压住 */
  const SHARED = ['sw', 'skip', 'bs', 'qi'];
  ok('除共用说明的框，其余都有说明文字',
    hs.every(h => (h.tip && h.tip.length >= 2) || SHARED.indexOf(h.id) >= 0)
    && hs.filter(h => SHARED.indexOf(h.id) >= 0).length >= 3,
    hs.map(h => h.id + '=' + (h.tip || '(共用)')).join(' | '));
  ok('全部落在画布内（480×270）', hs.every(h => h.x >= 0 && h.y >= 0 && h.x + h.w <= 480 && h.y + h.h <= 270),
    hs.map(h => h.id + ':' + h.x + ',' + h.y).join(' '));
  ok('提示按钮的说明提到 20 灵石', /20/.test(hs.filter(h => h.id === 'hint')[0].tip));

  A.setLayout('portrait');
  const hp = wfy.hotspots('play');
  const pid = hp.map(h => h.id);
  ok('竖屏：不框画布里的字母盘', pid.indexOf('palette') < 0, pid.join(','));
  ok('竖屏：保留提示 / 技能', pid.indexOf('hint') >= 0 && pid.indexOf('skills') >= 0, pid.join(','));
  A.setLayout('land');
}

console.log('\n── 2. 洞府天地（商店）热区 ──');
{
  A.start({ tier: 1, words: pool1 });
  wfy.openShopInRun();
  const hs = wfy.hotspots('camp');
  const ids = hs.map(h => h.id);
  ok('两个页签都框了', ids.indexOf('tab-item') >= 0 && ids.indexOf('tab-skill') >= 0, ids.join(','));
  ok('商品列表框了', ids.indexOf('list') >= 0, ids.join(','));
  ok('回战场按钮框了', ids.indexOf('go') >= 0, ids.join(','));
  ok('说明里写了「买了立刻生效」', /立刻生效/.test(hs.filter(h => h.id === 'list')[0].tip));
  ok('全部落在画布内', hs.every(h => h.x >= -10 && h.y >= 0 && h.x + h.w <= 490 && h.y + h.h <= 270),
    hs.map(h => h.id + ':' + h.x + ',' + h.y + ',' + h.w + 'x' + h.h).join(' '));
  wfy.backToRun();
  ok('关店后回到战场', GS.scene === 'play', GS.scene);
}

/* ---------------------------------------------------------------
   Part B：js/arcade.js —— 结算词单 + 提示拼读
   --------------------------------------------------------------- */
function makeEl(tag) {
  const el = {
    tag: tag || 'div', id: '', className: '', innerHTML: '', textContent: '',
    style: {}, dataset: {}, children: [], offsetWidth: 0,
    classList: { add() { }, remove() { }, contains() { return false; } },
    appendChild(c) { el.children.push(c); return c; },
    remove() { }, addEventListener() { }, removeEventListener() { }, setAttribute() { },
    _q: {},
    querySelector(sel) {
      if (!el._q[sel]) el._q[sel] = makeEl('div');
      return el._q[sel];
    }
  };
  return el;
}
const bodyEl = makeEl('body');
const bDoc = {
  readyState: 'loading',
  createElement: (t) => makeEl(t),
  body: bodyEl,
  querySelector: () => null,
  addEventListener() { },
  documentElement: makeEl('html')
};
const PDB = {};
const ST = { stars: 500, screen: 'home', saveStars() { } };
const said = [];
const saidZh = [];
const SMB = {
  U: {},
  store: { get(k, d) { return (k in PDB) ? PDB[k] : d; }, set(k, v) { PDB[k] = v; } },
  state: ST,
  fx: { toast() { } },
  sfx: { tap() { }, deny() { }, coin() { } },
  voice: {
    sayEn(text, hooks) {
      said.push(text);
      if (hooks && hooks.end) setTimeout(function () { hooks.end(); }, 0);
      return true;
    },
    sayZh(text) { saidZh.push(text); return true; }
  },
  render() { }
};
const got = { start: [] };
const HB = {};
const bHost = {
  mount() { return Promise.resolve(bHost); },
  setLayout() { }, setHpRate() { },
  start(o) { got.start.push(o); },
  prepare() { }, goTier() { }, hide() { },
  summary() { return { hp: 100, stones: 0, tier: 1, time: 60, died: false }; },
  state() { return { scene: 'play', paused: false, camp: null }; },
  hotspots() { return []; },
  openShop() { }, closeShop() { }, canvas() { return null; },
  layout() { return 'land'; },
  onWord(f) { HB.word = f; }, onTier(f) { HB.tier = f; },
  onEnd(f) { HB.end = f; }, onNeedTier(f) { HB.need = f; }
};
const bWin = {
  SM: SMB, document: bDoc,
  innerWidth: 1024, innerHeight: 768, devicePixelRatio: 2,
  addEventListener() { }, requestAnimationFrame: () => 0,
  ArcadeHost: bHost,
  ARCADE: {},
  speechSynthesis: null, SpeechSynthesisUtterance: null
};
const bCtx = {
  window: bWin, document: bDoc, console,
  fetch: () => Promise.resolve({ json: () => Promise.resolve(wj) }),
  setTimeout, clearTimeout, setInterval, clearInterval,
  Date, JSON, Math, Object, Array, Promise, String, Number, parseInt, parseFloat
};
vm.createContext(bCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/arcade.js'), 'utf8'), bCtx, { filename: 'js/arcade.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'arcade/src/lines.js'), 'utf8'), bCtx, { filename: 'lines.js' });
const AR = bWin.SM.arcade;
const tick = (ms) => new Promise(r => setTimeout(r, ms || 5));

async function openRun() {
  AR.enter();
  await tick(20);
  const sheet = bodyEl.children[bodyEl.children.length - 1];
  sheet.querySelector('#arcGo').onclick();
  await tick(20);
}

(async function () {
  console.log('\n── 3. 本局词单按「最后一次」归类 ──');
  PDB.arcade = { bestTier: 1, tutSeen: true };
  PDB.sm_words = {};
  await openRun();

  HB.word('apple', 'c', 1200);
  HB.word('banana', 'h', 900);
  HB.word('orange', 's', 0);
  HB.word('pear', 'w', 8000);
  HB.word('pear', 'c', 3000);      /* 先错后对：只算背下来 */
  HB.word('grape', 'k', 0);        /* 技能打死：没拼过 */
  HB.end({ died: true, stones: 30, time: 120 });

  const sheet = bodyEl.children[bodyEl.children.length - 1];
  const html = sheet.innerHTML;
  ok('结算面板出现了', /res-words/.test(html), 'len=' + html.length);
  ok('显示了「背下来」并计数', /背下来/.test(html));
  ok('apple 在背下来里', /apple/.test(html));
  ok('pear 只算背下来（不重复出现在拼错）',
    (html.match(/pear/g) || []).length === 1, '出现 ' + (html.match(/pear/g) || []).length + ' 次');
  ok('banana 在看了提示里', /banana/.test(html));
  ok('orange 在跳过里', /orange/.test(html));
  ok('grape 在技能清掉里', /grape/.test(html));
  ok('跳过的词有后续提示', /下次更容易再遇到/.test(html));
  ok('星星数照旧显示', /\+0/.test(html) || /res-stars/.test(html));

  console.log('\n── 4. 提示拼读：字母逐个念，再念整词 ──');
  const spell = bWin.ARCADE.onSpell;
  ok('游戏侧接上了拼读回调', typeof spell === 'function');
  said.length = 0;
  spell('apple');
  await tick(400);
  ok('念了两段（字母 + 整词）', said.length === 2, JSON.stringify(said));
  ok('第一段是逐个字母', said[0] === 'A. P. P. L. E.', said[0]);
  ok('第二段是整词小写', said[1] === 'apple', said[1]);

  said.length = 0;
  spell('a pair of');
  await tick(300);
  ok('短语不逐字母念（只念整句）', said.length === 1 && said[0] === 'a pair of', JSON.stringify(said));

  said.length = 0;
  spell("don't");
  await tick(400);
  ok('撇号保留在整词里', said[1] === "don't", said[1]);

  console.log('\n── 5. 多音字：小还丹的「还」念 huán，不念 hái ──');
  const LN = bWin.ARCADE_LINES;
  ok('台词库挂到了 window.ARCADE_LINES', !!LN && typeof LN.pron === 'function');
  ok('小还丹 → 小环丹（同音 huán）', LN.pron('小还丹') === '小环丹', LN.pron('小还丹'));
  ok('大还丹 → 大环丹', LN.pron('大还丹') === '大环丹', LN.pron('大还丹'));
  ok('「回来」「还会回来」不动',
    LN.pron('蓝回来了，我还会回来的') === '蓝回来了，我还会回来的', LN.pron('蓝回来了，我还会回来的'));
  ok('空值不炸', LN.pron(null) === '' && LN.pron('') === '', JSON.stringify(LN.pron(null)));

  await tick(700);                    /* 等台词节流窗口过去 */
  saidZh.length = 0;
  bWin.ARCADE.onSay('吃颗小还丹，血补上了');
  await tick(20);
  ok('真送进 TTS 的已经是「小环丹」', saidZh[0] === '吃颗小环丹，血补上了', saidZh[0]);

  console.log('\n通过 ' + pass + ' / ' + (pass + fail));
  if (fail) { console.log('失败：\n  - ' + bad.join('\n  - ')); process.exitCode = 1; }
  setTimeout(() => process.exit(process.exitCode || 0), 40);
})();
