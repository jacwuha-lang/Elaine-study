/* ============================================================
   modules/mix.js — 综合闯关
   不自己出题，从其余 7 个模块的生成器轮流取，保证题型均衡
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U;

  function gen(n) {
    const ids = SM.order.filter(function (x) { return x !== 'mix'; });
    const per = Math.ceil(n / ids.length) + 2;
    const buckets = ids.map(function (id) { return SM.modules[id].gen(per); });

    const out = [];
    let i = 0;
    while (out.length < n && i < n * 6) {
      const b = buckets[i % buckets.length];
      const k = Math.floor(i / buckets.length);
      if (b && b[k]) out.push(b[k]);
      i++;
    }
    return out.slice(0, n);
  }

  SM.register({
    id: 'mix',
    name: '综合闯关',
    sub: '所有题型混着考',
    ico: '🏆',
    c1: '#FF9EC8', c2: '#FF6FA5', cd: '#D63F7C',
    L: [
      { h: '这一关是怎么来的', b: '题目不是事先写好的，而是从前面 7 个知识点里现场抽词、按规则拼出来的。所以每次做都不一样。',
        e: [['同一道题不会重复出现', '做错的题下次会再来找你']] },
      { h: '做错了怎么办', b: '不用怕。做错的题会被记下来，下次练习时优先出现，直到你做对为止。',
        e: [['错了就是在学', '连续答对 3 题还有连击奖励']] }
    ],
    gen: gen
  });

})(window.SM);
