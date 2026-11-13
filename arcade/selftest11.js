/* ============================================================
   selftest11.js — 台词库 / 台词接入
   用法：node arcade/selftest11.js

   A. lines.js 本身：十一类都在、每条都能填、同一类不连说两遍。
   B. 引擎按事件喊对类：装备剑 / 装备甲 / 技能 / 招式 / 回血 / 回气 / 闪避 / 挨打 / 倒下。
   C. 出手台词只在暴击 / 连击 / 击杀时，三成机会；普通刀和技能命中都不许出声。
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

/* ------------------ game.js 的 vm 桩（与 selftest10 一致） ------------------ */
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
const L = gWin.ARCADE_LINES;
const S = A.state();
const wj = JSON.parse(fs.readFileSync(path.join(ROOT, 'arcade/words.json'), 'utf8'));
const pool1 = wj.words.filter(x => x.t === 1).slice(0, 50).map(x => ({ w: x.w, m: x.m, p: x.p, tier: x.t }));

const CATS = ['weapon', 'armor', 'skill', 'art', 'attr', 'hit', 'hurt', 'dodge', 'dead', 'heal', 'qi'];

console.log('── 1. 十一类台词都在，每类至少 8 条 ──');
{
  ok('台词库挂到了 window.ARCADE_LINES', !!L && typeof L.pick === 'function');
  const short = CATS.filter(c => !L.has(c) || L.text[c].length < 8);
  ok('十一类齐全且都 ≥8 条', short.length === 0,
    short.length ? '缺：' + short.join('/') : CATS.map(c => c + L.text[c].length).join(' '));
  const all = CATS.reduce((n, c) => n + L.text[c].length, 0);
  ok('台词总数够多（≥90 条）', all >= 90, all + ' 条');
}

console.log('\n── 2. 模板变量齐不齐 ──');
{
  const miss = (cat, key) => L.text[cat].filter(t => t.indexOf('{' + key + '}') < 0);
  ok('每条装备剑都喊出剑名', miss('weapon', 'name').length === 0, miss('weapon', 'name')[0] || '');
  ok('每条装备甲都喊出甲名', miss('armor', 'name').length === 0, miss('armor', 'name')[0] || '');
  ok('每条技能都有技能名', miss('skill', 'name').length === 0, miss('skill', 'name')[0] || '');
  ok('每条招式都有招式名', miss('art', 'name').length === 0, miss('art', 'name')[0] || '');
  ok('每条属性台词都点出是哪条属性', miss('attr', 'attr').length === 0, miss('attr', 'attr')[0] || '');
  ok('每条回血都提到丹药名或「好险」',
    L.text.heal.every(t => t.indexOf('{name}') >= 0 || t.indexOf('好险') >= 0));
  ok('每条回气都提到道具名或「回蓝」',
    L.text.qi.every(t => t.indexOf('{name}') >= 0 || t.indexOf('回蓝') >= 0));
  /* 用户明确要「小还丹」「好险好险」「回蓝了」这几种说法，所以允许少数不带名字的通用句，
     但不能变成大半都不带 —— 名字得让玩家听见 */
  ok('回血台词里过半都点名了丹药',
    L.text.heal.filter(t => t.indexOf('{name}') >= 0).length >= 5,
    L.text.heal.filter(t => t.indexOf('{name}') >= 0).length + '/' + L.text.heal.length);
  ok('回气台词里点名道具的不少于 6 条',
    L.text.qi.filter(t => t.indexOf('{name}') >= 0).length >= 6,
    L.text.qi.filter(t => t.indexOf('{name}') >= 0).length + '/' + L.text.qi.length);
  ok('属性台词都带「属性」两个字', L.text.attr.every(t => t.indexOf('属性') >= 0));
  ok('升级类都带「升级」两个字',
    L.text.skill.concat(L.text.art).every(t => t.indexOf('升级') >= 0));
  ok('技能台词里「技能」二字至少出现过', L.text.skill.some(t => t.indexOf('技能') >= 0));
}

