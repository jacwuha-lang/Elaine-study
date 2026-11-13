/* 场景背景、地图主题与背景图层绘制。 */
(function (global) {
  'use strict';
  global.createArcadeBackgrounds = function (d) {
  var makeCanvas = d.makeCanvas, R = d.R, PX = d.PX, disc = d.disc, softDisc = d.softDisc, line = d.line;
  var mulberry32 = d.mulberry32, hash2 = d.hash2, ditherDisc = d.ditherDisc, hex2rgb = d.hex2rgb, BAYER = d.BAYER;
  /* ---------------- 天空 ---------------- */

  var SKY_STOPS = [
    [0.00, '#4d8b86'],
    [0.10, '#5f9c92'],
    [0.22, '#74ad9d'],
    [0.34, '#8dbfa8'],
    [0.46, '#a7cfb2'],
    [0.58, '#bfdcbb'],
    [0.70, '#d4e7c6'],
    [0.80, '#e4eed0'],
    [0.90, '#f1efd8'],
    [1.00, '#fbf3dd']
  ];

  function bakeSky() {
    var o = makeCanvas(480, 270), ctx = o.x;
    var stops = SKY_STOPS.map(function (s) {
      var c = hex2rgb(s[1]);
      return [s[0], c[0], c[1], c[2]];
    });
    var img = ctx.createImageData(480, 270);
    var d = img.data;
    for (var y = 0; y < 270; y++) {
      var t = y / 269;
      var i = 0;
      while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      var a = stops[i], b = stops[i + 1];
      var f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      for (var x = 0; x < 480; x++) {
        var thr = (BAYER[y & 3][x & 3] + 0.5) / 16;
        var edge = 0.86;
        var useB = f > edge && thr < (f - edge) / (1 - edge);
        var idx = (y * 480 + x) * 4;
        d[idx] = useB ? b[1] : a[1];
        d[idx + 1] = useB ? b[2] : a[2];
        d[idx + 2] = useB ? b[3] : a[3];
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    /* 日轮 */
    var sx = 372, sy = 82;
    softDisc(ctx, sx, sy, 27, '#a6c8b2');
    softDisc(ctx, sx, sy, 21, '#cfe0bd');
    softDisc(ctx, sx, sy, 16, '#eee9c5');
    softDisc(ctx, sx, sy, 11, '#fff8dc');
    softDisc(ctx, sx, sy, 7, '#fffdf4');

    /* 远处飞鸟 */
    var birds = [[296, 62, 1], [312, 54, 1], [276, 74, 0.8], [330, 68, 0.7]];
    for (var bi = 0; bi < birds.length; bi++) {
      var bx0 = birds[bi][0], by0 = birds[bi][1], bs = birds[bi][2];
      var bw = Math.max(2, Math.round(3 * bs));
      R(ctx, bx0 - bw, by0, bw, 1, '#4a6f66');
      R(ctx, bx0, by0, bw, 1, '#4a6f66');
      PX(ctx, bx0, by0 - 1, '#4a6f66');
    }

    /* 地平线暖光 */
    for (var yy = 196; yy < 224; yy++) {
      var dens = (yy - 196) / 28 * 0.35;
      for (var xx = 0; xx < 480; xx++) {
        if (hash2(xx, yy) < dens) PX(ctx, xx, yy, '#f2edd0');
      }
    }

    /* 薄云 */
    var rng = mulberry32(4411);
    for (var i2 = 0; i2 < 7; i2++) {
      var cx = rng() * 480, cy = 118 + rng() * 74, w = 50 + rng() * 110;
      for (var k = 0; k < w; k++) {
        var py = cy + Math.sin(k * 0.055 + i2) * 2.2;
        if (hash2(k + i2 * 31, py) < 0.30) PX(ctx, cx + k, py, '#e9efd9');
        if (hash2(k + i2 * 31, py + 1) < 0.14) PX(ctx, cx + k, py + 1, '#f6f4e2');
      }
    }
    return o.c;
  }

  /* ---------------- 远山 ---------------- */

  function drawRidge(ctx, W, baseY, amp, fill, rim, seed, k1, k2, k3) {
    var rng = mulberry32(seed);
    var p1 = rng() * 6.283, p2 = rng() * 6.283, p3 = rng() * 6.283;
    for (var x = 0; x < W; x++) {
      var u = x / W * Math.PI * 2;
      var h = baseY - (Math.sin(u * k1 + p1) * 0.55 + Math.sin(u * k2 + p2) * 0.30 + Math.sin(u * k3 + p3) * 0.15) * amp;
      h = Math.round(h);
      R(ctx, x, h, 1, 232 - h, fill);
      PX(ctx, x, h, rim);
      for (var y = h + 1; y < h + 5; y++) {
        if (hash2(x, y) < 0.20) PX(ctx, x, y, rim);
      }
      for (var y2 = h + 6; y2 < 232; y2 += 3) {
        if (hash2(x, y2) < 0.10) PX(ctx, x, y2, '#00000022');
      }
    }
  }

  function bakeMountains() {
    var o = makeCanvas(960, 270), ctx = o.x;
    drawRidge(ctx, 960, 184, 34, '#6f9c90', '#c2ddcd', 1234, 3, 5, 8);
    drawRidge(ctx, 960, 199, 24, '#42716a', '#8fb8a6', 5678, 2, 4, 7);

    /* 远塔 */
    var px = 176, py = 192;
    R(ctx, px - 1, py - 20, 2, 20, '#3f6a60');
    for (var i = 0; i < 3; i++) {
      var w = 16 - i * 4, y = py - 6 - i * 6;
      R(ctx, px - w / 2, y, w, 2, '#3f6a60');
      R(ctx, px - w / 2 - 2, y, w + 4, 1, '#517d71');
      R(ctx, px - 3, y + 2, 6, 4, '#3f6a60');
    }
    R(ctx, px - 1, py - 24, 2, 4, '#517d71');

    drawRidge(ctx, 960, 210, 16, '#2b5049', '#5f8a7e', 9012, 3, 6, 9);

    return o.c;
  }

  /* ---------------- 竹林 ---------------- */

  function drawStalk(ctx, x, top, bottom, w, lean, cDark, cMid, cHi, rng) {
    var y, xx;
    for (y = Math.round(top); y < bottom; y++) {
      xx = Math.round(x + lean * (y - top));
      R(ctx, xx, y, w, 1, cMid);
      PX(ctx, xx, y, cDark);
      PX(ctx, xx + w - 1, y, cHi);
    }
    var nodeY = top + 8 + rng() * 12;
    while (nodeY < bottom) {
      xx = Math.round(x + lean * (nodeY - top));
      R(ctx, xx - 1, nodeY, w + 2, 1, cDark);
      R(ctx, xx, nodeY + 1, w, 1, cHi);
      nodeY += 15 + rng() * 15;
    }
    var by = top + 26 + rng() * 30;
    while (by < bottom - 46) {
      xx = Math.round(x + lean * (by - top));
      R(ctx, xx - 1, by, w + 2, 2, cDark);
      by += 34 + rng() * 34;
    }
  }

  function leafPx(ctx, x, y, ang, len, c1, c2) {
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var px = -dy, py = dx;
    for (var i = 0; i < len; i++) {
      var t = i / len;
      var w = Math.sin(Math.PI * t) * 1.2;
      var cx = x + dx * i, cy = y + dy * i;
      R(ctx, cx, cy, 1, 1, t < 0.55 ? c1 : c2);
      if (w > 0.72) R(ctx, cx + px, cy + py, 1, 1, t < 0.55 ? c1 : c2);
    }
  }

  function leafCluster(ctx, x, y, ang, scale, c1, c2, rng) {
    var n = 2 + Math.floor(rng() * 3);
    for (var i = 0; i < n; i++) {
      var a = ang + (rng() - 0.5) * 1.0;
      var len = (6 + rng() * 7) * scale;
      leafPx(ctx, x + (rng() - 0.5) * 4, y + (rng() - 0.5) * 5, a, len, c1, c2);
    }
  }

  function bakeBamboo(seed, count, colors, minW, maxW, leafScale, leafChance, avoid, leanMax) {
    var o = makeCanvas(960, 270), ctx = o.x;
    var rng = mulberry32(seed);
    var placed = 0, guard = 0;

    while (placed < count && guard++ < count * 12) {
      var cx0 = rng() * 960;
      var clump = 1 + Math.floor(rng() * 3);
      for (var c = 0; c < clump && placed < count; c++) {
        var bx = cx0 + (rng() - 0.5) * 30;
        if (bx < -20) bx += 960;
        if (bx > 980) bx -= 960;
        if (avoid && bx > avoid[0] && bx < avoid[1]) continue;

        var w = minW + Math.floor(rng() * (maxW - minW + 1));
        var top = -16 + rng() * 50;
        var lean = (rng() - 0.5) * (leanMax || 0.06);
        var cDark = colors[0], cMid = colors[1], cHi = colors[2];
        drawStalk(ctx, bx, top, 226, w, lean, cDark, cMid, cHi, rng);

        if (rng() < leafChance) {
          var nb = 2 + Math.floor(rng() * 3);
          for (var b = 0; b < nb; b++) {
            var by = top + 34 + rng() * (186 - top);
            var bx2 = bx + lean * (by - top);
            var dir = rng() < 0.5 ? -1 : 1;
            var bl = 9 + rng() * 15;
            line(ctx, bx2 + w / 2, by, bx2 + w / 2 + dir * bl, by - 4 - rng() * 7, cMid, 1);
            leafCluster(ctx, bx2 + w / 2 + dir * bl, by - 5, dir > 0 ? -0.5 : Math.PI + 0.5, leafScale, cHi, cMid, rng);
          }
        }
        placed++;
      }
    }
    return o.c;
  }

  function bakeShafts() {
    var o = makeCanvas(480, 270), ctx = o.x;
    ctx.globalAlpha = 0.20;
    for (var i = 0; i < 7; i++) {
      var x0 = 300 + i * 26;
      for (var y = 40; y < 232; y++) {
        var sx = x0 - (y - 40) * 0.62;
        for (var k = 0; k < 9; k++) {
          if (hash2(i * 17 + k, y) < 0.42) PX(ctx, sx + k, y, '#f7f2cc');
        }
      }
    }
    ctx.globalAlpha = 1;
    return o.c;
  }

  /* ---------------- 地面 ---------------- */

  function bakeGround() {
    var o = makeCanvas(960, 270), ctx = o.x;

    /* 远景灌木线：用实体剪影压住地平线，比渐变噪点更干净 */
    for (var hx = 0; hx < 960; hx++) {
      var hy = 193 + Math.round(Math.sin(hx * 0.045) * 3 + Math.sin(hx * 0.11 + 1.3) * 2);
      R(ctx, hx, hy, 1, 226 - hy, '#1e3529');
      PX(ctx, hx, hy, '#31533f');
    }
    var brng = mulberry32(5150);
    for (var bi = 0; bi < 46; bi++) {
      var bx = brng() * 960, by = 196 + brng() * 6, br = 3 + brng() * 6;
      disc(ctx, bx, by, br, '#1e3529');
      for (var ba = -1.2; ba < 0.2; ba += 0.25) {
        PX(ctx, bx + Math.cos(ba) * br, by + Math.sin(ba) * br, '#2c4c3a');
      }
    }

    R(ctx, 0, 218, 960, 52, '#1b2c24');

    /* 草沿 */
    for (var i = 0; i < 960; i += 2) {
      var h = 2 + ((i * 7919) % 4);
      R(ctx, i, 218, 2, h, '#2f4a37');
      if (i % 8 === 0) R(ctx, i, 214, 1, 6, '#3d6045');
    }

    /* 大石板两行 */
    for (var row = 0; row < 2; row++) {
      var y = 230 + row * 15;
      var off = (row % 2) * 26;
      for (var sx = -60; sx < 1020; sx += 56) {
        var w = 48 + ((sx * 13 + row * 7) % 10);
        R(ctx, sx + off, y, w, 13, row === 0 ? '#33473b' : '#2c3f34');
        R(ctx, sx + off, y, w, 1, '#4a6152');
        R(ctx, sx + off, y + 12, w, 1, '#1f2f27');
        if ((sx + row) % 3 === 0) {
          PX(ctx, sx + off + 12, y + 5, '#354a3c');
          PX(ctx, sx + off + 13, y + 6, '#354a3c');
        }
      }
    }

    /* 草簇 */
    for (var g = 0; g < 40; g++) {
      var gx = (g * 227) % 960;
      var gy = 226 + (g % 3);
      for (var b = 0; b < 3; b++) {
        R(ctx, gx + b * 2, gy - 3 - (b % 2), 1, 4 + (b % 2), b === 1 ? '#5f8f5a' : '#456b4a');
      }
    }

    /* 青苔 */
    for (var m = 0; m < 90; m++) {
      var mx = (m * 97) % 960, my = 231 + ((m * 53) % 26);
      R(ctx, mx, my, 1 + (m % 2), 1, m % 5 === 0 ? '#5f8a5a' : '#456b4a');
    }

    /* 落叶 */
    for (var l = 0; l < 26; l++) {
      var lx = (l * 311) % 960, ly = 226 + ((l * 43) % 28);
      R(ctx, lx, ly, 2, 1, l % 3 === 0 ? '#8fae5a' : '#6f8a48');
      PX(ctx, lx + 2, ly + 1, '#4f6a38');
    }

    /* 前景暗带 */
    R(ctx, 0, 258, 960, 12, '#0f1c16');
    for (var d = 0; d < 960; d += 3) {
      if (hash2(d, 259) < 0.35) PX(ctx, d, 258, '#20382b');
    }
    return o.c;
  }

  function bakeForeground() {
    var o = makeCanvas(960, 270), ctx = o.x;
    var rng = mulberry32(9182);

    function canopy(cx, y, spread, n, c1, c2) {
      for (var i = 0; i < n; i++) {
        var ang = Math.PI * 0.5 + (rng() - 0.5) * 1.7;
        var len = 12 + rng() * 16;
        var x = cx + (rng() - 0.5) * spread;
        leafPx(ctx, x, y + rng() * 6, ang, len, c1, c2);
      }
      line(ctx, cx - spread / 2, y, cx + spread / 2, y - 2, c2, 1);
    }

    drawStalk(ctx, 6, -30, 270, 14, 0.02, '#0a1a15', '#102620', '#1b3a30', rng);
    drawStalk(ctx, 26, -30, 270, 6, -0.01, '#0c1f19', '#132b24', '#1e4034', rng);
    drawStalk(ctx, 922, -30, 270, 17, -0.02, '#0a1a15', '#102620', '#1b3a30', rng);
    drawStalk(ctx, 898, -30, 270, 7, 0.015, '#0c1f19', '#132b24', '#1e4034', rng);

    canopy(40, -4, 120, 16, '#123028', '#0b1d17');
    canopy(180, -10, 150, 14, '#14342a', '#0c211b');
    canopy(330, -6, 140, 15, '#123028', '#0b1d17');
    canopy(470, -8, 120, 12, '#14342a', '#0c211b');

    for (var j = 0; j < 18; j++) {
      var x2 = rng() * 960;
      leafPx(ctx, x2, 4 + rng() * 20, Math.PI * 0.5 + (rng() - 0.5) * 1.2, 8 + rng() * 10, '#183a30', '#102620');
    }
    return o.c;
  }

  function bakeMist() {
    var o = makeCanvas(960, 44), ctx = o.x;
    var rng = mulberry32(7771);
    for (var i = 0; i < 16; i++) {
      var y = 6 + rng() * 30;
      var x0 = rng() * 960;
      var len = 120 + rng() * 320;
      for (var k = 0; k < len; k++) {
        var xx = (x0 + k) % 960;
        var yy = y + Math.sin((x0 + k) * 0.018 + i) * 2;
        var d = hash2(k + i * 53, i);
        if (d < 0.55) PX(ctx, xx, yy, '#e2efd2');
        if (d < 0.16) PX(ctx, xx, yy + 1, '#e2efd2');
      }
    }
    return o.c;
  }

  function bakeWarm() {
    var o = makeCanvas(480, 270), ctx = o.x;
    var img = ctx.createImageData(480, 270), d = img.data;
    var sx = 372, sy = 82;
    for (var y = 0; y < 270; y++) {
      for (var x = 0; x < 480; x++) {
        var dx = x - sx, dy = y - sy;
        var dist = Math.sqrt(dx * dx + dy * dy) / 170;
        var a = Math.max(0, 1 - dist);
        a = a * a * 78;
        var thr = (BAYER[y & 3][x & 3] + 0.5) / 16 * 255;
        var idx = (y * 480 + x) * 4;
        if (a > thr) {
          d[idx] = 255; d[idx + 1] = 226; d[idx + 2] = 158;
          d[idx + 3] = Math.min(255, Math.round(a));
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return o.c;
  }

  function bakeProps() {
    var o = makeCanvas(960, 270), ctx = o.x;

    function lantern(x, y, s) {
      var w = 10 * s;
      R(ctx, x - w / 2 - 2, y - 3 * s, w + 4, 3 * s, '#2b3d33');
      R(ctx, x - w / 2 - 2, y - 3 * s, w + 4, 1, '#3d5445');
      R(ctx, x - 1, y - 14 * s, 3, 11 * s, '#33463a');
      R(ctx, x - 1, y - 14 * s, 1, 11 * s, '#45604e');
      R(ctx, x - 5, y - 21 * s, 11, 8 * s, '#2b3d33');
      R(ctx, x - 4, y - 20 * s, 9, 6 * s, '#ffd98a');
      R(ctx, x - 3, y - 19 * s, 7, 4 * s, '#fff3c4');
      R(ctx, x - 1, y - 20 * s, 1, 6, '#2b3d33');
      R(ctx, x - 7, y - 24 * s, 15, 3, '#2b3d33');
      R(ctx, x - 8, y - 24 * s, 17, 1, '#3d5445');
      R(ctx, x - 1, y - 27 * s, 2, 3, '#2b3d33');
      ditherDisc(ctx, x, y - 18 * s, 11 * s, '#ffe6a0', 0.16, 5);
    }

    lantern(96, 222, 1);
    lantern(438, 222, 1);
    lantern(792, 222, 0.85);

    var rng = mulberry32(3355);
    for (var i = 0; i < 26; i++) {
      var rx = rng() * 960, ry = 214 + rng() * 10, rw = 2 + rng() * 5;
      disc(ctx, rx, ry, rw, '#2a3f34');
      for (var a = -1.4; a < -0.2; a += 0.3) {
        PX(ctx, rx + Math.cos(a) * rw, ry + Math.sin(a) * rw, '#3d5a48');
      }
    }

    /* 蕨类 */
    for (var f = 0; f < 30; f++) {
      var fx = rng() * 960, fy = 216 + rng() * 6;
      for (var k = 0; k < 4; k++) {
        leafPx(ctx, fx + (rng() - 0.5) * 4, fy, -1.9 + (rng() - 0.5) * 0.8, 5 + rng() * 4, '#2f4f3c', '#20382b');
      }
    }
    return o.c;
  }

  function bakeVignette() {
    var o = makeCanvas(480, 270), ctx = o.x;
    var img = ctx.createImageData(480, 270), d = img.data;
    for (var y = 0; y < 270; y++) {
      for (var x = 0; x < 480; x++) {
        var dx = (x - 240) / 240, dy = (y - 135) / 135;
        var dd = Math.sqrt(dx * dx + dy * dy);
        var a = Math.max(0, Math.min(1, (dd - 0.62) / 0.55)) * 150;
        var idx = (y * 480 + x) * 4;
        d[idx] = 3; d[idx + 1] = 10; d[idx + 2] = 9;
        d[idx + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
    return o.c;
  }

  /* ================= 第 2 / 第 3 关：另外两套分层背景 ================= */

  /* 多段渐变天空 + 星 / 日月 / 薄云：色带之间只留一条抖动过渡，避免整屏噪点 */
  function bakeSkyEx(cfg) {
    var o = makeCanvas(480, 270), ctx = o.x;
    var stops = cfg.stops.map(function (s) {
      var c = hex2rgb(s[1]);
      return [s[0], c[0], c[1], c[2]];
    });
    var img = ctx.createImageData(480, 270), d = img.data;
    var y, x, idx;
    for (y = 0; y < 270; y++) {
      var t = y / 269;
      var i = 0;
      while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      var a = stops[i], b = stops[i + 1];
      var f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      if (cfg.smooth) {
        /* Arcade 的多段天空用逐行色彩插值，避免 Bayer 矩阵形成横向点带。 */
        var rr = Math.round(a[1] + (b[1] - a[1]) * f);
        var gg = Math.round(a[2] + (b[2] - a[2]) * f);
        var bb = Math.round(a[3] + (b[3] - a[3]) * f);
        for (x = 0; x < 480; x++) {
          idx = (y * 480 + x) * 4;
          d[idx] = rr; d[idx + 1] = gg; d[idx + 2] = bb; d[idx + 3] = 255;
        }
      } else {
        for (x = 0; x < 480; x++) {
          var thr = (BAYER[y & 3][x & 3] + 0.5) / 16;
          var edge = 0.80;
          var useB = f > edge && thr < (f - edge) / (1 - edge);
          idx = (y * 480 + x) * 4;
          d[idx] = useB ? b[1] : a[1];
          d[idx + 1] = useB ? b[2] : a[2];
          d[idx + 2] = useB ? b[3] : a[3];
          d[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    if (cfg.stars) {
      var srng = mulberry32((cfg.seed || 7) + 3);
      for (var s = 0; s < cfg.stars; s++) {
        var sx = srng() * 480, sy = srng() * 150;
        var br = srng();
        PX(ctx, sx, sy, br > 0.78 ? '#ffffff' : (br > 0.42 ? '#d2e2ff' : '#8ea6c8'));
        if (br > 0.93) { PX(ctx, sx - 1, sy, '#8098bc'); PX(ctx, sx + 1, sy, '#8098bc'); }
      }
    }

    if (cfg.orb) {
      var orb = cfg.orb;
      for (var oi = 0; oi < orb.rings.length; oi++) {
        softDisc(ctx, orb.x, orb.y, orb.rings[oi][0], orb.rings[oi][1]);
      }
    }

    if (cfg.cloud) {
      var crng = mulberry32((cfg.seed || 7) + 31);
      for (var i2 = 0; i2 < (cfg.cloudN || 5); i2++) {
        var cx = crng() * 480, cy = 100 + crng() * 78, w = 70 + crng() * 130;
        for (var k2 = 0; k2 < w; k2++) {
          var py = cy + Math.sin(k2 * 0.05 + i2) * 2.2;
          if (hash2(k2 + i2 * 31, py) < 0.22) PX(ctx, cx + k2, py, cfg.cloud);
          if (hash2(k2 + i2 * 31, py + 1) < 0.09) PX(ctx, cx + k2, py + 1, cfg.cloud2 || cfg.cloud);
        }
      }
    }

    if (cfg.horizon) {
      var hc = hex2rgb(cfg.horizon);
      for (var yy = 188; yy < 224; yy++) {
        var dens = (yy - 188) / 36 * 0.26;
        for (var xx = 0; xx < 480; xx++) {
          if (hash2(xx, yy) < dens) {
            ctx.fillStyle = 'rgb(' + hc[0] + ',' + hc[1] + ',' + hc[2] + ')';
            ctx.fillRect(xx, yy, 1, 1);
          }
        }
      }
    }
    return o.c;
  }

  function bakeMistEx(color) {
    var o = makeCanvas(960, 44), ctx = o.x;
    var rng = mulberry32(7771);
    for (var i = 0; i < 16; i++) {
      var y = 6 + rng() * 30;
      var x0 = rng() * 960;
      var len = 120 + rng() * 320;
      for (var k = 0; k < len; k++) {
        var xx = (x0 + k) % 960;
        var yy = y + Math.sin((x0 + k) * 0.018 + i) * 2;
        var d = hash2(k + i * 53, i);
        if (d < 0.55) PX(ctx, xx, yy, color);
        if (d < 0.16) PX(ctx, xx, yy + 1, color);
      }
    }
    return o.c;
  }

  function bakeVigEx(r, g, b) {
    var o = makeCanvas(480, 270), ctx = o.x;
    var img = ctx.createImageData(480, 270), d = img.data;
    for (var y = 0; y < 270; y++) {
      for (var x = 0; x < 480; x++) {
        var dx = (x - 240) / 240, dy = (y - 135) / 135;
        var dd = Math.sqrt(dx * dx + dy * dy);
        var a = Math.max(0, Math.min(1, (dd - 0.62) / 0.55)) * 150;
        var idx = (y * 480 + x) * 4;
        d[idx] = r; d[idx + 1] = g; d[idx + 2] = b;
        d[idx + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
    return o.c;
  }

  /* 光柱：颜色可换（夕阳暖光 / 月色冷光） */
  function bakeShaftsEx(color, alpha) {
    var o = makeCanvas(480, 270), ctx = o.x;
    ctx.globalAlpha = alpha == null ? 0.20 : alpha;
    for (var i = 0; i < 7; i++) {
      var x0 = 300 + i * 26;
      for (var y = 40; y < 232; y++) {
        var sx = x0 - (y - 40) * 0.62;
        for (var k = 0; k < 9; k++) {
          if (hash2(i * 17 + k, y) < 0.42) PX(ctx, sx + k, y, color);
        }
      }
    }
    ctx.globalAlpha = 1;
    return o.c;
  }

  /* 圆形柔光（日 / 月 周围的光晕） */
  function bakeWarmEx(sx, sy, rad, rgb, power) {
    var o = makeCanvas(480, 270), ctx = o.x;
    var img = ctx.createImageData(480, 270), d = img.data;
    for (var y = 0; y < 270; y++) {
      for (var x = 0; x < 480; x++) {
        var dx = x - sx, dy = y - sy;
        var dist = Math.sqrt(dx * dx + dy * dy) / rad;
        var a = Math.max(0, 1 - dist);
        a = a * a * (power || 78);
        var thr = (BAYER[y & 3][x & 3] + 0.5) / 16 * 255;
        var idx = (y * 480 + x) * 4;
        if (a > thr) {
          d[idx] = rgb[0]; d[idx + 1] = rgb[1]; d[idx + 2] = rgb[2];
          d[idx + 3] = Math.min(255, Math.round(a));
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return o.c;
  }

  /* ---------------- 树：枫 / 松 ---------------- */

  function drawMaple(ctx, x, baseY, h, cfg, rng) {
    var trunkW = cfg.trunkW || 3;
    var y, t, tw, xx;
    for (y = Math.round(baseY); y > baseY - h * 0.56; y--) {
      t = (baseY - y) / (h * 0.56);
      tw = Math.max(1, Math.round(trunkW * (1 - t * 0.45)));
      /* 树根外扩，别让树干像根电线杆 */
      if (t < 0.12) tw += Math.round((0.12 - t) * 20);
      xx = Math.round(x + Math.sin(t * 2.6) * 1.5);
      R(ctx, xx - tw, y, tw * 2, 1, cfg.trunk);
      PX(ctx, xx - tw, y, cfg.trunkDark);
      PX(ctx, xx + tw - 1, y, cfg.trunkDark);
    }
    var topY = baseY - h * 0.56;
    for (var b = 0; b < 3; b++) {
      var dir = b === 0 ? -1 : (b === 1 ? 1 : (rng() < 0.5 ? -1 : 1));
      var by = topY + 3 + b * 6;
      var len = h * (0.13 + rng() * 0.08);
      var ex = x + dir * len, ey = by - len * 0.7;
      line(ctx, x, by, ex, ey, cfg.trunk, 2);
      line(ctx, x, by, ex, ey, cfg.trunkDark, 1);
    }
    /* 树冠压低，和树梢咬合，避免"树冠浮在半空" */
    var cy0 = baseY - h * 0.74;
    var base = [[0, 0, 1.0], [-0.46, 0.18, 0.70], [0.46, 0.16, 0.74],
                [-0.22, -0.30, 0.60], [0.26, -0.28, 0.56]];
    var n = Math.min(cfg.clusters || 5, base.length);
    for (var c = 0; c < n; c++) {
      var cl = base[c];
      var cx = x + cl[0] * h * 0.40 + (rng() - 0.5) * 4;
      var cy = cy0 + cl[1] * h * 0.26 + (rng() - 0.5) * 4;
      var rr = h * (cfg.canopy || 0.20) * cl[2] * (0.82 + rng() * 0.28);
      disc(ctx, cx, cy, rr, cfg.leafDark);
      disc(ctx, cx - rr * 0.10, cy - rr * 0.12, rr * 0.80, cfg.leaf);
      if (!cfg.flat) disc(ctx, cx - rr * 0.28, cy - rr * 0.30, rr * 0.40, cfg.leafHi);
      for (var p = 0; p < (cfg.flat ? 5 : 9); p++) {
        var ang = rng() * 6.283, rad = rr * (0.72 + rng() * 0.34);
        PX(ctx, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.78,
          rng() < 0.5 ? cfg.leaf : (cfg.flat ? cfg.leafDark : cfg.leafHi));
      }
    }
  }

  function bakeMapleForest(seed, count, cfg, baseY, avoid) {
    var o = makeCanvas(960, 270), ctx = o.x;
    var rng = mulberry32(seed);
    var slot = 960 / count;
    for (var i = 0; i < count; i++) {
      var x = (i + 0.5) * slot + (rng() - 0.5) * slot * 0.8;
      if (avoid && x > avoid[0] && x < avoid[1]) continue;
      drawMaple(ctx, x, baseY + (rng() - 0.5) * 8, cfg.h * (0.82 + rng() * 0.42), cfg, rng);
    }
    return o.c;
  }

  function drawPine(ctx, x, baseY, h, cfg, rng) {
    var trunkW = Math.max(1, Math.round(h * 0.030));
    var trunkTop = Math.round(baseY - h * 0.50);
    R(ctx, x - trunkW, trunkTop, trunkW * 2, Math.round(baseY - trunkTop), cfg.trunk);
    PX(ctx, x - trunkW, trunkTop, cfg.trunkDark);

    var tiers = Math.max(4, Math.round(h / 16));
    var bodyTop = Math.round(baseY - h * 0.95);
    var bodyH = Math.round(baseY - bodyTop);
    var maxHalf = h * (cfg.wide || 0.34);
    for (var ti = 0; ti < tiers; ti++) {
      var yTop = bodyTop + Math.round(ti / tiers * bodyH);
      var yBot = bodyTop + Math.round((ti + 1) / tiers * bodyH);
      var halfTop = Math.round(maxHalf * (0.05 + 0.84 * (ti / tiers)));
      var halfBot = Math.round(maxHalf * (0.55 + 0.80 * (ti / tiers)));
      for (var yy = yTop; yy < yBot; yy++) {
        var k = (yy - yTop) / Math.max(1, yBot - 1 - yTop);
        var half = Math.round(halfTop + (halfBot - halfTop) * k);
        /* 层底做成缺口，别让每层都是一条笔直的横线 */
        if (yy >= yBot - 2) half = Math.max(1, half - (hash2(x + yy, ti * 7) < 0.5 ? 2 : 0));
        R(ctx, x - half, yy, half * 2, 1, cfg.bough);
        R(ctx, x - half, yy, Math.max(1, Math.round(half * 0.40)), 1, cfg.trunkDark);
      }
      /* 积雪：碎雪压顶，按像素随机断开，避免连成一条白线 */
      for (var sx = x - halfTop; sx <= x + halfTop; sx++) {
        var n = hash2(sx * 3 + ti * 17, yTop);
        if (n < 0.70) R(ctx, sx, yTop, 1, 1, cfg.snow);
        if (n < 0.24) PX(ctx, sx, yTop + 1, cfg.snow);
      }
    }
    R(ctx, x - 1, bodyTop - 1, 3, 2, cfg.snow);
  }

  function bakePineForest(seed, count, cfg, baseY, avoid) {
    var o = makeCanvas(960, 270), ctx = o.x;
    var rng = mulberry32(seed);
    var slot = 960 / count;
    for (var i = 0; i < count; i++) {
      var x = (i + 0.5) * slot + (rng() - 0.5) * slot * 0.8;
      if (avoid && x > avoid[0] && x < avoid[1]) continue;
      drawPine(ctx, x, baseY + (rng() - 0.5) * 6, cfg.h * (0.8 + rng() * 0.45), cfg, rng);
    }
    return o.c;
  }

  /* 远山：颜色可换，另加雪线 / 塔 */
  function bakeMountainsEx(cfg) {
    var o = makeCanvas(960, 270), ctx = o.x;
    for (var i = 0; i < cfg.ridges.length; i++) {
      var r = cfg.ridges[i];
      drawRidge(ctx, 960, r.y, r.amp, r.fill, r.rim, r.seed, r.k1 || 3, r.k2 || 5, r.k3 || 8);
    }
    if (cfg.snowCap) {
      /* 山脊上的积雪：沿着第一道山脊画白边 */
      var rng = mulberry32(cfg.seed || 5);
      for (var x = 0; x < 960; x++) {
        var u = x / 960 * Math.PI * 2;
        var r0 = cfg.ridges[0];
        var h = r0.y - (Math.sin(u * (r0.k1 || 3) + 1.2) * 0.55 +
                        Math.sin(u * (r0.k2 || 5) + 2.4) * 0.30 +
                        Math.sin(u * (r0.k3 || 8) + 0.7) * 0.15) * r0.amp;
        if (rng() < 0.55) R(ctx, x, Math.round(h) + 1, 1, 2 + Math.floor(rng() * 3), cfg.snowCap);
      }
    }
    return o.c;
  }

  /* 前景：头顶的枝叶剪影 */
  function bakeForeEx(cfg) {
    var o = makeCanvas(960, 270), ctx = o.x;
    var rng = mulberry32(cfg.seed || 606);
    for (var i = 0; i < cfg.branches; i++) {
      var bx = rng() * 960;
      var by = -6 + rng() * 16;
      var dir = rng() < 0.5 ? -1 : 1;
      var len = 70 + rng() * 130;
      line(ctx, bx, by, bx + dir * len, by + 8 + rng() * 16, cfg.branch, 2);
      for (var k = 0; k < cfg.leaves; k++) {
        var t = 0.25 + rng() * 0.75;
        var lx = bx + dir * len * t;
        var ly = by + (8 + rng() * 16) * t + (rng() - 0.5) * 8;
        if (cfg.leafKind === 'pine') {
          for (var n = 0; n < 3; n++) {
            line(ctx, lx, ly, lx + (rng() - 0.5) * 14, ly + 4 + rng() * 6, cfg.leaf, 1);
          }
          if (rng() < 0.6) PX(ctx, lx, ly - 1, cfg.snow || cfg.leaf);
        } else {
          leafPx(ctx, lx, ly, rng() * 6.283, 6 + rng() * 7, cfg.leaf, cfg.leafDark);
        }
      }
    }
    return o.c;
  }


  /* ---------------- 地面 / 道具：枫林与雪岭 ---------------- */

  function drawLantern(ctx, x, y, s) {
    var w = 10 * s;
    R(ctx, x - w / 2 - 2, y - 3 * s, w + 4, 3 * s, '#2b3d33');
    R(ctx, x - w / 2 - 2, y - 3 * s, w + 4, 1, '#3d5445');
    R(ctx, x - 1, y - 14 * s, 3, 11 * s, '#33463a');
    R(ctx, x - 1, y - 14 * s, 1, 11 * s, '#45604e');
    R(ctx, x - 5, y - 21 * s, 11, 8 * s, '#2b3d33');
    R(ctx, x - 4, y - 20 * s, 9, 6 * s, '#ffd98a');
    R(ctx, x - 3, y - 19 * s, 7, 4 * s, '#fff3c4');
    R(ctx, x - 1, y - 20 * s, 1, 6, '#2b3d33');
    R(ctx, x - 7, y - 24 * s, 15, 3, '#2b3d33');
    R(ctx, x - 8, y - 24 * s, 17, 1, '#3d5445');
    R(ctx, x - 1, y - 27 * s, 2, 3, '#2b3d33');
    ditherDisc(ctx, x, y - 18 * s, 11 * s, '#ffe6a0', 0.16, 5);
  }

  function bakeGround2() {
    var o = makeCanvas(960, 270), ctx = o.x;
    for (var hx = 0; hx < 960; hx++) {
      var hy = 195 + Math.round(Math.sin(hx * 0.05) * 3 + Math.sin(hx * 0.12 + 1.1) * 2);
      R(ctx, hx, hy, 1, 226 - hy, '#241820');
      PX(ctx, hx, hy, '#3a2630');
    }
    var brng = mulberry32(5151);
    for (var bi = 0; bi < 40; bi++) {
      var bx = brng() * 960, by = 196 + brng() * 6, br = 3 + brng() * 6;
      disc(ctx, bx, by, br, '#241820');
      for (var ba = -1.2; ba < 0.2; ba += 0.25) {
        PX(ctx, bx + Math.cos(ba) * br, by + Math.sin(ba) * br, '#38242c');
      }
    }
    R(ctx, 0, 218, 960, 52, '#1e1418');
    for (var i = 0; i < 960; i += 2) {
      var h = 2 + ((i * 7919) % 4);
      R(ctx, i, 218, 2, h, '#2e2026');
      if (i % 9 === 0) R(ctx, i, 214, 1, 6, '#402c30');
    }
    for (var row = 0; row < 2; row++) {
      var y = 230 + row * 15, off = (row % 2) * 26;
      for (var sx = -60; sx < 1020; sx += 56) {
        var w = 48 + ((sx * 13 + row * 7) % 10);
        R(ctx, sx + off, y, w, 13, row === 0 ? '#3a2c30' : '#302428');
        R(ctx, sx + off, y, w, 1, '#513a3c');
        R(ctx, sx + off, y + 12, w, 1, '#241a1e');
      }
    }
    var rng = mulberry32(8801);
    for (var l = 0; l < 130; l++) {
      var lx = rng() * 960, ly = 222 + rng() * 42;
      var c = rng() < 0.5 ? '#a8442e' : (rng() < 0.5 ? '#c9663a' : '#7a2e28');
      R(ctx, lx, ly, 2, 1, c);
      PX(ctx, lx + 2, ly + 1, '#5a241e');
    }
    R(ctx, 0, 258, 960, 12, '#140c10');
    return o.c;
  }

  function bakeGround3() {
    var o = makeCanvas(960, 270), ctx = o.x;
    for (var hx = 0; hx < 960; hx++) {
      var hy = 193 + Math.round(Math.sin(hx * 0.04) * 4 + Math.sin(hx * 0.09 + 0.6) * 2);
      R(ctx, hx, hy, 1, 226 - hy, '#1a2a3c');
      PX(ctx, hx, hy, '#33506a');
    }
    R(ctx, 0, 218, 960, 52, '#8fb0c8');
    R(ctx, 0, 218, 960, 3, '#cfe4f2');
    var rng = mulberry32(9911);
    for (var i = 0; i < 240; i++) {
      var x = rng() * 960, y = 220 + rng() * 44;
      var c = rng() < 0.4 ? '#7d9fb8' : (rng() < 0.5 ? '#c2dced' : '#95b6cc');
      R(ctx, x, y, 2 + Math.floor(rng() * 3), 1, c);
    }
    for (var r2 = 0; r2 < 14; r2++) {
      var rx = rng() * 960, ry = 226 + rng() * 24, rw = 4 + rng() * 8;
      disc(ctx, rx, ry, rw, '#3d4e5e');
      disc(ctx, rx - 1, ry - 2, rw * 0.7, '#4d6272');
      R(ctx, rx - rw * 0.8, ry - rw * 0.8, rw * 1.6, 2, '#e8f4fc');
    }
    for (var g = 0; g < 44; g++) {
      var gx = rng() * 960, gy = 236 + rng() * 30;
      R(ctx, gx, gy, 3 + rng() * 6, 1, '#cfe6f6');
    }
    R(ctx, 0, 258, 960, 12, '#0e1a26');
    return o.c;
  }

  function bakeProps2() {
    var o = makeCanvas(960, 270), ctx = o.x;
    drawLantern(ctx, 96, 222, 1);
    drawLantern(ctx, 438, 222, 1);
    drawLantern(ctx, 792, 222, 0.85);
    var rng = mulberry32(7712);
    for (var i = 0; i < 26; i++) {
      var x = rng() * 960, y = 216 + rng() * 8;
      disc(ctx, x, y, 2 + rng() * 3, '#3a2028');
      for (var k = 0; k < 3; k++) PX(ctx, x + (rng() - 0.5) * 6, y - 1 - rng() * 2, '#a8442e');
    }
    for (var s = 0; s < 3; s++) {
      var sx = 220 + s * 320;
      R(ctx, sx - 5, 208, 11, 4, '#3a2c30');
      R(ctx, sx - 3, 196, 7, 13, '#463438');
      R(ctx, sx - 6, 190, 13, 7, '#3a2c30');
      R(ctx, sx - 4, 192, 9, 4, '#ffd08a');
      R(ctx, sx - 7, 188, 15, 2, '#4e3a3e');
      ditherDisc(ctx, sx, 194, 9, '#ffd9a0', 0.14, 5);
    }
    return o.c;
  }

  function bakeProps3() {
    var o = makeCanvas(960, 270), ctx = o.x;
    var rng = mulberry32(3311);
    for (var i = 0; i < 26; i++) {
      var x = rng() * 960, y = 214 + rng() * 10;
      disc(ctx, x, y, 3 + rng() * 5, '#cfe4f2');
      R(ctx, x - 5, y - 1, 10, 2, '#e8f4fc');
    }
    for (var c = 0; c < 12; c++) {
      var cx = rng() * 960, cy = 220 + rng() * 6;
      for (var s = 0; s < 3; s++) {
        var h = 5 + rng() * 9;
        var dx = (rng() - 0.5) * 6;
        line(ctx, cx + dx, cy, cx + dx * 0.4, cy - h, '#9fd8f0', 1);
        PX(ctx, cx + dx * 0.4, cy - h, '#e8faff');
      }
    }
    drawLantern(ctx, 470, 222, 0.9);
    return o.c;
  }

  /* ---------------- 三个世界的图层组 ---------------- */

  var WORLDS = {};

  function bakeWorld1() {
    return {
      sky: bakeSky(), mountains: bakeMountains(),
      far: bakeBamboo(101, 28, ['#4f7c72', '#5d8a80', '#8ab5a4'], 2, 4, 0.85, 0.5, null, 0.04),
      mid: bakeBamboo(202, 22, ['#2b544c', '#37675c', '#629586'], 3, 6, 1.05, 0.75, [140, 410], 0.05),
      near: bakeBamboo(303, 9, ['#17332d', '#1f4038', '#3d6f60'], 7, 10, 1.35, 0.9, [110, 440], 0.06),
      shafts: bakeShafts(), warm: bakeWarm(),
      props: bakeProps(), ground: bakeGround(), fore: bakeForeground(),
      mist: bakeMist(), vig: bakeVignette()
    };
  }

  function bakeWorld2() {
    var far = {
      trunk: '#6a4048', trunkDark: '#553038', leafDark: '#7a3c42', leaf: '#8e4a44',
      h: 76, trunkW: 2, canopy: 0.26, clusters: 3, flat: true
    };
    var mid = {
      trunk: '#4a2a32', trunkDark: '#2e1a20', leafDark: '#6a2a30', leaf: '#a83a32', leafHi: '#c8563a',
      h: 116, trunkW: 3, canopy: 0.24, clusters: 4
    };
    var near = {
      trunk: '#2e1a22', trunkDark: '#1a0e14', leafDark: '#48181e', leaf: '#78282a', leafHi: '#a04430',
      h: 172, trunkW: 5, canopy: 0.22, clusters: 5
    };
    return {
      sky: bakeSkyEx({
        seed: 21, cloud: '#c07a62', cloud2: '#e0a878', cloudN: 5, horizon: '#f0c890',
        stops: [
          [0.00, '#241a36'], [0.26, '#33203e'], [0.44, '#4e2a48'], [0.56, '#7a3a4c'],
          [0.66, '#a84c4a'], [0.74, '#cc6a48'], [0.84, '#e89454'], [1.00, '#ffc884']
        ],
        orb: { x: 372, y: 168, rings: [[28, '#c9704a'], [21, '#e8945c'], [15, '#f8b878'], [10, '#ffe0a8'], [6, '#fff4d8']] }
      }),
      mountains: bakeMountainsEx({
        ridges: [
          { y: 188, amp: 32, fill: '#5a3648', rim: '#b87a62', seed: 1234 },
          { y: 202, amp: 22, fill: '#3e2636', rim: '#7e5052', seed: 5678 },
          { y: 213, amp: 13, fill: '#281824', rim: '#523440', seed: 9012 }
        ]
      }),
      far: bakeMapleForest(1201, 20, far, 222),
      mid: bakeMapleForest(1302, 12, mid, 224, [90, 400]),
      near: bakeMapleForest(1403, 8, near, 226),
      shafts: bakeShaftsEx('#ffcf9a', 0.10),
      warm: bakeWarmEx(372, 168, 165, [255, 200, 140], 54),
      props: bakeProps2(), ground: bakeGround2(),
      fore: bakeForeEx({ seed: 616, branches: 8, leaves: 8, leaf: '#5e2026', leafDark: '#38121a', branch: '#150c10', leafKind: 'leaf' }),
      mist: bakeMistEx('#f0c79c'), vig: bakeVigEx(12, 4, 8),
      shaftK: 0.45, warmK: 0.95, mistK: 1.0
    };
  }

  function bakeWorld3() {
    var far = { trunk: '#2a4058', trunkDark: '#1c2c40', bough: '#33506a', snow: '#bcd4e6', h: 54 };
    var mid = { trunk: '#1c2c40', trunkDark: '#101a28', bough: '#233c56', snow: '#d0e4f4', h: 86 };
    var near = { trunk: '#0c1622', trunkDark: '#070d16', bough: '#132234', snow: '#b0cce4', h: 118 };
    return {
      sky: bakeSkyEx({
        seed: 33, stars: 150, cloud: '#1e3450', cloud2: '#28425e', cloudN: 3,
        stops: [
          [0.00, '#060b18'], [0.28, '#0a1428'], [0.48, '#102038'], [0.62, '#172c46'],
          [0.74, '#203c58'], [0.86, '#2e5470'], [1.00, '#4a7590']
        ],
        orb: { x: 372, y: 60, rings: [[26, '#7e9ec4'], [20, '#a8c4e0'], [14, '#d2e4f4'], [9, '#f2faff'], [5, '#ffffff']] }
      }),
      mountains: bakeMountainsEx({
        seed: 55, snowCap: '#d2e8f8',
        ridges: [
          { y: 186, amp: 36, fill: '#22344e', rim: '#7f9cbc', seed: 1234 },
          { y: 202, amp: 24, fill: '#18263c', rim: '#4e6a88', seed: 5678 },
          { y: 213, amp: 14, fill: '#0e1826', rim: '#2e4a64', seed: 9012 }
        ]
      }),
      far: bakePineForest(2201, 16, far, 222),
      mid: bakePineForest(2302, 10, mid, 224, [100, 400]),
      near: bakePineForest(2403, 6, near, 226),
      shafts: bakeShaftsEx('#cfe6ff', 0.09),
      warm: bakeWarmEx(372, 60, 150, [150, 186, 232], 52),
      props: bakeProps3(), ground: bakeGround3(),
      fore: bakeForeEx({ seed: 717, branches: 7, leaves: 6, leaf: '#132234', branch: '#070d16', leafKind: 'pine', snow: '#cfe4f2' }),
      mist: bakeMistEx('#3e6a88'), vig: bakeVigEx(4, 8, 18),
      shaftK: 0.7, warmK: 0.85, mistK: 0.5
    };
  }

  var L = null;

  /* ================= 4-20 关主题：换配色 / 换树种 / 换地面 ================= */

  function mixHex(a, b, k) {
    var A = hex2rgb(a), B = hex2rgb(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * k) + ',' +
      Math.round(A[1] + (B[1] - A[1]) * k) + ',' +
      Math.round(A[2] + (B[2] - A[2]) * k) + ')';
  }

  function bakeGroundTheme(cfg) {
    var o = makeCanvas(960, 270), ctx = o.x;
    var rng = mulberry32(cfg.seed || 99);
    var top = cfg.gy || 202;
    for (var y = top; y < 270; y++) {
      var u = (y - top) / (270 - top);
      R(ctx, 0, y, 960, 1, mixHex(cfg.g1, cfg.g2, Math.min(1, u * 1.15)));
    }
    /* 地面横纹 */
    for (var i = 0; i < 40; i++) {
      var yy = top + 2 + rng() * (266 - top);
      var xx = rng() * 960;
      R(ctx, xx, yy, 6 + rng() * 26, 1, 'rgba(0,0,0,0.10)');
    }
    /* 碎石 / 草簇 */
    for (var k = 0; k < 60; k++) {
      var sx = rng() * 960, sy = top + 4 + rng() * (262 - top);
      var t2 = rng();
      if (t2 < 0.55) {
        R(ctx, sx, sy, 2 + rng() * 3, 1, cfg.g3 || cfg.g2);
        PX(ctx, sx, sy - 1, cfg.g3 || cfg.g2);
      } else {
        R(ctx, sx, sy - 2, 1, 3, cfg.tuft || cfg.g3 || cfg.g2);
        PX(ctx, sx + 1, sy - 3, cfg.tuft || cfg.g3 || cfg.g2);
      }
    }
    return o.c;
  }

  /* ================= Arcade 专用背景：五张地图各自有明确的像素场景 ================= */

  function arcadeCloud(ctx, x, y, c1, c2, s) {
    s = s || 1;
    R(ctx, x - 18 * s, y, 36 * s, 5 * s, c1);
    R(ctx, x - 12 * s, y - 4 * s, 24 * s, 6 * s, c1);
    R(ctx, x - 5 * s, y - 8 * s, 12 * s, 8 * s, c2 || c1);
    R(ctx, x + 7 * s, y - 5 * s, 10 * s, 5 * s, c2 || c1);
    R(ctx, x - 14 * s, y + 5 * s, 28 * s, 2 * s, c2 || c1);
  }

  function arcadeCrystal(ctx, x, y, h, c1, c2, flip) {
    var d = flip ? -1 : 1;
    h = Math.max(6, h | 0);
    R(ctx, x, y - h, 3, h, c1);
    R(ctx, x + d * 3, y - h + 4, 3, h - 4, c2 || c1);
    R(ctx, x + d * 6, y - h + 8, 2, h - 8, c1);
    PX(ctx, x + d * 1, y - h - 1, '#ffffff');
  }

  function arcadePyramid(ctx, x, baseY, w, h, dark, mid, hi) {
    for (var yy = 0; yy < h; yy++) {
      var half = Math.round((yy / h) * (w / 2));
      var left = Math.round(x - w / 2 + half);
      var width = Math.max(1, Math.round(w - half * 2));
      R(ctx, left, baseY - h + yy, width, 1, yy < h * 0.2 ? hi : (yy % 4 ? mid : dark));
    }
    for (var step = 0; step < 5; step++) {
      var sy = baseY - 8 - step * 7;
      R(ctx, x - w / 2 + step * 5, sy, w - step * 10, 1, dark);
    }
  }

  function drawArcadeOrb(ctx, orb) {
    if (!orb || !ctx) return;
    function disk(cx, cy, r, color) {
      for (var yy = -r; yy <= r; yy++) {
        var hw = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy)));
        R(ctx, cx - hw, cy + yy, hw * 2 + 1, 1, color);
      }
    }
    var rings = orb.rings || [];
    for (var i = 0; i < rings.length; i++) disk(Math.round(orb.x), Math.round(orb.y), Math.round(rings[i][0]), rings[i][1]);
    var r0 = rings.length ? Math.round(rings[0][0]) : 18;
    for (var ray = 0; ray < 8; ray++) {
      var a = ray * Math.PI / 4, x0 = orb.x + Math.cos(a) * (r0 + 2), y0 = orb.y + Math.sin(a) * (r0 + 2);
      PX(ctx, x0, y0, rings[0] ? rings[0][1] : '#fff0a0');
      if (ray % 2 === 0) PX(ctx, x0 + Math.cos(a), y0 + Math.sin(a), rings[0] ? rings[0][1] : '#fff0a0');
    }
    R(ctx, orb.x - 2, orb.y - 1, 5, 1, '#ffffff');
  }

  function arcadeArch(ctx, cx, baseY, w, h, frame, face, edge, inside) {
    for (var yy = 0; yy < h; yy++) {
      var curve = Math.sin((yy / Math.max(1, h - 1)) * Math.PI / 2);
      var half = Math.round(w * (0.22 + 0.28 * curve));
      R(ctx, cx - half - 3, baseY - h + yy, half * 2 + 6, 1, frame);
      R(ctx, cx - half, baseY - h + yy, half * 2, 1, face);
      if (half > 8) {
        R(ctx, cx - half + 3, baseY - h + yy, 2, 1, edge);
        R(ctx, cx + half - 5, baseY - h + yy, 2, 1, edge);
      }
      if (yy > 12 && yy < h - 2) {
        var gap = Math.max(3, Math.round(half * 0.38));
        R(ctx, cx - gap, baseY - h + yy, gap * 2, 1, inside);
      }
    }
    R(ctx, cx - w * 0.22 - 4, baseY - 3, w * 0.44 + 8, 3, frame);
    R(ctx, cx - w * 0.22 - 1, baseY - 2, w * 0.44 + 2, 1, edge);
  }

  function arcadePixelPoly(ctx, pts, fill, outline, thickness) {
    var minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var xs = [], scan = y + 0.5;
      for (var j = 0; j < pts.length; j++) {
        var a = pts[j], b = pts[(j + 1) % pts.length];
        if ((a[1] <= scan && b[1] > scan) || (b[1] <= scan && a[1] > scan)) xs.push(a[0] + (scan - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort(function (a, b) { return a - b; });
      for (var k = 0; k + 1 < xs.length; k += 2) {
        var left = Math.ceil(xs[k] - 0.5), right = Math.floor(xs[k + 1] - 0.5);
        if (right >= left) R(ctx, left, y, right - left + 1, 1, fill);
      }
    }
    if (outline) for (var n = 0; n < pts.length; n++) {
      var p0 = pts[n], p1 = pts[(n + 1) % pts.length];
      line(ctx, p0[0], p0[1], p1[0], p1[1], outline, thickness || 2);
    }
  }

  function drawArcadeLandmark(scene, mx, fx, md, px, gx, sky) {
    if (scene === 'candy') {
      arcadeArch(fx, 205, 138, 76, '#71355c', '#e75e9b', '#ffd48a', '#332443');
      R(fx, 174, 196, 132, 4, '#472747'); R(fx, 185, 154, 4, 48, '#ffe19a'); R(fx, 291, 154, 4, 48, '#ffe19a');
      for (var c = 0; c < 9; c++) { PX(fx, 190 + c * 12, 140 + (c % 2) * 3, c % 3 ? '#fff0c2' : '#ff9ec9'); }
      R(fx, 215, 159, 50, 37, '#ffd48a'); R(fx, 219, 161, 42, 35, '#a63878');
      R(fx, 223, 165, 34, 29, '#59254f'); R(fx, 228, 168, 24, 25, '#7d316e');
      R(fx, 233, 170, 14, 21, '#cf5590'); R(fx, 237, 172, 6, 17, '#f38db5');
      for (var cp = 0; cp < 5; cp++) R(fx, 225 + cp * 7, 179 + (cp % 2) * 3, 3, 2, cp % 2 ? '#ffe5a0' : '#fff0df');
      for (var cb = 0; cb < 6; cb++) R(md, 178 + cb * 24, 214 - (cb % 2) * 3, 10, 2, cb % 2 ? '#fff0bb' : '#ff81ad');
    } else if (scene === 'school') {
      arcadePixelPoly(fx, [[115, 154], [142, 119], [292, 119], [319, 154]], '#4b3c43', '#2a292f', 2);
      R(fx, 124, 151, 186, 52, '#8c563c'); R(fx, 130, 157, 174, 41, '#e6bf76');
      R(fx, 145, 165, 28, 24, '#345860'); R(fx, 184, 165, 28, 24, '#345860');
      R(fx, 223, 165, 28, 24, '#345860'); R(fx, 262, 165, 28, 24, '#345860');
      for (var w = 0; w < 4; w++) { R(fx, 157 + w * 39, 164, 2, 26, '#ffe9a4'); R(fx, 144 + w * 39, 176, 28, 2, '#ffe9a4'); }
      R(fx, 219, 178, 22, 25, '#5a382d'); R(fx, 220, 180, 20, 22, '#302833');
      disc(fx, 220, 139, 10, '#5a3d38'); disc(fx, 220, 139, 7, '#e8d08b');
      R(fx, 219, 133, 2, 6, '#46352e'); R(fx, 220, 138, 5, 2, '#46352e');
      for (var flag = 0; flag < 7; flag++) arcadePixelPoly(md, [[170 + flag * 17, 125], [180 + flag * 17, 128], [170 + flag * 17, 137]], flag % 2 ? '#f4d57c' : '#d96d64', null);
    } else if (scene === 'winter') {
      arcadePixelPoly(fx, [[125, 156], [154, 128], [286, 128], [315, 156]], '#537488', '#2d4b61', 2);
      R(fx, 134, 151, 172, 53, '#b4d4e2'); R(fx, 140, 157, 160, 40, '#547890');
      for (var wi = 0; wi < 4; wi++) { R(fx, 151 + wi * 39, 163, 25, 21, '#f3d79d'); R(fx, 153 + wi * 39, 165, 21, 17, '#42677f'); R(fx, 163 + wi * 39, 163, 2, 21, '#cbe8f1'); }
      R(fx, 212, 176, 24, 28, '#304c60'); R(fx, 219, 183, 10, 21, '#e8b967');
      arcadePixelPoly(fx, [[130, 153], [154, 131], [285, 131], [309, 153]], '#edf8fb', '#ffffff', 1);
      for (var snow = 0; snow < 14; snow++) PX(fx, 142 + snow * 12, 151 + (snow % 3), '#ffffff');
    } else if (scene === 'ice') {
      arcadeArch(fx, 266, 208, 164, 101, '#17395d', '#286d88', '#80e9ed', '#101d3c');
      for (var ic = 0; ic < 9; ic++) {
        var ix = 196 + ic * 17, iy = 194 - (ic % 3) * 5;
        arcadePixelPoly(fx, [[ix - 5, iy], [ix, iy - 20 - (ic % 3) * 5], [ix + 5, iy]], ic % 2 ? '#4ba8c2' : '#83e1e6', '#1e5b78', 1);
        R(fx, ix - 1, iy - 16, 1, 11, '#d5ffff');
      }
      for (var au = 0; au < 4; au++) {
        var ax = au * 19;
        for (var ay = 0; ay < 27; ay++) {
          if ((ay + au) % 3 !== 1) R(sky, ax + Math.floor(ay * 0.46), 52 + ay, 3, 1, au % 2 ? '#55d5c4' : '#6783d0');
        }
      }
      for (var run = 0; run < 28; run++) PX(sky, 82 + run * 10, 77 + Math.round(Math.sin(run * 0.19) * 3), run % 3 ? '#42b8b9' : '#b0f4ed');
    } else {
      arcadePixelPoly(fx, [[122, 196], [134, 149], [150, 149], [160, 196]], '#c38b42', '#684026', 2);
      R(fx, 129, 156, 26, 7, '#e4b45e'); R(fx, 136, 153, 12, 3, '#f5d88c');
      arcadePixelPoly(fx, [[172, 197], [184, 128], [199, 128], [211, 197]], '#b87b3a', '#63402d', 2);
      R(fx, 181, 145, 20, 7, '#dda851'); R(fx, 187, 141, 8, 4, '#f6d77d');
      R(fx, 215, 174, 126, 29, '#8e512d'); R(fx, 221, 164, 114, 10, '#d19449');
      for (var co = 0; co < 5; co++) { var xx = 228 + co * 24; R(fx, xx, 169, 7, 30, '#f0c16a'); R(fx, xx + 2, 170, 2, 26, '#ffe2a0'); }
      R(fx, 220, 201, 118, 4, '#54352b');
      for (var tile = 0; tile < 32; tile++) PX(gx, 170 + tile * 19, 238 + (tile % 2) * 5, tile % 3 ? '#f4ce7a' : '#ac693b');
    }
  }

  function bakeArcadeWorld(cfg) {
    var scene = cfg.arcade;
    var sky = bakeSkyEx({
      seed: cfg.seed || 5, stars: cfg.stars || 0,
      cloud: null, cloud2: null, cloudN: 0, horizon: null,
      stops: cfg.stops, orb: null, smooth: true
    });
    drawArcadeOrb(sky.getContext('2d'), cfg.orb);

    var mountains = makeCanvas(960, 270), far = makeCanvas(960, 270);
    var mid = makeCanvas(960, 270), near = makeCanvas(960, 270);
    var props = makeCanvas(960, 270), ground = makeCanvas(960, 270);
    var fore = makeCanvas(960, 270), rng = mulberry32((cfg.seed || 5) * 97 + 13);
    var mx = mountains.x, fx = far.x, md = mid.x, nx = near.x, px = props.x, gx = ground.x, ox = fore.x;
    var edge = cfg.t0, deep = cfg.t1, base = cfg.t2, hi = cfg.t3;

    if (scene === 'candy') {
      drawRidge(mx, 960, 188, 28, cfg.m0, cfg.m1, 2211, 2, 4, 7);
      drawRidge(mx, 960, 210, 18, cfg.m1, cfg.m2, 2212, 3, 5, 8);
      for (var c0 = 0; c0 < 6; c0++) arcadeCloud(mx, 90 + c0 * 170, 78 + (c0 % 2) * 24, cfg.cloud, cfg.cloud2, 0.9);
      for (var c1 = 0; c1 < 10; c1++) {
        var cx1 = c1 * 105 + 20, cy1 = 182 + (c1 % 3) * 5;
        R(fx, cx1 - 2, cy1 - 42, 4, 42, deep);
        disc(fx, cx1, cy1 - 48, 14 + (c1 % 2) * 3, c1 % 2 ? '#ff8ab0' : '#ffd06a');
        disc(fx, cx1, cy1 - 48, 9, c1 % 2 ? '#ffd0e8' : '#fff0b0');
      }
      for (var c2 = 0; c2 < 7; c2++) {
        var cx2 = 40 + c2 * 155, cy2 = 214 - (c2 % 2) * 8;
        R(md, cx2 - 2, cy2 - 42, 4, 42, '#9a5a72');
        R(md, cx2 - 15, cy2 - 52, 30, 10, '#ff7aa8');
        R(md, cx2 - 11, cy2 - 56, 22, 5, '#ffc0d8');
        R(md, cx2 - 8, cy2 - 61, 16, 5, '#fff0f8');
      }
      for (var c3 = 0; c3 < 8; c3++) {
        var bx = 28 + c3 * 128, by = 229 - (c3 % 2) * 3;
        R(px, bx - 11, by - 12, 22, 12, '#d87aa0');
        R(px, bx - 8, by - 17, 16, 6, '#ffe0ee');
        R(px, bx - 3, by - 21, 6, 5, '#fff8fc');
        R(px, bx - 14, by - 9, 28, 2, '#8e4d6c');
      }
      for (var c4 = 0; c4 < 10; c4++) {
        R(gx, c4 * 104, 204, 104, 66, c4 % 2 ? '#f3c89c' : '#f7d7b4');
        R(gx, c4 * 104, 204, 104, 2, '#c77b79');
        for (var cc = 0; cc < 3; cc++) R(gx, c4 * 104 + cc * 35 + 7, 214 + (c4 % 2) * 5, 14, 2, '#e6a37f');
      }
      R(ox, 0, 0, 18, 270, '#9e5d83'); R(ox, 942, 0, 18, 270, '#9e5d83');
      for (var c5 = 0; c5 < 7; c5++) arcadeCloud(ox, 44 + c5 * 150, 10 + (c5 % 2) * 6, '#fff0f8', '#ffd0e8', 0.5);
    } else if (scene === 'school') {
      drawRidge(mx, 960, 202, 18, cfg.m0, cfg.m1, 2221, 2, 3, 5);
      R(mx, 102, 112, 220, 82, '#315646');
      R(mx, 110, 120, 204, 66, '#203f36');
      R(mx, 110, 120, 204, 2, '#9f7b4d');
      R(mx, 110, 184, 204, 2, '#9f7b4d');
      for (var li = 0; li < 12; li++) R(mx, 132 + li * 15, 140 + (li % 3) * 7, 7 + (li % 2) * 3, 2, '#b8d58d');
      for (var sh = 0; sh < 4; sh++) {
        var sx2 = 550 + sh * 92;
        R(fx, sx2, 132, 66, 76, '#6e4c38');
        R(fx, sx2 + 5, 138, 56, 2, '#c38e5a');
        for (var bk = 0; bk < 4; bk++) R(fx, sx2 + 8 + bk * 12, 148 + (bk % 2) * 30, 8, 24, bk % 2 ? '#d77858' : '#7ba6a2');
      }
      for (var md2 = 0; md2 < 5; md2++) {
        var dx = 38 + md2 * 196;
        R(md, dx, 180, 108, 36, '#9b7045');
        R(md, dx + 8, 172, 92, 10, '#d4a66a');
        R(md, dx + 18, 187, 72, 2, '#704b37');
        R(md, dx + 30, 199, 4, 11, '#6a4a38');
        R(md, dx + 74, 199, 4, 11, '#6a4a38');
      }
      for (var sp = 0; sp < 6; sp++) {
        var bx2 = 84 + sp * 165;
        R(px, bx2 - 14, 219, 28, 2, '#d8b272');
        R(px, bx2 - 2, 197, 4, 22, '#a46a48');
        R(px, bx2 - 10, 190, 20, 7, '#e8d3a2');
        R(px, bx2 - 7, 192, 14, 2, '#7b9f78');
      }
      for (var tx = 0; tx < 10; tx++) R(gx, tx * 96, 202, 96, 68, tx % 2 ? '#c8a878' : '#d8bc8e');
      for (var ty = 0; ty < 3; ty++) for (var tx2 = 0; tx2 < 10; tx2++) R(gx, tx2 * 96 + (ty % 2) * 8, 210 + ty * 18, 3, 2, '#9b785b');
      R(ox, 0, 0, 16, 270, '#5f463f'); R(ox, 944, 0, 16, 270, '#5f463f');
      for (var bb = 0; bb < 5; bb++) { R(ox, 22 + bb * 190, 12, 42, 4, '#b27858'); R(ox, 30 + bb * 190, 16, 26, 2, '#f0d198'); }
    } else if (scene === 'winter') {
      drawRidge(mx, 960, 190, 38, '#83a8be', '#f5fbff', 2331, 2, 4, 7);
      drawRidge(mx, 960, 210, 24, '#6a8e9d', '#dceff8', 2332, 3, 5, 8);
      for (var pn = 0; pn < 12; pn++) {
        var pnx = 25 + pn * 88, pnh = 38 + (pn % 3) * 14;
        drawPine(fx, pnx, 218, pnh, { trunk: '#456474', trunkDark: '#304d5c', bough: '#6d9a9d', snow: '#dceff8' }, rng);
      }
      for (var sn = 0; sn < 8; sn++) {
        var sx3 = 20 + sn * 132, sy3 = 220 - (sn % 2) * 7;
        R(md, sx3 - 12, sy3 - 18, 24, 18, '#d7ebf5');
        R(md, sx3 - 15, sy3 - 5, 30, 5, '#9ec6d5');
        R(md, sx3 - 8, sy3 - 23, 16, 5, '#f7fdff');
        R(md, sx3 - 4, sy3 - 1, 8, 3, '#6b8a96');
      }
      for (var fl = 0; fl < 20; fl++) {
        var fx2 = 20 + fl * 47, fy2 = 176 + (fl % 4) * 9;
        R(px, fx2, fy2, 2, 7, '#e9f8ff'); R(px, fx2 + 3, fy2 + 3, 2, 4, '#b9dbe8');
      }
      for (var sg = 0; sg < 10; sg++) R(gx, sg * 96, 201, 96, 69, sg % 2 ? '#e8f5fb' : '#d8edf6');
      for (var sline = 0; sline < 3; sline++) R(gx, 0, 218 + sline * 16, 960, 2, '#b6d6e3');
      R(ox, 0, 0, 12, 270, '#597c8a'); R(ox, 948, 0, 12, 270, '#597c8a');
      for (var sf = 0; sf < 10; sf++) R(ox, 24 + sf * 96, 11 + (sf % 3) * 8, 2, 2, '#ffffff');
    } else if (scene === 'ice') {
      drawRidge(mx, 960, 205, 30, '#315a78', '#6ac0d8', 2441, 2, 3, 6);
      for (var ic = 0; ic < 14; ic++) {
        var icx = 20 + ic * 72, ich = 22 + (ic % 4) * 9;
        arcadeCrystal(fx, icx, 207, ich, '#316b8a', '#71cbe2', ic % 2);
      }
      for (var ic2 = 0; ic2 < 10; ic2++) {
        var ix = 36 + ic2 * 104, ih = 30 + (ic2 % 3) * 11;
        arcadeCrystal(md, ix, 220, ih, '#4c9eb8', '#a9e8f5', ic2 % 2);
        arcadeCrystal(md, ix + 10, 220, Math.max(12, ih - 12), '#2e6e8f', '#7dd7e8', !(ic2 % 2));
      }
      for (var ig = 0; ig < 12; ig++) R(gx, ig * 80, 204, 80, 66, ig % 2 ? '#15394f' : '#1b4660');
      for (var gl = 0; gl < 5; gl++) { R(gx, 0, 224 + gl * 9, 960, 1, '#2e6b80'); }
      for (var it = 0; it < 9; it++) {
        var itx = 28 + it * 118;
        arcadeCrystal(px, itx, 226, 16 + (it % 3) * 6, '#76d8e8', '#d6fbff', it % 2);
      }
      for (var ct = 0; ct < 8; ct++) {
        var cx3 = 24 + ct * 138;
        arcadeCrystal(ox, cx3, 64, 18 + (ct % 3) * 8, '#28536f', '#70cbe2', ct % 2);
        arcadeCrystal(ox, cx3 + 30, 12, 12 + (ct % 2) * 8, '#3a7590', '#8fe3f0', !(ct % 2));
      }
    } else {
      drawRidge(mx, 960, 204, 26, '#d49b54', '#f4d38b', 2551, 2, 4, 7);
      drawRidge(mx, 960, 218, 14, '#bd7f42', '#e8b66a', 2552, 3, 5, 8);
      arcadePyramid(fx, 220, 100, 64, '#8e5c2f', '#c08a45', '#f5d58d');
      arcadePyramid(fx, 223, 780, 82, '#8e5c2f', '#c08a45', '#f5d58d');
      for (var ds = 0; ds < 6; ds++) {
        var dx2 = 72 + ds * 180, dh = 24 + (ds % 3) * 9;
        R(md, dx2, 222 - dh, 6, dh, '#6e8b47');
        R(md, dx2 - 7, 210 - dh, 20, 7, '#7da34f');
        R(md, dx2 - 11, 217 - dh, 9, 5, '#7da34f');
        R(md, dx2 + 8, 217 - dh + 4, 9, 5, '#7da34f');
      }
      for (var dd = 0; dd < 8; dd++) {
        var dxx = 35 + dd * 125;
        R(px, dxx, 218, 28, 3, '#d3a25f'); R(px, dxx + 9, 214, 8, 4, '#f4d28b');
        R(px, dxx + 34, 225, 3, 3, '#9b6736');
      }
      for (var dg = 0; dg < 10; dg++) R(gx, dg * 96, 202, 96, 68, dg % 2 ? '#d39b57' : '#e0ad68');
      for (var dl = 0; dl < 4; dl++) R(gx, 0, 216 + dl * 14, 960, 2, '#b87b43');
      for (var df = 0; df < 5; df++) {
        var dfx = 30 + df * 220;
        R(ox, dfx, 0, 3, 54, '#8a5a32');
        R(ox, dfx - 12, 47, 28, 5, '#b5793e');
        R(ox, dfx - 19, 52, 42, 4, '#d19a51');
      }
    }

    drawArcadeLandmark(scene, mx, fx, md, px, gx, sky.getContext('2d'));

    /* 所有 Arcade 背景都保留硬边像素、清晰的地平线和一处高亮焦点。 */
    var vig = scene === 'ice' ? [2, 8, 18] : scene === 'desert' ? [24, 14, 4] : [12, 10, 16];
    return {
      arcade: true, arcadeScene: scene,
      sky: sky, mountains: mountains.c, far: far.c, mid: mid.c, near: near.c,
      shafts: bakeShaftsEx(cfg.shaft || cfg.t3, cfg.shaftA || 0.05),
      warm: bakeWarmEx(cfg.orb ? cfg.orb.x : 372, cfg.orb ? cfg.orb.y : 120, 150, cfg.warmRGB || [220, 220, 220], 32),
      props: props.c, ground: ground.c, fore: fore.c,
      mist: bakeMistEx(cfg.mist || cfg.t2),
      vig: bakeVigEx(vig[0], vig[1], vig[2]),
      shaftK: 0.45, warmK: 0.55, mistK: scene === 'ice' ? 0.8 : 0.3
    };
  }

  function bakeWorldThemed(cfg) {
    if (cfg.arcade) return bakeArcadeWorld(cfg);
    var kind = cfg.kind || 'maple';
    var far, mid, near;
    var base = { trunkW: 2, canopy: 0.26, clusters: 3 };
    if (kind === 'pine') {
      far = { trunk: cfg.t1, trunkDark: cfg.t0, bough: cfg.t2, snow: cfg.t3, h: 56 };
      mid = { trunk: cfg.t1, trunkDark: cfg.t0, bough: cfg.t2, snow: cfg.t3, h: 88 };
      near = { trunk: cfg.t1, trunkDark: cfg.t0, bough: cfg.t2, snow: cfg.t3, h: 120 };
    } else {
      far = { trunk: cfg.t1, trunkDark: cfg.t0, leafDark: cfg.t0, leaf: cfg.t2, h: 78, trunkW: 2, canopy: 0.17, clusters: 3, flat: true };
      mid = { trunk: cfg.t1, trunkDark: cfg.t0, leafDark: cfg.t0, leaf: cfg.t2, leafHi: cfg.t3, h: 118, trunkW: 3, canopy: 0.15, clusters: 4 };
      near = { trunk: cfg.t1, trunkDark: cfg.t0, leafDark: cfg.t0, leaf: cfg.t2, leafHi: cfg.t3, h: 172, trunkW: 5, canopy: 0.13, clusters: 5 };
    }
    var mkForest = kind === 'pine' ? bakePineForest : bakeMapleForest;
    var gnd = bakeGroundTheme(cfg);
    return {
      sky: bakeSkyEx({
        seed: cfg.seed || 5,
        stars: cfg.stars || 0,
        cloud: cfg.cloud || cfg.t2,
        cloud2: cfg.cloud2 || cfg.t3,
        cloudN: cfg.cloudN || 3,
        horizon: cfg.horizon,
        stops: cfg.stops,
        orb: cfg.orb
      }),
      mountains: bakeMountainsEx({
        seed: (cfg.seed || 5) + 1,
        snowCap: cfg.snowCap,
        ridges: [
          { y: 188, amp: 32, fill: cfg.m0, rim: cfg.m1, seed: 1234 },
          { y: 202, amp: 22, fill: cfg.m1, rim: cfg.m2, seed: 5678 },
          { y: 213, amp: 13, fill: cfg.m2, rim: cfg.m3 || cfg.m2, seed: 9012 }
        ]
      }),
      far: mkForest((cfg.seed || 5) * 11 + 1, 18, far, 222),
      mid: mkForest((cfg.seed || 5) * 13 + 2, 11, mid, 224, [90, 400]),
      near: mkForest((cfg.seed || 5) * 17 + 3, 7, near, 226),
      shafts: bakeShaftsEx(cfg.shaft || cfg.t3, cfg.shaftA || 0.09),
      warm: bakeWarmEx(cfg.orb ? cfg.orb.x : 372, cfg.orb ? cfg.orb.y : 120, 150, cfg.warmRGB || [200, 200, 200], 48),
      props: gnd,
      ground: gnd,
      fore: bakeForeEx({
        seed: (cfg.seed || 5) * 7 + 4,
        branches: 6, leaves: 5,
        leaf: cfg.t0, leafDark: cfg.t0, branch: cfg.t0,
        leafKind: kind === 'pine' ? 'pine' : 'leaf',
        snow: cfg.t3
      }),
      mist: bakeMistEx(cfg.mist || cfg.t2),
      vig: bakeVigEx(cfg.vig ? cfg.vig[0] : 6, cfg.vig ? cfg.vig[1] : 6, cfg.vig ? cfg.vig[2] : 10),
      shaftK: cfg.shaftK || 0.7, warmK: cfg.warmK || 0.85, mistK: cfg.mistK || 0.6
    };
  }

  function sky4(a, b, c, d) {
    return [[0.00, a], [0.34, b], [0.64, c], [1.00, d]];
  }

  /* 4-20 关的主题配色（每关一套，避免撞脸） */
  var THEMES = {
    4: {
      seed: 41, kind: 'maple', stops: sky4('#3a1a34', '#8a3a52', '#e07a86', '#ffd0c8'),
      orb: { x: 380, y: 150, rings: [[24, '#e88a8a'], [16, '#ffb8a8'], [9, '#fff0e0']] },
      cloud: '#c86a80', cloud2: '#f0a0a8', cloudN: 4,
      t0: '#3a1424', t1: '#6a2438', t2: '#c04a6a', t3: '#ff9ab8',
      m0: '#6a3a52', m1: '#4a2438', m2: '#2a1220',
      g1: '#6a4a3a', g2: '#2e1e1a', g3: '#8a6a52', tuft: '#c86a8a',
      mist: '#f0b8b8', shaft: '#ffd8c8', warmRGB: [255, 190, 170], vig: [14, 4, 10]
    },
    5: {
      seed: 51, kind: 'maple', stars: 90, stops: sky4('#04141c', '#0a2a34', '#14505a', '#2a8a86'),
      orb: { x: 356, y: 66, rings: [[22, '#8ac8c0'], [15, '#c0e8dc'], [8, '#f0fff8']] },
      cloud: '#1a4a52', cloud2: '#2a6a6a', cloudN: 3,
      t0: '#08201e', t1: '#123832', t2: '#2a6a52', t3: '#6ac098',
      m0: '#1a3a40', m1: '#122830', m2: '#0a1820',
      g1: '#1e4a44', g2: '#0a1e1c', g3: '#3a7a68', tuft: '#7ac8a8',
      mist: '#5ac0b0', shaft: '#a8e8d8', warmRGB: [160, 230, 220], vig: [2, 10, 10], mistK: 0.5
    },
    6: {
      seed: 61, kind: 'pine', stops: sky4('#4a2a14', '#8a5224', '#d09248', '#f8dca0'),
      orb: { x: 400, y: 132, rings: [[26, '#e0a050'], [17, '#f8c878'], [9, '#fff4d0']] },
      cloud: '#c08a50', cloud2: '#e8b878', cloudN: 3,
      t0: '#4a3018', t1: '#6a4a24', t2: '#a87a3a', t3: '#e0b878',
      m0: '#a87a48', m1: '#7a5228', m2: '#4a2e14',
      g1: '#c89a5a', g2: '#6a4a24', g3: '#e8c88a', tuft: '#b8904a',
      mist: '#e8c090', shaft: '#ffe0a8', warmRGB: [255, 210, 150], vig: [16, 8, 2], mistK: 0.8
    },
    7: {
      seed: 71, kind: 'maple', stars: 60, stops: sky4('#0a0812', '#1a1226', '#2e1e3e', '#4a2e56'),
      orb: { x: 120, y: 54, rings: [[18, '#6a4a7a'], [11, '#a080b0'], [6, '#e0c8f0']] },
      cloud: '#2a1e3a', cloud2: '#3e2c50', cloudN: 3,
      t0: '#141020', t1: '#241a30', t2: '#3a2a4a', t3: '#6a5a80',
      m0: '#2a1e38', m1: '#1e1428', m2: '#100a18',
      g1: '#2a2234', g2: '#0e0a14', g3: '#4a3a56', tuft: '#8a6a9a',
      mist: '#6a4a7a', shaft: '#c0a0d0', warmRGB: [200, 160, 220], vig: [8, 4, 14], mistK: 0.7
    },
    8: {
      seed: 81, kind: 'pine', stops: sky4('#1a0402', '#4a0e06', '#8a2a0e', '#e06a1a'),
      orb: { x: 240, y: 150, rings: [[30, '#a83a10'], [20, '#e0701a'], [11, '#ffc060']] },
      cloud: '#5a1a0a', cloud2: '#8a3010', cloudN: 4,
      t0: '#1a0604', t1: '#2e0c06', t2: '#5a1a0a', t3: '#8a3a14',
      m0: '#4a1208', m1: '#2e0a06', m2: '#180404',
      g1: '#4a1a10', g2: '#160604', g3: '#8a3a18', tuft: '#e06a1a',
      mist: '#a83a10', shaft: '#ff9a4a', warmRGB: [255, 120, 60], vig: [20, 4, 2], mistK: 0.9
    },
    9: {
      seed: 91, kind: 'pine', stars: 40, stops: sky4('#0a1218', '#16262e', '#26424c', '#3e6470'),
      orb: { x: 130, y: 60, rings: [[16, '#5a7a86'], [10, '#8aa8b4'], [5, '#d8eef4']] },
      cloud: '#2a4048', cloud2: '#3e5a64', cloudN: 3,
      t0: '#0e1c22', t1: '#182c34', t2: '#26424c', t3: '#5a7a86',
      m0: '#1e323a', m1: '#142228', m2: '#0a1216',
      g1: '#243a42', g2: '#0a1418', g3: '#3e5a64', tuft: '#6a8a96',
      mist: '#7aa0ae', shaft: '#c8e4ee', warmRGB: [180, 210, 225], vig: [4, 8, 12], mistK: 1.1
    },
    10: {
      seed: 101, kind: 'pine', stops: sky4('#0c1016', '#1a2028', '#2e3a46', '#54687a'),
      orb: { x: 340, y: 70, rings: [[20, '#6a7a8a'], [12, '#a0b0c0'], [6, '#e8f0f8']] },
      cloud: '#2a3440', cloud2: '#3e4c5a', cloudN: 3,
      t0: '#0a0e14', t1: '#161e28', t2: '#2a3644', t3: '#5a6a7a',
      m0: '#242e3a', m1: '#161e28', m2: '#0a0e14',
      g1: '#3a4450', g2: '#12161c', g3: '#5a6a7a', tuft: '#8a9aa8',
      mist: '#7a8a9a', shaft: '#d0dce8', warmRGB: [200, 210, 225], vig: [6, 8, 12], mistK: 0.8
    },
    11: {
      seed: 111, kind: 'pine', stars: 70, stops: sky4('#050a16', '#0c1830', '#1a3060', '#2e5090'),
      orb: { x: 300, y: 64, rings: [[22, '#5a6ac0'], [14, '#8a9ae0'], [7, '#e8f0ff']] },
      cloud: '#1a2a4a', cloud2: '#2a3e68', cloudN: 4,
      t0: '#08101e', t1: '#101a2e', t2: '#1e2e4e', t3: '#4a6a9a',
      m0: '#16244a', m1: '#0e1830', m2: '#060c18',
      g1: '#2a3a58', g2: '#0a1020', g3: '#4a6a9a', tuft: '#ffe06a',
      mist: '#5a7ac8', shaft: '#c8d8ff', warmRGB: [180, 200, 255], vig: [4, 6, 16], mistK: 0.6
    },
    12: {
      seed: 121, kind: 'maple', stops: sky4('#14200e', '#2a3a16', '#4a5e22', '#8a9a3a'),
      orb: { x: 390, y: 120, rings: [[22, '#a8b850'], [14, '#d0dc78'], [7, '#f8ffc0']] },
      cloud: '#3a4a20', cloud2: '#5a6a30', cloudN: 3,
      t0: '#101808', t1: '#1e2a10', t2: '#3a5220', t3: '#7a9a48',
      m0: '#3a4a24', m1: '#26301a', m2: '#141c0e',
      g1: '#4a5a2a', g2: '#1a2010', g3: '#7a9a48', tuft: '#c8e070',
      mist: '#9ab060', shaft: '#e0f0a8', warmRGB: [210, 230, 160], vig: [6, 10, 2], mistK: 0.7
    },
    13: {
      seed: 131, kind: 'pine', stops: sky4('#3a2410', '#6a4420', '#a87a38', '#e8c078'),
      orb: { x: 370, y: 128, rings: [[26, '#c89050'], [17, '#e8b870'], [9, '#fff0c0']] },
      cloud: '#a87a48', cloud2: '#d8a860', cloudN: 3,
      t0: '#3a2a12', t1: '#5a4422', t2: '#8a6a30', t3: '#d8b070',
      m0: '#8a6a38', m1: '#6a4e24', m2: '#3a2a12',
      g1: '#b08a4a', g2: '#4a3418', g3: '#e0c080', tuft: '#c8a050',
      mist: '#e0c090', shaft: '#ffe8b0', warmRGB: [255, 220, 160], vig: [14, 8, 2], mistK: 0.85
    },
    14: {
      seed: 141, kind: 'pine', stars: 120, stops: sky4('#04101c', '#0a2238', '#164258', '#3a7a96'),
      orb: { x: 360, y: 58, rings: [[24, '#7ac0d8'], [16, '#b0e0f0'], [8, '#f0ffff']] },
      cloud: '#1a3a50', cloud2: '#2a5570', cloudN: 3,
      t0: '#08161e', t1: '#0e2430', t2: '#1a3a48', t3: '#6aa8c0',
      m0: '#1a3a4a', m1: '#102630', m2: '#08141c',
      g1: '#7aa8c0', g2: '#1a3444', g3: '#c8e8f8', tuft: '#d0f0ff',
      mist: '#9ac8e0', shaft: '#d8f4ff', warmRGB: [190, 230, 255], vig: [2, 8, 14], mistK: 0.7
    },
    15: {
      seed: 151, kind: 'maple', stars: 40, stops: sky4('#080e06', '#101a0c', '#1a2a12', '#2e4220'),
      orb: { x: 110, y: 48, rings: [[14, '#3a5a28'], [8, '#6a8a40'], [4, '#b0d080']] },
      cloud: '#16220e', cloud2: '#243418', cloudN: 3,
      t0: '#060c04', t1: '#0e180a', t2: '#1a2a12', t3: '#3a5424',
      m0: '#14200e', m1: '#0c1408', m2: '#060a04',
      g1: '#1e2a14', g2: '#080c06', g3: '#3a5424', tuft: '#7a9a48',
      mist: '#3a5424', shaft: '#a0c070', warmRGB: [150, 190, 110], vig: [4, 10, 2], mistK: 1.0
    },
    16: {
      seed: 161, kind: 'pine', stars: 160, stops: sky4('#0a0618', '#1a0e30', '#2e1a50', '#4a2a70'),
      orb: { x: 250, y: 56, rings: [[18, '#7a4aa8'], [11, '#b07ad8'], [5, '#f0d8ff']] },
      cloud: '#241440', cloud2: '#3a2258', cloudN: 3,
      t0: '#100a20', t1: '#1a1030', t2: '#2a1a48', t3: '#6a4a90',
      m0: '#2a1a44', m1: '#1a102c', m2: '#0c0618',
      g1: '#2e2048', g2: '#100a1c', g3: '#5a3a80', tuft: '#d0a8ff',
      mist: '#7a4aa8', shaft: '#d0a8ff', warmRGB: [200, 160, 255], vig: [8, 2, 16], mistK: 0.7
    },
    17: {
      seed: 171, kind: 'maple', stops: sky4('#0a1a1a', '#123030', '#1e4a46', '#3a6e66'),
      orb: { x: 372, y: 64, rings: [[20, '#6aa89a'], [12, '#a0d0c0'], [6, '#f0fff8']] },
      cloud: '#1a3a38', cloud2: '#2a5550', cloudN: 3,
      t0: '#081614', t1: '#102a26', t2: '#1e423a', t3: '#4a7a6a',
      m0: '#1a3a34', m1: '#102420', m2: '#081410',
      g1: '#2a4a40', g2: '#0a1a16', g3: '#5a8a78', tuft: '#b8a860',
      mist: '#4a8a78', shaft: '#d0e8d8', warmRGB: [200, 220, 200], vig: [4, 10, 8], mistK: 0.7
    },
    18: {
      seed: 181, kind: 'pine', stars: 90, stops: sky4('#0a0208', '#2a0410', '#5a0a18', '#9a1420'),
      orb: { x: 360, y: 72, rings: [[30, '#8a1020'], [20, '#c82030'], [11, '#ff6a60'], [5, '#ffd0c0']] },
      cloud: '#3a0812', cloud2: '#5a0e1a', cloudN: 4,
      t0: '#0a0206', t1: '#18040c', t2: '#2a0812', t3: '#5a1020',
      m0: '#3a0812', m1: '#24040c', m2: '#100206',
      g1: '#3a0a14', g2: '#0e0206', g3: '#6a1020', tuft: '#c82030',
      mist: '#8a1020', shaft: '#ff8a7a', warmRGB: [255, 90, 80], vig: [18, 2, 6], mistK: 0.9
    },
    19: {
      seed: 191, kind: 'pine', stars: 30, stops: sky4('#020806', '#061410', '#0c2418', '#1a3a26'),
      orb: { x: 140, y: 74, rings: [[20, '#2a5a3a'], [12, '#4a8a5a'], [6, '#a0e080']] },
      cloud: '#0e2418', cloud2: '#16341f', cloudN: 3,
      t0: '#020a06', t1: '#06140c', t2: '#0c2014', t3: '#2a4a30',
      m0: '#0c2418', m1: '#06140c', m2: '#020806',
      g1: '#12261a', g2: '#040a06', g3: '#2a4a30', tuft: '#4ac878',
      mist: '#2a6a44', shaft: '#a0ffc8', warmRGB: [120, 220, 160], vig: [2, 12, 6], mistK: 1.0
    },
    20: {
      seed: 201, kind: 'pine', stars: 60, stops: sky4('#1a2438', '#3a4e6a', '#7a92b0', '#d8e4f0'),
      orb: { x: 300, y: 90, rings: [[34, '#c8d8e8'], [22, '#e8f0f8'], [12, '#ffffff']] },
      cloud: '#8aa0b8', cloud2: '#c0d0e0', cloudN: 4,
      t0: '#2a3648', t1: '#465a70', t2: '#7a92a8', t3: '#e8f0f8',
      m0: '#8a9cb0', m1: '#5a6e86', m2: '#33425a',
      g1: '#a8b8c8', g2: '#4a5a6e', g3: '#e8f0f8', tuft: '#ffffff',
      mist: '#d8e4f0', shaft: '#ffffff', warmRGB: [240, 245, 255], vig: [10, 14, 20], mistK: 1.0
    },

    /* ---- 21-25：闯关模式的五张可爱地图（明度高、饱和低、不用纯黑纯白） ---- */
    21: { arcade: 'candy',   /* 梦幻乐园：棉花糖云、糖果路、气球色 */
      seed: 211, kind: 'maple', stops: sky4('#332448', '#704064', '#b14e80', '#f194a7'),
      orb: { x: 372, y: 96, rings: [[34, '#ffd9a8'], [22, '#ffe9c8'], [12, '#fffaf0']] },
      cloud: '#ffe0f0', cloud2: '#fff4fc', cloudN: 6,
      t0: '#c86a96', t1: '#e88ab0', t2: '#ffb8d8', t3: '#fff0f8',
      m0: '#e8b8d0', m1: '#d098b8', m2: '#b87c9c',
      g1: '#fff0d8', g2: '#e8c8a8', g3: '#ffffff', tuft: '#ffb8d0',
      mist: '#ffe8f4', shaft: '#fff4d8', warmRGB: [255, 236, 220], vig: [30, 18, 24], mistK: 0.45
    },
    22: { arcade: 'school',   /* 学习天地：书本山、黑板书架、暖黄灯光 */
      seed: 221, kind: 'maple', stops: sky4('#203a3c', '#356450', '#927041', '#e5bb68'),
      orb: { x: 120, y: 70, rings: [[26, '#ffd880'], [17, '#ffe8a8'], [9, '#fffbe8']] },
      cloud: '#ffeec0', cloud2: '#fff8e0', cloudN: 4,
      t0: '#8a6a3a', t1: '#b88a4a', t2: '#8ac08a', t3: '#d8f0b0',
      m0: '#e0c898', m1: '#c8a878', m2: '#a88858',
      g1: '#ffe8c0', g2: '#d8b888', g3: '#fff4dc', tuft: '#8ac06a',
      mist: '#ffeec8', shaft: '#fff8d8', warmRGB: [255, 240, 200], vig: [30, 24, 16], mistK: 0.4
    },
    23: { arcade: 'winter',   /* 冬日校园：雪覆操场、雪松、晴空 */
      seed: 231, kind: 'pine', stops: sky4('#233c54', '#4c7595', '#9abdd2', '#deeff5'),
      orb: { x: 350, y: 80, rings: [[24, '#ffffff'], [16, '#f0f8ff'], [8, '#ffffff']] },
      cloud: '#f0f8ff', cloud2: '#ffffff', cloudN: 5,
      t0: '#7a9ab0', t1: '#a8c4d8', t2: '#6a9a78', t3: '#ffffff',
      m0: '#d8e8f4', m1: '#b8cfe0', m2: '#98b4c8',
      g1: '#f8fcff', g2: '#d0e0ec', g3: '#ffffff', tuft: '#c8dce8',
      mist: '#e8f4ff', shaft: '#ffffff', warmRGB: [235, 245, 255], vig: [22, 26, 30], mistK: 0.5
    },
    24: { arcade: 'ice',   /* 冰雪天地：极光、冰晶洞、青紫夜 */
      seed: 241, kind: 'pine', stars: 150, stops: sky4('#101a38', '#172f5d', '#255d78', '#56a7b0'),
      orb: { x: 300, y: 64, rings: [[26, '#c8f0ff'], [16, '#e8fbff'], [8, '#ffffff']] },
      cloud: '#c0e8f8', cloud2: '#e0f8ff', cloudN: 4,
      t0: '#4a7a98', t1: '#7aaac8', t2: '#6ac0d8', t3: '#e8fbff',
      m0: '#b0d8ec', m1: '#8cbbd4', m2: '#6a9cb8',
      g1: '#e0f6ff', g2: '#a8d4e8', g3: '#ffffff', tuft: '#7fd8e8',
      mist: '#d8f4ff', shaft: '#e8ffff', warmRGB: [200, 240, 255], vig: [16, 24, 30], mistK: 0.6
    },
    25: { arcade: 'desert',   /* 炙热沙漠：沙丘、金字塔远景、橙黄 */
      seed: 251, kind: 'maple', stops: sky4('#39243c', '#7c4037', '#cc6338', '#f2ab4e'),
      orb: { x: 396, y: 108, rings: [[36, '#ffc060'], [24, '#ffd890'], [13, '#fff4d0']] },
      cloud: '#ffdca8', cloud2: '#fff0d0', cloudN: 3,
      t0: '#a87a3a', t1: '#c89a52', t2: '#c8b060', t3: '#f0e0a0',
      m0: '#e8c890', m1: '#d0ac70', m2: '#b89058',
      g1: '#ffe0b0', g2: '#d8a868', g3: '#fff0c8', tuft: '#b8a04a',
      mist: '#ffe8c0', shaft: '#fff4c8', warmRGB: [255, 220, 160], vig: [32, 22, 10], mistK: 0.7
    }
  };

  function getWorld(n) {
    n = Math.max(1, Math.min(25, n | 0));
    if (!WORLDS[n]) {
      if (n === 1) WORLDS[n] = bakeWorld1();
      else if (n === 2) WORLDS[n] = bakeWorld2();
      else if (n === 3) WORLDS[n] = bakeWorld3();
      else if (THEMES[n]) WORLDS[n] = bakeWorldThemed(THEMES[n]);
      else WORLDS[n] = bakeWorld1();
      WORLDS[n].id = n;
    }
    return WORLDS[n];
  }

  /* 切换关卡主题（1 竹海 / 2 枫林 / 3 雪岭） */
  function setWorld(n) {
    L = getWorld(n);
    return L;
  }

  function init() {
    if (!L) L = getWorld(1);
    return L;
  }

  function blit(ctx, img, off, y) {
    var w = img.width;
    var o = ((off % w) + w) % w;
    ctx.drawImage(img, -o, y || 0);
    ctx.drawImage(img, -o + w, y || 0);
  }

  function drawBackground(ctx, camX, t, mistT) {
    init();
    var mt = mistT == null ? t : mistT;   /* 雾带用单独的时间轴：打斗时可以定住 */
    ctx.drawImage(L.sky, 0, 0);
    blit(ctx, L.mountains, camX * 0.05);
    blit(ctx, L.far, camX * 0.13);
    blit(ctx, L.mid, camX * 0.26);

    var arcadeScene = !!L.arcade;
    if (!arcadeScene) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.5 + Math.sin(t * 0.5) * 0.06) * (L.warmK || 1);
      ctx.drawImage(L.warm, 0, 0);
      ctx.restore();
      ctx.globalAlpha = (0.55 + Math.sin(t * 0.7) * 0.18) * (L.shaftK || 1);
      ctx.drawImage(L.shafts, 0, 0);
      ctx.globalAlpha = 1;
      var mk = L.mistK || 1;
      ctx.globalAlpha = 0.16 * mk; blit(ctx, L.mist, camX * 0.35 + mt * 6, 116);
      ctx.globalAlpha = 0.11 * mk; blit(ctx, L.mist, camX * 0.52 + mt * 10, 154);
      ctx.globalAlpha = 0.08 * mk; blit(ctx, L.mist, camX * 0.72 + mt * 14, 190);
      ctx.globalAlpha = 1;
    }

    blit(ctx, L.near, camX * 0.48);
    blit(ctx, L.ground, camX);
    blit(ctx, L.props, camX * 0.75);
    blit(ctx, L.fore, camX * 1.22);
    if (L.arcade) drawArcadeAtmosphere(ctx, L.arcadeScene, t, camX);
  }

  function drawArcadeAtmosphere(ctx, scene, t, camX) {
    var colors = scene === 'candy' ? ['#fff0ad', '#ff9dc5']
      : scene === 'school' ? ['#d7e8a0', '#f2d18a']
      : scene === 'winter' ? ['#ffffff', '#b7e6f5']
      : scene === 'ice' ? ['#8bf2f0', '#d2f6ff']
      : ['#ffe0a0', '#e8a34b'];
    for (var i = 0; i < 18; i++) {
      var speed = scene === 'winter' ? 3 : (scene === 'desert' ? 8 : 5);
      var x = ((hash2(i * 17 + 3, 29) * 520 + t * speed * (i % 2 ? 1 : -1) + camX * 0.08) % 500 + 500) % 500 - 10;
      var y = 36 + hash2(i * 31 + 9, 47) * 158 + Math.sin(t * 1.3 + i * 2.2) * 5;
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 2 + i);
      PX(ctx, x, y, colors[i % 2]);
      if (scene === 'ice' && i % 4 === 0) {
        PX(ctx, x - 1, y, colors[i % 2]); PX(ctx, x + 1, y, colors[i % 2]);
        PX(ctx, x, y - 1, colors[i % 2]); PX(ctx, x, y + 1, colors[i % 2]);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawVignette(ctx) {
    init();
    ctx.drawImage(L.vig, 0, 0);
  }

  return { init: init, setWorld: setWorld, THEMES: THEMES, drawBackground: drawBackground, drawVignette: drawVignette, leafPx: leafPx, arcadePixelPoly: arcadePixelPoly, currentWorld: function () { return L; } };
  };
})(window);
