/* ================= 竖屏字母键盘 =================
   480 逻辑宽压到手机竖屏后，画布里 26 个字母每键只剩十几像素，手指点不准。
   所以竖屏时画布不画字母盘（ARCADE.layout = 'portrait'），改用这块 7 列 DOM 大键盘。
   主应用（host.js）和独立调试页（index.html）共用这一份。 */
(function (global) {
  'use strict';

  var el = null;

  function build() {
    var html = '', i, ch;
    for (i = 65; i <= 90; i++) {
      ch = String.fromCharCode(i);
      html += '<button type="button" class="arc-key" data-ch="' + ch + '">' + ch + '</button>';
    }
    html += '<button type="button" class="arc-key arc-key-bs" data-bs="1" aria-label="退格">⌫</button>';

    el = document.createElement('div');
    el.className = 'arc-keys';
    el.setAttribute('aria-label', '字母键盘');
    el.innerHTML = html;
    return el;
  }

  var Keypad = {
    /* 挂到容器底部。onKey(ch) 收字母，onBack() 收退格。 */
    mount: function (container, onKey, onBack) {
      if (!container) return null;
      var pad = el || build();
      /* 用 pointerdown 而不是 click：手指落下就出手，不等抬起，跟画布里的点读盘手感一致 */
      if (!pad._wired) {
        pad.addEventListener('pointerdown', function (ev) {
          var b = ev.target;
          while (b && b !== pad && !b.classList.contains('arc-key')) b = b.parentNode;
          if (!b || b === pad) return;
          ev.preventDefault();
          if (b.hasAttribute('data-bs')) { if (pad._onBack) pad._onBack(); }
          else if (pad._onKey) pad._onKey(b.getAttribute('data-ch'));
        });
        pad.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
        pad._wired = true;
      }
      pad._onKey = onKey;
      pad._onBack = onBack;
      if (pad.parentNode !== container) container.appendChild(pad);
      container.classList.add('has-keys');
      return pad;
    },

    unmount: function () {
      if (!el) return;
      if (el.parentNode) {
        el.parentNode.classList.remove('has-keys');
        el.parentNode.removeChild(el);
      }
    },

    mounted: function () { return !!(el && el.parentNode); },
    height: function () { return (el && el.parentNode) ? (el.offsetHeight + 6) : 0; }
  };

  global.ArcadeKeypad = Keypad;
})(window);
