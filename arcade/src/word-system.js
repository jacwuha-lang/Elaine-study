/* 词池选择、掌握度和错词回流。 */
(function (global) {
  'use strict';
  global.createArcadeWordSystem = function (d) {
  var S = d.S, ARCADE = d.ARCADE, arcOn = d.arcOn, WORDS = d.WORDS, MAX_LEVEL = d.MAX_LEVEL, FORCE_WORDS = d.FORCE_WORDS;
  /* ---------------- 词 ---------------- */
  /* 词池：一关内同一单词只出一次（打完的怪也不会把词还回池子）
     洗完一叠按顺序抽，抽空才重洗，重洗优先挑本关没用过的词 */
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------------- 词库分层：按年级段对到关卡上 ----------------
     对齐沪教牛津版（三起）小学到初中：
     T1 四年级上册(4A) / T2 四年级下册(4B) / T3 五年级(5A-5B) / T4 五年级进阶
     T5 六年级(6A-6B) / T6 初一(7A-7B) / T7 初二(8A-8B) / T8 初三(9A-9B·中考)
     注：1–20 关不走这里，走 unitsFor() —— 一关一个教材单元。 */
  function tiersFor(lv) {
    var n = Math.max(1, Math.min(MAX_LEVEL, lv | 0));
    if (n <= 10) return [{ t: 1, w: 1 }];                   /* 四年级上册 */
    if (n <= 20) return [{ t: 2, w: 1 }];                   /* 四年级下册 */
    if (n <= 30) return [{ t: 3, w: 3 }, { t: 4, w: 1 }];   /* 五年级 */
    if (n <= 40) return [{ t: 4, w: 3 }, { t: 5, w: 1 }];   /* 五下–预初 */
    if (n <= 50) return [{ t: 5, w: 3 }, { t: 6, w: 1 }];   /* 预初–初一 */
    if (n <= 60) return [{ t: 6, w: 3 }, { t: 7, w: 1 }];   /* 初一–初二 */
    if (n <= 70) return [{ t: 7, w: 3 }, { t: 8, w: 1 }];   /* 初二–初三 */
    if (n <= 80) return [{ t: 8, w: 3 }, { t: 7, w: 1 }];   /* 初三复习 */
    /* 81–88：中考到高中，全段混着来 */
    return [{ t: 6, w: 1 }, { t: 7, w: 1 }, { t: 8, w: 3 }];
  }

  /* ---------------- 一关一个教材单元 ----------------
     1–10  = 4A 的 12 个单元（9、10 关各并两单元）
     11–20 = 4B 的 12 个单元（19、20 关各并两单元）
     返回 [[tier, unit], ...]；不在这个范围返回 null，走常规分层。 */
  function unitsFor(lv) {
    var n = lv | 0;
    if (n >= 1 && n <= 10) {
      if (n <= 8) return [[1, n]];
      if (n === 9) return [[1, 9], [1, 10]];
      return [[1, 11], [1, 12]];
    }
    if (n >= 11 && n <= 20) {
      var m = n - 10;
      if (m <= 8) return [[2, m]];
      if (m === 9) return [[2, 9], [2, 10]];
      return [[2, 11], [2, 12]];
    }
    return null;
  }

  /* 每段的最低字母数：短词留给前期，后段只出长词 */
  function minLenFor(lv) {
    if (lv <= 6) return 2;
    if (lv <= 12) return 3;
    if (lv <= 18) return 4;
    if (lv <= 24) return 5;
    return 6;
  }

  /* ---------------- 词的掌握度 ----------------
     一个词只有「自己拼对」才算学会。用技能打死、跳过换词、拼错后切走，
     都记一笔「逃课」，之后会以更高权重回流（错词本）。 */
  var WS_KEY = 'dfyl_wordstat_v1';

  function wordStat(w) {
    if (!S.meta.wordStat) S.meta.wordStat = {};
    var st = S.meta.wordStat[w];
    if (!st) st = S.meta.wordStat[w] = { c: 0, w: 0, s: 0, k: 0, h: 0, st: 0 };
    return st;
  }

  /* kind: c 拼对 / w 拼错 / s 跳过 / k 被技能打死（没拼过）/ h 花了灵石看提示 */
  function markWord(w, kind) {
    if (!w) return;
    var st = wordStat(w);
    if (kind === 'c') { st.c++; st.st++; }
    else if (kind === 'w') { st.w++; st.st = 0; }
    else if (kind === 's') { st.s++; st.st = 0; }
    else if (kind === 'k') { st.k++; st.st = 0; }
    else if (kind === 'h') { st.h = (st.h || 0) + 1; st.st = 0; }
    S.wsDirty = true;

    /* 上报给宿主：真正的记忆曲线在那边算，这里只把「发生了什么」递出去。
       用时从这次开始拼那个字母算起，宿主拿它判断"熟"还是"瞎按"。 */
    if (ARCADE.onWord) {
      var ms = Math.max(0, Math.round((S.t - (S.wordStart || S.t)) * 1000));
      ARCADE.onWord(w, kind, ms);
    }
  }

  /* 连对两次算掌握；错过的词要重新连对两次才出本 */
  function wordLearned(st) { return !!st && st.st >= 2; }
  function needsReview(st) { return !!st && !wordLearned(st) && (st.w + st.s + st.k) > 0; }

  function reviewCount() {
    var m = S.meta.wordStat, n = 0, k;
    if (!m) return 0;
    for (k in m) if (needsReview(m[k])) n++;
    return n;
  }

  function loadWordStat() {
    /* 内嵌模式下错词本归主应用的 sm_words 管，这里不再碰 localStorage */
    if (arcOn()) return;
    try {
      var raw = window.localStorage.getItem(WS_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') S.meta.wordStat = o;
    } catch (e) { /* 隐私模式可能禁用 */ }
  }

  function saveWordStat() {
    S.wsDirty = false;
    if (arcOn()) return;
    try { window.localStorage.setItem(WS_KEY, JSON.stringify(S.meta.wordStat || {})); } catch (e) { }
  }

  var LEVEL_WORDS = {};
  function levelWords(lv) {
    /* 宿主下发了本档词池：这一档只从这里抽，不再碰内置词库 */
    if (arcOn() && ARCADE.queue.length) return ARCADE.queue;
    var n = Math.max(1, Math.min(MAX_LEVEL, lv | 0));
    if (LEVEL_WORDS[n]) return LEVEL_WORDS[n];
    var V = window.VOCAB;
    var minLen = minLenFor(n);

    /* 1–20 关：只取该关对应教材单元的词池 —— 一关只练这一课，
       这样这一关的怪、这把剑、这段剧情和课本是同一课。 */
    var us = unitsFor(n);
    if (us && V && V.byUnit) {
      var up = [], useen = {}, ui, uj, uarr, uw;
      for (ui = 0; ui < us.length; ui++) {
        uarr = (V.byUnit[us[ui][0]] || {})[us[ui][1]] || [];
        for (uj = 0; uj < uarr.length; uj++) {
          uw = uarr[uj];
          if (!uw || uw.w.replace(/[^a-z]/g, '').length < 2) continue;
          if (useen[uw.w]) continue;
          useen[uw.w] = 1;
          up.push(uw);
        }
      }
      if (up.length >= 8) { LEVEL_WORDS[n] = up; return up; }
    }

    var spec = tiersFor(n);
    var i, j, wSum = 0;
    for (i = 0; i < spec.length; i++) wSum += spec[i].w;

    /* 按权重从各层抽一份，再按单词去重：既照顾年级比例，又不让同一个词在一关里出现两次 */
    var seen = {}, pool = [], TARGET = 240;
    for (i = 0; i < spec.length; i++) {
      var src = (V && V.byTier[spec[i].t] ? V.byTier[spec[i].t] : []);
      var got = src.filter(function (x) {
        return x.w.replace(/[^a-z]/g, '').length >= minLen;
      });
      if (!got.length) got = src.slice();          /* 该层短词不够就放宽，别整段空掉 */
      /* 每层按权重分一份名额，免得多词的一层把整关的词都占了 */
      var quota = Math.max(12, Math.round(TARGET * spec[i].w / wSum));
      var bag = shuffleArr(got.slice()).slice(0, quota);
      for (j = 0; j < bag.length; j++) {
        if (seen[bag[j].w]) continue;
        seen[bag[j].w] = 1;
        pool.push(bag[j]);
      }
    }
    if (!pool.length) pool = WORDS.slice();
    LEVEL_WORDS[n] = pool;
    return pool;
  }

  function refillWordPool(aliveWord) {
    var src = levelWords(S.level);
    var fresh = [], stale = [], i;
    for (i = 0; i < src.length; i++) {
      var w = src[i];
      if (aliveWord[w.w]) continue;
      if (S.wordUsed[w.w]) stale.push(w);
      else fresh.push(w);
    }
    S.wordPool = shuffleArr(fresh.length ? fresh : stale);
  }

  /* 错词回流池：跨关卡累积的错词都会回来，但只取「不比当前年级更难」的词。
     这样第 2 关错的 hello 到第 20 关还会出现，又不会提前塞给你初中的词。 */
  var WORD_INDEX = null, MAX_TIER_CACHE = {};
  function maxTierFor(lv) {
    if (MAX_TIER_CACHE[lv]) return MAX_TIER_CACHE[lv];
    var spec = tiersFor(lv), t = 1, i;
    for (i = 0; i < spec.length; i++) if (spec[i].t > t) t = spec[i].t;
    MAX_TIER_CACHE[lv] = t;
    return t;
  }

  function pickReviewWord(aliveWord) {
    var m = S.meta.wordStat, i, w;
    if (!m) return null;
    if (!WORD_INDEX) {
      WORD_INDEX = {};
      for (i = 0; i < WORDS.length; i++) WORD_INDEX[WORDS[i].w] = WORDS[i];
    }
    var maxT = maxTierFor(S.level);
    var minLen = Math.max(2, minLenFor(S.level) - 2);   /* 别在长词关里蹦出 my 这种 */
    var out = [];
    for (w in m) {
      if (aliveWord[w]) continue;
      if (!needsReview(m[w])) continue;
      var rec = WORD_INDEX[w];
      if (!rec || rec.tier > maxT || rec.w.length < minLen) continue;
      out.push(rec);
    }
    if (!out.length) return null;
    return out[Math.floor(Math.random() * out.length)];
  }

  function pickWord() {
    if (FORCE_WORDS.length) {
      var fw = String(FORCE_WORDS.shift()).toLowerCase();
      var hit = WORDS.filter(function (x) { return x.w === fw; })[0];
      if (hit) return hit;
      return { w: fw, m: fw, p: 'n.' };
    }

    var aliveWord = {}, aliveFirst = {}, i, e;
    for (i = 0; i < S.enemies.length; i++) {
      e = S.enemies[i];
      if (!e.alive) continue;
      aliveWord[e.word] = 1;
      aliveFirst[e.word.charAt(0)] = 1;
    }

    /* 错词回流：还没掌握的词有更高概率再上场（只从本关词池里挑，难度不会越级） */
    var rw = pickReviewWord(aliveWord);
    if (rw && Math.random() < 0.45) { S.wordUsed[rw.w] = 1; return rw; }

    /* 一次抽几张，尽量让首字母不撞车，剩下的放回牌堆底部 */
    var hand = [], tries = 0;
    while (hand.length < 6 && tries++ < 80) {
      if (!S.wordPool.length) refillWordPool(aliveWord);
      if (!S.wordPool.length) break;
      var w = S.wordPool.pop();
      if (aliveWord[w.w]) continue;      /* 场上已有同词，这张直接作废 */
      hand.push(w);
    }
    if (!hand.length) {
      var src = levelWords(S.level);
      var avail = src.filter(function (x) { return !aliveWord[x.w]; });
      if (!avail.length) return src[0] || WORDS[0];
      return avail[Math.floor(Math.random() * avail.length)];
    }

    var pick = hand[0];
    for (i = 0; i < hand.length; i++) {
      if (!aliveFirst[hand[i].w.charAt(0)]) { pick = hand[i]; break; }
    }
    for (i = 0; i < hand.length; i++) {
      if (hand[i] !== pick) S.wordPool.unshift(hand[i]);
    }
    S.wordUsed[pick.w] = 1;
    return pick;
  }

  /* 换词：一定要换到「另一个」词。
     以前偶尔抽回同一个词，玩家就得对着同一只怪把同一个单词再拼一遍，现在堵死 */
  function rerollWord(e) {
    if (!e) return false;
    var nw = null, i;
    for (i = 0; i < 8; i++) {
      var t = pickWord();
      if (t && t.w !== e.word) { nw = t; break; }
    }
    if (!nw) return false;
    e.word = nw.w; e.meaning = nw.m; e.pos = nw.p;
    return true;
  }

  return { levelWords: levelWords, pickWord: pickWord, rerollWord: rerollWord, markWord: markWord, wordStat: wordStat, needsReview: needsReview, reviewCount: reviewCount, loadWordStat: loadWordStat, saveWordStat: saveWordStat, pickReviewWord: pickReviewWord };
  };
})(window);
