/* ============================================================
   result.js — 结算面板 + 错题回顾 + 题目反馈
   ------------------------------------------------------------
   结算数据全部来自服务器快照，星星以服务器返回的余额为准。
   错题由主流程在答题时收集，这里只负责展示。
   ============================================================ */

import { answerText } from './questions.js';
import { robotById } from './robots.js';
import { RACER_COLORS } from './track.js';

const FIX_KEY = 'sm_fixq';
const BAD_KEY = 'sm_bad_q';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtTime(s) {
  const v = Math.max(0, Math.round(s || 0));
  const m = Math.floor(v / 60);
  const r = v % 60;
  return m + ':' + (r < 10 ? '0' + r : r);
}

function titleOf(over, place, free) {
  if (free) return '练习完成';
  if (!over) return '比赛结束';
  if (over.draw) return '同时冲线 · 平局';
  if (over.reason === 'offline' || over.reason === 'foe-left') {
    return place === 1 ? '对手掉线 · 你赢了' : '比赛中断';
  }
  if (place === 1) return '冲线夺冠！';
  if (place === 2) return '第 2 名 · 就差一点';
  if (place === 3) return '第 3 名 · 再快一步';
  if (place === 4) return '第 4 名 · 下一局追回来';
  return '比赛结束';
}

export class ResultPanel {
  constructor(root) {
    this.root = root;
    this.onAction = null;
    this.cur = null;
    this.wrongs = [];
  }

