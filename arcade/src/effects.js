/* effects：从主循环独立出的游戏系统。 */
(function (global) {
  'use strict';
  global.createArcadeEffects = function (d) {
  var S = d.S, ctx = d.ctx, Art = d.Art, rnd = d.rnd;
  function updateImpacts(dt) {
    for (var i = S.impacts.length - 1; i >= 0; i--) {
      var im = S.impacts[i];
      im.t += dt;
      if (im.t >= im.dur) S.impacts.splice(i, 1);
    }
  }

  /* 命中冲击：白闪 + 冲击环 + 十字斩光 + 碎星 */
  function impactAt(x, y, crit, ang) {
    S.impacts.push({
      x: x, y: y, t: 0, dur: crit ? 0.40 : 0.30, crit: !!crit,
      ang: ang === undefined ? Math.random() * 6.28 : ang,
      seed: Math.random() * 6.28
    });
    var n = crit ? 16 : 10;
    for (var i = 0; i < n; i++) {
      var a = (ang || 0) + rnd(-1.15, 1.15) + (i / n) * 6.28 * (crit ? 1 : 0.6);
      var sp = rnd(crit ? 120 : 80, crit ? 280 : 190);
      S.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 260, life: rnd(0.22, 0.5), max: 0.5,
        color: crit ? '#ffe08a' : '#dff6ff',
        size: Math.random() < 0.5 ? 1 : 2
      });
    }
  }

  function drawImpacts() {
    for (var i = 0; i < S.impacts.length; i++) {
      var im = S.impacts[i];
      var k = im.t / im.dur;
      var a = 1 - k;
      var x = Math.round(im.x), y = Math.round(im.y);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      /* 中心白闪：短促，避免糊成一团 */
      if (k < 0.22) {
        var fa = 1 - k / 0.22;
        var fr = (im.crit ? 5.5 : 4.0) * fa;
        ctx.globalAlpha = fa * 0.75;
        Art.ditherDisc(ctx, x, y, fr, '#ffffff', 0.8, 1);
        ctx.globalAlpha = fa * 0.9;
        Art.disc(ctx, x, y, Math.max(1, fr * 0.5), '#ffffff');
      }

      /* 冲击环 */
      var rr = 8 + k * (im.crit ? 42 : 30);
      ctx.globalAlpha = a * 0.85;
      for (var q = 0; q < 6.283; q += 0.10) {
        Art.PX(ctx, x + Math.cos(q) * rr, y + Math.sin(q) * rr * 0.86, im.crit ? '#ffe9a8' : '#bfefff');
      }
      ctx.globalAlpha = a * 0.45;
      for (var q2 = 0; q2 < 6.283; q2 += 0.16) {
        Art.PX(ctx, x + Math.cos(q2) * (rr - 3), y + Math.sin(q2) * (rr - 3) * 0.86, '#ffffff');
      }

      /* 十字斩光：沿攻击方向拉长 */
      var ca = Math.cos(im.ang), sa = Math.sin(im.ang);
      var L = 6 + k * (im.crit ? 44 : 30);
      var pts = [[ca, sa], [-ca, -sa], [-sa, ca], [sa, -ca]];
      for (var pi = 0; pi < 4; pi++) {
        var dx = pts[pi][0], dy = pts[pi][1];
        var len = pi < 2 ? L : L * 0.58;
        for (var d2 = 2; d2 < len; d2 += 1) {
          var fade = 1 - d2 / len;
          ctx.globalAlpha = a * fade * (pi < 2 ? 0.95 : 0.5);
          Art.PX(ctx, x + dx * d2, y + dy * d2 * 0.86, pi < 2 ? '#ffffff' : '#9fe8ff');
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  function updateParticles(dt) {
    for (var i = S.parts.length - 1; i >= 0; i--) {
      var p = S.parts[i];
      p.life -= dt;
      if (p.life <= 0) { S.parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function updateTexts(dt) {
    for (var i = S.texts.length - 1; i >= 0; i--) {
      var t = S.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      if (t.life <= 0) S.texts.splice(i, 1);
    }
  }

  function updateBanner(dt) {
    if (!S.banner) return;
    S.banner.t -= dt;
    if (S.banner.t <= 0) S.banner = null;
  }

  function banner(text, sub) {
    S.banner = { text: text, sub: sub || '', t: 1.5, max: 1.5 };
  }

  function floatText(x, y, text, color, scale) {
    S.texts.push({ x: x, y: y, vy: -26, life: 0.75, max: 0.75, text: text, color: color, scale: scale || 2 });
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, sp = rnd(20, 90);
      S.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 120, life: rnd(0.2, 0.45), max: 0.45, color: color, size: Math.random() < 0.6 ? 1 : 2
      });
    }
  }

  function spawnHit(x, y, crit) {
    var n = crit ? 14 : 8;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, sp = rnd(30, crit ? 160 : 110);
      S.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        g: 160, life: rnd(0.18, 0.4), max: 0.4,
        color: i % 3 === 0 ? '#ffffff' : (crit ? '#ffd76a' : '#bfefff'), size: Math.random() < 0.5 ? 1 : 2
      });
    }
    S.parts.push({
      x: x, y: y, vx: 0, vy: 0, g: 0, life: 0.26, max: 0.26,
      color: crit ? '#ffe9a8' : '#bfefff', size: 1, ring: true, r: 4
    });
  }

  function spawnDeath(e) {
    for (var i = 0; i < 16; i++) {
      var a = Math.random() * 6.28, sp = rnd(20, 110);
      S.parts.push({
        x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        g: 140, life: rnd(0.3, 0.8), max: 0.8,
        color: i % 4 === 0 ? '#e8c46a' : (e.elite ? '#c06a8a' : '#6fae7a'),
        size: Math.random() < 0.5 ? 1 : 2
      });
    }
    S.parts.push({
      x: e.x, y: e.y, vx: 0, vy: 0, g: 0, life: 0.4, max: 0.4,
      color: '#e8f5d0', size: 1, ring: true, r: 6
    });
    S.slashes.push({ x: e.x, y: e.y, r: 8, a0: 0, a1: 6.28, t: 0, dur: 0.3 });
  }

  return { updateImpacts: updateImpacts, impactAt: impactAt, drawImpacts: drawImpacts, updateParticles: updateParticles, updateTexts: updateTexts, updateBanner: updateBanner, banner: banner, floatText: floatText, burst: burst, spawnHit: spawnHit, spawnDeath: spawnDeath };
  };
})(window);
