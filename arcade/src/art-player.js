/* 主角像素绘制。 */
(function (global) {
  'use strict';
  global.createArcadePlayerArt = function (d) {
  var PAL = d.PAL, R = d.R, PX = d.PX, disc = d.disc, line = d.line, makeCanvas = d.makeCanvas;
  /* ---------------- 主角 ---------------- */

  var PC = makeCanvas(72, 88);
  var OC = makeCanvas(72, 88);

  function drawPlayer(ctx, px, py, t, o) {
    o = o || {};
    /* 有序列帧素材就直接走贴图；素材没加载完或加载失败时退回程序化绘制 */
    if (typeof Sprite !== 'undefined' && Sprite.ready() && Sprite.drawPlayer(ctx, px, py, t, o)) return;
    var anim = o.anim || 'idle';
    var variant = o.variant || 0;
    var at = o.at || 0;
    var flash = o.flash || 0;
    var p = PC.x;
    p.clearRect(0, 0, 72, 88);

    var OX = 16, OY = 16;
    /* 向前跑：步伐循环（t 驱动，双腿交替迈步 + 身体起伏） */
    var run = o.run !== false;
    var runPh = t * 9.4;
    var stride = run ? Math.sin(runPh) : 0;
    var csPh = run ? Math.cos(runPh) : 0;
    var bob = run ? -Math.round((1 - Math.abs(stride)) * 1.6)
      : (anim === 'idle' ? Math.round(Math.sin(t * 2.2)) : 0);
    OY += bob;

    function RR(x, y, w, h, c) { R(p, OX + x, OY + y, w, h, c); }
    function DD(cx, cy, r, c) { disc(p, OX + cx, OY + cy, r, c); }
    function LL(x0, y0, x1, y1, c, th) { line(p, OX + x0, OY + y0, OX + x1, OY + y1, c, th); }

    /* 姿态参数 */
    function ss(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

    var lean = 0, handX = 31, handY = 31, ang = -1.25, glow = false;
    if (anim === 'attack') {
      /* 蓄力 → 出鞘 → 收势，带一点过冲回弹 */
      var w1 = ss(at / 0.09);
      var w2 = ss((at - 0.09) / 0.10);
      var w3 = ss((at - 0.19) / 0.31);
      lean = -w1 * 2.8 + w2 * 5.2 - w3 * 4.4;
      handX = 31 - w1 * 3.2 + w2 * 7.5 - w3 * 4.2;
      handY = 31 - w1 * 2.6 + w2 * 1.6 - w3 * 0.6;
      var v0 = variant === 1 ? 0.75 : variant === 2 ? -0.55 : 0;
      ang = -1.25 + v0 - w1 * 1.10 + w2 * 3.55 - w3 * 1.65;
      glow = w2 > 0.08;
    } else if (anim === 'cast') {
      var cw = Math.sin(Math.min(1, at / 0.2) * Math.PI * 0.5);
      handX = 31 + cw * 2; handY = 31 - cw * 15; ang = -1.25 - cw * 0.34;
      glow = true;
    } else if (anim === 'hit') {
      lean = -3.0;
      handX = 29; handY = 33; ang = -1.05;
    } else if (run) {
      /* 持剑手随步伐轻微反向摆动，剑身跟着点头，别让整条手臂僵在原地 */
      handX = 31 - 1.7 * stride;
      handY = 31 + 1.1 * Math.abs(stride);
      ang = -1.25 - 0.11 * stride;
    }

    /* 双腿：左右交替迈步（先画脚，裙摆后画，抬脚时会被裙摆吃掉一点） */
    function foot(bx, by, back) {
      var cShin = back ? '#16394b' : PAL.azure;
      var cBoot = back ? PAL.ink2 : PAL.azureDeep;
      /* 小腿：4px，露在裙摆外面才看得出在迈步 */
      RR(bx + 1, by - 9, 4, 10, cShin);
      RR(bx + 1, by - 9, 1, 10, back ? PAL.ink : '#1d4a61');
      /* 靴口金边 */
      RR(bx, by, 6, 1, back ? '#8a6a30' : PAL.gold);
      /* 靴身 */
      RR(bx, by + 1, 6, 4, cBoot);
      if (!back) {
        RR(bx + 4, by + 1, 2, 4, '#2f6f8f');
        RR(bx + 1, by + 2, 2, 1, '#ffffff');
      }
      /* 鞋底 */
      RR(bx, by + 5, 6, 1, PAL.ink);
    }

    /* 双腿：绕胯部前后摆；交叉时抬起的那只藏在后面（颜色更深、位置更高） */
    var swingAmp = 4.6, hipX = 20;
    var fAx = Math.round(hipX + stride * swingAmp) - 3;
    var fBx = Math.round(hipX - stride * swingAmp) - 3;
    var liftA = run ? Math.round(Math.max(0, csPh) * 4) : 0;
    var liftB = run ? Math.round(Math.max(0, -csPh) * 4) : 0;
    var fAy = 50 - liftA, fBy = 50 - liftB;
    if (fAx - liftA * 2 <= fBx - liftB * 2) {
      foot(fAx, fAy, true);
      foot(fBx, fBy, false);
    } else {
      foot(fBx, fBy, true);
      foot(fAx, fAy, false);
    }

    /* 上身整体前倾：脚不动，只把腰以上推出去，跑起来才有冲劲 */
    var bodyDX = run ? 2 : 0;
    p.save();
    if (bodyDX) p.translate(bodyDX, 0);

    /* 发带（身后）：跑动时抖得更快、拖得更长 */
    var flut = run ? 1.45 : 1;
    for (var i = 0; i < 11; i++) {
      var rx = 14 - i * (run ? 1.15 : 1.0) + Math.sin(t * (run ? 4.4 : 3.2) - i * 0.55) * (0.6 + i * 0.14) * flut;
      var ry = 6 + i * 0.55 + Math.cos(t * 2.4 - i * 0.4) * 0.7 * flut;
      RR(rx, ry, 2, 2, i < 6 ? PAL.sash : PAL.sashDark);
    }

    /* 后发 */
    DD(20, 10, 7, PAL.hair);

    /* 裙摆：下摆提到 46，露出小腿，迈步才看得出来 */
    var windK = run ? 1 : 0.35;
    var HEM = 44;
    for (var yy = 33; yy <= HEM; yy++) {
      var k = (yy - 33) / (HEM - 33);
      var half = 7 + k * 7;
      var sw = Math.sin(t * 2.2 - (HEM - yy) * 0.16) * k * 1.7 + lean * 0.5
        - k * 1.5 * windK + stride * k * 1.4;
      var cx = 20 + sw;
      RR(cx - half, yy, half * 2, 1, PAL.robe);
      RR(cx - half, yy, 2, 1, PAL.robeShade);
      RR(cx + half - 1, yy, 1, 1, '#ffffff');
      if (yy >= HEM - 2) RR(cx - half, yy, half * 2, 1, PAL.azure);
      if (yy === HEM) RR(cx - half, yy, half * 2, 1, PAL.gold);
      if (yy > 36 && yy < HEM - 2) {
        RR(cx - 3, yy, 1, 1, PAL.robeShade);
        RR(cx + 4, yy, 1, 1, PAL.robeShade);
      }
    }

    /* 左臂（不持剑的一侧，身后）：绕肩的小幅摆动
       3px 宽的手臂做大幅摆臂只会糊成一团，所以只让手腕前后荡、肘部几乎不动 */
    var sArm = run ? stride : 0;
    var sw = sArm * 2.4;                                  /* 手腕前后 ±2.4px */
    var armC = '#a9bcc2', armSh = '#8b9fa7';
    var elbX = 9.0, elbY = 26.2;
    var wrX = 7.8 + sw, wrY = 31.4 - Math.abs(sw) * 0.45;
    LL(10.5, 20, elbX, elbY, armC, 3);                    /* 大臂 */
    LL(elbX, elbY, wrX, wrY, armC, 3);                    /* 小臂 */
    LL(elbX + 1, elbY + 0.4, wrX + 1, wrY, armSh, 1);     /* 内侧 1px 暗边 */
    RR(wrX - 1, wrY - 1, 3, 2, PAL.azure);                /* 袖口 */
    RR(wrX - 1, wrY + 1, 3, 2, PAL.skinShade);            /* 手 */
    PX(p, OX + Math.round(wrX) - 1, OY + Math.round(wrY) + 2, PAL.skin);

    /* 躯干 */
    RR(12, 19, 16, 15, PAL.robe);
    RR(12, 19, 2, 15, PAL.robeShade);
    RR(26, 19, 2, 15, '#ffffff');
    /* 交领 */
    LL(16, 19, 20, 26, PAL.azureDeep, 1);
    LL(24, 19, 20, 26, PAL.azureDeep, 1);
    RR(19, 26, 3, 2, PAL.azure);
    /* 腰带 */
    RR(12, 31, 16, 3, PAL.sash);
    RR(12, 31, 16, 1, '#e8705a');
    RR(18, 31, 4, 3, PAL.gold);
    RR(19, 32, 2, 1, PAL.sashDark);
    /* 肩 */
    RR(10, 18, 4, 3, PAL.robe);
    RR(26, 18, 4, 3, PAL.robe);
    RR(10, 20, 4, 1, PAL.azure);
    RR(26, 20, 4, 1, PAL.azure);

    /* 右臂 + 手 */
    RR(27, 21, 5, 8, PAL.robe);
    RR(27, 27, 5, 2, PAL.azure);
    RR(handX - 1, handY - 3, 3, 4, PAL.skin);
    RR(handX - 1, handY - 3, 1, 4, PAL.skinShade);

    /* 颈 */
    RR(19, 18, 3, 2, PAL.skinShade);

    /* 脸 */
    DD(20, 13, 5, PAL.skin);
    RR(15, 14, 1, 2, PAL.skinShade);
    DD(20, 11, 4, PAL.skin);

    /* 眼眉 */
    RR(17, 12, 1, 2, PAL.ink);
    RR(23, 12, 1, 2, PAL.ink);
    RR(16, 11, 2, 1, PAL.hair);
    RR(22, 11, 2, 1, PAL.hair);
    RR(19, 16, 2, 1, PAL.skinShade);
    RR(16, 15, 1, 1, '#e8a48c');
    RR(24, 15, 1, 1, '#e8a48c');

    /* 刘海与鬓发 */
    RR(14, 6, 13, 4, PAL.hair);
    RR(14, 10, 3, 1, PAL.hair);
    RR(18, 10, 2, 1, PAL.hair);
    RR(23, 10, 3, 1, PAL.hair);
    RR(13, 8, 2, 11, PAL.hair);
    RR(26, 8, 2, 11, PAL.hair);
    RR(14, 7, 4, 1, PAL.hairHi);
    RR(25, 12, 1, 4, PAL.hairHi);

    /* 发髻与簪 */
    DD(20, 3, 3, PAL.hair);
    RR(14, 4, 12, 1, PAL.gold);
    RR(25, 3, 2, 2, PAL.sash);
    PX(p, OX + 14, OY + 4, PAL.goldHi);

    /* 剑 */
    drawSwordPx(p, OX + handX, OY + handY, ang, 22, glow);

    p.restore();

    /* 受击闪白 */
    if (flash > 0) {
      p.globalCompositeOperation = 'source-atop';
      p.fillStyle = 'rgba(255,255,255,' + Math.min(0.85, flash) + ')';
      p.fillRect(0, 0, 72, 88);
      p.globalCompositeOperation = 'source-over';
    }

    /* 1px 深色描边，保证在复杂背景上也能看清 */
    var oc = OC.x;
    oc.clearRect(0, 0, 72, 88);
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (var di = 0; di < dirs.length; di++) oc.drawImage(PC.c, dirs[di][0], dirs[di][1]);
    oc.globalCompositeOperation = 'source-in';
    oc.fillStyle = '#0d1a20';
    oc.fillRect(0, 0, 72, 88);
    oc.globalCompositeOperation = 'source-over';

    var bx = Math.round(px - 36), by = Math.round(py - 72);
    ctx.drawImage(OC.c, bx, by);
    ctx.drawImage(PC.c, bx, by);
  }

  function drawSwordPx(ctx, hx, hy, ang, len, glow) {
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var gx = Math.cos(ang + Math.PI / 2), gy = Math.sin(ang + Math.PI / 2);

    /* 剑柄 */
    line(ctx, hx - dx * 5, hy - dy * 5, hx, hy, '#33241a', 2);
    line(ctx, hx - dx * 5, hy - dy * 5, hx, hy, '#a8824a', 1);

    /* 护手 */
    line(ctx, hx + gx * 4 - dx, hy + gy * 4 - dy, hx - gx * 4 - dx, hy - gy * 4 - dy, '#33241a', 2);
    line(ctx, hx + gx * 4, hy + gy * 4, hx - gx * 4, hy - gy * 4, PAL.gold, 1);

    /* 剑身 */
    line(ctx, hx + dx * 2, hy + dy * 2, hx + dx * len, hy + dy * len, '#0b1a22', 2);
    line(ctx, hx + dx * 2, hy + dy * 2, hx + dx * len, hy + dy * len, PAL.blade, 1);
    line(ctx, hx + dx * 3 - gx, hy + dy * 3 - gy, hx + dx * (len - 2) - gx, hy + dy * (len - 2) - gy, '#ffffff', 1);

    var tx = hx + dx * len, ty = hy + dy * len;
    R(ctx, tx - 1, ty - 1, 2, 2, '#ffffff');
    if (glow) {
      ctx.fillStyle = 'rgba(159,232,255,0.5)';
      ctx.fillRect(Math.round(tx) - 3, Math.round(ty) - 3, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 2, 2);
    }

    /* 剑穗 */
    var tx2 = hx - dx * 5, ty2 = hy - dy * 5;
    R(ctx, tx2, ty2 + 1, 2, 2, PAL.sash);
    R(ctx, tx2 - 1, ty2 + 3, 2, 2, PAL.sashDark);
    R(ctx, tx2 - 2, ty2 + 5, 1, 2, PAL.sashDark);
  }

  return drawPlayer;
  };
})(window);
