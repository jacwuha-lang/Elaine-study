/* ambient：从主循环独立出的游戏系统。 */
(function (global) {
  'use strict';
  global.createArcadeAmbient = function (d) {
  var S = d.S, W = d.W, H = d.H, ctx = d.ctx, Art = d.Art, rnd = d.rnd;
  /* ---------------- 环境粒子 ---------------- */
  function initAmbient() {
    S.ambient = [];
    for (var i = 0; i < 20; i++) {
      S.ambient.push({
        type: 'leaf', x: Math.random() * W, y: Math.random() * H,
        vy: rnd(7, 15), ph: Math.random() * 6.28, sp: rnd(0.5, 1.1), size: Math.random() < 0.5 ? 1 : 2
      });
    }
    for (var j = 0; j < 34; j++) {
      S.ambient.push({
        type: 'mote', x: Math.random() * W, y: Math.random() * H,
        vy: rnd(-7, -2), ph: Math.random() * 6.28, size: 1
      });
    }
  }

  function updateAmbient(dt) {
    for (var i = 0; i < S.ambient.length; i++) {
      var a = S.ambient[i];
      a.ph += dt * (a.type === 'leaf' ? 1.6 : 2.2);
      if (a.type === 'leaf') {
        a.y += a.vy * dt;
        a.x -= (6 + a.sp * 8) * dt + Math.sin(a.ph) * 8 * dt;
        if (a.y > H + 6) { a.y = -6; a.x = Math.random() * W; }
        if (a.x < -6) a.x = W + 6;
      } else {
        a.y += a.vy * dt;
        a.x += Math.sin(a.ph * 0.7) * 5 * dt;
        if (a.y < -4) { a.y = H + 4; a.x = Math.random() * W; }
        if (a.x < -4) a.x = W + 4;
        if (a.x > W + 4) a.x = -4;
      }
    }
  }

  function drawAmbient(front) {
    for (var i = 0; i < S.ambient.length; i++) {
      var a = S.ambient[i];
      if (front && a.type !== 'mote') continue;
      if (!front && a.type !== 'leaf') continue;
      if (a.type === 'leaf') {
        var al = 0.45 + Math.sin(a.ph) * 0.25;
        ctx.globalAlpha = al;
        Art.R(ctx, a.x, a.y, a.size, a.size, '#a8d6b0');
        Art.R(ctx, a.x + a.size, a.y + a.size, a.size, 1, '#6fa886');
        ctx.globalAlpha = 1;
      } else {
        var pulse = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(a.ph));
        ctx.globalAlpha = pulse;
        Art.PX(ctx, a.x, a.y, '#ffe9a8');
        ctx.globalAlpha = 1;
      }
    }
  }

  return { initAmbient: initAmbient, updateAmbient: updateAmbient, drawAmbient: drawAmbient };
  };
})(window);
