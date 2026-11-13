/* skills：从主循环独立出的游戏系统。 */
(function (global) {
  'use strict';
  global.createArcadeSkills = function (d) {
  var S = d.S, ctx = d.ctx, Art = d.Art, sfx = d.sfx, dodge = d.dodge, focusEnemy = d.focusEnemy, applyHit = d.applyHit, sayName = d.sayName, floatText = d.floatText;
  /* ---------------- 主动技：破空斩 / 寒冰咒 / 雷罡印 ---------------- */
  /* 第 0 格是闪避，1..3 对应 ARTS；冷却与伤害都各自独立 */
  function artCdMax(i) {
    var p = S.player;
    if (!p) return 1;
    if (i === 0) return p.dodgeMax;
    return ARTS[i - 1].cd * (p.cdK || 1) * ((p.artCdK && p.artCdK[i - 1]) || 1);
  }
  function artCd(i) {
    var p = S.player;
    if (!p) return 0;
    if (i === 0) return p.dodgeCd;
    return (p.arts && p.arts[i - 1]) || 0;
  }

  function artFx(kind, x, y, dur, extra) {
    var o = { kind: kind, x: x, y: y, t: 0, dur: dur, seed: Math.random() * 9 };
    if (extra) for (var k in extra) o[k] = extra[k];
    S.artFx.push(o);
    return o;
  }

  function useArt(i) {
    var p = S.player;
    if (!p || S.scene !== 'play') return;
    if (i === 0) { dodge(); return; }
    var a = ARTS[i - 1];
    if (!a) return;
    if ((p.arts[i - 1] || 0) > 0) { sfx.deny(); S.inputShake = 0.14; return; }
    var alive = [], j;
    for (j = 0; j < S.enemies.length; j++) if (S.enemies[j].alive) alive.push(S.enemies[j]);
    if (!alive.length) { sfx.deny(); S.inputShake = 0.14; return; }
    /* 杀伤越大越费气劲：气劲不够就放不出来，也不进冷却 */
    if (p.qi < a.qi) {
      sfx.deny();
      S.inputShake = 0.14;
      S.toast = { text: '气劲不足 · ' + a.name + ' 要 ' + a.seg + ' 格', t: 1.5, max: 1.5 };
      return;
    }
    p.qi = Math.max(0, p.qi - a.qi);

    p.arts[i - 1] = artCdMax(i);
    /* 三招各有各的起手式：破空是剑气、寒冰是结印、雷罡是符箓 */
    p.anim = a.id === 'po' ? 'skill' : a.id === 'bing' ? 'seal' : 'talisman';
    p.animT = 0;
    p.leapD = 0; p.leapH = 0;
    p.swing = ((p.swing || 0) + 1) % 3;
    S.flash = Math.max(S.flash, 0.10);
    floatText(p.x + 6, p.y - 76, a.name, a.col, 1);
    sayName(a.name);

    var crit = Math.random() < p.crit;
    var dmg = Math.round(p.atk * a.dmg * ((p.artMul && p.artMul[i - 1]) || 1) * (crit ? p.critMul : 1));

    if (a.mode === 'single') {
      var tgt = focusEnemy();
      if (!tgt || !tgt.alive) {
        tgt = alive[0];
        for (j = 1; j < alive.length; j++) {
          if (Math.abs(alive[j].x - p.x) < Math.abs(tgt.x - p.x)) tgt = alive[j];
        }
      }
      sfx.art1();
      S.slashes.push({
        x: p.x + 22, y: p.y - 34, r: 26, a0: -2.30, a1: 0.80,
        t: 0, dur: 0.34, w: 1.7, grow: 22,
        c1: '#fffbe8', c2: a.col, c3: '#b06a20'
      });
      /* 一道金色剑气直冲目标 */
      S.parts.push({
        x: p.x + 26, y: p.y - 34, vx: (tgt.x - p.x) * 2.4, vy: (tgt.y - 6 - (p.y - 34)) * 2.4,
        g: 0, life: 0.16, max: 0.16, color: a.col, size: 2
      });
      artFx('po', tgt.x, tgt.y, 0.3, { x0: p.x + 30, x1: tgt.x });
      S.shake = Math.max(S.shake, 5);
      applyHit(tgt, dmg, crit, 'art');
      if (p.cleave > 0) {
        for (j = 0; j < alive.length; j++) {
          var oe = alive[j];
          if (oe === tgt || !oe.alive) continue;
          applyHit(oe, Math.round(dmg * p.cleave), false, 'art');
          break;
        }
      }
    } else {
      if (a.id === 'bing') sfx.art2(); else sfx.art3();
      for (j = 0; j < alive.length; j++) {
        var e = alive[j];
        artFx(a.id === 'bing' ? 'bing' : 'lei', e.x, e.y, a.id === 'bing' ? 0.55 : 0.42);
        if (a.id === 'bing') {
          applyHit(e, dmg, crit && j === 0, 'art');
          if (e.alive) e.frozen = Math.max(e.frozen || 0, p.bingFreeze || 2.5);
        } else {
          applyHit(e, dmg, crit && j === 0, 'art');
        }
      }
      S.shake = Math.max(S.shake, a.id === 'bing' ? 5 : 7);
    }
  }

  function drawArtFx() {
    for (var i = 0; i < S.artFx.length; i++) {
      var f = S.artFx[i];
      var k = f.t / f.dur;
      if (k >= 1) continue;
      var a = 1 - k;
      ctx.save();
      ctx.globalAlpha = a;

      if (f.kind === 'po') {
        /* 破空斩：一道横贯的剑气，边缘收窄 */
        var x0 = Math.min(f.x0, f.x1), x1 = Math.max(f.x0, f.x1);
        var y = Math.round(f.y) - 8;
        for (var x = x0; x <= x1; x += 2) {
          var u = (x - x0) / Math.max(1, x1 - x0);
          var hh = Math.max(1, Math.round((1 - Math.abs(u - 0.5) * 1.4) * (7 - k * 4)));
          Art.R(ctx, x, y - hh, 2, hh * 2, '#ffe9a8');
          Art.R(ctx, x, y - 1, 2, 2, '#fffdf0');
        }
      } else if (f.kind === 'bing') {
        /* 寒冰咒：冰环 + 外扩的冰棱 */
        var rr = 8 + k * 30;
        ctx.globalAlpha = a * 0.9;
        for (var q = 0; q < 6.283; q += 0.16) {
          Art.PX(ctx, f.x + Math.cos(q) * rr, f.y - 8 + Math.sin(q) * rr * 0.62, '#bfe8ff');
        }
        ctx.globalAlpha = a;
        for (var b = 0; b < 7; b++) {
          var ang = f.seed + b * 0.9;
          var br = 6 + k * 22;
          var bx2 = f.x + Math.cos(ang) * br, by2 = f.y - 8 + Math.sin(ang) * br * 0.62;
          Art.R(ctx, Math.round(bx2), Math.round(by2), 2, 3, '#dff4ff');
          Art.PX(ctx, Math.round(bx2), Math.round(by2) - 1, '#ffffff');
        }
      } else if (f.kind === 'lei') {
        /* 雷罡印：天上劈下的折线 */
        var segs = 9, lx = f.x, ly = f.y - 120;
        for (var s2 = 1; s2 <= segs; s2++) {
          var ty = f.y - 120 + (120 * s2 / segs);
          var tx = f.x + Math.sin(s2 * 2.7 + f.seed) * (7 - s2 * 0.55) * (1 - k * 0.6);
          Art.R(ctx, Math.round(tx), Math.round(ty), 2, Math.round(120 / segs) + 1, '#b98aff');
          Art.R(ctx, Math.round(tx), Math.round(ty), 1, Math.round(120 / segs) + 1, '#f2e8ff');
          if (s2 === 4 || s2 === 6) {
            Art.R(ctx, Math.round(tx) - 6, Math.round(ty), 6, 1, '#9f7ae0');
          }
          lx = tx; ly = ty;
        }
        Art.ditherDisc(ctx, f.x, f.y - 8, 14 * (1 - k * 0.4), '#c9a6ff', 0.5 * a, 2);
      }
      ctx.restore();
    }
  }

  return { artCdMax: artCdMax, artCd: artCd, artFx: artFx, useArt: useArt, drawArtFx: drawArtFx };
  };
})(window);
