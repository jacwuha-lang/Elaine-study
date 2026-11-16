/* ============================================================
   bridge.js — 让 js/math/modules.js 能在 PK 页里注册
   ------------------------------------------------------------
   math/modules.js 是老式脚本，靠 SM.subj.add('ma', mod) 把自己
   挂到科目上。PK 页不加载 js/subject.js（它带着整套学习界面），
   所以这里放一个只收集、不渲染的极简注册表。

   加载顺序：core.js → bridge.js → math/modules.js
   ============================================================ */
window.SM = window.SM || {};

(function (SM) {
  'use strict';

  /* PK 页只关心数学模块，收到别的科目直接忽略 */
  SM.mpMath = { mods: [] };

  SM.subj = {
    add: function (id, mod) {
      if (id === 'ma' && mod) SM.mpMath.mods.push(mod);
    },
    setReady: function () {},
    ready: function () { return Promise.resolve(); }
  };
})(window.SM);
