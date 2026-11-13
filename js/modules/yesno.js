/* ============================================================
   modules/yesno.js — 一般疑问句
   三种句式随机：be 动词 / can / 实义动词
   主语从 26 个里抽，第一人称自动转第二人称
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, M = SM.M, Q = SM.quiz;

  const isThird = function (p) { return p === 'he' || p === 'she' || p === 'it'; };
  const needSecond = function (p) { return p === 'i' || p === 'we'; };

  /* 主语转疑问句形式：I→you, My father→your father */
  function toQSubject(subj) {
    if (needSecond(subj.p)) return 'you';
    let s = subj.s;
    if (/\bMy\b/.test(s)) s = s.replace(/\bMy\b/g, 'your');
    if (/\bOur\b/.test(s)) s = s.replace(/\bOur\b/g, 'your');
    return s;
  }

  /* 同一主语在句首、句中两种写法：The cat / the cat */
  function forms(subj) {
    const base = toQSubject(subj);
    const m = M.mid(base);
    return { m: m, c: M.cap(m) };
  }

  /* 物主代词：I/We 转 you 之后要变 your */
  function possFor(subj, asQuestion) {
    if (asQuestion && needSecond(subj.p)) return 'your';
    return M.poss(subj.p);
  }

  /* 人称转换是「改一般疑问句」的规定动作，得在题干里明说。
     课本规则：I / We / my / our → you / your。
     不明说的话，孩子看着题干里的 My、词块里的 your，
     会以为题目出错了 —— 明明只让改句型，怎么词都换了。 */
  function hintOf(subj) {
    if (needSecond(subj.p)) return '（I / We 要变成 you）';
    if (/\bMy\b/.test(subj.s) || /\bOur\b/.test(subj.s)) return '（my / our 要变成 your）';
    return '';
  }

  function gen() {
    const subj = U.pick(LEX.subjects);
    const kind = U.rand(3);
    const f = forms(subj);
    const qs = f.m;   // 句中形式，Can/Do/Does 后面用这个
    const hint = hintOf(subj);

    /* ---------- ① be 动词句 ---------- */
    if (kind === 0) {
      const be = M.be(subj.p);
      const pred = U.pick(LEX.predsFor(subj.k, subj));
      /* 复数主语配复数表语：「Are the students teachers?」 */
      const pt = LEX.predText(pred, subj);
      const stmt = subj.s + ' ' + be + ' ' + pt + '.';
      const qbe = needSecond(subj.p) ? 'are' : be;
      const wrongBe = qbe === 'is' ? 'are' : 'is';
      const ans = U.cap(qbe) + ' ' + qs + ' ' + pt + '?';
      const tip = '有 be 动词，把 ' + qbe + ' 提到主语前面就行，其余不变。';

      const wrongs = [
        'Does ' + qs + ' ' + pt + '?',                     // 请错助动词
        f.c + ' ' + qbe + ' ' + pt + '?',                  // 没有提前
        U.cap(wrongBe) + ' ' + qs + ' ' + pt + '?'         // be 动词和人称不搭
      ];
      return pickForm(stmt, ans, wrongs, tip, 'be 动词提前', hint);
    }

    /* ---------- ② can 句（东西不会「会做某事」，这种主语跳过这一型） ---------- */
    const canPool = LEX.canDoFor(subj.k);
    if (kind === 1 && canPool.length) {
      const act = U.pick(canPool);
      const stmt = subj.s + ' can ' + act.v + '.';
      const ans = 'Can ' + qs + ' ' + act.v + '?';
      const tip = '情态动词 can 直接提到句首，后面的动词保持原形。';

      const wrongs = [
        'Do ' + qs + ' can ' + act.v + '?',
        /* 只变短语的第一个词：speak English → speaks English。
           以前整串加 s 会造出「Englishs」这种不存在的词，白送排除项。 */
        'Can ' + qs + ' ' + M.s3v(act.v) + '?',
        'Can ' + qs + ' to ' + act.v + '?'
      ];
      return pickForm(stmt, ans, wrongs, tip, 'can 提前', hint);
    }

    /* ---------- ③ 实义动词句 ---------- */
    const v = U.pick(LEX.verbsFor(subj));
    const obj0 = LEX.objFor(v, subj);
    const objQ = LEX.objFor(v, subj, needSecond(subj.p) ? 'you' : subj.p);
    const third = isThird(subj.p);
    const aux = third ? 'Does' : 'Do';
    const s3 = M.s3(v.b);

    const stmt = subj.s + ' ' + (third ? s3 : v.b) + ' ' + obj0 + '.';
    const ans = aux + ' ' + qs + ' ' + v.b + ' ' + objQ + '?';
    const tip = third
      ? '实义动词要请 ' + aux + ' 帮忙：' + aux + ' 放句首，原来的 ' + s3 + ' 还原成 ' + v.b + '。'
      : '实义动词要请 Do 帮忙：Do 放句首，后面的动词保持原形 ' + v.b + '。';

    const wrongs = [
      aux + ' ' + qs + ' ' + s3 + ' ' + objQ + '?',
      (third ? 'Do' : 'Does') + ' ' + qs + ' ' + v.b + ' ' + objQ + '?',
      f.c + ' ' + aux.toLowerCase() + ' ' + v.b + ' ' + objQ + '?'
    ];
    return pickForm(stmt, ans, wrongs, tip, '加 ' + aux, hint);
  }

  /* 三种题型随机：词块 / 手写 / 选择 */
  function pickForm(stmt, ans, wrongs, tip, tag, hint) {
    const kind = U.rand(3);
    const h = hint || '';
    const prompt = '改成一般疑问句' + h + '：\n' + stmt;

    if (kind === 0) return Q.fromBank(prompt, ans, tip);
    if (kind === 1) return Q.I(prompt, ans, tip);
    return Q.choice('把 “' + stmt + '” 改成一般疑问句' + h + '，正确的是：', ans, wrongs, tip);
  }

  SM.register({
    id: 'yesno',
    name: '一般疑问句',
    sub: 'Be / can / do 提前',
    ico: '🤔',
    c1: '#4FD3DA', c2: '#22B8C4', cd: '#0E8C99',
    L: [
      { h: '什么是一般疑问句？', b: '能用 Yes / No 回答的疑问句，就叫一般疑问句。',
        e: [['Is she a teacher?', '— Yes, she is.']] },
      { h: '第①种：有 be 动词', b: '把 am / is / are 提到主语前面，其余不变。',
        e: [['She is a doctor. → Is she a doctor?', ''], ['They are students. → Are they students?', '']] },
      { h: '第②种：有情态动词', b: '把 can / must / should 提到主语前面。',
        e: [['He can swim. → Can he swim?', '']] },
      { h: '第③种：实义动词', b: '句首加 Do 或 Does，原来的动词变回原形。',
        e: [['You like apples. → Do you like apples?', ''], ['She likes apples. → Does she like apples?', '']] },
      { h: '人称要跟着换', b: '把 I / my / we / our 改成 you / your。',
        e: [['I am a student. → Are you a student?', ''], ['My name is Tom. → Is your name Tom?', '']] },
      { h: '怎么回答', b: 'Yes / No + 主语 + 对应的 be 动词 / 情态动词 / do。',
        e: [['— Is he your brother? — Yes, he is.', ''], ['— Does she like it? — No, she doesn\'t.', '']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
