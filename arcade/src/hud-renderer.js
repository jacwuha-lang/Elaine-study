/* 街机 HUD、营地、技能栏和提示层绘制。 */
(function (global) {
  'use strict';
  global.createArcadeHudRenderer = function (d) {
    var S = d.S, W = d.W, H = d.H, ctx = d.ctx, PF = d.PF, Art = d.Art;
    var ARTS = global.ARTS, SHOP = global.SHOP;
    var clamp = d.clamp, arcOn = d.arcOn, arcPort = d.arcPort, fsMode = d.fsMode;
    var focusEnemy = d.focusEnemy, drawPalette = d.drawPalette, hintReady = d.hintReady;
    var hintPanelHit = d.hintPanelHit, wordLeftRatio = d.wordLeftRatio;
    var paletteBox = d.paletteBox, paletteLetters = d.paletteLetters;
    var inputBad = d.inputBad, cancelHint = d.cancelHint, levelName = d.levelName;
    var bossName = d.bossName, campRows = d.campRows, campLevel = d.campLevel;
    var campCost = d.campCost, campOwned = d.campOwned;
    var sfx = d.sfx, muted = d.muted, voiceOff = d.voiceOff;
    var artCd = d.artCd, artCdMax = d.artCdMax;
    var PAL_Y = d.PAL_Y, PAL_H = d.PAL_H, CASE_BTN = d.CASE_BTN;
    var SHOP_BTN = d.SHOP_BTN, HINT_BTN = d.HINT_BTN, HINT_COST = d.HINT_COST;
  function panel(x, y, w, h, accent) {
    ctx.fillStyle = 'rgba(5,16,13,0.80)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(x, y, 2, 1); ctx.fillRect(x, y, 1, 2);
    ctx.fillRect(x + w - 2, y, 2, 1); ctx.fillRect(x + w - 1, y, 1, 2);
    ctx.fillRect(x, y + h - 1, 2, 1); ctx.fillRect(x, y + h - 2, 1, 2);
    ctx.fillRect(x + w - 2, y + h - 1, 2, 1); ctx.fillRect(x + w - 1, y + h - 2, 1, 2);
  }

  function cn(text, x, y, size, color, align, weight) {
    ctx.font = (weight || '') + ' ' + size + 'px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.textAlign = 'left';
  }

  function bigCn(text, cx, cy, size, fill, outline) {
    ctx.font = 'bold ' + size + 'px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = outline;
    var o = [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2]];
    for (var i = 0; i < o.length; i++) ctx.fillText(text, cx + o[i][0], cy + o[i][1]);
    ctx.fillStyle = fill;
    ctx.fillText(text, cx, cy);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  /* 顶部 BOSS 血条：把小怪和妖王在"身份"上彻底分开 */
  function drawBossBar() {
    var boss = null;
    for (var i = 0; i < S.enemies.length; i++) {
      if (S.enemies[i].elite && S.enemies[i].alive) { boss = S.enemies[i]; break; }
    }
    if (!boss) return;
    var x0 = 196, y0 = 6, w = 148, h = 26;
    var r = clamp(boss.hp / boss.maxHp, 0, 1);
    var low = r < 0.3;
    var pulse = low ? 0.55 + 0.45 * Math.abs(Math.sin(S.t * 7)) : 1;

    ctx.fillStyle = 'rgba(12,7,7,0.86)';
    ctx.fillRect(x0, y0, w, h);
    /* 血玉镶边 + 四角尖刺 */
    ctx.fillStyle = low ? '#ff7a6a' : '#c8843f';
    ctx.globalAlpha = pulse;
    ctx.fillRect(x0, y0, w, 1); ctx.fillRect(x0, y0 + h - 1, w, 1);
    ctx.fillRect(x0, y0, 1, h); ctx.fillRect(x0 + w - 1, y0, 1, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd9a0';
    ctx.fillRect(x0 - 1, y0 - 1, 4, 1); ctx.fillRect(x0 - 1, y0 - 1, 1, 4);
    ctx.fillRect(x0 + w - 3, y0 - 1, 4, 1); ctx.fillRect(x0 + w, y0 - 1, 1, 4);
    ctx.fillRect(x0 - 1, y0 + h, 4, 1); ctx.fillRect(x0 - 1, y0 + h - 3, 1, 4);
    ctx.fillRect(x0 + w - 3, y0 + h, 4, 1); ctx.fillRect(x0 + w, y0 + h - 3, 1, 4);

    /* 名号 + BOSS 标签 */
    cn(bossName(S.level), x0 + 8, y0 + 2, 10, '#ffd9c0');
    PF.draw(ctx, 'BOSS', x0 + w - 8 - PF.width('BOSS', 1), y0 + 4, 1, low ? '#ff6a5a' : '#ff9a8a');

    /* 血槽 */
    var bx = x0 + 8, by = y0 + 16, bw = w - 16, bh = 5;
    ctx.fillStyle = '#2a1414';
    ctx.fillRect(bx, by, bw, bh);
    var fw = Math.round(bw * r);
    ctx.fillStyle = low ? '#ff6a5a' : '#e8705a';
    ctx.fillRect(bx, by, fw, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fillRect(bx, by, fw, 1);
    ctx.fillStyle = 'rgba(12,6,6,0.55)';
    for (var t = 1; t < 10; t++) ctx.fillRect(bx + Math.round(t * bw / 10), by, 1, bh);
  }

  function drawHUD() {
    if (!S.player) return;
    var p = S.player;

    /* 顶部左：关卡 */
    panel(8, 6, 178, 26, '#3f6f5e');
    /* 无尽模式下不写"第几关"——那套关卡章节已经拆了，写上去反而像有限关卡 */
    cn((arcOn() ? '无 尽 · ' : '第 ' + S.level + ' 关  ') + levelName(S.level), 14, 10, 11, '#e8f2e4');
    PF.draw(ctx, 'WAVE ' + Math.min(S.wave + 1, S.waves.length) + '/' + S.waves.length, 14, 24, 1, '#8fbfa8');
    /* 用过提示的标记：这一局所有词的键入时限已经翻倍 */
    if (S.timeBuff > 1) cn('时限 ×' + S.timeBuff, 180, 23, 8, '#ffe0a0', 'right');

    /* 顶部右：灵石 */
    panel(372, 6, 74, 20, '#3f6f5e');
    var gx = 379, gy = 10;
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(gx + 2, gy, 2, 1);
    ctx.fillRect(gx + 1, gy + 1, 4, 1);
    ctx.fillRect(gx, gy + 2, 6, 3);
    ctx.fillRect(gx + 1, gy + 5, 4, 1);
    ctx.fillRect(gx + 2, gy + 6, 2, 1);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(gx + 2, gy + 2, 2, 1);
    var stx = String(p.stones);
    PF.draw(ctx, stx, 372 + 74 - 6 - PF.width(stx, 2), 10, 2, '#ffe9a8');

    /* 顶部中：BOSS 血条（有妖王存活时才出现） */
    drawBossBar();

    /* 连击 */
    if (p.combo >= 2 && S.scene !== 'ult') {
      var col = p.combo >= 30 ? '#ff7a6a' : p.combo >= 20 ? '#ffb45a' : p.combo >= 10 ? '#ffe08a' : '#eef5ef';
      var sc = p.comboPop > 0 ? 4 : 3;
      var txt = String(p.combo);
      var ww = PF.width(txt, sc);
      PF.draw(ctx, txt, 240 - ww / 2, 38, sc, col, '#07120e');
      PF.draw(ctx, 'COMBO', 240 - PF.width('COMBO', 1) / 2, 64, 1, col);
    }

    /* 血条 */
    panel(8, 241, 118, 21, '#4a7a5f');
    cn('气血', 13, 244, 10, '#a8cdb6');
    cn(Math.max(0, Math.ceil(p.hp)) + ' / ' + p.maxHp, 121, 244, 9, '#cfe4d8', 'right');
    var hbx = 13, hby = 254, hbw = 108, hbh = 5;
    ctx.fillStyle = '#2a1a1a';
    ctx.fillRect(hbx, hby, hbw, hbh);
    var hpR = clamp(p.hp / p.maxHp, 0, 1);
    ctx.fillStyle = hpR > 0.5 ? '#7fce8f' : hpR > 0.25 ? '#e8c46a' : '#e8705a';
    ctx.fillRect(hbx, hby, Math.round(hbw * hpR), hbh);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(hbx, hby, Math.round(hbw * hpR), 1);
    ctx.fillStyle = 'rgba(20,36,28,0.75)';
    for (var i = 1; i < 10; i++) ctx.fillRect(hbx + Math.round(i * hbw / 10), hby, 1, hbh);

    /* 技能栏：气血与气劲当中，四格各有自己的伤害与冷却 */
    drawSkillBar();

    /* 气劲 */
    var full = p.qi >= 100;
    panel(354, 241, 118, 21, full ? '#e8c46a' : '#4a7a5f');
    for (var q = 0; q < 10; q++) {
      var qx = 359 + q * 11, qy = 254;
      ctx.fillStyle = '#22342a';
      ctx.fillRect(qx, qy, 10, 5);
      var seg = clamp((p.qi - q * 10) / 10, 0, 1);
      if (seg > 0) {
        ctx.fillStyle = full ? (Math.sin(S.t * 8) > 0 ? '#ffe9a8' : '#e8c46a') : '#5fbfa8';
        ctx.fillRect(qx, qy, Math.round(10 * seg), 5);
      }
    }
    if (full) {
      var blink = Math.sin(S.t * 6) > -0.2;
      cn('大招就绪', 359, 244, 10, blink ? '#ffe9a8' : '#c9a45c', 'left', 'bold');
      cn(S.hoverQi ? '点这里' : (S.kid ? '点这里' : 'ENTER'), 468, 245, 8,
        blink ? '#e8c46a' : '#7f6a3a', 'right');
    } else {
      cn('气劲', 359, 244, 10, '#a8cdb6');
    }

    /* 字母台 / 输入台：横在气血条正上方的一整条 */
    if (S.scene !== 'ult') {
      var shakeX = S.inputShake > 0 ? Math.sin(S.t * 90) * 3 * S.inputShake : 0;
      drawSideBtns();
      var tb = paletteBox();
      if (S.kid && !arcPort()) {
        /* 点读模式：A→Z 排好的字母盘，同一个字母可以反复点。
           底板刻意压薄，场景能透出来；只有字母块本身是不透明的 */
        ctx.fillStyle = 'rgba(5,16,13,0.46)';
        ctx.fillRect(tb.x + shakeX, tb.y, tb.w, tb.h);
        ctx.fillStyle = S.mistakeLock > 0 ? '#e8705a' : '#5a7a6a';
        ctx.fillRect(tb.x + shakeX, tb.y, tb.w, 1);
        ctx.fillRect(tb.x + shakeX, tb.y + tb.h - 1, tb.w, 1);
        ctx.fillRect(tb.x + shakeX, tb.y, 1, tb.h);
        ctx.fillRect(tb.x + shakeX + tb.w - 1, tb.y, 1, tb.h);
        var letters = paletteLetters();
        if (letters.length) {
          drawPalette(letters, { x: tb.x + shakeX, y: tb.y, w: tb.w, h: tb.h });
        } else {
          cn('等 待 来 敌', tb.x + tb.w / 2, tb.y + 8, 11, '#8faf9f', 'center');
        }
      } else {
        panel(tb.x + shakeX, tb.y, tb.w, tb.h,
          S.mistakeLock > 0 ? '#e8705a' : (S.keyPing > 0 ? '#9fd0b4' : '#5a7a6a'));
        if (S.input.length === 0) {
          cn(arcPort() ? '点下面的键盘拼字母' : '看中文 · 用键盘拼出英文',
            240, tb.y + 9, 11, '#6f8f80', 'center');
        } else {
          var disp = S.upper ? S.input.toUpperCase() : S.input;
          var sc2 = disp.length > 11 ? 2 : 3;
          var tw = PF.width(disp, sc2);
          PF.draw(ctx, disp, 240 - tw / 2, tb.y + Math.round((tb.h - 7 * sc2) / 2),
            sc2, S.mistakeLock > 0 ? '#ff9a8a' : '#ffe9a8', '#07120e');
          if (Math.floor(S.t * 3) % 2 === 0) {
            ctx.fillStyle = '#ffe9a8';
            ctx.fillRect(240 + tw / 2 + 2, tb.y + Math.round((tb.h - 7 * sc2) / 2), 2, 7 * sc2);
          }
        }
      }

      /* 键入时限：只在真的在拼的时候亮，剩得越少越红 */
      if (S.input.length && !S.paused) {
        var lr = wordLeftRatio();
        var ly = tb.y + tb.h + 1;
        ctx.fillStyle = 'rgba(8,18,14,0.70)';
        ctx.fillRect(tb.x, ly, tb.w, 2);
        ctx.fillStyle = lr > 0.5 ? '#7fce8f' : lr > 0.25 ? '#e8c46a' : '#e8705a';
        ctx.fillRect(tb.x, ly, Math.round(tb.w * lr), 2);
      }
    }

    /* 横幅：柔和墨晕 + 金色细线 */
    if (S.banner) {
      var bt = S.banner;
      var a = Math.min(1, bt.t * 2.6) * Math.min(1, (bt.max - bt.t) * 7);
      var by = 94, bh = 34, cy = by + bh / 2;
      ctx.globalAlpha = a;

      /* 椭圆墨晕，避免出现矩形硬边 */
      ctx.save();
      ctx.translate(240, cy);
      ctx.scale(1, 0.20);
      var rg = ctx.createRadialGradient(0, 0, 8, 0, 0, 168);
      rg.addColorStop(0, 'rgba(5,16,13,0.86)');
      rg.addColorStop(0.5, 'rgba(5,16,13,0.66)');
      rg.addColorStop(1, 'rgba(5,16,13,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(-168, -168, 336, 336);
      ctx.restore();

      var gl = ctx.createLinearGradient(108, 0, 372, 0);
      gl.addColorStop(0, 'rgba(232,196,106,0)');
      gl.addColorStop(0.5, 'rgba(255,233,168,1)');
      gl.addColorStop(1, 'rgba(232,196,106,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(108, cy - 16, 264, 1);
      ctx.fillRect(108, cy + 15, 264, 1);

      if (/[^\x00-\x7F]/.test(bt.text)) {
        bigCn(bt.text, 240, cy, 18, '#ffe9a8', '#0e1a14');
      } else {
        PF.draw(ctx, bt.text, 240 - PF.width(bt.text, 2) / 2, cy - 7, 2, '#ffe9a8', 'rgba(10,20,16,0.9)');
      }
      if (bt.sub) cn(bt.sub, 240, cy + 19, 9, '#9fc4ad', 'center');
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- 绘制：大招界面 ---------------- */
  /* 大招期间只压暗背景，特效与角色保持高亮 */
  function drawUltVeil() {
    if (S.scene !== 'ult' || !S.ult) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(112,142,146,0.58)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawUltUI() {
    if (S.scene !== 'ult' || !S.ult) return;
    var u = S.ult;
    var topH = 30;
    var botH = 30;

    ctx.fillStyle = '#050b0d';
    ctx.fillRect(0, 0, W, topH);
    ctx.fillRect(0, H - botH, W, botH);
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(0, topH - 1, W, 1);
    ctx.fillRect(0, H - botH, W, 1);
    /* 上下金线内侧的暗金渐层 */
    ctx.fillStyle = 'rgba(232,196,106,0.14)';
    ctx.fillRect(0, topH - 4, W, 3);
    ctx.fillRect(0, H - botH + 1, W, 3);

    /* 上遮幅：英文小标（中文大字在画面正中） */
    var tl = 'ULTIMATE · MYRIAD SWORDS';
    PF.draw(ctx, tl, Math.round(240 - PF.width(tl, 1) / 2), 11, 1, '#c9a45c');
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(196, 22, 88, 1);

    /* 命中瞬间的全屏冲击环 */
    var st = u.fxT - 0.34;
    if (st > 0 && st < 0.55) {
      var sp = st / 0.55;
      var rw = 8 + sp * 330;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - sp) * 0.9;
      for (var q = 0; q < 6.283; q += 0.035) {
        Art.PX(ctx, 240 + Math.cos(q) * rw, 150 + Math.sin(q) * rw * 0.62, '#ffffff');
      }
      ctx.globalAlpha = (1 - sp) * 0.5;
      for (var q2 = 0; q2 < 6.283; q2 += 0.05) {
        Art.PX(ctx, 240 + Math.cos(q2) * (rw - 5), 150 + Math.sin(q2) * (rw - 5) * 0.62, '#bfefff');
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    var k2 = clamp((u.fxT - 0.18) / 0.42, 0, 1);
    ctx.globalAlpha = k2;
    bigCn('万剑归宗', 240, 112, 34, '#fff3cf', '#20160a');
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(196, 141, 88, 1);
    PF.draw(ctx, 'MYRIAD SWORDS', 240 - PF.width('MYRIAD SWORDS', 1) / 2, 148, 1, '#ffe9a8', 'rgba(6,14,10,0.92)');
    ctx.globalAlpha = 1;

    /* 下遮幅：施放进度 + 说明 */
    var tw2 = 264, tx = (W - tw2) / 2, ty = H - botH + 6;
    ctx.fillStyle = '#16261f';
    ctx.fillRect(tx, ty, tw2, 2);
    var pc = clamp(u.fxT / 2.0, 0, 1);
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(tx, ty, Math.round(tw2 * pc), 2);
    ctx.fillStyle = '#fff3cf';
    ctx.fillRect(tx + Math.round(tw2 * pc) - 1, ty - 1, 2, 4);
    cn('气劲尽放 · 全屏斩杀', 240, ty + 9, 11, '#8fa89a', 'center');
  }

  /* ---------------- 绘制：标题 / 结算 ---------------- */
  function drawTitle() {
    ctx.fillStyle = 'rgba(4,12,10,0.34)';
    ctx.fillRect(0, 0, W, H);

    var bob = Math.sin(S.t * 1.2) * 2;
    bigCn('单词风云录', 240, 84 + bob, 34, '#f6ecc4', '#16241c');

    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(150, 106 + bob, 180, 1);
    ctx.fillRect(146, 105 + bob, 4, 3);
    ctx.fillRect(330, 105 + bob, 4, 3);

    cn('第 一 章 · 竹 海 晨 雾', 240, 114 + bob, 12, '#cfe0c6', 'center');

    /* 副标题后垫一层淡墨，保证在亮背景上也读得清 */
    ctx.save();
    ctx.translate(240, 168);
    ctx.scale(1, 0.22);
    var tg = ctx.createRadialGradient(0, 0, 10, 0, 0, 190);
    tg.addColorStop(0, 'rgba(4,12,10,0.66)');
    tg.addColorStop(0.6, 'rgba(4,12,10,0.42)');
    tg.addColorStop(1, 'rgba(4,12,10,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(-190, -190, 380, 380);
    ctx.restore();

    cn('看中文 · 拼英文 · 自动出招', 240, 158, 12, '#dfeade', 'center');
    cn(S.kid ? '点下面的字母拼出来 · 不用打字' : '拼得越快，伤害越高', 240, 176, 11, '#8faf9a', 'center');

    ctx.fillStyle = 'rgba(6,16,13,0.72)';
    ctx.fillRect(152, 194, 176, 21);
    ctx.fillStyle = 'rgba(232,196,106,0.55)';
    ctx.fillRect(152, 194, 176, 1);
    ctx.fillRect(152, 214, 176, 1);
    cn(S.kid ? '切换 换目标 · 跳过 花 5 血换词' : '空格 闪避   回车 大招', 240, 199, 11, '#dfeade', 'center');

    if (Math.floor(S.t * 2) % 2 === 0) {
      cn('开 始 · 序 8:15', 240, 232, 13, '#ffe9a8', 'center', 'bold');
    }
    PF.draw(ctx, 'PIXEL DEMO v0.1', 8, 254, 1, '#3d5c52');
    /* 全屏时右下角被浏览器的全屏按钮占着，这行字往左让一点。
       音效 / 语音各一句，谁关了都一眼看得出来 */
    cn((muted ? '音效已关' : '音效已开') + ' · ' + (voiceOff ? '语音已关' : '语音已开'),
      fsMode() ? 400 : 444, 254, 9,
      (muted && voiceOff) ? '#7a5a52' : ((muted || voiceOff) ? '#8a6f52' : '#4d7a66'), 'right');
  }

  function drawResult() {
    ctx.fillStyle = 'rgba(3,9,8,0.72)';
    ctx.fillRect(0, 0, W, H);

    var pw = 300, ph = 162;
    var px = (W - pw) / 2, py = (H - ph) / 2;
    panel(px, py, pw, ph, '#5a7a6a');

    /* 金线四角 */
    ctx.fillStyle = '#e8c46a';
    var cnr = 9;
    ctx.fillRect(px, py, cnr, 1); ctx.fillRect(px, py, 1, cnr);
    ctx.fillRect(px + pw - cnr, py, cnr, 1); ctx.fillRect(px + pw - 1, py, 1, cnr);
    ctx.fillRect(px, py + ph - 1, cnr, 1); ctx.fillRect(px, py + ph - cnr, 1, cnr);
    ctx.fillRect(px + pw - cnr, py + ph - 1, cnr, 1); ctx.fillRect(px + pw - 1, py + ph - cnr, 1, cnr);

    var winFlag = S.scene === 'clear';
    var winWord = arcOn() ? '此 档 清 完' : '关卡完成';
    bigCn(winFlag ? winWord : '气血耗尽', 240, py + 28, 22, winFlag ? '#f6ecc4' : '#ff9a8a', '#16241c');

    /* 标题下的分隔线 */
    ctx.fillStyle = 'rgba(232,196,106,0.75)';
    ctx.fillRect(px + 40, py + 48, pw - 80, 1);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(px + pw / 2 - 3, py + 47, 6, 3);

    var acc = S.stats.correct + S.stats.wrong;
    var rate = acc ? Math.round(S.stats.correct / acc * 100) : 0;
    var rows = [
      ['正确率', rate + '%'],
      ['最高连击', S.stats.maxCombo + ' COMBO'],
      ['用时', S.stats.time.toFixed(1) + 's'],
      ['灵石', S.player.stones + '']
    ];
    for (var i = 0; i < rows.length; i++) {
      var ry = py + 58 + i * 18;
      cn(rows[i][0], px + 34, ry, 11, '#9fc4ad');
      cn(rows[i][1], px + pw - 34, ry, 11, '#ffe9a8', 'right');
      ctx.fillStyle = 'rgba(120,160,140,0.18)';
      ctx.fillRect(px + 32, ry + 14, pw - 64, 1);
    }

    /* 页脚提示常驻，只做明暗呼吸 */
    var pulse = 0.62 + 0.38 * Math.sin(S.t * 4);
    ctx.globalAlpha = pulse;
    cn(S.kid ? '点 击 屏 幕 再 来 一 次' : '按 空格 再来一次', 240, py + ph - 20, 12, '#ffe9a8', 'center', 'bold');
    ctx.globalAlpha = 1;
  }

  /* ---------------- 关卡胜利结算：斩了妖王才出 ---------------- */
  function drawVictory() {
    var v = S.victory;
    if (!v) return;
    var k = clamp(v.t / 0.5, 0, 1);          /* 淡入 */
    var rise = Math.round((1 - k) * 10);

    ctx.fillStyle = 'rgba(3,9,8,' + (0.84 * k) + ')';
    ctx.fillRect(0, 0, W, H);

    var pw = 324, ph = 196;
    var px = (W - pw) / 2, py = Math.round((H - ph) / 2) + rise;

    ctx.globalAlpha = k;
    /* 先铺一层实底，免得战场上的角色从面板里透出来 */
    ctx.fillStyle = '#08160f';
    ctx.fillRect(px, py, pw, ph);
    panel(px, py, pw, ph, '#5a7a6a');

    /* 金线四角 */
    ctx.fillStyle = '#e8c46a';
    var cnr = 11;
    ctx.fillRect(px, py, cnr, 1); ctx.fillRect(px, py, 1, cnr);
    ctx.fillRect(px + pw - cnr, py, cnr, 1); ctx.fillRect(px + pw - 1, py, 1, cnr);
    ctx.fillRect(px, py + ph - 1, cnr, 1); ctx.fillRect(px, py + ph - cnr, 1, cnr);
    ctx.fillRect(px + pw - cnr, py + ph - 1, cnr, 1); ctx.fillRect(px + pw - 1, py + ph - cnr, 1, cnr);

    /* 标题 */
    bigCn(arcOn() ? '此 档 清 完' : '关 卡 通 关', 240, py + 24, 26, '#f6ecc4', '#16241c');
    cn(arcOn() ? ('第 ' + ARCADE.tier + ' 档 · ' + v.name) : ('第 ' + v.level + ' 关 · ' + v.name),
      240, py + 52, 11, '#a8cdb6', 'center');

    /* 斩妖王那一行：金色，带两侧短剑装饰 */
    var by = py + 68;
    cn('斩 · ' + v.boss, 240, by, 12, '#ffe9a8', 'center', 'bold');
    ctx.fillStyle = 'rgba(232,196,106,0.55)';
    ctx.fillRect(240 - 76, by + 9, 40, 1);
    ctx.fillRect(240 + 36, by + 9, 40, 1);

    /* 分隔线 */
    ctx.fillStyle = 'rgba(232,196,106,0.60)';
    ctx.fillRect(px + 26, py + 84, pw - 52, 1);

    /* 星级：看正确率与气血，连击够了再加一档（1 星保底） */
    var stars = 1;
    if (v.rate >= 85 && v.hp >= v.maxHp * 0.40) stars = 2;
    if (v.rate >= 95 && v.hp >= v.maxHp * 0.60 && v.combo >= 5) stars = 3;
    var STAR = [
      '0001000',
      '0001000',
      '0111110',
      '1111111',
      '0111110',
      '0011100',
      '0110110'
    ];
    for (var s = 0; s < 3; s++) {
      var sx = 240 - 34 + s * 26, sy = py + 88;
      var on = s < stars;
      /* 先按四邻扩一圈暗边，再压上亮色：暗底上也看得出形状 */
      var edge = on ? '#7a5f24' : 'rgba(56,74,66,0.60)';
      var core = on ? '#ffd76a' : 'rgba(72,94,84,0.55)';
      var NB = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      ctx.fillStyle = edge;
      for (var ry = 0; ry < STAR.length; ry++) {
        for (var rx = 0; rx < 7; rx++) {
          if (STAR[ry].charAt(rx) !== '1') continue;
          for (var nb = 0; nb < 4; nb++) {
            ctx.fillRect(sx + rx + NB[nb][0], sy + ry + NB[nb][1], 1, 1);
          }
        }
      }
      ctx.fillStyle = core;
      for (ry = 0; ry < STAR.length; ry++) {
        for (rx = 0; rx < 7; rx++) {
          if (STAR[ry].charAt(rx) === '1') ctx.fillRect(sx + rx, sy + ry, 1, 1);
        }
      }
    }

    /* 四格数据：两列对齐，右列数值靠右留白 */
    var cells = [
      ['正确率', v.rate + '%'],
      ['最高连击', v.combo + ''],
      ['用时', v.time.toFixed(1) + 's'],
      ['气血', v.hp + '/' + v.maxHp]
    ];
    var cw = 118, cgap = 16;
    for (var i = 0; i < cells.length; i++) {
      var cx = px + 26 + (i % 2) * (cw + cgap);
      var cy = py + 108 + Math.floor(i / 2) * 24;
      cn(cells[i][0], cx, cy, 10, '#8faf9a');
      cn(cells[i][1], cx + cw, cy, 11, '#ffe9a8', 'right', 'bold');
      ctx.fillStyle = 'rgba(120,160,140,0.16)';
      ctx.fillRect(cx, cy + 13, cw, 1);
    }

    /* 灵石收获单独一行：整行铺满，数值靠右 */
    cn('灵石', px + 26, py + 150, 10, '#8faf9a');
    cn(v.stones + '', px + pw - 26, py + 148, 12, '#ffe9a8', 'right', 'bold');
    /* 待复习：错词本里还没掌握的词数（技能跳过、跳过换词、拼错的都算） */
    if (v.review) {
      cn('待复习', px + 96, py + 150, 10, '#8faf9a');
      cn(v.review + ' 词', px + 150, py + 150, 10, '#ff9a7a', 'left', 'bold');
    }
    ctx.fillStyle = 'rgba(232,196,106,0.35)';
    ctx.fillRect(px + 26, py + 164, pw - 52, 1);

    /* 页脚：呼吸提示 */
    if (v.t > 0.55) {
      var pulse = 0.6 + 0.4 * Math.sin(S.t * 4.4);
      ctx.globalAlpha = k * pulse;
      cn(S.kid ? '点 击 继 续' : '按 空 格 继 续', 240, py + ph - 20, 12, '#ffe9a8', 'center', 'bold');
    }
    ctx.globalAlpha = 1;
  }

  var BTN = { x: 452, y: 4, w: 22, h: 22 };    /* 音效开关 */
  var BTNV = { x: 452, y: 28, w: 22, h: 22 };  /* 语音（朗读）开关：紧贴在音效下面 */
  var BTN2 = { x: 452, y: 52, w: 22, h: 22 };  /* 点读模式 */
  var CAMP_TAB = [
    { x: 292, y: 6, w: 76, h: 22, name: '道 具 点' },
    { x: 376, y: 6, w: 76, h: 22, name: '洞 府 天 地' }
  ];
  var CAMP_GO = { x: 178, y: 208, w: 124, h: 26 };
  var CAMP_PREV = { x: 170, y: 190, w: 28, h: 16 };
  var CAMP_NEXT = { x: 282, y: 190, w: 28, h: 16 };

  /* 翻页小箭头（像素三角，比字符箭头清楚） */
  function drawPagerBtn(b, dir, on, hot) {
    ctx.fillStyle = 'rgba(6,16,13,0.90)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    var edge = on ? (hot ? '#ffffff' : 'rgba(232,196,106,0.70)') : 'rgba(70,90,82,0.40)';
    ctx.fillStyle = edge;
    ctx.fillRect(b.x, b.y, b.w, 1); ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    ctx.fillRect(b.x, b.y, 1, b.h); ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
    var c = on ? (hot ? '#ffffff' : '#ffe9a8') : '#3f574e';
    var cx = b.x + Math.round(b.w / 2), cy = b.y + Math.round(b.h / 2);
    ctx.fillStyle = c;
    for (var k = 0; k < 4; k++) {
      var hgt = 1 + k * 2;
      /* dir<0 尖端朝左：高的那几根往右排 */
      var x = dir < 0 ? (cx - 1 + k) : (cx + 1 - k);
      ctx.fillRect(x, cy - Math.floor(hgt / 2), 1, hgt);
    }
  }
  function inCampBox(b, x, y) {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  /* 列表分页：一页四行，翻页而不是滚动（滚动条太难看） */
  var CAMP_ROWS = 4;
  function campCols() { return S.camp.tab === 0 ? 2 : 1; }
  function campPerPage() { return campCols() * CAMP_ROWS; }
  function campPageCount() {
    return Math.max(1, Math.ceil(campRows().length / campPerPage()));
  }
  function campPage(n) {
    var pg = clamp(n, 0, campPageCount() - 1);
    if (pg === S.camp.page) return;          /* 已经在头/尾页就别响 */
    S.camp.page = pg;
    S.camp.sel = pg * campPerPage();
    S.camp.hover = -1;
    sfx.tab();
  }
  /* 键盘上下走到页边界时自动翻页 */
  function campEnsureSel() {
    var per = campPerPage();
    var pg = Math.floor(S.camp.sel / per);
    if (pg !== S.camp.page) S.camp.page = clamp(pg, 0, campPageCount() - 1);
  }
  function campRowVisible(i) {
    return Math.floor(i / campPerPage()) === S.camp.page;
  }

  function campCardRect(i) {
    var cols = campCols();
    var w = cols === 2 ? 152 : 312;
    var h = 33, gx = 8, gy = 4;
    var j = i - S.camp.page * campPerPage();
    var col = j % cols, row = Math.floor(j / cols);
    return { x: 160 + col * (w + gx), y: 42 + row * (h + gy), w: w, h: h };
  }

  function drawCamp() {
    var p = S.player, m = S.meta, c = S.camp;
    var rows = campRows();

    /* 底：墨色压暗战场 */
    ctx.fillStyle = 'rgba(4,10,9,0.90)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(232,196,106,0.06)';
    for (var gl = 0; gl < W; gl += 4) ctx.fillRect(gl, 36, 1, H - 36);

    /* 顶部标题 */
    /* 局内商店是从战斗里切过来的，不该写成"通关" */
    var campTitle = (arcOn() ? '无 尽 · ' : '第 ' + S.level + ' 关 · ') + levelName(S.level);
    if (!(c && c.fromRun)) campTitle += ' · 通 关';
    cn(campTitle, 12, 6, 15, '#ffe9a8', 'left', 'bold');
    cn('灵石 ' + p.stones, 12, 25, 11, '#9fd0b4');
    cn('气血 ' + Math.max(0, Math.ceil(p.hp)) + '/' + p.maxHp, 86, 25, 11, '#9fc4ad');

    /* 页签 */
    for (var ti = 0; ti < CAMP_TAB.length; ti++) {
      var tb = CAMP_TAB[ti];
      var on = c.tab === ti, hot = c.hoverTab === ti;
      ctx.fillStyle = on ? 'rgba(52,42,16,0.95)' : (hot ? 'rgba(20,38,30,0.92)' : 'rgba(6,16,13,0.82)');
      ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
      ctx.fillStyle = on ? '#ffe9a8' : (hot ? '#9fd0b4' : '#4f6f62');
      ctx.fillRect(tb.x, tb.y, tb.w, 1); ctx.fillRect(tb.x, tb.y + tb.h - 1, tb.w, 1);
      ctx.fillRect(tb.x, tb.y, 1, tb.h); ctx.fillRect(tb.x + tb.w - 1, tb.y, 1, tb.h);
      cn(tb.name, tb.x + tb.w / 2, tb.y + 5, 12, on ? '#ffe9a8' : '#8fb3a2', 'center', on ? 'bold' : '');
    }

    /* 页码：右上角一行小字 */
    if (campPageCount() > 1) {
      cn((S.camp.page + 1) + ' / ' + campPageCount() + ' 页', 470, 30, 9, '#6f8f80', 'right');
    }

    /* 左侧：角色面板 */
    panel(8, 42, 144, 164, '#4a7a5f');
    cn('凌 玄', 18, 48, 14, '#ffe9a8', 'left', 'bold');
    ctx.fillStyle = 'rgba(232,196,106,0.45)';
    ctx.fillRect(16, 66, 128, 1);

    var stats = [
      ['攻 击', p.atk + ''],
      ['暴 击', Math.round(p.crit * 100) + '%'],
      ['气 劲', '+' + Math.round((p.qiMul - 1) * 100) + '%'],
      ['闪 避', p.dodgeMax.toFixed(1) + 's']
    ];
    for (var si = 0; si < stats.length; si++) {
      var sy = 74 + si * 17;
      cn(stats[si][0], 18, sy, 11, '#9fc4ad');
      cn(stats[si][1], 140, sy, 11, '#e7f2e6', 'right');
    }

    ctx.fillStyle = 'rgba(232,196,106,0.30)';
    ctx.fillRect(16, 144, 128, 1);
    cn('武器', 18, 149, 10, '#7fa08f');
    cn(m.weapon >= 0 ? SHOP.weapon[m.weapon].name : '竹 剑', 140, 149, 10,
      m.weapon >= 0 ? '#ffe9a8' : '#9fc4ad', 'right');
    cn('防具', 18, 164, 10, '#7fa08f');
    cn(m.armor >= 0 ? SHOP.armor[m.armor].name : '布 衣', 140, 164, 10,
      m.armor >= 0 ? '#ffe9a8' : '#9fc4ad', 'right');
    cn('技能', 18, 179, 10, '#7fa08f');
    var sNum = 0, kk;
    for (kk in m.skills) if (m.skills[kk] > 0) sNum++;
    cn(sNum ? sNum + ' 门' : '—', 140, 179, 10, sNum ? '#ffe9a8' : '#9fc4ad', 'right');
    cn('功法', 18, 194, 10, '#7fa08f');
    var aNum = 0;
    for (kk in (m.arts || {})) if (m.arts[kk] > 0) aNum++;
    cn(aNum ? aNum + ' 招' : '—', 140, 194, 10, aNum ? '#ffe9a8' : '#9fc4ad', 'right');

    /* 右侧：条目（一页四行，翻页看下一页） */
    for (var i = 0; i < rows.length; i++) {
      if (!campRowVisible(i)) continue;
      var r = campCardRect(i), row = rows[i], it = row.item;
      var owned = campOwned(row), cost = campCost(row);
      var can = !owned && p.stones >= cost;
      var sel = c.sel === i, hov = c.hover === i;

      var bg = sel ? 'rgba(52,42,16,0.96)' : (hov ? 'rgba(18,34,27,0.94)' : 'rgba(8,20,16,0.92)');
      ctx.fillStyle = bg;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      var bc = sel ? '#ffe9a8' : (owned ? '#5a8f74' : (can ? '#3f6f5e' : '#4a4038'));
      ctx.fillStyle = bc;
      ctx.fillRect(r.x, r.y, r.w, 1); ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
      ctx.fillRect(r.x, r.y, 1, r.h); ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);

      var nameC = owned ? '#8fb3a2' : (can ? '#ffe9a8' : '#b9c7bd');
      cn(it.name, r.x + 8, r.y + 3, 12, nameC, 'left', 'bold');
      cn(it.sub, r.x + 8, r.y + 18, 9, '#8faf9a');

      if (row.kind === 'skill' || row.kind === 'art') {
        /* 等级点：●●○ */
        var lv = campLevel(row);
        var dotX = r.x + r.w - 38 - (it.max - 1) * 8;
        for (var d = 0; d < it.max; d++) {
          ctx.fillStyle = d < lv ? '#ffe9a8' : '#3a4a42';
          ctx.fillRect(dotX + d * 8, r.y + 21, 5, 5);
        }
      }

      if (owned) {
        cn(row.kind === 'weapon' || row.kind === 'armor' ? '已 装 备' : '已 学 满',
          r.x + r.w - 8, r.y + 10, 10, '#7fce9a', 'right');
      } else {
        cn(cost + '', r.x + r.w - 30, r.y + 3, 13, can ? '#ffe9a8' : '#a1755f', 'right', 'bold');
        cn('灵石', r.x + r.w - 8, r.y + 7, 9, can ? '#9fc4ad' : '#7a6258', 'right');
      }
    }

    /* 翻页条：只在多于一页时出现（不放滚动条） */
    if (campPageCount() > 1) {
      var pgN = campPageCount(), pg = S.camp.page;
      drawPagerBtn(CAMP_PREV, -1, pg > 0, c.hoverPrev);
      drawPagerBtn(CAMP_NEXT, 1, pg < pgN - 1, c.hoverNext);
      cn('第 ' + (pg + 1) + ' / ' + pgN + ' 页', 240, CAMP_PREV.y + 3, 10, '#8fb3a2', 'center');
    }

    /* 继续按钮 */
    var gp = c.hoverGo ? 0.75 + 0.25 * Math.sin(S.t * 6) : 0.55;
    ctx.fillStyle = 'rgba(6,16,13,0.90)';
    ctx.fillRect(CAMP_GO.x, CAMP_GO.y, CAMP_GO.w, CAMP_GO.h);
    ctx.globalAlpha = gp;
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(CAMP_GO.x, CAMP_GO.y, CAMP_GO.w, 1);
    ctx.fillRect(CAMP_GO.x, CAMP_GO.y + CAMP_GO.h - 1, CAMP_GO.w, 1);
    ctx.fillRect(CAMP_GO.x, CAMP_GO.y, 1, CAMP_GO.h);
    ctx.fillRect(CAMP_GO.x + CAMP_GO.w - 1, CAMP_GO.y, 1, CAMP_GO.h);
    ctx.globalAlpha = 1;
    cn(S.camp && S.camp.fromRun ? '回 战 场' : '继 续 闯 关', CAMP_GO.x + CAMP_GO.w / 2, CAMP_GO.y + 6, 13, '#ffe9a8', 'center', 'bold');

    /* 提示与消息 */
    if (c.msgT > 0) {
      ctx.globalAlpha = Math.min(1, c.msgT * 2.2);
      cn(c.msg, 240, 239, 11, '#ffe9a8', 'center');
      ctx.globalAlpha = 1;
    }
    cn(S.camp && S.camp.fromRun
      ? '↑↓ 选择 · 回车买下 · Tab 换页 · 空格回战场（战斗原地暂停）'
      : '↑↓ 选择 · PgUp/PgDn 翻页 · 回车买下 · Tab 换页 · 空格继续',
      240, 256, 9, '#6f8f80', 'center');
  }

  /* 点读模式开关：给不会打字的小朋友 */
  function drawKidBtn() {
    if (S.scene === 'ult') return;
    var x = BTN2.x, y = BTN2.y, w = BTN2.w, h = BTN2.h;
    var hot = S.hoverKid;
    ctx.fillStyle = hot ? 'rgba(20,38,30,0.92)' : 'rgba(6,16,13,0.82)';
    ctx.fillRect(x, y, w, h);
    var bc = S.kid ? 'rgba(232,196,106,0.72)' : 'rgba(120,150,135,0.50)';
    ctx.fillStyle = bc;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    PF.draw(ctx, 'ABC', x + 3, y + 6, 1, S.kid ? '#ffe9a8' : '#7f9a8c');
    ctx.fillStyle = S.kid ? '#7fce9a' : '#4a5f57';
    ctx.fillRect(x + w - 6, y + h - 6, 3, 3);
  }

  function drawSpeakerBtn() {
    var x = BTN.x, y = BTN.y, w = BTN.w, h = BTN.h;
    var hot = S.hoverBtn;
    ctx.fillStyle = hot ? 'rgba(20,38,30,0.92)' : 'rgba(6,16,13,0.82)';
    ctx.fillRect(x, y, w, h);
    var bc = muted ? 'rgba(232,112,90,0.75)' : 'rgba(232,196,106,0.70)';
    ctx.fillStyle = bc;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);

    var c = muted ? '#e8705a' : '#ffe9a8';
    /* 喇叭后箱 + 锥面 */
    Art.R(ctx, x + 5, y + 9, 3, 5, c);
    for (var i = 0; i < 4; i++) {
      Art.R(ctx, x + 8 + i, y + 9 - i, 1, 5 + i * 2, c);
    }
    if (muted) {
      /* 静音斜杠 */
      for (var d = 0; d < 9; d++) {
        Art.PX(ctx, x + 13 + d, y + 7 + d, '#ff9a8a');
        Art.PX(ctx, x + 13 + d, y + 8 + d, '#ff9a8a');
      }
    } else {
      /* 两道声波 */
      Art.PX(ctx, x + 14, y + 9, c);
      Art.PX(ctx, x + 15, y + 10, c);
      Art.PX(ctx, x + 15, y + 12, c);
      Art.PX(ctx, x + 14, y + 13, c);
      Art.PX(ctx, x + 17, y + 8, c);
      Art.PX(ctx, x + 18, y + 9, c);
      Art.PX(ctx, x + 18, y + 13, c);
      Art.PX(ctx, x + 17, y + 14, c);
    }
  }

  /* 语音开关：一只对话气泡（跟上面那个喇叭区分开）。
     关掉时整只变成红色 + 一道斜杠，跟音效按钮一个语汇，孩子一眼看得出「这个被禁了」 */
  function drawVoiceBtn() {
    var x = BTNV.x, y = BTNV.y, w = BTNV.w, h = BTNV.h;
    var hot = S.hoverVoice;
    ctx.fillStyle = hot ? 'rgba(20,38,30,0.92)' : 'rgba(6,16,13,0.82)';
    ctx.fillRect(x, y, w, h);
    var bc = voiceOff ? 'rgba(232,112,90,0.75)' : 'rgba(232,196,106,0.70)';
    ctx.fillStyle = bc;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);

    var c = voiceOff ? '#e8705a' : '#ffe9a8';
    /* 气泡：一个方框 + 左下角的小尾巴 */
    Art.R(ctx, x + 4, y + 7, 12, 1, c);
    Art.R(ctx, x + 4, y + 13, 8, 1, c);
    Art.R(ctx, x + 4, y + 7, 1, 7, c);
    Art.R(ctx, x + 15, y + 7, 1, 7, c);
    Art.R(ctx, x + 6, y + 14, 3, 1, c);
    Art.R(ctx, x + 7, y + 15, 2, 1, c);
    /* 气泡里三个点 = 正在说话 */
    Art.PX(ctx, x + 7, y + 10, c);
    Art.PX(ctx, x + 9, y + 10, c);
    Art.PX(ctx, x + 11, y + 10, c);
    if (voiceOff) {
      for (var d = 0; d < 9; d++) {
        Art.PX(ctx, x + 13 + d, y + 6 + d, '#ff9a8a');
        Art.PX(ctx, x + 13 + d, y + 7 + d, '#ff9a8a');
      }
    }
  }

  /* ---------------- 技能栏：气血与气劲之间 ---------------- */
  /* 四格从左到右：闪避 / 破空斩 / 寒冰咒 / 雷罡印，伤害与冷却各不相同 */
  var SK_X = 131, SK_Y = 241, SK_W = 52, SK_GAP = 3, SK_N = 4;

  function skillRect(i) {
    return { x: SK_X + i * (SK_W + SK_GAP), y: SK_Y, w: SK_W, h: 21 };
  }
  function skillName(i) { return i === 0 ? '闪避' : ARTS[i - 1].short; }
  function skillColor(i) { return i === 0 ? '#9fd0b4' : ARTS[i - 1].col; }

  function hitSkill(px2, py2) {
    for (var i = 0; i < SK_N; i++) {
      var r = skillRect(i);
      if (px2 >= r.x && px2 <= r.x + r.w && py2 >= r.y && py2 <= r.y + r.h) return i;
    }
    return -1;
  }
  function hitQi(px2, py2) {
    return px2 >= 354 && px2 <= 472 && py2 >= 241 && py2 <= 262;
  }

  function drawSkillBar() {
    var p = S.player;
    if (!p) return;
    var nAlive = 0, j;
    for (j = 0; j < S.enemies.length; j++) if (S.enemies[j].alive) nAlive++;

    for (var i = 0; i < SK_N; i++) {
      var r = skillRect(i);
      var cdMax = artCdMax(i), cd = artCd(i);
      var ready = cd <= 0.001;
      var cost = i === 0 ? 0 : ARTS[i - 1].qi;
      var afford = p.qi >= cost;
      var usable = ready && afford && (i === 0 || nAlive > 0);
      var col = skillColor(i);
      var hot = S.hoverSkill === i;

      ctx.fillStyle = usable ? 'rgba(10,26,20,0.92)' : 'rgba(5,12,10,0.92)';
      ctx.fillRect(r.x, r.y, r.w, r.h);

      /* 冷却遮罩：从左往右退，剩多少一眼看得出 */
      if (!ready) {
        ctx.fillStyle = 'rgba(0,0,0,0.54)';
        ctx.fillRect(r.x + 1, r.y + 1, Math.round((r.w - 2) * clamp(cd / cdMax, 0, 1)), r.h - 2);
      }

      var bc = usable ? (hot ? '#ffffff' : col) : (ready ? 'rgba(120,150,135,0.45)' : 'rgba(70,92,82,0.55)');
      ctx.fillStyle = bc;
      ctx.fillRect(r.x, r.y, r.w, 1); ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
      ctx.fillRect(r.x, r.y, 1, r.h); ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);

      if (ready) {
        /* 就绪：左上角数字键，右上角用「格子」标出这一招要花几格气劲 */
        PF.draw(ctx, String(i + 1), r.x + 4, r.y + 4, 1,
          usable ? 'rgba(232,196,106,0.78)' : 'rgba(110,130,120,0.55)');
        cn(skillName(i), r.x + 13, r.y + 3, i === 0 ? 10 : 9,
          usable ? (i === 0 ? '#ffe9a8' : col) : 'rgba(130,150,140,0.72)', 'left', 'bold');
        if (i > 0) {
          var seg = ARTS[i - 1].seg;
          var dcol = afford ? 'rgba(95,191,168,0.95)' : 'rgba(232,112,90,0.95)';
          var dw = seg * 4 - 1;
          for (var sg = 0; sg < seg; sg++) {
            ctx.fillStyle = dcol;
            ctx.fillRect(r.x + r.w - 4 - dw + sg * 4, r.y + 4, 3, 4);
          }
        }
      } else {
        cn(skillName(i), r.x + 4, r.y + 3, 10, 'rgba(150,172,162,0.85)', 'left', 'bold');
        cn(cd.toFixed(1), r.x + r.w - 4, r.y + 3, 8, 'rgba(210,228,218,0.92)', 'right');
      }

      /* 底部一条：冷却回满的进度；气劲不够时压暗 */
      ctx.fillStyle = 'rgba(10,20,16,0.92)';
      ctx.fillRect(r.x + 4, r.y + r.h - 4, r.w - 8, 2);
      ctx.fillStyle = ready
        ? (usable ? col : 'rgba(120,145,132,0.45)')
        : 'rgba(160,190,175,0.75)';
      ctx.fillRect(r.x + 4, r.y + r.h - 4,
        Math.round((r.w - 8) * (ready ? 1 : 1 - clamp(cd / cdMax, 0, 1))), 2);
    }
  }

  /* 字母盘两侧：左边「切换 / 跳过」，右边「退格」（换过位置了） */
  var BTN_SW = { x: 2, y: PAL_Y, w: 30, h: PAL_H };    /* 切换目标 */
  var BTN_SK = { x: 34, y: PAL_Y, w: 30, h: PAL_H };   /* 跳过：-5 气血换一个词 */
  var BTN_BS = { x: 430, y: PAL_Y, w: 42, h: PAL_H };  /* 退格 */

  function inBox(b, x, y) {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }
  function hitSw(x, y) { return inBox(BTN_SW, x, y); }
  function hitSkip(x, y) { return inBox(BTN_SK, x, y); }
  function hitBs(x, y) { return inBox(BTN_BS, x, y); }

  function aliveCount() {
    var n = 0;
    for (var i = 0; i < S.enemies.length; i++) if (S.enemies[i].alive) n++;
    return n;
  }

  /* 一个小按钮的外框 */
  function btnFrame(b, hot, tone) {
    ctx.fillStyle = 'rgba(6,16,13,0.88)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = hot ? '#9fd0b4' : tone;
    ctx.fillRect(b.x, b.y, b.w, 1); ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    ctx.fillRect(b.x, b.y, 1, b.h); ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
  }

  function drawSideBtns() {
    /* 切换：只有一只怪时没得换，压暗 */
    var canTab = aliveCount() >= 2;
    btnFrame(BTN_SW, canTab && S.hoverSw, canTab ? 'rgba(232,196,106,0.62)' : 'rgba(90,120,105,0.38)');
    cn('切换', BTN_SW.x + BTN_SW.w / 2, BTN_SW.y + 8, 11,
      canTab ? '#ffe9a8' : '#4a6058', 'center', 'bold');

    /* 跳过：扣 5 点气血换一个词，血不够就不给按 */
    var p = S.player;
    var canSkip = !!focusEnemy() && p && p.hp > 5;
    btnFrame(BTN_SK, canSkip && S.hoverSkip, canSkip ? 'rgba(232,112,90,0.60)' : 'rgba(90,120,105,0.38)');
    cn('跳过', BTN_SK.x + BTN_SK.w / 2, BTN_SK.y + 3, 10,
      canSkip ? '#ffbfa8' : '#4a6058', 'center', 'bold');
    cn('-5 血', BTN_SK.x + BTN_SK.w / 2, BTN_SK.y + 16, 8,
      canSkip ? 'rgba(232,140,110,0.95)' : 'rgba(90,110,100,0.55)', 'center');

    /* 退格：拼错时整颗按钮会闪，提示「来改一改」 */
    var b = BTN_BS;
    var bad = S.input.length > 0 && (S.kidBad > 0 || inputBad());
    ctx.fillStyle = bad ? 'rgba(52,18,14,0.95)' : 'rgba(6,16,13,0.88)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    var bc = bad ? (Math.sin(S.t * 8) > -0.3 ? '#ffe08a' : '#e8705a')
      : (S.hoverBack ? '#9fd0b4'
        : (S.input.length ? 'rgba(232,196,106,0.62)' : 'rgba(90,120,105,0.38)'));
    ctx.fillStyle = bc;
    ctx.fillRect(b.x, b.y, b.w, 1); ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    ctx.fillRect(b.x, b.y, 1, b.h); ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
    var ac = bad ? '#fff3cf' : (S.input.length ? '#ffe9a8' : '#4a6058');
    var aX = b.x + 6, aY = b.y + 9;
    ctx.fillStyle = ac;
    ctx.fillRect(aX, aY, 6, 1);
    ctx.fillRect(aX + 1, aY - 1, 1, 1);
    ctx.fillRect(aX + 1, aY + 1, 1, 1);
    ctx.fillRect(aX + 2, aY - 2, 1, 1);
    ctx.fillRect(aX + 2, aY + 2, 1, 1);
    cn('退格', b.x + 27, b.y + 9, 10, ac, 'center', 'bold');
  }

  /* 右上角：大小写开关（只影响字母盘的显示） */
  function drawCaseBtn() {
    if (S.scene !== 'play') return;
    var b = CASE_BTN, hot = S.hoverCase;
    ctx.fillStyle = hot ? 'rgba(20,38,30,0.92)' : 'rgba(6,16,13,0.82)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = S.upper ? 'rgba(232,196,106,0.72)' : 'rgba(159,208,180,0.55)';
    ctx.fillRect(b.x, b.y, b.w, 1); ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    ctx.fillRect(b.x, b.y, 1, b.h); ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
    var on = '#ffe9a8', off = '#5f7f70';
    cn('A', b.x + 4, b.y + 4, 10, S.upper ? on : off, 'left', 'bold');
    cn('a', b.x + 12, b.y + 4, 10, S.upper ? off : on, 'left', 'bold');
    ctx.fillStyle = S.upper ? '#ffe9a8' : '#9fd0b4';
    ctx.fillRect(S.upper ? b.x + 4 : b.x + 11, b.y + b.h - 4, 6, 1);
  }

  /* 局内商店按钮：一个钱袋。只在内嵌模式下出现 */
  function drawShopBtn() {
    if (!arcOn() || S.scene !== 'play') return;
    var b = SHOP_BTN, hot = S.hoverShop;
    ctx.fillStyle = hot ? 'rgba(20,38,30,0.92)' : 'rgba(6,16,13,0.82)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(232,196,106,0.62)';
    ctx.fillRect(b.x, b.y, b.w, 1); ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    ctx.fillRect(b.x, b.y, 1, b.h); ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
    var cx = b.x + 11, cy = b.y + 11;
    ctx.fillStyle = '#c8a06a';
    ctx.fillRect(cx - 5, cy - 3, 10, 2);      /* 袋口 */
    ctx.fillStyle = '#9a7444';
    ctx.fillRect(cx - 6, cy - 1, 12, 7);      /* 袋身 */
    ctx.fillRect(cx - 5, cy + 6, 10, 1);
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(cx - 1, cy + 1, 2, 4);       /* 袋上那颗灵石 */
    ctx.fillRect(cx - 2, cy + 2, 4, 1);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(cx + 4, cy + 2, 1, 1);
  }

  function hitShop(px2, py2) {
    if (!arcOn() || S.scene !== 'play') return false;
    var b = SHOP_BTN;
    return px2 >= b.x && px2 <= b.x + b.w && py2 >= b.y && py2 <= b.y + b.h;
  }

  /* 提示按钮：花 20 灵石把当前词填好，然后停住等确认 */
  function drawHintBtn() {
    if (!arcOn() || S.scene !== 'play') return;
    var b = HINT_BTN, p = S.player;
    var ok = hintReady(), hot = S.hoverHint === 3 && ok;
    var poor = p && p.stones < HINT_COST;

    ctx.fillStyle = hot ? 'rgba(40,34,16,0.94)' : 'rgba(6,16,13,0.82)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = ok ? 'rgba(232,196,106,0.66)'
      : (poor ? 'rgba(150,110,90,0.35)' : 'rgba(90,120,105,0.32)');
    ctx.fillRect(b.x, b.y, b.w, 1); ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    ctx.fillRect(b.x, b.y, 1, b.h); ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);

    /* 小灯泡：圆一点、灯丝用深色，缩到 22px 还认得出 */
    var cx = b.x + 11, cy = b.y + 5;
    ctx.fillStyle = ok ? '#ffe08a' : '#4a6058';
    ctx.fillRect(cx - 2, cy - 4, 4, 1);
    ctx.fillRect(cx - 3, cy - 3, 6, 1);
    ctx.fillRect(cx - 4, cy - 2, 8, 3);
    ctx.fillRect(cx - 3, cy + 1, 6, 1);
    ctx.fillStyle = ok ? '#8a5a18' : '#22342c';
    ctx.fillRect(cx - 1, cy - 2, 1, 3);
    ctx.fillRect(cx + 1, cy - 2, 1, 2);
    ctx.fillStyle = ok ? '#7a8f86' : '#2a3f35';
    ctx.fillRect(cx - 2, cy + 3, 4, 1);
    ctx.fillRect(cx - 1, cy + 4, 2, 1);

    cn(S.hintCd > 0 ? Math.ceil(S.hintCd) + 's' : '20', b.x + 11, b.y + 13, 7,
      ok ? '#ffe9a8' : (poor ? '#7a5f52' : '#4a6058'), 'center');
  }

  function hitHint(px2, py2) {
    if (!arcOn() || S.scene !== 'play') return false;
    var b = HINT_BTN;
    return px2 >= b.x && px2 <= b.x + b.w && py2 >= b.y && py2 <= b.y + b.h;
  }

  /* 买完提示后的确认面板：世界已经停住，这里只是把答案摆出来问一句 */
  function drawHintPanel() {
    if (!S.paused || !S.pendHint) return;
    var ph = S.pendHint, e = null, i;
    for (i = 0; i < S.enemies.length; i++) {
      if (S.enemies[i].id === ph.eid) { e = S.enemies[i]; break; }
    }

    var L = hintLayout(), port = L.port;
    var px = L.x, py = L.y, pw = L.w, phh = L.h;

    ctx.fillStyle = 'rgba(3,9,7,0.66)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(9,21,17,0.98)';
    ctx.fillRect(px, py, pw, phh);
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(px, py, pw, 1); ctx.fillRect(px, py + phh - 1, pw, 1);
    ctx.fillRect(px, py, 1, phh); ctx.fillRect(px + pw - 1, py, 1, phh);
    ctx.fillStyle = '#fff3cf';
    ctx.fillRect(px + 4, py, 5, 1); ctx.fillRect(px + pw - 9, py, 5, 1);
    ctx.fillRect(px + 4, py + phh - 1, 5, 1); ctx.fillRect(px + pw - 9, py + phh - 1, 5, 1);

    /* 竖屏把每个字号都抬一档，390 宽压下来之后才看得清 */
    var fTitle = port ? 16 : 12;
    var fSub = port ? 12 : 9;
    var fMean = port ? 14 : 10;
    var fBtn = port ? 15 : 11;

    cn('灵 石 -' + HINT_COST + ' · 提 示', W / 2, py + 10, fTitle, '#ffe9a8', 'center', 'bold');
    cn('答案已经替你填好了', W / 2, py + (port ? 32 : 26), fSub, '#9fc4ad', 'center');

    var up = S.upper ? String(ph.word).toUpperCase() : String(ph.word);
    var sc = up.length > 10 ? (port ? 3 : 2) : (port ? 4 : 3);
    PF.draw(ctx, up, Math.round(W / 2 - PF.width(up, sc) / 2),
      py + (port ? 46 : 38), sc, '#ffe9a8', '#07120e');

    if (e && e.meaning) {
      cn(e.meaning, W / 2, py + (port ? 84 : 66), fMean, '#cfe4d8', 'center');
    }
    cn('确认就直接出招 · 取消就自己再拼一遍', W / 2, py + (port ? 106 : 84), fSub, '#8fbfa8', 'center');
    cn('本局所有单词的键入时限 ×2', W / 2, py + (port ? 126 : 98), fSub, '#ffe0a0', 'center');

    var okHot = S.hoverHint === 1, noHot = S.hoverHint === 2;
    panel(L.ok.x, L.ok.y, L.ok.w, L.ok.h, okHot ? '#9fd0b4' : '#5a7a6a');
    cn('确 认 出 招', L.ok.x + L.ok.w / 2, L.ok.y + (port ? 13 : 8), fBtn,
      okHot ? '#8ef0a8' : '#cfe4d8', 'center', 'bold');
    panel(L.no.x, L.no.y, L.no.w, L.no.h, noHot ? '#9fd0b4' : '#5a7a6a');
    cn('自 己 拼', L.no.x + L.no.w / 2, L.no.y + (port ? 13 : 8), fBtn,
      noHot ? '#ffe9a8' : '#a8cdb6', 'center', 'bold');
  }

  /* 面板上的两个按钮 */
  function hintPanelPointer(x, y) {
    var L = hintLayout();
    if (hintPanelHit(x, y, L.ok)) { confirmHint(); return; }
    if (hintPanelHit(x, y, L.no)) { cancelHint(); return; }
  }

  function hitCase(px2, py2) {
    if (S.scene !== 'play') return false;
    var b = CASE_BTN;
    return px2 >= b.x && px2 <= b.x + b.w && py2 >= b.y && py2 <= b.y + b.h;
  }
  function toggleCase() {
    S.upper = !S.upper;
    if (!arcOn()) {
      try { window.localStorage.setItem('dfyl_case', S.upper ? '1' : '0'); } catch (e) { }
    }
    sfx.tab();
  }

  function drawToast() {
    if (!S.toast) return;
    var tt = S.toast;
    var a = Math.min(1, tt.t * 5) * Math.min(1, (tt.max - tt.t) * 10);
    ctx.globalAlpha = a;
    var w = Math.max(122, tt.text.length * 11 + 26), h = 22, x = (W - w) / 2, y = 40;
    ctx.fillStyle = 'rgba(6,16,13,0.90)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e8c46a';
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = '#fff3cf';
    ctx.fillRect(x + 4, y, 4, 1); ctx.fillRect(x + w - 8, y, 4, 1);
    cn(tt.text, W / 2, y + 5, 11, '#ffe9a8', 'center');
    ctx.globalAlpha = 1;
  }

  function drawOverlays() {
    if (S.scene === 'title') { if (!ARCADE.on) drawTitle(); }
    else if (S.scene === 'clear' || S.scene === 'dead') drawResult();
    else if (S.scene === 'victory') drawVictory();
    else if (S.scene === 'camp') drawCamp();
  }

    return {
      drawHUD: drawHUD, drawUltVeil: drawUltVeil, drawUltUI: drawUltUI,
      drawSpeakerBtn: drawSpeakerBtn, drawVoiceBtn: drawVoiceBtn, drawKidBtn: drawKidBtn,
      drawCaseBtn: drawCaseBtn, drawShopBtn: drawShopBtn, drawHintBtn: drawHintBtn,
      drawHintPanel: drawHintPanel, drawToast: drawToast, drawOverlays: drawOverlays,
      campCardRect: campCardRect, campPage: campPage, campRowVisible: campRowVisible,
      campPageCount: campPageCount, skillRect: skillRect, toggleCase: toggleCase,
      hitSkill: hitSkill, hitCase: hitCase, hitSw: hitSw,
      hitSkip: hitSkip, hitBs: hitBs, aliveCount: aliveCount,
      BTN_SW: BTN_SW, BTN_SK: BTN_SK, BTN_BS: BTN_BS, SK_X: SK_X, SK_Y: SK_Y,
      SK_W: SK_W, SK_GAP: SK_GAP, SK_N: SK_N, CAMP_TAB: CAMP_TAB, CAMP_GO: CAMP_GO,
      CAMP_PREV: CAMP_PREV, CAMP_NEXT: CAMP_NEXT, campPerPage: campPerPage, BTN: BTN, BTNV: BTNV, BTN2: BTN2
    };
  };
})(window);
