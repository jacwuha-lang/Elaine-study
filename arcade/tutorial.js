/* ================= 新手教程（两页图文说明） =================
   主应用（js/arcade.js）和独立调试页（arcade/index.html）共用这一份。
   只做三件事：把半透明板铺上、把按钮框出来、把说明写在旁边。
   不接管任何游戏事件，游戏侧只需提供 state() / hotspots(page)。
   可选：openShop() / closeShop() 用于第二页进商店。
   ============================================================ */
(function (global) {
  'use strict';

  var el = null;
  var page = 1;
  var hostRef = null;
  var doneCb = null;

  function stateOf() {
    try { return hostRef && hostRef.state ? hostRef.state() : null; } catch (e) { return null; }
  }
  function canvasOf() {
    if (hostRef && hostRef.canvas) {
      var c = hostRef.canvas();
      if (c) return c;
    }
    return document.querySelector('#arcadeStage canvas') || document.querySelector('canvas');
  }
  function layoutOf() {
    /* 主应用给的是函数；调试页直接把 ARCADE 递进来，layout 是个字符串字段 */
    if (hostRef && typeof hostRef.layout === 'function') return hostRef.layout();
    if (hostRef && typeof hostRef.layout === 'string') return hostRef.layout;
    if (global.ARCADE && typeof global.ARCADE.layout === 'string') return global.ARCADE.layout;
    return 'land';
  }
  /* 画布逻辑坐标（480×270）→ 屏幕坐标 */
  function toScreen(r) {
    var cv = canvasOf();
    if (!cv || !cv.getBoundingClientRect) return null;
    var b = cv.getBoundingClientRect();
    if (!b.width) return null;
    var k = b.width / 480;
    return { x: b.left + r.x * k, y: b.top + r.y * k, w: r.w * k, h: r.h * k };
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pauseGame(v) {
    var s = stateOf();
    if (s) s.paused = v;
  }

  function render() {
    if (!el) return;
    var s = stateOf();
    /* 第一页看战场，第二页进洞府 */
    if (page === 2) {
      if (s && s.scene === 'play' && hostRef.openShop) hostRef.openShop();
    } else if (s && s.scene === 'camp' && hostRef.closeShop) {
      hostRef.closeShop();
    }
    pauseGame(true);

    var boxes = [];
    var hs = (hostRef.hotspots ? hostRef.hotspots(page === 2 ? 'camp' : 'play') : []) || [];
    for (var i = 0; i < hs.length; i++) {
      var p = toScreen(hs[i]);
      if (p) boxes.push({ r: p, tip: hs[i].tip || '', place: hs[i].place || 'below', num: hs[i].num || 'tl' });
    }
    /* 第二页讲商店，底部那块字母键盘这时用不上，先藏起来。
       只改 visibility —— 改 display 会重算画布尺寸，框全得跟着挪 */
    var kbEl = document.querySelector('.arc-keys');
    if (kbEl) kbEl.style.visibility = (page === 2) ? 'hidden' : '';
    /* 竖屏：字母盘在画布外，改框 DOM 键盘 */
    if (page === 1 && layoutOf() === 'portrait') {
      var kp = document.querySelector('.arc-keys');
      if (kp && kp.getBoundingClientRect) {
        var kb = kp.getBoundingClientRect();
        if (kb.width > 20) {
          boxes.push({
            r: { x: kb.left, y: kb.top, w: kb.width, h: kb.height },
            tip: '点字母拼单词 · ⌫ 退格', place: 'above'
          });
        }
      }
    }

    var vw = global.innerWidth || 800, vh = global.innerHeight || 600;
    /* 商店页东西太密，贴边写字一定打架：改成框上打编号、说明统一放底部说明卡 */
    var narrow = vw < 560;                     /* 手机竖屏：贴边写字一定打架 */
    var campPage = (page === 2) || narrow;
    /* iPad 上说明字号抬一档（css 里的 @media 管字体），编号也得跟着变大，
       否则 22px 的圆点还按 18px 的偏移挂，位置会歪 */
    var big = vw >= 700 && vh >= 700;
    var numSz = big ? 22 : 18, numHalf = numSz / 2;
    var legend = [];
    var html = '<div class="tut-mask"></div>';
    for (var j = 0; j < boxes.length; j++) {
      var b = boxes[j], rr = b.r;
      html += '<div class="tut-box" style="left:' + Math.round(rr.x) + 'px;top:' + Math.round(rr.y)
        + 'px;width:' + Math.round(rr.w) + 'px;height:' + Math.round(rr.h) + 'px"></div>';
      if (!b.tip) continue;
      if (campPage) {
        legend.push(b.tip);
        /* 编号挂哪儿由 hotspots 指：'tc' 上边正中（页签上面有空间）、
           'r' 右边外侧（商店底下那几个框排得紧，只能往右让）、默认左上角 */
        var nx, ny;
        if (b.num === 'tc') {
          nx = rr.x + rr.w / 2 - numHalf; ny = rr.y - numHalf;
        } else if (b.num === 'r') {
          nx = rr.x + rr.w + 2; ny = rr.y + rr.h / 2 - numHalf;
        } else {
          nx = rr.x - numHalf; ny = rr.y - numHalf;
        }
        /* 贴屏幕边的夹回可视区，别被切掉 */
        nx = Math.max(2, Math.min(nx, vw - numSz - 4));
        ny = Math.max(2, Math.min(ny, vh - numSz - 8));
        html += '<i class="tut-num" style="left:' + Math.round(nx) + 'px;top:' + Math.round(ny)
          + 'px">' + legend.length + '</i>';
        continue;
      }

      var cx = Math.max(118, Math.min(rr.x + rr.w / 2, vw - 118));
      var place = b.place;
      if (place === 'above' && rr.y < 34) place = 'below';
      if (place === 'below' && rr.y + rr.h + 54 > vh - 72) place = 'above';

      var st;
      if (place === 'left') {
        st = 'left:' + Math.round(rr.x - 8) + 'px;top:' + Math.round(rr.y + rr.h / 2)
          + 'px;transform:translate(-100%,-50%)';
      } else if (place === 'above') {
        st = 'left:' + Math.round(cx) + 'px;top:' + Math.round(rr.y - 6)
          + 'px;transform:translate(-50%,-100%)';
      } else {
        st = 'left:' + Math.round(cx) + 'px;top:' + Math.round(rr.y + rr.h + 5)
          + 'px;transform:translate(-50%,0)';
      }
      html += '<div class="tut-tip" style="' + st + '">' + esc(b.tip) + '</div>';
    }
    if (campPage && legend.length) {
      /* 第二页键盘藏了，说明卡原本贴在屏幕最下边，离画布一大截；
         改成贴画布底边。页面矮 / 条目多塞不下时退回原来的底部定位 */
      var legTop = 0;
      if (page === 2) {
        var cv2 = canvasOf();
        var cvb = cv2 && cv2.getBoundingClientRect && cv2.getBoundingClientRect();
        if (cvb && cvb.bottom) {
          var need = legend.length * (big ? 34 : 26) + 34;
          if (cvb.bottom + 10 + need < vh - 84) legTop = Math.round(cvb.bottom + 10);
        }
      }
      html += '<div class="tut-legend"'
        + (legTop ? ' style="top:' + legTop + 'px;bottom:auto"' : '') + '>';
      for (var L = 0; L < legend.length; L++) {
        html += '<div><b>' + (L + 1) + '</b><span>' + esc(legend[L]) + '</span></div>';
      }
      html += '</div>';
    }
    html += '<div class="tut-foot">'
      + '<button class="tut-skip" id="tutSkip">跳过</button>'
      + '<span class="tut-dots"><i class="' + (page === 1 ? 'on' : '') + '"></i>'
      + '<i class="' + (page === 2 ? 'on' : '') + '"></i></span>'
      + '<button class="tut-next" id="tutNext">' + (page === 1 ? '下一步' : '开始闯关') + '</button>'
      + '</div>';
    el.innerHTML = html;

    el.querySelector('#tutSkip').onclick = function () { close(); };
    el.querySelector('#tutNext').onclick = function () {
      if (page === 1) { page = 2; render(); }
      else close();
    };
  }

  var settleTimer = null;
  function settle() {
    if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    var again = function (ms) {
      settleTimer = setTimeout(function () {
        settleTimer = null;
        if (isOpen()) render();
      }, ms);
    };
    if (global.requestAnimationFrame) {
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(function () { if (isOpen()) render(); });
      });
    }
    again(360);
  }
  function onResize() { if (isOpen()) settle(); }
  global.addEventListener('resize', onResize);
  global.addEventListener('orientationchange', onResize);

  function isOpen() { return !!el && el.classList.contains('on'); }

  function open(host, page0, onDone) {
    hostRef = host || global.ArcadeHost || global.ARCADE;
    doneCb = onDone || null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'arcTut';
      el.className = 'arc-tut';
      document.body.appendChild(el);
    }
    page = page0 || 1;
    var hp = document.getElementById('hint');
    if (hp) hp.style.display = 'none';     /* 调试页底部那行提示，会和控制栏打架 */
    document.body.classList.add('tut-lock');
    el.classList.add('on');
    render();
    /* 首帧拿到的可能还是布局前的画布矩形（换页、转屏、字体加载都会变），
       再补两次重绘，让框跟得上 */
    settle();
  }

  function close() {
    var s = stateOf();
    if (s && s.scene === 'camp' && hostRef && hostRef.closeShop) hostRef.closeShop();
    pauseGame(false);
    if (el) { el.classList.remove('on'); el.innerHTML = ''; }
    document.body.classList.remove('tut-lock');
    var kb2 = document.querySelector('.arc-keys');
    if (kb2) kb2.style.visibility = '';
    var hp2 = document.getElementById('hint');
    if (hp2) hp2.style.display = '';
    if (doneCb) { try { doneCb(); } catch (e) { } }
    doneCb = null;
  }

  global.ArcadeTutorial = {
    open: open,
    close: close,
    next: function () { if (page === 1) { page = 2; render(); } else close(); },
    isOpen: isOpen
  };
})(window);
