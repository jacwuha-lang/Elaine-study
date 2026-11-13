/* ============================================================
   selftest6.js — 中文释义在卡片里排得下吗
   以前的毛病：卡面 88 宽、15px 一行只放得下 5 个汉字，长释义直接被「…」吃掉后半截。
   这份测试带一个按字号算宽度的 measureText 桩，把 1547 条释义全排一遍。
   用法：node arcade/selftest6.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, note) {
  if (cond) { pass++; console.log('  ✓ ' + name + (note ? '  ' + note : '')); }
  else { fail++; console.log('  ✗ ' + name + (note ? '  ' + note : '')); }
}

/* ---------------- 2D 上下文：measureText 真的按字号算 ---------------- */
function charW(ch, fs) {
  const code = ch.codePointAt(0);
  /* 中文省略号、破折号在雅黑里也占一个全角位，别按半角算，否则排出来偏乐观 */
  if (ch === '…' || ch === '—') return fs;
  if (code > 0x2e80) return fs;          /* 汉字与全角标点 */
  if (ch === ' ') return fs * 0.3;
  return fs * 0.56;                      /* 半角字母数字 */
}
function textW(txt, fs) {
  let w = 0;
  for (const ch of String(txt)) w += charW(ch, fs);
  return w;
}
function makeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k === 'canvas') return { width: 480, height: 270 };
      if (k === 'measureText') {
        return function (txt) {
          const m = /(\d+(?:\.\d+)?)px/.exec(t.font || '12px');
          const fs = m ? parseFloat(m[1]) : 12;
          return { width: textW(txt, fs) };
        };
      }
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() { } });
      if (k === 'createPattern') return () => ({});
      if (k === 'createImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      if (k === 'getImageData') return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
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
  querySelector: () => null,
  addEventListener() { },
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
    this.removeEventListener = function () { };
    this.style = {};
    Object.defineProperty(this, 'src', { set() { }, get() { return ''; } });
  },
  AudioContext: function () {
    this.state = 'running'; this.destination = {}; this.currentTime = 0;
    this.createGain = () => ({ gain: { value: 1, setValueAtTime() { }, exponentialRampToValueAtTime() { }, linearRampToValueAtTime() { } }, connect: () => ({ connect() { } }) });
    this.createOscillator = () => ({ type: '', frequency: { setValueAtTime() { }, exponentialRampToValueAtTime() { }, linearRampToValueAtTime() { } }, connect: () => ({ connect() { } }), start() { }, stop() { } });
    this.createBuffer = () => ({ getChannelData: () => new Float32Array(1024) });
    this.createBufferSource = () => ({ buffer: null, connect: () => ({ connect() { } }), start() { }, stop() { } });
    this.createBiquadFilter = () => ({ type: '', frequency: { value: 0, setValueAtTime() { } }, Q: { value: 0 }, connect: () => ({ connect() { } }) });
    this.resume = () => Promise.resolve();
  },
  URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval, console
};
windowStub.window = windowStub;
windowStub.self = windowStub;
windowStub.globalThis = windowStub;

const sandbox = vm.createContext(windowStub);

const SCRIPTS = ['src/font.js', 'src/sprites.js', 'src/art-backgrounds.js', 'src/art-player.js', 'src/art-creatures.js', 'src/art.js', 'src/meta.js', 'src/levels.js', 'src/word-system.js', 'src/ambient.js', 'src/skills.js', 'src/effects.js', 'src/world-renderer.js', 'src/hud-renderer.js', 'src/game.js'];
for (const s of SCRIPTS) {
  const file = path.join(ROOT, 'arcade', s);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: s });
}

const W = sandbox.window;
const wfy = W.__wfy;
const A = W.ARCADE;
const S = wfy.S;

console.log('\n── 1. 关键释义的排法 ──');
const MAXW = 88 - 16;   /* cardWidth - 左右各 8px */

function fit(m) { return wfy.meanFit(m, MAXW); }
function flat(r) { return r.lines.join(' / '); }

let r = fit('猫');
ok('一个字：单行最大字号', r.lines.length === 1 && r.size === 15, flat(r) + ' @' + r.size);

r = fit('同班同学');
ok('四个字：单行 15px', r.lines.length === 1 && r.size === 15, flat(r) + ' @' + r.size);

r = fit('相识；结识');
ok('五个字：单行但略缩字号', r.lines.length === 1 && r.size < 15, flat(r) + ' @' + r.size);

r = fit('公共汽车司机');
ok('六个字：单行但缩小字号', r.lines.length === 1 && r.size < 15, flat(r) + ' @' + r.size);

r = fit('使人愉快的；精彩的');
ok('九字长释义折成两行', r.lines.length === 2, flat(r) + ' @' + r.size);
ok('长释义没有被省略号吃掉', r.lines.join('').indexOf('…') < 0, flat(r));

r = fit('堂（表）兄弟姐妹');
ok('括号没被拆成两半', r.lines.every(l => (l.match(/（/g) || []).length === (l.match(/）/g) || []).length),
  flat(r));

