/* ============================================================
   arcade.js — 单词闯关（接入层）
   积分进出、单词记忆曲线、存档写入、外层 UI。
   战斗本身在 arcade/src/game.js，这里一行都不碰。
   ============================================================ */
window.SM = window.SM || {};

(function (SM) {
  'use strict';

  var U = SM.U, A = SM.sfx, S = SM.store, ST = SM.state;

  /* ---------------- 可调参数（集中在这里，上线后按实际表现调） ---------------- */
  var TUNE = {
    ENTRY_COST: 100,        /* 门票 */
    WORDS_PER_TIER: 10,     /* 每档小怪数 */
    POOL_PER_TIER: 50,      /* 每档带多少词进场：一档 10 怪 + BOSS 每刀换一个新词，要够用 */
    MAX_TIER_ROUNDS: 999,   /* 无限 */
    STAR_DAILY_CAP: 400,    /* 每日返星上限 */
    DEATH_RATE: 0.7,        /* 死亡结算系数 */
    FAST_MS: 3000,          /* 快答阈值 */
    SLOW_MS: 8000,          /* 慢答阈值 */
    OVERDUE: 0.6, FRESH: 0.3, RANDOM: 0.1,
    /* 间隔表（分钟）：10m 30m 12h 1d 2d 4d 7d 15d 30d 60d */
    GAP: [10, 30, 720, 1440, 2880, 5760, 10080, 21600, 43200, 86400]
  };

  /* ---------------- 词表 ---------------- */
  var WORDS = null, WT = {};   /* WT[tier] = [{w,m,p,t}] */
  var loading = null;

  function preload() {
    if (WORDS) return Promise.resolve(WORDS);
    if (loading) return loading;
    loading = fetch('arcade/words.json').then(function (r) { return r.json(); }).then(function (j) {
      WORDS = j.words;
      for (var t = 1; t <= 8; t++) WT[t] = [];
      WORDS.forEach(function (x) {
        if (!WT[x.t]) WT[x.t] = [];
        WT[x.t].push({ w: x.w, m: x.m, p: x.p, tier: x.t });
      });
      return WORDS;
    }).catch(function () {
      loading = null;
      return null;
    });
    return loading;
  }

  /* ---------------- 存档：全部进主应用那份 JSON 的 arcade 节点 ---------------- */
  function arc() {
    var a = S.get('arcade', null);
    if (!a || typeof a !== 'object') a = {};
    return a;
  }
  function saveArc(patch) {
    var a = arc();
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) a[k] = patch[k];
    S.set('arcade', a);
    return a;
  }
  function words() {
    var w = S.get('sm_words', null);
    return (w && typeof w === 'object') ? w : {};
  }
  function saveWords(m) { S.set('sm_words', m); }

  /* ---------------- 记忆曲线 ---------------- */
  function srsOf(w) {
    var m = words();
    return m[w] || null;
  }
  /* 该复习 or 从没学过：只有这两种给星，防止反复刷低档 */
  function eligible(rec) {
    if (!rec || !rec.reps) return true;
    return rec.due <= Date.now();
  }
  function srsUpdate(w, ok, ms) {
    var all = words(), now = Date.now();
    var r = all[w] || { w: w, ef: 2.5, step: -1, ivl: 0, due: 0, reps: 0, lapses: 0, last: 0, src: 'arcade' };
    if (ok) {
      r.reps++;
      var step = (r.step < 0 ? 1 : r.step + 1);
      if (ms <= TUNE.FAST_MS) step += 1;          /* 又快又对，多升一档 */
      if (ms > TUNE.SLOW_MS) step = Math.max(1, r.step);  /* 太慢不升，只顺延 */
      r.step = Math.min(9, step);
      /* 拼对一次就算订正过，从错词本里划掉（和语法题「做对才销账」一个口径） */
      r.needFix = 0;
    } else {
      r.lapses++;
      r.needFix = 1;                               /* 又拼错了，挂回错词本 */
      r.step = Math.max(1, (r.step < 0 ? 1 : r.step) - 2);
    }
    r.ivl = TUNE.GAP[r.step] || 10;
    r.due = now + r.ivl * 60000;
    r.last = now;
    all[w] = r;
    saveWords(all);
    return r;
  }

  /* 看了提示：既不算会也不算不会，只落到「刚见过」那一档，10 分钟后再来 */
  function srsPeek(w) {
    var all = words(), now = Date.now();
    var r = all[w] || { w: w, ef: 2.5, step: -1, ivl: 0, due: 0, reps: 0, lapses: 0, last: 0, src: 'arcade' };
    r.reps++;
    if (r.step < 0) r.step = 0;
    r.ivl = TUNE.GAP[Math.min(9, r.step)] || 10;
    r.due = now + r.ivl * 60000;
    r.last = now;
    r.hints = (r.hints || 0) + 1;      /* 记一笔「这词靠提示过的」，以后可以单独看 */
    all[w] = r;
    saveWords(all);
    return r;
  }

  /* ---------------- 出词 ---------------- */
  function shuffle(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = b[i]; b[i] = b[j]; b[j] = t;
    }
    return b;
  }

  function pickWords(tier, n) {
    var pool = (WT[tier] || []).slice();
    if (!pool.length) {
      /* 该档词库空（t9/t10 还没建）就退回最近的一层 */
      for (var t = tier - 1; t >= 1 && !pool.length; t--) pool = (WT[t] || []).slice();
      for (var t2 = tier + 1; t2 <= 8 && !pool.length; t2++) pool = (WT[t2] || []).slice();
    }
    var all = words(), now = Date.now();
    var overdue = [], fresh = [], rest = [];
    pool.forEach(function (it) {
      var r = all[it.w];
      if (!r || !r.reps) fresh.push(it);
      else if (r.due <= now) overdue.push(it);
      else rest.push(it);
    });
    overdue.sort(function (a, b) { return (all[a.w].due || 0) - (all[b.w].due || 0); });

    var want = Math.round(n * TUNE.OVERDUE), wantF = Math.round(n * TUNE.FRESH);
    var out = [], seen = {};
    function take(list, count) {
      for (var i = 0; i < list.length && count > 0; i++) {
        if (seen[list[i].w]) continue;
        seen[list[i].w] = 1; out.push(list[i]); count--;
      }
    }
    take(overdue, want);
    take(shuffle(fresh), wantF);
    take(shuffle(rest), n - out.length);
    /* 还不够就按「逾期 → 新词 → 其余」补齐，保证每档都凑得满 */
    if (out.length < n) {
      var bag = overdue.concat(fresh, rest);
      for (var i = 0; i < bag.length && out.length < n; i++) {
        if (seen[bag[i].w]) continue;
        seen[bag[i].w] = 1; out.push(bag[i]);
      }
    }
    /* 词量不足以支撑一档时允许重复（同一批词再抽一次），别让玩家卡住 */
    while (out.length < n && out.length) out = out.concat(out.slice(0, n - out.length));
    return out;
  }

  /* ---------------- 星价 ---------------- */
  function wordPrice(tier) { return Math.ceil(tier / 2); }
  function bossPrice(tier) { return 10 + tier * 2; }

  /* ---------------- 每日返星额度 ---------------- */
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function dailyLeft() {
    var a = arc(), d = a.daily;
    if (!d || d.day !== todayKey()) return TUNE.STAR_DAILY_CAP;
    return Math.max(0, TUNE.STAR_DAILY_CAP - (d.got || 0));
  }
  function dailyAdd(n) {
    var a = arc(), d = a.daily;
    if (!d || d.day !== todayKey()) d = { day: todayKey(), got: 0 };
    d.got = (d.got || 0) + n;
    saveArc({ daily: d });
  }

  /* ---------------- 一局的状态 ---------------- */
  var run = null;

  function newRun(tier) {
    return {
      tier: tier || 1,
      starsRaw: 0,      /* 本局应收（还没乘死亡系数、还没封顶） */
      good: 0,          /* 拼对且"该复习"的词数 */
      bad: 0,
      cleared: 0,       /* 打完几档 */
      wordsLog: {},
      wordEv: {},       /* 词 → 最后一次的结果 c/w/s/h/k，结算词单用 */
      hintWords: {},    /* 花灵石看过的词，单独留一份 */
      t0: Date.now()
    };
  }

  /* ---------------- 界面 ---------------- */
  var layer = null, stageEl = null, hudEl = null;

  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'arcadeLayer';
    layer.innerHTML =
      '<div class="arc-top">'
      + '<button class="arc-back" id="arcBack" aria-label="退出">✕</button>'
      + '<div class="arc-chip"><i>⭐</i><b id="arcStars">0</b></div>'
      + '<div class="arc-chip"><i>档</i><b id="arcTier">1</b></div>'
      + '<div class="arc-chip"><i>❤</i><b id="arcHp">100</b></div>'
      + '<div class="arc-chip"><i>💎</i><b id="arcStones">0</b></div>'
      + '</div>'
      + '<div class="arc-stage" id="arcStage"></div>'
      + '<div class="arc-tip" id="arcTip">看中文，点字母拼出英文</div>';
    document.body.appendChild(layer);
    stageEl = layer.querySelector('#arcStage');
    hudEl = layer;
    layer.querySelector('#arcBack').onclick = function () { A.tap(); quitRun(); };
    return layer;
  }

  function setHud(patch) {
    if (!hudEl) return;
    if (patch.stars != null) hudEl.querySelector('#arcStars').textContent = patch.stars;
    if (patch.tier != null) hudEl.querySelector('#arcTier').textContent = patch.tier;
    if (patch.hp != null) hudEl.querySelector('#arcHp').textContent = Math.max(0, Math.round(patch.hp));
    if (patch.stones != null) hudEl.querySelector('#arcStones').textContent = patch.stones;
  }
  function tip(t) {
    if (!hudEl) return;
    var el = hudEl.querySelector('#arcTip');
    el.textContent = t;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  /* 每帧刷一次 HUD（血量和灵石是游戏侧算的，只能读） */
  var hudTimer = null;
  function startHudLoop() {
    stopHudLoop();
    hudTimer = setInterval(function () {
      var s = window.ArcadeHost && window.ArcadeHost.summary();
      if (!s) return;
      setHud({ hp: s.hp, stones: s.stones, tier: s.tier });
    }, 250);
  }
  function stopHudLoop() {
    if (hudTimer) { clearInterval(hudTimer); hudTimer = null; }
  }

  /* ---------------- 开局 ---------------- */
  function enter() {
    if (ST.stars < TUNE.ENTRY_COST) {
      A.deny && A.deny();
      SM.fx.toast('还差 ' + (TUNE.ENTRY_COST - ST.stars) + ' 颗星，先去做几道题吧');
      return;
    }
    preload().then(function () {
      if (!WORDS) { SM.fx.toast('词表没加载出来，刷新试试'); return; }
      showEntrySheet();
    });
  }

  /* 开局确认：把"扣 100 星"和"这局练什么词"讲清楚 */
  function showEntrySheet() {
    var a = arc();
    var due = countDue();
    var sheet = document.createElement('div');
    sheet.className = 'arc-sheet';
    sheet.innerHTML =
      '<div class="sheet-card">'
      + '<h3>单词闯关</h3>'
      + '<p class="sheet-sub">打怪靠拼单词 · 只练你该复习的词</p>'
      + '<div class="sheet-num"><b>-' + TUNE.ENTRY_COST + '</b><span>⭐ 入场</span></div>'
      + '<ul class="sheet-list">'
      + '  <li><i>📚</i>这局有 <b>' + due + '</b> 个词该复习</li>'
      + '  <li><i>🏆</i>最高打到第 <b>' + ((a.bestTier || 0) || '—') + '</b> 档</li>'
      + '  <li><i>💡</i>打深档每个词更值钱，死了退七成</li>'
      + '  <li><i>🔰</i>每局从新手村起，剑甲功法都在局内攒</li>'
      + '</ul>'
      + '<div class="sheet-btns">'
      + '<button class="btn-ghost" id="arcCancel">再想想</button>'
      + '<button class="btn-main" id="arcGo">开始闯关</button>'
      + '</div></div>';
    document.body.appendChild(sheet);
    sheet.querySelector('#arcCancel').onclick = function () { A.tap(); sheet.remove(); };
    sheet.querySelector('#arcGo').onclick = function () { A.tap(); sheet.remove(); startRun(); };
  }

  function countDue() {
    var all = words(), now = Date.now(), n = 0;
    for (var k in all) if (all[k] && all[k].due <= now) n++;
    return n;
  }

  /* 直达入口（/play、/play-ipad）：不弹入场确认、不看星数，直接开一局。
     默认 free = true：练习局，不扣星也不加星，档案一个字节都不动。
     想按正常规则来（扣 100⭐）就传 { free: false }。 */
  function quickStart(opts) {
    opts = opts || {};
    if (run) return;

    /* 词表读不到 / 引擎脚本挂了：别把人卡在「正在进入」的遮罩上 */
    var bail = setTimeout(function () {
      if (bootVail()) {
        unplayBoot();
        SM.fx.toast('加载有点慢，先回首页了');
      }
    }, 9000);

    preload().then(function () {
      clearTimeout(bail);
      if (!WORDS) {
        dropVail();
        unplayBoot();
        SM.fx.toast('词表没加载出来，刷新试试');
        return;
      }
      startRun(opts.free !== false);

      /* 平板竖着拿：键盘在下面会把画面压小，提醒一句（不强制转屏） */
      var root = (typeof document !== 'undefined') ? document.documentElement : null;
      if (root && root.classList && root.classList.contains('ipad')
          && window.innerWidth < window.innerHeight) {
        setTimeout(function () { SM.fx.toast('横过来玩，字母盘更好按～'); }, 1500);
      }
    });
  }

  /* 首屏遮罩是直达页（/play）才有的，普通页面和测试桩里没有 —— 取不到就当没有 */
  function bootVail() {
    try {
      if (typeof document === 'undefined' || !document.getElementById) return null;
      return document.getElementById('bootVail');
    } catch (e) { return null; }
  }
  function dropVail() {
    var v = bootVail();
    if (v && v.parentNode) v.parentNode.removeChild(v);
  }
  function unplayBoot() {
    try {
      if (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList) {
        document.documentElement.classList.remove('play-boot');
      }
    } catch (e) { /* 老浏览器 / 测试桩，忽略 */ }
  }

  /* free = 练习/测试局（/play 直达用）：不扣星、不加星、不写记忆曲线，
     整局一个字段都不落盘，玩完档案还是原样。
     正常从首页进来是 free=false，走原来的门票与返星逻辑。 */
  function startRun(free) {
    free = !!free;

    if (!free) {
      /* 先扣星：扣完立刻落盘，刷新也不会白玩 */
      ST.stars -= TUNE.ENTRY_COST;
      ST.saveStars();
      A.coin && A.coin();

      dropOldMeta();        /* 抛掉上个版本遗留的装备/功法 */
    }

    run = newRun(1);
    run.free = free;
    run.runId = 'r' + Date.now();
    if (!free) {
      saveArc({ runPending: { id: run.runId, ts: Date.now(), tier: 1 }, runs: (arc().runs || 0) + 1 });
    }

    ensureLayer();
    layer.classList.add('on');
    document.body.classList.add('arc-lock');
    /* 直达模式下面盖着「正在进入闯关…」，真开始画了再撤掉 */
    dropVail();

    var host = window.ArcadeHost;
    if (!host) { SM.fx.toast('闯关引擎没加载，检查 arcade/ 目录'); return; }

    host.mount(stageEl).then(function () {
      wire(host);
      hostRef = host;
      applyLayout();
      /* 把上次的语音开关同步进游戏：按钮一开始就画成「已关」，别等用户再点一次 */
      if (window.ARCADE && window.ARCADE.setVoiceOff) {
        try { window.ARCADE.setVoiceOff(voiceOff); } catch (e) { }
      }
      var pack = pickWords(1, TUNE.POOL_PER_TIER);
      host.setHpRate(0.25);
      host.start({
        tier: 1,
        words: pack,
        meta: freshMeta()
      });
      setHud({ stars: ST.stars, tier: 1, hp: 100, stones: 0 });
      startHudLoop();
      tip('第 1 档 · 卡住了点右上角灯泡（20 灵石）');
      /* 第一次进来先讲清楚每个按钮：两页，可跳过 */
      if (!arc().tutSeen) {
        setTimeout(function () {
          if (layer && layer.classList.contains('on') && !tutIsOpen()) tutOpen(1);
        }, 520);
      }
    }).catch(function (e) {
      SM.fx.toast('闯关加载失败：' + e.message);
      layer.classList.remove('on');
      document.body.classList.remove('arc-lock');
    });
  }

  /* ---------------- 布局：竖屏把字母盘搬出画布 ---------------- */
  var hostRef = null;
  var layTimer = null;

  function pickLayout() {
    var w = window.innerWidth || 0, h = window.innerHeight || 0;
    return (h > w * 1.05) ? 'portrait' : 'land';
  }

  function applyLayout() {
    if (!hostRef || !hostRef.setLayout) return;
    hostRef.setLayout(pickLayout());
  }

  /* ---------------- 新手教程（实现见 arcade/tutorial.js，两个页面共用） ---------------- */
  function tutOpen(page) {
    if (!window.ArcadeTutorial) return;
    window.ArcadeTutorial.open(window.ArcadeHost, page || 1, function () {
      saveArc({ tutSeen: true });
    });
  }
  function tutIsOpen() {
    return !!(window.ArcadeTutorial && window.ArcadeTutorial.isOpen());
  }

  /* 转屏时先等 iOS 把视口尺寸改完再算，不然拿到的是转屏前的值 */
  function onWinResize() {
    if (!layer || !layer.classList.contains('on')) return;
    if (layTimer) clearTimeout(layTimer);
    layTimer = setTimeout(function () { layTimer = null; applyLayout(); }, 160);
  }
  window.addEventListener('resize', onWinResize);
  window.addEventListener('orientationchange', onWinResize);

  /* 每局都从新手村起：剑甲、功法、技能只在局内有效，不跨局继承。
     存档里只留学习类进度（bestTier / 次数 / 待结算），不再写这三样。 */
  function freshMeta() {
    return { weapon: -1, armor: -1, skills: {}, arts: {}, wordStat: {} };
  }

  /* 老档案里可能还留着上个版本写进去的装备/功法，进局时顺手清掉 */
  function dropOldMeta() {
    var a = arc();
    /* 已经是空值（或压根没有这些键）就不用再写一次档案 */
    if (a.equip == null && a.skills == null && a.arts == null) return;
    saveArc({ equip: null, skills: null, arts: null });
  }

  /* 档位 → 词池层：第 9 档回到第 1 层的词，血量和难度照旧往上走 */
  function tierOf(tier) {
    var t = Math.max(1, Math.round(tier) || 1);
    return t > 8 ? ((t - 1) % 8) + 1 : t;
  }

  /* 把游戏的四个回调接上 */
  function wire(host) {
    host.onWord(function (w, kind, ms) {
      if (run && kind) {
        run.wordEv[w] = kind;            /* 结算按「这个词最后一次怎么了」归类 */
        if (kind === 'h') run.hintWords[w] = 1;
      }
      /* 花灵石买的提示：算「看过答案」，不升档、不给星 */
      if (kind === 'h') { if (!run.free) srsPeek(w); return; }
      if (kind !== 'c' && kind !== 'w') return;   /* 跳过 / 被技能打死，不算复习 */

      if (run.free) {
        /* 练习局：只统计对错给结算看，记忆曲线、星数、词表全都不动 */
        if (kind === 'c') run.good++; else run.bad++;
        run.wordsLog[w] = kind === 'c' ? 1 : 0;
        return;
      }

      var rec = srsOf(w);
      var ok = kind === 'c';
      var wasDue = eligible(rec);
      srsUpdate(w, ok, ms);
      if (ok) {
        run.good++;
        if (wasDue) run.starsRaw += wordPrice(run.tier);
      } else {
        run.bad++;
      }
      run.wordsLog[w] = ok ? 1 : 0;
      setHud({ stars: ST.stars + run.starsRaw });
    });

    host.onTier(function (tier, st) {
      run.cleared = Math.max(run.cleared, tier);
      if (!run.free) {
        run.starsRaw += bossPrice(tier);
        var a = arc();
        var best = Math.max(a.bestTier || 0, tier);
        saveArc({
          bestTier: best,
          runPending: { id: run.runId, ts: Date.now(), tier: tier }
        });
        setHud({ stars: ST.stars + run.starsRaw, tier: tier });
      } else {
        setHud({ tier: tier });
      }
      tip('第 ' + tier + ' 档清完 · 点一下进下一档');
      /* 提前把下一档的词备好，结算屏点"继续"就是秒进 */
      var nt = tier + 1;
      host.prepare(nt, pickWords(tierOf(nt), TUNE.POOL_PER_TIER));
    });

    host.onEnd(function (sum) {
      finishRun(sum);
    });

    host.onNeedTier(function (tier) {
      host.goTier(tier, pickWords(tierOf(tier), TUNE.POOL_PER_TIER));
      run.tier = tier;
      setHud({ tier: tier });
      tip('第 ' + tier + ' 档 · 血带过来，慢慢打');
    });

    /* 点提示时，游戏会请宿主把这词念出来 */
    if (window.ARCADE) window.ARCADE.onSpell = speakSpell;
    /* 放招式时喊名字：闪身步 / 破空斩 / 万剑归宗 */
    if (window.ARCADE) window.ARCADE.onSay = sayName;
    /* 用户点了画布右上角的语音开关：静音 / 恢复，并且记住 */
    if (window.ARCADE) window.ARCADE.onVoice = setVoiceOff;
  }

  /* ---------------- 招式喊名 / 战斗台词 ----------------
     共用主应用那套中文 TTS（会用的 Edge 音色就是小宠物那个）。
     三条规矩，都是为了「别糊成一串」：
       1) 1.2 秒内同一句不重复 —— 连按闪避不会念两遍；
       2) 两句之间至少隔 650ms —— 挨打、闪避、出手可能同一瞬间撞上；
       3) 正在拼读单词时一律闭嘴 —— 那是孩子在听字母，台词不能盖住它。 */
  var sayAt = 0;        /* 上一句台词的时刻 */
  var spelling = 0;     /* 正在逐字母拼读的段数 */

  /* ---------------- 语音开关 ----------------
     关掉之后所有 TTS 都不出声：招式名、战斗台词、点提示的逐字母拼读。
     存在本机（localStorage）—— 这是「这台设备的喇叭要不要响」，不该跟着账号上云。
     默认开；按钮在游戏画布右上角，音效喇叭的正下方。 */
  var VOICE_KEY = 'sm_arc_voice';
  var voiceOff = (function () {
    try { return localStorage.getItem(VOICE_KEY) === '0'; } catch (e) { return false; }
  })();
  function setVoiceOff(off) {
    voiceOff = !!off;
    try { localStorage.setItem(VOICE_KEY, voiceOff ? '0' : '1'); } catch (e) { /* 隐私模式忽略 */ }
    if (voiceOff) {
      spelling = 0;
      var V0 = SM.voice;
      if (V0 && V0.stop) { try { V0.stop(); } catch (e) { } }
    }
    return voiceOff;
  }

  function sayName(text) {
    var t = String(text || '').trim();
    if (!t) return;
    if (voiceOff) return;
    if (spelling > 0) return;
    var now = Date.now();
    if (now - sayAt < 650) return;
    if (sayName.last === t && now - (sayName.at || 0) < 1200) return;
    sayName.last = t; sayName.at = now; sayAt = now;
    /* 多音字纠正：小还丹 → 小环丹（huán），屏幕上仍是「小还丹」 */
    var say = t;
    if (window.ARCADE_LINES && window.ARCADE_LINES.pron) {
      try { say = window.ARCADE_LINES.pron(t) || t; } catch (e) { say = t; }
    }
    var V = SM.voice;
    if (V && V.sayZh) { try { V.sayZh(say); return; } catch (e) { } }
  }

  /* ---------------- 提示拼读：字母逐个念，再念整词 ----------------
     共用主应用那套 TTS（SM.voice：Edge → 服务端 → 浏览器语音），
     拿不到就退回 speechSynthesis，再拿不到就安静跳过 —— 绝不影响这一局。 */
  function spellSeq(word) {
    var w = String(word || '').replace(/[^A-Za-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!w) return [];
    /* 短语（a pair of）逐字母念反而听不清，直接念整句 */
    if (w.indexOf(' ') >= 0) return [w.toLowerCase()];
    return [w.toUpperCase().split('').join('. ') + '.', w.toLowerCase()];
  }

  function speakSpell(word) {
    var seq = spellSeq(word);
    if (!seq.length) return;
    if (voiceOff) return;
    var i = 0;
    var V = SM.voice;
    /* 拼读期间把台词静音：孩子在听字母，来一句「哈！」就全乱了。
       万一某段回调永远不来，20 秒后也要把闸门放开。 */
    spelling++;
    var closed = false;
    function finish() {
      if (closed) return;
      closed = true;
      spelling = Math.max(0, spelling - 1);
    }
    setTimeout(finish, 20000);
    function next() {
      if (voiceOff) { finish(); return; }     /* 念到一半被关掉：剩下几段不念了 */
      if (i >= seq.length) { finish(); return; }
      var txt = seq[i++];
      if (V && V.sayEn) {
        var done = false;
        var timer = setTimeout(function () { if (!done) { done = true; next(); } }, 7000);
        var fin = function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          setTimeout(next, 110);
        };
        V.sayEn(txt, { end: fin, fail: fin }, { edgeRate: -12, rate: 0.82 });
        return;
      }
      speakFallback(txt, next);
    }
    next();
  }

  function speakFallback(text, cb) {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { cb(); return; }
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.82;
      var done = false;
      var fin = function () { if (done) return; done = true; setTimeout(cb, 80); };
      u.onend = fin;
      u.onerror = fin;
      setTimeout(fin, 5000);
      window.speechSynthesis.speak(u);
    } catch (e) { cb(); }
  }

  /* ---------------- 结算 ---------------- */
  function finishRun(sum) {
    if (!run) return;
    stopHudLoop();
    var free = !!run.free;
    var stars = free ? 0 : run.starsRaw;
    if (!free && sum && sum.died) stars = Math.floor(stars * TUNE.DEATH_RATE);

    var capped = false;
    if (!free) {
      var left = dailyLeft();
      capped = stars > left;
      if (stars > left) stars = left;

      ST.stars += stars;
      ST.saveStars();
      if (stars > 0) dailyAdd(stars);

      var a = arc();
      var best = Math.max(a.bestTier || 0, run.cleared);
      saveArc({
        bestTier: best,
        runPending: null
      });
    }

    showResult({
      free: free,
      stars: stars, capped: capped, cleared: run.cleared, good: run.good, bad: run.bad,
      died: !!(sum && sum.died), stones: sum ? sum.stones : 0, time: sum ? sum.time : 0,
      words: wordReport(run.wordEv), total: Object.keys(run.wordEv).length
    });
    run = null;
  }

  /* 本局词单：按「这个词最后一次怎么了」归类，同一个词不会两边都算 */
  function wordReport(ev) {
    var out = { c: [], w: [], s: [], h: [], k: [] }, w, k;
    for (w in ev) {
      if (!Object.prototype.hasOwnProperty.call(ev, w)) continue;
      k = ev[w];
      if (!out[k]) out[k] = [];
      out[k].push(w);
    }
    for (k in out) if (out[k]) out[k].sort();
    return out;
  }

  function wordRow(cls, label, n, list) {
    if (!n) return '';
    /* 带上中文：光看一列英文，孩子想不起这个词是怎么错的 */
    var txt = list.map(function (w) {
      var it = meanOf(w) || {};
      return it.m ? w + '<i>' + it.m + '</i>' : w;
    }).join('、');
    return '<div class="rw-row ' + cls + '">'
      + '<span class="rw-lab">' + label + '<b>' + n + '</b></span>'
      + '<span class="rw-txt">' + txt + '</span>'
      + '</div>';
  }

  function showResult(r) {
    var acc = r.good + r.bad;
    var rate = acc ? Math.round(r.good / acc * 100) : 0;
    var wd = r.words || { c: [], w: [], s: [], h: [], k: [] };
    var leech = (wd.s || []).length + (wd.k || []).length;
    var rows = wordRow('ok', '✅ 背下来', (wd.c || []).length, wd.c || [])
      + wordRow('hint', '💡 看了提示', (wd.h || []).length, wd.h || [])
      + wordRow('skip', '⏭ 跳过', (wd.s || []).length, wd.s || [])
      + wordRow('miss', '❌ 拼错', (wd.w || []).length, wd.w || [])
      + wordRow('skill', '⚔ 技能清掉', (wd.k || []).length, wd.k || []);
    /* 拼错和跳过的一起练：跳过其实也是「不会」，只是当时躲开了 */
    var redoList = (wd.w || []).concat(wd.s || []);
    var sheet = document.createElement('div');
    sheet.className = 'arc-sheet';
    sheet.innerHTML =
      '<div class="sheet-card result">'
      + '<div class="res-emoji">' + (r.died ? '💪' : '🎉') + '</div>'
      + '<h3>' + (r.died ? '这一局到这儿了' : '打得不错') + '</h3>'
      + '<p class="sheet-sub">' + (r.cleared ? '打到第 ' + r.cleared + ' 档' : '第 1 档还没过') + ' · 拼对率 ' + rate + '%</p>'
      + (r.free
        ? '<div class="res-free"><b>练习模式</b><span>不计分 · 不扣星 · 不写记录</span></div>'
        : '<div class="res-stars"><b>+' + r.stars + '</b><span>⭐</span></div>')
      + (r.capped ? '<p class="res-warn">今天的返星到上限了，明天再来</p>' : '')
      + '<div class="res-grid">'
      + '<div><b>' + (wd.c || []).length + '</b><span>背下来</span></div>'
      + '<div><b>' + r.bad + '</b><span>拼错</span></div>'
      + '<div><b>' + r.stones + '</b><span>灵石</span></div>'
      + '</div>'
      + (rows ? '<div class="res-words">' + rows + '</div>' : '')
      + (redoList.length
        ? '<button class="res-redo" id="arcRedo">✏️ 把这 ' + redoList.length + ' 个词再拼一遍</button>'
        : '')
      + (leech ? '<p class="res-warn">跳过的 ' + leech + ' 个词，下次更容易再遇到</p>' : '')
      + (r.free
        ? '<div class="sheet-btns">'
          + '<button class="btn-ghost" id="arcHome2">返回</button>'
          + '<button class="btn-main" id="arcDone">再来一局</button>'
          + '</div>'
        : '<button class="btn-main" id="arcDone">返回</button>')
      + '</div>';
    document.body.appendChild(sheet);
    sheet.querySelector('#arcDone').onclick = function () {
      A.tap();
      sheet.remove();
      if (r.free) {
        /* 练习局：原地重开，不用再回首页点一遍 */
        startRun(true);
        return;
      }
      closeLayer();
      ST.screen = 'fun';
      if (SM.render) SM.render();
    };
    var home2 = sheet.querySelector('#arcHome2');
    if (home2) {
      home2.onclick = function () {
        A.tap(); sheet.remove();
        closeLayer();
        ST.screen = 'fun';
        if (SM.render) SM.render();
      };
    }
    /* 错词当场再拼一遍：结算页最容易「一划而过」，
       所以把「不会的这几个词」摆成一个必须动手的小练习 */
    var redoBtn = sheet.querySelector('#arcRedo');
    if (redoBtn) {
      redoBtn.onclick = function () {
        A.tap();
        practiceWords(redoList);
      };
    }
  }

  function closeLayer() {
    stopHudLoop();
    if (layer) layer.classList.remove('on');
    document.body.classList.remove('arc-lock');
    /* 直达页下面的首页一直是藏着的，退出时再放出来 */
    unplayBoot();
    if (window.ArcadeHost) window.ArcadeHost.hide();
  }

  function quitRun() {
    /* 中途退出：按已打的档结算，不退门票 */
    var host = window.ArcadeHost;
    var sum = host ? host.summary() : null;
    closeLayer();
    if (!run) return;
    finishRun(sum || { died: true });
  }

  /* ---------------- 上次没结算完的（刷新 / 关页面） ---------------- */
  function recoverPending() {
    var p = arc().runPending;
    if (!p || !p.ts) return;
    /* 只有当天留下的才算，隔太久就别补了，免得莫名其妙加星 */
    if (Date.now() - p.ts > 6 * 3600 * 1000) { saveArc({ runPending: null }); return; }
    var tier = Math.max(1, p.tier | 0);
    var stars = bossPrice(tier) + tier * wordPrice(tier);
    var left = dailyLeft();
    if (stars > left) stars = left;
    if (stars > 0) {
      ST.stars += stars;
      ST.saveStars();
      dailyAdd(stars);
      SM.fx.toast('补回上次没结算的 ' + stars + ' ⭐');
    }
    saveArc({ runPending: null });
  }

  /* ============================================================
     错词这一摊 —— 给「错题本」和结算页用
     · wrongWords()   哪些词拼错过、还没补回来
     · noteMiss()     擂台那边拼错的词，带回来记一笔
     · practiceWords() 只拼这几个词的小练习：拼对才算过
     ============================================================ */

  /** 词的释义：优先查已加载的词表，没加载到就空着（不编） */
  function meanOf(w) {
    if (!WORDS) return { m: '', p: '' };
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i].w === w) return WORDS[i];
    }
    return { m: '', p: '' };
  }

  /** 这个词是不是「刚拼错、还没拼回来」
      · 新记录看 needFix（拼错置 1，srsUpdate 拼对置 0）
      · 老存档（今天之前擂台记的）没有这个字段，按「来源是擂台 + 7 天内」认，
        不然那几个词会永远查不到 —— 「擂台上拼错了却回不去复习」就是它 */
  function needFixOf(r) {
    if (!r) return false;
    if (r.needFix !== undefined) return r.needFix === 1;
    return r.src === 'pk' && !!r.lapses && (Date.now() - (r.last || 0)) < 7 * 86400000;
  }

  /** 刚拼错、还没拼回来的词（needFix），错得多的排前面。
      老存档里 lapses > 0 但早就复习回来的词不算 —— 那是闯关自己的复习队列，
      错题本只放「这阵子刚错的」，不然会变成一百个词的一堵墙。 */
  function wrongWords(n) {
    var all = words(), out = [];
    for (var k in all) {
      var r = all[k];
      if (!needFixOf(r)) continue;
      out.push({ w: k, m: r.m || '', lapses: r.lapses || 1, last: r.last || 0, due: r.due || 0, src: r.src || '' });
    }
    out.sort(function (a, b) {
      if (b.lapses !== a.lapses) return b.lapses - a.lapses;
      return b.last - a.last;
    });
    out = out.slice(0, n || 12);
    return out.map(function (x) {
      var it = meanOf(x.w) || {};
      /* 词表还没拉回来时，用擂台上存下的中文兜底 —— 不能只给孩子一个英文单词 */
      return { w: x.w, m: it.m || x.m || '', p: it.p || '', lapses: x.lapses };
    });
  }

  /** 外面（擂台）拼错的词并进来：算一次 lapse，马上排进待复习 */
  function noteMiss(list) {
    if (!list || !list.length) return 0;
    var all = words(), now = Date.now(), n = 0;
    list.forEach(function (x) {
      var w = (typeof x === 'string') ? x : (x && x.w);
      if (!w) return;
      w = String(w).toLowerCase();
      var r = all[w] || { w: w, ef: 2.5, step: -1, ivl: 0, due: 0, reps: 0, lapses: 0, last: 0, src: 'arcade' };
      r.lapses = (r.lapses || 0) + 1;
      r.needFix = 1;                     /* 挂进错词本，拼对一次才划掉 */
      r.step = 1;
      r.ivl = TUNE.GAP[1];
      r.due = now;
      r.last = now;
      r.src = 'pk';
      var m = (typeof x === 'object' && x) ? (x.cn || x.m || '') : '';
      if (m) r.m = m;                    /* 擂台上显示过的中文，存下来 */
      all[w] = r;
      n++;
    });
    if (n) saveWords(all);
    return n;
  }

  /* 一次只拼一个词。拼错了先给首字母，再错就把答案拆开给她看，
     第三次还错就直接显示全词、让她照着敲一遍 —— 目的不是考倒她，
     是让她把「中文 → 英文」这条线走通一遍。 */
  function practiceWords(list, onClose) {
    var queue = [], hint = {};
    (list || []).forEach(function (x) {
      var w = (typeof x === 'string') ? x : (x && x.w);
      if (!w) return;
      w = String(w).toLowerCase();
      queue.push(w);
      /* 外面带来的中文释义（擂台上显示过的那一句）留着兜底用 */
      var c = (typeof x === 'object' && x) ? (x.cn || x.m || '') : '';
      if (c) hint[w] = c;
    });
    if (!queue.length) { SM.fx.toast('没有要练的词'); return; }
    queue = shuffle(queue);

    /* 练完/退出后要让外面重画一版：拼对的词已经从错词本划掉了 */
    function closed() {
      if (typeof onClose === 'function') onClose(done, total);
      else if (SM.render) SM.render();
    }

    var total = queue.length, idx = 0, tries = 0, done = 0, revealed = '';
    var sheet = document.createElement('div');
    sheet.className = 'arc-sheet pw-sheet';
    sheet.innerHTML =
      '<div class="sheet-card pw-card">'
      + '<div class="pw-top"><span>错词重拼</span><b id="pwNum">1/' + total + '</b></div>'
      + '<div class="pw-cn" id="pwCn">—</div>'
      + '<div class="pw-slots" id="pwSlots"></div>'
      + '<input class="pw-in" id="pwIn" type="text" autocomplete="off" autocorrect="off" '
      + 'autocapitalize="off" spellcheck="false" inputmode="latin" placeholder="拼出这个单词">'
      + '<div class="pw-tip" id="pwTip"></div>'
      + '<div class="sheet-btns"><button class="btn-ghost" id="pwQuit">先不练</button>'
      + '<button class="btn-main" id="pwOk">检查</button></div>'
      + '</div>';
    document.body.appendChild(sheet);

    var cnEl = sheet.querySelector('#pwCn');
    var slotsEl = sheet.querySelector('#pwSlots');
    var inEl = sheet.querySelector('#pwIn');
    var tipEl = sheet.querySelector('#pwTip');
    var numEl = sheet.querySelector('#pwNum');
    var okBtn = sheet.querySelector('#pwOk');

    function paint() {
      var w = queue[idx] || '';
      var out = '';
      for (var i = 0; i < w.length; i++) {
        var ch = revealed[i] || (inEl.value[i] || '');
        out += '<i' + (ch ? ' class="on"' : '') + '>' + (ch || '·') + '</i>';
      }
      slotsEl.innerHTML = out;
    }

    function show() {
      var it = meanOf(queue[idx]);
      tries = 0;
      revealed = '';
      inEl.value = '';
      inEl.disabled = false;
      cnEl.textContent = (it && it.m) || hint[queue[idx]] || '（这个词的释义没查到）';
      tipEl.textContent = '';
      numEl.textContent = (idx + 1) + '/' + total;
      paint();
      setTimeout(function () { try { inEl.focus(); } catch (e) {} }, 120);
    }

    function next() {
      idx++;
      if (idx >= total) { finish(); return; }
      show();
    }

    function finish() {
      sheet.querySelector('.pw-card').innerHTML =
        '<div class="res-emoji">🎉</div>'
        + '<h3>这一轮拼完了</h3>'
        + '<p class="sheet-sub">' + done + ' 个词，一个不落地拼了一遍</p>'
        + '<p class="pw-note">拼过的词已经排进复习队列，过一会儿闯关时会再遇到。</p>'
        + '<button class="btn-main" id="pwEnd">知道了</button>';
      sheet.querySelector('#pwEnd').onclick = function () {
        A.tap(); sheet.remove();
        closed();
      };
    }

    function judge() {
      var w = queue[idx];
      var v = String(inEl.value || '').trim().toLowerCase();
      if (!v) { tipEl.textContent = '先拼出来再检查'; return; }
      if (v === w) {
        done++;
        A.ok && A.ok();
        inEl.disabled = true;
        revealed = w;
        paint();
        tipEl.textContent = '✓ 对啦';
        /* 拼对就把记忆往前推：这是真的复习到了 */
        srsUpdate(w, true, 4000);
        setTimeout(next, 520);
        return;
      }
      tries++;
      A.no && A.no();
      if (tries === 1) {
        revealed = w.slice(0, 1);
        tipEl.textContent = '不对哦，第一个字母是 ' + w[0].toUpperCase() + '（共 ' + w.length + ' 个字母）';
      } else if (tries === 2) {
        revealed = w.slice(0, Math.max(2, Math.ceil(w.length / 2)));
        tipEl.textContent = '再想想，前一半是 ' + revealed.toUpperCase() + '…';
      } else {
        revealed = w;
        inEl.value = '';
        tipEl.textContent = '它长这样：' + w.toUpperCase() + ' —— 照着敲一遍就往下走';
      }
      paint();
      inEl.focus();
    }

    inEl.addEventListener('input', paint);
    inEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); judge(); }
    });
    okBtn.onclick = function () { A.tap(); judge(); };
    sheet.querySelector('#pwQuit').onclick = function () {
      A.tap(); sheet.remove();
      closed();
    };
    show();
  }

  /* ---------------- 首页入口 ---------------- */
  function homeCard() {
    var a = arc();
    var best = a.bestTier || 0;
    var due = countDue();
    var enough = ST.stars >= TUNE.ENTRY_COST;
    return '<button class="arc-entry' + (enough ? '' : ' dim') + '" id="arcEntry">'
      + '<div class="arc-entry-ico">⚔️</div>'
      + '<div class="arc-entry-txt">'
      + '<b>单词闯关</b>'
      + '<span>' + (best ? '最高第 ' + best + ' 档' : '拼单词打怪') + ' · ' + due + ' 个词待复习</span>'
      + '</div>'
      + '<div class="arc-entry-cost">' + TUNE.ENTRY_COST + ' ⭐</div>'
      + '</button>';
  }
  function bindHome(root) {
    var el = root.querySelector('#arcEntry');
    if (el) el.onclick = function () { A.tap(); enter(); };
  }

  SM.arcade = {
    TUNE: TUNE,
    preload: preload,
    enter: enter,
    quickStart: quickStart,
    homeCard: homeCard,
    bindHome: bindHome,
    recoverPending: recoverPending,
    countDue: countDue,
    wrongWords: wrongWords,
    noteMiss: noteMiss,
    practiceWords: practiceWords,
    stats: function () { return { words: Object.keys(words()).length, due: countDue() }; }
  };

  /* 进页面就把词表拉起来（首页卡片要显示"几个词待复习"），
     顺手把上次没结算完的那一局补上。
     直达练习模式（/play）不补 —— 那是测试，不该给档案加星。 */
  function boot() {
    preload();
    if (!window.__SM_PLAY) setTimeout(recoverPending, 900);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.SM);
