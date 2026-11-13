/* 单词风云录 · 主角序列帧
   ------------------------------------------------------------------
   素材：red-heroine-combat-assets-v6/combat-body-atlas.png
     12 列 × 14 行，每格 64×64，逻辑根 [33,60]（脚底落在 y=60）。
     帧数 / 行号 / 每帧毫秒全部来自同目录 animations.json，这里内联一份，
     省掉一次 fetch（file:// 打开时也能跑）。
     图集自带 1px 深色描边，所以不再做描边处理。
   ------------------------------------------------------------------ */
var Sprite = (function () {
  /* 图集路径跟着「谁在加载」走：
     - 独立页 arcade/index.html 直接打开：ARCADE_BASE = ''
     - 主应用同页注入：host.js 会先设 ARCADE_BASE = 'arcade/'
     不这么办，从根目录加载时会去请求 /assets/... 然后 404。 */
  var BASE = (typeof window !== 'undefined' && window.ARCADE_BASE) || '';
  var SRC = BASE + 'assets/heroes/red_heroine/combat-body-atlas.png';
  var FW = 64, FH = 64;
  var ROOT_X = 33, ROOT_Y = 60;
  var PIVOT_UP = 30;   /* 旋转支点在脚底往上 30px（腰腹位置），绕脚底转会把整个人甩出去 */

  /* row = 图集行号, n = 帧数, loop, dur = 每帧毫秒 */
  var A = {
    walk:      { row: 0,  n: 8,  loop: true,  dur: [95, 105, 95, 105, 95, 105, 95, 105] },
    run:       { row: 1,  n: 8,  loop: true,  dur: [75, 75, 65, 55, 75, 75, 65, 55] },
    jump:      { row: 2,  n: 10, loop: false, dur: [100, 85, 80, 80, 120, 90, 85, 90, 100, 160] },
    heal:      { row: 3,  n: 10, loop: false, dur: [100, 95, 100, 120, 140, 130, 110, 95, 100, 180] },
    attack:    { row: 4,  n: 8,  loop: false, dur: [120, 90, 75, 80, 80, 95, 110, 160] },
    block:     { row: 5,  n: 8,  loop: false, dur: [100, 80, 150, 75, 90, 180, 100, 160] },
    dodge:     { row: 6,  n: 8,  loop: false, dur: [100, 80, 65, 65, 65, 85, 100, 160] },
    hit:       { row: 7,  n: 8,  loop: false, dur: [90, 65, 95, 110, 100, 100, 110, 160] },
    skill:     { row: 8,  n: 10, loop: false, dur: [100, 100, 110, 160, 80, 80, 80, 95, 120, 180] },
    ultimate:  { row: 9,  n: 12, loop: false, dur: [100, 110, 120, 130, 160, 180, 80, 90, 100, 120, 140, 200] },
    seal:      { row: 10, n: 10, loop: false, dur: [110, 90, 100, 110, 150, 130, 110, 100, 95, 180] },
    talisman:  { row: 11, n: 10, loop: false, dur: [100, 90, 100, 90, 80, 100, 100, 110, 120, 180] },
    defeat:    { row: 12, n: 8,  loop: false, dur: [100, 100, 110, 140, 170, 160, 140, 300] },
    down:      { row: 13, n: 8,  loop: false, dur: [90, 90, 100, 120, 150, 180, 180, 350] }
  };

  /* 预算每个动作的总时长 */
  (function () {
    for (var k in A) {
      if (!A.hasOwnProperty(k)) continue;
      var s = 0;
      for (var i = 0; i < A[k].n; i++) s += A[k].dur[i];
      A[k].total = s;
    }
  })();

  var img = new Image();
  var ok = false;
  img.onload = function () { ok = true; };
  img.onerror = function () { ok = false; };
  img.src = SRC;

  /* 闪白用的离屏画布（64×64，和单帧同尺寸，可以直接整块贴回） */
  var FC = document.createElement('canvas');
  FC.width = FW; FC.height = FH;
  var fctx = FC.getContext('2d');
  if (fctx) fctx.imageSmoothingEnabled = false;

  function ready() { return ok; }

  /* 按累计毫秒定位帧号 */
  function pick(a, ms) {
    if (a.loop) {
      ms = ms % a.total;
      if (ms < 0) ms = 0;
    } else if (ms >= a.total) {
      return a.n - 1;
    }
    var acc = 0;
    for (var i = 0; i < a.n; i++) {
      acc += a.dur[i];
      if (ms < acc) return i;
    }
    return a.n - 1;
  }

  function frameOf(name, ms) {
    return pick(A[name] || A.walk, ms);
  }

  /* 只在 [from, to] 子区间里定位帧号：普通攻击会把一行拆成几段用，
     这样每一段都从自己的第 0 毫秒起算，不会出现「跳过了时间但画面没动」的空档。 */
  function pickRange(a, ms, from, to) {
    if (from == null) from = 0;
    if (to == null || to > a.n - 1) to = a.n - 1;
    if (from < 0) from = 0;
    var tot = 0, i;
    for (i = from; i <= to; i++) tot += a.dur[i];
    if (ms >= tot) return to;
    var acc = 0;
    for (i = from; i <= to; i++) {
      acc += a.dur[i];
      if (ms < acc) return i;
    }
    return to;
  }

  /* 只用前 n 帧定位 */
  function pickN(a, ms, n) { return pickRange(a, ms, 0, n - 1); }

  function frameAt(a, ms, o) {
    if (o.frame != null) return o.frame;
    if (o.from != null || o.to != null) return pickRange(a, ms, o.from, o.to);
    return pick(a, ms);
  }

  /* 把图集里的一格贴到世界坐标（px/py = 脚底根点）。
     o.rot 是绕腰部的旋转角（弧度，正数 = 头往右倒），o.dy 是额外的像素偏移。 */
  function blit(ctx, src, sx, sy, px, py, o) {
    var dy = o.dy || 0;
    var rot = o.rot || 0;
    if (!rot) {
      ctx.drawImage(src, sx, sy, FW, FH, Math.round(px) - ROOT_X, Math.round(py) - ROOT_Y + dy, FW, FH);
      return;
    }
    ctx.save();
    ctx.translate(Math.round(px), Math.round(py) + dy - PIVOT_UP);
    ctx.rotate(rot);
    ctx.drawImage(src, sx, sy, FW, FH, -ROOT_X, PIVOT_UP - ROOT_Y, FW, FH);
    ctx.restore();
  }

  /* 画一帧。px/py 是脚底根点（和原来 Art.drawPlayer 的 py 一致） */
  function draw(ctx, px, py, name, ms, o) {
    if (!ok) return false;
    o = o || {};
    var a = A[name] || A.walk;
    var f = frameAt(a, ms, o);
    blit(ctx, img, f * FW, a.row * FH, px, py, o);
    return true;
  }

  /* 闪白：先画到离屏，source-atop 罩一层白，再整块贴回 */
  function drawFlash(ctx, px, py, name, ms, amt, o) {
    if (!ok || !fctx) return false;
    o = o || {};
    var a = A[name] || A.walk;
    var f = frameAt(a, ms, o);
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, FW, FH);
    fctx.drawImage(img, f * FW, a.row * FH, FW, FH, 0, 0, FW, FH);
    fctx.globalCompositeOperation = 'source-atop';
    fctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.85, amt) + ')';
    fctx.fillRect(0, 0, FW, FH);
    fctx.globalCompositeOperation = 'source-over';
    blit(ctx, FC, 0, 0, px, py, o);
    return true;
  }

  /* 普通攻击：一次连贯的跃击（秒）。game.js 的 atkLeap() 用同一组数字算位移，
     改这里必须同步改那边，否则人会飞出去但画面还在原地。

     旧版是「跳过去 → 停在怪跟前劈 → 再跳回来」，三段之间各有一段滞空，
     看起来像空中定住再拔刀。现在改成一条连续的弧线：
       0    → 0.14  起跳（jump 0..2，蹲下 → 蹬地 → 腾空）
       0.14 → 0.42  空中拔刀劈斩（attack 2..5，正好接在起跳的腾空姿态后面）
       0.42 → 0.62  顺势落回原地（jump 7..9，下落 → 触地 → 收势）
     三段各约 47 / 70 / 67 ms 一帧，接缝处不留空档。 */
  var ATK_TAKEOFF = 0.14;
  var ATK_SWING = 0.42;
  var ATK_LEN = 0.62;
  var ATK_HIT = 0.29;          /* 剑锋触敌：a4 劈下的那一帧，正对弧线最高点 */

  var JUMP_TAKEOFF_MS = 265;   /* jump 0..2 = 100+85+80 */
  var ATTACK_SWING_MS = 330;   /* attack 2..5 = 75+80+80+95 */
  var JUMP_FALL_MS = 350;      /* jump 7..9 = 90+100+160 */

  function attackPart(at) {
    if (at < 0) at = 0;
    if (at < ATK_TAKEOFF) {
      return { name: 'jump', ms: (at / ATK_TAKEOFF) * JUMP_TAKEOFF_MS, to: 2 };
    }
    if (at < ATK_SWING) {
      var v = (at - ATK_TAKEOFF) / (ATK_SWING - ATK_TAKEOFF);
      return { name: 'attack', ms: v * ATTACK_SWING_MS, from: 2, to: 5 };
    }
    var w = (at - ATK_SWING) / (ATK_LEN - ATK_SWING);
    if (w > 1) w = 1;
    return { name: 'jump', ms: w * JUMP_FALL_MS, from: 7, to: 9 };
  }

  var HIT_WIN = 300;      /* game.js：p.animT > 0.3 时 hit 回 idle */
  var DODGE_WIN = 420;    /* game.js：p.animT > 0.42 时 dodge 回 idle，正好等于无敌时间 */

  /* 跃击的倾斜角：起跳还站着 → 腾空后一路压到 40°（头往右、朝着出剑方向倒下去）
     → 快落地时回正。用 smoothstep 过渡，进出都不带硬拐角。
     角度给到 60° 时像素就糊成一团了，40° 是「斜着扑下去」和「还看得清人」的平衡点。 */
  var TILT_MAX = 40 * Math.PI / 180;
  var TILT_IN = 0.09;     /* 从这一秒开始压角度 */
  var TILT_FULL = 0.24;   /* 压满 40° */
  var TILT_BACK = 0.44;   /* 开始回正 */
  var TILT_ZERO = 0.57;   /* 完全回正，还剩 14px 高度就落地 */

  function smooth(k) { return k * k * (3 - 2 * k); }

  function attackTilt(at) {
    if (at <= TILT_IN || at >= TILT_ZERO) return 0;
    if (at < TILT_FULL) return TILT_MAX * smooth((at - TILT_IN) / (TILT_FULL - TILT_IN));
    if (at <= TILT_BACK) return TILT_MAX;
    return TILT_MAX * (1 - smooth((at - TILT_BACK) / (TILT_ZERO - TILT_BACK)));
  }

  function drawPlayer(ctx, px, py, t, o) {
    o = o || {};
    var anim = o.anim || 'idle';
    var at = o.at || 0;
    var name, ms, dy = 0, from = null, to = null, rot = 0;

    if (anim === 'attack') {
      /* 跃出 → 空中拔刀劈斩 → 直接落回，一条弧线走完；
         腾空后整个人往右压 40°，像个斜着扑下去的斩击 */
      var part = attackPart(at);
      name = part.name; ms = part.ms;
      from = part.from != null ? part.from : null;
      to = part.to != null ? part.to : null;
      rot = attackTilt(at);
    } else if (anim === 'hit') {
      name = 'hit';
      ms = at * 1000 * (A.hit.total / HIT_WIN);
    } else if (anim === 'dodge') {
      name = 'dodge';
      ms = at * 1000 * (A.dodge.total / DODGE_WIN);
    } else if (anim === 'skill') {
      /* 破空斩：剑气 */
      name = 'skill';
      ms = at * 1000;
    } else if (anim === 'seal') {
      /* 寒冰咒：结印 */
      name = 'seal';
      ms = at * 1000;
    } else if (anim === 'talisman') {
      /* 雷罡印：符箓 */
      name = 'talisman';
      ms = at * 1000;
    } else if (anim === 'cast') {
      /* cast 目前只在大招里出现，整段约 1.53s，比大招的 2s 略短，末尾停在收势帧 */
      name = 'ultimate';
      ms = at * 1000;
    } else if (o.run) {
      /* 波次之间赶路是奔跑，不是行走 */
      name = 'run';
      ms = t * 1000;
    } else {
      /* 站立：停在行走首帧，只做 1px 呼吸起伏（只往上抬，脚不会陷进地面） */
      name = 'walk';
      ms = 0;
      dy = -Math.round((Math.sin(t * 2.2) + 1) / 2);
    }

    var flash = o.flash || 0;
    var opt = { dy: dy, from: from, to: to, rot: rot };
    if (flash > 0) return drawFlash(ctx, px, py, name, ms, flash, opt);
    return draw(ctx, px, py, name, ms, opt);
  }

  return {
    ready: ready,
    draw: draw,
    drawPlayer: drawPlayer,
    frameOf: frameOf,
    /* 调试用：给定攻击进行到第几秒，返回此刻在放哪一段、第几帧 */
    attackFrameAt: function (at) {
      var part = attackPart(at);
      var a = A[part.name];
      return {
        name: part.name,
        from: part.from != null ? part.from : 0,
        to: part.to != null ? part.to : a.n - 1,
        frame: pickRange(a, part.ms, part.from, part.to),
        tilt: Math.round(attackTilt(at) * 180 / Math.PI)
      };
    },
    actions: A,
    /* 位移时间轴交给 game.js，两边必须一致 */
    ATK: { OUT: ATK_TAKEOFF, SWING: ATK_SWING, HIT: ATK_HIT, LEN: ATK_LEN },
    SRC: SRC,
    FRAME_W: FW,
    FRAME_H: FH,
    ROOT_X: ROOT_X,
    ROOT_Y: ROOT_Y
  };
})();

