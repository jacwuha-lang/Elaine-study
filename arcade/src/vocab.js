/* 词库加载器：把 T1-T8 合并、去重、按难度分层
   最终暴露 window.WORDS = [{w,m,p,tier}] 与 window.VOCAB */
(function (global) {
  'use strict';

  var SRC = [
    global.VOCAB_T1, global.VOCAB_T2, global.VOCAB_T3, global.VOCAB_T4,
    global.VOCAB_T5, global.VOCAB_T6, global.VOCAB_T7, global.VOCAB_T8
  ];

  var seen = Object.create(null);
  var all = [];
  var byTier = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
  /* 教材单元索引：byUnit[tier][unit] = 该册第 unit 单元的词
     只为 T1/T2（四年级上下册）建立，用于"一关一个单元"的出词 */
  var byUnit = {};

  for (var ti = 0; ti < SRC.length; ti++) {
    var arr = SRC[ti] || [];
    var tier = ti + 1;
    for (var i = 0; i < arr.length; i++) {
      var parts = String(arr[i]).split('|');
      if (parts.length < 3) continue;
      var w = parts[0].trim();
      var m = parts[1].trim();
      var p = parts[2].trim();
      var unit = parts.length > 3 ? (parseInt(parts[3], 10) || 0) : 0;
      /* 只保留纯英文短语（允许空格和连字符），避免脏数据 */
      if (!/^[A-Za-z][A-Za-z'\- ]{0,24}$/.test(w)) continue;
      if (!m) continue;
      var key = w.toLowerCase().replace(/\s+/g, ' ');
      if (seen[key]) continue;
      seen[key] = 1;
      var item = { w: key, m: m, p: p, tier: tier, unit: unit };
      all.push(item);
      byTier[tier].push(item);
      if (unit) {
        if (!byUnit[tier]) byUnit[tier] = {};
        if (!byUnit[tier][unit]) byUnit[tier][unit] = [];
        byUnit[tier][unit].push(item);
      }
    }
  }

  /* 每层按字母数排序：先短后长，长词留给后期关卡 */
  for (var k in byTier) {
    byTier[k].sort(function (a, b) { return a.w.length - b.w.length || (a.w < b.w ? -1 : 1); });
  }
  /* 单元内部同样先短后长 */
  for (var t2 in byUnit) {
    for (var u in byUnit[t2]) {
      byUnit[t2][u].sort(function (a, b) { return a.w.length - b.w.length || (a.w < b.w ? -1 : 1); });
    }
  }

  global.WORDS = all;
  global.VOCAB = {
    all: all,
    byTier: byTier,
    byUnit: byUnit,
    total: all.length,
    tierCount: function (t) { return (byTier[t] || []).length; },
    unitCount: function (t, u) { return ((byUnit[t] || {})[u] || []).length; }
  };
})(window);
