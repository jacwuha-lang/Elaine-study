/* ============================================================
   modules/do.js — do / does 专项
   只练「助动词怎么选」：疑问句用 Do/Does，否定句用 don't/doesn't，答语用 do/does
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, M = SM.M, Q = SM.quiz;

  const isThird = function (p) { return p === 'he' || p === 'she' || p === 'it'; };

  /* 主语出现在句子中间时用句中形式：The cat → the cat，Tom 不变 */
  const mid = M.mid;

  /* 疑问句是对着孩子问的，人称要转：
       I / We     → you
       My father  → your father
     不转的话会出来「Do my parents like music?」，自己问自己。
     否定句是陈述，主语保持原样。 */
  function qForm(s) {
    if (s.p === 'i' || s.p === 'we') return 'you';
    let t = s.s;
    if (/\bMy\b/.test(t)) t = t.replace(/\bMy\b/g, 'your');
    if (/\bOur\b/.test(t)) t = t.replace(/\bOur\b/g, 'your');
    return mid(t);
  }

  /* 答语用代词：「— Does your father walk to school? — Yes, he does.」
     用 my father 答既啰嗦，也不像真人在对话。 */
  const ANS_SUBJ = { i: 'I', you: 'you', he: 'he', she: 'she', it: 'it', we: 'we', they: 'they' };

  function gen() {
    const subj = U.pick(LEX.subjects);
    const third = isThird(subj.p);
    const v = U.pick(LEX.verbsFor(subj));
    const obj = LEX.objFor(v, subj);
    const kind = U.rand(3);

    /* 疑问句用转过的形式，否定句用原样 */
    const qSubj = qForm(subj);
    const qObj = LEX.objFor(v, subj, (subj.p === 'i' || subj.p === 'we') ? 'you' : subj.p);

    /* ---------- ① 疑问句：选 Do / Does ---------- */
    if (kind === 0) {
      const right = third ? 'Does' : 'Do';
      const wrongs = third ? ['Do', 'Is', 'Are'] : ['Does', 'Is', 'Are'];
      const tip = third
        ? '主语 “' + qSubj + '” 是第三人称单数，用 Does。'
        : '主语 “' + qSubj + '” 不是第三人称单数，用 Do。';
      return Q.choice('___ ' + qSubj + ' ' + v.b + ' ' + qObj + '?', right, wrongs, tip);
    }

    /* ---------- ② 否定句：选 don't / doesn't ---------- */
    if (kind === 1) {
      const right = third ? 'doesn\'t' : 'don\'t';
      const wrongs = third ? ['don\'t', 'isn\'t', 'not'] : ['doesn\'t', 'aren\'t', 'not'];
      const tip = third
        ? '主语 “' + subj.s + '” 是三单，否定用 doesn\'t，后面动词用原形。'
        : '主语 “' + subj.s + '” 不是三单，否定用 don\'t，后面动词用原形。';
      return Q.choice(subj.s + ' ___ ' + v.b + ' ' + obj + '.', right, wrongs, tip);
    }

    /* ---------- ③ 答语：选 do / does ---------- */
    /* 问句用 qSubj（人称已转过），答语要跟着问句的人称走：
       「— Do you watch TV?  — Yes, I do.」   问 you 答 I
       「— Does your father …? — Yes, he does.」 */
    const ask = (third ? 'Does ' : 'Do ') + qSubj + ' ' + v.b + ' ' + qObj + '?';
    /* 答语的人称跟着问句走：问 you 就答 I / we，其余用代词。
       干扰项里的 be 动词也要按「答语的人称」取 ——
       问 you 答 I，be 就得是 am，不然会出来「Yes, I are.」这种没人这么写的句子。 */
    const ansPerson = (qSubj === 'you') ? (subj.p === 'we' ? 'we' : 'i') : subj.p;
    const ansSubj = ANS_SUBJ[ansPerson] || mid(subj.s);
    const yes = U.rand(2) === 0;
    const right = third ? 'does' : 'do';
    const negForm = third ? 'doesn\'t' : 'don\'t';
    const answer = yes ? 'Yes, ' + ansSubj + ' ' + right + '.' : 'No, ' + ansSubj + ' ' + negForm + '.';
    /* 干扰项要落在「do / be 混淆」「主谓一致」「情态动词混淆」这三个真错上。
       以前放 has（跟 do 体系无关）、放 are 配 she（she are 没人这么写）、
       放 not（Yes, she not. 不是英语）—— 都是一眼排除的凑数项。 */
    const beW = M.be(ansPerson);
    const wrongs = third ? ['do', beW, 'can'] : ['does', beW, 'can'];
    const tip = third
      ? '用 Does 问，就用 does 答；否定回答用 doesn\'t。'
      : '用 Do 问，就用 do 答；否定回答用 don\'t。';
    return Q.choice('— ' + ask + '\n— ___', answer, wrongs.map(function (w) {
      return (yes ? 'Yes, ' + ansSubj + ' ' + w + '.' : 'No, ' + ansSubj + ' ' + w + '.');
    }), tip);
  }

  SM.register({
    id: 'do',
    name: 'do / does',
    sub: '疑问、否定、回答',
    ico: '⚡',
    c1: '#B39CFF', c2: '#9370F5', cd: '#6E4BC9',
    L: [
      { h: 'do 和 does 怎么选？', b: '主语是 I / you / we / they 或复数 → 用 do；主语是 he / she / it 或单数 → 用 does。',
        e: [['Do you like music?', '你喜欢音乐吗？'], ['Does she like music?', '她喜欢音乐吗？']] },
      { h: '疑问句：Do / Does 放句首', b: '后面跟主语，再接动词原形。',
        e: [['Do they play football?', '他们踢足球吗？'], ['Does Tom have a dog?', '汤姆有狗吗？']] },
      { h: '否定句：don\'t / doesn\'t', b: '放在主语后面、动词前面，动词用原形。',
        e: [['I don\'t like milk.', '我不喜欢牛奶。'], ['She doesn\'t like milk.', '她不喜欢牛奶。']] },
      { h: '怎么回答？', b: '用 do / does 问，就用 do / does 答。',
        e: [['— Do you like it? — Yes, I do. / No, I don\'t.', ''], ['— Does he like it? — Yes, he does. / No, he doesn\'t.', '']] },
      { h: '最容易犯的错', b: 'does 后面又用了三单形式，这是最常见的错误。',
        e: [['Does he like apples?', '✔ 不能写成 likes'], ['He doesn\'t go.', '✔ 不能写成 goes']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
