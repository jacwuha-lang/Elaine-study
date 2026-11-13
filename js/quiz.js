/* ============================================================
   quiz.js — 题目构造 / 去重生成 / 干扰项 / 题干指纹
   题目结构：
     { t:'c', q, o:[...], a:index, tip }        选择题
     { t:'i', q, a:[...], tip, s:0|1 }          手写题（s=1 表示只填单词）
     { t:'b', q, tok:[...], a:[...], tip }      词块组句
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U;
  const Q = {};

  /** 选择题 */
  Q.C = function (q, opts, answerIdx, tip) {
    return { t: 'c', q: q, o: opts, a: answerIdx, tip: tip };
  };

  /** 手写题 */
  Q.I = function (q, answers, tip, short) {
    return { t: 'i', q: q, a: Array.isArray(answers) ? answers : [answers], tip: tip, s: short ? 1 : 0 };
  };

  /** 词块题 */
  Q.B = function (q, tokens, answers, tip) {
    return { t: 'b', q: q, tok: tokens, a: Array.isArray(answers) ? answers : [answers], tip: tip };
  };

  /** 题干指纹，用于记录「这题错过几次」 */
  Q.fp = function (q) {
    let h = 0;
    const s = q.q + '|' + (q.t === 'c' ? q.o[q.a] : (q.a && q.a[0] || ''));
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return (h >>> 0).toString(36);
  };

  /** 去重生成 n 道题 */
  Q.uniq = function (n, genFn) {
    const seen = Object.create(null);
    const out = [];
    let guard = 0;
    const limit = n * 80;
    while (out.length < n && guard++ < limit) {
      let q = null;
      try { q = genFn(); } catch (e) { q = null; }
      if (!q) continue;
      const key = Q.fp(q);
      if (seen[key]) continue;
      seen[key] = 1;
      out.push(q);
    }
    return out;
  };

  /**
   * 构造选择题：正确项 + 干扰项，自动打乱
   * @param {string} q      题干
   * @param {string} right  正确答案
   * @param {string[]} wrongs 候选干扰项（取前 3 个不同的）
   * @param {string} tip    讲解
   */
  Q.choice = function (q, right, wrongs, tip) {
    const opts = [right];
    const used = Object.create(null);
    used[U.norm(right)] = 1;
    for (let i = 0; i < wrongs.length && opts.length < 4; i++) {
      const w = wrongs[i];
      if (!w) continue;
      const k = U.norm(w);
      if (used[k]) continue;      // 规范化后重复的干扰项直接丢掉
      used[k] = 1;
      opts.push(w);
    }
    // 兜底：绝不塞占位符。干扰项不够就少一个选项，三选一照样能做。
    if (opts.length < 3) {
      console.warn('[quiz] 干扰项不足：' + q + ' → ' + opts.join(' / '));
    }
    const order = U.shuffle(opts);
    return Q.C(q, order, order.indexOf(right), tip);
  };

  /** 从池子里挑 n 个不等于 correct 的干扰项 */
  Q.distract = function (correct, pool, n) {
    const out = [];
    const used = Object.create(null);
    used[U.norm(correct)] = 1;
    const arr = U.shuffle(pool);
    for (let i = 0; i < arr.length && out.length < (n || 3); i++) {
      const k = U.norm(arr[i]);
      if (used[k]) continue;
      used[k] = 1;
      out.push(arr[i]);
    }
    return out;
  };

  /** 标点块：句号、问号这些单独成块，让孩子自己放到句尾 */
  const PUNC = /^[.?!,;:]+$/;

  /** 把句子切成词块（保留 don't / it's 这类缩写为一个块）
      句尾的 . ? ! 单独切成一块 —— 不然拼出来的句子没有标点，
      看着就不是一句完整的话。 */
  Q.tokenize = function (sentence) {
    const s = String(sentence || '').trim();
    const m = s.match(/[.?!]+$/);
    const body = m ? s.slice(0, s.length - m[0].length) : s;
    const toks = body.split(/\s+/).filter(Boolean);
    if (m) toks.push(m[0]);
    return toks;
  };

  /** 词块拼回句子：标点不占前面的空格 */
  Q.joinTokens = function (tokens) {
    let out = '';
    tokens.forEach(function (t) {
      if (PUNC.test(t)) out += t;
      else out += (out ? ' ' : '') + t;
    });
    return out;
  };

  /** 词块题判分：逐块比对。
      单词按 U.norm 比（不管大小写、缩写），标点必须一模一样 ——
      「句号放没放」正是这道题要考的。 */
  Q.sameTokens = function (answer, picked) {
    const a = Q.tokenize(answer);
    if (a.length !== picked.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = picked[i];
      if (PUNC.test(x) || PUNC.test(y)) {
        if (x !== y) return false;
      } else if (U.norm(x) !== U.norm(y)) {
        return false;
      }
    }
    return true;
  };

  /** 生成词块题：答案 → 词块 */
  Q.fromBank = function (prompt, answer, tip) {
    const tokens = Q.tokenize(answer);
    return Q.B(prompt, tokens, [answer], tip);
  };

  SM.quiz = Q;

})(window.SM);
