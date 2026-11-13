/* ============================================================
   questions.js — PK 的题库（单词拼写 + 语法选择）
   ------------------------------------------------------------
   单词题：直接从闯关那套教材词库里抽（window.WORDS），
           给中文，让孩子拼英文。和背单词是同一条线。
           只取小学那四册（4A/4B/5A/5B）—— PK 是用来练的，
           不该突然蹦一个初中的长词把人噎住。
   语法题：复用首页那十几个语法模块（三单、否定、疑问、介词…），
           只取选择题 —— PK 要的是「看一眼就能点」，
           手写整句在倒计时里太劝退。

   出题节奏：约 6 成单词、4 成语法，同一个东西不连着出两次。
   ============================================================ */

/* 语法模块万一没加载成功（脚本顺序、缓存），也不能让 PK 直接哑火，
   这里留一小把兜底题。 */
const FALLBACK = [
  { q: 'He ___ football every day.', o: ['play', 'plays', 'playing', 'played'], a: 1, tip: '主语 he 是三单，动词加 s。' },
  { q: '___ you like apples?', o: ['Do', 'Does', 'Is', 'Are'], a: 0, tip: '主语 you，助动词用 do。' },
  { q: 'There ___ two cats under the tree.', o: ['is', 'are', 'be', 'am'], a: 1, tip: 'two cats 是复数，用 are。' },
  { q: 'She ___ go to school yesterday.', o: ['doesn\'t', 'didn\'t', 'don\'t', 'isn\'t'], a: 1, tip: 'yesterday 是过去时，用 didn\'t。' },
  { q: 'This is ___ orange.', o: ['a', 'an', 'the', '/'], a: 1, tip: 'orange 以元音音素开头，用 an。' },
  { q: 'Look! The children ___ in the park.', o: ['play', 'plays', 'are playing', 'is playing'], a: 2, tip: 'Look! 提示正在进行时。' },
  { q: 'My mother is a teacher. ___ works in a school.', o: ['He', 'She', 'It', 'They'], a: 1, tip: 'my mother 用 she 指代。' },
  { q: 'I have two ___.', o: ['box', 'boxs', 'boxes', 'boxies'], a: 2, tip: '以 x 结尾加 es。' },
  { q: '___ is your birthday? — It\'s in May.', o: ['What', 'When', 'Where', 'Who'], a: 1, tip: '问时间用 when。' },
  { q: 'He can ___ very fast.', o: ['runs', 'run', 'running', 'ran'], a: 1, tip: '情态动词 can 后面跟原形。' },
];

const BAD_CHARS = /[^\x20-\x7E]/;

/* 小学词表的上限：T1 四年级上 / T2 四年级下 / T3 五年级上 / T4 五年级下。
   T5 起是预初和初中，PK 里一律不出。 */
const MAX_TIER = 4;
/* 低年级词多给一点，孩子答得动，连击才攒得起来 */
const EASY_SHARE = 0.68;

function clean(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

export class QuestionBank {
  constructor() {
    this.words = [];
    this.easy = [];
    this.mods = [];
    this.recent = [];
    this.lastKind = '';
    this.gramPool = [];

    const all = window.WORDS || [];
    for (let i = 0; i < all.length; i++) {
      const w = all[i];
      if (!w || !w.w || !w.m) continue;
      const en = clean(w.w);
      /* 太短没意思、太长按不过来，中间这一段最合适；
         只收纯字母 —— 键盘上没有撇号和连字符，不该出这种词 */
      if (!/^[A-Za-z]{3,11}$/.test(en)) continue;
      const tier = w.tier || 1;
      if (tier > MAX_TIER) continue;
      const item = { en: en, cn: clean(w.m), pos: clean(w.p || ''), tier: tier };
      this.words.push(item);
      if (tier <= 2) this.easy.push(item);
    }

    const order = (window.SM && window.SM.order) || [];
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      if (id === 'mix') continue;
      const m = window.SM.modules[id];
      if (m && typeof m.gen === 'function') {
        /* 连 id 一起存：错题要按知识点归类，只留模块对象的话
           回到首页就只能说「你错了一道题」，说不到「错在三单」 */
        this.mods.push({ m: m, id: id });
        /* wh 放四份：卷子第 V 大题整道都是「对划线部分提问」，
           只占十四分之一的话一局下来才碰得到一两道，练不出手感。
           （实测两份时只占语法题的 3%，四份约 6~8%。） */
        if (id === 'wh') {
          this.mods.push({ m: m, id: id });
          this.mods.push({ m: m, id: id });
          this.mods.push({ m: m, id: id });
        }
      }
    }
  }

  get wordCount() { return this.words.length; }

  pickWord() {
    if (!this.words.length) return null;
    const pool = (this.easy.length && Math.random() < EASY_SHARE) ? this.easy : this.words;
    for (let tries = 0; tries < 40; tries++) {
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (this.recent.indexOf('w:' + w.en) >= 0) continue;
      return w;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  pickGrammar() {
    /* 先从模块里现生成，生成不出来再用兜底题 */
    if (this.mods.length && this.gramPool.length < 4) {
      const entry = this.mods[Math.floor(Math.random() * this.mods.length)];
      const m = entry.m, mid = entry.id;
      let list = [];
      try { list = m.gen(8) || []; } catch (e) { list = []; }
      for (let i = 0; i < list.length; i++) {
        const q = list[i];
        if (!q || q.t !== 'c' || !q.o || q.o.length < 3) continue;
        if (q.o.length > 4) continue;
        const prompt = clean(q.q);
        if (!prompt || prompt.length > 70) continue;
        /* 选项长度上限 40：
           卡片是两列网格，长选项会自动换行折成两行；
           原来 26 会把「对划线部分提问」的完整问句全挡在门外
           （Where does Tom play football? 就有 29 个字符），
           34 也还不够 —— How do the students go to the museum? 有 39。 */
        const okOpts = q.o.every(function (o) {
          const s = clean(o);
          return s && s.length <= 40 && !BAD_CHARS.test(s);
        });
        if (!okOpts) continue;
        const fp = 'g:' + prompt + '|' + clean(q.o[q.a]);
        if (this.recent.indexOf(fp) >= 0) continue;
        if (this.gramPool.some(function (x) { return x.fp === fp; })) continue;
        this.gramPool.push({
          fp: fp,
          q: prompt,
          o: q.o.map(clean),
          a: q.a,
          tip: clean(q.tip || ''),
          mid: mid,
        });
      }
    }

    if (this.gramPool.length) {
      const idx = Math.floor(Math.random() * this.gramPool.length);
      const q = this.gramPool.splice(idx, 1)[0];
      this.recent.push(q.fp);
      return q;
    }

    const f = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    return { fp: 'g:' + f.q, q: f.q, o: f.o.slice(), a: f.a, tip: f.tip, mid: 'mix' };
  }

  next() {
    /* 不连着出同一种题型，孩子不至于一直敲键盘 */
    const wantWord = this.lastKind === 'gram' ? true
      : this.lastKind === 'word' ? false
        : Math.random() < 0.6;

    if (wantWord) {
      const w = this.pickWord();
      if (w) {
        this.lastKind = 'word';
        this.recent.push('w:' + w.en);
        this.trim();
        return { kind: 'word', cn: w.cn, pos: w.pos, answer: w.en.toLowerCase() };
      }
    }

    const g = this.pickGrammar();
    this.lastKind = 'gram';
    this.trim();
    return { kind: 'gram', prompt: g.q, options: g.o, answer: g.a, tip: g.tip, mid: g.mid || 'mix' };
  }

  trim() {
    while (this.recent.length > 36) this.recent.shift();
  }
}