r = fit('意思是（过去式）');
ok('「（过去式）」整块留在第二行', r.lines.length === 2 && r.lines[1].indexOf('（') === 0, flat(r));

r = fit('他们；她们；它们');
ok('三个义项摊在两行，内容没丢', r.lines.length === 2 &&
  r.lines.join('').replace(/[；;，,、]/g, '') === '他们她们它们', flat(r));

console.log('\n── 2. 全部词条排一遍 ──');
const dict = JSON.parse(fs.readFileSync(path.join(ROOT, 'arcade', 'words.json'), 'utf8'));
const words = dict.words;
let one = 0, two = 0, ellipsis = 0, overflow = 0, overList = [];
for (const w of words) {
  if (!w.m) { overflow++; overList.push(w.w + ' 空释义'); continue; }
  const f = fit(w.m);
  if (f.lines.length === 1) one++; else two++;
  /* 只有「末尾多出省略号，而原文本来没有」才算被切掉；
     释义本身就带「……」的（在……旁边）不算 */
  const last = f.lines[f.lines.length - 1];
  if (last.slice(-1) === '…' && w.m.slice(-1) !== '…') {
    ellipsis++;
    overList.push(w.w + ' ' + w.m + ' → ' + flat(f));
  }
  for (const line of f.lines) {
    if (textW(line, f.size) > MAXW + 0.01) { overflow++; overList.push(w.w + ' 超宽 ' + line); }
  }
}
console.log('    单行 ' + one + ' / 两行 ' + two + ' / 切断 ' + ellipsis + ' / 超宽 ' + overflow);
ok('一条都没有被省略号切掉', ellipsis === 0, overList.slice(0, 5).join(' | '));
ok('没有一行超过卡片可用宽度', overflow === 0, overList.slice(0, 5).join(' | '));
ok('绝大多数还是单行（不显得碎）', one / words.length > 0.9, (one / words.length * 100).toFixed(0) + '% 单行');
ok('两行的都是 7 字以上',
  words.filter(w => w.m && w.m.length <= 6).every(w => fit(w.m).lines.length === 1),
  '6 字以内一律单行');

console.log('\n── 3. 卡片几何 ──');
A.start({ tier: 1, words: [{ w: 'cat', m: '猫', p: 'n.' }, { w: 'dog', m: '狗', p: 'n.' }, { w: 'fox', m: '狐狸', p: 'n.' }] });
S.enemies = [
  { id: 1, alive: true, elite: false, x: 224, y: 124, word: 'cat', meaning: '猫' },
  { id: 2, alive: true, elite: false, x: 312, y: 150, word: 'dog', meaning: '狗' },
  { id: 3, alive: true, elite: false, x: 400, y: 176, word: 'fox', meaning: '狐狸' }
];
const rects = S.enemies.map(e => wfy.cardRect(e));
ok('卡片宽度统一 88', wfy.cardWidth() === 88, String(wfy.cardWidth()));
ok('三张卡都在画布内', rects.every(r2 => r2.x >= 4 && r2.x + r2.w <= 476), rects.map(r2 => r2.x + '+' + r2.w).join(' '));
ok('三张卡不会伸进右上角按钮列（x+w ≤ 448）', rects.every(r2 => r2.x + r2.w <= 448),
  rects.map(r2 => r2.x + '+' + r2.w).join(' '));
ok('相邻两张卡不重叠', rects[0].x + rects[0].w <= rects[1].x && rects[1].x + rects[1].w <= rects[2].x,
  rects.map(r2 => r2.x + '..' + (r2.x + r2.w)).join(' '));
ok('卡底不压住怪物身体', rects.every((r2, i) => r2.y + r2.h <= S.enemies[i].y - 20),
  rects.map((r2, i) => (r2.y + r2.h) + '<' + (S.enemies[i].y - 20)).join(' '));
ok('卡顶不顶到 HUD（y≥34）', rects.every(r2 => r2.y >= 34), rects.map(r2 => r2.y).join(' '));

S.enemies = [{ id: 4, alive: true, elite: true, x: 240, y: 172, word: 'dragon', meaning: '龙' }];
const br = wfy.cardRect(S.enemies[0]);
ok('BOSS 卡也在画布内', br.x >= 4 && br.x + br.w <= 476 && br.y >= 34 && br.y + br.h < 172,
  br.x + ',' + br.y + ' ' + br.w + 'x' + br.h);

console.log('\n── 4. 词表本身 ──');
const lens = {};
words.forEach(w => { const n = (w.m || '').length; lens[n] = (lens[n] || 0) + 1; });
console.log('    释义字数分布 ' + JSON.stringify(lens));
ok('没有空释义', words.every(w => w.m && w.m.trim()));
ok('没有把英文当释义', words.every(w => !/[A-Za-z]{2,}/.test(w.m)));
ok('没有超长释义（>9 字）', words.every(w => w.m.length <= 9),
  words.filter(w => w.m.length > 9).map(w => w.w).join(','));
ok('每个词都有词性', words.every(w => w.p && w.p.trim()));
ok('首字母都是小写（和输入判定一致）', words.every(w => w.w === w.w.toLowerCase()));

console.log('\n════════════════════════');
console.log(pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