  show(o) {
    this.cur = o;
    this.wrongs = o.wrongs || [];
    const me = o.snap && o.snap.me;
    const over = o.snap && o.snap.over;
    const free = !!(o.snap && o.snap.free);
    const draw = !!o.draw;
    const place = o.place || 0;
    const totalRacers = o.total || 4;
    const win = place === 1 && !draw;
    const title = titleOf(over, place, free);
    const award = (over && over.awards && me) ? (over.awards[me.who] || 0) : 0;

    let starLine = '';
    if (free) {
      starLine = '<div class="res-stars practice">练习赛 · 不计积分</div>';
    } else if (draw) {
      starLine = '<div class="res-stars draw">平局 · 退还报名费 +50⭐</div>';
    } else if (place === 1) {
      starLine = '<div class="res-stars win">+' + (award || 75) + '⭐ <span>' + totalRacers
        + ' 台机器人里的冠军，净赚 25</span></div>';
    } else if (place === 2) {
      starLine = '<div class="res-stars second">+' + (award || 25) + '⭐ <span>亚军奖励</span></div>';
    } else {
      starLine = '<div class="res-stars lose">本局 −50⭐ 报名费</div>';
    }

    /* 参赛顺序：把我排第一（和赛场上的跑道颜色一致），再按距离出名次 */
    const list = (o.snap && o.snap.racers) ? o.snap.racers.slice() : [];
    const meSlot = me ? me.slot : 0;
    const ordered = list.filter((r) => r.slot === meSlot)
      .concat(list.filter((r) => r.slot !== meSlot));
    const colorOf = {};
    ordered.forEach((r, i) => { colorOf[r.slot] = RACER_COLORS[i % RACER_COLORS.length]; });
    const board = ordered.slice().sort((a, b) => b.dist - a.dist);
    const boardHtml = board.length
      ? '<div class="res-board"><div class="res-board-hd"><b>最终排名</b><span>400 m × 3</span></div>'
        + board.map((r, i) => {
          const mine = r.slot === meSlot;
          const acc = r.right + r.wrong ? Math.round((r.right / (r.right + r.wrong)) * 100) : 0;
          const rob = robotById(r.robot);
          return '<div class="res-row' + (mine ? ' me' : '') + '">'
            + '<i class="rk n' + (i + 1) + '">' + (i + 1) + '</i>'
            + '<i class="dot" style="background:' + colorOf[r.slot] + '"></i>'
            + '<b>' + esc(r.who) + (mine ? '（我）' : '') + '</b>'
            + '<span class="rr">' + esc(rob.name) + (r.ai ? ' · AI' : '') + '</span>'
            + '<em>' + Math.round(r.dist) + ' m</em>'
            + '<u>' + (acc ? acc + '%' : '—') + '</u>'
            + '</div>';
        }).join('') + '</div>'
      : '';

    const total = me ? me.right + me.wrong : 0;
    const acc = total ? Math.round((me.right / total) * 100) : 0;
    const stats = [
      ['用时', fmtTime(over && over.dur != null ? over.dur : (o.snap ? o.snap.t : 0))],
      ['完成距离', me ? Math.round(me.dist) + ' m' : '—'],
      ['圈数', me ? me.lap + '/3' : '—'],
      ['正确率', total ? acc + '%' : '—'],
      ['答对 / 答错', me ? me.right + ' / ' + me.wrong : '—'],
      ['最高连击', me ? me.max_combo : 0],
      ['摔倒次数', me ? me.crashes : 0],
      ['冠军', (over && over.win_who) ? esc(over.win_who) : (free ? '练习' : '—')]
    ];

    this.root.innerHTML =
      '<div class="res-card ' + (win ? 'is-win' : draw ? 'is-draw' : 'is-lose') + '">'
      + '<div class="res-top">'
      +   '<div class="res-title">' + esc(title) + '</div>'
      +   starLine
      +   '<div class="res-balance">当前余额 <b>' + (me ? me.stars : 0) + '</b> ⭐</div>'
      + '</div>'
      + boardHtml
      + '<div class="res-grid">'
      + stats.map((s) => '<div class="res-stat"><span>' + s[0] + '</span><b>' + s[1] + '</b></div>').join('')
      + '</div>'
      + '<div class="res-wrong">'
      +   '<div class="res-wrong-hd"><b>错题回顾</b><span>' + this.wrongs.length + ' 题</span></div>'
      +   (this.wrongs.length
        ? this.wrongs.map((w, i) => this._wrongHtml(w, i)).join('')
        : '<div class="res-empty">全对，没有错题。</div>')
      + '</div>'
      + '<div class="res-actions">'
      +   '<button class="btn-primary" data-res="again">再来一局</button>'
      +   '<button class="btn-ghost" data-res="robot">换机器人</button>'
      +   '<button class="btn-ghost" data-res="lobby">返回大厅</button>'
      + '</div>'
      + '</div>';

    this.root.querySelectorAll('[data-res]').forEach((b) => {
      b.onclick = () => {
        if (this.onAction) this.onAction(b.dataset.res);
      };
    });
    this.root.querySelectorAll('[data-fix]').forEach((b) => {
      b.onclick = () => this.openFix(this.wrongs[Number(b.dataset.fix)]);
    });

    if (o.onShown) o.onShown();
  }

  _wrongHtml(w, i) {
    const mine = w.mine == null || w.mine === '' ? '跳过' : String(w.mine);
    return '<div class="res-wrong-row">'
      + '<div class="rw-q">' + esc(w.q.q) + '</div>'
      + '<div class="rw-line"><span>我答</span><b class="bad">' + esc(mine) + '</b>'
      + '<span>正确</span><b class="good">' + esc(answerText(w.q)) + '</b></div>'
      + (w.q.tip ? '<div class="rw-tip">' + esc(w.q.tip) + '</div>' : '')
      + '<div class="rw-foot"><span class="rw-skill">' + esc(w.q.skillName || '') + '</span>'
      + '<button class="rw-fix" data-fix="' + i + '">题目有问题</button></div>'
      + '</div>';
  }

