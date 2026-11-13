/* ============================================================
   memory.js — 间隔复习引擎（Leitner 二级）+ 薄弱度 + 争议题黑名单
   ------------------------------------------------------------
   一道题不是「做对一次就过关」，而是要隔一段时间再答对一次，
   才算真的记住：

     Lv0  刚做错        → 1 分钟后立刻再来一次（本卷内就回炉）
     Lv1  答对 1 次      → 8 分钟后再考（或明天）
     Lv2  毕业（已掌握） → 不再出现

   答错则连掉两级、打回「马上再来」，防止蒙对一次就被当成会了。

   ------------------------------------------------------------
   为什么是两级？这个数字改过三次，每次都有实测依据：

   五级 → 三级：题是现场生成的，不是固定牌堆。一道题从进池到毕业要
   被考 N 次，一天做 50 道新题就等于欠 50×N 次复习，可一天只有 50
   次作答额度。N=5 时欠 250 次，数学上永远还不完，待复习一路涨到
   两百多；N=3 时刚好够。40 天模拟：五级毕业 134 道，三级 405 道 ——
   大部分题在五级方案里是卡在队列中永远轮不到，不是记住了。

   三级 → 两级：三级要求「今天、明天、后天」各答对一次，也就是
   一道题要跨 3 个自然日才毕业。孩子每天只做一轮的话，第一天必然
   0 个已掌握，第二天还是 0（那天才刚升到 lv2），第三天才有第一批 ——
   连做两天看到「已掌握」一直是 0，任谁都会以为坏了。
   两级是「今天答对一次、隔天再答对一次」就毕业，第二天一定有数。

   严格性没有放松：答错连掉两级（直接打回 lv0），加上知识点层面的
   加权出题（见下面 weight()），同一个语法点会反复出现，不靠单题
   死磕。
   ------------------------------------------------------------

   除了「单题」的记忆，这里还记两样东西：

   ① 每个知识点的对错账（sm_stat）
      孩子总在三单上栽跟头，那下次组卷就该多出三单题。
      权重算法见 weight()：没数据 = 1.0（不偏不倚），
      老出错最多放大到 3 倍，一直全对最低压到 0.5 倍。

   ② 争议题黑名单（sm_bad_q）
      有些题本身出得不干净 —— 孩子写的句子语法也对，只是不如标准
      答案自然，却被判错。这种题拉黑，永远不再生成。
   ============================================================ */
