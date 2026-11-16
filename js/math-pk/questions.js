/* ============================================================
   questions.js — 马拉松出题器
   ------------------------------------------------------------
   每 4 题一个循环：3 道速算 + 1 道概念。
     · 速算直接调用 js/math/modules.js 的生成器（17 个技能点），
       权重按 PRD：口算 40%、单位换算 20%、大数 20%、运算定律 20%。
     · 概念题来自 concept-bank.js，按 8 类轮换，单局不重复，
       并尽量避开上一局刚出现过的题。

   为什么「技能点由题号决定」：
     双方在同一题位拿到同一技能点，但数字不同，没法照抄答案；
     同时不需要服务器传题目，题库随便扩充都不用改服务端。
   ============================================================ */

import { CONCEPTS, CONCEPT_CATS } from './concept-bank.js';

const CYCLE = [
  'ma_calc', 'ma_calc', 'ma_calc', 'ma_calc',
  'ma_unit', 'ma_unit',
  'ma_big', 'ma_big',
  'ma_law', 'ma_law'
];

const RECENT_KEY = 'sm_mpk_concept_recent';

function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = x[i]; x[i] = x[j]; x[j] = t;
  }
  return x;
}

function loadRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

export class QuestionSource {
  constructor() {
    this.mods = (window.SM && window.SM.mpMath && window.SM.mpMath.mods) || [];
    this.recent = loadRecent();
    this.usedQ = new Set();
    this.usedConcept = new Set();
    this.usedConceptKeys = [];
  }

  startGame() {
    this.usedQ = new Set();
    this.usedConcept = new Set();
    this.usedConceptKeys = [];
  }

  moduleById(id) {
    for (let i = 0; i < this.mods.length; i++) {
      if (this.mods[i].id === id) return this.mods[i];
    }
    return this.mods[0] || null;
  }

  /** index 从 0 开始，同一题位双方拿到同一技能点 */
  next(index) {
    const i = Math.max(0, index | 0);
    if (i % 4 === 3) return this.concept(i);
    return this.speed(i);
  }

  speed(index) {
    const modId = CYCLE[index % CYCLE.length];
    const mod = this.moduleById(modId);
    if (!mod || !mod.skills || !mod.skills.length) return this.concept(index);
    const skill = mod.skills[(index * 7 + 3) % mod.skills.length];

    for (let tries = 0; tries < 10; tries++) {
      const raw = skill.gen();
      const key = raw.q + '|' + raw.a;
      if (this.usedQ.has(key) && tries < 9) continue;
      this.usedQ.add(key);
      const choice = raw.t === 'c';
      return {
        type: 'speed',
        typeName: '速算',
        mode: choice ? 'choice' : 'num',
        q: raw.q,
        a: raw.a,
        o: choice ? raw.o.slice() : null,
        tip: raw.tip || '',
        steps: raw.steps || [],
        skill: raw.skill || skill.id,
        skillName: skill.name,
        modName: mod.name,
        index: index
      };
    }
    return this.concept(index);
  }

  concept(index) {
    const cat = CONCEPT_CATS[Math.floor(index / 4) % CONCEPT_CATS.length];
    let pool = CONCEPTS.filter((x) => x.c === cat.id);
    let fresh = pool.filter((x) => !this.usedConcept.has(x.q) && this.recent.indexOf(x.q) < 0);
    if (!fresh.length) fresh = pool.filter((x) => !this.usedConcept.has(x.q));
    if (!fresh.length) fresh = pool;
    const raw = fresh[Math.floor(Math.random() * fresh.length)];
    this.usedConcept.add(raw.q);
    this.usedConceptKeys.push(raw.q);

    /* 题库里正确项统一写在第一个，出题时打乱，避免孩子背 A */
    const pairs = raw.o.map((text, i) => ({ text: text, right: i === raw.a }));
    const mixed = shuffle(pairs);
    return {
      type: 'concept',
      typeName: '概念',
      mode: 'choice',
      q: raw.q,
      a: mixed.findIndex((x) => x.right),
      o: mixed.map((x) => x.text),
      tip: raw.tip || '',
      steps: [],
      skill: 'mpk.concept.' + cat.id,
      skillName: cat.name,
      modName: cat.name,
      index: index
    };
  }

  /** 一局结束：记下这局的概念题，下一局尽量避开 */
  commit() {
    if (!this.usedConceptKeys.length) return;
    const next = this.usedConceptKeys.slice(-40);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch (e) { /* 隐私模式就算了 */ }
    this.recent = next;
  }
}

/** 数字题判分：忽略逗号、空格，支持小数 */
export function judgeNumeric(input, answer) {
  const clean = String(input == null ? '' : input)
    .replace(/[,，\s]/g, '')
    .replace(/。/g, '.');
  if (!clean || !/^-?\d*(\.\d*)?$/.test(clean)) return false;
  const v = Number(clean);
  const a = Number(String(answer).replace(/[,，\s]/g, ''));
  if (!Number.isFinite(v) || !Number.isFinite(a)) return false;
  return Math.abs(v - a) < 1e-6;
}

/** 结算/错题回顾里显示正确答案 */
export function answerText(q) {
  if (!q) return '';
  if (q.mode === 'choice' && q.o) return q.o[q.a] || '';
  return String(q.a);
}
