/* ============================================================
   app.js — 渲染 / 路由 / 交互 / 错题池
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, S = SM.store, A = SM.sfx, FX = SM.fx, ST = SM.state, Q = SM.quiz;
  const M = SM.mascot;
  const app = document.getElementById('app');

  /* ============================================================
     错题记忆：交给 memory.js 的间隔复习引擎
     答错 → 打回 Lv0、1 分钟后重考；答对 → 升级，下次间隔拉长
     ============================================================ */
  const MEM = SM.memory;
  const V = SM.voice;

  function dueCount(mid) { return MEM.dueCount(mid); }

  /* ============================================================
     声音：本地 IndexTTS2 优先 → 浏览器语音 → 「哔」一声
     服务端合成一句要 6~8 秒，所以：固定台词启动时预生成，
     每道题的英文在题目出现时就提前合成，孩子点 🔊 时基本是秒开。
     ============================================================ */
  function speakZh(text) {
    V.sayZh(text, { fail: function () { A.blip(720); } });
  }

  /* 念英文：合成慢的时候给个提示，免得孩子以为没反应
     extra 可以传 start / end / fail / slow 接管界面反馈 */
  let slowTipAt = 0;
  function speakEn(text, extra) {
    extra = extra || {};
    /* 走 readQuestion：它会先把中英混排的题干抽成纯英文，
       和预生成用的是同一套抽取，缓存键才对得上 */
    V.readQuestion(text, {
      start: extra.start,
      end: extra.end,
      slow: function () {
        if (extra.slow) extra.slow();
        const now = Date.now();
        if (now - slowTipAt < 4000) return;
        slowTipAt = now;
        FX.toast('小鲸正在准备声音，稍等一下…');
      },
      fail: function () {
        if (extra.fail) extra.fail();
        FX.toast('这台设备暂时读不出这句，先跟着书上的读一遍吧');
      }
    });
  }

  /* ============================================================
     组卷：先取「到期待复习」的题，再用生成器补足
     补足的部分按知识点的薄弱度分配名额 —— 老出错的知识点
     多出几道，一直全对的少出几道。
     ============================================================ */

  /**
   * 把 need 个名额按权重分给各知识点。
   * 先按比例取整，余数给小数部分最大的；名额够的话保证每个
   * 知识点至少 1 题，别让某个知识点整卷消失。
   */
  function quotaFor(ids, need) {
    const wts = ids.map(function (id) { return MEM.weight(id); });
    const sum = wts.reduce(function (a, b) { return a + b; }, 0) || 1;
    const raw = wts.map(function (w) { return need * w / sum; });
    const out = raw.map(function (x) { return Math.floor(x); });

    let left = need - out.reduce(function (a, b) { return a + b; }, 0);
    const order = raw
      .map(function (x, i) { return { i: i, f: x - Math.floor(x) }; })
      .sort(function (a, b) { return b.f - a.f; });
    for (let k = 0; k < order.length && left > 0; k++, left--) out[order[k].i]++;

    if (need >= ids.length) {
      for (let i = 0; i < out.length; i++) {
        if (out[i]) continue;
        let maxI = 0;
        for (let j = 1; j < out.length; j++) if (out[j] > out[maxI]) maxI = j;
        if (out[maxI] > 1) { out[maxI]--; out[i] = 1; }
      }
    }
    return out;
  }

  function buildQuiz(mid, n) {
    const list = [];
    const taken = Object.create(null);       // 已入卷的指纹

    /** 入卷。重复的、被拉黑的争议题直接跳过 */
    function push(m, q, fp, extra) {
      if (!q) return false;
      /* 老存档里的词块题是按旧规则切的（没有标点块），
         照新规则判分会永远判错。这里按答案重切一遍，顺手把存档升级掉。 */
      if (q.t === 'b' && q.a && q.a[0]) q.tok = Q.tokenize(q.a[0]);
      const key = fp || Q.fp(q);
      if (taken[key] || MEM.isBad(key)) return false;
      taken[key] = 1;
      const it = { mid: m, fp: key, q: q };
      if (extra) for (const k in extra) it[k] = extra[k];
      list.push(it);
      return true;
    }

    /* ① 到期的复习题优先。
       以前固定只占六成，剩下的名额全给新题 —— 新题源源不断进池，
       待复习只增不减。现在到期题够多就几乎整卷复习，只留两成新题，
       保证孩子每次还能见到没做过的东西，但账能清下去。 */
    const due = MEM.due(mid);
    const cap = due.length >= n
      ? Math.max(1, n - Math.max(1, Math.round(n * 0.2)))
      : Math.max(1, Math.round(n * 0.6));
    due.slice(0, cap).forEach(function (r) {
      push(r.mid, r.q, r.fp, { rev: true, lv: r.lv });
    });

    /* ② 生成补足 */
    const need = n - list.length;
    if (need > 0) {
      if (mid === 'all') {
        // 综合卷直接铺开 7 个知识点，不掺 mix（mix 本身就是从这 7 个里取的）
        const ids = SM.order.filter(function (x) { return x !== 'mix'; });
        const quota = quotaFor(ids, need);

        ids.forEach(function (id, i) {
          if (!quota[i]) return;
          /* 多要几道当缓冲：可能撞上黑名单，或和复习题重复 */
          const pool = SM.modules[id].gen(quota[i] + 5);
          let got = 0;
          for (let j = 0; j < pool.length && got < quota[i]; j++) {
            if (push(id, pool[j])) got++;
          }
        });

        /* 还是不够（比如某个模块生成不出足够不同的题）就继续补 */
        for (let round = 0; round < 3 && list.length < n; round++) {
          for (let k = 0; k < ids.length && list.length < n; k++) {
            const more = SM.modules[ids[k]].gen(3);
            for (let j = 0; j < more.length && list.length < n; j++) push(ids[k], more[j]);
          }
        }
      } else {
        const mod = SM.modules[mid];
        const qs = mod.gen(need + 8);
        for (let i = 0; i < qs.length && list.length < n; i++) push(mid, qs[i]);
      }
    }

    return U.shuffle(list).slice(0, n);
  }

  /* ============================================================
     错题回炉：本卷内答错的题，隔几题再考一次
     （做完立刻重考，比隔一天再考更容易形成短期记忆）
     ============================================================ */
  function recycle(item) {
    const s = ST.session;
    if (!s || !s.recycled) return;
    if (s.recycled[item.fp]) return;      // 同一题本卷只回炉一次
    if (s.extra >= 6) return;             // 最多加 6 道，避免卷子无限变长
    s.recycled[item.fp] = 1;
    s.extra++;
    const at = Math.min(s.idx + 3 + U.rand(3), s.list.length);
    s.list.splice(at, 0, { mid: item.mid, fp: item.fp, q: item.q, again: true });
    FX.toast('这道题过一会儿再考你一次');
  }

  /** 把还没考到的同一道题从本卷里摘掉。
      家长刚点「这题出得不对」时，这道题可能已经被回炉排到后面去了，
      不摘掉的话过几题又会冒出来。 */
  function dropFromSession(fp) {
    const s = ST.session;
    if (!s || !s.list) return 0;
    let n = 0;
    for (let i = s.list.length - 1; i > s.idx; i--) {
      if (s.list[i].fp === fp) { s.list.splice(i, 1); n++; }
    }
    return n;
  }

  /* ============================================================
     启动练习
     ============================================================ */
  function startQuiz(mid, count, title) {
    const n = count || 10;
    /* 出题要是抛了异常，按钮会变成「点了没反应」——
       孩子和家长都看不出发生了什么。兜一层，至少给句人话。 */
    let list;
    try {
      list = buildQuiz(mid, n);
    } catch (e) {
      if (window.console) console.error('buildQuiz 出错：', e);
      FX.toast('出题出了点问题，刷新一下页面再试');
      return;
    }
    if (!list || !list.length) {
      FX.toast('这一关暂时出不了题，换一个知识点试试');
      return;
    }
    ST.session = {
      list: list,
      idx: 0,
      correct: 0,
      wrongs: [],
      maxCombo: 0,
      answered: false,
      cur: null,
      recycled: {},     // 本卷已回炉过的题
      extra: 0,         // 已追加的回炉题数量
      levelUp: 0,       // 本次升级的题数
      dueAtStart: MEM.stats().due,   // 开卷时的待复习数，结果页用来算清了多少
      title: title || (mid === 'all' ? '综合练习' : SM.modules[mid].name),
      mid: mid
    };
    ST.combo = 0;
    ST.screen = 'quiz';
    loadQ();
  }

  function loadQ() {
    const s = ST.session;
    const item = s.list[s.idx];
    const q = item.q;
    s.answered = false;
    s.cur = { picked: null, order: null, avail: [], chosen: [] };
    if (q.t === 'c') s.cur.order = U.shuffle(q.o.map(function (_, i) { return i; }));
    if (q.t === 'b') s.cur.avail = U.shuffle(q.tok.map(function (w, i) { return { id: i, w: w }; }));
    render();
  }

  /* ============================================================
     渲染入口
     ============================================================ */
  function render() {
    /* 换屏幕时把 toast 归位，免得它一直停在上方 */
    if (ST.screen !== 'quiz') {
      const tEl = document.getElementById('toast');
      if (tEl) tEl.classList.remove('up');
    }
    if (ST.screen === 'hub') return renderHub();
    if (ST.screen === 'ma' || ST.screen === 'cn' || ST.screen === 'track') {
      if (SM.subj) return SM.subj.render(ST.screen);
    }
    if (ST.screen === 'fun') return renderFun();
    if (ST.screen === 'soon') return renderSoon();
    if (ST.screen === 'home') return renderHome();
    if (ST.screen === 'lesson') return renderLesson();
    if (ST.screen === 'quiz') return renderQuiz();
    if (ST.screen === 'review') return renderReview();
    if (ST.screen === 'result') return renderResult();
    if (ST.screen === 'settings') return renderSettings();
  }

  /* ---------------- 学习中心 ---------------- */
  function openSettings() {
    ST.settingsFrom = (ST.screen === 'hub' || ST.screen === 'home' || ST.screen === 'fun') ? ST.screen : 'hub';
    ST.screen = 'settings';
    render();
  }

  function englishTaskLine() {
    const due = MEM.stats().due;
    return due > 0 ? '10 道题 · 先清 ' + Math.min(8, due) + ' 道待复习' : '10 道题 · 全是新题';
  }

  function subjectTaskLine(id, n) {
    const d = SM.day ? SM.day.get(id) : { n: 0, ok: 0 };
    return d.n > 0 ? '今天已做 ' + d.n + ' 题 · 正确率 ' + Math.round(d.ok / d.n * 100) + '%' : n + ' 道题 · 还没开始';
  }

  function renderHub() {
    const due = MEM.stats().due;
    app.innerHTML = '<div class="screen">'
      + '<div class="top">'
      +   '<div class="brand">学习中心</div>'
      +   '<button class="gear" id="gear" aria-label="设置">⚙️</button>'
      +   '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      + '<div class="scroll hub">'
      + '<div class="hub-l">'
      +   '<div class="hero">'
      +     '<div class="hero-m m-wrap" id="heroMascot"></div>'
      +     '<div class="hero-txt">'
      +       '<h1>Elaine的<em>学习中心</em></h1>'
      +       '<p id="hubLine">' + (due > 0
              ? '英语有 ' + due + ' 道题该复习啦'
              : '点点我，选一个开始吧') + '</p>'
      +     '</div>'
      +   '</div>'
      +   '<div class="sec"><span>今日任务</span><small>语 · 数 · 英</small></div>'
      +   '<div class="hub-tasks">'
      +     '<button class="hub-task go" id="taskCn" type="button"><span class="hub-task-ico">读</span>'
      +       '<div><b>语文</b><small>' + subjectTaskLine('cn', 8) + '</small></div>'
      +       '<i>' + (SM.day && SM.day.get('cn').n ? '继续' : '开始') + '</i></button>'
      +     '<button class="hub-task go" id="taskMa" type="button"><span class="hub-task-ico">算</span>'
      +       '<div><b>数学</b><small>' + subjectTaskLine('ma', 10) + '</small></div>'
      +       '<i>' + (SM.day && SM.day.get('ma').n ? '继续' : '开始') + '</i></button>'
      +     '<button class="hub-task go" id="taskEn" type="button"><span class="hub-task-ico">英</span>'
      +       '<div><b>英语</b><small>' + englishTaskLine() + '</small></div>'
      +       '<i>' + (due > 0 ? due + ' 待复习' : '开始') + '</i></button>'
      +   '</div>'
      + '</div>'
      + '<div class="hub-r">'
      +   '<div class="hub-mods">'
      +     '<button class="hub-mod" data-go="cn" type="button" style="--hc:#E25B45;--hd:#C2412D">'
      +       '<span>读</span><b>语文</b><small>字词 · 拼音</small></button>'
      +     '<button class="hub-mod" data-go="ma" type="button" style="--hc:#3B82F6;--hd:#1D4ED8">'
      +       '<span>算</span><b>数学</b><small>口算 · 换算</small></button>'
      +     '<button class="hub-mod" data-go="home" type="button" style="--hc:#FF7A59;--hd:#DE5230">'
      +       '<span>En</span><b>英语</b><small>句子练习</small></button>'
      +     '<button class="hub-mod" data-go="fun" type="button" style="--hc:#8B6CF0;--hd:#6D28D9">'
      +       '<span>玩</span><b>娱乐</b><small>闯关和擂台</small></button>'
      +   '</div>'
      + '</div>'
      + '</div></div>';

    const hm = document.getElementById('heroMascot');
    const heroEl = M.mount(hm, 'happy', { click: false });
    const hubLine = document.getElementById('hubLine');
    const HUB_LINES = ['今天想先学哪一科？', '英语可以开始练啦', '玩一玩也很好呀',
      '我会一直陪着你的', '点我可以跳舞哦', '语文和数学也能练啦'];
    function hubTalk(t, silent) {
      if (hubLine) {
        hubLine.textContent = t;
        hubLine.classList.remove('pop');
        void hubLine.offsetWidth;
        hubLine.classList.add('pop');
      }
      if (!silent) speakZh(t);
    }
    if (hm) {
      M.bindDrag(heroEl);
      hm.onclick = function () {
        A.tap();
        if (aiReady() && Math.random() < 0.25) {
          hubTalk('让我想想…', true);
          M.wait(heroEl);
          askAI('chat', [{
            role: 'user',
            content: '（孩子在学习中心首页戳了你一下。现在可以练语文（拼音写字词、多音字、错别字）、'
              + '数学（口算、单位换算、大数、运算定律）和英语，还有单词闯关和武道擂台。'
              + '说一句鼓励她的话，或者问问她想学哪一科。不要超过 30 个字。）'
          }]).then(function (j) {
            const t = (j && j.ok && j.text) ? j.text : HUB_LINES[U.rand(HUB_LINES.length)];
            M.setMood(heroEl, 'happy');
            hubTalk(t);
            M.jump(heroEl, '12px');
          }).catch(function () {
            M.setMood(heroEl, 'happy');
            hubTalk(HUB_LINES[U.rand(HUB_LINES.length)]);
          });
          return;
        }
        M.act(heroEl, { line: hubTalk });
      };
    }

    document.getElementById('gear').onclick = function () { A.tap(); openSettings(); };
    document.getElementById('taskEn').onclick = function () {
      A.tap();
      startQuiz('all', 10, '今日任务');
    };
    document.getElementById('taskCn').onclick = function () {
      A.tap();
      ST.screen = 'cn';
      if (SM.subj) { SM.subj.render('cn'); SM.subj.start('cn'); }
      else render();
    };
    document.getElementById('taskMa').onclick = function () {
      A.tap();
      ST.screen = 'ma';
      if (SM.subj) { SM.subj.render('ma'); SM.subj.start('ma'); }
      else render();
    };
    app.querySelectorAll('.hub-mod').forEach(function (el) {
      el.onclick = function () {
        A.tap();
        if (el.dataset.go === 'soon') {
          ST.soon = el.dataset.subj;
          ST.screen = 'soon';
        } else {
          ST.screen = el.dataset.go;
        }
        render();
      };
    });
  }

  function renderSoon() {
    const chinese = ST.soon === 'chinese';
    const name = chinese ? '语文' : '数学';
    const mark = chinese ? '读' : '算';
    app.innerHTML = '<div class="screen">'
      + '<div class="top">'
      +   '<button class="icon-btn" id="hubBack" aria-label="返回学习中心"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>'
      +   '<div class="top-title">' + name + '</div>'
      +   '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      + '<div class="scroll">'
      +   '<div class="soon">'
      +     '<div class="soon-mark">' + mark + '</div>'
      +     '<h2>' + name + '还在准备</h2>'
      +     '<p>这里先留着入口。今天可以先做英语，或者去娱乐里玩一玩。</p>'
      +     '<button class="soon-back" id="soonBack" type="button">回学习中心</button>'
      +   '</div>'
      + '</div></div>';
    function back() { A.tap(); ST.screen = 'hub'; render(); }
    document.getElementById('hubBack').onclick = back;
    document.getElementById('soonBack').onclick = back;
  }

  function renderFun() {
    app.innerHTML = '<div class="screen">'
      + '<div class="top">'
      +   '<button class="icon-btn" id="hubBack" aria-label="返回学习中心"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>'
      +   '<div class="top-title">娱乐</div>'
      +   '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      + '<div class="scroll">'
      +   '<p class="hub-lead">擂台、街机和赛道都在这儿，想玩哪个点哪个。</p>'
      +   (SM.arcade ? SM.arcade.homeCard() : '')
      +   pkCard()
      +   mpkCard()
      + '</div></div>';
    document.getElementById('hubBack').onclick = function () {
      A.tap();
      ST.screen = 'hub';
      render();
    };
    if (SM.arcade) SM.arcade.bindHome(app);
    bindPk(app);
    bindMpk(app);
  }

  function bindPk(root) {
    var pkEl = root.querySelector('#pkEntry');
    if (!pkEl) return;
    pkEl.onclick = function () {
      A.tap();
      /* 先把没落盘的星星写完，再跳 —— PK 页不加载学习主体，
         它只认服务器上的档案；这边要是晚一步写，就会把旧星数盖回去 */
      try { SM.store.flush(); } catch (e) { /* ignore */ }
      var who = SM.store.profile()
        || (window.__SM_PLAY && window.__SM_PLAY.who) || '';
      if (!who) {
        try { who = localStorage.getItem('sm_profile') || ''; } catch (e) { who = ''; }
      }
      if (!who) {
        SM.fx.toast('先在设置里填个学习档案的名字');
        return;
      }
      location.href = 'pk.html?who=' + encodeURIComponent(who);
    };
  }

  /* 机器人马拉松：数学答题 + 3D 赛道，独立页面，同理由服务器记账 */
  function bindMpk(root) {
    var el = root.querySelector('#mpkEntry');
    if (!el) return;
    el.onclick = function () {
      A.tap();
      try { SM.store.flush(); } catch (e) { /* ignore */ }
      var who = SM.store.profile()
        || (window.__SM_PLAY && window.__SM_PLAY.who) || '';
      if (!who) {
        try { who = localStorage.getItem('sm_profile') || ''; } catch (e) { who = ''; }
      }
      if (!who) {
        SM.fx.toast('先在设置里填个学习档案的名字');
        return;
      }
      location.href = 'math-pk.html?who=' + encodeURIComponent(who);
    };
  }

  function mpkCard() {
    return '<button class="arc-entry" id="mpkEntry">'
      + '<div class="arc-entry-ico">🏁</div>'
      + '<div class="arc-entry-txt">'
      + '<b>机器人马拉松</b>'
      + '<span>4 台机器人同场 · 答对提速 · 50⭐ 报名</span>'
      + '</div>'
      + '<div class="arc-entry-cost">PK</div>'
      + '</button>';
  }

  /* ---------------- 英语首页 ---------------- */
  /* 武道擂台入口：两台设备各登录自己的档案，建房/输房间号对打。
     和闯关不同，它是一个独立页面（pk.html）—— 里面是 Three.js，
     单独加载才不会拖慢首页。 */
  function pkCard() {
    return '<button class="arc-entry" id="pkEntry">'
      + '<div class="arc-entry-ico">🏯</div>'
      + '<div class="arc-entry-txt">'
      + '<b>武道擂台</b>'
      + '<span>两台设备联机 · 50⭐ 报名 · 赢家 +75⭐</span>'
      + '</div>'
      + '<div class="arc-entry-cost">联机</div>'
      + '</button>';
  }

  function renderHome() {
    const total = SM.order.length;
    const st = MEM.stats();

    /* 错题本：跨模式（每日 / 50 题 / 擂台）错过的题都记在这儿。
       标题不写「共 N 道」，写「还没弄懂 N 道」—— 少一点报表味，多一点提醒。
       擂台拼错的单词不在这份记忆库里（它们走闯关的 sm_words），
       所以这里要单独捞一次，不然只错单词的那一局回首页会没入口。 */
    const wrongs = MEM.recentWrong(99);
    const wGroups = groupByMid(wrongs.map(itemFromRec));
    const wTop = wGroups[0];
    const wWords = (SM.arcade && SM.arcade.wrongWords) ? SM.arcade.wrongWords(99) : [];
    const wTotal = wrongs.length + wWords.length;
    const wTitle = (wrongs.length && wWords.length)
      ? '错题本 · ' + wrongs.length + ' 道题 + ' + wWords.length + ' 个词'
      : (wrongs.length
          ? '错题本 · ' + wrongs.length + ' 道还没弄懂'
          : '错词本 · ' + wWords.length + ' 个词还没拼回来');
    const wSub = (wrongs.length
      ? (wTop ? '最常错：' + U.esc(wTop.name) : '做错过的题都在这')
      : '擂台上拼错的词也都在这儿')
      + (wWords.length && wrongs.length ? '，还有 ' + wWords.length + ' 个词' : '')
      + ' · 做对才划掉';

    let cards = '';
    SM.order.forEach(function (id) {
      const m = SM.modules[id];
      const w = dueCount(id);
      cards += '<button class="mod" data-mod="' + id + '" style="--c1:' + m.c1 + ';--c2:' + m.c2 + ';--cd:' + m.cd + '">'
        + '<div class="mod-ico">' + m.ico + '</div>'
        + '<div class="mod-name">' + U.esc(m.name) + '</div>'
        + '<div class="mod-sub">' + U.esc(m.sub) + '</div>'
        + (w > 0
            ? '<div class="mod-bar"><i style="width:' + Math.min(100, w * 12) + '%"></i></div>'
            + '<div class="mod-num">' + w + ' 道待复习</div>'
            : '<div class="mod-num inf">∞ 无限出题</div>')
        + '</button>';
    });

    app.innerHTML = '<div class="screen">'
      + '<div class="top">'
      +   '<button class="icon-btn" id="hubBack" aria-label="返回学习中心"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>'
      +   '<div class="brand">英语</div>'
      +   '<button class="gear" id="gear" aria-label="设置">⚙️</button>'
      +   '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      /* .home-l / .home-r 是给 iPad 横屏分栏用的两个槽：
         竖屏和手机上它们只是普通 div，堆叠顺序和以前完全一样；
         横屏时外面变成 flex，左边「今天做什么」、右边「知识地图」。
         用 grid 分栏会让两栏共享行高，左栏的卡片会被右栏撑得老高，
         所以这里用两个独立容器。 */
      + '<div class="scroll home">'
      + '<div class="home-l">'
      +   '<div class="hero">'
      +     '<div class="hero-m m-wrap" id="heroMascot"></div>'
      +     '<div class="hero-txt">'
      +       '<h1>今天也要<em>加油</em>哦</h1>'
      +       '<p>' + (st.due > 0
              ? '有 ' + st.due + ' 道题该复习啦'
              : (st.learning > 0 ? '题目是现场生成的，每次都不一样' : '戳戳我，看我跳舞唱歌～')) + '</p>'
      +     '</div>'
      +   '</div>'
      +   (st.total === 0
            ? '<div class="membar empty">做完几道题，这里会开始记录你的记忆进度</div>'
            : '<div class="membar">'
              /* 三个桶互不重叠，加起来就是练过的总题数。
                 待复习排最前面 —— 它才是今天要干的活。 */
              + '<div' + (st.due > 0 ? ' class="hi"' : '') + '>'
              +   '<b>' + st.due + '</b><span>待复习</span></div>'
              + '<div><b>' + st.learning + '</b><span>学习中</span></div>'
              + '<div><b>' + st.master + '</b><span>已掌握</span></div>'
              + '</div>')
      +   '<button class="task" id="daily">'
      +     '<div class="task-txt">'
      +       '<div class="k">TODAY</div>'
      +       '<div class="v">今日任务</div>'
      +       '<div class="d">10 道题 · ' + (st.due > 0 ? '先清 ' + Math.min(8, st.due) + ' 道待复习' : '全是新题') + '</div>'
      +     '</div>'
      +     '<div class="task-go"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></div>'
      +   '</button>'
      +   '<button class="gen" id="gen50">'
      +     '<div class="gen-ico">⚡</div>'
      +     '<div class="gen-txt"><b>一键生成 50 题</b><span>全部知识点混着考</span></div>'
      +   '</button>'
      +   (wTotal
            ? '<button class="gen fix" id="fixBook">'
              + '<div class="gen-ico">📕</div>'
              + '<div class="gen-txt"><b>' + wTitle + '</b>'
              + '<span>' + wSub + '</span></div>'
              + '</button>'
            : '')
      + '</div>'
      + '<div class="home-r">'
      +   '<div class="sec"><span>知识地图</span><small>' + total + ' 个知识点</small></div>'
      +   '<div class="grid">' + cards + '</div>'
      + '</div>'
      + '</div>'
      + '</div>';

    /* 吉祥物 */
    const hm = document.getElementById('heroMascot');
    const heroEl = M.mount(hm, 'happy', { click: false });

    /* 首页小鲸不冒气泡（会顶到屏幕外），改成接管标题旁那句话 */
    const heroP = document.querySelector('.hero-txt p');
    function heroLine(t, silent) {
      if (heroP) {
        heroP.textContent = t;
        heroP.classList.remove('pop');
        void heroP.offsetWidth;
        heroP.classList.add('pop');
      }
      if (!silent) speakZh(t);
    }

    if (st.due > 0) {
      setTimeout(function () {
        if (heroP) {
          heroP.textContent = '有 ' + st.due + ' 道题在等你复习～';
          heroP.classList.add('pop');
        }
      }, 900);
    }

    /* 点小鲸 → 随机表演。
       填了 DeepSeek 的话，有四分之一概率让它自己想一句话说，
       其余时候从动作池里随机挑一个（跳舞/唱歌/摸头/戳一下/伸懒腰/打哈欠/吃东西…） */
    const TALK_LINES = ['我们一起做几道题吧！', '我今天学会一个新单词哦', '别怕做错，错了才能记住',
      '你已经很厉害了', '要不要来一次 50 题挑战？', '我会一直陪着你的'];

    function aiTalk() {
      heroLine('让我想想…', true);
      M.wait(heroEl);                       // 抱着沙漏等 DeepSeek
      askAI('chat', [{
        role: 'user',
        content: '（孩子刚在首页戳了你一下。说一句鼓励她练英语的话，'
          + '或者问问她今天想练哪个知识点。不要超过 30 个字。）'
      }]).then(function (j) {
        const t = (j && j.ok && j.text) ? j.text : TALK_LINES[U.rand(TALK_LINES.length)];
        M.setMood(heroEl, 'happy');
        heroLine(t);
        M.jump(heroEl, '12px');
      }).catch(function () {
        M.setMood(heroEl, 'happy');
        heroLine(TALK_LINES[U.rand(TALK_LINES.length)]);
      });
    }

    if (hm) {
      M.bindDrag(heroEl);                   // 小鲸可以用手指拎起来
      hm.onclick = function () {
        A.tap();
        if (aiReady() && Math.random() < 0.25) { aiTalk(); return; }
        M.act(heroEl, { line: heroLine });
      };
    }

    document.getElementById('hubBack').onclick = function () {
      A.tap();
      ST.screen = 'hub';
      render();
    };
    document.getElementById('gear').onclick = function () { A.tap(); openSettings(); };

    document.getElementById('daily').onclick = function () { A.tap(); startQuiz('all', 10, '今日任务'); };
    document.getElementById('gen50').onclick = function () { A.tap(); startQuiz('all', 50, '50 题挑战'); };
    const fixBtn = document.getElementById('fixBook');
    if (fixBtn) {
      fixBtn.onclick = function () {
        A.tap();
        openBook();
      };
    }
    app.querySelectorAll('.mod').forEach(function (el) {
      el.onclick = function () { A.tap(); openModule(el.dataset.mod); };
    });
  }

  /* ---------------- 讲解页 ---------------- */
  function openModule(id) {
    ST.mod = SM.modules[id];
    ST.screen = 'lesson';
    render();
  }

  function renderLesson() {
    const m = ST.mod;
    let body = '';
    m.L.forEach(function (l) {
      let egs = '';
      (l.e || []).forEach(function (e) {
        const canRead = SM.voice.englishOf(e[0]).length > 0;
        egs += '<div class="eg' + (canRead ? ' read' : '') + '" data-en="' + U.esc(e[0]) + '">'
          + '<div class="en">' + U.esc(e[0]) + (canRead ? '<span class="eg-spk">🔊</span>' : '') + '</div>'
          + (e[1] ? '<div class="cn">' + U.esc(e[1]) + '</div>' : '') + '</div>';
      });
      body += '<div class="lcard"><h3>' + U.esc(l.h) + '</h3><p>' + U.esc(l.b) + '</p>' + egs + '</div>';
    });

    const w = dueCount(m.id);

    app.innerHTML = '<div class="screen" style="--c1:' + m.c1 + ';--c2:' + m.c2 + ';--cd:' + m.cd + '">'
      + '<div class="top">'
      +   '<button class="icon-btn" id="back"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>'
      +   '<div class="top-title">知识点讲解</div>'
      +   '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      + '<div class="scroll">'
      +   '<div class="lsn-head">'
      +     '<div class="tag">先看这里</div>'
      +     '<h2>' + U.esc(m.name) + '</h2>'
      +     '<p>' + U.esc(m.sub) + '</p>'
      +   '</div>'
      +   body
      + '</div>'
      + '<div class="foot">'
      +   '<div class="btn-row">'
      +     '<button class="btn ghost" id="go10">练 10 题</button>'
      +     '<button class="btn" id="go50">练 50 题</button>'
      +   '</div>'
      +   (w > 0 ? '<div class="foot-tip">这一关有 ' + w + ' 道题该复习了，会先出现</div>' : '')
      + '</div>'
      + '</div>';

    document.getElementById('back').onclick = function () { A.tap(); ST.screen = 'home'; render(); };
    document.getElementById('go10').onclick = function () { A.tap(); startQuiz(m.id, 10, m.name); };
    document.getElementById('go50').onclick = function () { A.tap(); startQuiz(m.id, 50, m.name + ' · 50 题'); };

    /* 例句点一下就能听发音 */
    app.querySelectorAll('.eg.read').forEach(function (el) {
      el.onclick = function () {
        A.tap();
        el.classList.add('speaking');
        const stop = function () { el.classList.remove('speaking'); };
        speakEn(el.dataset.en, { start: stop, end: stop, fail: stop });
      };
    });
  }

  /* ---------------- 练习页 ---------------- */
  function progressHTML(s) {
    if (s.list.length <= 12) {
      let dots = '';
      for (let i = 0; i < s.list.length; i++) {
        dots += '<i class="' + (i < s.idx ? 'done' : (i === s.idx ? 'now' : '')) + '"></i>';
      }
      return '<div class="dots">' + dots + '</div>';
    }
    const pct = Math.round(s.idx / s.list.length * 100);
    return '<div class="pbar-wrap"><div class="pbar"><i style="width:' + pct + '%"></i></div>'
      + '<span class="pbar-num">' + (s.idx + 1) + '/' + s.list.length + '</span></div>';
  }

  function splitQ(q) {
    const i = q.q.indexOf('\n');
    if (i > 0) {
      const first = q.q.slice(0, i);
      if (/：$/.test(first)) return { inst: first.slice(0, -1), body: q.q.slice(i + 1) };
    }
    const def = q.t === 'c' ? '选一个正确答案' : (q.t === 'b' ? '点词块组句' : '写出答案');
    return { inst: def, body: q.q };
  }

  /* 小鲸在题面下方的陪伴台词，按题号轮换 */
  const CHEERS = [
    '慢慢想，不着急～',
    '先看看主语是谁哦',
    '找找句子里有没有 be 动词',
    '主语是三单，动词要加 s',
    '不确定就点一下提示 💡',
    '读一遍再选，稳一点',
    '你一定可以的！',
    '错一次就是多学一次'
  ];
  function cheerFor(i) { return CHEERS[i % CHEERS.length]; }

  function renderQuiz() {
    const s = ST.session;
    const item = s.list[s.idx];
    const q = item.q;
    const m = SM.modules[item.mid];
    const sq = splitQ(q);

    let inner = '';
    if (q.t === 'c') {
      /* 选项长短差别很大：Does / When 这种两列排好看，
         整句选项挤两列就会折行。超过 15 个字符就退回单列。 */
      const longest = q.o.reduce(function (a, b) { return String(b).length > String(a).length ? b : a; }, '');
      inner += '<div class="opts' + (String(longest).length > 15 ? ' long' : '') + '" id="opts">';
      s.cur.order.forEach(function (oi, k) {
        inner += '<button class="opt" data-i="' + oi + '"><span class="k">'
          + String.fromCharCode(65 + k) + '</span><span>' + U.esc(q.o[oi]) + '</span></button>';
      });
      inner += '</div>';
    } else if (q.t === 'i') {
      inner += '<div class="answrap">'
        + '<input class="ansinput" id="ansInput" type="text" inputmode="latin" '
        + 'autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="false" '
        + 'placeholder="在这里输入答案…">'
        + '</div>'
        + '<div class="hintline" id="hintline">'
        + '<button class="hintbtn" id="hintBtn">💡 提示</button>'
        + '<span class="hinttxt" id="hintTxt"></span>'
        + '</div>';
    } else {
      inner += '<div class="slot" id="slot"></div><div class="bank" id="bank"></div>';
    }

    const hasEn = SM.voice.englishOf(sq.body).length > 0;

    app.innerHTML = '<div class="screen" style="--c1:' + m.c1 + ';--c2:' + m.c2 + ';--cd:' + m.cd + '">'
      + '<div class="top">'
      +   '<button class="icon-btn" id="back"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>'
      +   progressHTML(s)
      +   '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      + '<div class="qbody" id="qbody">'
      +   '<div class="qcard">'
      +     '<div class="qhead">'
      +       '<div class="qinst">' + U.esc(sq.inst) + '</div>'
      +       (hasEn ? '<button class="spk" id="spk" aria-label="朗读题目">🔊</button>' : '')
      +     '</div>'
      +     '<div class="qtext">' + U.nl(sq.body) + '</div>'
      +   '</div>'
      +   inner
      +   '<div class="buddy m-wrap" id="buddy">'
      +     '<div class="buddy-m" id="buddyM"></div>'
      +     '<div class="buddy-say" id="buddySay">' + U.esc(cheerFor(s.idx)) + '</div>'
      +   '</div>'
      +   '<div class="cheat"><div class="cheat-in"><b>💡 本关要点</b>'
      +     m.L.slice(0, 3).map(function (l) { return '<div>· ' + U.esc(l.h) + '</div>'; }).join('')
      +   '</div></div>'
      + '</div>'
      + '<div class="foot" id="foot"><button class="btn" id="footBtn">检查答案</button></div>'
      + '<div class="sheet" id="sheet"></div>'
      + '</div>';

    document.getElementById('back').onclick = function () { A.tap(); ST.screen = 'home'; render(); };
    document.getElementById('footBtn').onclick = function () {
      if (s.answered) nextQ(); else check();
    };

    /* 题面下方的小鲸：一直呼吸、偶尔看看你，点一下会回应 */
    M.mount(document.getElementById('buddyM'), q.t === 'i' ? 'think' : 'happy');

    /* 朗读题目 */
    const spk = document.getElementById('spk');
    if (spk) {
      spk.onclick = function () {
        A.tap();
        /* 还没合成好就一直转圈，出声了才停 */
        spk.classList.add('wait');
        const stop = function () { spk.classList.remove('wait'); };
        speakEn(sq.body, {
          start: stop,
          end: stop,
          fail: stop
        });
      };
    }
    if (q.t === 'c') {
      app.querySelectorAll('.opt').forEach(function (el) {
        el.onclick = function () {
          if (s.answered) return;
          s.cur.picked = parseInt(el.dataset.i, 10);
          check();
        };
      });
    }
    if (q.t === 'i') {
      const inp = document.getElementById('ansInput');
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); inp.blur(); check(); }
      });
      document.getElementById('hintBtn').onclick = function () {
        A.tap();
        const first = q.a[0].split(' ')[0];
        document.getElementById('hintTxt').textContent =
          '首词是 “' + first + '”，一共 ' + q.a[0].split(' ').length + ' 个词';
      };
    }
    if (q.t === 'b') renderBank();
  }

  function renderBank() {
    const s = ST.session;
    const slot = document.getElementById('slot');
    const bank = document.getElementById('bank');
    if (!slot || !bank) return;

    /* 标点块（句号 / 问号）单独一个样式，不然一个空荡荡的大方块看不出是什么 */
    function tokHtml(t, side) {
      const punc = /^[.?!,;:]+$/.test(t.w);
      return '<button class="tok' + (side === 's' ? ' on' : '') + (punc ? ' punc' : '')
        + '" data-side="' + side + '" data-id="' + t.id + '">' + U.esc(t.w) + '</button>';
    }

    slot.innerHTML = s.cur.chosen.length
      ? s.cur.chosen.map(function (t) { return tokHtml(t, 's'); }).join('')
      : '<span class="ph">点下面的词块，按顺序排好</span>';

    bank.innerHTML = s.cur.avail.map(function (t) { return tokHtml(t, 'b'); }).join('');

    slot.querySelectorAll('.tok').forEach(function (el) {
      el.onclick = function () {
        if (s.answered) return;
        A.tap();
        const id = parseInt(el.dataset.id, 10);
        const i = s.cur.chosen.findIndex(function (t) { return t.id === id; });
        if (i < 0) return;
        s.cur.avail.push(s.cur.chosen.splice(i, 1)[0]);
        renderBank();
      };
    });
    bank.querySelectorAll('.tok').forEach(function (el) {
      el.onclick = function () {
        if (s.answered) return;
        A.tap();
        const id = parseInt(el.dataset.id, 10);
        const i = s.cur.avail.findIndex(function (t) { return t.id === id; });
        if (i < 0) return;
        s.cur.chosen.push(s.cur.avail.splice(i, 1)[0]);
        renderBank();
      };
    });
  }

  /* ---------------- 判题 ---------------- */
  function check() {
    const s = ST.session;
    if (s.answered) return;
    const item = s.list[s.idx];
    const q = item.q;
    let ok = false;
    let mine = '';          // 孩子写的 / 选的，讲题时要指出来

    if (q.t === 'c') {
      if (s.cur.picked === null) { FX.toast('先选一个答案吧'); return; }
      ok = (s.cur.picked === q.a);
      mine = q.o[s.cur.picked] || '';
      app.querySelectorAll('.opt').forEach(function (el) {
        const i = parseInt(el.dataset.i, 10);
        el.style.pointerEvents = 'none';
        if (i === q.a) el.classList.add('right');
        else if (i === s.cur.picked) el.classList.add('wrong');
        else el.classList.add('dim');
      });
      if (!ok) {
        const bad = app.querySelector('.opt.wrong');
        if (bad) bad.classList.add('shake');
      }
    } else if (q.t === 'i') {
      const inp = document.getElementById('ansInput');
      const v = inp.value.trim();
      if (!v) { FX.toast('先写一写答案'); inp.focus(); return; }
      mine = v;
      ok = q.a.some(function (a) { return U.same(a, v); });
      inp.disabled = true;
      const hl = document.getElementById('hintline');
      if (hl) hl.style.display = 'none';
      if (!ok) inp.classList.add('shake');
    } else {
      const picked = s.cur.chosen.map(function (t) { return t.w; });
      const text = Q.joinTokens(picked);
      if (!text) { FX.toast('先点几个词块吧'); return; }
      mine = text;
      /* 逐块比对，标点必须放对 —— 句号漏了不算拼对 */
      ok = q.a.some(function (a) { return Q.sameTokens(a, picked); });
      app.querySelectorAll('.tok').forEach(function (t) { t.style.pointerEvents = 'none'; });
    }

    s.answered = true;

    /* 手写整句答错了，先让 AI 复核一次 ——
       有些题孩子写得也对，只是不如标准答案自然，不该判错。
       单词填空、选择题、词块题答案都是固定的，不用复核。 */
    if (!ok && needJudge(q, mine)) {
      judgeThenSettle(item, q, mine);
      return;
    }
    settle(item, q, mine, ok);
  }

  /** 这道题要不要请 AI 复核 */
  function needJudge(q, mine) {
    if (q.t !== 'i') return false;                  // 只有手写题可能有多解
    if (!aiReady()) return false;                   // 没配 Key 就别折腾
    const ans = String(q.a[0] || '');
    if (ans.indexOf(' ') < 0) return false;         // 只填一个词，答案基本唯一
    return String(mine || '').trim().length > 1;
  }

  /**
   * 复核期间先不弹层，在题目下面挂一条「小鲸在核对」。
   * 4.5 秒还没回就按答错走，别让孩子干等。
   * （实测一次复核 0.9~1.7 秒，留出两倍余量，免得网络抖动时把对的判成错）
   */
  function judgeThenSettle(item, q, mine) {
    const body = document.getElementById('qbody');
    const bm = document.querySelector('.buddy-m .mascot');
    const foot = document.getElementById('foot');
    if (foot) foot.style.visibility = 'hidden';

    let wait = null;
    if (body) {
      wait = document.createElement('div');
      wait.className = 'judge-wait';
      wait.innerHTML = '<i></i><span>小鲸看看你这句话算不算对…</span>';
      /* 要挂在输入框正下方。直接 appendChild 会排到「本关要点」后面，
         被底部按钮区压住看不见（.cheat 有 margin-top:auto，本来就靠底） */
      const anchor = document.getElementById('hintline') || document.querySelector('.answrap');
      if (anchor && anchor.parentNode === body) body.insertBefore(wait, anchor.nextSibling);
      else body.appendChild(wait);
    }
    if (bm) M.wait(bm);
    const sayEl = document.getElementById('buddySay');
    if (sayEl) sayEl.textContent = '让我看看你写的…';

    let done = false;
    function finish(accept) {
      if (done) return;
      done = true;
      if (wait && wait.parentNode) wait.remove();
      if (bm) M.setMood(bm, accept ? 'happy' : 'sad');
      if (accept) {
        /* 判定为「也成立」：拉黑这道题，本次按答对算 */
        MEM.markBad(item.fp, q.q, item.mid, 'AI 复核：孩子的写法也成立');
        settle(item, q, mine, true, 'alt');
      } else {
        settle(item, q, mine, false);
      }
    }

    const timer = setTimeout(function () { finish(false); }, 4500);
    askAI('judge', [{
      role: 'user',
      content: '题目：' + String(q.q).replace(/\n/g, ' ')
        + '\n标准答案：' + String(q.a[0])
        + '\n学生答案：' + mine
    }], 9000).then(function (j) {
      clearTimeout(timer);
      const txt = (j && j.ok && j.text) || '';
      /* 服务端约定只回 RIGHT / WRONG 一个词 */
      finish(/^\s*RIGHT\b/i.test(txt));
    }).catch(function () {
      clearTimeout(timer);
      finish(false);
    });
  }

  /**
   * 落账：计分、记忆、音效、弹层。
   * kind === 'alt' 表示这题被判定为「孩子那样写也对」——
   * 按答对算，但不进记忆库（以后不再出这道题）。
   *
   * 错题重练（s.redo）走另一条路：不给星、不进连击，
   * 答对就把题从队列里销掉，答错就排到队尾再来（最多三次）。
   */
  function settle(item, q, mine, ok, kind) {
    const s = ST.session;
    const alt = kind === 'alt';

    /* 三科共用一条每日流水，学习轨迹页要用 */
    if (SM.day) SM.day.log('en', ok);

    if (s.redo) return settleRedo(item, q, mine, ok, alt);

    /* 知识点账本：争议题不记账，否则会把薄弱度算歪 */
    if (!alt) MEM.hit(item.mid, ok);

    if (ok) {
      s.correct++;
      ST.stars++;
      ST.combo++;
      if (ST.combo >= 3) ST.stars++;
      if (ST.combo > s.maxCombo) s.maxCombo = ST.combo;
      ST.saveStars();

      if (alt) {
        MEM.drop(item.fp);                    // 争议题别占着复习队列
      } else {
        const rec = MEM.right(item.fp, q, item.mid);
        /* rec 为 null = 这道新题没进记忆池（今日新题配额用完了），
           当次照样算答对，只是不留复习账 */
        if (rec) {
          if (rec.lv >= MEM.MASTER) s.levelUp++;
          item.lv = rec.lv;
        }
      }

      A.ok(); A.buzz(18);
      const ns = app.querySelector('.top .pill b');
      if (ns) ns.textContent = ST.stars;
      const r = document.querySelector('.qcard').getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2);
      if (ST.combo >= 3) FX.combo(ST.combo);
    } else {
      ST.combo = 0;
      MEM.wrong(item.fp, q, item.mid, mine);
      /* 同一道题可能被回炉再错一次，清单里只留一条 */
      if (!s.wrongs.some(function (w) { return w.fp === item.fp; })) {
        s.wrongs.push({
          q: String(q.q || '').replace(/\n/g, ' '),
          a: rightText(q),
          fp: item.fp,
          mine: mine,
          qobj: q,
          mid: item.mid,
          tip: q.tip || ''
        });
      }
      recycle(item);                 // 本卷内隔几题再考一次
      A.no(); A.buzz([26, 50, 26]);
    }

    showSheet(ok, q, mine, alt);
  }

  /* 错题重练的一次落账 */
  function settleRedo(item, q, mine, ok, alt) {
    const s = ST.session;
    MEM.hit(item.mid, ok);

    if (ok) {
      s.correct++;
      s.cleared++;
      MEM.right(item.fp, q, item.mid);       // 答对才升级，明天再考一次就算毕业
      item.doneAt = Date.now();
      A.ok(); A.buzz(18);
      const r = document.querySelector('.qcard');
      if (r) {
        const b = r.getBoundingClientRect();
        FX.burst(b.left + b.width / 2, b.top + b.height / 2);
      }
    } else {
      MEM.wrong(item.fp, q, item.mid, mine);
      item.tries = (item.tries || 0) + 1;
      item.mine = mine;
      /* 还错就排到队尾，过几题再问一次 —— 这才是「做到会为止」。
         同一题最多问三次，免得孩子被一道题卡住出不去。 */
      if (item.tries < 3) {
        s.list.push({
          mid: item.mid, fp: item.fp, q: item.q, mine: mine,
          tries: item.tries, redo: true
        });
      } else {
        item.gaveUp = true;
      }
      A.no(); A.buzz([26, 50, 26]);
    }

    showSheet(ok, q, mine, alt, { redo: true });
  }

  function rightText(q) {
    if (q.t === 'c') return q.o[q.a];
    const raw = q.a[0];
    if (q.s) return raw;                          // 只填一个词，原样给
    if (/[.?!]$/.test(raw)) return raw;           // 已经是完整句子，别再补句号
    return U.cap(raw) + '.';
  }

  function showSheet(ok, q, mine, alt, opts) {
    const sheet = document.getElementById('sheet');
    const s = ST.session;
    const isLast = (s.idx === s.list.length - 1);
    const item = s.list[s.idx];
    const rec = MEM.get(item.fp);
    const ansText = rightText(q);
    const tip = q.tip || '';
    const redo = !!(opts && opts.redo);

    const bonus = redo
      ? (ok ? '<span class="up">订正 ✓ 这题算你的了</span>' : '<span>还要再来一次</span>')
      : alt
        ? '<span class="up">两种写法都成立 · +1 ⭐</span>'
        : (ok && ST.combo >= 3)
          ? '<span class="up">连击 x' + ST.combo + ' · +2 ⭐</span>'
          : (ok ? '<span class="up">答对啦 · +1 ⭐</span>' : '<span>没关系，记住它</span>');

    /* 小鲸要说的话：答对是花式鼓励，答错是「你写的是 X，应该是 Y」，
       判定为「你也对」时解释清楚是题目出得不严谨，不是她的问题 */
    const sayText = alt
      ? '你这个写法也成立！是这道题出得不够严谨，小鲸把它收起来了，以后不考它。'
      : (ok ? praiseLine() : explainLine(q, mine));
    /* 念的时候把语法要点也带上，听得更完整 */
    const readText = (ok && !alt) ? sayText : (sayText + (tip ? ' ' + tip : ''));

    /* 记忆条：这道题下次什么时候再来 */
    let memStrip = '';
    if (rec) {
      memStrip = rec.lv >= MEM.MASTER
        ? '<div class="mem-strip done">🎉 这道题你已经彻底掌握了</div>'
        : '<div class="mem-strip"><span>下次复习：' + MEM.whenText(rec.lv) + '</span>'
          + '<i>' + MEM.lvBar(rec.lv) + '</i></div>';
    }

    /* 答错或判为「你也对」时都亮出标准写法，方便对照 */
    const showAns = !ok || alt;

    sheet.innerHTML = '<div class="sheet-grip"></div>'
      + '<div class="sheet-head">'
      +   '<div class="sheet-m" id="sheetM"></div>'
      +   '<div class="sheet-t">'
      +     '<b>' + (alt ? '这题算你对' : (ok ? praise() : '差一点点')) + '</b>'
      +     bonus
      +   '</div>'
      + '</div>'
      + '<div class="sheet-body">'
      +   (showAns ? '<div class="ans"><em>' + (alt ? '参考写法' : '正确答案') + '</em>'
            + U.esc(ansText) + '</div>' : '')
      +   (!ok && mine ? '<div class="mine"><em>你写的是</em>' + U.esc(mine) + '</div>' : '')
      +   '<div class="say' + (alt ? ' alt' : '') + '" id="sayBox"><i>🐳</i><span id="sayTxt">'
      +     U.esc(sayText) + '</span></div>'
      +   (tip ? '<div class="tip">' + U.esc(tip) + '</div>' : '')
      +   memStrip
      + '</div>'
      + '<button class="sheet-flag" id="flagQ">⚠️ 这题出得不对</button>'
      + (!ok && !alt && aiReady() ? '<button class="sheet-ask" id="askMore">🐳 让小鲸细讲</button>' : '')
      + '<button class="btn ' + (ok ? 'ok' : '') + '" id="sheetBtn">'
      +   (isLast ? (redo ? '看看结果' : '看看成绩') : '继续') + '</button>';

    /* 弹层里的吉祥物：答对跳，答错摇头 */
    const sm = document.getElementById('sheetM');
    sm.innerHTML = M.svg(ok ? 'cheer' : 'sad');
    const mel = sm.querySelector('.mascot');
    if (ok) M.jump(mel, '10px'); else M.shake(mel);

    const foot = document.getElementById('foot');
    if (foot) foot.style.visibility = 'hidden';

    /* 弹层盖住了下半屏，toast 得让路，否则会压在讲解上 */
    const toastEl = document.getElementById('toast');
    if (toastEl) toastEl.classList.add('up');

    document.getElementById('sheetBtn').onclick = function () { A.tap(); nextQ(); };

    /* 「这题出得不对」：先让孩子说说哪里不对，再由小鲸判断要不要修 */
    const flagBtn = document.getElementById('flagQ');
    if (flagBtn) {
      flagBtn.onclick = function () {
        A.tap();
        if (flagBtn.dataset.done) return;
        if (!SM.fix) {                      // 极端情况下退回一键拉黑
          MEM.markBad(item.fp, q.q, item.mid, '手动标记');
          dropFromSession(item.fp);
          flagBtn.dataset.done = '1';
          flagBtn.classList.add('done');
          flagBtn.textContent = '✓ 已记下，这类题不会再出';
          return;
        }
        SM.fix.open({
          subject: '英语',
          question: q.q,
          answer: rightText(q),
          onAccept: function () {
            MEM.markBad(item.fp, q.q, item.mid, '手动标记');
            dropFromSession(item.fp);          // 已回炉的那份也一并摘掉
            flagBtn.dataset.done = '1';
            flagBtn.classList.add('done');
            flagBtn.textContent = '✓ 已记下，这类题不会再出';
          }
        });
      };
    }

    /* 「让小鲸细讲」：把她的错误答案一起交给 DeepSeek，讲完念出来。
       讲过一次之后按钮变成「再听一遍」，方便她反复听。 */
    const askBtn = document.getElementById('askMore');
    if (askBtn) {
      let aiText = '';
      askBtn.onclick = function () {
        A.tap();
        if (aiText) {
          V.sayZh(aiText, { fail: function () { A.blip(700); } });
          return;
        }
        askBtn.disabled = true;
        askBtn.textContent = '小鲸正在想…';
        const mel2 = document.querySelector('#sheetM .mascot');
        if (mel2) M.wait(mel2);                 // 抱着沙漏等
        askAI('explain', [{
          role: 'user',
          content: '题目：' + String(q.q).replace(/\n/g, ' ')
            + '\n正确答案：' + ansText
            + (mine ? '\n孩子写的是：' + mine : '')
            + (tip ? '\n语法要点：' + tip : '')
            + '\n请用一句话点出她错在哪，再说正确形式是什么。不要重复题目全文。'
        }]).then(function (j) {
          /* 偶尔会拿到 ok:true 但正文是空的（模型被截断），
             这时不能让按钮变成「再听一遍」却什么都没有 */
          if (!j || !j.ok || !j.text) {
            askBtn.disabled = false;
            askBtn.textContent = '🐳 让小鲸细讲';
            if (mel2) M.setMood(mel2, 'sad');
            FX.toast((j && j.error) || '小鲸这次没想出来，再点一次试试');
            return;
          }
          aiText = j.text;
          askBtn.disabled = false;
          askBtn.textContent = '🔊 再听一遍';
          askBtn.classList.add('done');
          if (mel2) { M.setMood(mel2, 'happy'); M.jump(mel2, '10px'); }
          const box = document.getElementById('sayBox');
          const t = document.getElementById('sayTxt');
          if (t) t.textContent = j.text;
          if (box) box.classList.add('ai');
          V.sayZh(j.text, { fail: function () { A.blip(700); } });
        }).catch(function () {
          askBtn.disabled = false;
          askBtn.textContent = '网络不通，再试一次';
          if (mel2) M.setMood(mel2, 'sad');
        });
      };
    }

    /* 弹层要「先挂上去再滑上来」才有动画。
       rAF 在后台标签页 / 部分 WebView 里不触发，所以加一个定时兜底，保证一定会显示。 */
    let shown = false;
    const reveal = function () {
      if (shown) return;
      shown = true;
      sheet.classList.add('show');
    };
    requestAnimationFrame(reveal);
    setTimeout(reveal, 60);

    /* 真的让小鲸说出来。等「叮 / 嘟」音效先响，再开口，不然糊在一起；
       也要等弹层滑上来一点，否则像还没打开就说话了。
       设置页可以关掉「答题时出声」，但主动点「让小鲸细讲」照样会念。 */
    if (speakOn()) {
      setTimeout(function () {
        V.sayZh(readText, { fail: function () { A.blip(700); } });
      }, ok ? 420 : 520);
    }
  }

  /* 答题时小鲸要不要自动出声（设置页可关，默认开） */
  function speakOn() { return S.get('sm_speak', 1) !== 0; }

  /* ---------------- 小鲸的花式鼓励 ---------------- */
  const PRAISE = [
    '哇，这题你答得又快又准！',
    '完全正确，小鲸给你鼓鼓掌！',
    '厉害，这道题难不倒你。',
    '就是这个答案，太稳了！',
    '你又变强了一点点哦。',
    '这道题你一次就对了，真棒！',
    '小鲸的尾巴都开心得摇起来了！',
    '答对啦，继续保持这个手感。',
    '思路很清楚，值得表扬！',
    '你是不是偷偷复习过？太厉害了！',
    '这道题满分，给你一颗小星星。',
    '正确，你的英语越来越顺了。',
    '好样的，又拿下一题。',
    '这个答案，漂亮！',
    '小鲸记下了：这题你已经会了。',
    '干净利落，一点没犹豫。',
    '答对咯，我们继续往前冲。',
    '你的语法感觉越来越好了。',
    '这题答得像个英语小达人！',
    '棒棒的，奖励你一个鲸鱼抱抱！'
  ];

  const COMBO_LINE = [
    '连击 {n}，小鲸要给你跳舞了！',
    '已经连对 {n} 题啦，太厉害了！',
    '哇，连击 {n}，这波节奏超稳！',
    '{n} 连对，小鲸的尾巴甩成风扇了！',
    '连击 {n}，你这是要通关的节奏！'
  ];

  let lastPraise = -1;

  /** 花式鼓励：连击 3 以上有一半概率换成「连击台词」 */
  function praiseLine() {
    if (ST.combo >= 3 && Math.random() < 0.5) {
      return U.pick(COMBO_LINE).replace(/\{n\}/g, ST.combo);
    }
    let i = U.rand(PRAISE.length);
    if (i === lastPraise) i = (i + 1) % PRAISE.length;
    lastPraise = i;
    return PRAISE[i];
  }

  /** 答错时的口语讲解：先说她写的是什么，再给正确形式 */
  function explainLine(q, mine) {
    const right = rightText(q);
    if (!mine || U.same(mine, right)) return '正确答案是「' + right + '」，我们再看一遍。';
    return '你写的是「' + mine + '」，应该是「' + right + '」。';
  }

  let pIdx = 0;
  function praise() {
    const p = ['太棒了！', '答对啦！', '真厉害！', '就是这个！', '完全正确！', '厉害呀！', '满分表现！'];
    pIdx = (pIdx + 1 + U.rand(3)) % p.length;
    return p[pIdx];
  }

  function nextQ() {
    const s = ST.session;
    V.stop();                       // 别让上一题的讲解跟着翻到下一题
    const toastEl = document.getElementById('toast');
    if (toastEl) toastEl.classList.remove('up');
    const sheet = document.getElementById('sheet');
    if (sheet) sheet.classList.remove('show');
    if (s.idx < s.list.length - 1) {
      setTimeout(function () { s.idx++; loadQ(); }, 170);
    } else {
      setTimeout(finish, 190);
    }
  }

  /* ============================================================
     DeepSeek：小鲸的脑子
     Key 存在服务端，浏览器只说「我要问什么」。
     ============================================================ */
  function aiReady() {
    const i = V.info();
    return !!(i && i.ai);
  }

  function askAI(scene, messages, timeoutMs) {
    /* DeepSeek 偶尔会慢，超过时限就放弃，别让按钮一直转「正在想…」 */
    const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctl) ctl.abort(); }, timeoutMs || 12000);
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene: scene, messages: messages }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); return j; })
      .catch(function () {
        clearTimeout(timer);
        return { ok: false, error: '小鲸反应有点慢，等会儿再试' };
      });
  }

  /* ---------------- 结果页 ----------------
     没有错题 → 直接给成绩单（纯粹庆祝）；
     有错题   → 先复盘，让孩子一条条看清「我错在哪」，再做一遍才算完。
     这一步是「别一划而过」的关键：错题不清零就回不到首页。 */
  function finish() {
    const s = ST.session;
    const key = s.title;
    if (s.correct > (ST.best[key] || 0)) {
      ST.best[key] = s.correct;
      S.set('sm_best', ST.best);
    }
    A.level();

    if (s.redo) {
      const left = redoLeft(s);
      ST.review = {
        src: 'redo',
        title: '错题重练',
        cleared: s.cleared || 0,
        total: s.redoTotal || 0,
        items: left,
        mid: s.mid
      };
      ST.screen = 'review';
      render();
      return;
    }

    if (s.wrongs.length) {
      ST.review = {
        src: 'quiz',
        title: s.title,
        right: s.correct,
        wrong: s.wrongs.length,
        total: s.list.length,
        combo: s.maxCombo,
        items: s.wrongs.map(itemFromSession),
        mid: s.mid,
        count: s.list.length
      };
      ST.screen = 'review';
      render();
      return;
    }

    ST.screen = 'result';
    render();
  }

  /* ---------------- 复盘 / 错题本 ---------------- */

  /** 把本卷记录的一条错题，整理成复盘页能直接渲染的样子 */
  function itemFromSession(w) {
    return {
      fp: w.fp,
      mid: w.mid,
      q: String(w.q || '').replace(/\n/g, ' '),
      qobj: w.qobj || null,
      mine: w.mine || '',
      right: w.a || '',
      tip: w.tip || ''
    };
  }

  /** 把记忆库里的一条错题记录，整理成同一种样子 */
  function itemFromRec(r) {
    const q = (r && r.q && typeof r.q === 'object') ? r.q : null;
    return {
      fp: r.fp,
      mid: r.mid,
      q: q ? String(q.q || '').replace(/\n/g, ' ') : '（这道题的题干已经归档）',
      qobj: q,
      mine: r.mine || '',
      right: q ? rightText(q) : '（已归档）',
      tip: (q && q.tip) || '',
      rec: r
    };
  }

  /** 重练队列里还没做对的题（同一道题可能排了多次，按 fp 去重） */
  function redoLeft(s) {
    const seen = Object.create(null);
    const out = [];
    s.list.forEach(function (it) {
      if (it.doneAt || it.gaveUp || seen[it.fp]) return;
      seen[it.fp] = 1;
      out.push({
        fp: it.fp,
        mid: it.mid,
        q: String(it.q.q || '').replace(/\n/g, ' '),
        qobj: it.q,
        mine: it.mine || '',
        right: rightText(it.q),
        tip: it.q.tip || ''
      });
    });
    return out;
  }

  /** 按知识点归类：{ mid, name, ico, n, items } */
  function groupByMid(items) {
    const map = Object.create(null);
    const out = [];
    items.forEach(function (it) {
      const mid = it.mid || 'mix';
      if (!map[mid]) {
        const m = SM.modules[mid] || {};
        map[mid] = { mid: mid, name: m.name || '综合', ico: m.ico || '📘', sub: m.sub || '', n: 0, items: [] };
        out.push(map[mid]);
      }
      map[mid].n++;
      map[mid].items.push(it);
    });
    out.sort(function (a, b) { return b.n - a.n; });
    return out;
  }

  /** 一句人话总结：「错在第三人称单数（2 道）」 */
  function reviewHead(groups) {
    if (!groups.length) return '';
    const top = groups[0];
    if (groups.length > 1 && groups.every(function (g) { return g.n === 1; })) {
      return '错得比较散：' + groups.length + ' 类各错 1 道，逐条看一遍';
    }
    if (groups.length === 1) return '错在「' + top.name + '」，一共 ' + top.n + ' 道';
    return '主要在「' + top.name + '」错 ' + top.n + ' 道，另外 ' + (groups.length - 1) + ' 类也要看一眼';
  }

  function renderReview() {
    const R = ST.review;
    if (!R) { ST.screen = 'home'; return render(); }
    const items = R.items || [];
    const groups = groupByMid(items);
    /* 单词也算「没弄懂」：只拼错单词的那一局，错题本是空的但错词本不是 */
    const words = R.words || [];
    const allCleared = !items.length && !words.length;
    const book = R.src === 'book';

    /* 一句话状态，别一上来就甩数字 */
    let mood = 'think';
    let head, sub;
    if (allCleared && R.src === 'redo') {
      mood = 'cheer';
      head = '这次的错题全做对了';
      sub = '你刚把 ' + R.total + ' 道错题重新做对，它们过几天会再考你一次，那时候也对就真记住了。';
    } else if (allCleared && book) {
      mood = 'cheer';
      head = '错题本是空的';
      sub = '这一阵子做错的题都已经弄懂了。做几道新题，我再帮你记着。';
    } else if (allCleared) {
      mood = 'cheer';
      head = '全部答对，没有错题';
      sub = '这一轮很干净，说明这些知识点你是真会了。';
    } else if (book && !items.length) {
      mood = 'think';
      head = '还有 ' + words.length + ' 个词没拼回来';
      sub = '这些是你在擂台上拼错的词。按中文把它们拼出来，拼对一次就划掉。';
    } else if (book) {
      mood = 'think';
      head = '还有 ' + items.length + ' 道题'
        + (words.length ? '和 ' + words.length + ' 个词' : '') + '没弄懂';
      sub = (words.length
        ? '题点「一道道做对」，词按中文拼一遍，做对了才会从这里划掉。'
        : '这些都是你做错过的题。点「一道道做对」，做对了才会从这里划掉。');
    } else {
      mood = 'sad';
      head = '这一轮有 ' + (R.wrong || items.length) + ' 道没做对';
      sub = reviewHead(groups);
    }

    /* 知识点分组卡：先让孩子知道「是哪一类不会」，而不是只看到一串题 */
    let groupHtml = '';
    if (groups.length) {
      groupHtml = '<div class="rv-groups">' + groups.map(function (g) {
        return '<div class="rv-group">'
          + '<span class="rg-ico">' + U.esc(g.ico) + '</span>'
          + '<span class="rg-txt"><b>' + U.esc(g.name) + '</b>'
          + (g.sub ? '<i>' + U.esc(g.sub) + '</i>' : '') + '</span>'
          + '<span class="rg-n">错 ' + g.n + '</span>'
          + '</div>';
      }).join('') + '</div>';
    }

    /* 逐题卡：题目 / 你写的 / 正确的 / 为什么 / 听一遍 */
    let listHtml = '';
    if (items.length) {
      listHtml = '<div class="rv-list">' + items.map(function (it, i) {
        const q = it.qobj;
        const no = '<span class="rv-no">' + (i + 1) + '</span>';
        return '<div class="rv-item" data-i="' + i + '">'
          + '<div class="rv-q">' + no + U.nl(it.q) + '</div>'
          + (it.mine
              ? '<div class="rv-line bad"><i>你写的</i><span>' + U.esc(it.mine) + '</span></div>'
              : '<div class="rv-line bad"><i>你写的</i><span class="rv-empty">（空着没写）</span></div>')
          + '<div class="rv-line ok"><i>正确的</i><span>' + U.esc(it.right) + '</span></div>'
          + (it.tip ? '<div class="rv-tip"><b>为什么</b>' + U.esc(it.tip) + '</div>' : '')
          + '<div class="rv-acts">'
          +   (q && SM.voice.englishOf(String(q.q || '') + ' ' + it.right).length
                ? '<button class="rv-btn rv-spk" data-i="' + i + '">🔊 听一遍</button>' : '')
          +   (q ? '<button class="rv-btn one" data-i="' + i + '">✏️ 只做这道</button>' : '')
          + '</div>'
          + '</div>';
      }).join('') + '</div>';
    }

    const n = Math.min(items.length, 12);

    /* 单词那一摊：拼错的词单独列一块，别和语法题混在一起。
       只有单词的时候（刚在擂台上只拼错了词），主按钮直接就是「再拼一遍」，
       这一块里的按钮就不重复放了。 */
    const wordHtml = words.length
      ? '<div class="rv-words">'
        + '<div class="rv-wt">这些单词拼错过 · ' + words.length + ' 个 · 拼对一次就划掉</div>'
        + '<div class="rv-wlist">' + words.map(function (w, i) {
          return '<button class="rv-w" data-i="' + i + '"><b>' + U.esc(w.w) + '</b>'
            + (w.m ? '<i>' + U.esc(w.m) + '</i>' : '')
            + (w.lapses > 1 ? '<em>错 ' + w.lapses + ' 次</em>' : '') + '</button>';
        }).join('') + '</div>'
        + (items.length
            ? '<button class="rv-btn wide" id="wordBtn">✏️ 把这 ' + words.length + ' 个词再拼一遍</button>'
            : '')
        + '</div>'
      : '';

    const primary = items.length
      ? '<button class="btn" id="redoBtn">'
        + (items.length > 12 ? '先做这 12 道' : '一道道做对（' + n + ' 道）') + '</button>'
      : (words.length
          ? '<button class="btn" id="redoWordsBtn">✏️ 把这 ' + words.length + ' 个词拼一遍</button>'
          : '<button class="btn" id="homeBtn">回首页</button>');

    app.innerHTML = '<div class="screen">'
      + '<div class="rv">'
      +   '<div class="rv-m" id="rvM"></div>'
      +   '<h2>' + head + '</h2>'
      +   '<p class="rv-sub">' + sub + '</p>'
      +   (R.src === 'quiz'
          ? '<div class="rv-stats">'
            + '<div><b style="color:#22C79A">' + (R.right || 0) + '</b><span>答对</span></div>'
            + '<div><b style="color:#FF6B81">' + (R.wrong || 0) + '</b><span>答错</span></div>'
            + '<div><b style="color:#FF7A59">' + (R.combo || 0) + '</b><span>最高连击</span></div>'
            + '</div>' : '')
      +   groupHtml
      +   listHtml
      +   wordHtml
      +   (allCleared && R.src === 'redo'
          ? '<div class="rv-done">✅ ' + R.cleared + ' 道订正完成</div>' : '')
      + '</div>'
      + '<div class="foot"><div class="btn-row">'
      +   ((items.length || words.length)
          ? '<button class="btn ghost" id="homeBtn">先回首页</button>'
          : (R.src !== 'book' ? '<button class="btn ghost" id="againBtn">再练一轮</button>' : ''))
      +   primary
      + '</div>'
      + (items.length
          ? '<div class="foot-tip">错题不清零，下次还会来找你哦</div>'
          : (words.length ? '<div class="foot-tip">拼错的词一直留在错词本里，拼对一次才划掉</div>' : ''))
      + '</div>'
      + '</div>';

    const rm = document.getElementById('rvM');
    M.mount(rm, mood);
    if (allCleared) {
      setTimeout(function () {
        const el = rm.querySelector('.mascot');
        if (el) M.jump(el, '14px');
      }, 260);
    }

    if (speakOn()) {
      const line = allCleared ? '太棒了，这些错题你都弄懂了！' : sub;
      setTimeout(function () {
        V.sayZh(line, { fail: function () { A.blip(700); } });
      }, 700);
    }

    /* 听一遍：念「正确答案」这一句，别念题干里的中文说明 */
    app.querySelectorAll('.rv-btn.rv-spk').forEach(function (btn) {
      btn.onclick = function () {
        A.tap();
        const it = items[+btn.dataset.i];
        if (it) speakEn(it.right);
      };
    });

    /* 只做这道：单题重练，做完回到复盘页 */
    app.querySelectorAll('.rv-btn.one').forEach(function (btn) {
      btn.onclick = function () {
        A.tap();
        const it = items[+btn.dataset.i];
        if (it) startRedo([it], R);
      };
    });

    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.onclick = function () { A.tap(); ST.screen = 'home'; ST.review = null; render(); };
    }
    const againBtn = document.getElementById('againBtn');
    if (againBtn) {
      againBtn.onclick = function () {
        A.tap();
        startQuiz(R.mid || 'all', R.count || 10, R.title || '综合练习');
      };
    }
    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) {
      redoBtn.onclick = function () { A.tap(); startRedo(items.slice(0, 12), R); };
    }

    /* 单词卡：点一下听发音，和闯关里的发音走同一条链路 */
    app.querySelectorAll('.rv-w').forEach(function (el) {
      el.onclick = function () {
        A.tap();
        const w = words[+el.dataset.i];
        if (w) speakEn(w.w);
      };
    });
    function practiceThese() {
      if (!SM.arcade || !SM.arcade.practiceWords) {
        FX.toast('单词闯关模块没加载出来，刷新试试');
        return;
      }
      SM.arcade.practiceWords(words.map(function (x) { return { w: x.w, cn: x.m }; }), function (done, total) {
        /* 拼完回来重算一版：拼对的词已经划掉了，别让卡片继续挂着 */
        if (ST.screen === 'review' && ST.review && ST.review.src === 'book') {
          ST.review.words = SM.arcade.wrongWords(12);
          if (done === total && done > 0) {
            FX.toast('这 ' + total + ' 个词都拼回来了');
          }
        }
        render();
      });
    }
    const wb = document.getElementById('wordBtn');
    if (wb) wb.onclick = function () { A.tap(); practiceThese(); };
    const rwb = document.getElementById('redoWordsBtn');
    if (rwb) rwb.onclick = function () { A.tap(); practiceThese(); };
  }

  /* 首页「错题本」：把跨模式攒下的错题摊开 */
  function openBook() {
    const items = MEM.recentWrong(20).map(itemFromRec).filter(function (it) { return !!it.qobj; });
    const words = (SM.arcade && SM.arcade.wrongWords) ? SM.arcade.wrongWords(12) : [];
    if (!items.length && !words.length) {
      FX.toast('错题本还是空的，先去做几道题');
      return;
    }
    ST.review = { src: 'book', items: items, words: words };
    ST.screen = 'review';
    render();

    /* 词表是异步拉的：还没回来时，先用擂台上存下的中文顶；
       一个释义都没有的话，等词表回来再补一版（只补一次，别循环渲染） */
    if (words.some(function (w) { return !w.m; }) && SM.arcade && SM.arcade.preload) {
      if (openBook.filling) return;
      openBook.filling = true;
      SM.arcade.preload().then(function () {
        openBook.filling = false;
        if (ST.screen !== 'review' || !ST.review || ST.review.src !== 'book') return;
        ST.review.words = SM.arcade.wrongWords(12);
        render();
      }).catch(function () { openBook.filling = false; });
    }
  }

  /* 进入错题重练：只考错的题，答对即销，答错排到队尾 */
  function startRedo(items, from) {
    const list = items.map(function (it) {
      const q = it.qobj;
      const mid = (q && SM.modules[it.mid]) ? it.mid : 'mix';
      /* 老存档里的词块题按旧规则切的，照新规则重切一遍（和组卷同一招） */
      if (q && q.t === 'b' && q.a && q.a[0]) q.tok = Q.tokenize(q.a[0]);
      return { mid: mid, fp: it.fp, q: q, mine: it.mine, tries: 0, redo: true };
    }).filter(function (it) { return !!it.q; });

    if (!list.length) {
      FX.toast('这些题已经归档了，换一批练吧');
      return;
    }
    ST.session = {
      list: list,
      idx: 0,
      correct: 0,
      cleared: 0,
      wrongs: [],
      maxCombo: 0,
      answered: false,
      cur: null,
      recycled: {},
      extra: 0,
      levelUp: 0,
      dueAtStart: MEM.stats().due,
      title: '错题重练',
      mid: 'all',
      redo: true,
      redoTotal: list.length,
      from: from || null
    };
    ST.combo = 0;
    ST.screen = 'quiz';
    loadQ();
  }

  function renderResult() {
    const s = ST.session;
    const total = s.list.length;
    const rate = Math.round(s.correct / total * 100);

    let mood = 'sad', title = '再试一次吧', sub = '错题会优先出现，很快就能记住';
    if (rate === 100) { mood = 'cheer'; title = '全部答对！'; sub = '太厉害了，这一关你完全掌握了'; }
    else if (rate >= 80) { mood = 'happy'; title = '非常棒！'; sub = '就差一点点，再来一次就满分了'; }
    else if (rate >= 60) { mood = 'happy'; title = '进步很明显'; sub = '把错题再看一遍，下次一定更好'; }

    let wrongHtml = '';
    if (s.wrongs.length) {
      const canAI = aiReady();
      wrongHtml = '<div class="res-wrong"><div class="rw-title">这几道题要再看一眼 · 共 '
        + s.wrongs.length + ' 道</div>';
      s.wrongs.slice(0, 8).forEach(function (w, i) {
        const rec = w.fp ? MEM.get(w.fp) : null;
        const when = rec ? '<span class="rw-when">' + MEM.whenText(rec.lv) + '</span>' : '';
        wrongHtml += '<div class="rw"><div class="a">' + U.nl(w.q) + '</div>'
          + '<div class="b">✔ ' + U.esc(w.a) + when + '</div>'
          + (canAI
              ? '<button class="rw-ask" data-i="' + i + '">🐳 让小鲸讲讲</button>'
                + '<div class="rw-ai" id="rwai-' + i + '"></div>'
              : '')
          + '</div>';
      });
      wrongHtml += '</div>';
    }

    const st = MEM.stats();
    /* 开卷时有多少待复习、现在还剩多少 —— 直接告诉孩子「账清了没」 */
    const dueBefore = (ST.session && ST.session.dueAtStart) || 0;
    const cleared = Math.max(0, dueBefore - st.due);
    const clearedTag = cleared > 0
      ? '<i class="res-cut">↓' + cleared + '</i>' : '';

    const memSum = '<div class="res-mem">'
      + '<span>记忆进度</span>'
      + '<b class="' + (st.due > 0 ? 'hot' : '') + '">待复习 ' + st.due + clearedTag + '</b>'
      + '<b>学习中 ' + st.learning + '</b>'
      + '<b>已掌握 ' + st.master + '</b>'
      + '</div>';

    app.innerHTML = '<div class="screen">'
      + '<div class="res">'
      +   '<div class="res-m" id="resM"></div>'
      +   '<h2>' + title + '</h2>'
      +   '<p class="sub">' + sub + '</p>'
      +   '<div class="res-stats">'
      +     '<div class="stat"><b style="color:#22C79A">' + s.correct + '</b><span>答对</span></div>'
      +     '<div class="stat"><b style="color:#FF6B81">' + (total - s.correct) + '</b><span>答错</span></div>'
      +     '<div class="stat"><b style="color:#FF7A59">' + s.maxCombo + '</b><span>最高连击</span></div>'
      +   '</div>'
      +   memSum
      +   wrongHtml
      + '</div>'
      + '<div class="foot"><div class="btn-row">'
      +   '<button class="btn ghost" id="homeBtn">回首页</button>'
      +   '<button class="btn" id="againBtn">' + (s.wrongs.length ? '再练一次' : '继续挑战') + '</button>'
      + '</div></div>'
      + '</div>';

    const rm = document.getElementById('resM');
    M.mount(rm, mood);
    if (mood === 'cheer' || mood === 'happy') {
      setTimeout(function () {
        const el = rm.querySelector('.mascot');
        if (el) M.jump(el, '14px');
      }, 260);
    }

    /* 结果页也让她说一句，顺便告诉孩子「错题可以点按钮听讲解」 */
    if (speakOn()) {
      const line = rate === 100 ? '全部答对，你太厉害了！'
        : rate >= 80 ? '非常棒，就差一点点就满分了！'
        : rate >= 60 ? '进步很明显，我们把错题再看一遍吧。'
        : '别灰心，错题我会陪你一道一道看。';
      setTimeout(function () {
        V.sayZh(line, { fail: function () { A.blip(700); } });
      }, 900);
    }

    document.getElementById('homeBtn').onclick = function () { A.tap(); ST.screen = 'home'; render(); };
    document.getElementById('againBtn').onclick = function () {
      A.tap();
      startQuiz(s.mid, s.list.length, s.title);
    };

    /* 「让小鲸讲讲」：DeepSeek 生成讲解，Edge TTS 念出来；讲过之后可以反复听 */
    app.querySelectorAll('.rw-ask').forEach(function (btn) {
      btn.onclick = function () {
        const i = +btn.dataset.i;
        const w = s.wrongs[i];
        if (!w) return;
        A.tap();
        if (btn._txt) {
          V.sayZh(btn._txt, { fail: function () { A.blip(720); } });
          return;
        }
        const box = document.getElementById('rwai-' + i);
        btn.disabled = true;
        const rmEl = rm.querySelector('.mascot');
        if (rmEl) M.wait(rmEl);                 // 抱着沙漏等 DeepSeek
        btn.textContent = '小鲸正在想…';
        askAI('explain', [{
          role: 'user',
          content: '题目：' + String(w.q).replace(/\n/g, ' ')
            + '\n正确答案：' + w.a
            + '\n（孩子刚才答错了，给她讲讲为什么）'
        }]).then(function (j) {
          /* 同弹层：ok 但正文为空也算失败，否则会出现一个空的绿色框 */
          if (!j || !j.ok || !j.text) {
            btn.disabled = false;
            btn.textContent = '🐳 让小鲸讲讲';
            if (rmEl) M.setMood(rmEl, mood);
            box.innerHTML = '<span class="rw-ai-err">'
              + U.esc((j && j.error) || '小鲸这次没想出来，再点一次试试') + '</span>';
            return;
          }
          btn._txt = j.text;
          btn.disabled = false;
          btn.textContent = '🔊 再听一遍';
          if (rmEl) { M.setMood(rmEl, mood); M.jump(rmEl, '10px'); }
          box.innerHTML = '<span class="rw-ai-txt">' + U.esc(j.text) + '</span>';
          V.sayZh(j.text, { fail: function () { A.blip(720); } });
        }).catch(function () {
          btn.disabled = false;
          btn.textContent = '网络不通，再试一次';
          if (rmEl) M.setMood(rmEl, mood);
        });
      };
    });
  }

  /* ============================================================
     设置页：小鲸的声音 + 小鲸的脑子
     ============================================================ */
  let voiceList = null;      // /api/voices 缓存
  let keyInfo = null;        // /api/key 缓存

  /* 薄弱题型排行：正确率最低的三类，让家长一眼看出该补哪儿。
     正确率是「答对数 / 总数」的朴素算法，只用来展示；
     真正影响出题的是 MEM.weight()（带平滑和置信度）。 */
  function weakHtml() {
    const list = MEM.weakest(3);
    if (!list.length) {
      return '<div class="weak-empty">还没有足够的数据 —— 每类题做过 3 道以上，'
        + '这里就会列出最该补的题型。</div>';
    }
    return '<div class="weak-list">' + list.map(function (w) {
      const m = SM.modules[w.mid] || {};
      const pct = Math.round(w.rate * 100);
      const col = w.rate < 0.4 ? 'var(--red)' : 'var(--orange)';
      return '<div class="weak-item">'
        + '<span class="wi-ico">' + U.esc(m.ico || '📘') + '</span>'
        + '<span class="wi-name">' + U.esc(m.name || w.mid) + '</span>'
        + '<span class="wi-bar"><i style="width:' + pct + '%;background:' + col + '"></i></span>'
        + '<span class="wi-rate" style="color:' + col + '">' + pct + '%</span>'
        + '</div>';
    }).join('') + '</div>'
      + '<div class="set-note">正确率低于 65% 的题型会被加权，越弱出得越多（最多 3 倍，'
      + '最熟的最少减到一半）。</div>';
  }

  /* 危险操作都要点两次：第一次把按钮变红问一句，四秒内再点才算数 */
  function armDanger(btn, warnText, run) {
    if (!btn) return;
    const old = btn.textContent;
    let armed = false;
    let timer = null;
    function disarm() {
      armed = false;
      btn.textContent = old;
      btn.classList.remove('warn');
    }
    btn.onclick = function () {
      A.tap();
      if (!armed) {
        armed = true;
        btn.textContent = warnText;
        btn.classList.add('warn');
        timer = setTimeout(disarm, 4000);
        return;
      }
      clearTimeout(timer);
      disarm();
      run();
    };
  }

  /* 当前所有学习记录的快照。
     档案模式下就是内存里那份；还没设名字时从 localStorage 收集，
     这样第一次设名字能把已有的记录一并带过去，不会白学。 */
  function snapshot() {
    if (S.profile()) return S.all();
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf('sm_') !== 0 || k === 'sm_profile') continue;
        try { out[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* 跳过坏数据 */ }
      }
    } catch (e) { /* ignore */ }
    return out;
  }

  function renderSettings() {
    const mode = V.mode();
    const modeText = {
      edge: 'Edge TTS 已就绪 · 在线合成，一句 1~2 秒',
      server: '本地 IndexTTS2 已就绪 · 离线合成，一句 6~8 秒',
      speech: '只能用浏览器自带语音（音色取决于设备）',
      none: '这台设备暂时发不出声音'
    }[mode] || '';

    app.innerHTML = '<div class="screen">'
      + '<div class="top">'
      +   '<button class="icon-btn" id="setBack"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>'
      +   '<div class="top-title">设置</div>'
      +   '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      + '<div class="scroll">'
      +   '<div class="set-card">'
      +     '<div class="set-h">👧 这是谁的存档</div>'
      +     '<div class="set-note">' + (S.profile()
            ? '记录存在 <b>' + U.esc(S.profile()) + '.json</b>。别的设备填同一个名字，就能接着用这份记录。'
            : '还没设名字，记录只存在这台设备的浏览器里。填个名字，就能存成 json 文件，换设备也能接着用。')
      +     '</div>'
      +     '<input class="set-input" id="kidName" placeholder="比如 Elaine" maxlength="24" value="' + U.esc(S.profile()) + '">'
      +     '<div class="set-row">'
      +       '<button class="set-btn" id="nameSave">用这个名字</button>'
      +       '<button class="set-btn ghost" id="nameList">有哪些存档</button>'
      +     '</div>'
      +   '</div>'
      +   '<div class="set-card">'
      +     '<div class="set-h">🔈 小鲸的声音</div>'
      +     '<div class="set-note">' + U.esc(modeText) + '</div>'
      +     '<div class="set-line">'
      +       '<span>答题时小鲸自动说话</span>'
      +       '<button class="sw" id="speakSw" aria-pressed="true" aria-label="答题时小鲸自动说话"><i></i></button>'
      +     '</div>'
      +     '<div class="voice-list" id="voiceList"><div class="set-note">正在读取音色…</div></div>'
      +     '<button class="set-btn wide" id="voiceTry">🔊 让新声音说一句</button>'
      +   '</div>'
      +   '<div class="set-card">'
      +     '<div class="set-h">🧠 小鲸的脑子</div>'
      +     '<div class="set-note">填上 DeepSeek API Key，小鲸就能真的讲题、跟你聊天，'
      +       '而不是只会说固定那几句。<br>Key 只存在这台电脑的 <code>.cache/deepseek.json</code>，'
      +       '不会发给任何第三方。</div>'
      +     '<input class="set-input" id="apiKey" type="password" placeholder="sk-xxxxxxxxxxxxxxxx"'
      +       ' autocomplete="off" spellcheck="false">'
      +     '<div class="set-row">'
      +       '<button class="set-btn" id="keySave">保存</button>'
      +       '<button class="set-btn ghost" id="keyTest">测试连接</button>'
      +     '</div>'
      +     '<div class="set-note" id="keyState">正在检查…</div>'
      +   '</div>'
      +   '<div class="set-card">'
      +     '<div class="set-h">📚 小鲸记住的事</div>'
      +     '<div class="set-note">你在哪类题上老栽跟头，小鲸下次就多出那类题；'
      +       '觉得哪道题出得不对，在答题页点「题目有问题」，写下理由，'
      +       '小鲸会先判断，确认有问题就收进修改清单。</div>'
      +     weakHtml()
      +     '<div class="set-line"><span>已收起来的争议题</span>'
      +       '<b class="bad-n' + (MEM.badCount() ? ' has' : '') + '">' + MEM.badCount() + ' 道</b></div>'
      +     '<div class="set-row">'
      +       '<button class="set-btn ghost" id="clearBad">清空屏蔽</button>'
      +       '<button class="set-btn ghost" id="resetStat">重置薄弱记录</button>'
      +     '</div>'
      +   '</div>'
      +   '<div class="set-card">'
      +     '<div class="set-h">ℹ️ 关于小鲸</div>'
      +     '<div class="set-note">角色动画来自开源项目 <b>dsh-dafeiyu</b>（QCYTSN），'
      +       '素材上游为 <b>PC2005-cloud/dsh-pet</b>。形象「大肥鱼 · 鲸鱼娘」是'
      +       '<b>社区二创，非 DeepSeek 官方形象</b>：原型「溟月」出自 B 站 @上善无形，'
      +       'DeepSeek 版设计出自 B 站 @ZipZipPipe。'
      +       '形象按 <b>CC BY-NC-SA 4.0</b> 授权（署名 · 非商业 · 相同方式共享），'
      +       '本项目仅供家庭内部学习使用，不作任何商业用途。</div>'
      +     '<div class="set-note">本项目把 24fps 序列帧压成 12fps 的 animated WebP，'
      +       '共 15 组动作 / 12MB（上游 16 组里 waiting 和 working_search 是同一段素材）。</div>'
      +   '</div>'
      + '</div>'
      + '</div>';

    /* ---- 存档名字：换名字 = 换一份 json ---- */
    const nameEl = document.getElementById('kidName');
    if (nameEl) {
      document.getElementById('nameSave').onclick = function () {
        A.tap();
        const n = (nameEl.value || '').trim();
        if (!n) { FX.toast('先写个名字，比如 Elaine'); return; }
        if (n === S.profile()) { FX.toast('已经在用这个名字了'); return; }
        const snap = snapshot();
        S.flush();
        fetch('/api/profile?name=' + encodeURIComponent(n))
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.exists) {
              /* 已有存档：直接切过去，别把当前数据盖上去 */
              FX.toast('「' + n + '」有存档，正在载入…');
              try { localStorage.setItem('sm_profile', n); } catch (e) { /* ignore */ }
              setTimeout(function () { location.reload(); }, 700);
              return null;
            }
            /* 没有存档：把当前记录原样复制成新档案 */
            return fetch('/api/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: n, data: snap })
            }).then(function (r) { return r.json(); }).then(function (j2) {
              if (!j2 || !j2.ok) throw new Error((j2 && j2.error) || '存不进去');
              FX.toast('已存成 ' + n + '.json');
              try { localStorage.setItem('sm_profile', n); } catch (e) { /* ignore */ }
              setTimeout(function () { location.reload(); }, 800);
            });
          })
          .catch(function (e) { FX.toast('存不了：' + ((e && e.message) || '服务器没开？')); });
      };

      document.getElementById('nameList').onclick = function () {
        A.tap();
        fetch('/api/profiles')
          .then(function (r) { return r.json(); })
          .then(function (j) {
            const names = (j && j.names) || [];
            FX.toast(names.length ? '存档：' + names.join('、') : '还没有任何存档');
          })
          .catch(function () { FX.toast('服务器没开，读不到存档'); });
      };
    }

    document.getElementById('setBack').onclick = function () {
      A.tap();
      ST.screen = ST.settingsFrom || 'hub';
      render();
    };

    /* 清空争议题黑名单：清完这些题有可能再被生成出来，所以要点两次 */
    armDanger(document.getElementById('clearBad'), '真的清空？', function () {
      if (!MEM.badCount()) { FX.toast('现在还没有收起来的题'); return; }
      MEM.clearBad();
      render();
      FX.toast('清空啦，这些题以后可能还会出现');
    });

    /* 重置薄弱记录：出题回到平均分配 */
    armDanger(document.getElementById('resetStat'), '真的重置？', function () {
      MEM.resetStat();
      render();
      FX.toast('重新开始记，出题先平均分配');
    });

    /* 「答题时自动说话」开关：默认开，嫌吵就关掉（关掉后点「让小鲸细讲」照样会念） */
    const sw = document.getElementById('speakSw');
    if (sw) {
      const on0 = speakOn();
      sw.classList.toggle('on', on0);
      sw.setAttribute('aria-pressed', on0 ? 'true' : 'false');
      sw.onclick = function () {
        A.tap();
        const next = !speakOn();
        S.set('sm_speak', next ? 1 : 0);
        sw.classList.toggle('on', next);
        sw.setAttribute('aria-pressed', next ? 'true' : 'false');
        if (next) V.sayZh('好呀，我继续说！', { fail: function () { A.blip(700); } });
      };
    }

    /* ---- 音色列表 ---- */
    const listEl = document.getElementById('voiceList');

    function paintVoices() {
      if (!voiceList) return;
      /* 中文音色只管「小鲸说话」，英文音色只管「读题目」——
         两组必须分开，否则拿英文音色念中文，服务端要重试两轮才回退，
         一句话等四五秒，前端早就放弃了，表现就是「选了没声音」。 */
      const zh = voiceList.filter(function (v) { return (v.lang || 'ZH') !== 'EN'; });
      const en = voiceList.filter(function (v) { return (v.lang || 'ZH') === 'EN'; });

      function fix(cur, group, setter) {
        if (!group.length) return cur;
        if (group.some(function (v) { return v.id === cur; })) return cur;
        setter(group[0].id);              // 存的音色失效了就退回该组第一个
        return group[0].id;
      }
      const curZh = fix(V.edgeVoice(), zh, V.setEdgeVoice);
      const curEn = fix(V.enVoice(), en, V.setEnVoice);

      function btn(v, on) {
        return '<button class="voice-item' + (on ? ' on' : '') + '" data-v="' + U.esc(v.id) + '">'
          + '<b>' + U.esc(v.name) + '</b>'
          + '<span>' + U.esc(v.tag) + '</span>'
          + '</button>';
      }

      listEl.innerHTML =
        '<div class="voice-hd">小鲸说话</div>'
        + zh.map(function (v) { return btn(v, v.id === curZh); }).join('')
        + (en.length ? '<div class="voice-hd">读英语题目</div>' : '')
        + en.map(function (v) { return btn(v, v.id === curEn); }).join('');

      listEl.querySelectorAll('.voice-item').forEach(function (b) {
        b.onclick = function () {
          A.tap();
          const isEn = en.some(function (v) { return v.id === b.dataset.v; });
          if (isEn) V.setEnVoice(b.dataset.v); else V.setEdgeVoice(b.dataset.v);
          paintVoices();
          tryVoice(b.dataset.v, isEn);
        };
      });
    }

    if (voiceList) {
      paintVoices();
    } else {
      fetch('/api/voices')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.ok && j.voices && j.voices.length) {
            voiceList = j.voices;
            paintVoices();
          } else {
            listEl.innerHTML = '<div class="set-note">读不到音色列表（本地服务没开？）</div>';
          }
        })
        .catch(function () {
          listEl.innerHTML = '<div class="set-note">读不到音色列表（本地服务没开？）</div>';
        });
    }

    function tryVoice(id, isEn) {
      const fail = function () { FX.toast('这个音色没出声，换一个试试'); };
      if (isEn) V.sayEn('Good job! Let us try one more.', { fail: fail });
      else V.sayZh('我是小鲸，我们一起来做题吧！', { fail: fail });
    }

    document.getElementById('voiceTry').onclick = function () {
      A.tap();
      tryVoice();
    };

    /* ---- DeepSeek Key ---- */
    const input = document.getElementById('apiKey');
    const stateEl = document.getElementById('keyState');

    function paintKey(info) {
      keyInfo = info || keyInfo;
      if (!keyInfo) return;
      if (keyInfo.set) {
        stateEl.innerHTML = '✅ 已配置：<b>' + U.esc(keyInfo.mask) + '</b>'
          + (keyInfo.balance ? ' · 余额 ' + U.esc(String(keyInfo.balance.total)) + ' ' + U.esc(keyInfo.balance.currency || '') : '');
      } else {
        stateEl.textContent = '还没有配置。小鲸现在只会说固定台词。';
      }
    }

    if (keyInfo) {
      paintKey(keyInfo);
    } else {
      fetch('/api/key')
        .then(function (r) { return r.json(); })
        .then(function (j) { paintKey(j); })
        .catch(function () { stateEl.textContent = '读不到配置（本地服务没开？）'; });
    }

    document.getElementById('keySave').onclick = function () {
      A.tap();
      const k = (input.value || '').trim();
      if (!k) { FX.toast('先粘贴一个 Key 再点保存'); return; }
      stateEl.textContent = '保存中…';
      fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k, check: true })
      }).then(function (r) { return r.json(); })
        .then(function (j) {
          input.value = '';
          paintKey(j);
          if (j && j.set) {
            FX.toast('✅ 小鲸会思考了');
            if (j.balance) FX.toast('余额 ' + j.balance.total + ' ' + (j.balance.currency || ''));
          } else {
            FX.toast('保存失败');
          }
        })
        .catch(function () { stateEl.textContent = '保存失败：本地服务没开？'; });
    };

    document.getElementById('keyTest').onclick = function () {
      A.tap();
      stateEl.textContent = '测试中…';
      fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check: true })
      }).then(function (r) { return r.json(); })
        .then(function (j) {
          paintKey(j);
          if (!j || !j.set) { FX.toast('还没填 Key'); return; }
          if (j.balance) FX.toast('✅ 连接正常，余额 ' + j.balance.total);
          else FX.toast('Key 存着，但余额查不到：' + (j.error || '未知'));
        })
        .catch(function () { stateEl.textContent = '测试失败：本地服务没开？'; });
    };
  }


  /* ---------------- 启动 ---------------- */
  document.addEventListener('pointerdown', function once() {
    A.unlock();
    document.removeEventListener('pointerdown', once);
  });


  /* ============================================================
     启动预热
     Edge TTS 一句只要 1~2 秒，不需要服务端排队预生成，
     但把常点的几句先 fetch 进浏览器 HTTP 缓存，点下去就是秒开。
     一次只放一条、间隔 600ms，避免把微软接口打出限流。
     ============================================================ */
  const WARM_LINES = [
    '跟着我一起动起来！',
    '♪ 一闪一闪亮晶晶～',
    '我们一起做几道题吧！',
    '别怕做错，错了才能记住',
    '嘿嘿，好痒！',
    '加油加油！',
    '我在陪你做题呀'
  ];

  let warmed = false;
  function warmUp() {
    if (warmed || !V.checked()) return;
    if (!V.hasEdge()) return;         // 没有 Edge 就没什么好预热的
    warmed = true;
    WARM_LINES.forEach(function (t, i) {
      setTimeout(function () { V.prefetch(t, 'ZH'); }, i * 600);
    });
  }
  SM.onVoiceReady = warmUp;   // 服务刚探测到就预热
  warmUp();                   // 万一探测比脚本加载还早，这里补一次

  /* 给闯关模块用：结算完回首页要能重画一遍 */
  SM.render = render;

  /* ============================================================
     擂台的错题带回来
     擂台是独立页面（pk.html），不参与 /api/profile 的回写，
     所以它把错题写进 localStorage，这里开机时收一次就清掉。
     收进来的题和主应用做错的题走同一个记忆库 —— 明天该复习
     照样会复习，不会因为「是在擂台上错的」就被漏掉。
     ============================================================ */
  function absorbPk() {
    let raw = null;
    try { raw = localStorage.getItem('sm_pk_wrong'); } catch (e) { return; }
    if (!raw) return;
    try { localStorage.removeItem('sm_pk_wrong'); } catch (e) { /* 隐私模式 */ }

    let list = null;
    try { list = JSON.parse(raw); } catch (e) { list = null; }
    if (!list || !list.length) return;

    let n = 0;
    const words = [];
    list.forEach(function (x) {
      if (!x) return;
      if (x.kind === 'gram' && x.q && x.o && x.o.length) {
        const q = { t: 'c', q: x.q, o: x.o, a: x.a | 0, tip: x.tip || '' };
        const fp = Q.fp(q);
        if (MEM.isBad(fp)) return;
        MEM.wrong(fp, q, x.mid || 'mix', x.mine || '');
        MEM.hit(x.mid || 'mix', false);
        n++;
      } else if (x.kind === 'word' && x.w) {
        words.push(x);
      }
    });
    const wn = (words.length && SM.arcade && SM.arcade.noteMiss)
      ? SM.arcade.noteMiss(words) : 0;
    if (n || wn) {
      const parts = [];
      if (n) parts.push(n + ' 道题');
      if (wn) parts.push(wn + ' 个词');
      FX.toast('擂台上错的 ' + parts.join('、') + '，已经记进错题本');
    }
  }

  /* 马拉松 PK（math-pk.html）同样把错题留在 localStorage。
     速算题按技能点掉级，概念题只在结算里回顾，不污染技能点账本。 */
  function absorbMpk() {
    let raw = null;
    try { raw = localStorage.getItem('sm_mpk_wrong'); } catch (e) { return; }
    if (!raw) return;
    try { localStorage.removeItem('sm_mpk_wrong'); } catch (e) { /* 隐私模式 */ }
    let list = null;
    try { list = JSON.parse(raw); } catch (e) { list = null; }
    if (!list || !list.length) return;

    const ma = SM.subjects && SM.subjects.ma;
    if (!ma || !ma.srs) return;
    const skillSet = {};
    (ma.mods || []).forEach(function (m) {
      (m.skills || []).forEach(function (s) { skillSet[s.id] = true; });
    });
    let n = 0;
    list.forEach(function (x) {
      if (!x || !x.skill || !skillSet[x.skill]) return;
      ma.srs.wrong(x.skill);
      n++;
    });
    if (n) FX.toast('马拉松里错的 ' + n + ' 道速算，已经记进复习');
  }

  absorbPk();
  absorbMpk();

  /* 从擂台/马拉松点「返回娱乐」回来时带 ?screen=fun，直接落到娱乐页 */
  if (/[?&]screen=fun\b/.test(location.search)) ST.screen = 'fun';

  render();

  /* 从擂台回来会带 &book=1：直接打开错题本，
     别让她刚打完就滑回首页，把刚才错的题忘掉。
     只拼错单词的那一局语法错题是 0，所以错词也要算进这个判断里。 */
  if (/[?&]book=1/.test(location.search)) {
    const hasBook = MEM.recentWrong(1).length
      || (SM.arcade && SM.arcade.wrongWords && SM.arcade.wrongWords(1).length);
    if (hasBook) setTimeout(openBook, 260);
  }

  /* 按「返回」键从擂台回来时，页面是从 bfcache 直接捞回来的，
     上面的开机逻辑一行都不会再跑 —— 擂台留的错题就白留了。
     这里补一次收账，顺手把首页重画一版（错题本卡片要冒出来）。 */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    absorbPk();
    absorbMpk();
    if (ST.screen === 'home' || ST.screen === 'hub' || ST.screen === 'fun') render();
    else if (ST.screen === 'review' && ST.review && ST.review.src === 'book') openBook();
  });

  /* ============================================================
     直达闯关：index.html?play=1（由 play.html / play-ipad.html 跳进来）
     index.html 的头部脚本已经把参数收进 __SM_PLAY，首页也用
     html.play-boot 藏起来了，这里只管开一局。
     默认是练习局（不扣星、不写记录）；?free=0 才走正常扣星规则。
     ============================================================ */
  if (window.__SM_PLAY) {
    if (SM.arcade && SM.arcade.quickStart) {
      SM.arcade.quickStart({ free: window.__SM_PLAY.free });
    } else {
      document.documentElement.classList.remove('play-boot');
      FX.toast('闯关模块没加载出来，刷新试试');
    }
  }

})(window.SM);
