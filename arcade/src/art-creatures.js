/* 妖物图鉴及不同体型的像素绘制。 */
(function (global) {
  'use strict';
  global.createArcadeCreatureArt = function (d) {
  var R = d.R, PX = d.PX, disc = d.disc, line = d.line, leafPx = d.leafPx, slashFx = d.slashFx, arcadePixelPoly = d.arcadePixelPoly;
  /* ================= 4-20 关妖物图鉴：参数化生成 =================
     每关一只小怪 + 一只妖王，形体、配色、配件都不同 */

  var SPECIES = {
    /* ---- 小怪 ---- */
    peach: { body: 'plant', pal: ['#2e0a16', '#7a1a34', '#e04a72', '#ffd0e0'], eye: '#fff0f4', stem: '#3a2a1a', feat: ['petals'], s: 1.0 },
    lotus: { body: 'plant', pal: ['#06201e', '#1a5a4a', '#4ac09a', '#c8f0dc'], eye: '#eaffe8', stem: '#2a4a2a', feat: ['petals', 'water'], s: 1.0 },
    sandworm: { body: 'insect', pal: ['#3a2410', '#b07a3a', '#d8a45a', '#f0cc8a'], eye: '#ffe6a0', feat: ['dust'], s: 1.0 },
    paperdoll: { body: 'humanoid', pal: ['#4a3a4a', '#d8d0c0', '#f0e8d8', '#fffaf0'], eye: '#c0392b', feat: ['paper'], s: 1.0 },
    firelizard: { body: 'beast', pal: ['#3a0a08', '#b8341e', '#e86a2a', '#ffb05a'], eye: '#fff0a0', feat: ['ember'], s: 1.0 },
    waterghost: { body: 'ghost', pal: ['#0e2a3a', '#2a6a8a', '#5aa8c8', '#a8e0f0'], eye: '#d8f8ff', feat: ['drip'], s: 1.0 },
    swordspirit: { body: 'object', pal: ['#1a1e26', '#5a6a7a', '#9aaab8', '#e0ecf4'], eye: '#9fe8ff', feat: ['blade'], s: 1.0 },
    thunderbeast: { body: 'beast', pal: ['#101828', '#2a3a6a', '#5a7ac8', '#ffe06a'], eye: '#fff8b0', feat: ['spark'], s: 1.0 },
    herbsprite: { body: 'plant', pal: ['#1a2a14', '#4a7a2a', '#8ac04a', '#d8e88a'], eye: '#f0ffb0', feat: ['spore'], s: 1.0 },
    muralfairy: { body: 'humanoid', pal: ['#3a2a12', '#a87a32', '#d8a850', '#f8e0a0'], eye: '#fff4c0', feat: ['ribbon'], s: 1.0 },
    icesoldier: { body: 'humanoid', pal: ['#0e2230', '#2a6a8a', '#6ab0d0', '#c8f0ff'], eye: '#eaffff', feat: ['shard'], s: 1.0 },
    hangedghost: { body: 'ghost', pal: ['#16200e', '#3a5a2a', '#6a8a4a', '#a8c880'], eye: '#e0ffb0', feat: ['rope'], s: 1.0 },
    starbug: { body: 'insect', pal: ['#1a1030', '#4a2a7a', '#8a5ac8', '#d0a8ff'], eye: '#f0e0ff', feat: ['star'], s: 1.0 },
    bellspirit: { body: 'object', pal: ['#1a2a2a', '#6a6a3a', '#b8a860', '#f0e0a0'], eye: '#fff0b0', feat: ['bell'], s: 1.0 },
    bloodbat: { body: 'beast', pal: ['#2a0410', '#8a1020', '#c83040', '#ff7a8a'], eye: '#ffd0d8', feat: ['wing'], s: 1.0 },
    hellfire: { body: 'ghost', pal: ['#0a1a10', '#1a5a3a', '#4ac878', '#b0ffd0'], eye: '#e0fff0', feat: ['flame'], s: 1.0 },
    cloudgeneral: { body: 'humanoid', pal: ['#3a4250', '#8a9ab0', '#c8d8e8', '#ffffff'], eye: '#fff8d0', feat: ['cloud', 'spear'], s: 1.0 },

    /* ---- 妖王 ---- */
    peachQueen: { body: 'humanoid', pal: ['#4a1428', '#c04a72', '#f080a8', '#ffd8e8'], eye: '#fff0f4', feat: ['petals', 'crown'], s: 1.75 },
    lotusKing: { body: 'plant', pal: ['#0a2a2a', '#1f6a5a', '#5ab898', '#b0f0d8'], eye: '#e0fff0', feat: ['petals', 'crown', 'water'], s: 1.8 },
    scorpionKing: { body: 'beast', pal: ['#3a2410', '#8a5a24', '#c08a3a', '#f0cc7a'], eye: '#ffe060', feat: ['tail', 'claw', 'crown'], s: 1.8 },
    paperGranny: { body: 'humanoid', pal: ['#3a2a3a', '#c8bca8', '#e8dcc8', '#fffaf0'], eye: '#c0392b', feat: ['paper', 'crown', 'masks'], s: 1.8 },
    lavaGiant: { body: 'humanoid', pal: ['#2a0604', '#8a2410', '#d84a18', '#ffb03a'], eye: '#fff0a0', feat: ['lava', 'crown', 'fist'], s: 1.95 },
    riverLord: { body: 'ghost', pal: ['#08202e', '#1a5a7a', '#4a9ac0', '#a8e0f0'], eye: '#d8f8ff', feat: ['drip', 'crown', 'masks'], s: 1.85 },
    swordLord: { body: 'object', pal: ['#12161e', '#3a4a5a', '#7a8a9a', '#e0ecf4'], eye: '#9fe8ff', feat: ['blade', 'swords', 'crown'], s: 1.9 },
    thunderLord: { body: 'beast', pal: ['#080e1a', '#1a2a5a', '#4a6ac8', '#ffe06a'], eye: '#fff8b0', feat: ['spark', 'crown', 'horns'], s: 1.85 },
    herbKing: { body: 'plant', pal: ['#101a0c', '#2a5a1a', '#6aa02a', '#d0e07a'], eye: '#f0ffb0', feat: ['spore', 'crown', 'vines'], s: 1.8 },
    deerKing: { body: 'beast', pal: ['#2a2010', '#9a7a2a', '#d8b050', '#fff0b0'], eye: '#fff8d0', feat: ['antler', 'crown', 'ribbon'], s: 1.85 },
    frostKing: { body: 'humanoid', pal: ['#0a1a26', '#1a5a7a', '#4aa0c8', '#c8f0ff'], eye: '#eaffff', feat: ['shard', 'crown', 'cape'], s: 1.95 },
    treeMother: { body: 'plant', pal: ['#0e1a0c', '#2a4a1a', '#5a7a32', '#a0c070'], eye: '#d0ff90', feat: ['vines', 'crown', 'rope'], s: 2.0 },
    meteorGolem: { body: 'object', pal: ['#1a1020', '#4a2a4a', '#8a4a6a', '#ff8a5a'], eye: '#ffd0a0', feat: ['rock', 'crown', 'lava'], s: 1.95 },
    bellLord: { body: 'object', pal: ['#141e1e', '#5a5a2a', '#b8a050', '#f8e8a8'], eye: '#fff0b0', feat: ['bell', 'crown', 'masks'], s: 1.85 },
    bloodLord: { body: 'beast', pal: ['#1a0208', '#6a0a18', '#b82030', '#ff6a7a'], eye: '#ffd0d8', feat: ['wing', 'crown', 'horns'], s: 1.9 },
    judge: { body: 'ghost', pal: ['#080e08', '#1a3a1a', '#3a7a3a', '#a0e080'], eye: '#e0ffb0', feat: ['flame', 'crown', 'masks'], s: 1.95 },
    demonEmperor: { body: 'humanoid', pal: ['#1a1a28', '#4a4a6a', '#8a8ab0', '#f0f0ff'], eye: '#ffe060', feat: ['cloud', 'crown', 'spear', 'cape'], s: 2.1 },

    /* ================= Arcade：五套专属像素角色 ================= */
    candy: { arcade: true, arc: 'candy', arcSize: 1.42, pal: ['#883e70', '#e9579a', '#ffaad0', '#fff0f7'], eye: '#34203f' },
    balloon: { arcade: true, arc: 'balloon', arcSize: 1.38, pal: ['#964322', '#ed713c', '#ffc060', '#fff0bc'], eye: '#38252e' },
    cupcake: { arcade: true, arc: 'cupcake', arcSize: 1.43, pal: ['#80502e', '#c77d42', '#f3ba6c', '#fff0bd'], eye: '#35232d' },
    lollipop: { arcade: true, arc: 'lollipop', arcSize: 1.40, pal: ['#79234c', '#dd3f82', '#ff86ae', '#ffe8a8'], eye: '#33203a' },
    eraser: { arcade: true, arc: 'eraser', arcSize: 1.40, pal: ['#792f56', '#df5f88', '#ffabc1', '#ffeaf0'], eye: '#342139' },
    pencil: { arcade: true, arc: 'pencil', arcSize: 1.44, pal: ['#765015', '#d99a22', '#ffd34e', '#fff0a2'], eye: '#35261c' },
    inkpot: { arcade: true, arc: 'inkpot', arcSize: 1.40, pal: ['#172a45', '#2d6085', '#64a9cf', '#d8f3ff'], eye: '#e6fbff' },
    ruler: { arcade: true, arc: 'ruler', arcSize: 1.38, pal: ['#795727', '#c18a40', '#f0ca69', '#fff1b5'], eye: '#35261c' },
    snowball: { arcade: true, arc: 'snowball', arcSize: 1.40, pal: ['#496a81', '#9ac7da', '#e1f5fc', '#ffffff'], eye: '#243f58' },
    scarf: { arcade: true, arc: 'scarf', arcSize: 1.38, pal: ['#702634', '#c74254', '#f37a7d', '#ffe0b0'], eye: '#3c202a' },
    broom: { arcade: true, arc: 'broom', arcSize: 1.40, pal: ['#62442a', '#a7763e', '#e2bd69', '#fff0ad'], eye: '#34251d' },
    icicle: { arcade: true, arc: 'icicle', arcSize: 1.42, pal: ['#28627c', '#48a3c3', '#9de3f1', '#efffff'], eye: '#17455e' },
    icecrystal: { arcade: true, arc: 'crystal', arcSize: 1.41, pal: ['#174c72', '#2787a8', '#64d0dc', '#e0ffff'], eye: '#173b61' },
    snowrabbit: { arcade: true, arc: 'rabbit', arcSize: 1.36, pal: ['#536b83', '#a7c4d8', '#e8f4f8', '#ffffff'], eye: '#294157' },
    icecone: { arcade: true, arc: 'icecone', arcSize: 1.43, pal: ['#285a76', '#418fb1', '#8fd3e4', '#efffff'], eye: '#193c58' },
    frostflower: { arcade: true, arc: 'frostflower', arcSize: 1.40, pal: ['#245c7e', '#3b91bb', '#75d2e3', '#e5ffff'], eye: '#173c5b' },
    sandpuff: { arcade: true, arc: 'sandpuff', arcSize: 1.42, pal: ['#75502b', '#bd873d', '#efd078', '#fff0ad'], eye: '#402b20' },
    cactus: { arcade: true, arc: 'cactus', arcSize: 1.40, pal: ['#254d35', '#43874a', '#8fc45c', '#f7d26c'], eye: '#193526' },
    beetle: { arcade: true, arc: 'beetle', arcSize: 1.40, pal: ['#59371b', '#98602b', '#d49a42', '#ffe293'], eye: '#35251b' },
    tumbleweed: { arcade: true, arc: 'tumbleweed', arcSize: 1.40, pal: ['#654323', '#a97537', '#d9ac60', '#ffe8a3'], eye: '#35251b' },

    carouselKing: { arcade: true, arc: 'carouselKing', arcSize: 1.78, pal: ['#632453', '#cf3977', '#ff83ab', '#ffe6a6'], eye: '#301d3a' },
    boardGiant: { arcade: true, arc: 'boardGiant', arcSize: 1.76, pal: ['#173d37', '#286b59', '#63a678', '#f4db87'], eye: '#fff2bd' },
    snowPrincipal: { arcade: true, arc: 'snowPrincipal', arcSize: 1.76, pal: ['#34536c', '#7eabc0', '#d6eef6', '#fff4cf'], eye: '#263e59' },
    iceDragon: { arcade: true, arc: 'iceDragon', arcSize: 1.82, pal: ['#143e63', '#267da1', '#55bfd0', '#d9ffff'], eye: '#ffdf8b' },
    sandPharaoh: { arcade: true, arc: 'sandPharaoh', arcSize: 1.80, pal: ['#593618', '#a76b27', '#e4b84b', '#fff0a1'], eye: '#3a2419' }
  };

  function spPal(sp, fl) {
    if (fl) return { d: '#ffffff', m: '#ffffff', h: '#ffffff', hi: '#ffffff', eye: '#ffffff' };
    var p = sp.pal;
    return { d: p[0], m: p[1], h: p[2], hi: p[3], eye: sp.eye || '#ffffff' };
  }

  /* ---- 形体：团 ---- */
  function bodyBlob(ctx, x, y, t, e, sp, C, s) {
    var rx = 9 * s, ry = 8 * s;
    disc(ctx, x, y, ry + 1.5, C.d);
    for (var yy = -Math.round(ry); yy <= Math.round(ry); yy++) {
      var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / ry) * (yy / ry))));
      if (w <= 0) continue;
      R(ctx, x - w, y + yy, w * 2, 1, C.m);
      R(ctx, x - w, y + yy, Math.max(1, Math.round(w * 0.34)), 1, C.d);
      if (w > 3) R(ctx, x + w - 2, y + yy, 2, 1, C.h);
    }
    /* 底部波浪 */
    for (var k = -3; k <= 3; k++) {
      var bx = x + k * 3 * s;
      var by = y + ry - 1 + Math.sin(t * 4 + k) * 1.2;
      R(ctx, bx, by, 3 * s, 2 * s, C.m);
      R(ctx, bx, by + 1.6 * s, 3 * s, 1, C.d);
    }
    face(ctx, x, y, sp, C, s, 1);
  }

  /* ---- 形体：鬼（披风 + 飘尾） ---- */
  function bodyGhost(ctx, x, y, t, e, sp, C, s) {
    var w0 = 8.5 * s, h = 13 * s;
    for (var yy = -Math.round(h); yy <= Math.round(h); yy++) {
      var u = (yy + h) / (h * 2);
      var w = Math.round(w0 * (0.55 + 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.05))));
      if (yy > h * 0.35) {
        var wave = Math.sin(t * 3 + yy * 0.5) * 1.6;
        w = Math.max(1, w + Math.round(wave));
      }
      R(ctx, x - w, y + yy, w * 2, 1, C.d);
      R(ctx, x - w + 1, y + yy, w * 2 - 2, 1, C.m);
      R(ctx, x - w + 1, y + yy, Math.max(1, Math.round(w * 0.3)), 1, C.d);
      if (w > 4) R(ctx, x + w - 3, y + yy, 2, 1, C.h);
    }
    /* 飘带尾 */
    for (var k = -1; k <= 1; k++) {
      var tx = x + k * 4 * s + Math.sin(t * 2.4 + k) * 2;
      R(ctx, tx, y + h, 2 * s, 3 * s, C.m);
    }
    face(ctx, x, y - 2 * s, sp, C, s, 1);
  }

  /* ---- 形体：兽 ---- */
  function bodyBeast(ctx, x, y, t, e, sp, C, s) {
    var bw = 11 * s, bh = 7 * s;
    /* 四腿 */
    for (var lg = -1; lg <= 1; lg += 2) {
      R(ctx, x + lg * 6 * s - 1.5 * s, y + bh - 1, 3 * s, 6 * s, C.d);
      R(ctx, x + lg * 6 * s - 1 * s, y + bh, 2 * s, 5 * s, C.m);
    }
    /* 尾 */
    line(ctx, x - bw + 1, y, x - bw - 5 * s, y - 4 * s + Math.sin(t * 3) * 2, C.m, Math.max(1, Math.round(2 * s)));
    /* 身 */
    disc(ctx, x, y, bh + 1, C.d);
    disc(ctx, x, y, bh, C.m);
    disc(ctx, x - 2 * s, y - 2 * s, bh * 0.55, C.h);
    /* 头 */
    var hx = x + bw * 0.72, hy = y - 5 * s;
    disc(ctx, hx, hy, 5 * s, C.d);
    disc(ctx, hx, hy, 4.2 * s, C.m);
    /* 耳 / 角 */
    R(ctx, hx - 3 * s, hy - 6 * s, 2 * s, 3 * s, C.d);
    R(ctx, hx + 2 * s, hy - 6 * s, 2 * s, 3 * s, C.d);
    R(ctx, hx - 3 * s, hy - 6 * s, 1 * s, 2 * s, C.h);
    R(ctx, hx + 2 * s, hy - 6 * s, 1 * s, 2 * s, C.h);
    /* 眼 + 嘴 */
    R(ctx, hx - 2 * s, hy - 1 * s, 2 * s, 2 * s, C.eye);
    R(ctx, hx + 1 * s, hy - 1 * s, 2 * s, 2 * s, C.eye);
    R(ctx, hx - 1 * s, hy + 2 * s, 4 * s, 1, C.d);
    for (var f = 0; f < 2; f++) PX(ctx, hx + f * 3 * s - 1, hy + 2 * s, '#f0e2c0');
    /* 背部纹 */
    R(ctx, x - 3 * s, y - bh - 1, 6 * s, 1, C.hi);
  }

  /* ---- 形体：人形（袍 + 头 + 手） ---- */
  function bodyHumanoid(ctx, x, y, t, e, sp, C, s) {
    var top = -14 * s, bot = 14 * s;
    for (var yy = Math.round(top); yy <= Math.round(bot); yy++) {
      var u = (yy - top) / (bot - top);
      var w = Math.round((4.5 + u * 6.5) * s);
      R(ctx, x - w, y + yy, w * 2, 1, C.d);
      R(ctx, x - w + 1, y + yy, w * 2 - 2, 1, C.m);
      R(ctx, x - w + 1, y + yy, Math.max(1, Math.round(w * 0.4)), 1, C.d);
      if (w > 4) R(ctx, x + w - 3, y + yy, 2, 1, C.h);
      if (yy % Math.max(4, Math.round(7 * s)) === 0) R(ctx, x - w + 2, y + yy, w * 2 - 4, 1, C.d);
    }
    /* 手 */
    var sw = Math.sin(t * 2 + e.seed) * 2 * s;
    for (var sd = -1; sd <= 1; sd += 2) {
      line(ctx, x + sd * 6 * s, y - 8 * s, x + sd * 9 * s, y + 2 * s + sw * sd, C.m, Math.max(1, Math.round(2 * s)));
      R(ctx, x + sd * 9 * s - 1.5 * s, y + 2 * s + sw * sd, 3 * s, 3 * s, C.h);
    }
    /* 头 */
    var hy = y - 12 * s;
    disc(ctx, x, hy, 6 * s, C.d);
    disc(ctx, x, hy, 5 * s, C.hi);
    disc(ctx, x - 1.5 * s, hy - 1 * s, 3 * s, C.h);
    /* 发 / 冠 */
    R(ctx, x - 6 * s, hy - 6 * s, 12 * s, 3 * s, C.d);
    face(ctx, x, hy + 1 * s, sp, C, s, 0.85);
  }

  /* ---- 形体：虫 ---- */
  function bodyInsect(ctx, x, y, t, e, sp, C, s) {
    var segs = 4;
    for (var i = segs - 1; i >= 0; i--) {
      var px2 = x + (i - 1.5) * 4.2 * s;
      var py2 = y + Math.sin(t * 3 + i * 0.9) * 1.2 * s;
      var rr = (5.2 - i * 0.55) * s;
      disc(ctx, px2, py2, rr + 1, C.d);
      disc(ctx, px2, py2, rr, C.m);
      disc(ctx, px2 - rr * 0.3, py2 - rr * 0.35, rr * 0.5, C.h);
    }
    /* 触角 */
    line(ctx, x + 6 * s, y - 4 * s, x + 10 * s, y - 9 * s, C.m, Math.max(1, Math.round(1.5 * s)));
    line(ctx, x + 7 * s, y - 4 * s, x + 12 * s, y - 6 * s, C.m, Math.max(1, Math.round(1.5 * s)));
    PX(ctx, x + 10 * s, y - 9 * s, C.hi);
    PX(ctx, x + 12 * s, y - 6 * s, C.hi);
    /* 眼 */
    R(ctx, x + 5 * s, y - 3 * s, 2 * s, 2 * s, C.eye);
    R(ctx, x + 8 * s, y - 2 * s, 2 * s, 2 * s, C.eye);
    /* 小腿 */
    for (var l = 0; l < 3; l++) {
      var lx = x - 2 * s + l * 3 * s;
      line(ctx, lx, y + 4 * s, lx - 2 * s, y + 8 * s, C.d, Math.max(1, Math.round(1.4 * s)));
    }
  }

  /* ---- 形体：草木 ---- */
  function bodyPlant(ctx, x, y, t, e, sp, C, s) {
    /* 茎 */
    var stemC = sp.stem || '#2e4a22';
    R(ctx, x - 1.2 * s, y, 2.4 * s, 10 * s, stemC);
    R(ctx, x - 1.2 * s, y, 1, 10 * s, C.d);
    /* 叶 */
    leafPx(ctx, x - 3 * s, y + 6 * s, -2.4, 7 * s, stemC, C.d);
    leafPx(ctx, x + 3 * s, y + 8 * s, -0.7, 6 * s, stemC, C.d);
    /* 花冠 / 伞盖 */
    var cy = y - 4 * s, n = 7;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.52 + Math.sin(t * 2 + i) * 0.05;
      var px2 = x + Math.cos(a) * 7.5 * s;
      var py2 = cy + Math.sin(a) * 5.5 * s;
      disc(ctx, px2, py2, 4.2 * s, C.d);
      disc(ctx, px2, py2, 3.4 * s, C.h);
      disc(ctx, px2 - 1 * s, py2 - 1 * s, 1.8 * s, C.hi);
    }
    disc(ctx, x, cy + 1 * s, 4.6 * s, C.m);
    disc(ctx, x, cy + 1 * s, 3.4 * s, C.hi);
    face(ctx, x, cy + 1.5 * s, sp, C, s, 0.9);
  }

  /* ---- 形体：器物（剑 / 钟 / 石） ---- */
  function bodyObject(ctx, x, y, t, e, sp, C, s) {
    if (sp.feat && sp.feat.indexOf('bell') >= 0) {
      /* 钟 */
      for (var yy = -12 * s; yy <= 9 * s; yy++) {
        var u = (yy + 12 * s) / (21 * s);
        var w = Math.round((3 + u * 8) * s);
        R(ctx, x - w, y + yy, w * 2, 1, C.d);
        R(ctx, x - w + 1, y + yy, w * 2 - 2, 1, C.m);
        R(ctx, x - w + 1, y + yy, Math.max(1, Math.round(w * 0.35)), 1, C.d);
        if (w > 4) R(ctx, x + w - 3, y + yy, 2, 1, C.h);
      }
      R(ctx, x - 10 * s, y + 9 * s, 20 * s, 2 * s, C.d);
      R(ctx, x - 1 * s, y - 14 * s, 2 * s, 3 * s, C.h);
      face(ctx, x, y, sp, C, s, 1);
      return;
    }
    if (sp.feat && sp.feat.indexOf('blade') >= 0) {
      /* 剑灵：竖直长剑 + 鬼面 */
      R(ctx, x - 3 * s, y - 14 * s, 6 * s, 26 * s, C.d);
      R(ctx, x - 2 * s, y - 13 * s, 4 * s, 24 * s, C.m);
      R(ctx, x - 2 * s, y - 13 * s, 1, 24 * s, C.hi);
      R(ctx, x - 7 * s, y + 8 * s, 14 * s, 3 * s, C.h);
      R(ctx, x - 1 * s, y + 11 * s, 2 * s, 6 * s, C.d);
      disc(ctx, x, y - 15 * s, 4 * s, C.d);
      disc(ctx, x, y - 15 * s, 3.2 * s, C.h);
      face(ctx, x, y - 15 * s, sp, C, s, 0.8);
      return;
    }
    /* 石魔：堆叠岩块 */
    disc(ctx, x, y + 4 * s, 9 * s, C.d);
    disc(ctx, x, y + 4 * s, 8 * s, C.m);
    disc(ctx, x - 3 * s, y + 1 * s, 5 * s, C.h);
    disc(ctx, x + 2 * s, y - 8 * s, 6 * s, C.d);
    disc(ctx, x + 2 * s, y - 8 * s, 5 * s, C.m);
    face(ctx, x + 2 * s, y - 8 * s, sp, C, s, 0.9);
  }

  /* 通用五官 */
  function face(ctx, x, y, sp, C, s, k) {
    k = k || 1;
    var ew = Math.max(2, Math.round(2.6 * s * k));
    var eh = Math.max(2, Math.round(2.6 * s * k));
    R(ctx, x - Math.round(4 * s * k), y - 1, ew, eh, C.d);
    R(ctx, x + Math.round(2 * s * k), y - 1, ew, eh, C.d);
    R(ctx, x - Math.round(4 * s * k), y - 1, Math.max(1, ew - 1), Math.max(1, eh - 1), C.eye);
    R(ctx, x + Math.round(2 * s * k), y - 1, Math.max(1, ew - 1), Math.max(1, eh - 1), C.eye);
    /* 嘴 */
    R(ctx, x - Math.round(3 * s * k), y + Math.round(3 * s * k), Math.round(6 * s * k), 1, C.d);
  }

  var BODY_FN = {
    blob: bodyBlob, ghost: bodyGhost, beast: bodyBeast,
    humanoid: bodyHumanoid, insect: bodyInsect, plant: bodyPlant, object: bodyObject
  };

  /* 配件 */
  function drawFeat(ctx, f, x, y, t, e, sp, C, s) {
    if (f === 'crown') {
      R(ctx, x - 7 * s, y - 2 * s, 15 * s, 2 * s, C.d);
      for (var i = -1; i <= 1; i++) {
        R(ctx, x + i * 5 * s - 1, y - 6 * s, 2 * s, 5 * s, C.hi);
        PX(ctx, x + i * 5 * s - 1, y - 7 * s, '#fff0a0');
      }
    } else if (f === 'horns') {
      for (var sd = -1; sd <= 1; sd += 2) {
        line(ctx, x + sd * 4 * s, y, x + sd * 8 * s, y - 7 * s, C.h, Math.max(1, Math.round(2 * s)));
        PX(ctx, x + sd * 8 * s, y - 8 * s, C.hi);
      }
    } else if (f === 'wing') {
      for (var wd = -1; wd <= 1; wd += 2) {
        var flap = Math.sin(t * 6 + wd) * 3 * s;
        ctx.save();
        ctx.globalAlpha = 0.85;
        for (var k = 0; k < 4; k++) {
          line(ctx, x + wd * 3 * s, y - 3 * s, x + wd * (10 + k * 3) * s, y - 6 * s + flap + k * 2 * s, C.m, Math.max(1, Math.round(1.5 * s)));
        }
        ctx.restore();
      }
    } else if (f === 'antler') {
      for (var ad = -1; ad <= 1; ad += 2) {
        line(ctx, x + ad * 3 * s, y - 10 * s, x + ad * 7 * s, y - 18 * s, C.h, Math.max(1, Math.round(1.6 * s)));
        line(ctx, x + ad * 5 * s, y - 14 * s, x + ad * 9 * s, y - 15 * s, C.h, 1);
      }
    } else if (f === 'petals') {
      for (var p = 0; p < 6; p++) {
        var a = t * 0.8 + p * 1.05;
        var px2 = x + Math.cos(a) * 14 * s;
        var py2 = y - 8 * s + Math.sin(a * 1.2) * 8 * s;
        leafPx(ctx, px2, py2, a + 1.2, 4 * s, C.hi, C.m);
      }
    } else if (f === 'spark') {
      for (var q = 0; q < 3; q++) {
        var aa = t * 5 + q * 2.1;
        line(ctx, x + Math.cos(aa) * 12 * s, y - 4 * s + Math.sin(aa) * 8 * s,
          x + Math.cos(aa) * 16 * s, y - 4 * s + Math.sin(aa) * 11 * s, '#ffe06a', 1);
      }
    } else if (f === 'flame' || f === 'lava' || f === 'ember') {
      for (var fi = -2; fi <= 2; fi++) {
        var fh = (5 + Math.sin(t * 8 + fi) * 2) * s;
        var fx = x + fi * 3 * s;
        for (var fy = 0; fy < fh; fy++) {
          var w2 = Math.max(1, Math.round((2 - Math.abs(fi) * 0.4) * s * (1 - fy / fh)));
          R(ctx, fx - w2, y + 8 * s - fy, w2 * 2, 1, fy < fh * 0.4 ? C.hi : C.h);
        }
      }
    } else if (f === 'shard') {
      for (var si = 0; si < 4; si++) {
        var sx = x + (si - 1.5) * 5 * s;
        var sh = (4 + (si % 2) * 3) * s;
        R(ctx, sx, y + 10 * s, 2 * s, sh, C.hi);
        PX(ctx, sx, y + 10 * s + sh, '#eaf6ff');
      }
    } else if (f === 'paper' || f === 'masks') {
      for (var mi = 0; mi < 3; mi++) {
        var ma = t * 1.1 + mi * 2.1;
        var mx = x + Math.cos(ma) * 15 * s;
        var my = y - 10 * s + Math.sin(ma * 0.9) * 9 * s;
        R(ctx, mx - 3 * s, my - 3 * s, 7 * s, 7 * s, C.d);
        R(ctx, mx - 2 * s, my - 2 * s, 5 * s, 5 * s, '#f0e8d8');
        PX(ctx, mx - 1 * s, my - 1 * s, '#3a2a2a');
        PX(ctx, mx + 1 * s, my - 1 * s, '#3a2a2a');
      }
    } else if (f === 'star') {
      for (var st = 0; st < 4; st++) {
        var sa = t * 1.6 + st * 1.57;
        var sxx = x + Math.cos(sa) * 13 * s;
        var syy = y - 6 * s + Math.sin(sa) * 9 * s;
        PX(ctx, sxx, syy, C.hi);
        PX(ctx, sxx - 1, syy, C.h);
        PX(ctx, sxx + 1, syy, C.h);
      }
    } else if (f === 'rope') {
      line(ctx, x, y - 16 * s, x, y - 26 * s, '#5a4a2a', Math.max(1, Math.round(1.5 * s)));
      R(ctx, x - 2 * s, y - 28 * s, 5 * s, 2 * s, '#3a2a14');
    } else if (f === 'ribbon' || f === 'cape') {
      for (var rb2 = -1; rb2 <= 1; rb2 += 2) {
        var rx2 = x + rb2 * 9 * s;
        var ry2 = y - 4 * s;
        for (var seg = 0; seg < 6; seg++) {
          var ox = Math.sin(t * 2.6 + seg * 0.7 + rb2) * 3 * s;
          R(ctx, rx2 + ox + rb2 * seg * 2 * s, ry2 + seg * 3 * s, 3 * s, 3 * s, seg % 2 ? C.h : C.hi);
        }
      }
    } else if (f === 'cloud') {
      for (var ci = 0; ci < 3; ci++) {
        var cxx = x + (ci - 1) * 12 * s + Math.sin(t + ci) * 3;
        disc(ctx, cxx, y + 12 * s, 5 * s, 'rgba(230,240,255,0.5)');
        disc(ctx, cxx, y + 12 * s, 3.5 * s, 'rgba(255,255,255,0.65)');
      }
    } else if (f === 'swords' || f === 'spear') {
      for (var wi = -1; wi <= 1; wi++) {
        var wx = x + wi * 10 * s;
        line(ctx, wx, y + 10 * s, wx, y - 16 * s, C.h, Math.max(1, Math.round(1.4 * s)));
        PX(ctx, wx, y - 17 * s, C.hi);
      }
    } else if (f === 'vines') {
      for (var vi = -2; vi <= 2; vi++) {
        var vx = x + vi * 6 * s;
        for (var vs = 0; vs < 4; vs++) {
          PX(ctx, vx + Math.sin(t * 2 + vs + vi) * 2, y + 8 * s + vs * 3 * s, C.h);
        }
      }
    } else if (f === 'rock') {
      disc(ctx, x - 10 * s, y + 6 * s, 4 * s, C.h);
      disc(ctx, x + 11 * s, y + 4 * s, 3.5 * s, C.h);
    } else if (f === 'dust' || f === 'spore') {
      for (var di = 0; di < 6; di++) {
        var da = t * 1.2 + di * 1.05;
        PX(ctx, x + Math.cos(da) * 13 * s, y + 8 * s + Math.sin(da * 1.3) * 5 * s, C.hi);
      }
    } else if (f === 'drip') {
      for (var dr = 0; dr < 3; dr++) {
        var dy = ((t * 20 + dr * 9) % 22);
        PX(ctx, x + (dr - 1) * 5 * s, y + 10 * s + dy, C.hi);
      }
    } else if (f === 'water') {
      for (var wa = 0; wa < 3; wa++) {
        var wy = y + 11 * s + wa * 2;
        R(ctx, x - (10 - wa * 2) * s, wy, (20 - wa * 4) * s, 1, 'rgba(160,230,255,0.35)');
      }
    }
  }

  function arcadeR(ctx, x, y, w, h, c, s) {
    R(ctx, Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), c);
  }

  function arcadeL(ctx, x0, y0, x1, y1, c, th, s) {
    line(ctx, Math.round(x0 * s), Math.round(y0 * s), Math.round(x1 * s), Math.round(y1 * s), c, Math.max(1, Math.round((th || 1) * s)));
  }

  function arcadePoly(ctx, pts, c, edge, s, th) {
    var scaled = [];
    for (var i = 0; i < pts.length; i++) scaled.push([Math.round(pts[i][0] * s), Math.round(pts[i][1] * s)]);
    arcadePixelPoly(ctx, scaled, c, edge, Math.max(1, Math.round((th || 1) * s)));
  }

  function arcadeEllipse(ctx, x, y, rx, ry, c, s) {
    rx = Math.max(1, Math.round(rx * s)); ry = Math.max(1, Math.round(ry * s));
    var cx = Math.round(x * s), cy = Math.round(y * s);
    for (var dy = -ry; dy <= ry; dy++) {
      var half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      R(ctx, cx - half, cy + dy, half * 2 + 1, 1, c);
    }
  }

  function arcadeFace(ctx, C, s, y, fierce) {
    var ey = y - 1;
    arcadeR(ctx, -6, ey - 2, 5, 7, C.d, s); arcadeR(ctx, 2, ey - 2, 6, 7, C.d, s);
    arcadeR(ctx, -5, ey - 1, 3, 4, C.eye, s); arcadeR(ctx, 3, ey - 1, 4, 5, C.eye, s);
    arcadeR(ctx, -4, ey, 1, 1, '#ffffff', s); arcadeR(ctx, 4, ey, 1, 1, '#ffffff', s);
    if (fierce) {
      arcadeL(ctx, -7, ey - 3, -2, ey - 4, C.d, 1, s);
      arcadeL(ctx, 2, ey - 4, 8, ey - 3, C.d, 1, s);
      arcadeR(ctx, 1, y + 4, 5, 2, C.hi, s);
    } else {
      arcadeR(ctx, 1, y + 3, 5, 1, C.d, s);
      arcadeR(ctx, 2, y + 4, 3, 1, C.hi, s);
    }
    arcadeR(ctx, -9, y + 2, 3, 2, C.m, s); arcadeR(ctx, 8, y + 2, 3, 2, C.m, s);
  }

  function arcadeLeg(ctx, x, y, stride, C, s, length) {
    var endX = x + stride * 2.5;
    arcadeL(ctx, x, y, endX, y + length - 2, C.d, 3, s);
    arcadeL(ctx, x, y + 1, endX, y + length - 3, C.m, 1, s);
    arcadeR(ctx, endX - 1, y + length - 2, 5, 2, C.d, s);
    arcadeR(ctx, endX, y + length - 2, 3, 1, C.hi, s);
  }

  function drawArcadeDesign(ctx, art, t, e, s, C, stride, charge, boss) {
    var w = Math.sin(t * 3.2 + (e.seed || 0)), flap = Math.sin(t * 8 + (e.seed || 0));
    var arm = charge * 7, fierce = boss || art === 'beetle' || art === 'iceDragon';
    if (art === 'candy') {
      var squeeze = stride * 1.1;
      arcadeEllipse(ctx, 0, -4, 10 + squeeze, 8 - squeeze * 0.4, C.d, s);
      arcadeEllipse(ctx, 0, -5, 9 + squeeze, 7 - squeeze * 0.4, C.m, s);
      arcadeEllipse(ctx, -2, -9, 4, 2, C.h, s);
      arcadeEllipse(ctx, -9, -10 + w, 4, 4, C.d, s); arcadeEllipse(ctx, -9, -11 + w, 3, 3, C.hi, s);
      arcadeEllipse(ctx, 8, -10 - w, 4, 4, C.d, s); arcadeEllipse(ctx, 8, -11 - w, 3, 3, C.h, s);
      arcadeR(ctx, -6, 2, 4, 2, C.hi, s); arcadeR(ctx, 4, 1, 5, 2, C.hi, s);
      arcadeFace(ctx, C, s, -3, false);
    } else if (art === 'balloon') {
      arcadePoly(ctx, [[0,-19],[7,-17],[11,-11],[10,-4],[5,1],[1,3],[0,6],[-2,3],[-7,1],[-11,-4],[-12,-11],[-8,-17]], C.m, C.d, s, 2);
      arcadeL(ctx, -6, -15, -3, -7, C.h, 2, s); arcadeL(ctx, 3, -17, 4, -8, C.hi, 2, s);
      arcadeR(ctx, -2, 2, 4, 3, C.d, s); arcadePoly(ctx, [[0,4],[5,7],[1,8],[-1,6],[-4,8],[-3,5]], C.h, C.d, s, 1);
      for (var bt = 0; bt < 4; bt++) arcadeL(ctx, -1, 8 + bt * 2, Math.sin(t * 4 + bt) * 4, 10 + bt * 2, bt % 2 ? C.hi : C.m, 1, s);
      arcadeFace(ctx, C, s, -9, false);
    } else if (art === 'cupcake') {
      arcadePoly(ctx, [[-10,-3],[9,-3],[7,7],[-7,7]], C.m, C.d, s, 2);
      for (var rib = -4; rib <= 4; rib += 4) arcadeL(ctx, rib, -1, rib * 0.72, 6, C.hi, 1, s);
      arcadeEllipse(ctx, 0, -7, 10, 7, C.d, s); arcadeEllipse(ctx, 0, -9, 9, 6, C.h, s);
      arcadeEllipse(ctx, -5, -12, 4, 4, C.h, s); arcadeEllipse(ctx, 3, -14, 4, 5, C.hi, s);
      arcadeR(ctx, 0, -20 + Math.round(w), 4, 5, '#c93655', s); arcadeR(ctx, 1, -20 + Math.round(w), 1, 2, '#fff1a2', s);
      arcadeFace(ctx, C, s, -5, false);
    } else if (art === 'lollipop') {
      arcadeL(ctx, -1, -4, 3 + stride, 10, C.d, 5, s); arcadeL(ctx, 0, -4, 3 + stride, 9, C.hi, 2, s);
      arcadeEllipse(ctx, 0, -12, 10, 10, C.d, s); arcadeEllipse(ctx, 0, -12, 8, 8, C.m, s);
      for (var lp = -6; lp <= 6; lp += 6) arcadeL(ctx, lp, -18, lp + 5, -7, lp < 0 ? C.h : C.hi, 2, s);
      arcadeEllipse(ctx, -2, -17, 3, 2, C.h, s); arcadeFace(ctx, C, s, -10, false);
      arcadeL(ctx, -7, -1, -12, -5 - charge * 3, C.d, 3, s); arcadeL(ctx, 7, -1, 12, -4 - Math.sin(t * 5) * 2 - arm, C.m, 3, s);
    } else if (art === 'eraser') {
      arcadePoly(ctx, [[-12,-8],[-8,-12],[9,-12],[12,-8],[10,4],[6,8],[-9,7],[-12,3]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[-9,-9],[7,-9],[9,-6],[7,-3],[-9,-3]], C.h, null, s);
      arcadeR(ctx, -8, 2, 16, 2, C.d, s); arcadeR(ctx, -6, 3, 11, 1, C.hi, s);
      arcadeL(ctx, -9, -1, -14, 2 + stride * 2, C.d, 3, s); arcadeL(ctx, 8, -1, 14, -2 - arm, C.d, 3, s);
      arcadeEllipse(ctx, -3, -15 + w, 2, 2, C.hi, s); arcadeFace(ctx, C, s, -3, false);
    } else if (art === 'pencil') {
      arcadePoly(ctx, [[-7,-19],[7,-19],[6,7],[0,15],[-6,7]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[-5,-16],[4,-16],[4,3],[-4,3]], C.h, null, s);
      arcadePoly(ctx, [[-6,7],[6,7],[0,15]], '#d69d78', C.d, s, 1); arcadePoly(ctx, [[-2,12],[2,12],[0,16]], '#333346', null, s);
      arcadeR(ctx, -7, -19, 14, 3, C.hi, s); arcadeR(ctx, -3, -20, 6, 1, C.h, s);
      arcadeFace(ctx, C, s, -4, false);
      arcadeL(ctx, -6, -1, -12, 2 + stride * 2, C.d, 2, s); arcadeL(ctx, 6, -2, 12, -5 - arm, C.d, 2, s);
    } else if (art === 'inkpot') {
      arcadePoly(ctx, [[-10,-5],[-7,-11],[7,-11],[10,-5],[8,7],[-8,7]], C.m, C.d, s, 2);
      arcadeR(ctx, -12, -12, 24, 4, C.d, s); arcadeR(ctx, -9, -15, 18, 3, C.h, s);
      arcadeR(ctx, -7, -4, 14, 1, C.h, s); arcadeR(ctx, -8, 4, 3, 2, C.d, s);
      arcadeEllipse(ctx, 0, -16 + Math.round(Math.sin(t * 4) * 2), 3, 4, C.hi, s);
      arcadeFace(ctx, C, s, -2, false);
      for (var drop = 0; drop < 3; drop++) { var dy = (t * 8 + drop * 7) % 15; arcadeR(ctx, 12 + drop * 2, -12 + dy, 1, 2, C.hi, s); }
    } else if (art === 'ruler') {
      arcadePoly(ctx, [[-12,-17],[-5,-19],[9,5],[3,10],[-4,4]], C.m, C.d, s, 2);
      arcadeL(ctx, -8, -15, 4, 5, C.hi, 2, s);
      for (var tick = 0; tick < 6; tick++) arcadeL(ctx, -7 + tick * 2, -11 + tick * 3, -3 + tick * 2, -12 + tick * 3, C.d, 1, s);
      arcadeEllipse(ctx, 1, -3, 6, 7, C.h, s); arcadeFace(ctx, C, s, -4, false);
      arcadeLeg(ctx, -4, 7, stride, C, s, 5); arcadeLeg(ctx, 4, 7, -stride, C, s, 5);
      arcadeL(ctx, -6, -4, -13, -1 + stride, C.d, 2, s); arcadeL(ctx, 7, -3, 13, -7 - arm, C.d, 2, s);
    } else if (art === 'snowball') {
      arcadeLeg(ctx, -4, 3, stride, C, s, 5); arcadeLeg(ctx, 4, 3, -stride, C, s, 5);
      arcadeEllipse(ctx, 0, -1, 9, 8, C.d, s); arcadeEllipse(ctx, -1, -3, 7, 6, C.h, s);
      arcadeEllipse(ctx, 1, -12, 6, 6, C.d, s); arcadeEllipse(ctx, 0, -13, 5, 5, C.hi, s);
      arcadeL(ctx, -7, -5, -12, -11 + stride * 2, '#634633', 2, s); arcadeL(ctx, 7, -5, 12, -10 - stride * 2, '#634633', 2, s);
      arcadeR(ctx, -6, -6, 13, 2, C.m, s); arcadeR(ctx, -6, -5, 13, 1, C.hi, s);
      arcadeR(ctx, -1, -12, 6, 2, '#e98b56', s); arcadeFace(ctx, C, s, -13, false);
      PX(ctx, -8 * s, -3 * s, '#ffffff'); PX(ctx, 6 * s, -1 * s, '#ffffff');
    } else if (art === 'scarf') {
      arcadeEllipse(ctx, 0, -4, 8, 7, C.d, s); arcadeEllipse(ctx, 1, -5, 6, 5, C.m, s);
      arcadeR(ctx, -6, -3, 12, 3, C.h, s); arcadeFace(ctx, C, s, -5, fierce);
      var tail = Math.sin(t * 6 + (e.seed || 0)) * 3 + stride * 2;
      arcadePoly(ctx, [[-3,0],[-10,2],[-17,0],[-24,tail],[-20,tail+3],[-13,5],[-4,4]], C.h, C.d, s, 2);
      arcadePoly(ctx, [[4,0],[10,2],[16,0],[23,-tail], [20,-tail+3],[12,5],[5,4]], C.m, C.d, s, 2);
      arcadeR(ctx, -20, tail, 4, 2, C.hi, s); arcadeR(ctx, 19, -tail, 4, 2, C.hi, s);
      arcadeR(ctx, -8, -10, 6, 2, C.hi, s);
    } else if (art === 'broom') {
      arcadeL(ctx, -4, -19, 4 + stride, 8, C.d, 4, s); arcadeL(ctx, -3, -18, 2 + stride, 4, C.h, 1, s);
      arcadePoly(ctx, [[-7,3],[6,2],[12,8],[8,12],[-10,10],[-12,7]], C.m, C.d, s, 2);
      for (var br = -8; br <= 8; br += 4) arcadeL(ctx, br, 5, br + (br < 0 ? -2 : 2), 10 + Math.abs(br) * 0.15, C.hi, 2, s);
      arcadeEllipse(ctx, -1, -12, 6, 6, C.h, s); arcadeFace(ctx, C, s, -12, false);
      arcadeL(ctx, -4, -6, -10, -3 - stride * 2, C.d, 2, s); arcadeL(ctx, 4, -6, 11, -4 - arm, C.d, 2, s);
    } else if (art === 'icicle') {
      arcadePoly(ctx, [[-9,-16],[-3,-21],[0,-16],[4,-23],[8,-15],[6,3],[3,10],[-3,9],[-8,1]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[-5,-14],[-2,-18],[0,-12],[3,-19],[5,-13],[3,1],[0,5],[-5,0]], C.h, null, s);
      arcadeFace(ctx, C, s, -4, false);
      for (var it = 0; it < 3; it++) { var iy = (t * 10 + it * 8) % 17; arcadeR(ctx, -9 + it * 8, -8 + iy, 2, 3, C.hi, s); }
      arcadeR(ctx, 7, -4, 3, 1, '#ffffff', s);
    } else if (art === 'crystal') {
      arcadePoly(ctx, [[0,-20],[8,-9],[12,-1],[6,9],[-5,8],[-12,-1],[-7,-11]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[0,-18],[2,-2],[-7,-1]], C.h, null, s); arcadePoly(ctx, [[2,-2],[9,-8],[7,6],[1,7]], C.hi, null, s);
      arcadePoly(ctx, [[-6,4],[1,-2],[1,8]], '#4ab3cb', null, s);
      arcadeFace(ctx, C, s, -4, fierce);
      for (var shard = 0; shard < 3; shard++) { var a = t * 1.4 + shard * 2.09; arcadePoly(ctx, [[Math.cos(a)*15,Math.sin(a)*10-5],[Math.cos(a)*19,Math.sin(a)*10-11],[Math.cos(a)*21,Math.sin(a)*10+1]], C.hi, C.d, s, 1); }
    } else if (art === 'rabbit') {
      var earBend = Math.sin(t * 4 + (e.seed || 0)) * 2 + stride;
      arcadeLeg(ctx, -4, 3, stride, C, s, 6); arcadeLeg(ctx, 4, 3, -stride, C, s, 6);
      arcadeEllipse(ctx, -1, -1, 9, 7, C.d, s); arcadeEllipse(ctx, -2, -3, 7, 5, C.h, s);
      arcadePoly(ctx, [[-6,-11],[-10,-27-earBend],[-5,-25-earBend],[0,-11]], C.h, C.d, s, 1);
      arcadePoly(ctx, [[2,-11],[4,-27+earBend],[9,-24+earBend],[8,-9]], C.hi, C.d, s, 1);
      arcadeEllipse(ctx, 3, -12, 7, 6, C.d, s); arcadeEllipse(ctx, 3, -13, 6, 5, C.h, s);
      arcadeR(ctx, 8, -11, 2, 2, '#ee9caa', s); arcadeFace(ctx, C, s, -14, false);
      arcadeEllipse(ctx, -10, -1, 3, 3, C.hi, s);
    } else if (art === 'icecone') {
      arcadePoly(ctx, [[-10,-4],[10,-4],[5,13],[-4,13]], C.d, C.d, s, 1);
      arcadePoly(ctx, [[-8,-3],[8,-3],[4,10],[-3,10]], C.m, null, s);
      for (var waffle = -5; waffle <= 5; waffle += 5) arcadeL(ctx, waffle, -1, waffle * 0.3, 8, C.hi, 1, s);
      arcadeEllipse(ctx, 0, -9, 10, 7, C.d, s); arcadeEllipse(ctx, -1, -12, 7, 5, C.h, s);
      arcadeEllipse(ctx, 4, -17 + w, 4, 4, C.hi, s); arcadeFace(ctx, C, s, -9, false);
      arcadeR(ctx, -7, 2, 3, 2, '#ffffff', s);
    } else if (art === 'frostflower') {
      for (var pet = 0; pet < 8; pet++) {
        var pa = pet * Math.PI / 4 + t * 0.35;
        var px = Math.cos(pa) * 10, py = -8 + Math.sin(pa) * 9;
        arcadePoly(ctx, [[0,-8],[px-3,py-4],[px,py],[px+3,py-3]], pet % 2 ? C.h : C.hi, C.d, s, 1);
      }
      arcadeEllipse(ctx, 0, -7, 6, 6, C.d, s); arcadeEllipse(ctx, 0, -8, 4, 4, C.hi, s);
      arcadeFace(ctx, C, s, -9, false);
      arcadeL(ctx, 0, -1, 0, 10, C.d, 3, s); arcadeL(ctx, -1, 6, -9, 2 + stride * 2, C.m, 2, s); arcadeL(ctx, 1, 7, 8, 4 - stride * 2, C.m, 2, s);
      arcadeR(ctx, -10, 2 + Math.round(w), 4, 2, C.hi, s); arcadeR(ctx, 7, 3 - Math.round(w), 4, 2, C.hi, s);
    } else if (art === 'sandpuff') {
      arcadeEllipse(ctx, 0, -4, 11 + Math.round(stride), 8, C.d, s); arcadeEllipse(ctx, 0, -5, 9, 6, C.m, s);
      arcadePoly(ctx, [[-8,-9],[-5,-14],[-1,-12],[2,-17],[6,-13],[9,-10]], C.h, C.d, s, 1);
      arcadeR(ctx, -4, -11, 3, 2, C.hi, s); arcadeR(ctx, 5, -7, 3, 2, C.hi, s);
      arcadeFace(ctx, C, s, -4, false);
      for (var ds = 0; ds < 7; ds++) { var da = t * 1.5 + ds * 0.9; arcadeR(ctx, Math.cos(da)*15, -4 + Math.sin(da)*9, 2, 2, ds % 2 ? C.hi : C.h, s); }
    } else if (art === 'cactus') {
      arcadePoly(ctx, [[-6,8],[-7,-7],[-5,-13],[-1,-14],[2,-11],[3,-3],[6,-3],[6,-9],[10,-10],[12,-6],[11,5],[8,8]], C.m, C.d, s, 2);
      arcadeR(ctx, -2, -12, 2, 16, C.h, s); arcadeR(ctx, 4, -5, 1, 8, C.hi, s);
      for (var spine = 0; spine < 7; spine++) { var sy = -10 + spine * 3; arcadeR(ctx, -7 - (spine%2), sy, 2, 1, C.hi, s); }
      arcadeFace(ctx, C, s, -6, false);
      arcadePoly(ctx, [[-1,-14],[-5,-19],[-2,-21],[1,-18],[4,-22],[7,-18],[4,-13]], C.hi, C.d, s, 1);
      arcadeLeg(ctx, -3, 7, stride, C, s, 4); arcadeLeg(ctx, 5, 7, -stride, C, s, 4);
    } else if (art === 'beetle') {
      for (var bl = -1; bl <= 1; bl++) { arcadeL(ctx, -3 + bl*5, 0, -7 + bl*7 + stride*2, 6, C.d, 2, s); arcadeL(ctx, 1 + bl*5, 0, 5 + bl*6 - stride*2, 6, C.m, 2, s); }
      arcadeEllipse(ctx, -1, -5, 12, 9, C.d, s); arcadeEllipse(ctx, -2, -7, 10, 7, C.m, s);
      arcadeEllipse(ctx, -4, -10, 3, 2, C.h, s); arcadeEllipse(ctx, 3, -10, 3, 2, C.h, s);
      arcadeL(ctx, 7, -7, 12, -12 + flap*2, C.d, 2, s); arcadeL(ctx, 10, -7, 16, -9 - flap*2, C.d, 2, s);
      arcadeEllipse(ctx, 9, -4, 5, 5, C.d, s); arcadeEllipse(ctx, 10, -5, 4, 4, C.h, s);
      arcadeR(ctx, 8, -7, 2, 2, C.eye, s); arcadeR(ctx, 12, -6, 2, 2, C.eye, s);
      arcadeL(ctx, -3, -12, 0, 1, C.hi, 1, s);
    } else if (art === 'tumbleweed') {
      arcadeEllipse(ctx, 0, -4, 10, 10, C.d, s); arcadeEllipse(ctx, 0, -5, 8, 8, C.m, s);
      for (var tw = 0; tw < 9; tw++) { var ta = t * (2.2 + stride*0.5) + tw * Math.PI * 2 / 9; arcadeL(ctx, Math.cos(ta)*3, -5 + Math.sin(ta)*3, Math.cos(ta)*15, -5 + Math.sin(ta)*14, tw%2 ? C.h : C.d, 2, s); PX(ctx, Math.round(Math.cos(ta)*15*s), Math.round((-5 + Math.sin(ta)*14)*s), C.hi); }
      arcadeEllipse(ctx, 0, -5, 5, 5, C.h, s); arcadeFace(ctx, C, s, -7, false);
    } else if (art === 'carouselKing') {
      var spin = t * 1.4 + (e.seed || 0);
      arcadeL(ctx, 0, -28, 0, 7, '#75402d', 4, s); arcadeL(ctx, 0, -28, 0, 7, C.hi, 1, s);
      arcadePoly(ctx, [[-23,-27],[-16,-30],[16,-30],[23,-27],[20,-22],[16,-20],[-16,-20],[-20,-22]], C.m, C.d, s, 2);
      for (var canopy = -2; canopy <= 2; canopy++) { arcadeR(ctx, canopy*8-3, -29, 6, 3, canopy%2 ? C.hi : C.h, s); arcadeR(ctx, canopy*8-1, -32, 2, 3, C.hi, s); }
      arcadePoly(ctx, [[-15,-17],[-9,-21],[3,-20],[10,-15],[13,-9],[8,-4],[-9,-3],[-17,-8]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[6,-17],[12,-24],[18,-24],[20,-19],[17,-14],[11,-13]], C.h, C.d, s, 2);
      arcadeR(ctx, 15, -23, 3, 2, C.d, s); arcadeR(ctx, 18, -23, 2, 2, C.hi, s);
      arcadePoly(ctx, [[10,-24],[9,-30],[13,-27],[16,-31],[17,-25]], C.hi, C.d, s, 1);
      arcadeEllipse(ctx, -10, -9, 4, 3, C.hi, s);
      arcadeLeg(ctx, -9, -5, Math.sin(t*8), C, s, 11); arcadeLeg(ctx, 6, -5, -Math.sin(t*8), C, s, 11);
      arcadeL(ctx, -13, -13, -19, -9 + flap*2, C.h, 3, s); arcadeL(ctx, -17, -9 + flap*2, -22, -13 + flap*2, C.hi, 2, s);
      arcadeFace(ctx, C, s, -19, false);
      for (var jewel = 0; jewel < 4; jewel++) { var ja = spin + jewel * 1.57; arcadeR(ctx, Math.cos(ja)*26, -15 + Math.sin(ja)*9, 2, 2, C.hi, s); }
    } else if (art === 'boardGiant') {
      arcadeLeg(ctx, -10, 5, stride, C, s, 8); arcadeLeg(ctx, 10, 5, -stride, C, s, 8);
      arcadeL(ctx, -15, -8, -23, -1 - arm, C.d, 5, s); arcadeL(ctx, 15, -8, 23, -16 - arm, C.d, 5, s);
      arcadeL(ctx, 22, -16-arm, 27, -21-arm, C.hi, 3, s); arcadeL(ctx, -22, -1-arm, -27, -5-arm, C.h, 3, s);
      arcadeR(ctx, -19, -24, 38, 30, '#633d2e', s); arcadeR(ctx, -16, -21, 32, 23, C.d, s);
      arcadeR(ctx, -14, -19, 28, 19, C.m, s); arcadeR(ctx, -12, -17, 2, 14, C.h, s);
      arcadeR(ctx, -10, -17, 2, 5, C.hi, s); arcadeR(ctx, 7, -17, 2, 5, C.hi, s);
      arcadeR(ctx, -8, -11, 16, 1, '#d7e7a5', s); arcadeR(ctx, -6, -7, 13, 1, '#d7e7a5', s);
      arcadeFace(ctx, C, s, -13, true);
      arcadeR(ctx, -20, 6, 40, 3, C.h, s);
    } else if (art === 'snowPrincipal') {
      arcadeLeg(ctx, -6, 6, stride, C, s, 5); arcadeLeg(ctx, 6, 6, -stride, C, s, 5);
      arcadeEllipse(ctx, 0, -3, 12, 11, C.d, s); arcadeEllipse(ctx, -1, -5, 10, 9, C.h, s);
      arcadeEllipse(ctx, 1, -18, 9, 9, C.d, s); arcadeEllipse(ctx, 0, -20, 7, 7, C.hi, s);
      arcadeR(ctx, -7, -30, 15, 3, '#38283d', s); arcadeR(ctx, -5, -39, 11, 10, '#332538', s); arcadeR(ctx, -7, -30, 15, 2, C.h, s);
      arcadeR(ctx, -5, -21, 3, 2, C.d, s); arcadeR(ctx, 3, -21, 3, 2, C.d, s); arcadeR(ctx, 6, -18, 4, 2, '#ed9055', s);
      arcadeR(ctx, -3, -6, 3, 3, '#513342', s); arcadeR(ctx, 1, -1, 3, 3, '#513342', s); arcadeR(ctx, -3, 4, 3, 3, '#513342', s);
      arcadeR(ctx, -12, -11, 25, 3, '#a42d48', s); arcadeL(ctx, 9, -10, 15, -2 + flap*2, '#a42d48', 3, s);
      arcadeL(ctx, -10, -5, -19, -1 - arm, '#6d4b3d', 3, s); arcadeL(ctx, 10, -5, 19, -11 - arm, '#6d4b3d', 3, s);
      arcadeR(ctx, 16, -15-arm, 5, 8, '#42657c', s); arcadeFace(ctx, C, s, -21, false);
    } else if (art === 'iceDragon') {
      arcadeLeg(ctx, -9, 3, stride, C, s, 8); arcadeLeg(ctx, 5, 1, -stride, C, s, 7);
      arcadeEllipse(ctx, -3, -4, 15, 9, C.d, s); arcadeEllipse(ctx, -4, -6, 13, 7, C.m, s);
      arcadeR(ctx, -9, -5, 15, 2, C.h, s);
      var wing = Math.sin(t * 8 + (e.seed || 0)) * 7 + charge * 5;
      arcadePoly(ctx, [[-7,-8],[-20,-27-wing],[-12,-23-wing],[-9,-31-wing],[-3,-20-wing],[2,-14]], C.m, C.d, s, 2);
      arcadeL(ctx, -7, -8, -17, -26-wing, C.hi, 1, s); arcadeL(ctx, -7, -8, -9, -29-wing, C.hi, 1, s);
      arcadePoly(ctx, [[-15,-4],[-22,-7+flap],[-27,-15+flap],[-22,-11+flap],[-16,-10]], C.m, C.d, s, 1);
      arcadeL(ctx, 3, -7, 10, -15, C.d, 6, s); arcadeL(ctx, 7, -12, 13, -18, C.m, 4, s);
      arcadePoly(ctx, [[8,-18],[14,-25],[22,-24],[26,-20],[23,-15],[14,-14]], C.h, C.d, s, 2);
      arcadePoly(ctx, [[17,-23],[20,-28],[22,-23]], C.hi, C.d, s, 1); arcadePoly(ctx, [[11,-24],[12,-28],[16,-23]], C.hi, C.d, s, 1);
      arcadeR(ctx, 20, -21, 2, 2, C.eye, s); arcadeR(ctx, 25, -18, 3, 2, C.d, s);
      arcadeL(ctx, 16, -14, 21, -11, C.hi, 2, s); arcadeEllipse(ctx, -19, -22-wing, 3, 2, C.hi, s);
    } else if (art === 'sandPharaoh') {
      arcadeLeg(ctx, -6, 5, stride, C, s, 8); arcadeLeg(ctx, 7, 5, -stride, C, s, 8);
      arcadePoly(ctx, [[-12,-23],[-8,-28],[8,-28],[13,-22],[11,-8],[18,-4],[15,5],[-16,5],[-19,-4],[-11,-9]], C.m, C.d, s, 2);
      for (var stripe = 0; stripe < 5; stripe++) arcadeL(ctx, -11, -22 + stripe*3, 10, -22 + stripe*3 + Math.sin(t*3+stripe)*1, stripe%2 ? C.hi : C.d, 2, s);
      arcadeR(ctx, -8, -28, 17, 8, C.h, s); arcadeR(ctx, -9, -32, 19, 4, C.d, s); arcadeR(ctx, -5, -35, 11, 4, C.hi, s);
      arcadeR(ctx, -6, -25, 14, 12, C.hi, s); arcadeR(ctx, -5, -23, 12, 8, C.m, s);
      arcadeR(ctx, -5, -20, 4, 3, C.d, s); arcadeR(ctx, 3, -20, 4, 3, C.d, s);
      arcadeR(ctx, -4, -19, 3, 2, C.eye, s); arcadeR(ctx, 4, -19, 3, 2, C.eye, s);
      arcadePoly(ctx, [[-1,-15],[4,-14],[3,-8],[0,-5],[-3,-9]], C.h, C.d, s, 1);
      arcadeR(ctx, -10, -7, 21, 3, C.hi, s); arcadeR(ctx, -7, -6, 3, 7, C.d, s); arcadeR(ctx, 0, -6, 3, 7, C.h, s); arcadeR(ctx, 6, -6, 3, 7, C.d, s);
      arcadeL(ctx, 12, -6, 20, 2 + stride*2, C.d, 4, s); arcadeR(ctx, 17, 0, 6, 3, C.hi, s);
      arcadeR(ctx, 18, -17, 3, 17, C.d, s); arcadeR(ctx, 17, -20, 5, 3, C.hi, s); arcadeFace(ctx, C, s, -20, true);
    }
  }

  function drawArcadeCreature(ctx, e, t, sp) {
    var action = e.dying > 0 ? 'defeat' : (e.anim || (e.hitT > 0 ? 'hit' : 'idle'));
    var phase = t * (action === 'walk' ? 8.5 : 2.2) + (e.seed || 0) * 2.7;
    var hitP = e.hitT > 0 ? Math.max(0, Math.min(1, 1 - e.hitT / 0.26)) : 0;
    var deathMax = e.deathMax || 0.28;
    var deathP = e.dying > 0 ? Math.max(0, Math.min(1, 1 - e.dying / deathMax)) : 0;
    var attackP = action === 'attack' ? Math.max(0, Math.min(1, (e.animT || 0) / 0.48)) : 0;
    var spawnP = action === 'spawn' ? Math.max(0.15, Math.min(1, (e.animT || 0) / 0.34)) : 1;
    var s = sp.arcSize || (e.elite ? 1.62 : 1.22), dir = e.facing === 1 ? 1 : -1;
    var bounce = action === 'walk' ? Math.abs(Math.sin(phase)) * 1.8 : Math.sin(phase) * (e.elite ? 1.1 : 0.9);
    if (action === 'attack') bounce -= Math.sin(Math.PI * attackP) * 1.1;
    if (action === 'hit') bounce -= Math.sin(Math.PI * hitP) * 0.8;
    if (action === 'defeat') bounce += deathP * 4;
    var x = Math.round(e.x + (e.kx || 0) + dir * Math.sin(Math.PI * attackP) * (e.elite ? 5.2 : 4.2) * s);
    var y = Math.round(e.y + bounce + (e.ky || 0));
    var stride = action === 'walk' ? Math.sin(phase) * 1.6 : 0;
    var charge = action === 'attack' ? Math.sin(Math.PI * attackP) : 0;
    var rot = action === 'walk' ? Math.sin(phase) * 0.055 : 0;
    if (action === 'attack') rot = dir * 0.16 * Math.sin(Math.PI * attackP);
    if (action === 'hit') rot = dir * 0.14 * Math.sin(Math.PI * hitP);
    if (action === 'defeat') rot = dir * -0.48 * deathP;
    var sy = 206 + (e.y - 172) * 0.10;
    var shadowW = (e.elite ? 19 : 12) * s * (1 - deathP * 0.35);
    for (var band = 0; band < 3; band++) {
      var sw = shadowW - band * 3 * s;
      R(ctx, Math.round(x - sw), Math.round(sy + band), Math.round(sw * 2), 1, band === 0 ? 'rgba(8,12,20,0.30)' : 'rgba(8,12,20,0.16)');
    }
    if (e.elite && action !== 'defeat') {
      var auraR = 25 * s;
      for (var ai = 0; ai < 12; ai++) {
        var aa = t * 0.7 + ai * Math.PI / 6;
        if (ai % 2 === 0) PX(ctx, x + Math.cos(aa) * auraR, y - 12 * s + Math.sin(aa) * 13 * s, ai % 4 ? sp.pal[2] : sp.pal[3]);
      }
    }
    var C = e.flash > 0 ? { d:'#ffffff', m:'#ffffff', h:'#ffffff', hi:'#ffffff', eye:'#ffffff' }
      : { d:sp.pal[0], m:sp.pal[1], h:sp.pal[2], hi:sp.pal[3], eye:sp.eye };
    var drawX = x + dir * charge * 1.5 * s;
    ctx.save();
    ctx.translate(drawX, y);
    ctx.rotate(rot);
    var breathe = action === 'walk' ? Math.sin(phase + Math.PI / 2) * 0.045 : Math.sin(phase) * 0.032;
    ctx.scale(dir * spawnP * (1 - breathe * 0.35), spawnP * (action === 'defeat' ? 1 - deathP * 0.30 : 1 + breathe));
    drawArcadeDesign(ctx, sp.arc, t, e, s, C, stride, charge, !!e.elite);
    ctx.restore();
    if (action === 'attack' && charge > 0.08) {
      /* 清楚可见的像素弧斩：先画深色边，再叠亮刃和飞散火星。 */
      ctx.save(); ctx.globalAlpha = 0.38 + charge * 0.58;
      var prevX = drawX + dir * 5 * s, prevY = y + 9 * s;
      for (var slash = 1; slash <= 9; slash++) {
        var u = slash / 9;
        var sx = drawX + dir * (5 + (e.elite ? 34 : 29) * u) * s;
        var sy2 = y + (9 - 38 * Math.sin(u * Math.PI * 0.53)) * s;
        line(ctx, prevX, prevY, sx, sy2, C.d, Math.max(3, Math.round(4 * s)));
        line(ctx, prevX, prevY - 1, sx, sy2 - 1, '#fff5d6', Math.max(1, Math.round(1.5 * s)));
        if (slash === 4 || slash === 7 || slash === 9) {
          PX(ctx, sx + dir * 2 * s, sy2 - 2 * s, C.hi);
          PX(ctx, sx + dir * 4 * s, sy2 + 1, '#fff5d6');
        }
        prevX = sx; prevY = sy2;
      }
      ctx.restore();
    }
    if (action === 'hit') {
      ctx.save(); ctx.globalAlpha = 0.72 * (1 - hitP);
      PX(ctx, x - 13 * s, y - 15 * s, C.hi); PX(ctx, x + 14 * s, y - 9 * s, C.hi); PX(ctx, x - 9 * s, y + 4 * s, C.hi);
      ctx.restore();
    }
    slashFx(ctx, e, x, y, e.elite ? 24 : 15);
    if (!e.elite && e.hp < e.maxHp) {
      var bw = 28, segs = Math.max(1, Math.min(6, e.segs || 1));
      R(ctx, x - bw/2 - 1, y - 31 * s, bw + 2, 4, 'rgba(8,10,14,0.82)');
      R(ctx, x - bw/2, y - 30 * s, bw * Math.max(0, e.hp / e.maxHp), 2, C.hi);
      for (var sg = 1; sg < segs; sg++) R(ctx, x - bw/2 + bw * sg/segs, y - 31 * s, 1, 4, '#18202d');
    }
  }

  function drawCreature(ctx, e, t, sp) {
    if (!sp) return;
    if (sp.arcade) { drawArcadeCreature(ctx, e, t, sp); return; }
    var fl = e.flash > 0;
    var C = spPal(sp, fl);
    var s = (sp.s || 1) * (e.elite ? 1.1 : 1.8);
    var action = e.dying > 0 ? 'defeat' : (e.anim || (e.hitT > 0 ? 'hit' : 'idle'));
    var phase = t * (action === 'walk' ? 8.5 : 2.1) + (e.seed || 0) * 2.7;
    var hitP = e.hitT > 0 ? Math.max(0, Math.min(1, 1 - e.hitT / 0.26)) : 0;
    var deathMax = e.deathMax || 0.28;
    var deathP = e.dying > 0 ? Math.max(0, Math.min(1, 1 - e.dying / deathMax)) : 0;
    var attackP = action === 'attack' ? Math.max(0, Math.min(1, (e.animT || 0) / 0.48)) : 0;
    var spawnP = action === 'spawn' ? Math.max(0.1, Math.min(1, (e.animT || 0) / 0.24)) : 1;
    var bob = action === 'walk' ? Math.sin(phase) * 1.35 * s : Math.sin(phase) * 1.05 * s;
    if (action === 'attack') bob -= Math.sin(Math.PI * attackP) * 1.8 * s;
    if (action === 'hit') bob -= Math.sin(Math.PI * hitP) * 1.2 * s;
    if (action === 'defeat') bob += deathP * 7 * s;
    var faceDir = e.facing === 1 ? 1 : -1; /* Arcade 敌人统一朝左，面向主角 */
    var x = Math.round(e.x + (e.kx || 0) + faceDir * Math.sin(Math.PI * attackP) * 3.5 * s);
    var y = Math.round(e.y + bob + (e.ky || 0));
    var rot = 0;
    if (action === 'walk') rot = Math.sin(phase) * 0.045;
    if (action === 'attack') rot = faceDir * (-0.16 * Math.sin(Math.PI * attackP));
    if (action === 'hit') rot = faceDir * (0.20 * Math.sin(Math.PI * hitP));
    if (action === 'defeat') rot = faceDir * (-0.46 * deathP);
    var drawScale = spawnP * (action === 'defeat' ? 1 - deathP * 0.10 : 1);

    /* 地面投影：倒下和跳起时同步变窄，脚下不会像贴纸一样固定。 */
    var sw = 11 * s * (1 - deathP * 0.35);
    for (var i = 0; i < 3; i++) {
      var ww = sw - i * 2.5 * s;
      R(ctx, x - ww, 206 + i, ww * 2, 1, 'rgba(8,10,16,0.28)');
    }

    /* BOSS 的能量圈和攻击前摇，保持像素粒子而不是柔焦光圈。 */
    if (!fl && sp.feat && sp.feat.indexOf('crown') >= 0) {
      var ring = 14 * s + Math.sin(t * 4 + (e.seed || 0)) * 2;
      ctx.save();
      ctx.globalAlpha = 0.16;
      for (var ra = 0; ra < 6.283; ra += 0.23) {
        PX(ctx, x + Math.cos(ra) * ring, y - 7 * s + Math.sin(ra) * ring * 0.35, C.h);
      }
      ctx.restore();
    }
    if (action === 'attack' && !fl) {
      var charge = Math.sin(Math.PI * attackP);
      ctx.save();
      ctx.globalAlpha = 0.30 + charge * 0.25;
      for (var ap = 0; ap < 5; ap++) {
        var aa = Math.PI + (ap - 2) * 0.23;
        PX(ctx, x + Math.cos(aa) * (12 + charge * 8) * s, y - 5 * s + Math.sin(aa) * 7 * s, C.hi);
      }
      ctx.restore();
    }

    /* 受击与倒下均由真实的像素变形表达，方向以屏幕左侧为敌人正面。 */
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(faceDir * drawScale, drawScale);
    ctx.translate(-x, -y);
    var fn = BODY_FN[sp.body] || bodyBlob;
    fn(ctx, x, y, t, e, sp, C, s);
    if (sp.feat) {
      for (var f = 0; f < sp.feat.length; f++) {
        if (sp.feat[f] === 'crown') drawFeat(ctx, 'crown', x, y - 16 * s, t, e, sp, C, s);
        else drawFeat(ctx, sp.feat[f], x, y, t, e, sp, C, s);
      }
    }
    ctx.restore();

    if (action === 'hit') {
      ctx.save();
      ctx.globalAlpha = 0.65 * (1 - hitP);
      R(ctx, x - 16 * s, y - 19 * s, 5 * s, 1, C.hi);
      R(ctx, x + 11 * s, y - 8 * s, 4 * s, 1, C.hi);
      ctx.restore();
    }

    slashFx(ctx, e, x, y, 13 * s);
    /* 血条：多段显示，血越厚段数越多 */
    if (!e.elite && e.hp < e.maxHp) {
      var bw = 26 * s;
      var segs = Math.max(1, Math.min(6, e.segs || 1));
      R(ctx, x - bw / 2 - 1, y - 26 * s, bw + 2, 4, 'rgba(8,10,14,0.72)');
      R(ctx, x - bw / 2, y - 25 * s, bw * Math.max(0, e.hp / e.maxHp), 2, C.hi);
      for (var sg = 1; sg < segs; sg++) {
        R(ctx, x - bw / 2 + bw * sg / segs, y - 26 * s, 1, 4, 'rgba(8,10,14,0.9)');
      }
    }
  }

  return { SPECIES: SPECIES, drawCreature: drawCreature };
  };
})(window);