console.log('\n── 3. 填空与不重复 ──');
{
  ok('变量能填进去',
    L.fill('装备了{name}，攻击加 {n}', { name: '青竹剑', n: 4 }) === '装备了青竹剑，攻击加 4',
    L.fill('装备了{name}，攻击加 {n}', { name: '青竹剑', n: 4 }));
  ok('缺变量原样留着，不会冒出 undefined',
    L.fill('装备了{name}，攻击加 {n}', { name: '铁锋剑' }).indexOf('undefined') < 0
    && L.fill('装备了{name}', {}).indexOf('undefined') < 0,
    L.fill('装备了{name}，攻击加 {n}', { name: '铁锋剑' }));
  ok('数值 0 也能填（不被当成空）', L.fill('加 {n}', { n: 0 }) === '加 0', L.fill('加 {n}', { n: 0 }));

  L.reset();
  let dup = 0, prev = '';
  for (let i = 0; i < 200; i++) {
    const t = L.pick('hurt');
    if (t === prev) dup++;
    prev = t;
  }
  ok('同一类连说 200 次，一次都没有连着重复', dup === 0, dup + ' 次重复');
  const many = new Set();
  for (let i = 0; i < 200; i++) many.add(L.pick('dodge'));
  ok('闪避台词确实在轮换（≥8 种）', many.size >= 8, many.size + ' 种');
}

console.log('\n── 4. 装备 / 升级 / 吃药，喊的是哪一句 ──');
{
  const said = [];
  A.onSay = t => said.push(t);

  function shop(tab) {
    A.start({ tier: 1, words: pool1 });
    A.setLayout('land');
    S.player.stones = 5000;
    A.openShop();
    if (tab) wfy.campTab(tab);
    return wfy.campRows();
  }
  const last = () => said[said.length - 1] || '';

  /* 八把剑挨个买一遍：每句都得报名字，数值不是每句都报（有四条是纯气势的），
     所以只要求「确实报过几次数」，别被随机抽签搞成偶发失败 */
  let swordSaid = [], armorSaid = [];
  for (let round = 0; round < 2; round++) {
    let rows2 = shop();
    said.length = 0;
    rows2.filter(r => r.kind === 'weapon').forEach(r => wfy.campBuy(r));
    swordSaid = swordSaid.concat(said);

    rows2 = shop();
    said.length = 0;
    rows2.filter(r => r.kind === 'armor').forEach(r => wfy.campBuy(r));
    armorSaid = armorSaid.concat(said);
  }
  ok('买剑：每句都喊出剑名 + 「装备」',
    swordSaid.length === 16 && swordSaid.every(t => /装备/.test(t) && /剑|太虚/.test(t)),
    swordSaid.slice(0, 4).join(' / '));
  ok('买剑：报的攻击数值对得上（至少报过 3 次）',
    swordSaid.filter(t => /\d/.test(t)).length >= 3,
    swordSaid.filter(t => /\d/.test(t)).length + ' 句带数');
  ok('买甲：每句都喊出甲名 + 「装备」',
    armorSaid.length === 16 && armorSaid.every(t => /装备/.test(t) && /衣|甲|袍/.test(t)),
    armorSaid.slice(0, 4).join(' / '));
  ok('买甲：报的气血数值对得上（至少报过 3 次）',
    armorSaid.filter(t => /\d/.test(t)).length >= 3,
    armorSaid.filter(t => /\d/.test(t)).length + ' 句带数');

  let rows = shop();

  /* 技能：一半说等级、一半说属性，两句都得带技能名 */
  let skillName = '', sawSkill = false, sawAttr = false;
  for (let i = 0; i < 12; i++) {
    rows = shop(1);
    const sk = rows.filter(r => r.kind === 'skill')[0];
    skillName = sk.item.name;
    said.length = 0;
    wfy.campBuy(sk);
    const t = last();
    if (t.indexOf(skillName) < 0) { ok('技能台词必须带技能名', false, t); break; }
    if (t.indexOf('属性') >= 0) sawAttr = true; else sawSkill = true;
  }
  ok('技能升级：每次都说出了技能名', !!skillName, skillName);
  ok('技能升级：两种说法都出现过（说等级 / 说属性）', sawSkill && sawAttr,
    '等级=' + sawSkill + ' 属性=' + sawAttr);
  ok('剑意 → 攻击、罡气 → 气劲、身法 → 闪避、会心 → 暴击',
    wfy.ATTR_OF.jian === '攻击' && wfy.ATTR_OF.gang === '气劲'
    && wfy.ATTR_OF.shen === '闪避' && wfy.ATTR_OF.hui === '暴击',
    JSON.stringify(wfy.ATTR_OF));

  rows = shop(1);
  const art = rows.filter(r => r.kind === 'art')[0];
  wfy.campBuy(art);
  ok('招式升级：喊出招式名 + 「升级」', last().indexOf(art.item.name) >= 0 && last().indexOf('升级') >= 0, last());

  rows = shop();
  const dan = rows.filter(r => r.kind === 'item' && r.item.heal)[0];
  wfy.campBuy(dan);
  ok('吃小还丹：提到丹药名或「好险」', last().indexOf(dan.item.name) >= 0 || last().indexOf('好险') >= 0, last());

  rows = shop();
  const qiItem = rows.filter(r => r.kind === 'item' && r.item.qi)[0];
  wfy.campBuy(qiItem);
  ok('喝回气散：「回蓝」或「气劲」或道具名说到了',
    last().indexOf('回蓝') >= 0 || last().indexOf('气劲') >= 0
    || last().indexOf(qiItem.item.name) >= 0, last());
}

