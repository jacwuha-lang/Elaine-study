/* 回归：宿主与独立页按相同顺序加载拆出的模块，并能绘制所有妖物。 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = __dirname;
const host = fs.readFileSync(path.join(root, 'host.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hostList = host.match(/var SRC = \[([\s\S]*?)\];/)[1];
const hostScripts = Array.from(hostList.matchAll(/'([^']+\.js)'/g), m => m[1]);
const pageScripts = Array.from(html.matchAll(/<script src="src\/([^"]+)"/g), m => m[1]);
assert.deepStrictEqual(hostScripts, pageScripts, '宿主和独立页的脚本加载顺序必须相同');
for (const name of hostScripts) assert.ok(fs.existsSync(path.join(root, 'src', name)), name);
for (const [dep, consumer] of [['art-backgrounds.js', 'art.js'], ['art-player.js', 'art.js'], ['art-creatures.js', 'art.js'], ['levels.js', 'game.js'], ['word-system.js', 'game.js'], ['ambient.js', 'game.js'], ['skills.js', 'game.js'], ['effects.js', 'game.js'], ['world-renderer.js', 'game.js'], ['hud-renderer.js', 'game.js']]) {
  assert.ok(hostScripts.indexOf(dep) >= 0 && hostScripts.indexOf(dep) < hostScripts.indexOf(consumer), dep);
}
const ctx = new Proxy({}, { get(target, name) {
  if (name === 'measureText') return () => ({ width: 12 });
  if (name === 'createImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
  if (name === 'getImageData') return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
  if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({ addColorStop() {} });
  if (name in target) return target[name];
  return () => {};
}, set(target, name, value) { target[name] = value; return true; } });
const sandbox = { document: { createElement: () => ({ getContext: () => ctx }) }, Math, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const name of ['art-backgrounds.js', 'art-player.js', 'art-creatures.js', 'art.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src', name), 'utf8'), sandbox, { filename: name });
}
for (let world = 1; world <= 25; world++) {
  sandbox.Art.setWorld(world);
  sandbox.Art.drawBackground(ctx, 0, 1, 0);
}
for (const kind of Object.keys(sandbox.Art.SPECIES)) {
  for (const anim of ['idle', 'walk', 'attack', 'hit', 'spawn']) {
    sandbox.Art.drawEnemy(ctx, { kind, elite: /king/i.test(kind), anim, animT: 0.2, hitT: 0.1,
      x: 200, y: 180, seed: 0.5, hp: 5, maxHp: 10 }, 1);
  }
}
for (const anim of ['idle', 'walk', 'attack', 'hit']) sandbox.Art.drawPlayer(ctx, 100, 200, 1, { anim });
console.log('宿主/独立页加载顺序一致；' + Object.keys(sandbox.Art.SPECIES).length + ' 种妖物、25 张地图及主角动作绘制通过');
