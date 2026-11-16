/* ============================================================
   chinese/modules.js — 语文客观题
   ------------------------------------------------------------
   语文和数学不一样：数学是「规则生成」，语文是「有限集合检索」。
   所以这里先建三张表，再按表出题：

     · 词语表  data/cn-words.json    看拼音写词语
     · 多音字  data/cn-duoyin.json   选正确读音
     · 错别字  data/cn-cuobie.json   选出写错的词

   这一版只做客观题。阅读和习作按计划放到 P3，不混进对错统计。
   ============================================================ */
(function (SM) {
  'use strict';

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = x[i]; x[i] = x[j]; x[j] = t;
    }
    return x;
  }

  const ready = Promise.all([
    fetch('data/cn-words.json').then(function (r) { return r.json(); }),
    fetch('data/cn-duoyin.json').then(function (r) { return r.json(); }),
    fetch('data/cn-cuobie.json').then(function (r) { return r.json(); })
  ]).then(function (res) {
    SM.cnData = {
      words: (res[0] && res[0].items) || [],
      duo: (res[1] && res[1].items) || [],
      cuo: (res[2] && res[2].items) || []
    };
    return SM.cnData;
  }).catch(function () {
    SM.cnData = { words: [], duo: [], cuo: [] };
    return SM.cnData;
  });

  /* ---------------- 看拼音写词语 ---------------- */
  function wordQ(w) {
    return {
      t: 'h',
      q: w.p,
      inst: '看拼音，写词语',
      a: [w.w],
      id: 'cn.w.' + w.w,
      sub: w.u ? '第 ' + w.u + ' 单元' : '拓展词',
      steps: [w.tip || '先看清声母、韵母和声调，再一笔一画写。'],
      tip: '可以先用手指在桌上写一遍，再输入。'
    };
  }

  SM.subj.add('cn', {
    id: 'cn_pinyin',
    name: '看拼音写词语',
    sub: '生字词 · 第 1–4 单元',
    ico: '词',
    items: function () {
      return ((SM.cnData && SM.cnData.words) || []).map(function (w) {
        return {
          id: 'cn.w.' + w.w,
          gen: function () { return wordQ(w); }
        };
      });
    }
  });

  /* ---------------- 多音字 ---------------- */
  function duoQ(it) {
    const opts = shuffle([it.p, it.wrong]);
    return {
      t: 'c',
      q: '“' + it.w + '”中“' + it.ch + '”的正确读音是？',
      inst: '多音字',
      o: opts,
      a: opts.indexOf(it.p),
      id: it.id,
      sub: it.w,
      steps: [it.tip],
      tip: '先想这个词是什么意思，再选读音。'
    };
  }

  SM.subj.add('cn', {
    id: 'cn_duoyin',
    name: '多音字',
    sub: '一个字，几种读法',
    ico: '音',
    items: function () {
      return ((SM.cnData && SM.cnData.duo) || []).map(function (it) {
        return {
          id: it.id,
          gen: function () { return duoQ(it); }
        };
      });
    }
  });

  /* ---------------- 错别字 ---------------- */
  function cuoQ(it, all) {
    const others = shuffle(all.filter(function (x) { return x.id !== it.id; }))
      .slice(0, 3)
      .map(function (x) { return x.w; });
    const opts = shuffle([it.bad].concat(others));
    return {
      t: 'c',
      q: '下面词语中，有一个写错了，请选出来。',
      inst: '错别字',
      o: opts,
      a: opts.indexOf(it.bad),
      id: it.id,
      sub: '正确写法：' + it.w,
      steps: [it.tip],
      tip: '看清偏旁，再决定哪个字写错了。'
    };
  }

  SM.subj.add('cn', {
    id: 'cn_cuobie',
    name: '错别字',
    sub: '形近字 · 同音字',
    ico: '正',
    items: function () {
      const all = (SM.cnData && SM.cnData.cuo) || [];
      return all.map(function (it) {
        return {
          id: it.id,
          gen: function () { return cuoQ(it, all); }
        };
      });
    }
  });

  SM.subj.setReady('cn', ready);

})(window.SM);
