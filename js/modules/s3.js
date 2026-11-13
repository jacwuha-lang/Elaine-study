/* ============================================================
   modules/s3.js — 第三人称单数
   生成策略：随机主语(he/she/it) × 随机动词 × 随机时间状语
            四种题型随机：选择 / 填空 / 改写 / 词块
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, LEX = SM.LEX, M = SM.M, Q = SM.quiz;

  const ADV_CN = {
    'every day': '每天', 'every morning': '每天早上', 'every evening': '每天晚上',
    'after school': '放学后', 'on Sundays': '每周日', 'every weekend': '每个周末',
    'every night': '每天晚上',
    /* 状态动词自带的状语：like music very much → 很喜欢音乐 */
    'very much': '很', 'a lot': '很'
  };

  /* 三单变化规则的中文说明 */
  function tipOf(v) {
    const s3 = M.s3(v);
    if (v === 'have') return 'have 的三单形式是 has，要单独记住。';
    if (v === 'go') return '以 o 结尾加 es → goes。';
    if (v === 'do') return '以 o 结尾加 es → does。';
    if (/(sh|ch)$/.test(v)) return '以 ' + v.slice(-2) + ' 结尾加 es → ' + s3 + '。';
    if (/[sxz]$/.test(v)) return '以 ' + v.slice(-1) + ' 结尾加 es → ' + s3 + '。';
    if (/[^aeiou]y$/.test(v)) return '辅音字母 + y 结尾，把 y 变成 i 再加 es → ' + s3 + '。';
    return '一般情况直接加 s → ' + s3 + '。';
  }

  function thirdPerson() {
    const pool = LEX.subjects.filter(function (x) { return x.p === 'he' || x.p === 'she' || x.p === 'it'; });
    return U.pick(pool);
  }

  function gen() {
    const p3 = thirdPerson();
    /* 主语可能是一个人、一只猫、一辆车 —— 动词要挑得对得上，
       否则会出现「那只猫打篮球」这种讲不通的句子 */
    const v = U.pick(LEX.verbsFor(p3));
    /* 状语也得跟动词配：likes / has 是状态动词，配「每个周末」讲不通。
       advsFor 可能返回空数组（have 表拥有），这时句子就不带状语。 */
    const advs = LEX.advsFor(p3.k, p3, v);
    const adv = advs.length ? U.pick(advs) : '';
    const tail = adv ? ' ' + adv : '';
    const s3 = M.s3(v.b);
    const obj3 = LEX.objFor(v, p3);
    const objI = M.fillPoss(v.obj, 'i');
    const tip = tipOf(v.b);
    const kind = U.rand(4);

    /* ① 选择题：Tom ___ football every day. */
    if (kind === 0) {
      const stmt = p3.s + ' ___ ' + obj3 + tail + '.';
      /* 过去式只有当句子被时间状语「钉住」时才是错的。
         「My mother ___ apples a lot.」没有时间状语，填 liked
         （我妈妈以前很喜欢苹果）语法上完全成立 —— 等于给了两个正确答案。 */
      const anchored = /\b(every|on|after)\b/i.test(adv);
      const wrongs = [v.b, M.ing(v.b)];
      if (anchored) {
        wrongs.push(M.past(v.b));
        /* read 的过去式和原形同形，会被 Q.choice 当重复项丢掉，补个不定式顶上 */
        if (U.norm(M.past(v.b)) === U.norm(v.b)) wrongs.push('to ' + v.b);
      } else {
        /* 没钉住的时候不能给过去式，也不能只给 to like / liking ——
           两个都是非谓语，词性一眼就看出来，孩子直接排除，
           四个选项里只剩 like 一个真干扰，等于三选一。
           换成「is + 原形」：中文「他是喜欢画画」式的错误，
           小学生真会这么写，而且任何情况下都不成立。 */
        wrongs.push('is ' + v.b);
      }
      return Q.choice(stmt, s3, wrongs, tip);
    }

    /* ② 填空题：Tom ___ (play) football every day. */
    if (kind === 1) {
      const stmt = '用所给词的正确形式填空：\n' + p3.s + ' ___ (' + v.b + ') ' + obj3 + tail + '.';
      return Q.I(stmt, s3, tip, 1);
    }

    /* ③ 改写题：I play... → 主语换成 Tom */
    if (kind === 2) {
      /* 打底句的主语不能一律用 I。
         物品类动词用 I 会造出「I have many seats.」（我有很多座位）这种病句 ——
         公交车才有很多座位，人没有。物品改用 They 打底：
           They have many seats. → The bus has many seats.
         既讲得通，又保住了「复数变三单」这个考点。
         用 It 打底是错的 —— 「It come at seven」本身就不对。 */
      const isThing = p3.k === 't';
      const baseSubj = isThing ? 'They' : 'I';
      const baseObj = isThing ? v.obj : objI;
      const base = baseSubj + ' ' + v.b + ' ' + baseObj + tail + '.';
      const ans = p3.s + ' ' + s3 + ' ' + obj3 + tail + '.';
      return Q.I('把主语换成 “' + p3.s + '”，改写句子：\n' + base, ans,
        '主语变成第三人称单数后，动词要加 s/es。' + tip);
    }

    /* ④ 词块题：点词块拼出正确句子 */
    const ans = p3.s + ' ' + s3 + ' ' + obj3 + tail + '.';
    const prompt = '点词块，拼出这句话：\n' + p3.cn + advCn(adv) + v.cn;
    return Q.fromBank(prompt, ans, tip);
  }

  function advCn(a) { return ADV_CN[a] ? ADV_CN[a] : ''; }

  SM.register({
    id: 's3',
    name: '第三人称单数',
    sub: '动词加 s / es',
    ico: '🔤',
    c1: '#FFA05C', c2: '#FF7A3D', cd: '#D45A22',
    L: [
      { h: '什么时候用三单？', b: '主语是 he / she / it，或者一个人、一样东西（Tom、my mother、the cat），动词就要用三单形式。',
        e: [['He plays football.', '他踢足球。'], ['My mother works in a hospital.', '我妈妈在医院工作。']] },
      { h: '规则① 一般直接加 s', b: '绝大部分动词直接加 s。',
        e: [['play → plays', 'like → likes'], ['read → reads', 'run → runs']] },
      { h: '规则② 加 es', b: '以 s、x、sh、ch、o 结尾的动词，加 es。',
        e: [['watch → watches', 'go → goes'], ['do → does', 'wash → washes']] },
      { h: '规则③ 变 y 为 i 再加 es', b: '辅音字母 + y 结尾，把 y 变成 i 再加 es。',
        e: [['study → studies', 'fly → flies'], ['play → plays', '元音字母 + y，直接加 s']] },
      { h: '特殊：have → has', b: 'have 的三单形式是 has，要单独记住。',
        e: [['She has a cat.', '她有一只猫。'], ['He has two sisters.', '他有两个姐妹。']] },
      { h: '三单的疑问和否定：请 does 帮忙', b: '变成疑问句或否定句时用 does，原来加了 s 的动词要「还原」成原形。',
        e: [['Does he like apples?', '✔ 不是 Does he likes apples?'], ['He doesn\'t go to school.', '✔ 不是 He doesn\'t goes to school.']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