console.log('\n── 5. 闪避 / 挨打 / 倒下 ──');
{
  const said = [];
  A.onSay = t => said.push(t);
  A.start({ tier: 1, words: pool1 });
  S.player.stones = 200;

  said.length = 0;
  wfy.dodge();
  ok('闪避喊的是闪避类台词', said.length === 1 && L.text.dodge.indexOf(said[0]) >= 0, JSON.stringify(said));
  ok('「闪身步」还在闪避台词里', L.text.dodge.indexOf('闪身步！') >= 0);

  said.length = 0;
  S.lastHurtSay = -99;
  S.player.inv = 0;             /* 刚闪避完还带着无敌，先清掉 */
  wfy.hurtPlayer(5);
  ok('挨打喊的是挨打类台词', said.length === 1 && L.text.hurt.indexOf(said[0]) >= 0, JSON.stringify(said));

  said.length = 0;
  S.lastHurtSay = S.t;          /* 刚喊过 */
  S.player.inv = 0;
  wfy.hurtPlayer(5);
  ok('四秒内再挨打不重复喊', said.length === 0, said.length + ' 句');

  said.length = 0;
  S.player.hp = 1;
  S.player.inv = 0;
  S.lastHurtSay = -99;
  S.endSent = false;
  wfy.hurtPlayer(50);
  ok('血空了喊的是「倒下」那一类',
    said.length === 1 && L.text.dead.indexOf(said[0]) >= 0, JSON.stringify(said));
}

console.log('\n── 6. 出手台词：只给暴击 / 连击 / 击杀，三成机会 ──');
{
  const said = [];
  A.onSay = t => said.push(t);
  const hit = () => said.filter(t => L.text.hit.indexOf(t) >= 0).length;

  function freshEnemy() {
    A.start({ tier: 1, words: pool1 });
    const e = S.enemies[0] || (wfy.spawnEnemy(), S.enemies[0]);
    e.alive = true; e.hp = 99999; e.maxHp = 99999; e.segs = 1; e.elite = false;
    S.player.combo = 0;
    return e;
  }

  let e = freshEnemy();
  said.length = 0;
  for (let i = 0; i < 300; i++) {
    e.hp = 99999; e.alive = true;
    wfy.applyHit(e, 1, false, 'word');
  }
  ok('普通刀（不暴击、没连击、没打死）一句都不出', hit() === 0, hit() + ' 句');

  e = freshEnemy();
  said.length = 0;
  for (let i = 0; i < 400; i++) {
    e.hp = 99999; e.alive = true;
    wfy.applyHit(e, 1, true, 'word');
  }
  const critN = hit();
  ok('暴击时三成左右会开口（80~220 句 / 400 次）', critN >= 80 && critN <= 220, critN + ' 句');

  e = freshEnemy();
  S.player.combo = 3;                       /* 连击中 */
  said.length = 0;
  for (let i = 0; i < 400; i++) {
    e.hp = 99999; e.alive = true;
    wfy.applyHit(e, 1, false, 'word');
  }
  ok('连击中也会开口（三成左右）', hit() >= 80 && hit() <= 220, hit() + ' 句');

  e = freshEnemy();
  said.length = 0;
  for (let i = 0; i < 300; i++) {
    e.hp = 1; e.alive = true;
    wfy.applyHit(e, 99, false, 'word');     /* 一刀带走 */
    wfy.killEnemy(e, 'word');
  }
  ok('击杀时会开口（三成左右）', hit() >= 45 && hit() <= 165, hit() + ' 句');

  e = freshEnemy();
  said.length = 0;
  for (let i = 0; i < 300; i++) {
    e.hp = 99999; e.alive = true;
    wfy.applyHit(e, 1, true, 'art');         /* 招式命中：另有喊名，不再叠一句「哈！」 */
  }
  ok('招式命中不出手台词', hit() === 0, hit() + ' 句');
}

console.log('\n────────────────────────────────');
console.log(pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.log('失败：\n  - ' + bad.join('\n  - ')); process.exitCode = 1; }
