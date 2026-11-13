/* 像素美术：手绘图元 + 逐像素烘焙（不使用任何外部图片） */
(function (global) {
  'use strict';

  var PAL = {
    ink: '#101820',
    ink2: '#1b2a2a',
    skin: '#f2cba6', skinShade: '#cf9b76', skinHi: '#ffe2c0',
    hair: '#241d30', hairHi: '#3d3457',
    robe: '#eef3ef', robeShade: '#c3d0d3', robeDeep: '#9aacb3',
    azure: '#2f6f8f', azureDeep: '#1d4a61',
    sash: '#d9553f', sashDark: '#a63a2b',
    gold: '#e8c46a', goldHi: '#ffe9a8', goldDark: '#a9822f',
    blade: '#d9edf5', bladeHi: '#ffffff', glow: '#9fe8ff',
    leafDark: '#1c3a2c', leaf: '#3f7a56', leafMid: '#63a06e', leafHi: '#a6dba4',
    cyan: '#7fe0d0'
  };

  /* ---------------- 基础工具 ---------------- */

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return { c: c, x: x };
  }

  function R(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function PX(ctx, x, y, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function disc(ctx, cx, cy, r, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    r = Math.max(0, r);
    ctx.fillStyle = c;
    var ri = Math.floor(r);
    for (var y = -ri; y <= ri; y++) {
      var w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }

  function softDisc(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    cx = Math.round(cx); cy = Math.round(cy);
    var ri = Math.ceil(r);
    for (var y = -ri; y <= ri; y++) {
      for (var x = -ri; x <= ri; x++) {
        var d = Math.sqrt(x * x + y * y);
        if (d < r - 2 || (d < r + 1.5 && hash2(x + cy * 3, y + cx * 3) < 0.55)) {
          ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
  }

  function line(ctx, x0, y0, x1, y1, c, th) {
    th = th || 1;
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    var err = dx + dy;
    ctx.fillStyle = c;
    for (;;) {
      ctx.fillRect(x0, y0, th, th);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(x, y) {
    var h = (x | 0) * 374761393 + (y | 0) * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  var BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];

  function ditherDisc(ctx, cx, cy, r, c, density, seed) {
    seed = seed || 0;
    ctx.fillStyle = c;
    cx = Math.round(cx); cy = Math.round(cy);
    var ri = Math.ceil(r), R2 = r * r;
    for (var y = -ri; y <= ri; y++) {
      for (var x = -ri; x <= ri; x++) {
        if (x * x + y * y <= R2 && hash2(x + seed * 31, y + seed * 17) < density) {
          ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
  }

  function hex2rgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  /* 地图背景单独维护；这里保留原绘画接口。 */
  var backgrounds = global.createArcadeBackgrounds({ makeCanvas: makeCanvas, R: R, PX: PX, disc: disc, softDisc: softDisc, line: line, mulberry32: mulberry32, hash2: hash2, ditherDisc: ditherDisc, hex2rgb: hex2rgb, BAYER: BAYER });
  var init = backgrounds.init, setWorld = backgrounds.setWorld, THEMES = backgrounds.THEMES;
  var drawBackground = backgrounds.drawBackground, drawVignette = backgrounds.drawVignette;
  var leafPx = backgrounds.leafPx, arcadePixelPoly = backgrounds.arcadePixelPoly;

  /* 主角绘制单独维护，工具函数与原入口共享。 */
  var drawPlayer = global.createArcadePlayerArt({ PAL: PAL, R: R, PX: PX, disc: disc, line: line, makeCanvas: makeCanvas });

  /* ---------------- 敌人：竹叶妖 ---------------- */

  /* ---------------- BOSS：竹妖王 ----------------
     与小怪（竹叶妖）刻意拉开：佝偻宽肩、三眼面具、双角、巨爪、胸前妖丹 */
  function drawBossLeaf(ctx, e, t) {
    var bob = Math.sin(t * 1.5 + e.seed * 4) * 2.2;
    var x = Math.round(e.x + (e.kx || 0));
    var y = Math.round(e.y + bob + (e.ky || 0));

    var ink = '#120810';
    var wood = '#3a2233';
    var wood2 = '#523044';
    var woodHi = '#71455c';
    var leaf = '#2f4a2c';
    var leaf2 = '#5a8049';
    var glow = '#ff7a52';
    var gold = '#e8b95a';

    /* 地面阴影 */
    for (var i = 0; i < 4; i++) {
      var sw = 30 - i * 6;
      R(ctx, x - sw, 219 + i, sw * 2, 1, 'rgba(6,10,8,0.32)');
    }

    /* 妖气：柔和径向辉光（不用抖动点，避免满屏噪点） */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var ag = ctx.createRadialGradient(x, y - 12, 4, x, y - 12, 34);
    ag.addColorStop(0, 'rgba(150,50,96,0.30)');
    ag.addColorStop(0.45, 'rgba(110,36,74,0.16)');
    ag.addColorStop(1, 'rgba(70,20,50,0)');
    ctx.fillStyle = ag;
    ctx.fillRect(x - 34, y - 46, 68, 68);
    ctx.restore();

    /* 身后残叶 */
    for (var k = 0; k < 9; k++) {
      var a = t * 0.7 + k * 0.7;
      leafPx(ctx, x + Math.cos(a) * (30 + (k % 3) * 6), y - 10 + Math.sin(a * 0.9) * 24,
        a + 1.4, 9, leaf2, ink);
    }

    /* 双腿 + 爪足（先画腿，再被残叶裙压住根部） */
    for (var lg = -1; lg <= 1; lg += 2) {
      var lx = x + lg * 7;
      for (var ly = 16; ly <= 29; ly++) {
        var lw = ly > 25 ? 4 : 3;
        R(ctx, lx - lw - 1, y + ly, (lw + 1) * 2, 1, ink);
        R(ctx, lx - lw, y + ly, lw * 2, 1, ly % 5 === 0 ? wood2 : wood);
        R(ctx, lx + lw - 2, y + ly, 1, 1, woodHi);
      }
      R(ctx, lx - 5, y + 30, 11, 2, ink);
      R(ctx, lx - 4, y + 30, 9, 1, wood2);
      PX(ctx, lx - 4, y + 31, '#e8dcc0');
      PX(ctx, lx + 3, y + 31, '#e8dcc0');
    }

    /* 躯干：肩宽腰细 */
    for (var ty = -16; ty <= 13; ty++) {
      var kk = (ty + 16) / 29;
      var tw = Math.round(14 - Math.sin(kk * Math.PI) * 4);
      R(ctx, x - tw, y + ty, tw * 2, 1, ink);
      R(ctx, x - tw + 1, y + ty, (tw - 1) * 2, 1, wood);
      R(ctx, x - tw + 2, y + ty, 3, 1, wood2);
      R(ctx, x + tw - 5, y + ty, 3, 1, woodHi);
    }
    /* 胸甲横纹 */
    for (var b2 = 0; b2 < 3; b2++) {
      R(ctx, x - 11, y - 9 + b2 * 8, 22, 1, '#1a0d16');
    }

    /* 肩甲：圆球重甲（与躯干留出暗缝，避免糊成一团） */
    for (var sd = -1; sd <= 1; sd += 2) {
      var sx0 = x + sd * 18;
      var sy0 = y - 12;
      disc(ctx, sx0 + sd * 2, sy0, 10, 'rgba(10,5,12,0.35)');
      disc(ctx, sx0, sy0, 9, ink);
      disc(ctx, sx0, sy0, 8, wood);
      disc(ctx, sx0 - sd, sy0 - 2, 5, wood2);
      disc(ctx, sx0 - sd * 3, sy0 - 4, 2, woodHi);
      /* 甲刺 */
      for (var sp = -1; sp <= 1; sp++) {
        var px2 = sx0 + sp * 5;
        R(ctx, px2, sy0 - 13, 2, 6, ink);
        PX(ctx, px2, sy0 - 14, gold);
      }
      /* 竹节金环 */
      R(ctx, sx0 - 6, sy0 + 5, 12, 1, gold);
      R(ctx, sx0 - 6, sy0 + 6, 12, 1, '#8a6a30');
    }

    /* 双臂 + 巨爪 */
    for (var ad = -1; ad <= 1; ad += 2) {
      var sway = Math.sin(t * 1.8 + (ad > 0 ? 0 : 1.6)) * 1.5;
      for (var ay = -12; ay <= 9; ay++) {
        var axo = Math.round(ad * 21 + sway * ((ay + 12) / 21) * ad);
        var aw = ay > 4 ? 4 : 3;
        R(ctx, x + axo - aw - 1, y + ay, (aw + 1) * 2, 1, ink);
        R(ctx, x + axo - aw, y + ay, aw * 2, 1, ay % 6 === 0 ? wood2 : wood);
        R(ctx, x + axo + aw - 2, y + ay, 1, 1, woodHi);
      }
      /* 巨爪：铁拳 + 腕环 + 三根长爪 */
      var cx2 = x + Math.round(ad * 21 + sway);
      var cy2 = y + 9;
      R(ctx, cx2 - 5, cy2 - 2, 11, 6, ink);
      R(ctx, cx2 - 4, cy2 - 1, 9, 4, wood);
      R(ctx, cx2 - 4, cy2 - 1, 9, 1, woodHi);
      R(ctx, cx2 - 5, cy2 + 4, 11, 1, gold);
      for (var c3 = -1; c3 <= 1; c3++) {
        var cxx = cx2 + c3 * 4;
        R(ctx, cxx - 1, cy2 + 5, 2, 5, ink);
        R(ctx, cxx - 1, cy2 + 5, 1, 4, '#e8dcc0');
        PX(ctx, cxx - 1, cy2 + 9, '#fff8e0');
      }
    }

    /* 胸前妖丹 */
    var pulse = 0.5 + Math.sin(t * 5 + e.seed) * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var cg = ctx.createRadialGradient(x, y - 3, 1, x, y - 3, 13);
    cg.addColorStop(0, 'rgba(255,152,92,' + (0.30 + pulse * 0.34).toFixed(3) + ')');
    cg.addColorStop(0.5, 'rgba(255,110,60,' + (0.14 + pulse * 0.14).toFixed(3) + ')');
    cg.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(x - 13, y - 16, 26, 26);
    ctx.restore();
    disc(ctx, x, y - 3, 6, ink);
    disc(ctx, x, y - 3, 5, '#8e2a26');
    disc(ctx, x, y - 3, 3, glow);
    PX(ctx, x - 1, y - 5, '#ffe0b0');

    /* 头部：面具（沉在双肩之间） */
    var hy = y - 24;
    for (var ry = -12; ry <= 10; ry++) {
      var hw = ry > 6 ? 10 - (ry - 6) : Math.round(10 * Math.sqrt(Math.max(0, 1 - Math.pow(ry / 13, 2))));
      if (hw <= 0) continue;
      R(ctx, x - hw, hy + ry, hw * 2, 1, ink);
      if (hw > 1) R(ctx, x - hw + 1, hy + ry, (hw - 1) * 2, 1, wood);
      if (hw > 4) R(ctx, x - hw + 2, hy + ry, 3, 1, wood2);
      if (hw > 4) R(ctx, x + hw - 5, hy + ry, 3, 1, woodHi);
    }
    /* 面具额饰 */
    R(ctx, x - 8, hy - 10, 16, 2, ink);
    R(ctx, x - 7, hy - 9, 14, 1, gold);
    /* 第三只眼 */
    R(ctx, x - 3, hy - 7, 7, 5, ink);
    R(ctx, x - 2, hy - 6, 5, 3, '#3a0d12');
    R(ctx, x - 1, hy - 5, 3, 2, glow);
    PX(ctx, x, hy - 5, '#ffd7b0');
    /* 主眼横缝 */
    R(ctx, x - 8, hy - 1, 17, 6, ink);
    R(ctx, x - 7, hy, 15, 4, '#2a0a10');
    R(ctx, x - 6, hy + 1, 5, 2, glow);
    R(ctx, x + 2, hy + 1, 5, 2, glow);
    PX(ctx, x - 5, hy + 1, '#fff0c0');
    PX(ctx, x + 3, hy + 1, '#fff0c0');
    /* 獠牙 */
    R(ctx, x - 7, hy + 5, 15, 1, ink);
    for (var fg = -1; fg <= 1; fg++) {
      R(ctx, x + fg * 5 - 1, hy + 6, 2, 3, '#e8dcc0');
      PX(ctx, x + fg * 5 - 1, hy + 9, '#c8b898');
    }

    /* 下摆：残叶裙（锯齿边） */
    for (var sy = 13; sy <= 24; sy++) {
      var shw = 11 + (sy - 13) * 0.45;
      R(ctx, x - shw, y + sy, shw * 2, 1, ink);
      R(ctx, x - shw + 1, y + sy, (shw - 1) * 2, 1, sy % 4 === 0 ? leaf2 : leaf);
    }
    for (var lf = -3; lf <= 3; lf++) {
      leafPx(ctx, x + lf * 7, y + 23, 1.57 + lf * 0.12, 9, leaf2, ink);
    }

    /* 双角：粗根细尖、向外弯出的竹节妖角 */
    for (var side = -1; side <= 1; side += 2) {
      for (var hh = 0; hh < 15; hh++) {
        var u = hh / 14;
        var hxx = Math.round(x + side * (6 + Math.pow(u, 1.25) * 13));
        var hyy = hy - 9 - hh;
        var thk = Math.max(1, Math.round(3.4 - u * 2.2));
        R(ctx, hxx - thk - 1, hyy, thk * 2 + 2, 1, ink);
        R(ctx, hxx - thk, hyy, thk * 2, 1, u > 0.82 ? gold : wood);
        R(ctx, hxx + (side < 0 ? -thk : thk - 1), hyy, 1, 1, u > 0.82 ? '#fff0c0' : woodHi);
      }
      var tpx = Math.round(x + side * 19);
      PX(ctx, tpx, hy - 25, gold);
      PX(ctx, tpx, hy - 26, '#fff0c0');
    }

    /* 悬浮符纸（固定三个方位，随呼吸浮动，不遮胸） */
    var TAL = [[-34, -30, 0], [34, -26, 1.7], [0, -52, 3.1]];
    for (var f = 0; f < 3; f++) {
      var fa = t * 1.1 + TAL[f][2];
      var fx = x + TAL[f][0] + Math.sin(fa) * 2;
      var fy = y + TAL[f][1] + Math.cos(fa * 0.9) * 3;
      R(ctx, fx - 3, fy - 5, 7, 11, ink);
      R(ctx, fx - 2, fy - 4, 5, 9, '#d8c9a0');
      R(ctx, fx - 1, fy - 3, 3, 1, '#b8342e');
      PX(ctx, fx, fy - 1, '#b8342e');
      PX(ctx, fx, fy + 2, '#b8342e');
    }

    /* 受击白闪 */
    if (e.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.8, e.flash * 5);
      R(ctx, x - 14, y - 16, 28, 29, '#ffffff');
      disc(ctx, x - 17, y - 12, 10, '#ffffff');
      disc(ctx, x + 17, y - 12, 10, '#ffffff');
      R(ctx, x - 10, y - 36, 20, 22, '#ffffff');
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* 濒死：斜切斩痕 */
    if (e.dying > 0) {
      var dk = 1 - e.dying / 0.11;
      var cut = 28 * (1 - dk * 0.1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var ci = -cut; ci <= cut; ci++) {
        var cyy = ci * 0.55;
        ctx.globalAlpha = 0.34;
        R(ctx, x + ci, y + cyy - 4, 1, 9, '#7fd8f0');
        ctx.globalAlpha = 0.95;
        R(ctx, x + ci, y + cyy - 2, 1, 5, '#ffffff');
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* 血条改为 HUD 顶部横幅（见 game.js drawBossBar），此处不再画 */
  }

  function drawEnemyLeaf(ctx, e, t) {
    var s = 1.15;
    var bob = Math.sin(t * 2.1 + e.seed * 7) * 3;
    var x = Math.round(e.x + (e.kx || 0)), y = Math.round(e.y + bob + (e.ky || 0));
    var flash = e.flash > 0;

    var cDark = e.elite ? '#241028' : '#173426';
    var cBody = e.elite ? '#5b2b52' : '#3f7a56';
    var cMid = e.elite ? '#9b4a6a' : '#63a06e';
    var cHi = e.elite ? '#e08a8a' : '#a6dba4';
    var eyeC = e.elite ? '#ff8f6a' : '#eaffd2';

    /* 地面阴影 */
    var sw = 16 * s;
    for (var yy = 0; yy < 3; yy++) {
      var ww = sw - yy * 3;
      R(ctx, x - ww, 222 + yy, ww * 2, 1, 'rgba(8,20,16,0.32)');
    }

    /* 妖气 */
    if (e.elite) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ditherDisc(ctx, x, y, 30, '#8a3f5a', 0.10, 3);
      ctx.restore();
    }

    /* 垂须 */
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 5; j++) {
        var tx = x + (i - 1) * 4 * s + Math.sin(t * 3 + i + j * 0.8) * 1.6;
        var ty = y + 10 * s + j * 2 * s;
        R(ctx, tx, ty, 1, 2, cDark);
      }
    }

    /* 环绕竹叶 */
    var n = e.elite ? 5 : 4;
    for (var k = 0; k < n; k++) {
      var a = t * (e.elite ? 1.1 : 0.85) + k * (Math.PI * 2 / n) + e.seed;
      var lx = x + Math.cos(a) * 17 * s;
      var ly = y + Math.sin(a) * 10 * s - 2;
      leafPx(ctx, lx, ly, a + 1.3, 7 * s, cMid, cDark);
    }

    /* 叶片本体（水滴形） */
    var top = -12 * s, bot = 12 * s;
    for (var by = Math.ceil(top); by <= bot; by++) {
      var tt = (by - top) / (bot - top);
      var bw = Math.sin(Math.PI * Math.pow(tt, 0.72)) * 9 * s;
      if (by > 3 * s) bw *= (1 - (by - 3 * s) / (10 * s) * 0.55);
      bw = Math.round(bw);
      if (bw <= 0) continue;
      R(ctx, x - bw, y + by, bw * 2, 1, cDark);
      if (bw > 1) R(ctx, x - bw + 1, y + by, (bw - 1) * 2, 1, cBody);
      if (bw > 3) R(ctx, x - bw + 2, y + by, 2, 1, cMid);
      /* 右侧边缘高光，呼应画面光源 */
      if (bw > 2 && by < bot - 3) R(ctx, x + bw - 2, y + by, 1, 1, cHi);
    }
    /* 叶脉 */
    R(ctx, x, y - 8 * s, 1, 7 * s, cMid);
    R(ctx, x - 5 * s, y - 4 * s, 3, 1, cMid);
    R(ctx, x + 3 * s, y - 5 * s, 3, 1, cMid);

    /* 双眼 */
    R(ctx, x - 5, y - 3, 3, 3, '#0b1a12');
    R(ctx, x + 2, y - 3, 3, 3, '#0b1a12');
    R(ctx, x - 4, y - 2, 2, 2, eyeC);
    R(ctx, x + 3, y - 2, 2, 2, eyeC);
    /* 斜眉：让妖物显得凶一点 */
    R(ctx, x - 6, y - 5, 4, 1, cDark);
    R(ctx, x + 2, y - 5, 4, 1, cDark);
    PX(ctx, x - 6, y - 4, cDark);
    PX(ctx, x + 5, y - 4, cDark);
    R(ctx, x - 1, y + 3, 3, 1, cDark);

    /* 小枝手臂 */
    line(ctx, x - 8 * s, y - 1, x - 13 * s, y - 6 * s, cDark, 1);
    leafPx(ctx, x - 13 * s, y - 6 * s, -2.5, 5 * s, cMid, cDark);
    line(ctx, x + 8 * s, y - 1, x + 13 * s, y - 6 * s, cDark, 1);
    leafPx(ctx, x + 13 * s, y - 6 * s, -0.6, 5 * s, cMid, cDark);

    /* 濒死定格：一道斜切白光，比整块白闪更有「被斩断」的感觉 */
    if (e.dying > 0) {
      var dk = 1 - e.dying / 0.11;
      var cut = 16 * (1 - dk * 0.12);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var ci = -cut; ci <= cut; ci++) {
        var cyy = ci * 0.62;
        /* 外层冷光 + 内层白芯，形成一道有厚度的斩痕 */
        ctx.globalAlpha = 0.38;
        R(ctx, x + ci, y + cyy - 3, 1, 7, '#7fd8f0');
        ctx.globalAlpha = 0.95;
        R(ctx, x + ci, y + cyy - 2, 1, 4, '#ffffff');
        ctx.globalAlpha = 1;
        R(ctx, x + ci, y + cyy - 1, 1, 2, '#ffffff');
      }
      /* 断口两端的迸光 */
      ctx.globalAlpha = 0.8 * (1 - dk);
      ditherDisc(ctx, x - cut, y - cut * 0.62, 3, '#ffffff', 0.9, 1);
      ditherDisc(ctx, x + cut, y + cut * 0.62, 3, '#ffffff', 0.9, 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* 受击白闪：沿本体轮廓重绘，避免出现白色方块 */
    if (flash) {
      for (var fy = Math.ceil(top); fy <= bot; fy++) {
        var ft = (fy - top) / (bot - top);
        var fw = Math.sin(Math.PI * Math.pow(ft, 0.72)) * 9 * s;
        if (fy > 3 * s) fw *= (1 - (fy - 3 * s) / (10 * s) * 0.55);
        fw = Math.round(fw);
        if (fw <= 0) continue;
        R(ctx, x - fw, y + fy, fw * 2, 1, '#ffffff');
      }
    }

    /* 精英王冠 */
    if (e.elite) {
      R(ctx, x - 9, y - 20, 3, 6, '#241028');
      R(ctx, x - 2, y - 24, 3, 9, '#241028');
      R(ctx, x + 6, y - 20, 3, 6, '#241028');
      PX(ctx, x - 1, y - 23, '#e8c46a');
      PX(ctx, x + 7, y - 19, '#e8c46a');
    }

    /* 血条 */
    if (e.elite || e.hp < e.maxHp) {
      var bw2 = 30 * s;
      R(ctx, x - bw2 / 2 - 1, y - 30 * s - 1, bw2 + 2, 4, 'rgba(6,16,12,0.75)');
      R(ctx, x - bw2 / 2, y - 30 * s, bw2 * Math.max(0, e.hp / e.maxHp), 2, e.elite ? '#e8705a' : '#8fd8a0');
    }
  }

  /* ---------------- 通用：濒死斜切斩痕 ---------------- */

  function slashFx(ctx, e, x, y, rad) {
    if (!(e.dying > 0)) return;
    var dk = 1 - e.dying / 0.11;
    var cut = rad * (1 - dk * 0.12);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var ci = -cut; ci <= cut; ci++) {
      var cyy = ci * 0.62;
      ctx.globalAlpha = 0.36;
      R(ctx, x + ci, y + cyy - 3, 1, 7, '#7fd8f0');
      ctx.globalAlpha = 0.95;
      R(ctx, x + ci, y + cyy - 2, 1, 4, '#ffffff');
    }
    ctx.globalAlpha = 0.8 * (1 - dk);
    ditherDisc(ctx, x - cut, y - cut * 0.62, 3, '#ffffff', 0.9, 1);
    ditherDisc(ctx, x + cut, y + cut * 0.62, 3, '#ffffff', 0.9, 1);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function hpBar(ctx, e, x, y, w, col) {
    if (e.elite || e.hp >= e.maxHp) return;
    R(ctx, x - w / 2 - 1, y - 1, w + 2, 4, 'rgba(8,10,14,0.72)');
    R(ctx, x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 2, col);
  }

  /* ---------------- 第二关小怪：灯笼怪 ----------------
     纸糊灯身 + 竹骨 + 金盖 + 底部流苏，飘着走，鬼脸画在纸上 */
  function drawLanternMob(ctx, e, t) {
    var fl = e.flash > 0;
    var bob = Math.sin(t * 2.0 + e.seed * 7) * 2.2;
    var x = Math.round(e.x + (e.kx || 0));
    var y = Math.round(e.y + bob + (e.ky || 0));

    var ink = fl ? '#ffffff' : '#360a10';
    var pap = fl ? '#ffffff' : '#c0392b';
    var papM = fl ? '#ffffff' : '#e2664a';
    var papH = fl ? '#ffffff' : '#ffb086';
    var papD = fl ? '#ffffff' : '#8e241c';
    var gold = fl ? '#ffffff' : '#e8b95a';
    var goldD = fl ? '#ffffff' : '#8a6a30';
    var eyeC = fl ? '#ffffff' : '#ffe6a8';

    /* 地面投影（悬空，偏小偏淡） */
    for (var i = 0; i < 3; i++) {
      var sw = 11 - i * 3;
      R(ctx, x - sw, 222 + i, sw * 2, 1, 'rgba(10,4,6,0.24)');
    }

    /* 纸灯暖光 */
    if (!fl) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(x, y, 2, x, y, 26);
      g.addColorStop(0, 'rgba(255,150,80,0.22)');
      g.addColorStop(0.5, 'rgba(255,110,60,0.10)');
      g.addColorStop(1, 'rgba(255,90,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 26, y - 28, 52, 56);
      ctx.restore();
    }

    var top = -14, bot = 12;
    /* 灯身：鼓腹纸罩 */
    for (var yy = top; yy <= bot; yy++) {
      var u = (yy - top) / (bot - top);
      var hw = Math.round(6.6 + 4.2 * Math.sin(Math.PI * Math.pow(u, 0.86)));
      R(ctx, x - hw - 1, y + yy, (hw + 1) * 2, 1, ink);
      R(ctx, x - hw, y + yy, hw * 2, 1, pap);
      R(ctx, x - hw, y + yy, 2, 1, papD);
      if (hw > 4) R(ctx, x + hw - 3, y + yy, 3, 1, papM);
      if (hw > 5) PX(ctx, x + hw - 1, y + yy, papH);
    }
    /* 竖向竹骨 */
    for (var rb = -1; rb <= 1; rb++) {
      R(ctx, x + Math.round(rb * 5.4), y + top + 3, 1, bot - top - 4, papD);
    }
    /* 上下金盖 */
    R(ctx, x - 8, y + top - 4, 17, 4, ink);
    R(ctx, x - 7, y + top - 3, 15, 2, gold);
    R(ctx, x - 7, y + top - 1, 15, 1, goldD);
    R(ctx, x - 7, y + bot + 1, 15, 4, ink);
    R(ctx, x - 6, y + bot + 1, 13, 2, gold);
    R(ctx, x - 6, y + bot + 3, 13, 1, goldD);
    /* 顶环 */
    R(ctx, x - 2, y + top - 9, 5, 1, ink);
    R(ctx, x - 2, y + top - 8, 1, 4, gold);
    R(ctx, x + 2, y + top - 8, 1, 4, gold);
    /* 底部流苏 */
    R(ctx, x - 3, y + bot + 5, 7, 2, ink);
    R(ctx, x - 2, y + bot + 5, 5, 1, '#d8c9a0');
    for (var ts = -1; ts <= 1; ts++) {
      var tx2 = x + ts * 2;
      R(ctx, tx2, y + bot + 7, 1, 7, ink);
      R(ctx, tx2, y + bot + 7, 1, 6, ts === 0 ? '#e8b95a' : '#c0392b');
    }

    /* 侧面飘带：2px 纸带 + 金坠，别画成断开的方块 */
    for (var sd = -1; sd <= 1; sd += 2) {
      var ph = Math.sin(t * 3.1 + sd * 1.4 + e.seed) * 2.2;
      var x0 = x + sd * 8, y0 = y + 1;
      var x1 = x + sd * (14 + ph), y1 = y + 7 + ph;
      line(ctx, x0, y0, x1, y1, ink, 2);
      line(ctx, x0, y0, x1, y1, '#c0392b', 1);
      R(ctx, x1 - 1, y1 - 1, 3, 3, ink);
      R(ctx, x1 - 1, y1 - 1, 2, 2, gold);
    }

    /* 鬼脸：斜眉 + 亮眼 + 锯齿嘴 */
    R(ctx, x - 7, y - 6, 4, 1, ink);
    R(ctx, x + 3, y - 6, 4, 1, ink);
    PX(ctx, x - 7, y - 5, ink);
    PX(ctx, x + 6, y - 5, ink);
    R(ctx, x - 6, y - 4, 4, 4, ink);
    R(ctx, x + 2, y - 4, 4, 4, ink);
    R(ctx, x - 5, y - 3, 2, 2, eyeC);
    R(ctx, x + 3, y - 3, 2, 2, eyeC);
    PX(ctx, x - 5, y - 3, '#fff8e0');
    PX(ctx, x + 3, y - 3, '#fff8e0');
    R(ctx, x - 4, y + 3, 9, 1, ink);
    for (var mf = -1; mf <= 1; mf++) {
      R(ctx, x + mf * 3 - 1, y + 4, 2, 2, ink);
      PX(ctx, x + mf * 3 - 1, y + 4, '#fff0c0');
    }

    slashFx(ctx, e, x, y, 15);
    hpBar(ctx, e, x, y - 29, 28, '#e8a05a');
  }

  /* ---------------- 第二关 BOSS：愤怒的灯笼大头怪 ----------------
     一颗巨大的纸灯脑袋：火焰冠 + 怒眉巨眼 + 獠牙 + 补丁缝线 + 小爪锁链 */
  function drawBossLantern(ctx, e, t) {
    var fl = e.flash > 0;
    var bob = Math.sin(t * 1.4 + e.seed * 4) * 2.4;
    var x = Math.round(e.x + (e.kx || 0));
    var y = Math.round(e.y + bob + (e.ky || 0));

    var ink = fl ? '#ffffff' : '#2a060c';
    var pap = fl ? '#ffffff' : '#b8332a';
    var papM = fl ? '#ffffff' : '#dd5a44';
    var papH = fl ? '#ffffff' : '#ff9e78';
    var papD = fl ? '#ffffff' : '#7d1c18';
    var gold = fl ? '#ffffff' : '#e8b95a';
    var goldD = fl ? '#ffffff' : '#8a6a30';
    var fire = fl ? '#ffffff' : '#ffcf7a';

    /* 影子 */
    for (var i = 0; i < 5; i++) {
      var sw = 34 - i * 6;
      R(ctx, x - sw, 219 + i, sw * 2, 1, 'rgba(8,3,6,0.30)');
    }

    /* 妖气 */
    if (!fl) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(x, y - 6, 6, x, y - 6, 52);
      g.addColorStop(0, 'rgba(255,120,70,0.26)');
      g.addColorStop(0.5, 'rgba(200,60,60,0.12)');
      g.addColorStop(1, 'rgba(140,30,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 52, y - 58, 104, 100);
      ctx.restore();
    }

    /* 火焰冠：五簇火舌，随呼吸摇曳 */
    var ft = t * 7;
    for (var f = -2; f <= 2; f++) {
      var fh = 12 + Math.sin(ft + f * 1.7) * 4 + (f === 0 ? 7 : 0);
      var fx = x + f * 8;
      var fw = 4 - Math.abs(f);
      for (var fy = 0; fy < fh; fy++) {
        var k = fy / fh;
        var ww = Math.max(1, Math.round((fw + 2) * (1 - k * 0.85)));
        R(ctx, fx - ww, y - 32 - fy, ww * 2, 1, k < 0.45 ? fire : (k < 0.75 ? '#ff9a4a' : '#e8543a'));
      }
    }

    /* 大头灯身 */
    var top = -26, bot = 20;
    for (var yy = top; yy <= bot; yy++) {
      var u = (yy - top) / (bot - top);
      var hw = Math.round(12 + 12 * Math.sin(Math.PI * Math.pow(u, 0.9)));
      R(ctx, x - hw - 2, y + yy, (hw + 2) * 2, 1, ink);
      R(ctx, x - hw, y + yy, hw * 2, 1, pap);
      R(ctx, x - hw, y + yy, 3, 1, papD);
      R(ctx, x + hw - 6, y + yy, 5, 1, papM);
      R(ctx, x + hw - 2, y + yy, 2, 1, papH);
      if (yy % 6 === 0) R(ctx, x - hw + 1, y + yy, hw * 2 - 2, 1, papD);
    }
    /* 竖向竹骨 */
    for (var rb = -2; rb <= 2; rb++) {
      R(ctx, x + Math.round(rb * 9), y + top + 4, 1, bot - top - 7, papD);
    }
    /* 补丁 + 缝线（贴在左脸颊，避开咧嘴） */
    R(ctx, x - 21, y - 2, 10, 10, ink);
    R(ctx, x - 20, y - 1, 8, 8, '#c8a06a');
    R(ctx, x - 20, y - 1, 8, 1, '#e0bc86');
    for (var st = 0; st < 3; st++) PX(ctx, x - 19 + st * 3, y - 1, '#5a3a1e');
    for (var st2 = 0; st2 < 3; st2++) PX(ctx, x - 20, y + 1 + st2 * 3, '#5a3a1e');

    /* 上下金盖 */
    R(ctx, x - 15, y + top - 6, 31, 6, ink);
    R(ctx, x - 14, y + top - 5, 29, 3, gold);
    R(ctx, x - 14, y + top - 2, 29, 1, goldD);
    R(ctx, x - 13, y + bot + 1, 27, 6, ink);
    R(ctx, x - 12, y + bot + 1, 25, 3, gold);
    R(ctx, x - 12, y + bot + 4, 25, 1, goldD);

    /* 怒眉 + 巨眼 */
    R(ctx, x - 14, y - 13, 12, 3, ink);
    R(ctx, x + 3, y - 13, 12, 3, ink);
    R(ctx, x - 12, y - 10, 10, 2, ink);
    R(ctx, x + 3, y - 10, 10, 2, ink);
    R(ctx, x - 12, y - 7, 9, 7, ink);
    R(ctx, x + 3, y - 7, 9, 7, ink);
    R(ctx, x - 11, y - 6, 7, 5, '#3a0a0c');
    R(ctx, x + 4, y - 6, 7, 5, '#3a0a0c');
    R(ctx, x - 10, y - 5, 5, 3, fire);
    R(ctx, x + 5, y - 5, 5, 3, fire);
    R(ctx, x - 9, y - 5, 2, 2, '#fff6d0');
    R(ctx, x + 6, y - 5, 2, 2, '#fff6d0');

    /* 咧嘴獠牙 */
    R(ctx, x - 11, y + 2, 23, 2, ink);
    R(ctx, x - 10, y + 4, 21, 8, '#26060a');
    for (var tf = -2; tf <= 2; tf++) {
      R(ctx, x + tf * 5 - 1, y + 3, 2, 4, '#f0e2c0');
      PX(ctx, x + tf * 5 - 1, y + 7, '#c8b898');
    }
    for (var bf = -2; bf <= 1; bf++) {
      R(ctx, x + bf * 5 + 1, y + 10, 2, 3, '#f0e2c0');
    }
    R(ctx, x - 6, y + 7, 5, 2, '#8e2a26');
    R(ctx, x + 2, y + 7, 5, 2, '#8e2a26');

    /* 两侧小爪 + 垂链 */
    for (var sd = -1; sd <= 1; sd += 2) {
      var sw2 = Math.sin(t * 1.9 + (sd > 0 ? 0 : 1.5)) * 2;
      var ax = x + sd * (28 + sw2);
      var ay = y - 2;
      R(ctx, ax - 4, ay, 9, 4, ink);
      R(ctx, ax - 3, ay, 7, 2, '#4a2418');
      for (var cl = 0; cl < 3; cl++) {
        R(ctx, ax - 3 + cl * 3, ay + 4, 2, 4, ink);
        PX(ctx, ax - 3 + cl * 3, ay + 8, '#e8dcc0');
      }
      for (var ch = 0; ch < 3; ch++) {
        var cxx = x + sd * (25 + ch * 2);
        var cyy = y + bot + 7 + ch * 4;
        R(ctx, cxx - 2, cyy, 5, 1, ink);
        R(ctx, cxx - 2, cyy, 1, 3, goldD);
        R(ctx, cxx + 2, cyy, 1, 3, goldD);
      }
    }

    /* 底部流苏 */
    for (var ts = -2; ts <= 2; ts++) {
      var tx2 = x + ts * 5;
      R(ctx, tx2, y + bot + 7, 1, 7 + Math.abs(ts), ink);
      R(ctx, tx2, y + bot + 7, 1, 6, ts % 2 === 0 ? '#c0392b' : gold);
    }

    slashFx(ctx, e, x, y, 30);
  }

  /* ---------------- 第三关小怪：雪人怪 ----------------
     两颗雪球 + 煤块眼 + 胡萝卜鼻 + 树枝手 + 红围巾 + 冰锥帽 */
  function snowBall(ctx, cx, cy, r, base, shade, hi, ink) {
    disc(ctx, cx, cy, r + 1, ink);
    for (var yy = -r; yy <= r; yy++) {
      var w = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy)));
      if (w <= 0) continue;
      R(ctx, cx - w, cy + yy, w * 2 + 1, 1, base);
      if (w > 2) R(ctx, cx - w, cy + yy, Math.max(1, Math.round(w * 0.38)), 1, shade);
      if (w > 2) R(ctx, cx + w - 2, cy + yy, 2, 1, hi);
    }
  }

  function drawSnowman(ctx, e, t) {
    var fl = e.flash > 0;
    var bob = Math.sin(t * 2.2 + e.seed * 6) * 1.6;
    var x = Math.round(e.x + (e.kx || 0));
    var y = Math.round(e.y + bob + (e.ky || 0));

    var ink = fl ? '#ffffff' : '#4a6478';
    var sn = fl ? '#ffffff' : '#dbe9f6';
    var snS = fl ? '#ffffff' : '#a9c3d8';
    var snH = fl ? '#ffffff' : '#fbfeff';
    var coal = fl ? '#ffffff' : '#1e2430';
    var carrot = fl ? '#ffffff' : '#e8813a';
    var carrotD = fl ? '#ffffff' : '#b4561e';
    var scarf = fl ? '#ffffff' : '#c0392b';
    var scarfD = fl ? '#ffffff' : '#8e241c';
    var twig = fl ? '#ffffff' : '#4a3a2c';

    /* 地面投影 */
    for (var i = 0; i < 3; i++) {
      var sw = 14 - i * 4;
      R(ctx, x - sw, 222 + i, sw * 2, 1, 'rgba(14,26,40,0.26)');
    }

    /* 寒气：柔和冷光，别用抖动点，否则像满身噪点 */
    if (!fl) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var cg = ctx.createRadialGradient(x, y - 2, 3, x, y - 2, 24);
      cg.addColorStop(0, 'rgba(150,220,255,0.20)');
      cg.addColorStop(0.55, 'rgba(120,190,240,0.09)');
      cg.addColorStop(1, 'rgba(90,160,220,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(x - 24, y - 26, 48, 48);
      ctx.restore();
    }

    /* 树枝手（先画，压在雪球后面） */
    line(ctx, x - 7, y + 4, x - 17, y - 2, twig, 2);
    line(ctx, x - 13, y + 0, x - 15, y - 6, twig, 1);
    line(ctx, x + 7, y + 4, x + 17, y - 3, twig, 2);
    line(ctx, x + 13, y + 1, x + 16, y + 7, twig, 1);

    /* 下身 + 头 */
    snowBall(ctx, x, y + 7, 10, sn, snS, snH, ink);
    snowBall(ctx, x, y - 7, 7, sn, snS, snH, ink);

    /* 红围巾 */
    R(ctx, x - 8, y, 17, 3, ink);
    R(ctx, x - 7, y + 1, 15, 2, scarf);
    R(ctx, x - 7, y + 1, 15, 1, '#e06a52');
    R(ctx, x + 4, y + 3, 4, 8, ink);
    R(ctx, x + 5, y + 3, 2, 7, scarf);
    PX(ctx, x + 5, y + 10, scarfD);
    PX(ctx, x + 7, y + 10, scarfD);
    R(ctx, x + 1, y + 2, 4, 3, ink);
    R(ctx, x + 2, y + 2, 2, 2, scarfD);

    /* 煤块眼 + 凶眉 */
    R(ctx, x - 5, y - 10, 3, 3, coal);
    R(ctx, x + 2, y - 10, 3, 3, coal);
    PX(ctx, x - 5, y - 11, coal);
    PX(ctx, x + 4, y - 11, coal);
    /* 胡萝卜鼻 */
    R(ctx, x - 1, y - 6, 4, 2, carrot);
    PX(ctx, x + 3, y - 6, carrot);
    PX(ctx, x + 4, y - 6, carrotD);
    /* 煤块嘴 */
    PX(ctx, x - 4, y - 3, coal);
    PX(ctx, x - 2, y - 2, coal);
    PX(ctx, x + 1, y - 2, coal);
    PX(ctx, x + 3, y - 3, coal);

    /* 铁皮桶帽：桶身 + 桶沿 + 顶上的积雪，暗夜里也能看清轮廓 */
    R(ctx, x - 5, y - 19, 11, 5, ink);
    R(ctx, x - 4, y - 18, 9, 4, '#46536e');
    R(ctx, x - 4, y - 18, 9, 1, '#6b7c9e');
    R(ctx, x - 4, y - 18, 1, 4, '#5a6987');
    R(ctx, x - 7, y - 15, 15, 2, ink);
    R(ctx, x - 6, y - 15, 13, 1, '#2f3a52');
    /* 桶沿积雪 */
    R(ctx, x - 5, y - 20, 11, 2, '#eaf6ff');
    R(ctx, x - 4, y - 21, 9, 1, '#ffffff');
    PX(ctx, x - 6, y - 19, '#dceaf6');
    PX(ctx, x + 6, y - 19, '#dceaf6');
    /* 帽檐冰棱 */
    for (var ic = -2; ic <= 2; ic++) {
      if (ic % 2 !== 0) continue;
      R(ctx, x + ic * 2, y - 13, 1, 2, '#cfe4f2');
      PX(ctx, x + ic * 2, y - 11, '#eaf6ff');
    }

    slashFx(ctx, e, x, y, 15);
    hpBar(ctx, e, x, y - 28, 28, '#8fd8ff');
  }

  /* ---------------- 第三关 BOSS：黑化圣诞老人 ----------------
     暗红大衣 + 黑毛边 + 发光红眼 + 冰棱胡须 + 破糖杖 + 背后麻袋 */
  function drawBossSanta(ctx, e, t) {
    var fl = e.flash > 0;
    var bob = Math.sin(t * 1.3 + e.seed * 5) * 1.8;
    var x = Math.round(e.x + (e.kx || 0));
    var y = Math.round(e.y + bob + (e.ky || 0));

    var ink = fl ? '#ffffff' : '#0e0a12';
    var coat = fl ? '#ffffff' : '#6a1620';
    var coatM = fl ? '#ffffff' : '#932734';
    var coatD = fl ? '#ffffff' : '#3c0a12';
    var fur = fl ? '#ffffff' : '#171219';
    var furH = fl ? '#ffffff' : '#2e2636';
    var skin = fl ? '#ffffff' : '#a8bcc8';
    var skinS = fl ? '#ffffff' : '#7d94a4';
    var beard = fl ? '#ffffff' : '#1a1622';
    var beardH = fl ? '#ffffff' : '#302a3e';
    var gold = fl ? '#ffffff' : '#c8a24a';
    var eye = fl ? '#ffffff' : '#ff4a3a';
    var sack = fl ? '#ffffff' : '#4a3a26';
    var sackD = fl ? '#ffffff' : '#2a2016';

    /* 影子 */
    for (var i = 0; i < 5; i++) {
      var sw = 32 - i * 6;
      R(ctx, x - sw, 219 + i, sw * 2, 1, 'rgba(6,4,10,0.34)');
    }

    /* 黑化妖气 + 飘落黑雪 */
    if (!fl) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(x, y - 4, 8, x, y - 4, 56);
      g.addColorStop(0, 'rgba(180,40,60,0.22)');
      g.addColorStop(0.5, 'rgba(90,30,90,0.13)');
      g.addColorStop(1, 'rgba(40,20,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 56, y - 60, 112, 104);
      ctx.restore();
      for (var sp = 0; sp < 10; sp++) {
        var a = t * 0.5 + sp * 0.63;
        var sx2 = x + Math.cos(a) * (26 + (sp % 4) * 5);
        var sy2 = y - 20 + Math.sin(a * 1.3) * 30;
        PX(ctx, sx2, sy2, sp % 3 === 0 ? '#ff7a6a' : '#8e9ab8');
      }
    }

    /* 背后麻袋 */
    disc(ctx, x - 24, y + 2, 14, ink);
    disc(ctx, x - 24, y + 2, 13, sack);
    disc(ctx, x - 27, y - 1, 9, sackD);
    R(ctx, x - 30, y - 12, 9, 3, ink);
    R(ctx, x - 29, y - 11, 7, 2, '#6a5436');
    PX(ctx, x - 22, y + 2, '#6a5436');
    PX(ctx, x - 20, y + 6, '#6a5436');

    /* 破糖杖（右手，先画杆再画手） */
    var stx = x + 25, styTop = y - 34, styBot = y + 22;
    for (var sy = styTop; sy <= styBot; sy++) {
      var band = (Math.floor((sy - styTop) / 4) % 2) === 0;
      R(ctx, stx - 1, sy, 3, 1, ink);
      R(ctx, stx, sy, 1, 1, band ? '#e8f0f8' : '#c0392b');
    }
    /* 断口：顶端炸开的糖渣 */
    R(ctx, stx - 2, styTop - 1, 5, 2, ink);
    PX(ctx, stx - 3, styTop - 3, '#e8f0f8');
    PX(ctx, stx + 2, styTop - 4, '#c0392b');
    PX(ctx, stx, styTop - 5, '#e8f0f8');

    /* 大衣（A 字下摆） */
    for (var yy = -18; yy <= 26; yy++) {
      var u = (yy + 18) / 44;
      var hw = Math.round(11 + u * 9);
      R(ctx, x - hw - 1, y + yy, (hw + 1) * 2, 1, ink);
      R(ctx, x - hw, y + yy, hw * 2, 1, coat);
      R(ctx, x - hw, y + yy, 3, 1, coatD);
      R(ctx, x + hw - 5, y + yy, 5, 1, coatM);
      if (yy > -6 && yy % 8 === 0) R(ctx, x - hw + 2, y + yy, hw * 2 - 4, 1, coatD);
    }
    /* 中缝毛边 */
    R(ctx, x - 3, y - 14, 6, 38, ink);
    R(ctx, x - 2, y - 13, 4, 37, fur);
    R(ctx, x - 2, y - 13, 1, 37, furH);

    /* 腰带 + 骷髅扣 */
    R(ctx, x - 19, y + 8, 38, 6, ink);
    R(ctx, x - 18, y + 9, 36, 4, '#241018');
    R(ctx, x - 5, y + 7, 11, 8, ink);
    R(ctx, x - 4, y + 8, 9, 6, gold);
    R(ctx, x - 3, y + 9, 2, 2, ink);
    R(ctx, x + 2, y + 9, 2, 2, ink);
    R(ctx, x - 2, y + 12, 5, 1, ink);

    /* 下摆黑毛边 + 冰棱 */
    R(ctx, x - 20, y + 24, 40, 5, ink);
    R(ctx, x - 19, y + 24, 38, 3, fur);
    R(ctx, x - 19, y + 24, 38, 1, furH);
    for (var hm = -3; hm <= 3; hm++) {
      var hx = x + hm * 5;
      R(ctx, hx, y + 27, 2, 2, furH);
      if (hm % 2 === 0) {
        R(ctx, hx, y + 29, 1, 3, '#cfe4f2');
        PX(ctx, hx, y + 32, '#eaf6ff');
      }
    }

    /* 双臂 */
    for (var sd = -1; sd <= 1; sd += 2) {
      var swing = Math.sin(t * 1.5 + (sd > 0 ? 0 : 1.4)) * 1.2;
      var ax0 = x + sd * 11, ay0 = y - 13;
      var ax1 = x + sd * 20, ay1 = y + 4 + swing;
      line(ctx, ax0, ay0, ax1, ay1, ink, 6);
      line(ctx, ax0, ay0, ax1, ay1, coat, 4);
      line(ctx, ax0, ay0 + 1, ax1, ay1, coatM, 1);
      /* 毛袖口 + 黑手套 */
      R(ctx, ax1 - 3, ay1 - 2, 7, 4, ink);
      R(ctx, ax1 - 2, ay1 - 2, 5, 3, fur);
      R(ctx, ax1 - 2, ay1 + 1, 5, 4, ink);
      R(ctx, ax1 - 1, ay1 + 1, 3, 3, '#241c2a');
    }

    /* 头部：毛领 + 苍白脸（脸要露出来，否则整个人糊成黑块） */
    var hy = y - 30;
    disc(ctx, x, hy + 3, 12, ink);
    disc(ctx, x, hy + 3, 11, fur);
    disc(ctx, x, hy + 3, 8, furH);
    disc(ctx, x, hy, 9, ink);
    disc(ctx, x, hy, 8, skin);
    disc(ctx, x - 3, hy - 1, 5, '#c4d6e0');
    disc(ctx, x + 4, hy + 2, 4, skinS);
    R(ctx, x - 5, hy + 4, 11, 2, skinS);

    /* 发光红眼 */
    R(ctx, x - 7, hy - 3, 4, 4, ink);
    R(ctx, x + 3, hy - 3, 4, 4, ink);
    R(ctx, x - 6, hy - 2, 2, 2, eye);
    R(ctx, x + 4, hy - 2, 2, 2, eye);
    if (!fl) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var eg = ctx.createRadialGradient(x, hy - 1, 1, x, hy - 1, 12);
      eg.addColorStop(0, 'rgba(255,70,50,0.26)');
      eg.addColorStop(0.6, 'rgba(200,40,40,0.10)');
      eg.addColorStop(1, 'rgba(160,30,30,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(x - 12, hy - 13, 24, 24);
      ctx.restore();
    }
    /* 怒眉 */
    R(ctx, x - 8, hy - 5, 5, 2, beard);
    R(ctx, x + 3, hy - 5, 5, 2, beard);
    PX(ctx, x - 8, hy - 4, beard);
    PX(ctx, x + 7, hy - 4, beard);
    /* 鼻 */
    R(ctx, x - 1, hy + 2, 3, 2, skinS);
    PX(ctx, x - 1, hy + 2, '#cfdfe8');

    /* 大胡子：上宽下尖，锯齿 + 冰棱 */
    for (var by = hy + 5; by <= y - 8; by++) {
      var bu = (by - hy - 5) / (y - 8 - hy - 5);
      var bw = Math.round(7 + bu * 4);
      R(ctx, x - bw, by, bw * 2 + 1, 1, ink);
      R(ctx, x - bw + 1, by, bw * 2 - 1, 1, beard);
      if (bw > 4) R(ctx, x - bw + 2, by, 2, 1, beardH);
    }
    for (var bj = -3; bj <= 3; bj++) {
      var bx2 = x + bj * 3;
      var bhh = 3 + (Math.abs(bj) % 2) * 2;
      R(ctx, bx2, y - 8, 2, bhh, beard);
      if (bj % 2 === 0) {
        R(ctx, bx2, y - 8 + bhh, 1, 3, '#cfe4f2');
        PX(ctx, bx2, y - 5 + bhh, '#eaf6ff');
      }
    }
    /* 獠牙（从胡子里露出来） */
    R(ctx, x - 4, hy + 6, 2, 3, '#e8f0f8');
    R(ctx, x + 3, hy + 6, 2, 3, '#e8f0f8');

    /* 帽子：暗红尖顶 + 黑毛边 + 垂到一侧 */
    for (var hh2 = 0; hh2 < 7; hh2++) {
      var hhw = Math.round(3 + (hh2 / 6) * 9);
      var hyy = hy - 15 + hh2;
      R(ctx, x - hhw, hyy, hhw * 2, 1, ink);
      R(ctx, x - hhw + 1, hyy, hhw * 2 - 2, 1, coat);
      R(ctx, x - hhw + 1, hyy, 2, 1, coatD);
    }
    /* 毛边（压住帽子下沿，别盖到眼睛） */
    R(ctx, x - 11, hy - 9, 23, 4, ink);
    R(ctx, x - 10, hy - 9, 21, 2, fur);
    R(ctx, x - 10, hy - 9, 21, 1, furH);
    /* 帽尖垂球 */
    R(ctx, x + 9, hy - 19, 5, 4, coat);
    R(ctx, x + 11, hy - 16, 5, 4, coatD);
    disc(ctx, x + 15, hy - 14, 3, ink);
    disc(ctx, x + 15, hy - 14, 2, '#3a3448');
    PX(ctx, x + 14, hy - 15, '#6a6480');

    slashFx(ctx, e, x, y, 30);
  }

  /* 不同地图的妖物绘制与图鉴配置。 */
  var creatures = global.createArcadeCreatureArt({ R: R, PX: PX, disc: disc, line: line, leafPx: leafPx, slashFx: slashFx, arcadePixelPoly: arcadePixelPoly });
  var SPECIES = creatures.SPECIES, drawCreature = creatures.drawCreature;

  /* ---------------- 敌人分发：按关卡换皮 ---------------- */

  function curKind(e) {
    var world = backgrounds.currentWorld();
    return e.kind || (world && world.id) || 1;
  }

  function drawBoss(ctx, e, t) {
    var k = curKind(e);
    if (typeof k === 'string' && SPECIES[k]) { drawCreature(ctx, e, t, SPECIES[k]); return; }
    if (k === 2) drawBossLantern(ctx, e, t);
    else if (k === 3) drawBossSanta(ctx, e, t);
    else drawBossLeaf(ctx, e, t);
  }

  function drawEnemy(ctx, e, t) {
    if (e.elite) { drawBoss(ctx, e, t); return; }
    var k = curKind(e);
    if (typeof k === 'string' && SPECIES[k]) { drawCreature(ctx, e, t, SPECIES[k]); return; }
    if (k === 2) drawLanternMob(ctx, e, t);
    else if (k === 3) drawSnowman(ctx, e, t);
    else drawEnemyLeaf(ctx, e, t);
  }

  /* ---------------- 特效 ---------------- */

  function drawSlash(ctx, sl) {
    var prog = sl.t / sl.dur;
    var r = sl.r + prog * (sl.grow == null ? 8 : sl.grow);
    var a0 = sl.a0, a1 = sl.a1;
    var alpha = 1 - prog;
    if (alpha <= 0) return;
    var cCore = sl.c1 || '#ffffff';
    var cEdge = sl.c2 || '#bfefff';
    var cTrail = sl.c3 || '#5fb8c8';
    var wid = sl.w == null ? 1 : sl.w;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (var a = a0; a <= a1; a += 0.055) {
      var k = Math.sin((a - a0) / (a1 - a0) * Math.PI);
      var w = (1 + k * 3) * wid;
      var x = sl.x + Math.cos(a) * r;
      var y = sl.y + Math.sin(a) * r;
      R(ctx, x - w / 2, y - w / 2, w, w, cCore);
      var x2 = sl.x + Math.cos(a) * (r - 3);
      var y2 = sl.y + Math.sin(a) * (r - 3);
      R(ctx, x2 - 1, y2 - 1, 2, 2, cEdge);
      var x3 = sl.x + Math.cos(a) * (r - 6);
      var y3 = sl.y + Math.sin(a) * (r - 6);
      R(ctx, x3, y3, 1, 1, cTrail);
    }
    ctx.restore();
  }

  function glow(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ditherDisc(ctx, x, y, r, color, 0.5, 1);
    ditherDisc(ctx, x, y, r * 0.6, color, 0.75, 2);
    ctx.restore();
  }

  global.Art = {
    PAL: PAL,
    init: init,
    setWorld: setWorld,
    SPECIES: SPECIES, THEMES: THEMES,
    R: R, PX: PX, disc: disc, line: line, ditherDisc: ditherDisc,
    drawBackground: drawBackground,
    drawVignette: drawVignette,
    drawPlayer: drawPlayer,
    drawEnemy: drawEnemy,
    drawSlash: drawSlash,
    leafPx: leafPx,
    glow: glow,
    hash2: hash2,
    mulberry32: mulberry32
  };
})(window);
