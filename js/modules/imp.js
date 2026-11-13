/* ============================================================
   modules/imp.js — 祈使句
   肯定 / 否定 / be 动词 / Let's，四种题型随机
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, Q = SM.quiz;

  function gen() {
    const kind = U.rand(5);

    /* ① 肯定祈使句 */
    if (kind === 0) {
      const a = U.pick(LEX.impYes);
      const stmt = 'You ' + a.v + '.';
      const ans = U.cap(a.v) + '.';
      const tip = '祈使句去掉主语 you，动词用原形开头。';
      if (U.rand(2) === 0) return Q.I('改成祈使句：\n' + stmt, ans, tip);
      return Q.fromBank('改成祈使句：\n' + stmt, ans, tip);
    }

    /* ② 否定祈使句 */
    if (kind === 1) {
      const a = U.pick(LEX.impNo);
      const stmt = 'You ' + a.v + '.';
      const ans = 'Don\'t ' + a.v + '.';
      const tip = '否定祈使句用 Don\'t + 动词原形，主语 you 不写出来。';
      if (U.rand(2) === 0) return Q.I('改成否定祈使句：\n' + stmt, ans, tip);
      return Q.fromBank('改成否定祈使句：\n' + stmt, ans, tip);
    }

    /* ③ be 动词祈使句（肯定 / 否定） */
    if (kind === 2) {
      const neg = U.rand(2) === 0;
      /* 肯定句和否定句得从两个池子里挑，混用会出反常识的句子：
           Be careful! ✓        Don't be careful. ✗（教孩子「不要小心」）
           Don't be late. ✓      Be late. ✗ */
      const b = U.pick(neg ? LEX.impBeNeg : LEX.impBePos);
      const stmt = 'You are ' + b.v + '.';
      const ans = neg ? 'Don\'t be ' + b.v + '.' : 'Be ' + b.v + '.';
      const tip = neg
        ? 'be 动词的否定祈使句用 Don\'t be。'
        : 'be 动词的祈使句用 Be 开头。';
      return Q.I((neg ? '改成否定祈使句：\n' : '改成祈使句：\n') + stmt, ans, tip);
    }

    /* ④ 选词填空 */
    if (kind === 3) {
      const which = U.rand(3);
      if (which === 0) {
        const b = U.pick(LEX.impBePos);
        return Q.choice('___ ' + b.v + '!', 'Be', ['Are', 'Do', 'Is'], '祈使句的 be 动词用 Be 开头。');
      }
      if (which === 1) {
        const a = U.pick(LEX.impNo);
        return Q.choice('___ ' + a.v + '.', 'Don\'t', ['Not', 'Doesn\'t', 'No'], '否定祈使句用 Don\'t + 动词原形。');
      }
      /* Let us 后面的动作不能带 your / me ——
         「Let us put on your coat」主语是 us 却配 your，人称打架；
         「Let us listen to me」更绕。挑干净的动作。 */
      const letPool = LEX.impYes.filter(function (x) { return !/your|\bme\b/i.test(x.v); });
      const a = U.pick(letPool.length ? letPool : LEX.impYes);
      /* 考点是 Let's = Let us，答案写 Let's。
         小学阶段教的就是 Let's，而且「Let us sit down, please.」意思偏向
         「请允许我们坐下」，跟「我们坐下吧」不是一个语气。
         干扰项三种都是孩子真会写的错：
           Let we      主格代替宾格
           Let us to   多加了 to
           Let's us    多此一举
         注意不能同时出现 Let us 和 Let's —— 两个都对。 */
      return Q.choice('___ ' + a.v + ', please.', 'Let\'s',
        ['Let we', 'Let us to', 'Let\'s us'],
        'Let\'s = Let us，表示「我们一起……吧」，us 是宾格。');
    }

    /* ⑤ 词块：用祈使句说一句话 */
    const a = U.pick(LEX.impYes);
    const ans = U.cap(a.v) + ', please.';
    return Q.fromBank('用祈使句说：' + a.cn, ans, '祈使句动词原形开头，please 放句尾更礼貌。');
  }

  SM.register({
    id: 'imp',
    name: '祈使句',
    sub: '动词原形开头 / Don\'t',
    ico: '👉',
    c1: '#5FDCB0', c2: '#22C79A', cd: '#0F9A75',
    L: [
      { h: '什么是祈使句？', b: '表示命令、请求、建议的句子。主语 you 通常不写出来，动词用原形开头。',
        e: [['Open the door.', '打开门。'], ['Sit down, please.', '请坐下。']] },
      { h: '否定祈使句：Don\'t + 动词原形', b: '在动词前面加 Don\'t（= Do not）。',
        e: [['Don\'t run in the classroom.', '不要在教室里跑。'], ['Don\'t be late.', '不要迟到。']] },
      { h: 'be 动词的祈使句', b: '用 Be 开头，否定用 Don\'t be。',
        e: [['Be careful!', '小心！'], ['Don\'t be sad.', '别难过。']] },
      { h: 'please 让语气更礼貌', b: 'please 可以放句首，也可以放句尾（前面加逗号）。',
        e: [['Please come in.', '请进。'], ['Close the window, please.', '请关上窗户。']] },
      { h: 'Let\'s 也是祈使句', b: 'Let\'s = Let us，表示「我们一起……吧」。',
        e: [['Let\'s go to the park.', '我们去公园吧。']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
