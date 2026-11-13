/* ============================================================
   build-words.js — 由 vocab_t1..t8.js 生成 words.json
   词表以 js 为唯一事实来源：改完词条跑一次这个脚本，再跑 selftest6 复验排版。
   用法：node arcade/build-words.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const TIERS = 8;

const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

const seen = Object.create(null);
const words = [];
const tiers = {};

for (let t = 1; t <= TIERS; t++) {
  const file = path.join(ROOT, 'arcade', 'src', 'vocab_t' + t + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: 'vocab_t' + t + '.js' });
  const raw = sandbox.window['VOCAB_T' + t];
  if (!Array.isArray(raw)) throw new Error('VOCAB_T' + t + ' 没加载出来');

  let n = 0;
  for (const item of raw) {
    /* "单词|中文|词性" 或 "单词|中文|词性|单元号" */
    const parts = String(item).split('|');
    if (parts.length < 3) continue;
    const w = parts[0].trim().toLowerCase();
    const m = parts[1].trim();
    const p = parts[2].trim();
    const u = parseInt(parts[3], 10) || 0;
    if (!w || !m) continue;
    /* 同一个词在低层先出现就归低层，后面的层只补没覆盖的词 */
    if (seen[w]) continue;
    seen[w] = true;
    words.push({ w: w, m: m, p: p, t: t, u: u });
    n++;
  }
  tiers[t] = n;
}

const out = {
  built: new Date().toISOString().slice(0, 10),
  count: words.length,
  tiers: tiers,
  words: words
};

const target = path.join(ROOT, 'arcade', 'words.json');
fs.writeFileSync(target, JSON.stringify(out), 'utf8');
console.log('写入 ' + target);
console.log('总数 ' + out.count + ' · 分层 ' + JSON.stringify(tiers));
const long = words.filter(x => x.m.length > 9);
if (long.length) {
  console.log('注意：' + long.length + ' 条释义超过 9 字，卡片只能折两行：');
  long.forEach(x => console.log('  ' + x.w + ' = ' + x.m));
}
