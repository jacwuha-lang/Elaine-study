/* ============================================================
   selftest4.js — 竖屏键盘模块（arcade/keypad.js）的挂载契约
   用法：node arcade/selftest4.js
   只测 DOM 这一层：挂上/摘下、键位回调、容器标记、给宿主报高度。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* --- 极小 DOM 桩：够 keypad.js 用就行 --- */
function el(tag) {
  const node = {
    tagName: tag, _children: [], _cls: new Set(), _attrs: {}, _listeners: {}, offsetHeight: 0,
    set innerHTML(v) { node._html = v; },
    get innerHTML() { return node._html || ''; },
    set className(v) { node._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get className() { return Array.from(node._cls).join(' '); },
    classList: {
      add(c) { node._cls.add(c); },
      remove(c) { node._cls.delete(c); },
      contains(c) { return node._cls.has(c); }
    },
    setAttribute(k, v) { node._attrs[k] = v; },
    getAttribute(k) { return k in node._attrs ? node._attrs[k] : null; },
    hasAttribute(k) { return k in node._attrs; },
    addEventListener(t, fn) { (node._listeners[t] = node._listeners[t] || []).push(fn); },
    removeEventListener() { },
    appendChild(c) { c.parentNode = node; node._children.push(c); return c; },
    removeChild(c) {
      const i = node._children.indexOf(c);
      if (i >= 0) node._children.splice(i, 1);
      c.parentNode = null;
      return c;
    },
    get parentNode() { return node._parent || null; },
    set parentNode(p) { node._parent = p; },
    fire(type, ev) { (node._listeners[type] || []).forEach(fn => fn(ev)); }
  };
  return node;
}

const documentStub = {
  createElement: el
};
const sandbox = { document: documentStub, window: null, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'arcade/keypad.js'), 'utf8'), sandbox, { filename: 'keypad.js' });

const K = sandbox.ArcadeKeypad;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  ' + extra : '')); }
}

console.log('── 1. 键位齐全 ──');
const stage = el('div');
const hits = [];
K.mount(stage, ch => hits.push({ k: 'ch', ch }), () => hits.push({ k: 'bs' }));
ok('导出了 ArcadeKeypad', !!K);
const pad = stage._children[0];
ok('键盘挂到了容器里', !!pad, pad ? pad.className : '无');
const keys = pad.innerHTML.match(/data-ch="[A-Z]"/g) || [];
ok('26 个字母键', keys.length === 26, keys.length + ' 个');
ok('字母从 A 到 Z 顺序排', (pad.innerHTML.match(/data-ch="([A-Z])"/g) || []).map(s => s.slice(9, 10)).join('')
  === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
ok('末尾多一个退格键', /arc-key-bs[\s\S]*?⌫/.test(pad.innerHTML) || /data-bs="1"[^>]*>⌫/.test(pad.innerHTML));

console.log('\n── 2. 容器标记与高度 ──');
ok('容器加上了 has-keys', stage.classList.contains('has-keys'));
pad.offsetHeight = 200;
ok('高度含 6px 间隔（200 → 206）', K.height() === 206, String(K.height()));
ok('mounted() 说挂上了', K.mounted() === true);

console.log('\n── 3. 按键回调 ──');
function tap(target) {
  pad.fire('pointerdown', { target, preventDefault() { } });
}
const keyA = { classList: { contains: c => c === 'arc-key' }, hasAttribute: () => false, getAttribute: () => 'A' };
const keyB = { classList: { contains: c => c === 'arc-key' }, hasAttribute: () => false, getAttribute: () => 'B' };
tap(keyA);
tap(keyB);
ok('点 A、B 都回调了', hits.length === 2, JSON.stringify(hits));
ok('字母按原样传出去', hits[0].ch === 'A' && hits[1].ch === 'B', hits.map(h => h.ch).join(''));
const bsKey = { classList: { contains: c => c === 'arc-key' }, hasAttribute: k => k === 'data-bs', getAttribute: () => null };
tap(bsKey);
ok('退格键走 onBack', hits[2] && hits[2].k === 'bs', JSON.stringify(hits[2]));
const stray = { classList: { contains: () => false }, parentNode: null };
const n = hits.length;
tap(stray);
ok('点到空白处不触发', hits.length === n);

console.log('\n── 4. 摘下来 ──');
K.unmount();
ok('从容器里摘掉了', stage._children.length === 0);
ok('容器标记也去了', !stage.classList.contains('has-keys'));
ok('mounted() 说没挂', K.mounted() === false);
ok('没挂时高度报 0', K.height() === 0, String(K.height()));

console.log('\n── 5. 反复换容器不重复建键 ──');
const s2 = el('div'), s3 = el('div');
K.mount(s2, () => { }, () => { });
const pad2 = s2._children[0];
K.unmount();
K.mount(s3, () => { }, () => { });
ok('换容器后还在同一个键盘实例上', s3._children[0] === pad2);
ok('新容器也带 has-keys', s3.classList.contains('has-keys'));
K.unmount();

console.log('\n════════════════════════');
console.log(pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
