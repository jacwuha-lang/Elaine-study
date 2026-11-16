/* ============================================================
   srs.js — 科目级间隔复习（数学技能点 / 语文词语与客观题）
   ------------------------------------------------------------
   英语用的是 memory.js 的「题级」两级 Leitner。数学口算和语文
   词语不能照搬：

     · 数学题是现场生成的，每换一组数字就是一道新题。如果按题
       记账，一天 30 道口算就是 30 条新账，永远还不完。所以数学
       记的是「技能点」（两位数乘一位数、长度换算……），题只是
       这个技能点的一次抽样。
     · 语文词语是有限集合，一册几百个，值得按「词」长间隔复习，
       和闯关的单词 SRS 同理。

   两套账各自独立命名空间，互不干扰，也不会动到英语的 sm_mem。
   ============================================================ */
(function (SM) {
  'use strict';

  const S = SM.store;
  const DAY_KEY = 'sm_day';

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /** 本地日期键：2026-11-13（按孩子所在时区切天，不按 UTC） */
  function dkey(t) {
    const d = new Date(t || Date.now());
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function dayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /* ============================================================
     每日流水：一科一行。只记题数、对错、用时，不记题目内容。
     学习轨迹页、首页「今天做了多少」都读这里。
     ============================================================ */
  function readDays() {
    let db = S.get(DAY_KEY, null);
    if (!db || typeof db !== 'object') db = {};
    return db;
  }

  function writeDays(db) {
    S.set(DAY_KEY, db);
  }

  function blankCell() { return { n: 0, ok: 0, ms: 0 }; }

  const DAY = {};

  /** 记一次作答。subj: 'ma' | 'cn' | 'en' */
  DAY.log = function (subj, ok) {
    if (!subj) return;
    const db = readDays();
    const k = dkey();
    const day = db[k] || (db[k] = {});
    const cell = day[subj] || (day[subj] = blankCell());
    cell.n++;
    if (ok) cell.ok++;
    writeDays(db);
  };

  /** 记一次练习用时（毫秒），结果页结算时调用一次 */
  DAY.addTime = function (subj, ms) {
    if (!subj || !ms) return;
    const db = readDays();
    const k = dkey();
    const day = db[k] || (db[k] = {});
    const cell = day[subj] || (day[subj] = blankCell());
    cell.ms = (cell.ms || 0) + ms;
    writeDays(db);
  };

  DAY.get = function (subj, date) {
    const db = readDays();
    const cell = (db[date || dkey()] || {})[subj];
    return cell ? { n: cell.n || 0, ok: cell.ok || 0, ms: cell.ms || 0 } : blankCell();
  };

  DAY.today = function () {
    const db = readDays();
    const day = db[dkey()] || {};
    return {
      ma: day.ma ? { n: day.ma.n || 0, ok: day.ma.ok || 0, ms: day.ma.ms || 0 } : blankCell(),
      cn: day.cn ? { n: day.cn.n || 0, ok: day.cn.ok || 0, ms: day.cn.ms || 0 } : blankCell(),
      en: day.en ? { n: day.en.n || 0, ok: day.en.ok || 0, ms: day.en.ms || 0 } : blankCell()
    };
  };

  /** 最近 n 天，按日期正序。没有记录的那天 n=0，方便画热力条 */
  DAY.recent = function (n) {
    const db = readDays();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const t = dayStart() - i * 86400000;
      const k = dkey(t);
      const d = db[k] || {};
      out.push({
        date: k,
        ma: d.ma ? d.ma.n || 0 : 0,
        cn: d.cn ? d.cn.n || 0 : 0,
        en: d.en ? d.en.n || 0 : 0
      });
    }
    return out;
  };

  DAY.sum = function (days) {
    const out = { ma: 0, cn: 0, en: 0, n: 0, ok: 0, ms: 0 };
    days.forEach(function (d) {
      ['ma', 'cn', 'en'].forEach(function (s) {
        out[s] += d[s] || 0;
      });
      out.n += (d.ma || 0) + (d.cn || 0) + (d.en || 0);
    });
    return out;
  };

  /* ============================================================
     间隔复习实例
     ------------------------------------------------------------
     o.key       存档键
     o.gaps      每级间隔（分钟），长度就是毕业级数
     o.quota     每天最多多少条「新账」入池（0 = 不限）
     o.quotaKey  新账配额的存档键
     ============================================================ */
  function create(o) {
    const KEY = o.key;
    const GAPS = o.gaps;
    const MASTER = GAPS.length;
    const QUOTA = o.quota || 0;
    const CAP = o.cap || 0;   // >0 时限制池子条目数，超出让最熟的提前毕业

    let db = S.get(KEY, null);
    if (!db || typeof db !== 'object') db = {};

    function save() { S.set(KEY, db); }

    function blank() {
      const now = Date.now();
      return { lv: 0, ok: 0, bad: 0, last: now, due: now, streak: 0, born: now };
    }

    function trim() {
      if (!CAP) return;
      const list = [];
      for (const k in db) {
        const r = db[k];
        if (r && r.lv < MASTER) list.push([k, r]);
      }
      if (list.length <= CAP) return;
      list.sort(function (a, b) {
        if (b[1].lv !== a[1].lv) return b[1].lv - a[1].lv;
        return (a[1].last || 0) - (b[1].last || 0);
      });
      let cut = list.length - CAP;
      for (let i = 0; i < list.length && cut > 0; i++, cut--) {
        list[i][1].lv = MASTER;
        list[i][1].due = 0;
      }
      save();
    }

    const M = {};

    M.MASTER = MASTER;
    M.QUOTA = QUOTA;

    M.get = function (id) { return db[id] || null; };

    M.all = function () { return db; };

    /** 答对：升一级，按新等级排下次复习。毕业题 due 清 0。 */
    M.right = function (id) {
      if (!id) return null;
      const now = Date.now();
      let r = db[id];
      if (!r) r = db[id] = blank();
      r.ok++;
      r.streak = (r.streak || 0) + 1;
      r.last = now;
      r.lv = Math.min(MASTER, r.lv + 1);
      r.due = r.lv >= MASTER ? 0 : now + GAPS[r.lv - 1] * 60000;
      save();
      trim();
      return r;
    };

    /** 答错：掉一级（不连掉两级 —— 技能点错一次不代表全忘），立刻回炉 */
    M.wrong = function (id) {
      if (!id) return null;
      const now = Date.now();
      let r = db[id];
      if (!r) r = db[id] = blank();
      r.bad++;
      r.streak = 0;
      r.last = now;
      r.lv = Math.max(0, r.lv - 1);
      r.due = now;
      save();
      return r;
    };

    M.due = function () {
      const now = Date.now();
      const out = [];
      for (const k in db) {
        const r = db[k];
        if (!r || r.lv >= MASTER) continue;
        if (r.due > now) continue;
        out.push({ id: k, rec: r });
      }
      out.sort(function (a, b) { return a.rec.due - b.rec.due; });
      return out;
    };

    M.dueCount = function () {
      const day0 = dayStart();
      let n = 0;
      for (const k in db) {
        const r = db[k];
        if (!r || r.lv >= MASTER) continue;
        if (r.due <= Date.now() && r.last < day0) n++;
      }
      return n;
    };

    M.stats = function () {
      const now = Date.now();
      const day0 = dayStart();
      let learning = 0, master = 0, due = 0;
      for (const k in db) {
        const r = db[k];
        if (!r) continue;
        if (r.lv >= MASTER) { master++; continue; }
        if (r.due <= now && r.last < day0) { due++; continue; }
        learning++;
      }
      return { learning: learning, master: master, due: due, total: learning + due + master };
    };

    M.rate = function (id) {
      const r = db[id];
      if (!r || !(r.ok + r.bad)) return null;
      return r.ok / (r.ok + r.bad);
    };

    /** 出题权重：和英语同一把尺子，0.5 ~ 3 倍 */
    M.weight = function (id) {
      const r = db[id];
      if (!r) return 1;
      const n = r.ok + r.bad;
      if (!n) return 1;
      const rate = (r.bad + 1) / (n + 2);
      const conf = Math.min(1, n / 8);
      const PIVOT = 0.35;
      const target = rate <= PIVOT
        ? 0.5 + rate * (0.5 / PIVOT)
        : 1 + ((rate - PIVOT) / (1 - PIVOT)) * 2;
      return Math.max(0.5, Math.min(3, 1 + (target - 1) * conf));
    };

    M.weakest = function (n) {
      const out = [];
      for (const k in db) {
        const r = db[k];
        const total = r.ok + r.bad;
        if (total < 3) continue;
        const rate = r.ok / total;
        if (rate >= 0.65) continue;
        out.push({ id: k, rate: rate, n: total, weight: M.weight(k) });
      }
      out.sort(function (a, b) { return a.rate - b.rate; });
      return out.slice(0, n || 3);
    };

    M.recentWrong = function (n) {
      const out = [];
      for (const k in db) {
        const r = db[k];
        if (!r || !r.bad || r.lv >= MASTER) continue;
        out.push({ id: k, rec: r });
      }
      out.sort(function (a, b) { return (b.rec.last || 0) - (a.rec.last || 0); });
      return out.slice(0, n || 20);
    };

    M.reset = function () {
      db = {};
      save();
    };

    /* 今天新账还剩多少名额：数今天新建的条目 */
    M.quotaLeft = function () {
      if (!QUOTA) return Infinity;
      const day0 = dayStart();
      let n = 0;
      for (const k in db) {
        if ((db[k].born || 0) >= day0) n++;
      }
      return Math.max(0, QUOTA - n);
    };

    return M;
  }

  SM.srs = { create: create, day: DAY, dkey: dkey };
  SM.day = DAY;

})(window.SM);