(function (SM) {
  'use strict';

  const S = SM.store;

  const KEY = 'sm_mem';
  const STAT_KEY = 'sm_stat';
  const BAD_KEY = 'sm_bad_q';
  const DONE_KEY = 'sm_done';
  const MASTER = 2;
  /* 各等级下次复习的间隔（分钟）。只有 0~MASTER 用得到，
     后面几档留着是为了以后调 MASTER 时不用改这里。
     注意 lv2 就是毕业，GAP[2] 不会被用到 —— 毕业题不再复习。 */
  const GAP = [1, 8, 24 * 60, 2 * 24 * 60, 5 * 24 * 60, 10 * 24 * 60];

  /* 池子保险丝：单个知识点最多留多少条「还没毕业」的题。
     超了就让最熟的那批提前毕业 —— 题是现场生成的，同类型的还有无数道，
     攒几千条只会拖慢组卷，并不会让孩子多记住什么。 */
  const CAP = 60;
  /* 已掌握的题再留多久就归档成计数（只留数字，不留题） */
  const KEEP_DAYS = 60;
  /* 每天最多多少道**新题**进记忆池。
     这道闸门是「待复习只增不减」的根子：一道题从 Lv0 升到毕业要被考 5 次，
     一天做 50 道新题就等于欠下 250 次复习，可一天只有 50 次额度 ——
     越做越还不完。所以新题入池限流，超出的题做对了就直接算过，不留账。
     错题不受限制，那是真该多练的。 */
  const QUOTA = 10;
  const QUOTA_KEY = 'sm_newday';

  let db = S.get(KEY, null);
  if (!db || typeof db !== 'object') db = {};

  /* 今天已经有多少道新题入池：{ d: '1762000000000', n: 5 } */
  let qday = S.get(QUOTA_KEY, null);

  /* 已归档的掌握数（题本身删了，数字留着） */
  let done = S.get(DONE_KEY, 0) || 0;

  /* 每个知识点的对错次数：{ s3: { ok: 12, bad: 8, last: 169... } } */
  let stat = S.get(STAT_KEY, null);
  if (!stat || typeof stat !== 'object') stat = {};

  /* 争议题黑名单：{ fp: { fp, q, mid, why, at } } */
  let bad = S.get(BAD_KEY, null);
  if (!bad || typeof bad !== 'object') bad = {};

  /** 今天 0 点的时间戳 —— 「待复习」按天切，见 stats() 的注释 */
  function dayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /** 领一个「新题入池」名额。配额用完返回 false */
  function takeQuota() {
    const key = String(dayStart());
    if (!qday || qday.d !== key) qday = { d: key, n: 0 };
    if (qday.n >= QUOTA) return false;
    qday.n++;
    S.set(QUOTA_KEY, qday);
    return true;
  }

  /* 从旧版的 sm_wrong 迁移过来（一次性） */
  (function migrate() {
    const old = S.get('sm_wrong', []);
    if (!old || !old.length) return;
    const now = Date.now();
    old.forEach(function (x) {
      if (!x || !x.fp || db[x.fp]) return;
      db[x.fp] = { fp: x.fp, mid: x.mid, q: x.q, lv: 0, due: now, ok: 0, bad: 1, last: now };
    });
    S.set(KEY, db);
    S.set('sm_wrong', []);
  })();

  function save() { S.set(KEY, db); }

  function blank(fp, q, mid) {
    const now = Date.now();
    return { fp: fp, mid: mid, q: q, lv: 0, due: now, ok: 0, bad: 0, last: now };
  }

  /** 把孩子的答案收干净：只留一行，太长的截断（存档是 JSON，别越写越大） */
  function tidy(s) {
    const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return t.slice(0, 120);
  }

  /* ------------------------------------------------------------
     池子维护：保险丝 + 归档
     ------------------------------------------------------------ */

  /** 某个知识点攒太多题了：让等级最高的那批提前毕业（计入「已掌握」） */
  function trim(mid) {
    if (!mid) return;
    const list = [];
    for (const k in db) {
      const r = db[k];
      if (r && r.mid === mid && r.lv < MASTER) list.push(r);
    }
    if (list.length <= CAP) return;
    list.sort(function (a, b) {
      if (b.lv !== a.lv) return b.lv - a.lv;   // 最熟的先走
      return (a.last || 0) - (b.last || 0);    // 同级里最久没见的先走
    });
    let cut = list.length - CAP;
    for (let i = 0; i < list.length && cut > 0; i++, cut--) {
      list[i].lv = MASTER;
      list[i].due = 0;
    }
    save();
  }

  /** 已掌握超过 KEEP_DAYS 天的，题删掉、数字留下 */
  function ageOut() {
    const now = Date.now();
    let n = 0;
    for (const k in db) {
      const r = db[k];
      if (r && r.lv >= MASTER && now - (r.last || 0) > KEEP_DAYS * 86400000) {
        delete db[k];
        n++;
      }
    }
    if (n) {
      done += n;
      S.set(DONE_KEY, done);
      save();
    }
  }

  const MEM = {};

  MEM.MASTER = MASTER;

  MEM.get = function (fp) { return db[fp] || null; };

  MEM.all = function () { return db; };

  /* 每次打开 App 顺手清一次老账：掌握满 60 天的题只留计数 */
  ageOut();

  /** 答对：升级，按新等级排下次复习。
      返回 null 表示「这道新题没进记忆池」（今天的新题配额用完了），
      当次照样算答对，只是不留复习账。 */
  MEM.right = function (fp, q, mid) {
    const now = Date.now();
    let r = db[fp];
    if (!r) {
      if (!takeQuota()) return null;
      r = db[fp] = blank(fp, q, mid);
    }
    r.ok++;
    r.okN = (r.okN || 0) + 1;
    r.last = now;
    r.fixedAt = now;      // 最近一次「订正过来了」，复盘页用来打勾
    r.mid = mid || r.mid;
    if (q) r.q = q;
    r.lv = Math.min(MASTER, r.lv + 1);
    /* 毕业了就不用再排期，due 清 0 —— 免得存档里留一个「明明已掌握却显示待复习」的时间戳 */
    r.due = r.lv >= MASTER ? 0 : now + GAP[r.lv] * 60000;
    save();
    trim(r.mid);
    return r;
  };

  /** 答错：连掉两级，立刻回到复习队列（卷内会隔几题再考一次）
      mine 是孩子这次写的 / 选的 —— 复盘页要照着它说「你写的是 X」，
      只存题干的话就只剩「正确答案是 Y」，孩子想不起来自己当时怎么想的。 */
  MEM.wrong = function (fp, q, mid, mine) {
    const now = Date.now();
    const r = db[fp] || (db[fp] = blank(fp, q, mid));
    r.bad++;
    r.wrongN = (r.wrongN || 0) + 1;
    r.last = now;
    r.lastWrong = now;
    r.mid = mid || r.mid;
    if (q) r.q = q;
    const m = tidy(mine);
    /* 空答案也记 —— 「没写」本身就是一种错法，复盘时要指出来 */
    r.mine = m;
    r.mineAt = now;
    r.lv = Math.max(0, r.lv - 2);
    r.due = now;
    save();
    trim(r.mid);
    return r;
  };

  /** 最近错的题（错题本 / 复盘页用）。
      · 只要错过、还没毕业的
      · 按「最后一次错」倒序 —— 刚错的排前面，孩子一眼就认出来
      · mid 传了就只看某一类 */
  MEM.recentWrong = function (n, mid) {
    const out = [];
    for (const k in db) {
      const r = db[k];
      if (!r || r.lv >= MASTER) continue;
      if (!r.wrongN) continue;
      if (bad[k]) continue;
      if (mid && mid !== 'all' && r.mid !== mid) continue;
      out.push(r);
    }
    out.sort(function (a, b) { return (b.lastWrong || b.last || 0) - (a.lastWrong || a.last || 0); });
    return out.slice(0, n || 20);
  };

  /** 某个知识点下还没弄懂的错题有几道 —— 首页「错题本」按类提示用 */
  MEM.wrongByMid = function () {
    const map = {};
    for (const k in db) {
      const r = db[k];
      if (!r || r.lv >= MASTER || !r.wrongN || bad[k]) continue;
      const m = r.mid || '';
      map[m] = (map[m] || 0) + 1;
    }
    return map;
  };

  /** 到期待复习的题（mid 传 'all' 或不传表示全部）
      注意：这里返回的是**所有**到期的，包括今天刚练过、8 分钟后到期的
      —— 组卷时要把它们捞回来再考一次，这是短期重复，不是债务。 */
  MEM.due = function (mid) {
    const now = Date.now();
    const out = [];
    for (const k in db) {
      const r = db[k];
      if (!r || r.lv >= MASTER) continue;
      if (bad[k]) continue;                    // 拉黑的题不再冒出来
      if (r.due > now) continue;
      if (mid && mid !== 'all' && r.mid !== mid) continue;
      out.push(r);
    }
    out.sort(function (a, b) { return a.due - b.due; });   // 拖得最久的先来
    return out;
  };

  /** 首页上那个「待复习」数字：只数**以前练过、今天该补的旧账**。
      今天刚做完的题 8 分钟后又到期，那是本卷内回炉的活，不该算成新债务，
      否则孩子做完一轮回到首页，待复习反而变多了。 */
  MEM.dueCount = function (mid) {
    const now = Date.now();
    const day0 = dayStart();
    let n = 0;
    for (const k in db) {
      const r = db[k];
      if (!r || r.lv >= MASTER) continue;
      if (bad[k]) continue;
      if (mid && mid !== 'all' && r.mid !== mid) continue;
      if (r.due <= now && r.last < day0) n++;
    }
    return n;
  };

  /** 三个桶，互不重叠，加起来正好是练过的总题数：
        · 待复习  以前练过、今天该再练一次的
        · 学习中  还没毕业、也还没到复习时间的（含今天刚做完的）
        · 已掌握  连续答对升到顶了（含保险丝提前毕业、已归档的） */
  MEM.stats = function () {
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
    master += done;
    return { learning: learning, master: master, due: due,
             total: learning + due + master };
  };

  /** 人话版「下次什么时候来」 */
  MEM.whenText = function (lv) {
    if (lv >= MASTER) return '已掌握';
    if (lv <= 0) return '马上再来一次';
    /* 二级时 lv1 就是最后一档：8 分钟后（或者明天）再答对一次就掌握 */
    return '过一会儿再来';
  };

  /** 等级星（给结果页画进度用） */
  MEM.lvBar = function (lv) {
    let s = '';
    for (let i = 0; i < MASTER; i++) s += (i < lv ? '●' : '○');
    return s;
  };

  MEM.reset = function () {
    db = {};
    done = 0;
    qday = null;
    S.set(DONE_KEY, 0);
    S.set(QUOTA_KEY, null);
    save();
  };

  /* ============================================================
     一、知识点薄弱度
     每次作答都记一笔账，组卷时按「最近老出错」的程度加权。
     ============================================================ */

  /** 记一次作答。ok=true 对，false 错 */
  MEM.hit = function (mid, ok) {
    if (!mid) return;
    const r = stat[mid] || (stat[mid] = { ok: 0, bad: 0, last: 0 });
    if (ok) r.ok++; else r.bad++;
    r.last = Date.now();
    S.set(STAT_KEY, stat);
  };

  MEM.stat = function (mid) {
    if (mid) return stat[mid] || { ok: 0, bad: 0, last: 0 };
    return stat;
  };

  /** 正确率，没数据返回 null（设置页用来区分「没练过」和「正确率 0%」） */
  MEM.rate = function (mid) {
    const r = stat[mid];
    if (!r || !(r.ok + r.bad)) return null;
    return r.ok / (r.ok + r.bad);
  };

  /**
   * 出题权重。1.0 = 中性。
   *   · 没练过        → 1.0
   *   · 错得多        → 最多 3.0（出现概率约三倍）
   *   · 一直全对      → 最低 0.5（还留一点，免得完全不露面）
   *
   * 错误率做了平滑（先验 1 错 1 对），样本少时不至于被一次失误带跑偏；
   * 再用「做过多少」当置信度，做过 8 次以上才完全采信。
   */
  /**
   * 薄弱度权重：1.0 = 按正常比例出题，越大出得越多，最小 0.5、最大 3。
   *
   * 先算平滑错误率 (bad+1)/(n+2) —— 加 1 是拉普拉斯平滑，
   * 免得「做了一次、错了一次」就被当成 100% 不会。
   * 再把错误率映射成目标倍数（分段线性，接点连续）：
   *
   *   错误率   0%  → 0.5 倍（已经很熟，少出点）
   *   错误率  35%  → 1.0 倍（这里就是「正常」，再低就不额外加练）
   *   错误率  50%  → 1.46 倍
   *   错误率 100%  → 3.0 倍
   *
   * 最后按样本量打折：做满 8 次以上才完全采信，
   * 只做过一两次就只信一点点，不会被偶然失误带跑。
   */
  const PIVOT = 0.35;
  MEM.weight = function (mid) {
    const r = stat[mid];
    if (!r) return 1;
    const n = r.ok + r.bad;
    if (!n) return 1;
    const rate = (r.bad + 1) / (n + 2);
    const conf = Math.min(1, n / 8);
    const target = rate <= PIVOT
      ? 0.5 + rate * (0.5 / PIVOT)                    // 0 → 0.5，PIVOT → 1.0
      : 1 + ((rate - PIVOT) / (1 - PIVOT)) * 2;       // PIVOT → 1.0，100% → 3.0
    const w = 1 + (target - 1) * conf;
    return Math.max(0.5, Math.min(3, w));
  };

  /** 最该补的几个知识点（样本少于 3 次不下结论） */
  MEM.weakest = function (n) {
    const out = [];
    for (const k in stat) {
      const r = stat[k];
      const total = (r && (r.ok + r.bad)) || 0;
      if (total < 3) continue;
      const rate = r.ok / total;
      if (rate >= 1 - PIVOT) continue;         // 正确率 65% 以上就不算薄弱（和权重同一把尺）
      out.push({ mid: k, rate: rate, n: total, weight: MEM.weight(k) });
    }
    out.sort(function (a, b) { return a.rate - b.rate; });
    return out.slice(0, n || 2);
  };

  MEM.resetStat = function () { stat = {}; S.set(STAT_KEY, stat); };

  /* ============================================================
     二、争议题黑名单
     题目本身出得不干净（孩子写的其实也对）→ 永久跳过。
     ============================================================ */

  /**
   * 拉黑一道题。顺手把它从复习队列里删掉 —— 一道「答案有争议」的题
   * 反复出现只会让孩子更困惑。
   */
  MEM.markBad = function (fp, q, mid, why) {
    if (!fp) return false;
    if (!bad[fp]) {
      bad[fp] = {
        fp: fp,
        q: String(q || '').replace(/\s+/g, ' ').slice(0, 120),
        mid: mid || '',
        why: why || '',
        at: Date.now()
      };
      S.set(BAD_KEY, bad);
    }
    if (db[fp]) { delete db[fp]; save(); }
    return true;
  };

  MEM.isBad = function (fp) { return !!fp && !!bad[fp]; };

  MEM.badList = function () { return bad; };

  MEM.badCount = function () { return Object.keys(bad).length; };

  MEM.clearBad = function () { bad = {}; S.set(BAD_KEY, bad); };

  /** 撤销一道题的记忆（争议题判为「算对」时用，别让它继续占复习位） */
  MEM.drop = function (fp) {
    if (fp && db[fp]) { delete db[fp]; save(); }
  };

  SM.memory = MEM;

})(window.SM);
