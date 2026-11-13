/* ============================================================
   tools/audit.js — AI 题目体检

   把生成出来的题批量丢给 DeepSeek，让它按小学教研的眼光看三件事：
     ① 语义   句子讲得通吗？有没有搭配不当、常识错误
     ② 答案   给的正确答案是不是唯一正确？有没有别的选项也说得通
     ③ 干扰项 错误选项是不是「孩子常犯的错」，还是一眼就能排除

   用法：
     node tools/audit.js                 # 每个模块 12 题
     node tools/audit.js --n 20          # 每个模块 20 题
     node tools/audit.js --mod s3,neg    # 只查这两个模块
     node tools/audit.js --dry           # 只看题目，不花 API 钱

   前置：8777 端口上的服务要开着（题目在浏览器里现场生成）
   产出：控制台报告 + docs/audit-YYYY-MM-DD.md
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '.cache/pw/node_modules/playwright-core'));

const ROOT = path.join(__dirname, '..');
const EXE = 'C:/Users/hermes/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-v4-flash';

const args = process.argv.slice(2);
const argOf = (k, d) => {
  const i = args.indexOf('--' + k);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const PER_MOD = parseInt(argOf('n', '12'), 10);
const MODS = (argOf('mod', 's3,do,neg,yesno,imp,wh,ans')).split(',').map(s => s.trim()).filter(Boolean);
const DRY = args.includes('--dry');
const BATCH = 8;

const SYS = [
  '你是小学英语教研老师，正在审核一套自动生成的练习题。',
  '学生是小学中高年级（10-12 岁），母语中文。',
  '',
  '逐题检查三件事：',
  '1. 语义：句子讲得通吗？主语和谓语、谓语和状语搭配是否合理？有没有常识错误、时态或单复数矛盾？',
  '2. 答案：给出的正确答案是不是唯一正确？有没有别的选项在语法或语义上也说得通？',
  '3. 干扰项：每个错误选项是不是「小学生常犯的错」？',
  '   - 好干扰项 = 形近、规则用错、时态混淆（play / plays / playing / played）',
  '   - 差干扰项 = 一眼就能排除的（词性不对、跨题型、英语里根本不存在的词、和题干毫无关系）',
  '',
  '只报告有问题的题，没问题的不要提。宁可漏报也不要瞎报。',
  '',
  '输出严格 JSON 数组，不要任何解释文字、不要 Markdown 代码块：',
  '[{"i":3,"level":"语义","why":"一句话说明问题","fix":"建议怎么改"}]',
  'level 只能是「语义」「答案」「干扰项」三者之一。',
  '全部没问题时输出 []',
].join('\n');

/* ---------------- 题目格式化 ---------------- */
const TYPE_CN = { c: '选择', i: '手写', b: '词块' };

function fmt(q, no) {
  const lines = [];
  const tag = '[' + (q._mid || '') + ' ' + (TYPE_CN[q.t] || q.t) + ']';
  const stem = String(q.q).replace(/\n/g, ' ⏎ ');
  lines.push('#' + no + ' ' + tag + ' ' + stem);
  if (q.t === 'c') {
    const opts = q.o.map((o, i) => String.fromCharCode(65 + i) + '. ' + o).join('   ');
    lines.push('    选项：' + opts);
    lines.push('    答案：' + q.o[q.a]);
  } else if (q.t === 'b') {
    lines.push('    词块：' + q.tok.join(' | '));
    lines.push('    答案：' + q.a[0]);
  } else {
    lines.push('    答案：' + (Array.isArray(q.a) ? q.a.join(' / ') : q.a));
  }
  return lines.join('\n');
}

/* ---------------- 调 DeepSeek ---------------- */
function loadKey() {
  const p = path.join(ROOT, '.cache/deepseek.json');
  if (!fs.existsSync(p)) return '';
  try { return (JSON.parse(fs.readFileSync(p, 'utf8')).key || '').trim(); } catch (e) { return ''; }
}

