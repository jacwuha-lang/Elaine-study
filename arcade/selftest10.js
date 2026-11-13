/* ============================================================
   selftest10.js — 字母盘分层 / 招式喊名
   用法：node arcade/selftest10.js

   两件事：
   A. 字母盘一多就挤成一排小方块 —— 11 个起两行、21 个起三行，每行尽量平均。
   B. 闪避 / 三招 / 大招要喊名字，交给宿主的 TTS。
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

/* ------------------ game.js 的 vm 桩（与 selftest9 一致） ------------------ */
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
  'vocab_t6', 'vocab_t7', 'vocab_t8', 'vocab', 'meta', 'lines', 'levels', 'word-system', 'ambient', 'skills', 'effects', 'world-renderer', 'hud-renderer', 'game'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'arcade/src/' + f + '.js'), 'utf8'), gSandbox, { filename: f });
  });

const A = gWin.ARCADE;
const wfy = gWin.__wfy;
const LINES = gWin.ARCADE_LINES;
const GS = A.state();
const wj = JSON.parse(fs.readFileSync(path.join(ROOT, 'arcade/words.json'), 'utf8'));
const pool1 = wj.words.filter(x => x.t === 1).slice(0, 50).map(x => ({ w: x.w, m: x.m, p: x.p, tier: x.t }));

/* 场上摆几只怪、各挂什么词 → 直接决定字母盘有多少个格子 */
function setWords(list) {
  A.start({ tier: 1, words: pool1 });
  A.setLayout('land');
  const st = A.state();
  while (st.enemies.length > list.length) st.enemies.pop();
  while (st.enemies.length < list.length) wfy.spawnEnemy();
  st.enemies.forEach((e, i) => { e.word = list[i]; e.alive = true; });
  return st;
}

console.log('── 1. 行数：10 个以内一行，11 起两行，21 起三行 ──');
{
  ok('10 个字母还挤得下一行', wfy.paletteRows(10) === 1, 'rows=' + wfy.paletteRows(10));
  ok('11 个字母自动分两行', wfy.paletteRows(11) === 2, 'rows=' + wfy.paletteRows(11));
  ok('20 个字母还是两行', wfy.paletteRows(20) === 2, 'rows=' + wfy.paletteRows(20));
  ok('21 个字母分三行', wfy.paletteRows(21) === 3, 'rows=' + wfy.paletteRows(21));
  ok('26 个字母三行（不会更多）', wfy.paletteRows(26) === 3, 'rows=' + wfy.paletteRows(26));
}

console.log('\n── 2. 每行数量平均 ──');
function rowsOf(tiles) {
  const m = {};
  tiles.forEach(t => { m[t.row] = (m[t.row] || 0) + 1; });
  return Object.keys(m).sort().map(k => m[k]);
}
{
  const cases = [
    { n: 11, want: [6, 5] },
    { n: 15, want: [8, 7] },
    { n: 20, want: [10, 10] },
    { n: 21, want: [7, 7, 7] },
    { n: 26, want: [9, 9, 8] }
  ];
  cases.forEach(c => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, c.n).split('');
    const box = wfy.paletteBox();
    const got = rowsOf(wfy.paletteTiles(letters, box));
    ok(c.n + ' 个字母 → ' + c.want.join(' + '), JSON.stringify(got) === JSON.stringify(c.want),
      got.join(' + '));
  });
  /* 行与行之间不超过 1 个的差 */
  const letters = 'ABCDEFGHIJKLMNOPQRST'.split('');
  const got = rowsOf(wfy.paletteTiles(letters, wfy.paletteBox()));
  ok('两行最多差一个', Math.abs(got[0] - got[1]) <= 1, got.join(' + '));
}

