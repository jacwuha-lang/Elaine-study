/* 世界内角色、敌人、投射物和战斗文字的绘制。 */
(function (global) {
  'use strict';
  global.createArcadeWorldRenderer = function (d) {
    var S = d.S, ctx = d.ctx, Art = d.Art, PF = d.PF;
    var ATK_LEN = d.ATK_LEN, ATK_TURN = d.ATK_TURN, RAGE_MAX = d.RAGE_MAX;
    var MEAN_FONT = d.MEAN_FONT, leapAt = d.leapAt, clamp = d.clamp;
    var walking = d.walking, focusEnemy = d.focusEnemy, cardRect = d.cardRect, meanFit = d.meanFit;
  function atkLeap(p) {
    var d = p.leapD || 0, h = p.leapH || 0;
    if ((!d && !h) || p.anim !== 'attack') return { dx: 0, dy: 0 };
    return leapAt(d, h, p.animT);
  }

  function drawPlayerWorld() {
    var p = S.player;
    if (!p) return;

    var leap = atkLeap(p);
    var baseX = p.x + p.dash;
    var px = baseX + leap.dx;
    var py = p.y - leap.dy;

    /* 影子：跟着人横移，跳起来会变窄变淡 */
    var shA = 0.30 * (1 - Math.min(0.62, leap.dy / 24));
    var shW = 14 - Math.min(7, Math.round(leap.dy * 0.5));
    for (var i = 0; i < 3; i++) {
      var w = shW - i * 3;
      if (w < 1) break;
      ctx.fillStyle = 'rgba(8,20,16,' + shA.toFixed(3) + ')';
      ctx.fillRect(Math.round(px - w), Math.round(p.y + 1 + i), w * 2, 1);
    }

    if (p.inv > 0 && Math.floor(S.t * 30) % 2 === 0 && p.anim !== 'hit') return;

    /* 闪避残影 */
    if (p.dash < -6) {
      ctx.globalAlpha = 0.22;
      Art.drawPlayer(ctx, px + 14, py, S.t, { anim: p.anim, at: p.animT, run: walking() });
      ctx.globalAlpha = 0.12;
      Art.drawPlayer(ctx, px + 28, py, S.t, { anim: p.anim, at: p.animT, run: walking() });
      ctx.globalAlpha = 1;
    }

    /* 出剑残影：两层渐隐。残影贴着弧线走，不是固定往左偏——
       人斜着压下去的时候，固定偏移会把两层影子甩成一团。 */
    var atkTail = ATK_LEN - 0.06;
    if (p.anim === 'attack' && p.animT > 0.02 && p.animT < atkTail) {
      var ga = 1 - (p.animT - 0.02) / (atkTail - 0.02);
      var g1 = leapAt(p.leapD, p.leapH, Math.max(0, p.animT - 0.035));
      var g2 = leapAt(p.leapD, p.leapH, Math.max(0, p.animT - 0.07));
      ctx.globalAlpha = 0.40 * ga;
      Art.drawPlayer(ctx, baseX + g1.dx, p.y - g1.dy, S.t, { anim: 'attack', at: Math.max(0, p.animT - 0.035), run: walking() });
      ctx.globalAlpha = 0.20 * ga;
      Art.drawPlayer(ctx, baseX + g2.dx, p.y - g2.dy, S.t, { anim: 'attack', at: Math.max(0, p.animT - 0.07), run: walking() });
      ctx.globalAlpha = 1;
    }

    /* 突进速度线：只在冲出去的那一段亮，掉头回落的路上就收掉 */
    var dashEnd = ATK_LEN * ATK_TURN;
    if (p.anim === 'attack' && p.animT > 0.02 && p.animT < dashEnd) {
      var sa2 = 1 - (p.animT - 0.02) / (dashEnd - 0.02);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var sl = 0; sl < 5; sl++) {
        var ly = py - 14 - sl * 8;
        var len = 12 + sl * 6;
        ctx.globalAlpha = sa2 * (0.46 - sl * 0.06);
        Art.R(ctx, px - 16 - len, ly, len, 1, '#dff6ff');
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    if (S.scene === 'ult' && S.ult) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      /* 脚下光斑 */
      for (var gr = 0; gr < 5; gr++) {
        var gw = 46 - gr * 7;
        if (gw <= 0) break;
        ctx.globalAlpha = 0.16 - gr * 0.026;
        Art.R(ctx, px - gw, p.y + 4 + gr, gw * 2, 2, '#ffe08a');
      }
      /* 身后通天光柱 */
      for (var bh = 0; bh < 26; bh++) {
        var hw = 26 * (1 - bh / 30);
        if (hw < 1) break;
        ctx.globalAlpha = 0.20 * (bh / 26) + 0.03;
        Art.R(ctx, px - hw, p.y - 6 - bh * 8, hw * 2, 8, bh % 2 ? '#ffe9a8' : '#ffd977');
      }
      ctx.globalAlpha = 1;
      /* 呼吸法阵 */
      var rr0 = 34 + Math.sin(S.t * 7) * 3;
      for (var ang = 0; ang < 6.283; ang += 0.13) {
        var rr = rr0 + Math.sin(ang * 5 + S.t * 9) * 3;
        Art.PX(ctx, px + Math.cos(ang) * rr, p.y - 28 + Math.sin(ang) * rr * 1.15, '#fff3cf');
      }
      ctx.restore();
    }

    Art.drawPlayer(ctx, px, py, S.t, {
      anim: p.anim,
      at: p.animT,
      variant: p.swing || 0,
      flash: Math.min(0.9, p.flash * 2),
      run: walking()
    });
  }

  /* 红怪：把这只怪单独画到离屏画布，再用红色 source-in 罩一层，贴回去就是「整只变红」。
     只有 2 层怒气以上才会走这条路，场上最多三只，开销可以忽略。 */
  var tintA = document.createElement('canvas');
  tintA.width = 128; tintA.height = 128;
  var tintCtx = tintA.getContext('2d');
  if (tintCtx) tintCtx.imageSmoothingEnabled = false;

  function drawRageTint(e) {
    if (!tintCtx) return;
    var cx = 64, cy = 64;
    tintCtx.setTransform(1, 0, 0, 1, 0, 0);
    tintCtx.globalCompositeOperation = 'source-over';
    tintCtx.clearRect(0, 0, 128, 128);
    tintCtx.save();
    tintCtx.translate(cx - Math.round(e.x), cy - Math.round(e.y));
    Art.drawEnemy(tintCtx, e, S.t);
    tintCtx.restore();
    tintCtx.globalCompositeOperation = 'source-in';
    tintCtx.fillStyle = e.rage >= 3 ? '#ff3b24' : '#e0432f';
    tintCtx.fillRect(0, 0, 128, 128);
    tintCtx.globalCompositeOperation = 'source-over';

    ctx.save();
    /* 怒到 3 层呼吸更急，像随时要炸 */
    var pulse = Math.sin(S.t * (e.rage >= 3 ? 11 : 7)) * 0.10;
    ctx.globalAlpha = (e.rage >= 3 ? 0.60 : 0.46) + pulse;
    ctx.drawImage(tintA, Math.round(e.x) - cx, Math.round(e.y) - cy);
    ctx.restore();
  }

  /* 头顶三颗小方块：亮几颗就是几层怒气（贴着脑袋，别被词卡挡住） */
  function drawRagePips(e) {
    if (!e.rage) return;
    var n = RAGE_MAX, w = 5, gap = 2, hh = 3;
    var tot = n * w + (n - 1) * gap;
    var x0 = Math.round(e.x - tot / 2), y0 = Math.round(e.y - (e.elite ? 52 : 34));
    /* 先铺一条暗底，浅色背景上也看得清 */
    ctx.fillStyle = 'rgba(8,6,6,0.72)';
    ctx.fillRect(x0 - 1, y0 - 1, tot + 2, hh + 2);
    for (var i = 0; i < n; i++) {
      var on = i < e.rage;
      ctx.fillStyle = on ? (e.rage >= 3 ? '#ff4a2c' : '#ff8a5a') : 'rgba(92,52,44,0.85)';
      ctx.fillRect(x0 + i * (w + gap), y0, w, hh);
    }
  }

  function drawEnemies() {
    var list = S.enemies.slice().sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < list.length; i++) {
      if (list[i].alive || list[i].dying > 0) Art.drawEnemy(ctx, list[i], S.t);
    }
    /* 红怪整只染色 + 怒气格 */
    for (var ri = 0; ri < list.length; ri++) {
      var re = list[ri];
      if (!re.alive || !re.rage) continue;
      if (re.rage >= 2) drawRageTint(re);
      drawRagePips(re);
    }
    /* 被寒冰咒冻住的：外面罩一层霜，动静一眼能看出来 */
    for (var fz = 0; fz < list.length; fz++) {
      var fe = list[fz];
      if (!fe.alive || !(fe.frozen > 0)) continue;
      var fr = fe.elite ? 26 : 17;
      var fk = Math.min(1, fe.frozen / 0.4);
      ctx.save();
      ctx.globalAlpha = 0.55 * fk;
      for (var fa = 0; fa < 6.283; fa += 0.13) {
        Art.PX(ctx, fe.x + Math.cos(fa) * fr, fe.y - 10 + Math.sin(fa) * fr * 0.8, '#bfe8ff');
      }
      ctx.globalAlpha = 0.30 * fk;
      Art.ditherDisc(ctx, fe.x, fe.y - 10, fr * 0.9, '#8fd8ff', 0.5, 2);
      ctx.restore();
    }
    if (S.scene !== 'ult') {
      for (var j = 0; j < list.length; j++) {
        if (list[j].alive) drawCard(list[j]);
      }
    }
    /* 锁定标记 */
    if (S.lockId != null) {
      for (var k = 0; k < S.enemies.length; k++) {
        var e = S.enemies[k];
        if (e.id === S.lockId && e.alive) {
          var r = (e.elite ? 22 : 15) + Math.sin(S.t * 6) * 1.5;
          ctx.fillStyle = '#ffe08a';
          var cx = Math.round(e.x), cy = Math.round(e.y);
          ctx.fillRect(cx - r, cy - r, 4, 1); ctx.fillRect(cx - r, cy - r, 1, 4);
          ctx.fillRect(cx + r - 3, cy - r, 4, 1); ctx.fillRect(cx + r, cy - r, 1, 4);
          ctx.fillRect(cx - r, cy + r, 4, 1); ctx.fillRect(cx - r, cy + r - 3, 1, 4);
          ctx.fillRect(cx + r - 3, cy + r, 4, 1); ctx.fillRect(cx + r, cy + r - 3, 1, 4);
        }
      }
    }
  }

  function drawCard(e) {
    var rc = cardRect(e);
    var w = rc.w, h = rc.h, x = rc.x, y = rc.y;
    var locked = S.lockId === e.id;
    var typed = locked ? S.input : '';
    var badInput = locked && S.input.length > 0 && e.word.indexOf(S.input) !== 0;
    var danger = e.castT / e.castMax < 0.28;
    var prog = clamp(1 - e.castT / e.castMax, 0, 1);
    var isFocus = S.kid && S.scene === 'play' && !locked && focusEnemy() === e;
    var hotCard = S.hoverCard === e.id;

    /* 卡体：深色玻璃 + 顶部微亮 */
    ctx.fillStyle = locked ? 'rgba(18,14,6,0.90)' : (isFocus ? 'rgba(10,24,18,0.92)' : 'rgba(4,14,11,0.88)');
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(x + 2, y + h, w, 2);

    var bc = badInput ? (Math.sin(S.t * 9) > -0.2 ? '#ff8a72' : '#c8503c')
      : locked ? '#ffe08a'
      : isFocus ? (Math.sin(S.t * 5) > -0.2 ? '#e8c46a' : '#a8894c')
        : (e.elite ? '#e8a05a' : (danger ? '#e8705a' : (hotCard ? '#9fd0b4' : '#4f7f68')));
    /* 红怪：卡片边框跟着一起红，让人一眼知道这只不能拖 */
    if (e.rage >= 2 && !badInput && !locked) bc = Math.sin(S.t * 9) > -0.2 ? '#ff7a5a' : '#a8341f';
    ctx.fillStyle = bc;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);

    /* 点读模式：当前字母台对应的卡，顶部一个小箭头 */
    if (isFocus) {
      var mx = x + Math.floor(w / 2);
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(mx - 3, y - 5, 7, 1);
      ctx.fillRect(mx - 2, y - 4, 5, 1);
      ctx.fillRect(mx - 1, y - 3, 3, 1);
      ctx.fillRect(mx, y - 2, 1, 1);
    }

    if (locked) {
      ctx.fillStyle = 'rgba(255,224,138,0.10)';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = '#fff3cf';
      ctx.fillRect(x - 1, y - 1, 5, 1); ctx.fillRect(x - 1, y - 1, 1, 5);
      ctx.fillRect(x + w - 4, y - 1, 5, 1); ctx.fillRect(x + w, y - 1, 1, 5);
      ctx.fillRect(x - 1, y + h, 5, 1); ctx.fillRect(x - 1, y + h - 4, 1, 5);
      ctx.fillRect(x + w - 4, y + h, 5, 1); ctx.fillRect(x + w, y + h - 4, 1, 5);
    }

    /* 顶部：词性 + 吟唱条（BOSS 卡改为醒目的妖王标记） */
    if (e.elite) {
      PF.draw(ctx, 'BOSS', x + 6, y + 5, 1, locked ? '#ffd9a0' : '#ff9a8a');
      ctx.fillStyle = locked ? '#ffe08a' : '#c86a4a';
      ctx.fillRect(x + 6, y + 13, PF.width('BOSS', 1), 1);
    } else {
      PF.draw(ctx, e.pos.replace('.', ''), x + 6, y + 5, 1, locked ? '#c9a45c' : '#7faf92');
    }
    var barW = 30, bx = x + w - barW - 6, by = y + 6;
    ctx.fillStyle = '#1c2f26';
    ctx.fillRect(bx, by, barW, 2);
    ctx.fillStyle = danger ? '#e8705a' : '#7fce9a';
    ctx.fillRect(bx, by, Math.round(barW * prog), 2);
    ctx.fillStyle = '#fff3cf';
    ctx.fillRect(bx + Math.round(barW * prog) - 1, by - 1, 2, 4);

    /* 释义：单行优先，长的折两行，尽量把中文说全；左右各留 8px 才不贴边框 */
    var maxW = w - 16;
    if (e._mkey !== e.meaning + '|' + w) {
      e._mkey = e.meaning + '|' + w;
      e._mfit = meanFit(e.meaning || '', maxW);
    }
    var mf = e._mfit;
    ctx.font = 'bold ' + mf.size + 'px ' + MEAN_FONT;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6faf2';
    if (mf.lines.length === 1) {
      ctx.fillText(mf.lines[0], x + w / 2, y + 18);
    } else {
      ctx.fillText(mf.lines[0], x + w / 2, y + 11);
      ctx.fillText(mf.lines[1], x + w / 2, y + 24);
    }
    ctx.textAlign = 'left';

    /* 字母槽：居中一排；长单词自动收窄，免得撑出卡面 */
    var n = e.word.length;
    var sw = 8, sg = 2;
    var lim = w - 10;
    var fits = [[8, 2], [7, 1], [6, 1], [5, 0]];
    for (var fi2 = 0; fi2 < fits.length; fi2++) {
      sw = fits[fi2][0]; sg = fits[fi2][1];
      if (n * sw + (n - 1) * sg <= lim) break;
    }
    var tot = n * sw + (n - 1) * sg;
    var sx0 = Math.round(x + (w - tot) / 2);
    for (var i = 0; i < n; i++) {
      var lx = sx0 + i * (sw + sg);
      if (i < typed.length) {
        /* 点读模式：对错分开上色，错了直接红着，方便退格改 */
        var okc = typed.charAt(i).toUpperCase() === e.word.charAt(i).toUpperCase();
        ctx.fillStyle = okc ? 'rgba(255,224,138,0.22)' : 'rgba(232,112,90,0.26)';
        ctx.fillRect(lx, y + 38, sw, 11);
        ctx.fillStyle = okc ? '#e8c46a' : '#e8705a';
        ctx.fillRect(lx, y + 48, sw, 1);
        PF.draw(ctx, S.upper ? typed.charAt(i).toUpperCase() : typed.charAt(i).toLowerCase(),
          lx + 2, y + 40, 1, okc ? '#ffe9a8' : '#ff9a8a');
      } else {
        ctx.fillStyle = 'rgba(120,170,145,0.14)';
        ctx.fillRect(lx, y + 38, sw, 11);
        ctx.fillStyle = '#54806a';
        ctx.fillRect(lx + 2, y + 44, 4, 1);
      }
    }
  }

  /* 剑气轨迹上的采样点 */
  function projPos(pr, tt) {
    var t = clamp(tt, 0, 1);
    var e = 1 - Math.pow(1 - t, 3);
    return {
      x: pr.x + (pr.tx - pr.x) * e,
      y: pr.y + (pr.ty - pr.y) * e - Math.sin(t * Math.PI) * 9
    };
  }

  function drawProjectiles() {
    for (var i = 0; i < S.projs.length; i++) {
      var pr = S.projs[i];

      /* 出鞘前的蓄力光点（delay 现在最长 0.3 秒，得夹住，别算出负半径） */
      if (pr.delay > 0) {
        var cg = Math.max(0, Math.min(1, 1 - pr.delay / 0.18));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        Art.ditherDisc(ctx, pr.x, pr.y, 3 + cg * 5, '#bfefff', 0.5 + cg * 0.3, 1);
        Art.PX(ctx, pr.x, pr.y, '#ffffff');
        ctx.restore();
        continue;
      }

      var t = Math.min(1, pr.t);
      var head = projPos(pr, t);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      /* 弧形拖尾：小像素点，越远越淡 */
      for (var k = 1; k <= 9; k++) {
        var tt = t - k * 0.058;
        if (tt < 0) break;
        var pp = projPos(pr, tt);
        var a = (1 - k / 10) * 0.55;
        ctx.globalAlpha = a;
        Art.PX(ctx, pp.x, pp.y, '#9fe8ff');
        if (k < 4) {
          ctx.globalAlpha = a * 0.6;
          Art.PX(ctx, pp.x, pp.y - 1, '#dff6ff');
        }
      }

      /* 剑光本体：沿飞行方向的细长光刃 */
      var dx = Math.cos(pr.ang), dy = Math.sin(pr.ang);
      var LEN = 10, WID = 3.2;
      for (var s2 = -LEN; s2 <= LEN; s2++) {
        var f = 1 - Math.abs(s2) / LEN;
        var half = WID * Math.pow(f, 0.65);
        for (var w2 = -half; w2 <= half; w2 += 0.5) {
          ctx.globalAlpha = 0.55 + 0.45 * f;
          Art.PX(ctx,
            head.x + dx * s2 - dy * w2,
            head.y + dy * s2 + dx * w2,
            Math.abs(w2) < half * 0.45 ? '#ffffff' : '#9fe8ff');
        }
      }
      /* 刃尖高光 + 轻微冷光 */
      ctx.globalAlpha = 0.95;
      Art.PX(ctx, head.x + dx * (LEN + 1), head.y + dy * (LEN + 1), '#ffffff');
      ctx.globalAlpha = 0.30;
      Art.ditherDisc(ctx, head.x, head.y, 4, '#8fd8ff', 0.45, 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    for (var j = 0; j < S.orbs.length; j++) {
      var o = S.orbs[j];
      var ot = Math.min(1, o.t);
      var ox = o.x + (o.tx - o.x) * ot;
      var oy = o.y + (o.ty - o.y) * ot + Math.sin(ot * 8 + o.seed) * 2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      Art.ditherDisc(ctx, ox, oy, 10, '#7fd6b0', 0.35, 2);
      ctx.restore();
      Art.disc(ctx, ox, oy, 5, '#1c3a2c');
      Art.disc(ctx, ox, oy, 3, '#7fd6b0');
      Art.PX(ctx, ox - 1, oy - 1, '#eaffd2');
    }
  }

  function drawSlashes() {
    for (var i = 0; i < S.slashes.length; i++) {
      if (S.slashes[i].delay > 0) continue;
      Art.drawSlash(ctx, S.slashes[i]);
    }
  }

  function drawSwords() {
    for (var i = 0; i < S.swords.length; i++) {
      var s = S.swords[i];
      if (s.delay > 0) continue;
      var x = Math.round(s.x), y = Math.round(s.y);
      /* 高速下坠的气流拖尾 */
      for (var k = 1; k <= 6; k++) {
        var a = 0.72 - k * 0.10;
        if (a <= 0) break;
        ctx.globalAlpha = a * 0.50;
        Art.R(ctx, x - 3, y - 34 - k * 10, 7, 10, '#08161c');
        ctx.globalAlpha = a;
        Art.R(ctx, x - 1, y - 34 - k * 10, 3, 10, '#9fe8ff');
      }
      ctx.globalAlpha = 1;
      /* 剑：暗边 → 冷色剑身 → 白色刃芯，末端收锋 */
      Art.R(ctx, x - 3, y - 26, 7, 28, '#08161c');
      Art.R(ctx, x - 2, y - 25, 5, 24, '#8ec6d8');
      Art.R(ctx, x - 1, y - 25, 3, 24, '#eafaff');
      Art.R(ctx, x, y - 25, 1, 24, '#ffffff');
      Art.PX(ctx, x - 2, y - 1, '#08161c');
      Art.PX(ctx, x + 2, y - 1, '#08161c');
      Art.R(ctx, x - 1, y - 1, 3, 1, '#dff6ff');
      Art.PX(ctx, x - 1, y, '#08161c');
      Art.PX(ctx, x + 1, y, '#08161c');
      Art.PX(ctx, x, y, '#ffffff');
      Art.PX(ctx, x, y + 1, '#ffffff');
      Art.PX(ctx, x, y + 2, '#9fe8ff');
      /* 护手 */
      Art.R(ctx, x - 7, y - 29, 15, 5, '#08161c');
      Art.R(ctx, x - 6, y - 28, 13, 3, '#e8b95a');
      Art.R(ctx, x - 6, y - 28, 13, 1, '#fff0bf');
      /* 剑柄 + 剑首 */
      Art.R(ctx, x - 2, y - 38, 5, 10, '#08161c');
      Art.R(ctx, x - 1, y - 37, 3, 9, '#a07a44');
      Art.R(ctx, x - 3, y - 41, 7, 4, '#08161c');
      Art.R(ctx, x - 2, y - 40, 5, 2, '#e8b95a');
    }
  }

  function drawParticles() {
    for (var i = 0; i < S.parts.length; i++) {
      var p = S.parts[i];
      var a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      if (p.ring) {
        var r = p.r + (1 - a) * 16;
        for (var ang = 0; ang < 6.28; ang += 0.28) {
          Art.PX(ctx, p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, p.color);
        }
      } else {
        Art.R(ctx, p.x, p.y, p.size, p.size, p.color);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    for (var i = 0; i < S.texts.length; i++) {
      var t = S.texts[i];
      var a = clamp(t.life / t.max, 0, 1);
      ctx.globalAlpha = a;
      var w = PF.width(t.text, t.scale);
      PF.draw(ctx, t.text, t.x - w / 2, t.y, t.scale, t.color, 'rgba(6,14,10,0.85)');
    }
    ctx.globalAlpha = 1;
  }

    return { drawPlayerWorld: drawPlayerWorld, drawEnemies: drawEnemies,
      drawProjectiles: drawProjectiles, drawSlashes: drawSlashes, drawSwords: drawSwords,
      drawParticles: drawParticles, drawTexts: drawTexts };
  };
})(window);
