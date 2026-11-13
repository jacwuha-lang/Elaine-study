/* ============================================================
   modules/prep.js — 介词搭配
   good at / help sb. with / share with / cheer for / be made of
   listen to / look at / wait for
   by + 交通工具 / on foot / go on a trip / out of power
   —— 外加「on the second floor」里的序数词

   这些搭配没有道理可讲，只能一个个记。孩子最容易错的地方是
   把 with 写成 to、把 at 写成 in，所以干扰项全在这几个小词里打转。
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, Q = SM.quiz;

  /* 每个条目：
       kind  'p' 介词 / 'o' 序数词
       stem  题干（___ 是空，( ) 里给原形）
       right 正确答案
       wrongs 干扰项
       tip   讲解 */
  const BANK = [

    /* ---------- be good at ---------- */
    function () {
      const sub = U.pick(['Lily', 'Amy', 'Tom', 'My sister', 'My brother', 'He', 'She']);
      const act = U.pick(['drawing', 'swimming', 'singing', 'dancing', 'cooking', 'playing football']);
      return {
        kind: 'p',
        stem: sub + ' is good ___ ' + act + '.',
        right: 'at',
        wrongs: ['for', 'in', 'with'],
        tip: 'be good at 是固定搭配，表示「擅长」。at 不能换成 in 或 for。'
      };
    },

    /* ---------- help sb. with sth. ---------- */
    function () {
      const a = U.pick([
        { q: 'Can you help me ___ my English?',       r: 'with' },
        { q: 'She often helps me ___ my homework.',   r: 'with' },
        { q: 'Let me help you ___ your bag.',         r: 'with' },
        { q: 'He helps his mother ___ the housework.', r: 'with' }
      ]);
      return {
        kind: 'p',
        stem: a.q,
        right: a.r,
        wrongs: ['for', 'at', 'of'],
        tip: 'help sb. with sth. 是「在某件事上帮某人」。'
      };
    },

    /* ---------- share sth. with sb. ---------- */
    function () {
      const thing = U.pick(['books', 'toys', 'pictures', 'apples', 'umbrellas']);
      /* 不放 them —— 「share their books with them」指代不明，读着像病句 */
      const who = U.pick(['each other', 'her classmates', 'his friends', 'their friends']);
      return {
        kind: 'p',
        stem: 'They often share their ' + thing + ' ___ ' + who + '.',
        right: 'with',
        wrongs: ['to', 'for', 'at'],
        tip: 'share A with B 是「和 B 分享 A」，介词用 with。'
      };
    },

    /* ---------- cheer for sb. ---------- */
    function () {
      const a = U.pick([
        { q: 'We will cheer ___ him.',        r: 'for' },
        { q: 'Let\'s cheer ___ them!',        r: 'for' },
        { q: 'Don\'t be afraid. We\'ll cheer ___ you.', r: 'for' },
        { q: 'The students cheer ___ their team.', r: 'for' }
      ]);
      return {
        kind: 'p',
        stem: a.q,
        right: a.r,
        wrongs: ['to', 'at', 'with'],
        tip: 'cheer for sb. 是「为某人加油」，介词用 for。'
      };
    },

    /* ---------- be made of ---------- */
    function () {
      const a = U.pick([
        { q: 'The desks are made ___ wood.',        r: 'of' },
        { q: 'The kite is made ___ paper.',         r: 'of' },
        { q: 'These chairs are made ___ bamboo.',   r: 'of' },
        { q: 'The box is made ___ paper.',          r: 'of' }
      ]);
      return {
        kind: 'p',
        stem: a.q,
        right: a.r,
        wrongs: ['from', 'in', 'with'],
        tip: 'be made of 表示「由……做成」，看得出原材料。看不出原材料的才用 be made from。'
      };
    },

    /* ---------- listen to / look at / wait for ---------- */
    function () {
      const a = U.pick([
        { q: 'Please listen ___ me.',                   r: 'to',  w: ['at', 'for', 'with'] },
        { q: 'Look ___ the blackboard, please.',        r: 'at',  w: ['to', 'in', 'for'] },
        { q: 'Let\'s wait ___ the bus here.',           r: 'for', w: ['at', 'to', 'with'] },
        { q: 'Please look ___ the picture.',            r: 'at',  w: ['to', 'for', 'in'] },
        { q: 'We are waiting ___ our teacher.',         r: 'for', w: ['at', 'to', 'of'] }
      ]);
      return {
        kind: 'p',
        stem: a.q,
        right: a.r,
        wrongs: a.w,
        tip: 'listen 后面要跟 to，look 后面要跟 at，wait 后面要跟 for —— 这三个都是固定搭配。'
      };
    },

    /* ---------- 交通方式：by + 交通工具 ----------
       卷子第 9 题：People in Venice go around the city ___ boat.
       孩子最容易把 by 写成 on —— 中文说「坐船」，英语是 by boat。 */
    function () {
      const a = U.pick([
        { q: 'People in Venice go around the city ___ boat.', r: 'by', w: ['at', 'on', 'with'] },
        { q: 'I go to school ___ bus every day.',              r: 'by', w: ['at', 'on', 'in'] },
        { q: 'We went to Beijing ___ train last week.',        r: 'by', w: ['on', 'at', 'in'] },
        { q: 'My father goes to work ___ car.',                r: 'by', w: ['on', 'at', 'with'] },
        { q: 'They go to the park ___ bike.',                  r: 'by', w: ['on', 'at', 'of'] },
        { q: 'You can get there ___ plane.',                   r: 'by', w: ['on', 'at', 'in'] }
      ]);
      return {
        kind: 'p',
        stem: a.q,
        right: a.r,
        wrongs: a.w,
        tip: 'by + 交通工具，表示「乘 / 坐某种交通工具」，中间不加 the 或 a：'
           + 'by bus / by boat / by train。'
      };
    },

    /* ---------- on foot：走路是唯一的例外 ----------
       所有交通方式都用 by，只有「走路」是 on foot —— 这个例外必须单独记。 */
    function () {
      const a = U.pick([
        { q: 'I go to school ___ foot every morning.', r: 'on', w: ['by', 'at', 'with'] },
        { q: 'My grandpa goes to the park ___ foot.',  r: 'on', w: ['by', 'in', 'at'] },
        { q: 'Let\'s go there ___ foot. It is near.',  r: 'on', w: ['by', 'at', 'of'] }
      ]);
      return {
        kind: 'p',
        stem: a.q,
        right: a.r,
        wrongs: a.w,
        tip: '走路是 on foot，不是 by foot —— 这一条是交通方式里唯一的例外。'
      };
    },

    /* ---------- go on a trip / go on a picnic ----------
       卷子第 8 题：Let's ___ a boat trip on the river.（go / go on / go to）
       考的是 go 后面要不要那个 on —— 去掉 on 句子就不成立。 */
    function () {
      const a = U.pick([
        { q: 'Let\'s ___ a boat trip on the river.',   r: 'go on', w: ['go', 'go to', 'going'] },
        { q: 'We will ___ a trip to the zoo.',         r: 'go on', w: ['go', 'go to', 'going'] },
        { q: 'Shall we ___ a picnic this Sunday?',     r: 'go on', w: ['go', 'go to', 'going'] },
        { q: 'They ___ a trip to Hangzhou last week.', r: 'went on', w: ['went', 'went to', 'go on'] }
      ]);
      return {
        kind: 'p',
        stem: a.q,
        right: a.r,
        wrongs: a.w,
        tip: 'go on a trip 是「去旅行」，go on a picnic 是「去野餐」—— on 不能省。'
           + 'Let\'s / shall we 后面跟动词原形。'
      };
    },

    /* ---------- out of power：没电了 ----------
       卷子第 10 题：My camera is ___. I can't take photos with it.
       选项就是 out of / out power / power out —— 考短语的完整写法。 */
    function () {
      const a = U.pick([
        { q: 'My camera is ___. I can\'t take photos with it.', r: 'out of power', w: ['out power', 'power out', 'out of powers'] },
        { q: 'The toy car is ___. It can\'t run.',               r: 'out of power', w: ['out power', 'power out', 'out of powers'] },
        { q: 'My phone is ___. Can I use your charger?',        r: 'out of power', w: ['out power', 'power out', 'out of powers'] }
      ]);
      return {
        kind: 'p',
        stem: a.q,
        right: a.r,
        wrongs: a.w,
        tip: 'out of power 是「没电了」，out of 不能拆开写，也不能说成 out power。'
      };
    },

    /* ---------- 序数词 + 楼层 ---------- */
    function () {
      /* plain 表示「直接加 th 就对」的那些（fourth / sixth / seventh / tenth）。
         这类词凑不出第三个像样的干扰项 —— 硬塞一个不存在的词，
         孩子一眼排除，等于三选一。所以只出填空题。 */
      const ORD = [
        { w: 'one',   o: 'first' },
        { w: 'two',   o: 'second' },
        { w: 'three', o: 'third' },
        { w: 'four',  o: 'fourth',  plain: 1 },
        { w: 'five',  o: 'fifth' },
        { w: 'six',   o: 'sixth',   plain: 1 },
        { w: 'seven', o: 'seventh', plain: 1 },
        { w: 'eight', o: 'eighth' },
        { w: 'nine',  o: 'ninth' },
        { w: 'ten',   o: 'tenth',   plain: 1 }
      ];
      const place = U.pick([
        'The computer room', 'The library', 'The art room',
        'My classroom', 'The music room', 'The reading room'
      ]);
      const n = U.pick(ORD);
      /* 干扰项：原形 + 一律加 th。「twoth」「threeth」正是孩子会写出来的东西。 */
      return {
        kind: 'o',
        plain: n.plain,
        stem: place + ' is on the ___ (' + n.w + ') floor.',
        right: n.o,
        wrongs: [n.w, n.w + 'th'],
        tip: '「第几层」要用序数词，不是 one / two 这样的基数词。'
           + n.w + ' 的序数词是 ' + n.o + '。'
      };
    }
  ];

  function gen() {
    const b = U.pick(BANK)();

    /* plain 的序数词凑不出四个选项，直接出填空 */
    if (!b.plain && U.rand(2) === 0) {
      return Q.choice(b.stem, b.right, b.wrongs, b.tip);
    }
    const prompt = (b.kind === 'o' ? '用所给词的适当形式填空：' : '用适当的介词填空：')
      + '\n' + b.stem;
    return Q.I(prompt, b.right, b.tip, 1);
  }

  SM.register({
    id: 'prep',
    name: '介词搭配',
    sub: 'at / with / for / of',
    ico: '🧩',
    c1: '#FFD166', c2: '#F5B41F', cd: '#C28800',
    L: [
      { h: '为什么介词这么难？', b: '因为介词没有道理可讲，只能一个词一个词地记。记住「谁跟谁搭」，比记住介词的意思有用得多。',
        e: [['be good at', '擅长'], ['help sb. with', '帮某人做某事']] },
      { h: 'be good at', b: '「擅长做某事」。at 后面跟名词或者动词的 ing 形式。',
        e: [['Lily is good at drawing.', '莉莉擅长画画。']] },
      { h: 'help sb. with sth.', b: '「在某件事上帮某人」。with 不能换成 for。',
        e: [['Can you help me with my English?', '你能帮我学英语吗？']] },
      { h: 'share sth. with sb.', b: '「和某人分享某物」。',
        e: [['They share their books with each other.', '他们互相分享书。']] },
      { h: 'cheer for sb.', b: '「为某人加油」。',
        e: [['We\'ll cheer for him.', '我们会为他加油。']] },
      { h: 'be made of', b: '「由……做成」，看得出原材料用 of，看不出用 from。',
        e: [['The desks are made of wood.', '桌子是木头做的。'], ['Paper is made from wood.', '纸是木头做的（看不出木头了）。']] },
      { h: 'listen to / look at / wait for', b: '这三个动词后面必须带介词，不能单独用。',
        e: [['Listen to me.', '听我说。'], ['Look at the blackboard.', '看黑板。'], ['Wait for the bus.', '等公交车。']] },
      { h: '第几层要用序数词', b: '「在二楼」是 on the second floor，不是 on the two floor。',
        e: [['on the first floor', '在一楼'], ['on the third floor', '在三楼']] },
      { h: '交通方式：by + 工具', b: '坐什么去都用 by，中间不加 the 或 a。唯独「走路」是 on foot。',
        e: [['by bus / by boat / by train', '坐公交 / 坐船 / 坐火车'], ['on foot', '走路（唯一的例外）']] },
      { h: 'go on a trip', b: '「去旅行」是 go on a trip，「去野餐」是 go on a picnic —— 那个 on 不能省。',
        e: [['Let\'s go on a boat trip.', '我们去坐船旅行吧。'], ['不是 Let\'s go a boat trip.', '✘']] },
      { h: 'out of power', b: '「没电了」是 out of power，out of 不能拆开，也不能写成 out power。',
        e: [['My camera is out of power.', '我的相机没电了。'], ['The toy car is out of power.', '玩具车没电了。']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