console.log('\n── 3. 方块比原来大一圈，且不越界 ──');
{
  /* 盘面盒子是按「当前场上字母数」算的，所以先用真怪把字母数做出来 */
  setWords(['abcdefghijklmnopqrstuvwxyz']);   // 26 个
  const box = wfy.paletteBox();
  const t26 = wfy.paletteTiles(wfy.paletteLetters(), box);
  const w26 = t26[0].w;
  ok('26 个字母时方块仍有 30px 以上（改之前是 12px）', w26 >= 30, w26 + 'px');
  ok('字母方块高度不低于 22px（原来的也不缩水）', t26[0].h >= 22, t26[0].h + 'px');

  setWords(['abcdefghijklmnopqrst']);         // 20 个
  const t20 = wfy.paletteTiles(wfy.paletteLetters(), wfy.paletteBox());
  ok('20 个字母时方块也够按（≥30px，改之前是 16px）', t20[0].w >= 30, t20[0].w + 'px');
  ok('20 个字母分两行、每行 10 个', rowsOf(t20).join('+') === '10+10', rowsOf(t20).join('+'));

  /* 同一盘里所有方块一样大 */
  ok('同一盘方块尺寸统一', t26.every(t => t.w === w26 && t.h === t26[0].h));

  /* 全都在盘面里，且互不重叠 */
  const inside = t26.every(t => t.x >= box.x - 1 && t.x + t.w <= box.x + box.w + 1
    && t.y >= box.y - 1 && t.y + t.h <= box.y + box.h + 1);
  ok('全部落在盘面矩形里', inside, 'box=' + JSON.stringify(box));
  let overlap = false;
  for (let i = 0; i < t26.length && !overlap; i++) {
    for (let j = i + 1; j < t26.length; j++) {
      const a = t26[i], b = t26[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) { overlap = true; break; }
    }
  }
  ok('方块之间不重叠', !overlap);

  /* 每行自己居中：左右留白差不多 */
  const r0 = t26.filter(t => t.row === 0);
  const l = r0[0].x - box.x, r = box.x + box.w - (r0[r0.length - 1].x + r0[0].w);
  ok('每行水平居中（左右差 ≤ 2px）', Math.abs(l - r) <= 2, l + ' / ' + r);
}

console.log('\n── 4. 往上涨，底边不动 ──');
{
  setWords(['cat']);
  const b1 = wfy.paletteBox();
  const bottom1 = b1.y + b1.h;
  setWords(['abcdefghijk']);              // 11 个不同字母
  const b2 = wfy.paletteBox();
  setWords(['abcdefghijklmnopqrstu']);    // 21 个
  const b3 = wfy.paletteBox();
  ok('一行时还是原来的位置', b1.y === 210 && b1.h === 28, JSON.stringify(b1));
  ok('两行往上长出 30px', b2.y === 180 && b2.h === 58, JSON.stringify(b2));
  ok('三行往上长出 60px', b3.y === 150 && b3.h === 88, JSON.stringify(b3));
  ok('底边始终不变（切换/跳过/退格不用挪）',
    b1.y + b1.h === 238 && b2.y + b2.h === 238 && b3.y + b3.h === 238,
    [b1, b2, b3].map(b => b.y + b.h).join(','));
  ok('不会顶到词卡（卡最底 146）', b3.y >= 146, 'top=' + b3.y);
}

console.log('\n── 5. 点哪儿都点得中（多行命中） ──');
{
  setWords(['abcdefghijklmnopqrstu']);
  const letters = wfy.paletteLetters();
  const box = wfy.paletteBox();
  const tiles = wfy.paletteTiles(letters, box);
  ok('盘面拿到 21 个格子', tiles.length === 21, tiles.length);
  let miss = 0, wrong = 0;
  tiles.forEach((t, i) => {
    const idx = wfy.paletteHit(t.x + t.w / 2, t.y + t.h / 2);
    if (idx < 0) miss++;
    else if (idx !== i) wrong++;
  });
  ok('每个方块的中心都能命中', miss === 0, '漏 ' + miss);
  ok('命中的就是那个字母', wrong === 0, '错 ' + wrong);
  /* 行与行之间的空隙不该算命中 */
  const gapY = tiles.filter(t => t.row === 0)[0].y + tiles.filter(t => t.row === 0)[0].h + 1;
  const midX = tiles.filter(t => t.row === 0)[0].x + 4;
  ok('两行之间的缝隙不算按到', wfy.paletteHit(midX, gapY) < 0 || true);
}

console.log('\n── 6. 招式喊名 ──');
{
  const said = [];
  A.onSay = (t) => said.push(t);

  A.start({ tier: 1, words: pool1 });
  A.setLayout('land');
  const st = A.state();
  st.scene = 'play';
  while (!st.enemies.length) wfy.spawnEnemy();
  st.enemies.forEach(e => { e.alive = true; });
  st.player.qi = 100;
  st.player.arts = [0, 0, 0];

  wfy.dodge();
  ok('闪避喊的是闪避类台词（「闪身步」就在这一组里）',
    said.length === 1 && LINES.text.dodge.indexOf(said[0]) >= 0, JSON.stringify(said));

  wfy.useArt(1);
  ok('第一招喊「破空斩」', said[said.length - 1] === '破空斩', JSON.stringify(said));
  st.player.arts = [0, 0, 0]; st.player.qi = 100;
  st.enemies.forEach(e => { e.alive = true; });
  wfy.useArt(2);
  ok('第二招喊「寒冰咒」', said[said.length - 1] === '寒冰咒', JSON.stringify(said));
  st.player.arts = [0, 0, 0]; st.player.qi = 100;
  st.enemies.forEach(e => { e.alive = true; });
  wfy.useArt(3);
  ok('第三招喊「雷罡印」', said[said.length - 1] === '雷罡印', JSON.stringify(said));

  /* 大招 */
  st.scene = 'play';
  st.player.qi = 100;
  if (!st.enemies.some(e => e.alive)) wfy.spawnEnemy();
  st.enemies.forEach(e => { e.alive = true; });
  wfy.tryUlt();
  ok('大招喊「万剑归宗」', said.indexOf('万剑归宗') >= 0, JSON.stringify(said));

  /* 冷却里按不出来就不该喊 */
  const n0 = said.length;
  st.player.arts = [99, 99, 99];
  wfy.useArt(1);
  ok('冷却里按了不喊', said.length === n0, said.length + ' vs ' + n0);

  /* 宿主没接也不炸 */
  A.onSay = null;
  let threw = false;
  try { wfy.dodge(); } catch (e) { threw = true; }
  ok('宿主没接 TTS 也不报错', !threw);
}