async function ask(key, userText, tries) {
  for (let k = 0; k < (tries || 3); k++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYS },
            { role: 'user', content: userText },
          ],
          temperature: 0.0,
          /* deepseek-v4-flash 是推理模型，先写 reasoning_content 再写 content。
             max_tokens 给小了会被思考过程吃光，content 永远是空串。
             8 题一批 + 每处问题都要写 why 和 fix，3000 会在中途截断，
             截断的 JSON 解析不了，那一批就白跑了。给到 5000。 */
          max_tokens: 5000,
          stream: false,
        }),
      });
      if (r.status === 429) { await sleep(2000); continue; }
      if (!r.ok) {
        const t = await r.text();
        return { err: 'HTTP ' + r.status + ' ' + t.slice(0, 160) };
      }
      const j = await r.json();
      const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
      return { text: msg.content || '' };
    } catch (e) {
      if (k === 2) return { err: String(e.message || e) };
      await sleep(1500);
    }
  }
  return { err: '重试三次都失败' };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function extractJSON(text) {
  const s = String(text || '').replace(/```json|```/g, '');
  const m = s.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

/* ---------------- 主流程 ---------------- */
(async () => {
  const key = loadKey();
  if (!DRY && !key) {
    console.error('没有 API Key：.cache/deepseek.json');
    process.exit(1);
  }

  const b = await chromium.launch({ executablePath: EXE, args: ['--mute-audio'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto('http://127.0.0.1:8777/', { waitUntil: 'networkidle' });

  /* 抽题：每个模块 n 题，按指纹去重 */
  const all = await p.evaluate(({ mods, n }) => {
    const seen = Object.create(null);
    const out = [];
    mods.forEach(id => {
      const m = SM.modules[id];
      if (!m) return;
      let got = 0, guard = 0;
      while (got < n && guard++ < n * 60) {
        let q = null;
        try { q = m.gen(1)[0]; } catch (e) { q = null; }
        if (!q) continue;
        const k = SM.quiz.fp(q);
        if (seen[k]) continue;
        seen[k] = 1;
        q._mid = id;
        out.push(q);
        got++;
      }
    });
    return out;
  }, { mods: MODS, n: PER_MOD });

  await b.close();

  console.log('抽到 ' + all.length + ' 题（' + MODS.join(' / ') + '，每模块 ' + PER_MOD + ' 题）');
  if (DRY) {
    all.forEach((q, i) => console.log(fmt(q, i + 1) + '\n'));
    return;
  }

  /* 分批送审。解析不了就把这批劈成两半重试 ——
     推理模型的 content 偶尔还是会被 max_tokens 截断，
     截断的 JSON 解析不出来，整批就白跑了。劈开之后输出短了，基本都能过。 */
  const findings = [];

  async function runBatch(slice, label) {
    const body = slice.map((q, k) => fmt(q, k + 1)).join('\n\n');
    process.stdout.write(label + '（' + slice.length + ' 题）… ');
    const r = await ask(key, body);
    if (r.err) {
      console.log('失败：' + r.err);
      return;
    }
    const arr = extractJSON(r.text);
    if (!arr) {
      if (slice.length > 1) {
        console.log('返回被截断，劈成两半重试');
        const h = Math.ceil(slice.length / 2);
        await runBatch(slice.slice(0, h), label + 'a');
        await runBatch(slice.slice(h), label + 'b');
        return;
      }
      console.log('返回解析不了：' + String(r.text).slice(0, 120).replace(/\n/g, ' '));
      return;
    }
    console.log(arr.length ? '发现 ' + arr.length + ' 处问题' : '干净');
    arr.forEach(x => {
      const q = slice[(x.i | 0) - 1];
      if (!q) return;
      findings.push({
        mid: q._mid, type: q.t, level: x.level || '?',
        why: x.why || '', fix: x.fix || '',
        q: fmt(q, 0).replace(/^#0 /, ''),
      });
    });
    await sleep(600);
  }

  let batchNo = 0;
  for (let i = 0; i < all.length; i += BATCH) {
    batchNo++;
    await runBatch(all.slice(i, i + BATCH), '第 ' + batchNo + ' 批');
  }

  /* 报告 */
  console.log('\n================ 体检结果 ================');
  if (!findings.length) {
    console.log('全部通过，没有发现问题。');
  } else {
    const byLevel = {};
    findings.forEach(f => { byLevel[f.level] = (byLevel[f.level] || 0) + 1; });
    console.log('共 ' + findings.length + ' 处：' +
      Object.entries(byLevel).map(([k, v]) => k + ' ' + v).join('  '));
    console.log('');
    findings.forEach((f, i) => {
      console.log((i + 1) + '. [' + f.level + '] ' + f.mid);
      console.log('   题：' + f.q.split('\n').join('\n       '));
      console.log('   问题：' + f.why);
      console.log('   建议：' + f.fix);
      console.log('');
    });
  }

  /* 存一份 markdown，方便回头看 */
  const d = new Date();
  const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const md = ['# AI 题目体检 ' + day, '',
    '- 抽样：' + MODS.join(' / ') + '，每模块 ' + PER_MOD + ' 题，共 ' + all.length + ' 题',
    '- 发现：' + findings.length + ' 处', ''];
  findings.forEach((f, i) => {
    md.push('## ' + (i + 1) + '. [' + f.level + '] ' + f.mid);
    md.push('');
    md.push('```');
    md.push(f.q);
    md.push('```');
    md.push('');
    md.push('- **问题**：' + f.why);
    md.push('- **建议**：' + f.fix);
    md.push('');
  });
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs', 'audit-' + day + '.md'), md.join('\n'), 'utf8');
  console.log('报告已存到 docs/audit-' + day + '.md');
})();
