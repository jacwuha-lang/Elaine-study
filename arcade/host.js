/* ================= 闯关宿主（主应用侧） =================
   把 pixel 那套战斗引擎按需注入当前页面，不做 iframe。
   职责只有三件：插 canvas、按顺序懒加载脚本、把容器尺寸报给游戏。
   玩法、积分、记忆曲线都在 js/arcade.js，这里不掺和。 */
(function (global) {
  'use strict';

  var SRC = [
    'font.js', 'sprites.js', 'art-backgrounds.js', 'art-player.js', 'art-creatures.js', 'art.js',
    'vocab_t1.js', 'vocab_t2.js', 'vocab_t3.js', 'vocab_t4.js',
    'vocab_t5.js', 'vocab_t6.js', 'vocab_t7.js', 'vocab_t8.js',
    'vocab.js', 'meta.js', 'lines.js', 'levels.js', 'word-system.js', 'ambient.js', 'skills.js', 'effects.js', 'world-renderer.js', 'hud-renderer.js', 'game.js'
  ];
  var BASE = 'arcade/src/';       /* 脚本目录 */
  var ASSET_BASE = 'arcade/';     /* 图片目录：图集在 arcade/assets/ 下，不是 src/assets/ */

  var loaded = false;
  var loading = null;
  var canvas = null;
  var container = null;
  var ro = null;
  var layoutName = 'land';

  /* 竖屏字母盘在 keypad.js 里，独立调试页也用它 */
  function applyLayout() {
    if (!container) return;
    if (layoutName === 'portrait' && global.ArcadeKeypad) {
      global.ArcadeKeypad.mount(container, keyIn, keyBack);
    } else if (global.ArcadeKeypad) {
      global.ArcadeKeypad.unmount();
    }
    if (global.ARCADE) global.ARCADE.setLayout(layoutName);
    measure();
  }

  function keyIn(ch) {
    if (global.ARCADE) global.ARCADE.kidLetter(ch);
  }
  function keyBack() {
    if (global.ARCADE) global.ARCADE.kidBack();
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;              /* 保序：game.js 依赖前面那些全局量 */
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('脚本加载失败：' + src)); };
      document.head.appendChild(s);
    });
  }

  function chain() {
    var p = Promise.resolve();
    SRC.forEach(function (f) {
      p = p.then(function () { return loadScript(BASE + f); });
    });
    return p;
  }

  function measure() {
    if (!container || !global.ARCADE) return;
    var r = container.getBoundingClientRect();
    /* 竖屏键盘占了容器底部一截，画布只能用剩下的高度 */
    var padH = global.ArcadeKeypad ? global.ArcadeKeypad.height() : 0;
    /* 留一点余量，避免 1px 抖动触发重排 */
    global.ARCADE.setBox(Math.max(120, Math.floor(r.width)), Math.max(70, Math.floor(r.height - padH)));
  }

  var Arcade = {
    /* 把游戏挂到某个容器里。重复调用只是把 canvas 挪过去，不会重载脚本。 */
    mount: function (el) {
      container = el;
      if (loaded) {
        if (canvas && canvas.parentNode !== el) el.appendChild(canvas);
        applyLayout();
        return Promise.resolve(canvas);
      }
      if (loading) return loading;

      canvas = document.createElement('canvas');
      canvas.id = 'game';
      canvas.width = 480;
      canvas.height = 270;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', '单词闯关');
      el.appendChild(canvas);

      /* 从应用根目录加载，图片基址要带上 arcade/ 前缀（注意不是 arcade/src/） */
      global.ARCADE_BASE = ASSET_BASE;

      loading = chain().then(function () {
        loaded = true;
        loading = null;
        applyLayout();
        if (global.ResizeObserver) {
          ro = new ResizeObserver(measure);
          ro.observe(el);
        } else {
          global.addEventListener('resize', measure);
        }
        return canvas;
      }).catch(function (e) {
        loading = null;
        throw e;
      });
      return loading;
    },

    /* 开局：options 见 js/arcade.js */
    start: function (opts) {
      if (!loaded || !global.ARCADE) return false;
      global.ARCADE.setActive(true);
      measure();
      global.ARCADE.start(opts || {});
      return true;
    },

    prepare: function (tier, words) {
      if (loaded && global.ARCADE) global.ARCADE.prepare(tier, words);
    },

    goTier: function (tier, words) {
      if (loaded && global.ARCADE) global.ARCADE.goTier(tier, words);
    },

    pause: function () { if (loaded) global.ARCADE.setActive(false); },
    resume: function () {
      if (loaded) { global.ARCADE.setActive(true); measure(); }
    },

    /* 收起：不销毁状态，下次进来接着调 setActive(true) 就恢复 */
    hide: function () { if (loaded) global.ARCADE.setActive(false); },

    state: function () { return loaded ? global.ARCADE.state() : null; },
    summary: function () { return loaded ? global.ARCADE.summary() : null; },
    onWord: function (fn) { if (loaded) global.ARCADE.onWord = fn; },
    onTier: function (fn) { if (loaded) global.ARCADE.onTier = fn; },
    onEnd: function (fn) { if (loaded) global.ARCADE.onEnd = fn; },
    onNeedTier: function (fn) { if (loaded) global.ARCADE.onNeedTier = fn; },
    setHpRate: function (v) { if (loaded) global.ARCADE.hpRate = v; },

    /* 竖屏 → 字母盘搬出画布；横屏 → 回到画布里的字母盘 */
    setLayout: function (name) {
      layoutName = (name === 'portrait') ? 'portrait' : 'land';
      applyLayout();
    },
    layout: function () { return layoutName; },

    /* 新手教程：热区坐标 + 局内商店开关 + canvas 引用 */
    hotspots: function (page) {
      return (loaded && global.ARCADE && global.ARCADE.hotspots) ? global.ARCADE.hotspots(page) : [];
    },
    openShop: function () { if (loaded && global.ARCADE) global.ARCADE.openShop(); },
    closeShop: function () { if (loaded && global.ARCADE) global.ARCADE.closeShop(); },
    canvas: function () { return canvas; },

    isLoaded: function () { return loaded; }
  };

  global.ArcadeHost = Arcade;
})(window);
