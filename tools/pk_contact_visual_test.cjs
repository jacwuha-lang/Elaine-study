const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); }
catch { ({ chromium } = require(path.join(process.env.USERPROFILE || process.env.HOME,
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const localChrome = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1208/chrome-win64/chrome.exe');
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PK_CHROMIUM || (fs.existsSync(localChrome) ? localChrome : undefined),
    args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-gpu-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto((process.env.PK_TEST_URL || 'http://127.0.0.1:8792') + '/pk-preview.html?m=motion');
    await page.waitForFunction(() => window.__READY);
    const results = await page.evaluate(async () => {
      const p = window.__PK_PREVIEW, w = p.world; p.paused = true;
      const T = await import('/vendor/three.module.min.js');
      const { observeAction } = await import('/js/pk/scene/unit-motion.js');
      const { bodySpacing } = await import('/js/pk/scene/combat-spacing.js');
      const { soldierScale } = await import('/js/pk/model/visual-scale.js');
      const { armorContact } = await import('/js/pk/model/combat-contact.js');
      const render = w.renderer.render.bind(w.renderer); w.renderer.render = () => {};
      const cases = [];
      for (const tiers of [[4, 4], [1, 4], [4, 1], [2, 2]]) for (const blocked of [false, true]) {
        if (blocked && tiers[1] < 2) continue;
        w.reset(); w.time = 0;
        const distance = 1.30 + .55 * (soldierScale(tiers[0]) + soldierScale(tiers[1]) - 2) - .08;
        w.addLocal(1, 0, tiers[0], -distance / 2, 0); w.addLocal(2, 1, tiers[1], distance / 2, 0);
        const a = w.units.get(1), b = w.units.get(2); a.foe = 2; b.foe = 1;
        a.born = b.born = -10; a.group.userData.phase = b.group.userData.phase = 0;
        let worstGap = 0, contactError, shieldUp, shieldFacing, sparkError;
        for (let i = 0; i < 90; i++) {
          const t = i / 120, k = Math.min(1, Math.max(0, (t - .18) / .46)); w.time = t;
          observeAction(a, t < .18 ? 0 : 1, k, t);
          observeAction(b, blocked && t > .18 ? 4 : 0, .35, t);
          if (i === 77) w.combatEvent({ k: blocked ? 'block' : 'hit', id: 2, attacker: 1, attack: 'wind' });
          w.frameUnits(1 / 120); w.frameCombatEffects(1 / 120);
          const actual = a.group.position.distanceTo(b.group.position);
          worstGap = Math.max(worstGap, bodySpacing(a, b) - actual);
          if (i === 78) {
            const d = a.group.userData, point = armorContact(b, a, blocked);
            const tip = new T.Vector3(0, tiers[0] >= 3 ? .78 : tiers[0] === 2 ? .72 : .66).applyMatrix4(d.rig.sword.matrixWorld);
            contactError = tip.distanceTo(point);
            if (blocked) {
              const q = b.group.userData.rig.shield.getWorldQuaternion(new T.Quaternion());
              shieldUp = new T.Vector3(0, 1, 0).applyQuaternion(q).y;
              const normal = new T.Vector3(0, 0, 1).applyQuaternion(q);
              shieldFacing = normal.dot(a.group.position.clone().sub(b.group.position).normalize());
              const spark = w.hitFlashes.at(-1)?.mesh.position;
              sparkError = spark ? spark.distanceTo(point) : Infinity;
            }
          }
        }
        cases.push({ tiers, blocked, worstGap, contactError, shieldUp, shieldFacing, sparkError });
      }
      // 移动快照相互交叉时，显示层也必须保住将军体积。
      w.reset(); w.time = 0;
      w.addLocal(1, 0, 4, -.1, 0); w.addLocal(2, 1, 4, .1, 0);
      w.frameUnits(1 / 60);
      const [a, b] = [...w.units.values()];
      const overlapCorrection = a.group.position.distanceTo(b.group.position);
      // 两侧攻城投射物保留武器类型、抛物线和城门目标高度。
      const siege = [];
      for (const side of [0, 1]) for (const kind of ['archer', 'thrower', 'spearman', 'mage']) {
        w.reset(); w.time = 0;
        const gateX = side ? -28 : 28, startX = gateX + (side ? 5 : -5);
        w.addLocal(1, side, 2, startX, 0); w.units.get(1).kind = kind;
        const old = w.units.get(1).group; w.scene.remove(old);
        w.units.get(1).group = w.makeUnitModel(side, 2, kind); w.scene.add(w.units.get(1).group);
        w.frameUnits(1 / 60);
        w.soldierProjectile({ id: 1, kind, x: startX, l: 0, target: 0, gate: 1 - side, tx: gateX, ty: 2.2, tl: 0, fly: .4 });
        const shot = w.arrows.at(-1);
        w.frameArrows(.2);
        siege.push({ side, kind, endX: shot.to.x, endY: shot.to.y,
          rise: shot.g.position.y - (shot.p0.y + shot.to.y) * .5 });
      }
      // 留下可检查的双将军交战画面。
      w.reset(); w.time = 0;
      w.addLocal(1, 0, 4, -.885, 0); w.addLocal(2, 1, 4, .885, 0);
      const left = w.units.get(1), right = w.units.get(2); left.foe = 2; right.foe = 1;
      for (let i = 0; i < 78; i++) {
        w.time = i / 120; observeAction(left, 1, Math.min(1, i / 60), w.time);
        observeAction(right, 4, .35, w.time); w.frameUnits(1 / 120);
      }
      w.camera.position.set(0, 3.2, 8); w.camera.lookAt(0, 1.4, 0);
      w.renderer.render = render; render(w.scene, w.camera);
      return { cases, overlapCorrection, siege };
    });
    console.log(JSON.stringify(results));
    for (const c of results.cases) {
      assert(c.worstGap < .015, 'Bodies overlap: ' + JSON.stringify(c));
      assert(c.contactError < .18, 'Blade misses armor/shield: ' + JSON.stringify(c));
      if (c.blocked) {
        assert(c.shieldUp > .999); assert(c.shieldFacing > .99);
        assert(c.sparkError < .08, 'Block effect is away from shield');
      }
    }
    assert(results.overlapCorrection > 1.59);
    for (const shot of results.siege) {
      assert.equal(shot.endX, shot.side ? -28 : 28); assert.equal(shot.endY, 2.2); assert(shot.rise > .25);
    }
    assert.deepEqual(errors, []);
    if (process.env.PK_CAPTURE_DIR) {
      fs.mkdirSync(process.env.PK_CAPTURE_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.PK_CAPTURE_DIR, 'pk-general-contact.png') });
    }
    console.log('Visual contact and ranged siege checks passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
