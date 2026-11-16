/* ============================================================
   subject.js — 科目层：数学 / 语文的入口、练习、结算、轨迹
   ------------------------------------------------------------
   英语那套（app.js + memory.js）完全不动。这里只做三件事：

     1. 把「科目」变成一个独立维度：数学、语文各自一套 SRS 账本；
     2. 复用英语的界面语言（顶部栏、卡片、选项、按钮、星星、音效）；
     3. 把「今日任务」串起来：数学 10 题、语文 8 题、英语照旧。

   题型： c = 选择，n = 数值，h = 汉字输入。
   数学题一律「草稿纸算 + 只填结果 + 答完逐步揭示」。
   ============================================================ */
(function (SM) {
  'use strict';

  const S = SM.store, ST = SM.state, A = SM.sfx;
  const $ = function (sel) { return document.querySelector(sel); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = x[i]; x[i] = x[j]; x[j] = t;
    }
    return x;
  }
  function toast(msg) { if (SM.fx && SM.fx.toast) SM.fx.toast(msg); }

  /* ============================================================
     被标记「出得有问题」的题：下次组卷跳过同一道（同题干同答案）
     ============================================================ */
  const BAD_KEY = 'sm_bad_q';
  let BAD = S.get(BAD_KEY, null);
  if (!BAD || typeof BAD !== 'object') BAD = {};

  function qkey(q) {
    return String(q.q) + '|' + (Array.isArray(q.a) ? q.a.join('/') : q.a);
  }

  function markBadQ(q, why) {
    BAD[qkey(q)] = { t: Date.now(), why: why || '' };
    S.set(BAD_KEY, BAD);
  }

  /* ============================================================
     题目反馈：孩子说「这题有问题」→ 写理由 → 小鲸判断要不要修
     ============================================================ */
  const FIX_KEY = 'sm_fixq';

  function fixList() {
    const l = S.get(FIX_KEY, []);
    return Array.isArray(l) ? l : [];
  }
  function fixSave(l) { S.set(FIX_KEY, l.slice(-200)); }
  function fixAdd(rec) { const l = fixList(); l.push(rec); fixSave(l); }
  function fixRemove(i) {
    const l = fixList();
    if (i >= 0 && i < l.length) { l.splice(i, 1); fixSave(l); }
  }

  function aiAvail() {
    try { const i = SM.voice && SM.voice.info(); return !!(i && i.ai); } catch (e) { return false; }
  }

  function askFix(content) {
    const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: 'fix', temperature: 0.1,
        messages: [{ role: 'user', content: content }]
      }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(timer);
      return j;
    }).catch(function () {
      clearTimeout(timer);
      return { ok: false };
    });
  }

  let FIX_UI = null;

  function closeFix() {
    if (FIX_UI && FIX_UI.parentNode) FIX_UI.parentNode.removeChild(FIX_UI);
    FIX_UI = null;
  }

  function openFix(o) {
    o = o || {};
    closeFix();
    const veil = document.createElement('div');
    veil.className = 'fixveil';
    veil.innerHTML =
      '<div class="fixbox">'
      + '<div class="fixhd"><b>这道题哪里不对？</b>'
      +   '<button class="fixx" type="button" aria-label="关闭">✕</button></div>'
      + '<div class="fixq">' + esc(o.question || '') + '</div>'
      + '<div class="fixchips">'
      +   ['答案不对', '题目有歧义', '选项有问题', '超纲了'].map(function (t) {
        return '<button type="button" data-chip="' + t + '">' + t + '</button>';
      }).join('')
      + '</div>'
      + '<textarea class="fixwhy" maxlength="120" placeholder="说说理由，比如：8 × 0 应该等于 0"></textarea>'
      + '<div class="fixmsg"></div>'
      + '<div class="fixacts">'
      +   '<button type="button" class="fx-cancel">取消</button>'
      +   '<button type="button" class="fx-send">提交给小鲸</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(veil);
    FIX_UI = veil;

    const why = veil.querySelector('.fixwhy');
    const msg = veil.querySelector('.fixmsg');
    const send = veil.querySelector('.fx-send');
    let force = false;

    veil.querySelector('.fixx').onclick = closeFix;
    veil.querySelector('.fx-cancel').onclick = closeFix;
    veil.querySelectorAll('[data-chip]').forEach(function (b) {
      b.onclick = function () {
        const t = b.dataset.chip;
        if (why.value.indexOf(t) < 0) why.value = why.value ? why.value + '，' + t : t;
        why.focus();
        A.tap();
      };
    });
    why.focus();

    function done(verdict, aiWhy, forced) {
      const rec = {
        t: Date.now(), subj: o.subject || '', q: o.question || '', a: o.answer || '',
        why: why.value.trim(), verdict: verdict, ai: aiWhy || '', forced: !!forced
      };
      fixAdd(rec);
      if (o.onAccept) { try { o.onAccept(rec); } catch (e) { /* 界面更新失败不算提交失败 */ } }
      closeFix();
      toast(verdict === 'yes' ? '已提交：这题会进修改清单'
        : verdict === 'no' ? '已经按你的意思提交了'
          : '先记下了，联网后由小鲸复核');
    }

    send.onclick = function () {
      if (send.disabled) return;
      const text = why.value.trim();
      if (!text) {
        msg.className = 'fixmsg show bad';
        msg.textContent = '先用一句话说说哪里不对';
        why.focus();
        return;
      }
      if (!aiAvail()) { done('pending', ''); return; }

      send.disabled = true;
      msg.className = 'fixmsg show';
      msg.textContent = '小鲸在核对这道题…';

      askFix('题目：' + (o.question || '')
        + '\n标准答案：' + (o.answer || '')
        + (o.subject ? '\n科目：' + o.subject : '')
        + '\n学生的反馈：' + text
      ).then(function (j) {
        const raw = (j && j.ok && j.text) ? String(j.text).trim() : '';
        if (!raw) { done('pending', ''); return; }

        const yes = /^(VERDICT\s*[:：]\s*)?YES\b/i.test(raw);
        const lines = raw.split(/\n+/).map(function (s) {
          return s.replace(/^\s*(VERDICT|REASON|判断|理由)\s*[:：]\s*/i, '').trim();
        }).filter(Boolean);
        let aiWhy = lines[1] || '';
        if (!aiWhy && lines[0]) {
          const m = lines[0].match(/^(YES|NO)\b[\s:：，,。-]*(.*)$/i);
          if (m) aiWhy = m[2] || '';
        }

        if (yes) { done('yes', aiWhy); return; }

        /* 小鲸觉得没问题：先说明理由，家长坚持的话可以再点一次强制提交 */
        if (force) { done('no', aiWhy, true); return; }
        force = true;
        send.disabled = false;
        send.textContent = '仍然提交';
        msg.className = 'fixmsg show bad';
        msg.textContent = '小鲸觉得这题没问题' + (aiWhy ? '：' + aiWhy : '') + '。如果还是想提交，再点一次。';
      });
    };
  }

  SM.fix = {
    open: openFix,
    list: fixList,
    remove: fixRemove,
    markBadQ: markBadQ
  };

  /* ============================================================
     科目注册
     ============================================================ */
  const SUBJ = {
    ma: {
      id: 'ma', name: '数学', mark: '算', tone: '#4C8DFF',
      title: '四上 · 计算与概念',
      desc: '草稿纸上算，填最终结果；答完逐步揭示。',
      mods: [], ready: null,
      srs: SM.srs.create({ key: 'sm_skill_ma', gaps: [1440, 4320, 10080, 21600] })
    },
    cn: {
      id: 'cn', name: '语文', mark: '文', tone: '#E25B45',
      title: '四上 · 字词与积累',
      desc: '看拼音写词语、多音字、错别字；先把词表滚熟。',
      mods: [], ready: null,
      srs: SM.srs.create({
        key: 'sm_cn', gaps: [1440, 2880, 5760, 10080, 21600, 43200],
        quota: 8, quotaKey: 'sm_cn_newday', cap: 600
      })
    }
  };
  SM.subjects = SUBJ;

  const NAMES = {};

  function add(subjId, mod) {
    const subj = SUBJ[subjId];
    if (!subj) return;
    subj.mods.push(mod);
    (mod.skills || []).forEach(function (s) { NAMES[s.id] = s.name; });
  }

  function setReady(subjId, p) {
    if (SUBJ[subjId]) SUBJ[subjId].ready = p;
  }

  function ready(subjId) {
    const p = SUBJ[subjId] && SUBJ[subjId].ready;
    return p && p.then ? p : Promise.resolve();
  }

  SM.subj = { add: add, setReady: setReady, ready: ready, render: render, start: start };

  /* ============================================================
     组卷
     ============================================================ */
  function collect(subj, onlyMod) {
    const srs = subj.srs;
    /* due：今天到期；fresh：还没进过账（或已毕业，数学技能可以再抽）；
       rest：在学但今天没到期 —— 当天想再练一组时拿来补位，
       不然第一组做完，第二组会一道题都出不出来。 */
    const due = [], fresh = [], rest = [];
    subj.mods.forEach(function (m) {
      if (onlyMod && m.id !== onlyMod) return;

      if (m.skills) {
        m.skills.forEach(function (sk) {
          const rec = srs.get(sk.id);
          const it = { id: sk.id, name: sk.name, mod: m, gen: sk.gen, finite: false };
          if (!rec) { it.isNew = true; fresh.push(it); }
          else if (rec.lv < srs.MASTER && rec.due <= Date.now()) due.push(it);
          else if (rec.lv >= srs.MASTER) fresh.push(it);
          else rest.push(it);
        });
      }

      if (m.items) {
        m.items().forEach(function (it) {
          const rec = srs.get(it.id);
          it.mod = m;
          it.finite = true;
          if (!rec) { it.isNew = true; fresh.push(it); }
          else if (rec.lv < srs.MASTER && rec.due <= Date.now()) due.push(it);
          else if (rec.lv < srs.MASTER) rest.push(it);
        });
      }
    });
    return { due: due, fresh: fresh, rest: rest };
  }

  function pickWeighted(pool, used, allowRepeat, srs) {
    const cand = [], weights = [];
    let total = 0;
    pool.forEach(function (it) {
      if (!allowRepeat && used[it.id]) return;
      const w = it.isNew ? 1 : srs.weight(it.id);
      cand.push(it);
      weights.push(w);
      total += w;
    });
    if (!cand.length) return null;
    let r = Math.random() * total;
    for (let i = 0; i < cand.length; i++) {
      r -= weights[i];
      if (r <= 0) return cand[i];
    }
    return cand[cand.length - 1];
  }

  function build(subjId, n, onlyMod) {
    const subj = SUBJ[subjId];
    const srs = subj.srs;
    const data = collect(subj, onlyMod);
    const total = n || (subjId === 'ma' ? 10 : 8);

    // 复习优先，最多占 80%，留一点新内容保持前进
    const dueMax = Math.max(1, Math.round(total * 0.8));
    const dueList = shuffle(data.due).slice(0, dueMax);

    const used = {};
    const seen = {};
    const out = [];

    function push(it) {
      let q;
      for (let tries = 0; tries < 10; tries++) {
        q = it.gen();
        const key = qkey(q);
        if (BAD[key]) { q = null; continue; }      // 家长标过「出得有问题」，不再出
        if (!seen[key]) { seen[key] = 1; break; }
        q = null;
      }
      if (!q) return false;
      q.id = it.id;
      q.modName = it.mod ? it.mod.name : '';
      q.skillName = it.name || (NAMES[it.id] || it.id);
      q.inst = q.inst || q.modName || '';
      out.push({ q: q, item: it });
      used[it.id] = (used[it.id] || 0) + 1;
      if (it.isNew) it._usedNew = true;
      return true;
    }

    dueList.forEach(push);

    // 新内容：语文每天最多 8 条新账；数学不限（记的是技能点）
    let newLeft = subjId === 'cn' ? srs.quotaLeft() : Infinity;
    let guard = 0;
    while (out.length < total && guard++ < 400) {
      if (newLeft <= 0) break;
      const it = pickWeighted(data.fresh, used, subjId === 'ma', srs);
      if (!it) break;
      if (subjId === 'ma' && used[it.id] >= 2) continue;
      if (!push(it)) continue;
      if (it.isNew && subjId === 'cn') newLeft--;
    }

    /* 新词配额用完了、或技能今天都不到期，就拿「在学」的补位：
       不占新词额度，也不会把没学过的词硬塞进来。 */
    guard = 0;
    while (out.length < total && guard++ < 400) {
      const it = pickWeighted(data.rest, used, subjId === 'ma', srs);
      if (!it) break;
      if (subjId === 'ma' && used[it.id] >= 2) continue;
      if (!push(it)) continue;
    }

    return out;
  }

  /* ============================================================
     练习会话
     ============================================================ */
  let SESSION = null;

  function start(subjId, n, onlyMod) {
    const subj = SUBJ[subjId];
    if (!subj) return;
    currentSubj = subjId;
    ready(subjId).then(function () {
      const list = build(subjId, n, onlyMod);
      if (!list.length) {
        toast(subjId === 'cn' ? '词表还没加载好，稍后再试' : '暂时没有可练的题');
        return;
      }
      SESSION = {
        subjId: subjId, subj: subj, srs: subj.srs,
        list: list, idx: 0, cur: list[0],
        answered: false, sel: null, step: 0,
        correct: 0, attempts: 0, wrongs: [], recycled: 0,
        newLearned: 0, levelUps: [], bestCombo: 0, gained: 0, lastGain: 0,
        combo: 0, start: Date.now(), onlyMod: onlyMod || null
      };
      paint();
    });
  }

  function paint() {
    const st = SESSION;
    if (!st) { renderHome(currentSubj || 'ma'); return; }
    if (st.idx >= st.list.length) return finish();
    VIEW = 'quiz';

    const q = st.cur.q;
    const prevScroll = $('.sq-scroll') ? $('.sq-scroll').scrollTop : 0;
    const app = $('#app');
    if (!app) return;

    const answers = q.t === 'c'
      ? '<div class="sq-opts">' + q.o.map(function (o, i) {
        let cls = 'sq-opt';
        if (st.answered) {
          if (i === q.a) cls += ' right';
          else if (i === st.sel) cls += ' wrong';
          else cls += ' dim';
        } else if (i === st.sel) {
          cls += ' on';
        }
        return '<button class="' + cls + '" data-opt="' + i + '">'
          + '<i>' + String.fromCharCode(65 + i) + '</i><span>' + esc(o) + '</span></button>';
      }).join('') + '</div>'
      : q.t === 'n'
        ? '<div class="sq-answer"><input id="sq-input" class="sq-num" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="填结果" value="' + esc(st.mine || '') + '"' + (st.answered ? ' readonly' : '') + '><span class="sq-hintline">在草稿纸上算，只填最终结果</span></div>'
        : '<div class="sq-answer"><input id="sq-input" class="sq-han" lang="zh-CN" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="在这里写词语" value="' + esc(st.mine || '') + '"' + (st.answered ? ' readonly' : '') + '><span class="sq-hintline">可以先在本子上写一遍，再输入</span></div>';

    const fb = st.answered ? feedbackHTML(st) : '';
    const btnName = st.answered
      ? (st.idx + 1 >= st.list.length ? '看结果' : '下一题')
      : '检查答案';

    app.innerHTML =
      '<div class="screen sq-screen">'
      + '<div class="top">'
      + '<button class="pill sq-back" data-act="back">‹ 退出</button>'
      + '<div class="brand">' + esc(st.subj.name) + ' · ' + esc(st.onlyMod ? (st.list[0].item.mod ? st.list[0].item.mod.name : '专项') : '今日练习') + '</div>'
      + '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      + '<div class="sq-prog"><i style="width:' + Math.round(st.idx / st.list.length * 100) + '%"></i></div>'
      + '<div class="scroll sq-scroll">'
      + '<div class="sq-card">'
      + '<div class="sq-inst"><span>' + esc(q.inst || '练习') + '</span><small>第 ' + (st.idx + 1) + ' / ' + st.list.length + ' 题</small></div>'
      + '<div class="sq-q ' + (q.t === 'h' ? 'pinyin' : '') + '">' + esc(q.q) + '</div>'
      + (q.t === 'h' ? '<div class="sq-sub">' + esc(q.sub || '') + '</div>' : '')
      + answers
      + '</div>'
      + fb
      + '<div class="foot"><button class="btn' + (st.answered ? ' ok' : '') + '" data-act="' + (st.answered ? 'next' : 'check') + '">' + btnName + '</button></div>'
      + '</div></div>';

    const sc = $('.sq-scroll');
    if (sc) sc.scrollTop = prevScroll;
    const inp = $('#sq-input');
    if (inp) {
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); check(); }
      });
    }
    bindOpts();
  }

  function bindOpts() {
    const st = SESSION;
    if (!st || st.answered) return;
    document.querySelectorAll('.sq-opt').forEach(function (el) {
      el.addEventListener('click', function () {
        st.sel = +el.dataset.opt;
        document.querySelectorAll('.sq-opt').forEach(function (x) { x.classList.toggle('on', x === el); });
        A.tap();
      });
    });
  }

  function normNum(x) {
    return String(x == null ? '' : x)
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 65248); })
      .replace(/[，,\s]/g, '')
      .replace(/[。．]/g, '.')
      .replace(/[−–—]/g, '-');
  }

  function judge(q, mine) {
    if (q.t === 'n') {
      const a = normNum(q.a), b = normNum(mine);
      if (a === b) return true;
      const na = Number(a), nb = Number(b);
      return isFinite(na) && isFinite(nb) && Math.abs(na - nb) < 1e-9;
    }
    if (q.t === 'h') {
      const m = String(mine).replace(/[\s，。、；：""''？！,.;:!?"']/g, '');
      return (q.a || []).some(function (x) {
        return String(x).replace(/\s/g, '') === m;
      });
    }
    return false;
  }

  function check() {
    const st = SESSION;
    if (!st || st.answered) return;
    const q = st.cur.q;
    let ok = false, mine = '';

    if (q.t === 'c') {
      if (st.sel == null) { toast('先选一个答案'); return; }
      mine = q.o[st.sel];
      ok = st.sel === q.a;
    } else {
      const el = $('#sq-input');
      mine = el ? el.value : '';
      if (!String(mine).trim()) { toast('先写出答案'); return; }
      ok = judge(q, mine);
    }

    st.answered = true;
    st.attempts++;
    st.mine = mine;
    st.ok = ok;

    const before = st.srs.get(q.id);
    if (ok) {
      st.correct++;
      st.combo++;
      if (st.combo > st.bestCombo) st.bestCombo = st.combo;
      const gain = st.combo >= 3 ? 2 : 1;      // 和英语一样：连对 3 题起双倍积分
      const r = st.srs.right(q.id);
      if (!before) st.newLearned++;
      if (before && r && r.lv > before.lv) {
        st.levelUps.push({ name: q.skillName, lv: r.lv });
      }
      ST.stars += gain;
      st.gained = (st.gained || 0) + gain;
      st.lastGain = gain;
      ST.saveStars();
      A.ok();
      const el = $('#sq-input') || (st.sel != null ? document.querySelector('.sq-opt.on') : null);
      if (el && SM.fx && SM.fx.stars) {
        const rect = el.getBoundingClientRect();
        SM.fx.stars(rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
      }
    } else {
      st.combo = 0;
      st.srs.wrong(q.id);
      st.wrongs.push({ q: q, mine: mine });
      A.no();
      // 错题当场回炉：数学换一组数字，语文隔几题再问同一个词
      if (st.cur.item && st.cur.item.gen) {
        const at = Math.min(st.idx + 4, st.list.length);
        let nq = null;
        try { nq = st.cur.item.gen(); } catch (e) { nq = null; }
        if (nq) {
          nq.id = st.cur.item.id;
          nq.modName = q.modName;
          nq.skillName = q.skillName;
          nq.inst = q.inst;
        } else {
          nq = cloneQ(q);
        }
        st.list.splice(at, 0, { q: nq, item: st.cur.item, back: true });
        st.recycled++;
      }
    }

    SM.day.log(st.subjId, ok);
    paint();
  }

  function cloneQ(q) {
    return Object.assign({}, q);
  }

  function next() {
    const st = SESSION;
    if (!st) return;
    st.idx++;
    if (st.idx >= st.list.length) return finish();
    st.cur = st.list[st.idx];
    st.answered = false;
    st.sel = null;
    st.step = 0;
    st.mine = '';
    st.lastGain = 0;
    paint();
  }

  function feedbackHTML(st) {
    const q = st.cur.q;
    const ok = st.ok;
    const steps = q.steps || [];
    const ans = q.t === 'c' ? q.o[q.a] : (Array.isArray(q.a) ? q.a[0] : q.a);
    let stepHTML = '';
    if (steps.length) {
      if (ok) {
        stepHTML = '<details class="sq-steps"><summary>看逐步解析</summary><ol>'
          + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('')
          + '</ol></details>';
      } else {
        stepHTML = '<div class="sq-steps open"><div class="sq-steptitle">逐步解析</div><ol>'
          + steps.map(function (s, i) {
            return '<li class="' + (i < st.step ? '' : 'hide') + '">' + esc(s) + '</li>';
          }).join('') + '</ol>'
          + (st.step < steps.length
            ? '<button class="sq-more" data-act="step">看下一步（' + st.step + '/' + steps.length + '）</button>'
            : '')
          + '</div>';
      }
    }
    return '<div class="sq-fb ' + (ok ? 'good' : 'bad') + '">'
      + '<div class="sq-fbtop"><b>' + (ok ? '✓ 对了' : '✗ 再看一眼') + '</b>'
      + (ok && st.lastGain ? '<span class="sq-gain">⭐ +' + st.lastGain + '</span>' : '')
      + '<span class="sq-skill">' + esc(q.skillName || '') + '</span></div>'
      + (q.t !== 'c' && st.mine ? '<div class="sq-mine">你写：<b>' + esc(st.mine) + '</b></div>' : '')
      + (ok ? '' : '<div class="sq-right">正确答案：<b>' + esc(ans) + '</b></div>')
      + (q.tip ? '<div class="sq-tip">' + esc(q.tip) + '</div>' : '')
      + stepHTML
      + (ok ? '' : '<div class="sq-err"><span>错在哪一步？</span>'
        + '<button data-act="err" data-tag="算错了">算错了</button>'
        + '<button data-act="err" data-tag="看错了">看错了</button>'
        + '<button data-act="err" data-tag="不会做">不会做</button></div>')
      + '<button class="sq-flag" type="button" data-act="flag">⚠️ 题目有问题</button>'
      + '</div>';
  }

  function finish() {
    const st = SESSION;
    if (!st) return;
    VIEW = 'result';
    const ms = Date.now() - st.start;
    SM.day.addTime(st.subjId, ms);

    const rate = pct(st.correct, st.attempts);
    const mins = Math.max(1, Math.round(ms / 60000));
    const app = $('#app');
    const wrongHTML = st.wrongs.length
      ? '<div class="sec"><span>这次错的</span><small>' + st.wrongs.length + ' 题</small></div>'
        + st.wrongs.map(function (w) {
          return '<div class="sq-wrong"><b>' + esc(w.q.q) + '</b>'
            + '<span>你写：' + esc(w.mine) + '　正确：' + esc(w.q.t === 'c' ? w.q.o[w.q.a] : (Array.isArray(w.q.a) ? w.q.a[0] : w.q.a)) + '</span>'
            + '<small>' + esc(w.q.skillName || '') + '</small></div>';
        }).join('')
      : '<div class="sq-allgood">全对，明天再来一组。</div>';

    app.innerHTML =
      '<div class="screen sq-screen">'
      + '<div class="top"><button class="pill" data-act="home">‹ 返回</button>'
      + '<div class="brand">' + esc(st.subj.name) + ' · 结果</div>'
      + '<div class="pill">⭐ <b>' + ST.stars + '</b></div></div>'
      + '<div class="scroll">'
      + '<div class="sq-result">'
      + '<div class="sq-rate">' + rate + '<small>%</small></div>'
      + '<div class="sq-ratesub">' + st.correct + ' / ' + st.attempts + ' 题　·　' + mins + ' 分钟'
      + (st.recycled ? '　·　回炉 ' + st.recycled + ' 题' : '') + '</div>'
      + '<div class="sq-badges">'
      + '<span class="gain">本次积分 <b>⭐' + (st.gained || 0) + '</b></span>'
      + '<span>新学会 <b>' + (st.subjId === 'cn' ? st.newLearned + ' 个词' : st.newLearned + ' 个技能点') + '</b></span>'
      + (st.levelUps.length ? '<span>升级 <b>' + st.levelUps.length + '</b></span>' : '')
      + '<span>连对 <b>' + st.bestCombo + '</b></span>'
      + '</div>'
      + '<div class="sq-acts">'
      + '<button class="btn ok" data-act="again">再练一组</button>'
      + '<button class="btn ghost" data-act="home">回首页</button>'
      + '</div>'
      + '</div>'
      + wrongHTML
      + '</div></div>';
    SESSION = null;
  }

  /* ============================================================
     首页
     ============================================================ */
  let currentSubj = 'ma';
  let VIEW = 'home';
  let TRACK_FROM = 'ma';

  function render(screen) {
    if (screen === 'track') return renderTrack();
    return renderHome(screen);
  }

  function moduleStats(m, srs) {
    let due = 0, master = 0, total = 0;
    function one(id) {
      total++;
      const r = srs.get(id);
      if (!r) return;
      if (r.lv >= srs.MASTER) master++;
      else if (r.due <= Date.now()) due++;
    }
    (m.skills || []).forEach(function (s) { one(s.id); });
    if (m.items) m.items().forEach(function (it) { one(it.id); });
    return { due: due, master: master, total: total };
  }

  function weekOf(subjId) {
    const days = SM.day.recent(7);
    let n = 0, ok = 0;
    days.forEach(function (d) { n += d[subjId] || 0; });
    // 周正确率用今天加昨天太粗糙，这里只展示周题量
    return { n: n, ok: ok };
  }

  function renderHome(subjId) {
    currentSubj = subjId;
    VIEW = 'home';
    const subj = SUBJ[subjId];
    if (!subj) return;
    const app = $('#app');
    const st = subj.srs.stats();
    const today = SM.day.get(subjId);
    const w = weekOf(subjId);
    const mods = subj.mods.map(function (m) {
      const ms = moduleStats(m, subj.srs);
      return '<button class="modcard" data-act="mod" data-mod="' + esc(m.id) + '">'
        + '<i style="background:' + (subjId === 'ma' ? '#EAF1FF' : '#FFF0ED') + ';color:' + subj.tone + '">' + esc(m.ico) + '</i>'
        + '<div><b>' + esc(m.name) + '</b><small>' + esc(m.sub) + '</small></div>'
        + '<em>' + (ms.due ? ms.due + ' 待复习' : (ms.master + '/' + ms.total + ' 掌握')) + '</em>'
        + '</button>';
    }).join('');

    const weak = subj.srs.weakest(3);
    const weakHTML = weak.length
      ? '<div class="sec"><span>最近要盯的</span><small>按错误率</small></div>'
        + weak.map(function (x) {
          const r = subj.srs.get(x.id);
          return '<div class="skrow"><b>' + esc(NAMES[x.id] || x.id) + '</b>'
            + '<span class="skbar"><i style="width:' + Math.round((r ? r.lv : 0) / subj.srs.MASTER * 100) + '%"></i></span>'
            + '<small>' + Math.round(x.rate * 100) + '%</small></div>';
        }).join('')
      : '';

    const cnQuota = subjId === 'cn'
      ? '<span>今日新词 <b>' + (8 - subj.srs.quotaLeft()) + ' / 8</b></span>'
      : '';
    const totalItems = subj.mods.reduce(function (n, m) {
      return n + (m.items ? m.items().length : (m.skills || []).length);
    }, 0);

    app.innerHTML =
      '<div class="screen subj-screen">'
      + '<div class="top">'
      + '<button class="pill" data-act="back">‹ 返回</button>'
      + '<div class="top-title">' + esc(subj.name) + '</div>'
      + '<div class="pill">⭐ <b>' + ST.stars + '</b></div>'
      + '</div>'
      + '<div class="scroll">'
      + '<div class="subj-hero">'
      + '<div class="subj-mark" style="background:' + subj.tone + '">' + esc(subj.mark) + '</div>'
      + '<div><h1>' + esc(subj.name) + '</h1><p>' + esc(subj.title) + '</p><small>' + esc(subj.desc) + '</small></div>'
      + '</div>'
      + '<div class="membar">'
      + '<div><b>' + today.n + '</b><span>今天做了</span></div>'
      + '<div><b>' + pct(today.ok, today.n) + '%</b><span>今天正确率</span></div>'
      + '<div class="' + (st.due ? 'hi' : '') + '"><b>' + st.due + '</b><span>待复习</span></div>'
      + '<div><b>' + st.master + '</b><span>已掌握</span></div>'
      + '</div>'
      + '<button class="btn subj-start" data-act="start">' + (subjId === 'ma' ? '开始今日 10 题' : '开始今日 8 题') + '</button>'
      + '<div class="subj-note">' + (subjId === 'ma'
        ? '先在草稿纸上算，只填最终结果；不会的先跳过，答完看解析。'
        : '看拼音在本子上写，再输入；写错了会隔几题再问一次。') + '</div>'
      + '<div class="sec"><span>练什么</span><small>按薄弱度自动排' + (subjId === 'cn' ? '　·　新词每天 8 个' : '') + '</small></div>'
      + '<div class="subj-mods">' + mods + '</div>'
      + '<div class="sec"><span>本周</span><small>' + w.n + ' 题</small></div>'
      + '<div class="subj-week">'
      + '<span>本周练习 <b>' + w.n + '</b> 题</span>'
      + cnQuota
      + '<span>词表/技能 <b>' + totalItems + '</b> 条</span>'
      + '</div>'
      + weakHTML
      + '<button class="subj-trackbtn" data-act="track">查看学习轨迹 ›</button>'
      + '</div></div>';
  }

  /* ============================================================
     学习轨迹
     ============================================================ */
  function renderTrack() {
    VIEW = 'track';
    TRACK_FROM = currentSubj || 'ma';
    const app = $('#app');
    const days = SM.day.recent(30);
    const max = Math.max(20, Math.max.apply(null, days.map(function (d) { return (d.ma || 0) + (d.cn || 0) + (d.en || 0); })));
    const heat = days.map(function (d) {
      const n = (d.ma || 0) + (d.cn || 0) + (d.en || 0);
      const lv = n === 0 ? 0 : Math.min(4, 1 + Math.floor(n / max * 4));
      return '<i class="h' + lv + '" title="' + d.date + '　数学' + d.ma + '　语文' + d.cn + '　英语' + d.en + '"></i>';
    }).join('');

    const today = SM.day.today();
    function subjCard(id, name, tone) {
      const s = SUBJ[id].srs.stats();
      const d = SM.day.get(id);
      return '<div class="trcard">'
        + '<div class="trhead"><b style="color:' + tone + '">' + name + '</b><span>今天 ' + d.n + ' 题</span></div>'
        + '<div class="trnums"><span>待复习 <b>' + s.due + '</b></span><span>在学 <b>' + s.learning + '</b></span><span>掌握 <b>' + s.master + '</b></span></div>'
        + '</div>';
    }

    const weak = SUBJ.ma.srs.weakest(5).map(function (x) {
      const r = SUBJ.ma.srs.get(x.id);
      return '<div class="skrow"><b>' + esc(NAMES[x.id] || x.id) + '</b>'
        + '<span class="skbar"><i style="width:' + Math.round((r ? r.lv : 0) / SUBJ.ma.srs.MASTER * 100) + '%"></i></span>'
        + '<small>' + Math.round(x.rate * 100) + '%</small></div>';
    }).join('') || '<div class="trnone">还没有足够的数据，先练几天。</div>';

    const cn = SUBJ.cn.srs.stats();

    const fixAll = fixList();
    const fixRows = fixAll.map(function (f, i) { return { f: f, i: i }; })
      .reverse().slice(0, 10);
    const fixHTML = fixRows.length
      ? '<div class="sec"><span>待处理的题</span><small>' + fixAll.length + ' 条</small></div>'
        + fixRows.map(function (x) {
          const f = x.f;
          const v = f.verdict === 'yes' ? '小鲸：确实有问题'
            : f.verdict === 'no' ? (f.forced ? '小鲸：可能没问题（已强制提交）' : '小鲸：可能没问题')
              : '待复核';
          return '<div class="fixrow"><b>' + esc(f.subj || '反馈') + ' · ' + esc(f.q) + '</b>'
            + '<span>' + esc(f.why || '') + '</span>'
            + '<small>' + v + (f.ai ? ' · ' + esc(f.ai) : '') + '</small>'
            + '<button data-act="fixdone" data-i="' + x.i + '">✓ 已处理</button></div>';
        }).join('')
      : '';

    app.innerHTML =
      '<div class="screen subj-screen">'
      + '<div class="top"><button class="pill" data-act="back">‹ 返回</button>'
      + '<div class="top-title">学习轨迹</div><div class="pill">近 30 天</div></div>'
      + '<div class="scroll">'
      + '<div class="heat">' + heat + '</div>'
      + '<div class="heatlegend"><span>少</span><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>多</span></div>'
      + '<div class="sec"><span>今天</span><small>三科合计 ' + (today.ma.n + today.cn.n + today.en.n) + ' 题</small></div>'
      + '<div class="trgrid">' + subjCard('ma', '数学', SUBJ.ma.tone) + subjCard('cn', '语文', SUBJ.cn.tone) + '</div>'
      + '<div class="sec"><span>数学要盯的技能</span><small>掌握度</small></div>'
      + weak
      + '<div class="sec"><span>语文词表</span><small>每天 8 个新词</small></div>'
      + '<div class="trcard"><div class="trnums"><span>待复习 <b>' + cn.due + '</b></span><span>在学 <b>' + cn.learning + '</b></span><span>已掌握 <b>' + cn.master + '</b></span></div>'
      + '<div class="trbar"><i style="width:' + Math.round(cn.master / Math.max(1, cn.total) * 100) + '%"></i></div></div>'
      + fixHTML
      + '<div class="trfoot">轨迹只记「练了什么、错在哪」，不排名、不比较。</div>'
      + '</div></div>';
  }

  /* ============================================================
     交互
     ============================================================ */
  function errTag(tag) {
    const db = S.get('sm_err', {}) || {};
    db[tag] = (db[tag] || 0) + 1;
    S.set('sm_err', db);
    toast('记下了：' + tag);
    const btns = document.querySelectorAll('.sq-err button');
    btns.forEach(function (b) { b.disabled = true; b.classList.toggle('on', b.dataset.tag === tag); });
  }

  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    const act = t.dataset.act;
    const st = SESSION;

    if (act === 'back') {
      if (VIEW === 'track') { renderHome(TRACK_FROM); return; }
      if (VIEW === 'quiz' || VIEW === 'result') {
        SESSION = null;
        ST.screen = 'hub';
        if (SM.render) SM.render();
        return;
      }
      ST.screen = 'hub';
      SESSION = null;
      if (SM.render) SM.render();
      return;
    }
    if (act === 'home') {
      SESSION = null;
      renderHome(currentSubj || 'ma');
      return;
    }
    if (act === 'track') {
      renderTrack();
      return;
    }
    if (act === 'fixdone') {
      fixRemove(parseInt(t.dataset.i, 10));
      renderTrack();
      return;
    }
    if (act === 'flag') {
      if (!st || !st.cur) return;
      const q = st.cur.q;
      const ans = q.t === 'c' ? q.o[q.a] : (Array.isArray(q.a) ? q.a.join('/') : q.a);
      SM.fix.open({
        subject: st.subj.name,
        question: q.q,
        answer: String(ans),
        onAccept: function () {
          markBadQ(q, '');
          /* 本卷还没考到的同一道题，一起摘掉 */
          for (let i = st.list.length - 1; i > st.idx; i--) {
            if (qkey(st.list[i].q) === qkey(q)) st.list.splice(i, 1);
          }
          const b = document.querySelector('.sq-flag');
          if (b) { b.disabled = true; b.textContent = '✓ 已提交修改任务'; }
          A.tap();
        }
      });
      return;
    }
    if (act === 'start') {
      start(currentSubj || 'ma');
      return;
    }
    if (act === 'mod') {
      const m = t.dataset.mod;
      start(currentSubj || 'ma', 5, m);
      return;
    }
    if (act === 'again') {
      const id = currentSubj || 'ma';
      SESSION = null;
      start(id);
      return;
    }
    if (act === 'check') { check(); return; }
    if (act === 'next') { next(); return; }
    if (act === 'step') {
      if (!st) return;
      st.step = Math.min((st.cur.q.steps || []).length, (st.step || 0) + 1);
      paint();
      return;
    }
    if (act === 'err') { errTag(t.dataset.tag); return; }
  });

})(window.SM);
