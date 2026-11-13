/* ============================================================
   modules/prog.js — 现在进行时（be + 动词 ing）
   ------------------------------------------------------------
   卷子上的原题：
     It ___ (not sleep) now.                        → isn't sleeping
     The elephants are playing in the river.        （对划线部分提问）

   三件事必须同时讲对，孩子才不会漏：
     ① be 动词跟主语走 —— I am / he is / they are
     ② 动词要变成 ing 形式 —— 一般加 ing、去 e 加 ing、双写加 ing
     ③ 句子里得有「此刻」的信号 —— now / Look! / Listen!

   为什么每题都带 now 或 Look!：
     不带的话「Tom plays football.」和「Tom is playing football.」
     都成立，一道题两个正确答案，孩子选哪个都对、也都不对。
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, M = SM.M, Q = SM.quiz;

  /* ---------------- 主语 ----------------
     只用人和动物。公交车、桌子这类东西能当主语，但配「踢足球」就讲不通，
     与其写一堆过滤规则，不如一开始就不收。 */
  const SUBJ = [
    { s: 'I',            p: 'i',    cn: '我',         k: 'p' },
    { s: 'You',          p: 'you',  cn: '你',         k: 'p' },
    { s: 'He',           p: 'he',   cn: '他',         k: 'p' },
    { s: 'She',          p: 'she',  cn: '她',         k: 'p' },
    { s: 'We',           p: 'we',   cn: '我们',       k: 'p' },
    { s: 'They',         p: 'they', cn: '他们',       k: 'p' },
    { s: 'Tom',          p: 'he',   cn: '汤姆',       k: 'p' },
    { s: 'Amy',          p: 'she',  cn: '艾米',       k: 'p' },
    { s: 'Jack',         p: 'he',   cn: '杰克',       k: 'p' },
    { s: 'Lily',         p: 'she',  cn: '莉莉',       k: 'p' },
    { s: 'My father',    p: 'he',   cn: '我爸爸',     k: 'p' },
    { s: 'My mother',    p: 'she',  cn: '我妈妈',     k: 'p' },
    { s: 'My brother',   p: 'he',   cn: '我哥哥',     k: 'p' },
    { s: 'My sister',    p: 'she',  cn: '我妹妹',     k: 'p' },
    { s: 'The boy',      p: 'he',   cn: '那个男孩',   k: 'p' },
    { s: 'The girl',     p: 'she',  cn: '那个女孩',   k: 'p' },
    { s: 'The students', p: 'they', cn: '那些学生',   k: 'p' },
    { s: 'The boys',     p: 'they', cn: '那些男孩',   k: 'p' },
    { s: 'My friends',   p: 'they', cn: '我的朋友们', k: 'p' },
    { s: 'Tom and Amy',  p: 'they', cn: '汤姆和艾米', k: 'p' },
    /* 动物：能跑能睡能吃能游，别让它弹钢琴 */
    { s: 'The cat',      p: 'it',   cn: '那只猫',     k: 'a' },
    { s: 'The dog',      p: 'it',   cn: '那只狗',     k: 'a' }
  ];

  /* ---------------- 地点 ----------------
     每个动词只配讲得通的地点。写成一张对应表，比随机抽地点安全 ——
     随机抽会出「在操场上游泳」这种，一眼就是错句。 */
  const P = {
    park:     ['in the park', '在公园里'],
    playgd:   ['on the playground', '在操场上'],
    room:     ['in the classroom', '在教室里'],
    home:     ['at home', '在家里'],
    kitchen:  ['in the kitchen', '在厨房里'],
    music:    ['in the music room', '在音乐教室'],
    art:      ['in the art room', '在美术教室'],
    bedroom:  ['in the bedroom', '在卧室里'],
    river:    ['in the river', '在河里'],
    sofa:     ['on the sofa', '在沙发上'],
    tree:     ['under the tree', '在树下'],
    garden:   ['in the garden', '在花园里'],
    living:   ['in the living room', '在客厅里']
  };

  /* ---------------- 动词 ----------------
     who: 'p' 只有人做 / 'a' 只有动物做 / 'pa' 都能做
     obj: 宾语（空表示不及物） */
  const V_P = [
    { b: 'play',  obj: 'football',   cn: '踢足球',   who: 'p',  pl: ['playgd', 'park'] },
    { b: 'play',  obj: 'the piano',  cn: '弹钢琴',   who: 'p',  pl: ['music', 'home'] },
    { b: 'play',  obj: 'basketball', cn: '打篮球',   who: 'p',  pl: ['playgd'] },
    { b: 'read',  obj: 'a book',     cn: '看书',     who: 'p',  pl: ['room', 'tree', 'bedroom'] },
    { b: 'write', obj: 'a letter',   cn: '写信',     who: 'p',  pl: ['home', 'room'] },
    { b: 'draw',  obj: 'a picture',  cn: '画画',     who: 'p',  pl: ['art', 'room'] },
    { b: 'watch', obj: 'TV',         cn: '看电视',   who: 'p',  pl: ['living', 'home'] },
    { b: 'clean', obj: 'the room',   cn: '打扫房间', who: 'p',  pl: ['home'] },
    { b: 'do',    obj: 'homework',   cn: '做作业',   who: 'p',  pl: ['home', 'room'] },
    { b: 'make',  obj: 'a cake',     cn: '做蛋糕',   who: 'p',  pl: ['kitchen'] },
    { b: 'sing',  obj: 'a song',     cn: '唱歌',     who: 'p',  pl: ['music', 'tree'] },
    { b: 'dance', obj: '',           cn: '跳舞',     who: 'p',  pl: ['music', 'playgd'] },
    { b: 'cook',  obj: 'dinner',     cn: '做晚饭',   who: 'p',  pl: ['kitchen'] },
    { b: 'wash',  obj: 'the dishes', cn: '洗碗',     who: 'p',  pl: ['kitchen'] },
    { b: 'fly',   obj: 'a kite',     cn: '放风筝',   who: 'p',  pl: ['park', 'playgd'] },
    { b: 'take',  obj: 'photos',     cn: '拍照',     who: 'p',  pl: ['park', 'garden'] },
    { b: 'run',   obj: '',           cn: '跑步',     who: 'pa', pl: ['playgd', 'park'] },
    { b: 'swim',  obj: '',           cn: '游泳',     who: 'pa', pl: ['river'] },
    { b: 'sleep', obj: '',           cn: '睡觉',     who: 'pa', pl: ['bedroom', 'sofa', 'tree'] },
    { b: 'eat',   obj: 'an apple',   cn: '吃苹果',   who: 'pa', pl: ['kitchen', 'home'] },
    { b: 'drink', obj: 'milk',       cn: '喝牛奶',   who: 'pa', pl: ['kitchen', 'home'] },
    { b: 'jump',  obj: '',           cn: '跳',       who: 'pa', pl: ['playgd'] }
  ];
  const V_A = [
    { b: 'sleep', obj: '',              cn: '睡觉',       who: 'a', pl: ['sofa', 'bedroom', 'tree'] },
    { b: 'run',   obj: '',              cn: '跑',         who: 'a', pl: ['garden', 'park'] },
    { b: 'eat',   obj: 'fish',          cn: '吃鱼',       who: 'a', pl: ['kitchen', 'home'] },
    { b: 'drink', obj: 'water',         cn: '喝水',       who: 'a', pl: ['kitchen', 'home'] },
    { b: 'play',  obj: 'with a ball',   cn: '玩球',       who: 'a', pl: ['garden', 'park'] },
    { b: 'jump',  obj: '',              cn: '跳',         who: 'a', pl: ['sofa', 'garden'] }
  ];

  /* ---------------- 时间标志 ----------------
     front: 放句首（Look! / Listen!）；否则放句尾 */
  const MARK = [
    { s: 'now',            cn: '现在',  front: 0 },
    { s: 'now',            cn: '现在',  front: 0 },
    { s: 'Look!',          cn: '看！',  front: 1 },
    { s: 'Listen!',        cn: '听！',  front: 1 },
    { s: 'at this moment', cn: '此刻',  front: 0 },
    { s: 'right now',      cn: '现在',  front: 0 }
  ];

  const BE = ['am', 'is', 'are'];

  /* 句中的主语要小写：You → you、My father → my father、This boy → this boy。
     按首词判断；I 在英语里永远大写，不能动。 */
  const PRON_LOWER = { You: 'you', He: 'he', She: 'she', We: 'we', They: 'they' };
  const ART_LOWER = /^(My|The|His|Her|Our|Their|This|That|These|Those)$/;
  function midSubj(s) {
    const w = String(s || '').split(' ');
    if (!w[0]) return s;
    if (PRON_LOWER[w[0]]) { w[0] = PRON_LOWER[w[0]]; return w.join(' '); }
    if (ART_LOWER.test(w[0])) { w[0] = w[0].toLowerCase(); return w.join(' '); }
    return s;
  }

  /* **疑问句**的主语：陈述句里说 my / our / we（我方），改成问句是问**对方**，
     要说 your / you —— «My father is washing the car.» 的疑问句是
     «Is your father washing the car?»。人称、口径同 yesno 模块。 */
  function qSubj(s) {
    const w = String(s || '').split(' ');
    if (!w[0]) return s;
    if (w[0] === 'My' || w[0] === 'Our') { w[0] = 'your'; return w.join(' '); }
    if (w[0] === 'We') return w.length > 1 ? 'you ' + w.slice(1).join(' ') : 'you';
    if (w[0] === 'I') return 'you';
    return midSubj(s);
  }

  /* 拼出动词短语：play football → playing football */
  function ingOf(v) {
    return M.ingV(v.obj ? v.b + ' ' + v.obj : v.b);
  }
  /* 孩子最常写错的 ing：漏双写、忘去 e。只在这两类词上才给，
     play → playying 这种没有孩子会写成这样，给了等于白送一个选项。 */
  function badIng(v) {
    const w = v.b;
    if (/^(run|sit|swim|get|put|stop|shop|begin|jump)$/.test(w)) return w + 'ing';
    if (/[^e]e$/.test(w)) return w + 'ing';
    return '';
  }

  /* 句子：主语 + be + ing + 地点 + 时间标志。改写题用完整谓语。 */
  function build(subj, be, ing, place, mark) {
    const pred = [be, ing].filter(function (x) { return x; }).join(' ');
    const core = subj + ' ' + pred + ' ' + place;
    return mark.front ? mark.s + ' ' + core + '.' : core + ' ' + mark.s + '.';
  }

  function gen() {
    const p = U.pick(SUBJ);
    const v = U.pick(p.k === 'a' ? V_A : V_P);
    const pl = U.pick(v.pl);
    const place = P[pl][0], placeCn = P[pl][1];
    const kind = U.rand(8);
    /* 改写题（否定句 / 疑问句）不能用 Look! / Listen! 开头 ——
       原文句子带着「Look!」，改写后的答案却没带，两边对不上，
       孩子照着写还要被挑刺。改成一律用句尾的时间状语。
       主语是 You 也不用 Look! / Listen! —— 那是让别人看**别人**正在做的事，
       «Look! You are making a cake»（看！你正在做蛋糕）没有人这么说；
       自然的是 I / He / The dog。You 的句子改用句尾的 now / right now。 */
    const rewrite = (kind === 6 || kind === 7);
    const noFront = rewrite || (p.p === 'you');
    const mark = noFront
      ? U.pick(MARK.filter(function (m) { return !m.front; }))
      : U.pick(MARK);
    const be = M.be(p.p);
    const ing = ingOf(v);
    const ingV = M.ingV(v.b);          /* 只有动词的 ing：making（宾语不在里面） */
    const stmt = build(p.s, be, ing, place, mark);

    /* 带空格的题干：括号里只给**动词原形**，宾语留在句子里 ——
       跟试卷 IV 大题 «It ___ (not sleep) now.» 一个格式。
       之前把整个短语 (make a cake) 塞进括号、选项里再重复一遍，
       读起来像「You making a cake (make a cake)」，孩子只顾着对提示。 */
    const verbStem = function (hint) {
      const core = p.s + ' ___ (' + hint + ')' + (v.obj ? ' ' + v.obj : '') + ' ' + place;
      return mark.front ? mark.s + ' ' + core + '.' : core + ' ' + mark.s + '.';
    };

    /* ① 选择题：括号里给原形动词，空里只填 be + ing，宾语在句子里。
       占一半 —— 攻城池只吃选择题，填空和改写留给首页练习。 */
    if (kind <= 3) {
      const otherBe = U.pick(BE.filter(function (x) { return x !== be; }));
      const bi = badIng(v);
      const wrongs = [
        otherBe + ' ' + ingV,          /* be 跟主语不搭 */
        be + ' ' + v.b,                /* 忘了变 ing */
        ingV,                          /* 丢了 be */
        M.s3v(v.b),                    /* 一般现在时，被 now 否掉 */
        v.b
      ];
      if (bi) wrongs.push(be + ' ' + bi);

      const stem = verbStem(v.b);
      const tip = '主语是 ' + midSubj(p.s) + '，所以 be 用 ' + be + '；'
        + '正在进行要把 ' + v.b + ' 变成 ' + ingV + '。'
        + (mark.s === 'now' || mark.s === 'right now' || mark.s === 'at this moment'
          ? ' 句尾的 ' + mark.s + ' 说明是「此刻正在做」。'
          : ' 句首的 ' + mark.s + ' 提示动作正在发生。');
      return Q.choice('选出正确的一项：\n' + stem, be + ' ' + ingV, wrongs, tip);
    }

    /* ② 填空：给原形提示，写 be + ing（卷子第 IV 大题就是这种） */
    if (kind === 4) {
      const stem = verbStem(v.b);
      return Q.I('用所给词的适当形式填空：\n' + stem, be + ' ' + ingV,
        '看到 ' + mark.s + ' 就用现在进行时：'
        + be + ' + ' + ingV + '。', 0);
    }

    /* ③ 否定式填空：卷子原题「It isn't sleeping (not sleep) now.」 */
    if (kind === 5) {
      const stem = verbStem('not ' + v.b);
      return Q.I('用所给词的适当形式填空：\n' + stem, be + ' not ' + ingV,
        '否定的现在进行时是「be + not + 动词 ing」，不是 doesn\'t。', 0);
    }

    /* ④ 改成否定句：be 后面加 not，时间状语要原样留着 */
    if (kind === 6) {
      return Q.I('改成否定句：\n' + stmt,
        p.s + ' ' + be + ' not ' + ing + ' ' + place + ' ' + mark.s + '.',
        '在 be 后面直接加 not：' + be + ' → ' + be + ' not。', 0);
    }

    /* ⑤ 改成一般疑问句：be 提到主语前面。
       主语是 I 的话要改成 you —— 没人会问自己「Am I running?」，
       教材和卷子上的标准答案都是 «Are you running?»。
       My / Our 同理 → your（Is your father washing the car?）。 */
    if (kind === 7) {
      const isI = (p.p === 'i');
      const subjQ = qSubj(p.s);
      const beQ = isI ? 'are' : be;
      const ans = beQ.charAt(0).toUpperCase() + beQ.slice(1) + ' '
        + subjQ + ' ' + ing + ' ' + place + ' ' + mark.s + '?';
      return Q.I('改成一般疑问句：\n' + stmt, ans,
        '把 be 提到主语前面，句号变问号：' + beQ + ' ' + subjQ + ' …?'
          + (isI ? ' 主语 I 要改成 you。' : ''), 0);
    }

    /* ⑥ 词块：给中文，自己拼 */
    const cnText = mark.front
      ? mark.cn + p.cn + '正在' + v.cn + placeCn + '。'
      : p.cn + '正在' + v.cn + placeCn + '。';
    return Q.fromBank('点词块，拼出这句话：\n' + cnText, stmt,
      '主语 + ' + be + ' + ' + ing + ' + 地点。');
  }

  SM.register({
    id: 'prog',
    name: '现在进行时',
    sub: 'be + 动词 ing',
    ico: '⏱️',
    c1: '#7ED9A7', c2: '#3FBF7F', cd: '#21875A',
    L: [
      { h: '什么时候用它？', b: '说「此刻正在做」的事。句子里常有 now、Look!、Listen!、at this moment 这些信号词。',
        e: [['Look! The children are playing.', '看！孩子们正在玩。'], ['It is sleeping now.', '它现在正在睡觉。']] },
      { h: '结构：be + 动词 ing', b: '两样缺一不可。只有 be 没 ing 不行，只有 ing 没 be 也不行。',
        e: [['She is reading.', '✔ 她正在看书。'], ['She reading. / She is read.', '✘ 都缺了一半']] },
      { h: 'be 跟主语走', b: 'I 用 am；he / she / it 和一个人、一样东西用 is；you / we / they 和复数用 are。',
        e: [['I am drawing.', '我在画画。'], ['They are running.', '他们在跑步。']] },
      { h: 'ing 怎么变①：一般直接加', b: '绝大多数动词直接加 ing。',
        e: [['play → playing', 'read → reading'], ['draw → drawing', 'sing → singing']] },
      { h: 'ing 怎么变②：去掉词尾的 e', b: '以不发音的 e 结尾，去掉 e 再加 ing。',
        e: [['make → making', '✔ 不是 makeing'], ['write → writing', 'dance → dancing']] },
      { h: 'ing 怎么变③：双写最后一个字母', b: '重读闭音节、末尾只有一个辅音字母的，要双写再加 ing。',
        e: [['run → running', '✔ 不是 runing'], ['swim → swimming', 'sit → sitting']] },
      { h: '否定：be 后面加 not', b: '不是加 doesn\'t。isn\'t / aren\'t / am not 后面照样跟 ing。',
        e: [['It isn\'t sleeping now.', '它现在没在睡觉。'], ['They aren\'t playing.', '他们没在玩。']] },
      { h: '疑问：be 提到最前面', b: '把 be 挪到主语前面，句号改问号。',
        e: [['Are the elephants playing?', '大象们在玩吗？'], ['Is she reading?', '她正在看书吗？']] },
      { h: '和一般现在时怎么分？', b: 'now / Look! 用进行时；every day / usually 用一般现在时。',
        e: [['He plays football every day.', '他每天踢足球。'], ['He is playing football now.', '他现在正在踢足球。']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
