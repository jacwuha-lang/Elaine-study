/* ============================================================
   modules/there.js — There be 句型
   四件事：
     ① 后面是单数还是复数，决定用 is 还是 are
     ② 否定句：There isn't / There aren't（some → any）
     ③ 疑问句：Is there…? / Are there…?
     ④ 就近原则：be 动词跟离它最近的那个名词走
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, Q = SM.quiz;

  /* 地点一律用「在那边」——
     写「在桌子上」会跟动物园、公交车打架。 */
  const THERE = ' over there';

  /* 就近原则用。名词搭配固定，不随机拼 —— 免得出来
     「There is an apple and two dogs in our school.」 */
  const NEAR = [
    { one: 'a book',    many: 'two pens',        where: 'on the desk' },
    { one: 'a cat',     many: 'two dogs',        where: 'under the tree' },
    { one: 'a library', many: 'two classrooms',  where: 'in our school' },
    { one: 'an apple',  many: 'three oranges',   where: 'in the box' }
  ];

  /* 「在那边」的句式只能用看得见的东西。
     story / party / class 这类抽象词放进来就不通了。 */
  function plainNouns() {
    return LEX.nouns.filter(function (n) { return !n.nf && !n.ab; });
  }

  function gen() {
    const kind = U.rand(4);
    const n = U.pick(plainNouns());

    /* ---------- ① 选 is / are ---------- */
    if (kind === 0) {
      const one = U.rand(2) === 0;
      const np = one
        ? n.art + ' ' + n.w
        : U.pick(['some', 'two', 'three', 'many']) + ' ' + n.pl;
      const right = one ? 'is' : 'are';
      /* 干扰项里放 have / has —— 「There have a library」是中文「有」直译，
         小学生真会这么写，比放 be 更值得当干扰项。 */
      const wrongs = [one ? 'are' : 'is', 'have', 'has'];
      const tip = one
        ? '“' + np + '” 是单数，用 There is。'
        : '“' + np + '” 是复数，用 There are。';
      return Q.choice('There ___ ' + np + THERE + '.', right, wrongs, tip);
    }

    /* ---------- ② 否定句 ---------- */
    if (kind === 1) {
      const one = U.rand(2) === 0;
      if (one) {
        const stmt = 'There is ' + n.art + ' ' + n.w + THERE + '.';
        const tip = 'There be 的否定：在 be 后面加 not。也可以把 a 换成 no。';
        return pickForm(stmt, [
          'There is not ' + n.art + ' ' + n.w + THERE + '.',
          'There is no ' + n.w + THERE + '.'
        ], tip, '否定句');
      }
      /* 只拿 some 来变否定。「There are two windows.」的正确否定是
         「There are not two windows.」，不是「not any windows」——
         把 two 换成 any 意思就变了，等于给了个错答案。 */
      const stmt = 'There are some ' + n.pl + THERE + '.';
      const tip = 'There be 的否定：be 后面加 not，同时 some 要变成 any。也可以直接用 no。';
      return pickForm(stmt, [
        'There are not any ' + n.pl + THERE + '.',
        'There are no ' + n.pl + THERE + '.'
      ], tip, '否定句');
    }

    /* ---------- ③ 疑问句 ---------- */
    if (kind === 2) {
      const one = U.rand(2) === 0;
      /* 疑问句不用 some —— 「Are there some books?」在期待肯定回答时
         也说得通，答案就不唯一了。改成 two / three / many。 */
      const np = one
        ? n.art + ' ' + n.w
        : U.pick(['two', 'three', 'many']) + ' ' + n.pl;
      const stmt = 'There ' + (one ? 'is ' : 'are ') + np + THERE + '.';
      const ans = (one ? 'Is' : 'Are') + ' there ' + np + THERE + '?';
      const tip = '把 be 动词提到 there 前面，其余不变。';
      return pickForm(stmt, [ans], tip, '一般疑问句');
    }

    /* ---------- ④ 就近原则 ---------- */
    const s = U.pick(NEAR);
    const oneFirst = U.rand(2) === 0;
    const np = oneFirst ? s.one + ' and ' + s.many : s.many + ' and ' + s.one;
    const right = oneFirst ? 'is' : 'are';
    const tip = 'There be 有就近原则：be 动词跟离它最近的那个名词走。'
      + '最近的是 ' + (oneFirst ? s.one : s.many) + '，所以用 ' + right + '。';
    return Q.choice('There ___ ' + np + ' ' + s.where + '.', right,
      [oneFirst ? 'are' : 'is', 'have', 'has'], tip);
  }

  function pickForm(stmt, answers, tip, label) {
    const prompt = '改成' + label + '：\n' + stmt;
    const k = U.rand(3);
    if (k === 0) return Q.fromBank(prompt, answers[0], tip);
    return Q.I(prompt, answers, tip);
  }

  SM.register({
    id: 'there',
    name: 'There be',
    sub: 'There is / There are',
    ico: '📍',
    c1: '#7FC8F8', c2: '#4FA8E8', cd: '#2B7CB8',
    L: [
      { h: 'There be 表示「有」', b: '某地有某物，用 There is / There are。不能说 There have。',
        e: [['There is a library in our school.', '我们学校有一座图书馆'], ['There are many books on the desk.', '桌上有很多书']] },
      { h: 'is 还是 are？', b: '后面是单数（a book / an apple）用 is；是复数（two books / many books）用 are。',
        e: [['There is a cat under the tree.', ''], ['There are two cats under the tree.', '']] },
      { h: '否定句：be 后面加 not', b: 'There isn\'t / There aren\'t。也可以把 a 换成 no。',
        e: [['There isn\'t a park near my home.', ''], ['There are no books on the desk.', '']] },
      { h: '疑问句：be 提到 there 前面', b: 'Is there…? / Are there…? 回答用 Yes, there is. / No, there aren\'t.',
        e: [['— Is there a library? — Yes, there is.', ''], ['— Are there any books? — No, there aren\'t.', '']] },
      { h: '否定和疑问里 some 变 any', b: 'There are some books. → Are there any books?',
        e: [['There aren\'t any books on the desk.', '']] },
      { h: '就近原则', b: 'be 动词后面跟了好几个名词时，只看离它最近的那一个。',
        e: [['There is a book and two pens on the desk.', '最近的是 a book，用 is'], ['There are two pens and a book on the desk.', '最近的是 two pens，用 are']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