  openFix(w) {
    if (!w) return;
    const old = document.querySelector('.mpk-fixveil');
    if (old) old.remove();
    const veil = document.createElement('div');
    veil.className = 'mpk-fixveil';
    veil.innerHTML =
      '<div class="mpk-fixbox">'
      + '<div class="fixhd"><b>这道题哪里不对？</b><button class="fixx">✕</button></div>'
      + '<div class="fixq">' + esc(w.q.q) + '</div>'
      + '<div class="fixchips">'
      + ['题干不清', '答案有误', '超出所学', '其他'].map((t) =>
        '<button type="button" data-chip="' + t + '">' + t + '</button>').join('')
      + '</div>'
      + '<textarea class="fixwhy" maxlength="120" placeholder="说说理由，比如：这里的答案应该是 25"></textarea>'
      + '<div class="fixmsg"></div>'
      + '<div class="fixacts"><button type="button" class="fx-cancel">取消</button>'
      + '<button type="button" class="fx-send">提交</button></div>'
      + '</div>';
    document.body.appendChild(veil);
    const why = veil.querySelector('.fixwhy');
    const msg = veil.querySelector('.fixmsg');
    const send = veil.querySelector('.fx-send');
    const close = () => veil.remove();
    veil.querySelector('.fixx').onclick = close;
    veil.querySelector('.fx-cancel').onclick = close;
    veil.querySelectorAll('[data-chip]').forEach((b) => {
      b.onclick = () => {
        const t = b.dataset.chip;
        if (why.value.indexOf(t) < 0) why.value = why.value ? why.value + '，' + t : t;
        why.focus();
      };
    });
    why.focus();

    send.onclick = async () => {
      const text = why.value.trim();
      if (!text) {
        msg.className = 'fixmsg show bad';
        msg.textContent = '先用一句话说说哪里不对';
        return;
      }
      send.disabled = true;
      msg.className = 'fixmsg show';
      msg.textContent = '小鲸在核对这道题…';
      let verdict = 'pending';
      let aiWhy = '';
      try {
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scene: 'fix', temperature: 0.1,
            messages: [{
              role: 'user',
              content: '题目：' + w.q.q + '\n标准答案：' + answerText(w.q)
                + '\n科目：数学\n学生的反馈：' + text
            }]
          })
        });
        const j = await r.json();
        if (j && j.ok && j.text) {
          const raw = String(j.text).trim();
          verdict = /^(VERDICT\s*[:：]\s*)?YES\b/i.test(raw) ? 'yes' : 'no';
          const lines = raw.split(/\n+/).map((s) => s.replace(/^\s*(VERDICT|REASON|判断|理由)\s*[:：]\s*/i, '').trim()).filter(Boolean);
          aiWhy = lines[1] || lines[0] || '';
        }
      } catch (e) {
        verdict = 'pending';
      }
      this._saveFix(w, text, verdict, aiWhy);
      msg.className = 'fixmsg show ' + (verdict === 'yes' ? '' : 'bad');
      msg.textContent = verdict === 'yes' ? '已记录：这题会进修改清单'
        : verdict === 'no' ? '已记录，会继续观察' : '先记下了，联网后由小鲸复核';
      send.disabled = false;
      setTimeout(close, 1300);
    };
  }

  _saveFix(w, why, verdict, aiWhy) {
    try {
      const key = String(w.q.q) + '|' + String(answerText(w.q));
      if (verdict === 'yes') {
        const bad = JSON.parse(localStorage.getItem(BAD_KEY) || '{}');
        bad[key] = { t: Date.now(), why: why };
        localStorage.setItem(BAD_KEY, JSON.stringify(bad));
      }
      const list = JSON.parse(localStorage.getItem(FIX_KEY) || '[]');
      list.push({
        t: Date.now(), subj: '数学', q: w.q.q, a: answerText(w.q),
        why: why, verdict: verdict, ai: aiWhy || '', forced: false
      });
      localStorage.setItem(FIX_KEY, JSON.stringify(list.slice(-200)));
    } catch (e) { /* 存不下就算了，不挡结算 */ }
  }
}
