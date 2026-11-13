// Run against a running server. PK_TEST_URL, PLAYWRIGHT_MODULE, PK_CHROMIUM are optional.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch {
  playwright = require(path.join(process.env.USERPROFILE || process.env.HOME,
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const localChrome = path.join(process.env.LOCALAPPDATA || '',
  'ms-playwright/chromium-1208/chrome-win64/chrome.exe');
const executablePath = process.env.PK_CHROMIUM || (fs.existsSync(localChrome) ? localChrome : undefined);

(async () => {
  const browser = await playwright.chromium.launch({ executablePath, headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader-webgl',
      '--disable-gpu-sandbox', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto((process.env.PK_TEST_URL || 'http://127.0.0.1:8792') + '/pk-preview.html?m=motion');
    await page.waitForFunction(() => window.__READY);
    const motion = await page.evaluate(async () => {
      const preview = window.__PK_PREVIEW, w = preview.world;
      preview.paused = true;
      const { observeMotion, advancePosition } = await import('/js/pk/scene/motion-track.js');
      const { buildSoldier, poseSoldier } = await import('/js/pk/models.js');
      const T = await import('/vendor/three.module.min.js');
      const dt = 1 / 120, angle = n => Math.atan2(Math.sin(n), Math.cos(n));
      const u = { x: 0, z: 0, tx: 0, tz: 0, stc: 0 };
      const speeds = []; let stallStart = 0, stallEnd = 0, maxStallStep = 0;
      for (let i = 0; i < 720; i++) {
        const t = i * dt;
        if (i % 6 === 0 && !(t > 3 && t < 3.4)) {
          const x = Math.round(Math.min(t, 4.5) * 1.55 * 100) / 100;
          observeMotion(u, x, 0, t + .004 * Math.sin(i));
        }
        const old = u.x; advancePosition(u, t, dt);
        if (t > 1 && t < 2.5) speeds.push((u.x - old) / dt);
        if (t > 3.22 && t < 3.4) maxStallStep = Math.max(maxStallStep, Math.abs(u.x - old));
        if (i === 385) stallStart = u.x;
        if (i === 407) stallEnd = u.x;
      }
      const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const ripple = Math.sqrt(speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length) / mean;
      const stopError = Math.abs(u.x - 4.5 * 1.55);
      w.clearSoldiers(); w.time = 0; w.addLocal(1, 0, 2, 0, 0); w.addLocal(2, 1, 2, 2, 0);
      const turner = w.units.get(1), foe = w.units.get(2); turner.foe = 2;
      let maxTurn = 0, maxAcceleration = 0, previousRate = 0, liftR = 0, liftL = 0;
      for (let i = 0; i < 420; i++) {
        w.time = i * dt; const before = turner.group.rotation.y;
        foe.x = foe.tx = i < 120 ? 2 : -2; foe.z = foe.tz = .01 * Math.sin(i * .7);
        turner.stc = 4; turner.prog = .3; turner.at = w.time; w.frameUnits(dt);
        const rate = angle(turner.group.rotation.y - before) / dt;
        maxTurn = Math.max(maxTurn, Math.abs(rate));
        maxAcceleration = Math.max(maxAcceleration, Math.abs(rate - previousRate) / dt); previousRate = rate;
        const contacts = turner.group.userData.footContacts;
        if (!contacts[0]) liftR++; if (!contacts[1]) liftL++;
      }
      const headingError = Math.abs(angle(turner.group.rotation.y - Math.PI));
      // Actual support-foot drift, both orientations and several body sizes.
      const gait = [];
      for (const kind of ['charge', 'archer', 'mage', 'general']) for (const side of [0, 1]) {
        const g = buildSoldier(side, kind === 'general' ? 4 : 2, kind), d = g.userData;
        d.phase = 0; d.motionSpeed = 1.55 * g.scale.x; g.rotation.y = side ? Math.PI : 0;
        let maxStep = 0, angles, slide = 0, count = 0, minY = Infinity, maxY = -Infinity;
        const previous = {};
        for (let i = 0; i < 600; i++) {
          const t = i * dt; g.position.x = t * d.motionSpeed * (side ? -1 : 1);
          poseSoldier(g, 1, 'walk', 0, t); g.updateMatrixWorld(true);
          const next = ['legR', 'legL', 'kneeR', 'kneeL'].map(k => d.rig[k].rotation.z);
          if (angles && i > 120) maxStep = Math.max(maxStep, ...next.map((v, j) => Math.abs(v - angles[j])));
          angles = next;
          for (const [suffix, offset] of [['R', 0], ['L', .5]]) {
            const foot = new T.Vector3(0, -.06, 0).applyMatrix4(d.rig['ankle' + suffix].matrixWorld);
            const phase = ((d.gait + offset) % 1 + 1) % 1, support = phase > .12 && phase < .44;
            if (i > 240 && support) {
              minY = Math.min(minY, foot.y / g.scale.x); maxY = Math.max(maxY, foot.y / g.scale.x);
              if (previous[suffix]) { slide += Math.abs(foot.x - previous[suffix].x) / dt / d.motionSpeed; count++; }
            }
            previous[suffix] = support ? foot : null;
          }
        }
        gait.push({ kind, side, maxStep, minY, maxY, slide: slide / count });
      }
      // Changing clips must preserve the previous upper-body pose on the transition frame.
      let transitionStep = 0, t = 0;
      for (const kind of ['charge', 'archer', 'spearman', 'thrower', 'mage', 'general']) {
        const g = buildSoldier(0, kind === 'general' ? 4 : 2, kind), d = g.userData;
        for (const state of ['walk', 'wind', 'hurt', 'recover', 'shot', 'block', 'thrust', 'bash', 'walk']) {
          const before = d.ps && [d.ps.armR, d.ps.foreR, d.ps.armL, d.ps.foreL];
          t += dt; d.attackCount = (d.attackCount || 0) + 1;
          poseSoldier(g, .4, state, .12, t);
          if (before) transitionStep = Math.max(transitionStep, ...['armR', 'foreR', 'armL', 'foreL'].map((k, j) => Math.abs(d.ps[k] - before[j])));
          for (let i = 1; i < 50; i++) { t += dt; poseSoldier(g, .4, state, .12 + i / 60, t); }
        }
      }
      return { ripple, stopError, stallDrift: Math.abs(stallEnd - stallStart), maxStallStep,
        maxTurn, maxAcceleration, headingError, liftR, liftL, transitionStep, gait };
    });
    assert(motion.ripple < .07); assert(motion.stopError < .02); assert(motion.stallDrift < .03);
    assert(motion.maxTurn <= 5.61); assert(motion.maxAcceleration < 40); assert(motion.headingError < .05);
    assert(motion.liftR > 5 && motion.liftL > 5, 'Stationary turns must take alternating steps');
    assert(motion.transitionStep < .001, 'Switching clips jumps the arms');
    for (const g of motion.gait) {
      assert(g.maxStep < .14); assert(g.minY > -.04 && g.maxY < .07); assert(g.slide < .15);
    }
    console.log(JSON.stringify({ stage: 'motion', ...motion }));
    const combat = await page.evaluate(async () => {
      const { bodySpacing } = await import('/js/pk/scene/combat-spacing.js');
      const p = window.__PK_PREVIEW; p.restart();
      const render = p.world.renderer.render; p.world.renderer.render = () => {};
      const previous = new Map(), armQuaternions = new Map(); let maxTurn = 0, maxLegStep = 0, maxArmStep = 0, maxParticles = 0;
      let maxOverlap = 0, maxContactError = 0, contacts = 0, shieldContacts = 0;
      try {
        for (let i = 0; i < 1020; i++) {
          p.advance(1 / 60);
          p.world.units.forEach((u, id) => {
            const r = u.group.userData.rig;
            const values = [u.group.rotation.y, r.armR.rotation.z, r.foreR.rotation.z,
              r.legR.rotation.z, r.legL.rotation.z, r.kneeR.rotation.z, r.kneeL.rotation.z];
            if (!values.every(Number.isFinite)) throw new Error('Nonfinite combat pose: ' + id);
            const old = previous.get(id);
            if (old) {
              maxTurn = Math.max(maxTurn, Math.abs(Math.atan2(Math.sin(values[0] - old[0]), Math.cos(values[0] - old[0]))) * 60);
              maxLegStep = Math.max(maxLegStep, ...values.slice(3).map((v, j) => Math.abs(v - old[j + 3])));
            }
            // 三维 IK 可跨过 Euler 表示的分支；用真实四元数夹角判断连续性。
            const qs = ['armR', 'foreR', 'armL', 'foreL'].map(k => r[k].quaternion.clone());
            const oldQ = armQuaternions.get(id);
            if (oldQ) qs.forEach((q, j) => { maxArmStep = Math.max(maxArmStep, q.angleTo(oldQ[j])); });
            armQuaternions.set(id, qs);
            const contact = u.group.userData.bladeContact;
            if (contact?.weight > .999) {
              contacts++; if (contact.blocked) shieldContacts++;
              maxContactError = Math.max(maxContactError, contact.error);
            }
            previous.set(id, values);
          });
          const list = [...p.world.units.values()];
          for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
            maxOverlap = Math.max(maxOverlap, bodySpacing(list[a], list[b]) - list[a].group.position.distanceTo(list[b].group.position));
          }
          maxParticles = Math.max(maxParticles, p.world.skillEffects.particles.active);
        }
      } finally { p.world.renderer.render = render; }
      p.world.scene.updateMatrixWorld(true); render.call(p.world.renderer, p.world.scene, p.world.camera);
      return { frames: 1020, units: p.world.units.size, maxTurn, maxLegStep, maxArmStep, maxParticles,
        maxOverlap, maxContactError, contacts, shieldContacts };
    });
    assert(combat.units === 14); assert(combat.maxTurn < 5.61); assert(combat.maxLegStep < .24);
    assert(combat.maxArmStep < .5); assert(combat.maxParticles <= 448); assert.deepEqual(errors, []);
    assert(combat.maxOverlap < .025); assert(combat.maxContactError < .25);
    assert(combat.contacts > 20 && combat.shieldContacts > 0);
    console.log(JSON.stringify({ stage: 'server-combat-replay', ...combat }));
    if (process.env.PK_CAPTURE_DIR) {
      fs.mkdirSync(process.env.PK_CAPTURE_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.PK_CAPTURE_DIR, 'pk-motion-combat.png') });
    }
    console.log('PK motion checks passed. No player profiles were read or changed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
