/* ============================================================
   math/modules.js — 数学出题器
   ------------------------------------------------------------
   四上能用生成器稳定产出的四类：
     1. 口算（加、减、乘、除、混合）
     2. 单位换算（长度、质量、面积、时间、人民币）
     3. 大数（写数、数位、近似数、组数）
     4. 运算定律（简便计算、识别定律）

   每道题都带 steps：孩子先在草稿纸上算，只填最终结果；答完再
   逐步揭示。判分只看结果，但账记在「技能点」上，不记在某道题上。
   ============================================================ */
(function (SM) {
  'use strict';

  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = x[i]; x[i] = x[j]; x[j] = t;
    }
    return x;
  }
  function comma(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /** 按数位拆开，给「逐步揭示」用 */
  function splitAdd(a, b) {
    const h = Math.floor(b / 100) * 100;
    const t = Math.floor((b % 100) / 10) * 10;
    const o = b % 10;
    const out = [];
    let cur = a;
    if (h) { out.push(cur + ' + ' + h + ' = ' + (cur + h)); cur += h; }
    if (t) { out.push(cur + ' + ' + t + ' = ' + (cur + t)); cur += t; }
    if (o) { out.push(cur + ' + ' + o + ' = ' + (cur + o)); cur += o; }
    return out;
  }

  /* ============================================================
     1. 口算
     ============================================================ */
  const CALC = { id: 'ma_calc', name: '口算', sub: '加 · 减 · 乘 · 除 · 混合', ico: '＋', skills: [] };

  function addQ() {
    const a = ri(120, 869);
    const b = ri(30, 999 - a);
    const ans = a + b;
    return {
      t: 'n',
      q: a + ' + ' + b + ' = ______',
      a: String(ans),
      steps: splitAdd(a, b),
      tip: '相同数位对齐，从个位加起。',
      skill: 'ma.calc.add3'
    };
  }

  function subQ() {
    const a = ri(300, 999);
    const b = ri(30, a - 50);
    return {
      t: 'n',
      q: a + ' − ' + b + ' = ______',
      a: String(a - b),
      steps: [
        '先减整百：' + a + ' − ' + (Math.floor(b / 100) * 100) + ' = ' + (a - Math.floor(b / 100) * 100),
        '再减剩下的：' + (a - Math.floor(b / 100) * 100) + ' − ' + (b % 100) + ' = ' + (a - b)
      ],
      tip: '不够减时向前一位借 1 当 10。',
      skill: 'ma.calc.sub3'
    };
  }

  function mulQ() {
    const b = ri(3, 9);
    const a = Math.random() < 0.55 ? ri(12, 49) : ri(102, 899);
    const ans = a * b;
    const tens = Math.floor(a / 10) * 10;
    const ones = a % 10;
    return {
      t: 'n',
      q: a + ' × ' + b + ' = ______',
      a: String(ans),
      steps: [
        tens + ' × ' + b + ' = ' + (tens * b),
        ones + ' × ' + b + ' = ' + (ones * b),
        (tens * b) + ' + ' + (ones * b) + ' = ' + ans
      ],
      tip: '拆成整十数 + 个位，分别乘再相加。',
      skill: 'ma.calc.mul'
    };
  }

  function divQ() {
    const b = ri(3, 9);
    let q = ri(12, 120);
    if (q % 10 === 0 && Math.random() < 0.7) q = q / 10;
    const a = b * q;
    let steps;
    if (q >= 10 && q % 10 === 0) {
      steps = [
        '先算 ' + (q / 10) + ' × ' + b + ' = ' + (a / 10),
        '再在末尾补一个 0：' + (a / 10) + ' × 10 = ' + a,
        '所以 ' + a + ' ÷ ' + b + ' = ' + q
      ];
    } else {
      steps = [
        '想：' + b + ' × ' + q + ' = ' + a,
        '所以 ' + a + ' ÷ ' + b + ' = ' + q
      ];
    }
    return {
      t: 'n',
      q: a + ' ÷ ' + b + ' = ______',
      a: String(q),
      steps: steps,
      tip: '除法是乘法的逆运算，先想乘法口诀。',
      skill: 'ma.calc.div'
    };
  }

  function mixedQ() {
    const kind = ri(1, 3);
    if (kind === 1) {
      const a = ri(20, 90), b = ri(3, 9), c = ri(4, 9);
      return {
        t: 'n',
        q: a + ' + ' + b + ' × ' + c + ' = ______',
        a: String(a + b * c),
        steps: ['先算乘法：' + b + ' × ' + c + ' = ' + (b * c), '再算加法：' + a + ' + ' + (b * c) + ' = ' + (a + b * c)],
        tip: '先乘除，后加减。',
        skill: 'ma.calc.mixed'
      };
    }
    if (kind === 2) {
      const a = ri(10, 40), b = ri(5, 30), c = ri(2, 6);
      return {
        t: 'n',
        q: '(' + a + ' + ' + b + ') × ' + c + ' = ______',
        a: String((a + b) * c),
        steps: ['先算括号：' + a + ' + ' + b + ' = ' + (a + b), '再算乘法：' + (a + b) + ' × ' + c + ' = ' + (a + b) * c],
        tip: '有括号先算括号里的。',
        skill: 'ma.calc.mixed'
      };
    }
    const a = ri(12, 30), b = ri(2, 9), c = ri(10, 60);
    return {
      t: 'n',
      q: a + ' × ' + b + ' − ' + c + ' = ______',
      a: String(a * b - c),
      steps: ['先算乘法：' + a + ' × ' + b + ' = ' + (a * b), '再算减法：' + (a * b) + ' − ' + c + ' = ' + (a * b - c)],
      tip: '先乘除，后加减。',
      skill: 'ma.calc.mixed'
    };
  }

  CALC.skills = [
    { id: 'ma.calc.add3', name: '三位数加法', gen: addQ },
    { id: 'ma.calc.sub3', name: '三位数减法', gen: subQ },
    { id: 'ma.calc.mul', name: '乘法', gen: mulQ },
    { id: 'ma.calc.div', name: '除法', gen: divQ },
    { id: 'ma.calc.mixed', name: '混合运算', gen: mixedQ }
  ];

  /* ============================================================
     2. 单位换算
     ============================================================ */
  const UNIT = { id: 'ma_unit', name: '单位换算', sub: '长度 · 质量 · 面积 · 时间 · 人民币', ico: '⇄', skills: [] };

  const UNITS = {
    'ma.unit.len': {
      name: '长度换算',
      pairs: [
        ['千米', '米', 1000], ['米', '分米', 10], ['分米', '厘米', 10],
        ['厘米', '毫米', 10], ['米', '厘米', 100]
      ]
    },
    'ma.unit.mass': {
      name: '质量换算',
      pairs: [['吨', '千克', 1000], ['千克', '克', 1000]]
    },
    'ma.unit.area': {
      name: '面积换算',
      pairs: [['平方米', '平方分米', 100], ['平方分米', '平方厘米', 100],
        ['平方千米', '公顷', 100], ['公顷', '平方米', 10000]]
    },
    'ma.unit.time': {
      name: '时间换算',
      pairs: [['时', '分', 60], ['分', '秒', 60], ['日', '时', 24]]
    },
    'ma.unit.money': {
      name: '人民币换算',
      pairs: [['元', '角', 10], ['角', '分', 10]]
    }
  };

  function unitQ(skill) {
    const info = UNITS[skill];
    const p = pick(info.pairs);
    const from = p[0], to = p[1], f = p[2];
    const n = f >= 1000 ? ri(1, 9) : ri(1, 30);
    if (Math.random() < 0.5) {
      const ans = n * f;
      return {
        t: 'n',
        q: n + from + ' = ______ ' + to,
        a: String(ans),
        steps: ['1' + from + ' = ' + f + to, n + '个' + f + '是' + comma(ans) + '，所以是 ' + comma(ans) + to + '。'],
        tip: '大单位换小单位，乘进率。',
        skill: skill
      };
    }
    const big = n * f;
    return {
      t: 'n',
      q: comma(big) + to + ' = ______ ' + from,
      a: String(n),
      steps: ['1' + from + ' = ' + f + to, comma(big) + to + '里有' + n + '个' + f + to + '，所以是 ' + n + from + '。'],
      tip: '小单位换大单位，除以进率。',
      skill: skill
    };
  }

  Object.keys(UNITS).forEach(function (k) {
    UNIT.skills.push({
      id: k,
      name: UNITS[k].name,
      gen: function () { return unitQ(k); }
    });
  });

  /* ============================================================
     3. 大数
     ============================================================ */
  const BIG = { id: 'ma_big', name: '大数', sub: '读写 · 数位 · 近似数 · 组数', ico: '亿', skills: [] };

  function bigReadQ() {
    const kind = ri(1, 2);
    if (kind === 1) {
      const wan = ri(20, 980);
      const ge = ri(0, 9999);
      const n = wan * 10000 + ge;
      const cn = numberToCN(n);
      return {
        t: 'n',
        q: '“' + cn + '”写作 ______',
        a: String(n),
        steps: ['分级：' + cn, '先写万级，再写个级，哪一位上一个单位也没有就写 0。'],
        tip: '从高位写起，四位一级。',
        skill: 'ma.num.read'
      };
    }
    const n = ri(100000, 99999999);
    const opts = shuffle([String(n), String(n + 1000), String(n + 100), String(n - 10)]);
    return {
      t: 'c',
      q: '下面哪个数读作“' + numberToCN(n) + '”？',
      o: opts,
      a: opts.indexOf(String(n)),
      steps: ['分级读：先读万级，再读个级。'],
      tip: '每级末尾的 0 不读，中间连续的 0 只读一个零。',
      skill: 'ma.num.read'
    };
  }

  function numberToCN(n) {
    const D = '零一二三四五六七八九';
    const U = ['', '十', '百', '千'];
    function four(x) {
      let s = '';
      let zero = false;
      for (let i = 3; i >= 0; i--) {
        const d = Math.floor(x / Math.pow(10, i)) % 10;
        if (d === 0) { if (s) zero = true; continue; }
        if (zero && s) s += '零';
        zero = false;
        s += D[d] + U[i];
      }
      return s;
    }
    const yi = Math.floor(n / 100000000);
    const wan = Math.floor(n / 10000) % 10000;
    const ge = n % 10000;
    let s = '';
    if (yi) s += four(yi) + '亿';
    if (wan) {
      if (s && wan < 1000) s += '零';
      s += four(wan) + '万';
    } else if (s && ge) {
      s += '零';
    }
    if (ge) {
      /* 万级有数、个级不足四位时要补「零」：二十万零五 */
      if (s && ge < 1000) s += '零';
      s += four(ge);
    }
    return s.replace(/^一十/, '十');
  }

  function bigDigitQ() {
    const n = ri(10000000, 99999999);
    const pos = ri(1, 8);
    const names = ['个位', '十位', '百位', '千位', '万位', '十万位', '百万位', '千万位'];
    const correct = names[pos - 1];
    const opts = shuffle([correct, names[(pos + 1) % 8], names[(pos + 4) % 8], names[(pos + 6) % 8]]);
    return {
      t: 'c',
      q: '在 ' + comma(n) + ' 中，从右往左数第 ' + pos + ' 位是什么位？',
      o: opts,
      a: opts.indexOf(correct),
      steps: ['从右往左：个、十、百、千、万、十万、百万、千万。'],
      tip: '先四位一分级。',
      skill: 'ma.num.digit'
    };
  }

  function bigRoundQ() {
    const n = ri(10, 99) * 10000 + ri(0, 9999);
    const ans = Math.round(n / 10000);
    return {
      t: 'n',
      q: '把 ' + comma(n) + ' 省略万位后面的尾数，约是 ______ 万',
      a: String(ans),
      steps: ['看千位：' + Math.floor(n / 1000) % 10, '千位≥5 就向万位进 1，否则舍去。'],
      tip: '四舍五入看千位。',
      skill: 'ma.num.round'
    };
  }

  function bigMakeQ() {
    const digits = shuffle([1, 2, 3, 5, 7, 8]).slice(0, 4);
    const max = parseInt(digits.slice().sort(function (a, b) { return b - a; }).join(''), 10);
    return {
      t: 'n',
      q: '用 ' + digits.join('、') + ' 组成最大的四位数是 ______',
      a: String(max),
      steps: ['把数字从大到小排：' + digits.slice().sort(function (a, b) { return b - a; }).join('、')],
      tip: '高位放大的数字。',
      skill: 'ma.num.make'
    };
  }

  BIG.skills = [
    { id: 'ma.num.read', name: '大数读写', gen: bigReadQ },
    { id: 'ma.num.digit', name: '数位判断', gen: bigDigitQ },
    { id: 'ma.num.round', name: '近似数', gen: bigRoundQ },
    { id: 'ma.num.make', name: '组数', gen: bigMakeQ }
  ];

  /* ============================================================
     4. 运算定律
     ============================================================ */
  const LAW = { id: 'ma_law', name: '运算定律', sub: '简便计算 · 定律识别', ico: '律', skills: [] };

  function lawCombineQ() {
    const n = pick([25, 125]);
    const k = n === 25 ? 4 : 8;
    const extra = pick([1, 2, 3, 5]);
    const ans = n * k * extra;
    return {
      t: 'n',
      q: n + ' × ' + k + ' × ' + extra + ' = ______',
      a: String(ans),
      steps: [
        n + ' × ' + k + ' = ' + (n * k) + '（凑整）',
        (n * k) + ' × ' + extra + ' = ' + ans
      ],
      tip: '25×4=100，125×8=1000，先凑整。',
      skill: 'ma.law.combine'
    };
  }

  function lawDistribQ() {
    const kind = ri(1, 4);
    if (kind === 1) {
      const a = pick([25, 125]);
      const b = ri(2, 8) * 10;
      const c = ri(2, 9);
      return {
        t: 'n',
        q: a + ' × (' + b + ' + ' + c + ') = ______',
        a: String(a * (b + c)),
        steps: [a + ' × ' + b + ' = ' + (a * b), a + ' × ' + c + ' = ' + (a * c), (a * b) + ' + ' + (a * c) + ' = ' + (a * (b + c))],
        tip: '乘法分配律：分别乘，再相加。',
        skill: 'ma.law.distrib'
      };
    }
    if (kind === 2) {
      const a = pick([25, 125]);
      const b = ri(2, 8) * 10;
      const c = ri(1, 9);
      return {
        t: 'n',
        q: a + ' × (' + b + ' − ' + c + ') = ______',
        a: String(a * (b - c)),
        steps: [a + ' × ' + b + ' = ' + (a * b), a + ' × ' + c + ' = ' + (a * c), (a * b) + ' − ' + (a * c) + ' = ' + (a * (b - c))],
        tip: '分配律也适用于减法。',
        skill: 'ma.law.distrib'
      };
    }
    if (kind === 3) {
      const a = pick([25, 125]);
      const b = ri(2, 9);
      return {
        t: 'n',
        q: '99 × ' + a + ' + ' + a + ' = ______',
        a: String(100 * a),
        steps: ['99 个 ' + a + ' 加 1 个 ' + a + '，一共 100 个 ' + a + '。', '100 × ' + a + ' = ' + (100 * a)],
        tip: '把 99 个和 1 个合成 100 个。',
        skill: 'ma.law.distrib'
      };
    }
    const a = pick([25, 36, 45]);
    return {
      t: 'n',
      q: '101 × ' + a + ' − ' + a + ' = ______',
      a: String(100 * a),
      steps: ['101 个 ' + a + ' 减 1 个 ' + a + '，还剩 100 个 ' + a + '。', '100 × ' + a + ' = ' + (100 * a)],
      tip: '先数一数有几个 ' + a + '。',
      skill: 'ma.law.distrib'
    };
  }

  function lawIdentifyQ() {
    const right = '25 × (4 + 8) = 25 × 4 + 25 × 8';
    const opts = shuffle([
      right,
      '25 × 4 × 8 = 25 × (4 × 8)',
      '25 + 4 + 8 = 25 + (4 + 8)',
      '25 × 4 + 8 = 25 × (4 + 8)'
    ]);
    return {
      t: 'c',
      q: '下面哪一道用了乘法分配律？',
      o: opts,
      a: opts.indexOf(right),
      steps: ['分配律：一个数乘两个数的和，等于分别乘再相加。'],
      tip: '看有没有“分别乘，再加起来”。',
      skill: 'ma.law.identify'
    };
  }

  LAW.skills = [
    { id: 'ma.law.combine', name: '凑整简算', gen: lawCombineQ },
    { id: 'ma.law.distrib', name: '乘法分配律', gen: lawDistribQ },
    { id: 'ma.law.identify', name: '定律识别', gen: lawIdentifyQ }
  ];

  [CALC, UNIT, BIG, LAW].forEach(function (m) { SM.subj.add('ma', m); });

})(window.SM);
