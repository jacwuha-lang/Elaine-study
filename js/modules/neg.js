/* ============================================================
   modules/neg.js — 否定句
   be + not / can + not / don't / doesn't（动词还原）
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, M = SM.M, Q = SM.quiz;

  const isThird = function (p) { return p === 'he' || p === 'she' || p === 'it'; };

  function gen() {
    const subj = U.pick(LEX.subjects);
    const kind = U.rand(3);

    /* ---------- ① be 动词否定 ---------- */
    if (kind === 0) {
      const be = M.be(subj.p);
      const pred = U.pick(LEX.predsFor(subj.k, subj));
      /* 复数主语要换复数表语，否则出来「The students are a teacher.」 */
      const pt = LEX.predText(pred, subj);
      const pl = LEX.isPlural(subj);
      const stmt = subj.s + ' ' + be + ' ' + pt + '.';
      const ans = subj.s + ' ' + be + ' not ' + pt + '.';
      const tip = '有 be 动词，直接在 ' + be + ' 后面加 not。';

      const wrongs = [
        /* 该用 be 否定，却请了助动词 —— 而且助动词还得跟单复数 */
        subj.s + ' ' + (pl ? 'don\'t' : 'doesn\'t') + ' ' + pt + '.',
        subj.s + ' ' + be + ' no ' + pt + '.',
        subj.s + ' not ' + be + ' ' + pt + '.'
      ];
      return pickForm(stmt, ans, wrongs, tip);
    }

    /* ---------- ② can 否定（公交车不会「会做某事」，这种主语跳过这一型） ---------- */
    const canPool = LEX.canDoFor(subj.k);
    if (kind === 1 && canPool.length) {
      const act = U.pick(canPool);
      const stmt = subj.s + ' can ' + act.v + '.';
      /* 写 cannot，不写 can not。课本教的否定就是 cannot（= can't），
         拆成两个词摆进词块，孩子会以为标准写法就是分开的两个词。
         判分那边 U.norm 把 cannot / can not / can't 归一成同一个串，
         孩子手写哪个都算对。 */
      const ans = subj.s + ' cannot ' + act.v + '.';
      const tip = 'can 后面加 not，写成一个词 cannot，也可以缩写成 can\'t。';

      const wrongs = [
        subj.s + ' don\'t can ' + act.v + '.',
        /* 情态动词后面动词要还原。只变短语的第一个词 ——
           以前整串加 s，catch mice 会变成「catch mices」，凭空造词。 */
        subj.s + ' cannot ' + M.s3v(act.v) + '.',
        subj.s + ' not can ' + act.v + '.'
      ];
      return pickForm(stmt, ans, wrongs, tip);
    }

    /* ---------- ③ 实义动词否定 ---------- */
    const v = U.pick(LEX.verbsFor(subj));
    const obj = LEX.objFor(v, subj);
    const third = isThird(subj.p);
    const aux = third ? 'does not' : 'do not';
    const s3 = M.s3(v.b);

    const stmt = subj.s + ' ' + (third ? s3 : v.b) + ' ' + obj + '.';
    const ans = subj.s + ' ' + aux + ' ' + v.b + ' ' + obj + '.';
    const tip = (third ? '主语是三单，用 does not' : '主语不是三单，用 do not')
      + (third ? '，原来的 ' + s3 + ' 要还原成 ' + v.b + '。' : '，动词保持原形 ' + v.b + '。');

    const wrongs = [
      subj.s + ' ' + (third ? 'do not' : 'does not') + ' ' + v.b + ' ' + obj + '.',
      subj.s + ' ' + aux + ' ' + s3 + ' ' + obj + '.',
      subj.s + ' not ' + v.b + ' ' + obj + '.'
    ];
    return pickForm(stmt, ans, wrongs, tip);
  }

  function pickForm(stmt, ans, wrongs, tip) {
    const kind = U.rand(3);
    const prompt = '改成否定句：\n' + stmt;

    if (kind === 0) return Q.fromBank(prompt, ans, tip);
    if (kind === 1) return Q.I(prompt, ans, tip);
    return Q.choice('把 “' + stmt + '” 改成否定句，正确的是：', ans, wrongs, tip);
  }

  SM.register({
    id: 'neg',
    name: '否定句',
    sub: 'not / don\'t / doesn\'t',
    ico: '🚫',
    c1: '#FF8FA3', c2: '#F2607C', cd: '#C93E58',
    L: [
      { h: '有 be 动词：后面加 not', b: 'is not = isn\'t，are not = aren\'t，am not 一般不缩写。',
        e: [['He is happy. → He is not happy.', ''], ['We are students. → We aren\'t students.', '']] },
      { h: '有情态动词：后面加 not', b: 'can not = can\'t。',
        e: [['They can sing. → They can\'t sing.', '']] },
      { h: '实义动词：加 don\'t / doesn\'t', b: '放在动词前面，动词用原形。',
        e: [['I like apples. → I don\'t like apples.', ''], ['She goes to school. → She doesn\'t go to school.', '']] },
      { h: 'some 要变 any', b: '否定句和疑问句里，some 通常变成 any。',
        e: [['I have some books. → I don\'t have any books.', '']] },
      { h: 'and 常常变 or', b: '并列的 and 在否定句中常改成 or。',
        e: [['I like apples and pears. → I don\'t like apples or pears.', '']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
