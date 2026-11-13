/* ============================================================
   modules/ans.js — 问句怎么答

   主体：给问句选答语
   少量：给答语选问句（更难，训练反向推理）

   干扰项的原则改过一次：
   以前是「从别的疑问词里随机取」，结果 How much 的题配上 Mr. Green. 这种
   毫不相干的答语，孩子靠常识就能排除，等于没考。
   现在优先用 lexicon 里每个疑问词自带的 foil —— 形式相近（同样以 At/It is/
   He is 开头）、语义答非所问，孩子必须真懂知识点才敢排除。
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, Q = SM.quiz;

  /* 拼干扰项池，按优先级取：
     ① 题目自带的 foil（最贴这道题）
     ② 本组通用 foil（同一疑问词的经典错答）
     ③ 别的疑问词的答语（兜底，保证凑得够 3 个） */

  /* 人称代词开头的答语会暴露单复数：问句是单数、干扰项却是 They are…，
     孩子不用懂知识点也能排除。所以排序时分三档：
       0 同开头词   It is mine.  →  It is a bag.
       1 中性开头   Mr. Green. / At home. / B-O-O-K.  —— 不带人称，看不出单复数
       2 别的人称   They are…    —— 实在凑不够才用 */
  const PRON = { i: 1, you: 1, he: 1, she: 1, it: 1, we: 1, they: 1 };

  function headRank(w, head) {
    const h = U.norm(w).split(' ')[0] || '';
    if (h && h === head) return 0;
    return PRON[h] ? 2 : 1;
  }

  function pickFoils(correct, item, g, others, n) {
    const out = [];
    const used = Object.create(null);
    used[U.norm(correct)] = 1;
    const head = U.norm(correct).split(' ')[0] || '';

    function take(arr) {
      if (!arr || !arr.length) return;
      const a = U.shuffle(arr.slice());
      /* sort 是稳定排序，同一档内部仍保留随机性 */
      a.sort(function (x, y) { return headRank(x, head) - headRank(y, head); });
      for (let i = 0; i < a.length && out.length < n; i++) {
        const w = a[i];
        if (!w) continue;
        const k = U.norm(w);
        if (used[k]) continue;
        used[k] = 1;
        out.push(w);
      }
    }

    take(item.foil);
    take(g.foil);
    others.forEach(function (o) {
      if (out.length < n) take(o.items.map(function (it) { return it.a; }));
    });
    return out;
  }

  /* 反向题的干扰项：给答语选问句。
     用「别的疑问词组」里现成的问句 —— 每一句都是通顺的英语，
     而且只有一句的疑问词跟这条答语对得上，答案是唯一的。

     试过两条走不通的路：
       ① 把原句的疑问词换掉，句型不动 → 必然造病句
          「Whose is the weather today?」「How much is that boy?」
          孩子一眼排除，等于白送三个选项
       ② 用同一个疑问词组的其他问句 → 答案不唯一
          「— It is ten yuan.」配「How much is the book?」和
          「How much is this bag?」，两个都对，孩子选哪个都该算对

     第 ③ 条（现在这条）两个毛病都没有：句子都是人写的，问句也是唯一匹配。
     代价是疑问词不同、稍微好排除一点 —— 但「看到 ten yuan 想到问价钱」
     本来就是要练的东西，不算白送。 */
  function otherGroupQuestions(g, fullQ, n) {
    const out = [];
    const used = Object.create(null);
    used[U.norm(fullQ)] = 1;

    const list = [];
    LEX.wh.forEach(function (o) {
      if (o.w === g.w) return;
      o.items.forEach(function (it) { list.push(it.q.replace('___', o.w)); });
    });

    U.shuffle(list).forEach(function (w) {
      if (out.length >= n) return;
      const k = U.norm(w);
      if (!k || used[k]) return;
      used[k] = 1;
      out.push(w);
    });
    return out;
  }

  function gen() {
    const g = U.pick(LEX.wh);
    const item = U.pick(g.items);
    const fullQ = item.q.replace('___', g.w);
    const what = g.hint.replace(/^问/, '');

    const otherGroups = LEX.wh.filter(function (x) { return x.w !== g.w; });
    const tip = '问句问的是「' + what + '」，答语就要回答' + what + '。';

    /* 20% 反向题：给答语选问句 */
    if (U.rand(5) === 0) {
      return Q.choice('— ______ ?\n— ' + item.a, fullQ,
        otherGroupQuestions(g, fullQ, 3),
        '答语说的是「' + what + '」，所以要用 ' + g.w + ' 提问。');
    }

    return Q.choice('— ' + fullQ + '\n— ______', item.a,
      pickFoils(item.a, item, g, otherGroups, 3), tip);
  }

  SM.register({
    id: 'ans',
    name: '问句怎么答',
    sub: '问什么就答什么',
    ico: '💬',
    c1: '#FFC85C', c2: '#FFA726', cd: '#D17F0B',
    L: [
      { h: '特殊疑问句不能用 Yes / No 回答', b: '要针对疑问词来回答：问什么就答什么。',
        e: [['— Where is he? — He is in the classroom.', '问地点，答地点']] },
      { h: 'how many 用数字回答', b: '答语里通常有具体的数量。',
        e: [['— How many pens do you have? — I have three.', '']] },
      { h: 'how much 用数量或价钱回答', b: '问不可数名词的数量，或问价钱。',
        e: [['— How much is it? — It\'s ten yuan.', '']] },
      { h: 'whose 用 \'s 回答', b: '答语里用名词所有格。',
        e: [['— Whose book is it? — It\'s Tom\'s.', '']] },
      { h: '回答的人称要和问句一致', b: '问 he 就答 he，问 you 就答 I。',
        e: [['— What does your father do? — He is a doctor.', '']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
