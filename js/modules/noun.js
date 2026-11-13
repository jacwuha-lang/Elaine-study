/* ============================================================
   modules/noun.js — 名词单复数
   五种题型随机：选择 / 填空 / 单数句改复数句 / 根据 has·have 判断 / 词形
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, M = SM.M, Q = SM.quiz;

  /* 数量词。some 后面也能跟可数名词复数，一起放进来说得通。 */
  const NUM = ['two', 'three', 'four', 'five', 'six', 'many', 'some'];

  /* 造句框里一律用「在那边 / 在画里」这种不挑名词的地点。
     写「在桌子上」会跟动物园、公交车打架 —— 「There are two zoos on the desk.」 */
  const FRAMES = [
    function (n, num) { return 'There are ' + num + ' ___ (' + n.w + ') over there.'; },
    function (n, num) { return 'I can see ' + num + ' ___ (' + n.w + ') in the picture.'; },
    function (n) { return 'How many ___ (' + n.w + ') can you see?'; },
    function (n) { return 'Look at these ___ (' + n.w + ').'; }
  ];

  /* 单数句 → 复数句。主语、be 动词、名词三处都要跟着变。 */
  const REWRITE = [
    function (n) {
      return { q: 'This is ' + n.art + ' ' + n.w + '.', a: 'These are ' + n.pl + '.' };
    },
    function (n) {
      return { q: 'That is ' + n.art + ' ' + n.w + '.', a: 'Those are ' + n.pl + '.' };
    },
    function (n) {
      return { q: 'There is ' + n.art + ' ' + n.w + ' over there.',
               a: 'There are ' + n.pl + ' over there.' };
    },
    function (n) {
      return { q: 'It is ' + n.art + ' ' + n.w + '.', a: 'They are ' + n.pl + '.' };
    }
  ];

  /* 根据 be 动词倒推名词该用单数还是复数。
     卷子上那一题就是这么出的：
       The ___ (library) in our school has many storybooks.  → library
     孩子看到 many storybooks 就顺手写成 libraries，正好错在这里。

     两个限制：
       ① 只用「复数不是简单加 s」的词 —— 不规则词的复数跟原形长得不一样，
          填复数时才不是照抄括号。
       ② 只用能指着说「在那边」的词。city / story / party / day
          放进「The cities are over there.」就不通了。 */
  const POINTABLE = [
    'child', 'mouse', 'man', 'woman', 'goose', 'person', 'sheep',
    'potato', 'tomato', 'hero', 'knife', 'shelf', 'leaf', 'wolf', 'wife',
    'bus', 'box', 'watch', 'brush', 'glass', 'dish', 'peach', 'dress',
    'fox', 'cherry', 'butterfly', 'baby'
  ];

  const AGREES = [
    { t: 'The ___ (W) is over there.',       one: 1 },
    { t: 'The ___ (W) are over there.',      one: 0 },
    { t: 'Look! The ___ (W) is over there.', one: 1 },
    { t: 'Look! The ___ (W) are over there.', one: 0 }
  ];

  /* ---------------- 变化规则的中文说明 ---------------- */
  function tipOf(n) {
    const w = n.w, p = n.pl;
    if (p === w) return '“' + w + '” 单复数同形，复数还是 ' + w + '。';
    if (p === w + 's') {
      if (/o$/.test(w)) {
        return '“' + w + '” 虽然以 o 结尾，但只加 s → ' + p + '（potato、tomato 才加 es）。';
      }
      return '一般情况直接加 s：' + w + ' → ' + p + '。';
    }
    if (p === w + 'es') {
      if (/o$/.test(w)) return '以 o 结尾的 ' + w + ' 要加 es → ' + p + '。';
      return '以 s / x / ch / sh 结尾，加 es → ' + p + '。';
    }
    if (/[^aeiou]y$/.test(w) && p === w.slice(0, -1) + 'ies') {
      return '辅音字母 + y 结尾，把 y 变成 i 再加 es → ' + p + '。';
    }
    if (/fe$/.test(w) && p === w.slice(0, -2) + 'ves') {
      return '以 fe 结尾，把 fe 变成 v 再加 es → ' + p + '。';
    }
    if (/f$/.test(w) && p === w.slice(0, -1) + 'ves') {
      return '以 f 结尾，把 f 变成 v 再加 es → ' + p + '。';
    }
    return '不规则变化，要单独记住：' + w + ' → ' + p + '。';
  }

  /* ---------------- 干扰项 ----------------
     全是孩子真会写出来的错，不是凭空造词：
       一律加 s       box  → boxs
       一律加 es      city → cityes
       所有格混淆     book → book's
       忘了变复数     book → book
     顺序固定，先给最像的，保证每题干扰项质量稳定。 */
  function wrongPlurals(n) {
    const w = n.w, out = [];
    function add(s) {
      if (!s || s === n.pl || out.indexOf(s) >= 0) return;
      out.push(s);
    }
    add(w);                                   // 忘了变复数
    add(w + 's');                             // 一律加 s
    add(w + '\'s');                           // 所有格混淆
    if (!/e$/.test(w)) add(w + 'es');         // 一律加 es
    if (/[^aeiou]y$/.test(w)) add(w.slice(0, -1) + 'ies');
    if (/fe$/.test(w)) add(w.slice(0, -2) + 'ves');
    else if (/f$/.test(w)) add(w.slice(0, -1) + 'ves');
    if (/o$/.test(w)) add(w + 'es');
    return out;
  }

  /** 能进造句框的名词：看得见、指得着的东西 */
  function framed() {
    return LEX.nouns.filter(function (n) { return !n.nf && !n.ab; });
  }

  /** 能改写单复数句的名词：只要求有单数形式，抽象词也可以 */
  function rewr() {
    return LEX.nouns.filter(function (n) { return !n.nf && !n.ns; });
  }

  function gen() {
    const kind = U.rand(5);

    /* ---------- ① 选择：句子里填正确的复数 ---------- */
    if (kind === 0) {
      /* 只挑「不是简单加 s」的词 —— 给 book 出 book / bookes / book's
         这种题，等于白送。 */
      const pool = framed().filter(function (n) {
        return !n.np && n.pl !== n.w + 's';
      });
      const n = U.pick(pool);
      const f = U.pick(FRAMES);
      const stmt = f(n, U.pick(NUM));
      return Q.choice(stmt, n.pl, wrongPlurals(n), tipOf(n));
    }

    /* ---------- ② 填空：用所给词的适当形式填空 ---------- */
    if (kind === 1) {
      const n = U.pick(framed());
      const f = U.pick(FRAMES);
      const stmt = '用所给词的适当形式填空：\n' + f(n, U.pick(NUM));
      return Q.I(stmt, n.pl, tipOf(n), 1);
    }

    /* ---------- ③ 改写：单数句 → 复数句 ---------- */
    if (kind === 2) {
      const n = U.pick(rewr());
      const r = U.pick(REWRITE)(n);
      const stmt = '改成复数句：\n' + r.q;
      const tip = '单数变复数，主语、be 动词、名词三处都要变。' + tipOf(n);
      if (U.rand(2) === 0) return Q.I(stmt, r.a, tip);
      return Q.fromBank(stmt, r.a, tip);
    }

    /* ---------- ④ 根据 be 动词判断单复数 ---------- */
    if (kind === 3) {
      const pool = LEX.nouns.filter(function (x) {
        return POINTABLE.indexOf(x.w) >= 0;
      });
      const n = U.pick(pool);
      /* 单数那半是「陷阱题」—— 答案就是括号里的词，孩子却容易手一滑写成复数；
         复数那半要真变形，所以多出一些。 */
      const a = AGREES[U.rand(3) === 0 ? (U.rand(2) === 0 ? 0 : 2) : (U.rand(2) === 0 ? 1 : 3)];
      const stmt = '用所给词的适当形式填空：\n' + a.t.replace('W', n.w);
      const right = a.one ? n.w : n.pl;
      const tip = a.one
        ? '后面是 is，说明只有一个，用单数 ' + n.w + '。不要被句子里别的复数名词带跑。'
        : '后面是 are，说明不止一个，用复数 ' + n.pl + '。';
      return Q.I(stmt, right, tip, 1);
    }

    /* ---------- ⑤ 纯词形：不适合造句的词（牙、脚、半、公斤） ---------- */
    const n = U.pick(LEX.nouns.filter(function (x) { return x.nf; }));
    const stmt = '“' + n.w + '”（' + n.cn + '）的复数形式是：';
    return Q.choice(stmt, n.pl, wrongPlurals(n), tipOf(n));
  }

  SM.register({
    id: 'noun',
    name: '名词复数',
    sub: 'watches / knives / children',
    ico: '📚',
    c1: '#8FD96A', c2: '#5FBF3C', cd: '#3E8F22',
    L: [
      { h: '什么时候用复数？', b: '东西不止一个，名词就要变复数。看到 two、three、many、some 这些词，后面的名词基本都要加 s。',
        e: [['two books', '两本书'], ['many apples', '很多苹果']] },
      { h: '规则① 一般直接加 s', b: '绝大部分名词直接加 s。',
        e: [['book → books', 'pen → pens'], ['boy → boys', 'day → days']] },
      { h: '规则② 加 es', b: '以 s、x、ch、sh 结尾的名词，加 es。',
        e: [['bus → buses', 'box → boxes'], ['watch → watches', 'brush → brushes']] },
      { h: '规则③ 变 y 为 i 再加 es', b: '辅音字母 + y 结尾，把 y 变成 i 再加 es。',
        e: [['city → cities', 'library → libraries'], ['toy → toys', '元音字母 + y，直接加 s']] },
      { h: '规则④ 变 f / fe 为 v 再加 es', b: 'knife、shelf、leaf、wolf 这类词要这样变。',
        e: [['knife → knives', 'shelf → shelves'], ['leaf → leaves', 'half → halves']] },
      { h: '规则⑤ 以 o 结尾', b: 'potato、tomato、hero 加 es；photo、piano、radio、zoo 只加 s。这一组最容易错。',
        e: [['potato → potatoes', 'tomato → tomatoes'], ['photo → photos', 'piano → pianos']] },
      { h: '不规则变化', b: '这几个没有规律，只能单独记。',
        e: [['child → children', 'mouse → mice'], ['tooth → teeth', 'foot → feet'], ['man → men', 'woman → women']] },
      { h: '单复数同形', b: 'sheep、fish、deer 单数和复数长得一样。',
        e: [['one sheep / two sheep', '一只羊 / 两只羊']] },
      { h: '单数还是复数，看后面的动词', b: '后面的动词是 has / is，前面就用单数；是 have / are，前面就用复数。不要看到 many 就以为前面的名词也要变复数。',
        e: [['The library has many books.', '图书馆（单数）里有很多书'], ['The libraries have many books.', '这些图书馆里有很多书']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
