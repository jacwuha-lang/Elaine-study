/* ============================================================
   modules/pron.js — 代词
   两种位置、两套形式：
     名词前面   → 形容词性物主代词  their English / my book
     动词、介词后面 → 宾格          for them / help me

   卷子上的原题：
     Wenwen often helps other students with ___ (they) English.  → their
     Let's cheer for ___ (they)!                                  → them
   同一个 they，位置一变形式就变，这正是孩子绕不过去的地方。
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, Q = SM.quiz;

  /* 物主代词后面一定跟名词 */
  const POSS_FRAMES = [
    function (p) { return 'This is ___ (' + p.s + ') book.'; },
    function (p) { return 'Look at ___ (' + p.s + ') new bike.'; },
    function (p) { return 'I like ___ (' + p.s + ') new school.'; },
    function (p) { return 'She often helps ___ (' + p.s + ') classmates.'; },
    function (p) { return 'Wenwen often helps other students with ___ (' + p.s + ') English.'; },
    function (p) { return 'We often play football with ___ (' + p.s + ') friends.'; }
  ];

  /* 宾格前面一定是动词或者介词 */
  const OBJ_FRAMES = [
    function (p) { return 'Can you help ___ (' + p.s + ')?'; },
    function (p) { return 'Let\'s cheer for ___ (' + p.s + ')!'; },
    function (p) { return 'Please listen to ___ (' + p.s + ').'; },
    function (p) { return 'I often play football with ___ (' + p.s + ').'; },
    function (p) { return 'Look at ___ (' + p.s + ')!'; }
  ];

  function gen() {
    /* you 的宾格还是 you，放在宾格题里等于白送，所以宾格只用其余五个 */
    const objPool = LEX.pronouns.filter(function (p) { return p.badO.length > 0; });
    const p = U.pick(LEX.pronouns);

    const kind = U.rand(4);

    /* ---------- ① 物主代词：填空 ---------- */
    if (kind === 0) {
      const stmt = '用所给词的适当形式填空：\n' + U.pick(POSS_FRAMES)(p);
      return Q.I(stmt, p.poss,
        '“' + p.s + '” 的形容词性物主代词是 ' + p.poss + '，后面要跟名词。', 1);
    }

    /* ---------- ② 物主代词：选择 ---------- */
    if (kind === 1) {
      const stmt = U.pick(POSS_FRAMES)(p);
      return Q.choice(stmt, p.poss, p.badP,
        '“' + p.s + '” 的形容词性物主代词是 ' + p.poss + '，后面要跟名词。');
    }

    /* ---------- ③ 宾格：填空 ---------- */
    if (kind === 2) {
      const q = U.pick(objPool);
      const stmt = '用所给词的适当形式填空：\n' + U.pick(OBJ_FRAMES)(q);
      return Q.I(stmt, q.obj,
        '动词或介词后面要用宾格，“' + q.s + '” 的宾格是 ' + q.obj + '。', 1);
    }

    /* ---------- ④ 宾格：选择 ---------- */
    const q = U.pick(objPool);
    const stmt = U.pick(OBJ_FRAMES)(q);
    return Q.choice(stmt, q.obj, q.badO,
      '动词或介词后面要用宾格，“' + q.s + '” 的宾格是 ' + q.obj + '。');
  }

  SM.register({
    id: 'pron',
    name: '代词',
    sub: 'my / me, their / them',
    ico: '👤',
    c1: '#FF9FB2', c2: '#F2708A', cd: '#C64460',
    L: [
      { h: '同一个意思，三种形式', b: '「我」可以是 I（做主语）、my（后面跟名词）、me（做宾语）。位置不同，形式就不同。',
        e: [['I like it.', '主格，放在句首做主语'], ['This is my book.', '物主代词，后面跟名词'], ['Can you help me?', '宾格，放在动词后面']] },
      { h: '形容词性物主代词', b: '表示「谁的」，后面必须跟一个名词。',
        e: [['my book', '我的书'], ['your pen', '你的钢笔'], ['his bag', '他的书包'], ['her name', '她的名字']] },
      { h: '复数也要记', b: 'our（我们的）、your（你们的）、their（他们的）。their 和 there 同音，最容易写错。',
        e: [['their English', '他们的英语'], ['There are two books.', 'there 是「那里」，不是「他们的」']] },
      { h: '宾格', b: '动词后面、介词后面都用宾格。',
        e: [['me / you / him / her / it', 'us / you / them'], ['Let\'s cheer for them!', 'for 后面用宾格 them']] },
      { h: '最容易错的地方', b: '介词后面写成主格。for they、with he 都是错的。',
        e: [['Let\'s cheer for them!', '✔ 不是 for they'], ['Please listen to me.', '✔ 不是 listen to I']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
