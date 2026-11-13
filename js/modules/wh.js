/* ============================================================
   modules/wh.js — 特殊疑问词 + 对划线部分提问
   ------------------------------------------------------------
   ① 原有：10 组疑问词 × 3~5 个问答对，选疑问词 / 填疑问词
   ② 新增：给一个陈述句，把其中一部分划线，改写成特殊疑问句
      —— 卷子第 V 大题就是这种，它比「选疑问词」难一层：
         选对疑问词只是第一步，还得把 be 或 do/does 提到主语前面，
         原来加了 s 的动词还要还原。

   划线部分用 【】 括起来。题干里写清楚「划线部分是哪一段」，
   孩子不用去猜哪几个词被画了线。
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, Q = SM.quiz;

  /* 干扰项优先用「基础疑问词」这六个 —— 它们才是孩子真会混的。
     What color / How old / How many / How much 是专用搭配，
     拿来给「___ do you get up?」当选项，孩子一眼就排除，等于白送三个。 */
  const BASIC = ['When', 'Where', 'Who', 'What', 'Whose', 'How'];

  /* 句中的主语，但用在**问句**里：My sister → your sister、You → you、That → that，
     Tom 这类专有名词保持大写，I 在英语里永远大写。
     关键规则：陈述句里说 my（我方），提问时是问**对方**，要说 your ——
     «My cousin is nine.» 问的是 «How old is your cousin?»，
     写成 my cousin 就错了（yesno 模块早就这么转，这里保持同一口径）。
     We 同理 → you。
     按「首词」判断 —— 只对整个串做精确匹配的话，
     This postcard 这种两词主语会被漏掉，问句里就冒出 «Where is This postcard from?»。 */
  const PRON_LOWER = {
    You: 'you', He: 'he', She: 'she', We: 'you', They: 'they',
    This: 'this', That: 'that', These: 'these', Those: 'those',
    My: 'your', Our: 'your'
  };
  const ART_LOWER = /^(The|His|Her|Their|Its)$/;
  function mid(s) {
    const w = String(s || '').split(' ');
    if (!w[0]) return s;
    if (PRON_LOWER[w[0]]) { w[0] = PRON_LOWER[w[0]]; return w.join(' '); }
    if (ART_LOWER.test(w[0])) { w[0] = w[0].toLowerCase(); return w.join(' '); }
    return s;
  }

  /* ---------------- 九类划线提问 ----------------
     每一类自己拼「陈述句 / 正确问句 / 三个错误问句」。
     错的有三种，都是孩子真会写出来的：
       a. 疑问词对了但没倒装      Where the pandas are from?
       b. 疑问词选错              When are the pandas from?
       c. be 或 do/does 用错       Where do the pandas come from? / Where is the pandas from?
     ------------------------------------------------------------ */

  /* ① be from —— 问来自哪里（卷子：The pandas are from Sichuan.）
     主语 × 地名自由组合：人物配国家城市、物品配商店，空间一下翻十几倍。
     （不自由组合的话全模块只有一百来道不重复的题，攻城里老撞原题。） */
  function askFrom() {
    const person = U.pick([
      { s: 'The pandas', be: 'are' }, { s: 'My friend', be: 'is' },
      { s: 'These students', be: 'are' }, { s: 'The little girl', be: 'is' },
      { s: 'Our new teacher', be: 'is' }, { s: 'My uncle', be: 'is' },
      { s: 'Those girls', be: 'are' }, { s: 'The little boy', be: 'is' },
      { s: 'Tom', be: 'is' }, { s: 'Amy', be: 'is' },
      { s: 'My parents', be: 'are' }, { s: 'Grandpa', be: 'is' },
      { s: 'The foreigners', be: 'are' }
    ]);
    const a = U.rand(4) === 0
      ? (function () {
          const t = U.pick([{ s: 'The toys', be: 'are' }, { s: 'This postcard', be: 'is' },
            { s: 'My new pen', be: 'is' }, { s: 'These books', be: 'are' },
            { s: 'That photo', be: 'is' }, { s: 'The pictures', be: 'are' }]);
          return { s: t.s, be: t.be,
            p: U.pick(['that shop', 'the school library', 'that small shop', 'the supermarket', 'the bookshop']) };
        })()
      : { s: person.s, be: person.be,
          p: U.pick(['Sichuan', 'China', 'Canada', 'the UK', 'Japan', 'Australia',
            'America', 'Beijing', 'Shanghai', 'England', 'Yunnan', 'the US']) };
    const stmt = a.s + ' ' + a.be + ' from 【' + a.p + '】.';
    const ask = 'Where ' + a.be + ' ' + mid(a.s) + ' from?';
    const wrongs = [
      'Where ' + (a.be === 'is' ? 'are' : 'is') + ' ' + mid(a.s) + ' from?',   /* be 跟主语不搭 */
      'Where ' + mid(a.s) + ' ' + a.be + ' from?',                              /* 没倒装 */
      'When ' + a.be + ' ' + mid(a.s) + ' from?'                                /* 疑问词错 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '问「来自哪里」用 Where；be 动词提到主语前面 —— ' + ask };
  }

  /* ② 实义动词 + 地点 —— 问在哪里做（卷子：plays football in the park） */
  function askWhereDo() {
    const a = U.pick([
      { s: 'Tom', v: 'plays football', aux: 'does', base: 'play football', p: 'in the park' },
      { s: 'Amy', v: 'reads books', aux: 'does', base: 'read books', p: 'in her room' },
      { s: 'My parents', v: 'watch TV', aux: 'do', base: 'watch TV', p: 'in the living room' },
      { s: 'The boys', v: 'swim', aux: 'do', base: 'swim', p: 'in the river' },
      { s: 'Lily', v: 'does her homework', aux: 'does', base: 'do her homework', p: 'at home' },
      { s: 'Jack', v: 'plays the piano', aux: 'does', base: 'play the piano', p: 'in the music room' },
      { s: 'My sister', v: 'cooks dinner', aux: 'does', base: 'cook dinner', p: 'in the kitchen' },
      { s: 'The students', v: 'read books', aux: 'do', base: 'read books', p: 'in the library' },
      { s: 'Grandpa', v: 'reads books', aux: 'does', base: 'read books', p: 'in the garden' },
      { s: 'My friends', v: 'play basketball', aux: 'do', base: 'play basketball', p: 'on the playground' },
      { s: 'Lily', v: 'draws pictures', aux: 'does', base: 'draw pictures', p: 'in the art room' },
      { s: 'My mother', v: 'cooks dinner', aux: 'does', base: 'cook dinner', p: 'in the kitchen' },
      { s: 'The girls', v: 'sing songs', aux: 'do', base: 'sing songs', p: 'in the music room' }
    ]);
    const stmt = a.s + ' ' + a.v + ' 【' + a.p + '】.';
    const ask = 'Where ' + a.aux + ' ' + mid(a.s) + ' ' + a.base + '?';
    const wrongs = [
      'Where ' + (a.aux === 'does' ? 'do' : 'does') + ' ' + mid(a.s) + ' ' + a.base + '?',  /* 助动词错 */
      'Where ' + mid(a.s) + ' ' + a.v + '?',                                                /* 没倒装、动词没还原 */
      'When ' + a.aux + ' ' + mid(a.s) + ' ' + a.base + '?'                                 /* 疑问词错 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '问地点用 Where；主语是 ' + a.s + '，助动词用 ' + a.aux
        + '，后面的动词要还原成 ' + a.base.split(' ')[0] + '。' };
  }

  /* ③ 实义动词 + 时间 —— 问什么时候 */
  function askWhen() {
    const a = U.pick([
      { s: 'My sister', v: 'gets up', aux: 'does', base: 'get up', t: 'at six' },
      { s: 'Tom', v: 'goes to school', aux: 'does', base: 'go to school', t: 'at seven thirty' },
      { s: 'My parents', v: 'go to work', aux: 'do', base: 'go to work', t: 'at eight' },
      { s: 'Amy', v: 'does her homework', aux: 'does', base: 'do her homework', t: 'after dinner' },
      { s: 'The students', v: 'have lunch', aux: 'do', base: 'have lunch', t: 'at twelve' },
      { s: 'Grandpa', v: 'reads books', aux: 'does', base: 'read books', t: 'every morning' },
      { s: 'Lily', v: 'plays the violin', aux: 'does', base: 'play the violin', t: 'on Sundays' },
      { s: 'Jack', v: 'goes to bed', aux: 'does', base: 'go to bed', t: 'at nine' },
      { s: 'The students', v: 'have lunch', aux: 'do', base: 'have lunch', t: 'at twelve' },
      { s: 'My mother', v: 'cooks dinner', aux: 'does', base: 'cook dinner', t: 'at six thirty' }
    ]);
    const stmt = a.s + ' ' + a.v + ' 【' + a.t + '】.';
    const ask = 'When ' + a.aux + ' ' + mid(a.s) + ' ' + a.base + '?';
    const wrongs = [
      'Where ' + a.aux + ' ' + mid(a.s) + ' ' + a.base + '?',                              /* 疑问词错 */
      'When ' + mid(a.s) + ' ' + a.v + '?',                                                 /* 没倒装 */
      'When ' + (a.aux === 'does' ? 'do' : 'does') + ' ' + mid(a.s) + ' ' + a.base + '?'    /* 助动词错 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '问时间用 When；把 ' + a.aux + ' 提到主语前面，动词还原成 '
        + a.base.split(' ')[0] + '。' };
  }

  /* ④ 交通方式 —— 问怎么去（卷子：go around the city by boat） */
  function askHow() {
    const a = U.pick([
      { s: 'Tom', v: 'goes to school', aux: 'does', base: 'go to school', w: 'by bus' },
      { s: 'Amy', v: 'goes to the park', aux: 'does', base: 'go to the park', w: 'by bike' },
      { s: 'My father', v: 'goes to work', aux: 'does', base: 'go to work', w: 'by car' },
      { s: 'The students', v: 'go to the museum', aux: 'do', base: 'go to the museum', w: 'by underground' },
      { s: 'They', v: 'go around the city', aux: 'do', base: 'go around the city', w: 'by boat' },
      { s: 'My brother', v: 'goes to school', aux: 'does', base: 'go to school', w: 'on foot' },
      { s: 'Lily', v: 'goes to the library', aux: 'does', base: 'go to the library', w: 'by bus' },
      { s: 'My uncle', v: 'goes to Shanghai', aux: 'does', base: 'go to Shanghai', w: 'by plane' },
      { s: 'The children', v: 'go to the zoo', aux: 'do', base: 'go to the zoo', w: 'by underground' },
      { s: 'We', v: 'go to the museum', aux: 'do', base: 'go to the museum', w: 'by bus' }
    ]);
    const stmt = a.s + ' ' + a.v + ' 【' + a.w + '】.';
    const ask = 'How ' + a.aux + ' ' + mid(a.s) + ' ' + a.base + '?';
    const wrongs = [
      'What ' + a.aux + ' ' + mid(a.s) + ' ' + a.base + '?',                               /* 疑问词错 */
      'How ' + mid(a.s) + ' ' + a.v + '?',                                                  /* 没倒装 */
      'How ' + (a.aux === 'does' ? 'do' : 'does') + ' ' + mid(a.s) + ' ' + a.base + '?'     /* 助动词错 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '问「用什么方式」用 How；' + a.w + ' 是方式状语，提问时整个去掉。' };
  }

  /* ⑤ 名词所有格 —— 问谁的（卷子：That is Peter's birthday invitation.）
     主人 × 物品 × 指示词组合；单数物品配 this/that、复数配 these/those。 */
  function askWhose() {
    const who = U.pick(['Peter', 'Amy', 'Tom', 'Jack', 'Mr Green', 'the twins',
      'Miss Li', 'my sister', 'my brother', 'the students', 'my cousin', 'Lucy']);
    const plural = U.pick(['books', 'toys', 'pens', 'kites', 'shoes', 'crayons']);
    const a = U.rand(2) === 0
      ? { thing: plural, demo: U.pick(['These', 'Those']), be: 'are' }
      : { thing: U.pick(['bag', 'umbrella', 'football', 'dress', 'bike', 'ruler',
          'pencil case', 'water bottle', 'camera', 'storybook']),
          demo: U.pick(['This', 'That']), be: 'is' };
    /* Peter's / the twins' —— 以 s 结尾的复数只加撇号 */
    const poss = /s$/.test(who) ? who + "'" : who + "'s";
    const stmt = a.demo + ' ' + a.be + ' 【' + poss + '】 ' + a.thing + '.';
    const ask = 'Whose ' + a.thing + ' ' + a.be + ' ' + mid(a.demo) + '?';
    const wrongs = [
      'Who ' + a.be + ' ' + mid(a.demo) + ' ' + a.thing + '?',        /* Who 和 Whose 混 */
      'Whose ' + a.thing + ' ' + mid(a.demo) + ' ' + a.be + '?',      /* 没倒装 */
      'Whose ' + a.be + ' ' + mid(a.demo) + '?',                      /* 丢了名词 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '问「谁的」用 Whose，后面直接跟名词：Whose ' + a.thing + '。'
        + '再把 be 提到主语前面。' };
  }

  /* ⑥ 数量 —— 问多少（How many + 复数名词）
     主语 × 物品 × 数字组合，数字单独从 two 到 fifteen 里抽。 */
  function askHowMany() {
    const s = U.pick([
      { s: 'Tom', has: 'has', aux: 'does' }, { s: 'Amy', has: 'has', aux: 'does' },
      { s: 'My brother', has: 'has', aux: 'does' }, { s: 'The students', has: 'have', aux: 'do' },
      { s: 'Lily', has: 'has', aux: 'does' }, { s: 'Jack', has: 'has', aux: 'does' },
      { s: 'My sister', has: 'has', aux: 'does' }, { s: 'They', has: 'have', aux: 'do' },
      { s: 'Miss Li', has: 'has', aux: 'does' }, { s: 'My friends', has: 'have', aux: 'do' },
      { s: 'The children', has: 'have', aux: 'do' }, { s: 'We', has: 'have', aux: 'do' }
    ]);
    const thing = U.pick(['books', 'pens', 'kites', 'dolls', 'stamps', 'storybooks',
      'apples', 'pears', 'crayons', 'rulers', 'toy cars', 'model planes']);
    const n = U.pick(['two', 'three', 'four', 'five', 'six', 'seven', 'eight',
      'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen']);
    const stmt = s.s + ' ' + s.has + ' 【' + n + '】 ' + thing + '.';
    const ask = 'How many ' + thing + ' ' + s.aux + ' ' + mid(s.s) + ' have?';
    const wrongs = [
      'How much ' + thing + ' ' + s.aux + ' ' + mid(s.s) + ' have?',   /* much/many 混 */
      'How many ' + thing + ' ' + mid(s.s) + ' ' + s.has + '?',        /* 没倒装，has 没还原 */
      'How many ' + s.aux + ' ' + mid(s.s) + ' have?'                  /* 丢了名词 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '问可数名词的数量用 How many + 复数名词；'
        + 'has 提问要还原成 have，前面用 ' + s.aux + '。' };
  }

  /* ⑦ 划主语 —— 问谁（Who）
     只用单数主语。复数主语会生成 «Who are cleaning…?»，
     可教材里写的是 «Who is cleaning…?»（Who 默认当单数）——
     两种都算对，但一道题给两个正确答案就是坏题，干脆避开。 */
  function askWho() {
    const a = U.pick([
      { who: 'Tom', rest: 'is playing football', be: 'is' },
      { who: 'Amy', rest: 'is reading a book', be: 'is' },
      { who: 'My father', rest: 'is washing the car', be: 'is' },
      { who: 'Lily', rest: 'is drawing a picture', be: 'is' },
      { who: 'My teacher', rest: 'is writing on the blackboard', be: 'is' },
      { who: 'Grandpa', rest: 'is reading the newspaper', be: 'is' },
      { who: 'Jack', rest: 'is flying a kite in the park', be: 'is' },
      { who: 'My mother', rest: 'is cooking dinner', be: 'is' }
    ]);
    const stmt = '【' + a.who + '】 ' + a.rest + '.';
    /* 划掉主语后，剩下的部分直接跟在 Who 后面，不用倒装 */
    const ask = 'Who ' + a.be + ' ' + a.rest.replace(/^is |^are /, '') + '?';
    const wrongs = [
      'Whose ' + a.be + ' ' + a.rest.replace(/^is |^are /, '') + '?',        /* Whose 混 */
      'Who ' + a.rest.replace(/^is |^are /, '') + '?',                       /* 丢了 be */
      'What ' + a.be + ' ' + a.rest.replace(/^is |^are /, '') + '?'          /* What 混 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '划线的是「谁」，用 Who；Who 自己就是主语，后面不用再倒装。' };
  }

  /* ⑧ 年龄 —— 问几岁（主语 × 年龄组合） */
  function askHowOld() {
    const a = U.pick([
      { s: 'Amy', be: 'is' }, { s: 'Tom', be: 'is' }, { s: 'My sister', be: 'is' },
      { s: 'The twins', be: 'are' }, { s: 'Jack', be: 'is' }, { s: 'My brother', be: 'is' },
      { s: 'Lily', be: 'is' }, { s: 'My cousin', be: 'is' }, { s: 'My friend', be: 'is' },
      { s: 'The little girl', be: 'is' }, { s: 'The new students', be: 'are' }
    ]);
    a.n = U.pick(['six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen']);
    const stmt = a.s + ' ' + a.be + ' 【' + a.n + '】.';
    const ask = 'How old ' + a.be + ' ' + mid(a.s) + '?';
    const wrongs = [
      'How ' + a.be + ' ' + mid(a.s) + '?',                       /* How 不够 */
      'How old ' + mid(a.s) + ' ' + a.be + '?',                    /* 没倒装 */
      'How many ' + a.be + ' ' + mid(a.s) + '?'                    /* many 混 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '问年龄用 How old；be 动词提到主语前面 —— ' + ask };
  }

  /* ⑨ 问「正在做什么」—— 卷子 V-2 的题型 */
  function askDoing() {
    const a = U.pick([
      { s: 'The elephants', be: 'are', ing: 'playing', p: 'in the river' },
      { s: 'The children', be: 'are', ing: 'reading', p: 'in the classroom' },
      { s: 'My mother', be: 'is', ing: 'cooking', p: 'in the kitchen' },
      { s: 'Tom', be: 'is', ing: 'drawing', p: 'in the art room' },
      { s: 'The cat', be: 'is', ing: 'sleeping', p: 'on the sofa' },
      { s: 'The students', be: 'are', ing: 'running', p: 'on the playground' },
      { s: 'Lily', be: 'is', ing: 'singing', p: 'under the tree' },
      { s: 'My father', be: 'is', ing: 'washing the car', p: 'in the garden' },
      { s: 'The boys', be: 'are', ing: 'playing basketball', p: 'on the playground' },
      { s: 'Jack', be: 'is', ing: 'flying a kite', p: 'in the park' },
      { s: 'The girl', be: 'is', ing: 'drawing a picture', p: 'in the art room' },
      { s: 'Grandpa', be: 'is', ing: 'reading the newspaper', p: 'in the living room' }
    ]);
    const which = U.rand(2);
    /* 一种划动作（问 what doing），一种划地点（问 where） */
    if (which === 0) {
      const stmt = a.s + ' ' + a.be + ' 【' + a.ing + '】 ' + a.p + '.';
      const ask = 'What ' + a.be + ' ' + mid(a.s) + ' doing?';
      const wrongs = [
        'What ' + a.be + ' ' + mid(a.s) + ' do?',                    /* 漏了 ing */
        'Where ' + a.be + ' ' + mid(a.s) + ' doing?',                /* 疑问词错 */
        'What ' + mid(a.s) + ' ' + a.be + ' doing?'                  /* 没倒装 */
      ];
      return { stmt: stmt, ask: ask, wrongs: wrongs,
        tip: '问「正在做什么」用 What … doing？be 动词提到主语前面。' };
    }
    const stmt = a.s + ' ' + a.be + ' ' + a.ing + ' 【' + a.p + '】.';
    const ask = 'Where ' + a.be + ' ' + mid(a.s) + ' ' + a.ing + '?';
    const wrongs = [
      'Where ' + mid(a.s) + ' ' + a.be + ' ' + a.ing + '?',          /* 没倒装 */
      'What ' + a.be + ' ' + mid(a.s) + ' ' + a.ing + '?',           /* 疑问词错 */
      'Where ' + a.be + ' ' + mid(a.s) + ' doing?'                   /* 动词形式错 */
    ];
    return { stmt: stmt, ask: ask, wrongs: wrongs,
      tip: '问地点用 Where，进行时的 be 要提到主语前面，ing 形式照旧。' };
  }

  const ASKERS = [askFrom, askWhereDo, askWhen, askHow, askWhose, askHowMany, askWho, askHowOld, askDoing];

  function genAsk() {
    const c = U.pick(ASKERS)();
    const head = '对划线部分提问：\n' + c.stmt;
    const k = U.rand(8);

    /* 大部分出选择题 —— 攻城战只能用选择题，题型得给够 */
    if (k <= 5) {
      return Q.choice(head, c.ask, c.wrongs, c.tip);
    }
    /* 词块：把问句拆开，自己拼（考语序） */
    if (k <= 6) {
      return Q.fromBank(head, c.ask, c.tip);
    }
    /* 手写整句：卷面就是这个要求，打完就是一笔真的笔头练习 */
    return Q.I(head, c.ask, c.tip, 0);
  }

  function gen() {
    /* 八成出划线提问，剩下两成还是原来的「选疑问词」——
       两样都要练：前者考语序，后者考疑问词本身。 */
    if (U.rand(10) < 8) return genAsk();

    const g = U.pick(LEX.wh);
    const item = U.pick(g.items);
    const all = LEX.wh.filter(function (x) { return x.w !== g.w; }).map(function (x) { return x.w; });
    const basic = all.filter(function (w) { return BASIC.indexOf(w) >= 0; });
    const wrongs = Q.distract(g.w, basic.length >= 3 ? basic : all, 3);
    const what = g.hint.replace(/^问/, '');
    const tip = '答语回答的是「' + what + '」，所以用 ' + g.w + '。';

    /* 一半选择，一半填空 */
    if (U.rand(2) === 0) {
      return Q.choice('— ' + item.q + '\n— ' + item.a, g.w, wrongs, tip);
    }
    /* 填空题：有的答语（At seven o'clock）填 What time 也完全正确，
       不认这个答案就是冤枉孩子。alt 里放这些等价写法。 */
    const ok = item.alt ? [g.w].concat(item.alt) : g.w;
    const tip2 = item.alt
      ? tip + ' 填 ' + item.alt.join(' / ') + ' 也是对的。'
      : tip;
    /* 疑问词都在句首，答案按句首大写显示；判题会忽略大小写 */
    return Q.I('根据答语填疑问词：\n— ' + item.q + '\n— ' + item.a, ok, tip2, 1);
  }

  SM.register({
    id: 'wh',
    name: '特殊疑问词',
    sub: '选疑问词 · 对划线部分提问',
    ico: '🔍',
    c1: '#5B9BFF', c2: '#3D7BF0', cd: '#2A5CC4',
    L: [
      { h: 'what 问「什么」', b: '问东西、事情、职业，都用 what。',
        e: [['What is your name?', '你叫什么名字？'], ['What does your father do?', '你爸爸做什么工作？']] },
      { h: 'when 问「什么时候」', b: '问时间点、日期、星期，用 when。',
        e: [['When do you get up?', '你什么时候起床？'], ['When is your birthday?', '你的生日是什么时候？']] },
      { h: 'where 问「在哪里」', b: '问地点、位置，用 where。',
        e: [['Where is my pen?', '我的钢笔在哪里？'], ['Where are you from?', '你来自哪里？']] },
      { h: 'whose 问「谁的」', b: '问东西属于谁，用 whose，后面直接跟名词。',
        e: [['Whose bag is this?', '这是谁的包？'], ['Whose books are these?', '这些是谁的书？']] },
      { h: 'how many / how much 问「多少」', b: 'how many + 可数名词复数；how much + 不可数名词，也可以问价钱。',
        e: [['How many books do you have?', '你有几本书？'], ['How much is it?', '多少钱？']] },
      { h: 'how 问「怎样」', b: '问方式、状态、程度，用 how，还有很多固定搭配。',
        e: [['How do you go to school?', '你怎么去上学？'], ['How old are you?', '你几岁了？']] },
      { h: 'how old / what color', b: 'how old 问年龄，what color 问颜色，都是固定搭配。',
        e: [['How old is she?', '她几岁了？'], ['What color is it?', '它是什么颜色的？']] },
      { h: '对划线部分提问：三步走', b: '① 看划线部分问的是什么，选疑问词；② 把 be 或 do/does 提到主语前面；③ 划线那一段整个去掉。',
        e: [['The pandas are from Sichuan.', '划线 Sichuan → Where are the pandas from?'],
            ['Tom plays football in the park.', '划线 in the park → Where does Tom play football?']] },
      { h: '划的是主语就别倒装', b: '划线部分正好是「谁」的时候，Who 自己就是主语，后面直接接剩下的部分。',
        e: [['【Tom】 is playing football.', '→ Who is playing football?'], ['不能说 Who does play football?', '✘']] },
      { h: '别忘了把动词还原', b: '原句动词有三单的 s，提问时 do/does 已经承担了「三单」，动词要还原成原形。',
        e: [['She goes to school by bus.', '→ How does she go to school?'], ['不是 How does she goes…', '✘']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
