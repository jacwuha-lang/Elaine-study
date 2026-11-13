/* ============================================================
   modules/hv.js — have / has · some / any / no
   五件事：
     ① 主语是单数还是复数，决定用 have 还是 has
     ② 肯定句用 some，否定句和疑问句用 any
     ③ 否定句的助动词：don't have / doesn't have
     ④ has no  ↔  doesn't have any（同义句转换）
     ⑤ 反过来也一样：doesn't have any  →  has no
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, Q = SM.quiz;

  function gen() {
    const kind = U.rand(5);

    /* ---------- ① 填空：have 还是 has ---------- */
    if (kind === 0) {
      const p = U.pick(LEX.ownPeople);
      const thing = U.pick(LEX.ownThings);
      const right = p.third ? 'has' : 'have';
      const tip = p.third
        ? '主语 “' + p.s + '” 是第三人称单数，用 has。'
        : '主语 “' + p.s + '” 不是第三人称单数，用 have。';
      /* 一半填空、一半选择 —— 选择能看清「have / has / is / are」摆在一起时的区别。
         两种题型的题干前缀不一样，不能共用一句。 */
      if (U.rand(2) === 0) {
        return Q.I('用所给词的适当形式填空：\n'
          + p.s + ' ___ (have) ' + thing + '.', right, tip, 1);
      }
      return Q.choice(p.s + ' ___ (have) ' + thing + '.', right,
        p.third ? ['have', 'is', 'are'] : ['has', 'is', 'are'], tip);
    }

    /* ---------- ② 选 some / any ---------- */
    if (kind === 1) {
      const p = U.pick(LEX.ownPeople);
      const t = U.pick(LEX.ownThingsPlain);
      /* 三种语境：肯定句 some、否定句 any、疑问句 any */
      const form = U.rand(3);
      let stmt, right, tip;

      if (form === 0) {
        stmt = p.s + ' ' + (p.third ? 'has' : 'have') + ' ___ ' + t + '.';
        right = 'some';
        tip = '肯定句里用 some。';
      } else if (form === 1) {
        stmt = p.s + ' ' + (p.third ? 'doesn\'t' : 'don\'t') + ' have ___ ' + t + '.';
        right = 'any';
        tip = '否定句里 some 要变成 any。';
      } else {
        stmt = (p.third ? 'Does ' : 'Do ') + qForm(p.s) + ' have ___ ' + t + '?';
        right = 'any';
        tip = '疑问句里 some 也要变成 any。';
      }
      return Q.choice(stmt, right,
        right === 'some' ? ['any', 'a', 'much'] : ['some', 'a', 'much'], tip);
    }

    /* ---------- ③ 否定句：don't have / doesn't have ---------- */
    if (kind === 2) {
      const p = U.pick(LEX.ownPeople);
      const t = U.pick(LEX.ownThingsPlain);
      const stmt = p.s + ' ___ any ' + t + '.';
      const right = p.third ? 'doesn\'t have' : 'don\'t have';
      /* 干扰项全是真错：doesn't has（助动词后面又用三单）、
         don't has（同上）、not have（少了助动词）。
         不放 hasn't / haven't —— 英式英语里「He hasn't any books.」是成立的，
         放进来就成了第二个正确答案。 */
      const wrongs = p.third
        ? ['don\'t have', 'doesn\'t has', 'not have']
        : ['doesn\'t have', 'don\'t has', 'not have'];
      const tip = p.third
        ? '主语是三单，否定用 doesn\'t，后面动词还原成 have。'
        : '主语不是三单，否定用 don\'t，后面动词用原形 have。';
      return Q.choice(stmt, right, wrongs, tip);
    }

    /* ---------- ④ 同义句：has no  →  doesn't have any ---------- */
    if (kind === 3) {
      const p = U.pick(LEX.ownPlaces);
      const t = U.pick(LEX.roomThings);
      const has = p.third ? 'has' : 'have';
      const aux = p.third ? 'does not' : 'do not';
      const stmt = p.s + ' ' + has + ' no ' + t + '.';
      const ans = p.s + ' ' + aux + ' have any ' + t + '.';
      const wrongs = [
        /* 助动词后面又用三单 —— 最常见 */
        p.s + ' ' + (p.third ? 'does not has' : 'do has') + ' any ' + t + '.',
        /* no 和 any 同时出现，双重否定 */
        p.s + ' ' + aux + ' have no ' + t + '.',
        /* 少了助动词 */
        p.s + ' not have any ' + t + '.'
      ];
      const tip = 'has no = doesn\'t have any。no 后面直接跟名词，any 前面必须先有 not。';
      return pickForm(stmt, ans, wrongs, tip, 'has no 换成 doesn\'t have any');
    }

    /* ---------- ⑤ 同义句：doesn't have any  →  has no ---------- */
    const p = U.pick(LEX.ownPlaces);
    const t = U.pick(LEX.roomThings);
    const has = p.third ? 'has' : 'have';
    const aux = p.third ? 'doesn\'t' : 'don\'t';
    const stmt = p.s + ' ' + aux + ' have any ' + t + '.';
    const ans = p.s + ' ' + has + ' no ' + t + '.';
    const wrongs = [
      /* no 和 any 撞在一起 */
      p.s + ' ' + has + ' no any ' + t + '.',
      /* 用 has not 硬凑，不是这个句型的说法 */
      p.s + ' ' + (p.third ? 'has not' : 'have not') + ' any ' + t + '.',
      /* 助动词和 no 都用上，还是双重否定 */
      p.s + ' ' + aux + ' have no ' + t + '.'
    ];
    const tip = 'doesn\'t have any = has no。no 自己就带否定了，不用再请 not。';
    return pickForm(stmt, ans, wrongs, tip, 'doesn\'t have any 换成 has no');
  }

  /* 疑问句里的人称转换：I / We → you，My → your，
     同时首字母要小写 —— 「Does The boy have…?」是错的。 */
  function qForm(s) {
    if (s === 'I' || s === 'We') return 'you';
    return SM.M.mid(s.replace(/\bMy\b/g, 'your'));
  }

  function pickForm(stmt, ans, wrongs, tip, tag) {
    const prompt = '改成意思相同的句子（' + tag + '）：\n' + stmt;
    const k = U.rand(3);
    if (k === 0) return Q.fromBank(prompt, ans, tip);
    if (k === 1) return Q.I(prompt, ans, tip);
    return Q.choice('把 “' + stmt + '” 换成意思相同的句子，正确的是：', ans, wrongs, tip);
  }

  SM.register({
    id: 'hv',
    name: 'have / has',
    sub: 'some / any / no',
    ico: '🎒',
    c1: '#FFB4A2', c2: '#F4836A', cd: '#C9543B',
    L: [
      { h: 'have 还是 has？', b: '主语是 he / she / it，或者一个人、一样东西，用 has；主语是 I / you / we / they，或者复数，用 have。',
        e: [['My sister has two new books.', '我妹妹有两本新书'], ['My classmates have many toys.', '我的同学有很多玩具']] },
      { h: '肯定句用 some', b: 'some 表示「一些」，用在肯定句里。',
        e: [['Kitty has some books.', '基蒂有一些书']] },
      { h: '否定句和疑问句用 any', b: '句子里有了 not 或者变成问句，some 就要变成 any。',
        e: [['She doesn\'t have any books.', '她没有书'], ['Does she have any books?', '她有书吗？']] },
      { h: '否定句：don\'t / doesn\'t have', b: '主语不是三单用 don\'t have，是三单用 doesn\'t have，后面一律用 have。',
        e: [['The children don\'t have any brushes.', ''], ['The boy doesn\'t have any brushes.', '']] },
      { h: 'has no = doesn\'t have any', b: '这两种说法意思完全一样，考试常让互换。no 后面直接跟名词，any 前面必须先有 not。',
        e: [['The library has no computers.', '= The library doesn\'t have any computers.'], ['Our classroom doesn\'t have any pictures.', '= Our classroom has no pictures.']] },
      { h: '最容易错的地方', b: 'doesn\'t 后面又写成 has。助动词已经把三单的活干完了，后面的动词必须还原成 have。',
        e: [['She doesn\'t have any books.', '✔ 不是 doesn\'t has']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
