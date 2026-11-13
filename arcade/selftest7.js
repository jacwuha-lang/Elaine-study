/* ============================================================
   selftest7.js — 局外养成不跨局：剑甲 / 功法 / 技能每局从新手村起
   用法：node arcade/selftest7.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const bad = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; bad.push(name + (extra ? '  →  ' + extra : '')); }
}

/* ---------------- DOM 桩 ---------------- */
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
const documentStub = {
  readyState: 'loading',
  createElement: (t) => makeEl(t),
  body: bodyEl,
  querySelector: () => null,
  addEventListener() { },
  documentElement: makeEl('html')
};

/* ---------------- 主应用桩 ---------------- */
const PDB = {};                      /* 相当于 profiles/Elaine.json 的 data */
const ST = { stars: 500, screen: 'home', saveStars() { } };
const SM = {
  U: {},
  store: {
    get(k, d) { return (k in PDB) ? PDB[k] : d; },
    set(k, v) { PDB[k] = v; }
  },
  state: ST,
  fx: { toast() { } },
  sfx: { tap() { }, deny() { }, coin() { } },
  render() { }
};

/* ---------------- 游戏宿主桩 ---------------- */
const got = { start: [], mount: 0, goTier: [], prepare: [] };
const H = {};
const host = {
  mount() { got.mount++; return Promise.resolve(host); },
  setLayout(l) { got.layout = l; },
  setHpRate(r) { got.hpRate = r; },
  start(o) { got.start.push(JSON.parse(JSON.stringify(o.meta))); },
  prepare(t, w) { got.prepare.push(t); },
  goTier(t, w) { got.goTier.push(t); },
  hide() { },
  summary() { return { hp: 100, stones: 0, tier: 1, time: 60, died: false }; },
  state() { return { meta: { weapon: 3, armor: 1, skills: { jian: 2 }, arts: { po: 1 } } }; },
  onWord(f) { H.word = f; }, onTier(f) { H.tier = f; },
  onEnd(f) { H.end = f; }, onNeedTier(f) { H.need = f; }
};

const winStub = {
  SM: SM, document: documentStub,
  innerWidth: 1024, innerHeight: 768, devicePixelRatio: 2,
  addEventListener() { }, requestAnimationFrame: () => 0,
  ArcadeHost: host
};
const wordsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'arcade/words.json'), 'utf8'));
const ctx = {
  window: winStub, document: documentStub, console,
  fetch: () => Promise.resolve({ json: () => Promise.resolve(wordsJson) }),
  setTimeout, clearTimeout, setInterval, clearInterval,
  Date, JSON, Math, Object, Array, Promise, String, Number, parseInt, parseFloat
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/arcade.js'), 'utf8'), ctx, { filename: 'js/arcade.js' });
const AR = winStub.SM.arcade;

const tick = (ms) => new Promise(r => setTimeout(r, ms || 5));

/* 走一遍真实入口：enter() → 开局面板 → 点「开始闯关」 */
async function openRun() {
  AR.enter();
  await tick(20);
  const sheet = bodyEl.children[bodyEl.children.length - 1];
  sheet.querySelector('#arcGo').onclick();
  await tick(20);
}

(async function () {
  /* ---- 1. 老档案里带着上个版本的装备/功法 ---- */
  PDB.arcade = {
    bestTier: 3,
    runs: 5,
    equip: { weapon: 4, armor: 2 },
    skills: { jian: 2, gang: 1 },
    arts: { po: 1 }
  };
  PDB.sm_words = {};

  await openRun();

  /* ---- 2. 开局拿到的是新手村配置，不是存档里的 ---- */
  const m1 = got.start[0] || {};
  ok('开局拿到一份 meta', !!got.start.length);
  ok('剑未带（weapon = -1）', m1.weapon === -1, JSON.stringify(m1));
  ok('甲未带（armor = -1）', m1.armor === -1, JSON.stringify(m1));
  ok('功法为空', m1.skills && Object.keys(m1.skills).length === 0, JSON.stringify(m1.skills));
  ok('技能为空', m1.arts && Object.keys(m1.arts).length === 0, JSON.stringify(m1.arts));

  /* ---- 3. 老档案里的三样被清掉，学习进度留着 ---- */
  const a1 = PDB.arcade;
  ok('存档里 equip 已清空', a1.equip === null, String(a1.equip));
  ok('存档里 skills 已清空', a1.skills === null, String(a1.skills));
  ok('存档里 arts 已清空', a1.arts === null, String(a1.arts));
  ok('最高档保留', a1.bestTier === 3, String(a1.bestTier));
  ok('局数保留', a1.runs === 6, String(a1.runs));

  /* ---- 4. 局内买了东西、过了一档：也不许回写到存档 ---- */
  H.tier(1, {});
  let a2 = PDB.arcade;
  ok('过了第 1 档：无 equip 字段', !('equip' in a2) || a2.equip === null, JSON.stringify(a2.equip));
  ok('过了第 1 档：无 skills 字段', !('skills' in a2) || a2.skills === null, JSON.stringify(a2.skills));
  ok('过了第 1 档：无 arts 字段', !('arts' in a2) || a2.arts === null, JSON.stringify(a2.arts));
  ok('过了第 1 档：bestTier 上涨', a2.bestTier >= 1, String(a2.bestTier));
  ok('过了第 1 档：待结算记下', !!(a2.runPending && a2.runPending.tier === 1), JSON.stringify(a2.runPending));

  H.tier(2, {});
  a2 = PDB.arcade;
  ok('过了第 2 档：bestTier 不倒退', a2.bestTier >= 2, String(a2.bestTier));
  ok('过了第 2 档：仍无三样', a2.equip == null && a2.skills == null && a2.arts == null);
  ok('下一档词已备好', got.prepare.indexOf(3) >= 0, JSON.stringify(got.prepare));

  /* ---- 5. 结算：待结算清空，三样依旧不落盘 ---- */
  H.end({ died: true, stones: 0, time: 120 });
  const a3 = PDB.arcade;
  ok('结算：runPending 清空', a3.runPending == null, JSON.stringify(a3.runPending));
  ok('结算：无三样', a3.equip == null && a3.skills == null && a3.arts == null);
  ok('结算：星已入账', ST.stars > 400, String(ST.stars));

  /* ---- 6. 第二局：还是新手村，不受上一局影响 ---- */
  await openRun();
  const m2 = got.start[1] || {};
  ok('第二局开局：剑回到 -1', m2.weapon === -1, JSON.stringify(m2));
  ok('第二局开局：甲回到 -1', m2.armor === -1, JSON.stringify(m2));
  ok('第二局开局：功法为空', Object.keys(m2.skills || {}).length === 0, JSON.stringify(m2.skills));
  ok('第二局开局：技能为空', Object.keys(m2.arts || {}).length === 0, JSON.stringify(m2.arts));
  ok('第二局开局：宿主仍拿得到 meta', !!got.start[1]);
  H.end({ died: true, stones: 0, time: 30 });

  /* ---- 7. 一局之内装备照样生效（只靠宿主内存，不靠存档） ---- */
  ok('局内 meta 未被外部覆盖', typeof host.state().meta.weapon === 'number');
  ok('局内商店回调还在', typeof H.tier === 'function');

  /* ---------------- 收尾 ---------------- */
  console.log('\n通过 ' + pass + ' / ' + (pass + fail));
  if (fail) { console.log('失败：\n  - ' + bad.join('\n  - ')); process.exitCode = 1; }
  setTimeout(() => process.exit(process.exitCode || 0), 30);
})();