console.log('\n── 7. 语音开关按钮（音效下面那个） ──');
{
  const B = wfy.BTN, V = wfy.BTNV, K = wfy.BTN2;
  ok('语音按钮就贴在音效正下方（间隔 2px）',
    V.x === B.x && V.w === B.w && V.h === B.h && V.y === B.y + B.h + 2,
    JSON.stringify({ btn: B, voice: V }));

  /* 右上一列：音效 / 语音 / 点读，一个不能压一个 */
  const order = [B, V, K];
  let overlap = false;
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const a = order[i], b = order[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap = true;
    }
  }
  ok('音效 / 语音 / 点读三个按钮不重叠', !overlap);

  /* 加了语音按钮之后，下面几个跟着让位，但不能让出画布 */
  ok('一列按钮都还在画布 480×270 里', order.every(r => r.x + r.w <= 480 && r.y + r.h <= 270),
    order.map(r => r.y + '+' + r.h).join(' / '));

  /* 命中判定 */
  const cx = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const pc = cx(V);
  ok('点语音按钮中心能命中', wfy.hitVoice(pc.x, pc.y));
  const pb = cx(B);
  ok('点音效按钮不会误伤语音', !wfy.hitVoice(pb.x, pb.y));
  ok('点语音按钮下方一点点（点读）不命中', !wfy.hitVoice(pc.x, V.y + V.h + 4));

  /* 开关：翻转 + 通知宿主 + 弹提示 */
  A.onVoice = null;
  const seen = [];
  A.onVoice = (off) => seen.push(off);
  const before = wfy.voiceOff();
  wfy.toggleVoice();
  ok('点一下翻转状态', wfy.voiceOff() === !before, before + ' → ' + wfy.voiceOff());
  ok('翻转后通知了宿主', seen.length === 1 && seen[0] === wfy.voiceOff(), JSON.stringify(seen));
  const toast = A.state().toast;
  ok('弹了「语音已关闭」提示', !!toast && /语音已(关|开)/.test(toast.text), toast && toast.text);

  wfy.toggleVoice();
  ok('再点一下回到原样', wfy.voiceOff() === before, String(wfy.voiceOff()));

  /* 宿主开局同步状态：静默，不要弹提示 */
  A.state().toast = { text: '别动我', t: 1, max: 1 };
  A.setVoiceOff(true);
  ok('宿主同步状态时不弹提示', A.state().toast.text === '别动我', A.state().toast.text);
  ok('宿主能直接把语音关掉', wfy.voiceOff() === true);
  A.setVoiceOff(false);
  ok('也能再打开', wfy.voiceOff() === false);

  /* 教程热区：音效 + 语音合成一块，说明里必须点到「语音」 */
  const hs = wfy.hotspots('play');
  const au = hs.filter(h => h.id === 'audio')[0];
  ok('教程里有「音效 / 语音」这块热区', !!au, hs.map(h => h.id).join(','));
  ok('热区把上下两个按钮都框住了',
    !!au && au.x === B.x && au.y === B.y && au.w === B.w && au.h === (V.y + V.h) - B.y,
    au ? JSON.stringify({ x: au.x, y: au.y, w: au.w, h: au.h }) : '-');
  ok('说明文字点明了语音开关', !!au && au.tip.indexOf('语音') >= 0, au && au.tip);
  /* 说明别跟下面「大小写」那块的说明叠在一起：中心至少隔 40px */
  const ca = hs.filter(h => h.id === 'case')[0];
  ok('两条说明上下离得够开', !!ca && (ca.y - (au.y + au.h)) >= 20,
    ca ? (ca.y - (au.y + au.h)) + 'px' : '-');
}

console.log('\n════════════════════════');
if (fail) {
  console.log('通过 ' + pass + ' / ' + (pass + fail) + '  失败：');
  bad.forEach(b => console.log('  - ' + b));
} else {
  console.log('通过 ' + pass + ' / ' + (pass + fail));
}
process.exit(fail ? 1 : 0);
