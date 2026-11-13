/* ============================================================
   selftest12.js — 直达游戏入口（/play、/play-ipad）
   用法：node arcade/selftest12.js

   这一套不做浏览器自动化（那是 .visual-play.cjs 的活），
   只把「入口文件在不在、参数对不对、免票逻辑有没有被改坏」
   钉成回归护栏 —— 以后谁动了 arcade.js 的扣星分支，这里会红。

   A. 四个入口文件与跳转参数
   B. index.html 的参数解析与首屏遮罩
   C. arcade.js 的练习局（free）分支
   D. app.js / css / server.py 的接线
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const bad = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; bad.push(name + (extra ? '  ' + extra : '')); console.log('  ✗ ' + name + (extra ? '  ' + extra : '')); }
}
function read(p) {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; }
}
function has(src, re) { return re.test(src); }

const play = read('play.html');
const playPad = read('play-ipad.html');
const playDir = read('play/index.html');
const playPadDir = read('play-ipad/index.html');
const indexHtml = read('index.html');
const arcade = read('js/arcade.js');
const app = read('js/app.js');
const css = read('css/arcade.css');
const server = read('server.py');

/* ---------------- A. 入口文件 ---------------- */
console.log('\nA. 入口文件');
ok('play.html 在', play.length > 0);
ok('play-ipad.html 在', playPad.length > 0);
ok('/play 目录入口在', playDir.length > 0);
ok('/play-ipad 目录入口在', playPadDir.length > 0);

ok('手机跳板带 play=1 + phone=1',
  /location\.replace\('index\.html\?play=1&phone=1'/.test(play));
ok('iPad 跳板带 play=1 + ipad=1',
  /location\.replace\('index\.html\?play=1&ipad=1'/.test(playPad));
ok('跳板把外部 ?who= / ?free= 原样带过去',
  /location\.search\.replace\(\/\^\\\?\/, '&'\)/.test(play)
  && /location\.search\.replace\(\/\^\\\?\/, '&'\)/.test(playPad));
ok('/play 转发到 ../play.html',
  /location\.replace\('\.\.\/play\.html' \+ \(location\.search \|\| ''\)\)/.test(playDir));
ok('/play-ipad 转发到 ../play-ipad.html',
  /location\.replace\('\.\.\/play-ipad\.html' \+ \(location\.search \|\| ''\)\)/.test(playPadDir));
ok('跳板有「没跳转就点这里」兜底',
  /没跳转就点这里/.test(play) && /没跳转就点这里/.test(playPad));
ok('跳板声明了主屏 web-app 标题',
  /apple-mobile-web-app-title/.test(play) && /apple-mobile-web-app-title/.test(playPad));

/* ---------------- B. index.html ---------------- */
console.log('\nB. index.html 参数解析');
ok('解析 play 参数', /param\('play'\)/.test(indexHtml));
ok('?phone=1 / ?mobile=1 强制手机布局',
  /param\('phone'\) === '1' \|\| param\('mobile'\) === '1'/.test(indexHtml)
  && /if \(forcePhone\) pad = false;/.test(indexHtml));
ok('play 时写 __SM_PLAY', /window\.__SM_PLAY = \{/.test(indexHtml));
ok('默认练习局（free 只有显式 0 才关）',
  /free: param\('free'\) !== '0'/.test(indexHtml));
ok('档案名默认 Elaine，?who= 可覆盖',
  /param\('who'\) \|\| saved \|\| 'Elaine'/.test(indexHtml));
ok('play 时挂 play-boot 类', /root\.classList\.add\('play-boot'\)/.test(indexHtml));
ok('非 play 时 __SM_PLAY 明确为 null', /window\.__SM_PLAY = null;/.test(indexHtml));
ok('首屏遮罩 #bootVail 在', /id="bootVail"/.test(indexHtml));
ok('play-boot 时藏首页', /html\.play-boot #app \{ visibility: hidden; \}/.test(indexHtml));
ok('遮罩只在 play-boot 时显示', /html\.play-boot #bootVail/.test(indexHtml));

/* ---------------- C. arcade.js 练习局 ---------------- */
console.log('\nC. arcade.js 的 free 分支');
ok('导出 quickStart', /quickStart: quickStart,/.test(arcade));
ok('quickStart 默认 free（显式 false 才收票）',
  /startRun\(opts\.free !== false\)/.test(arcade));
ok('startRun 接收 free 参数', /function startRun\(free\) \{/.test(arcade));

const startBody = (arcade.match(/function startRun\(free\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('只在非练习局扣星', /if \(!free\) \{[\s\S]*?ST\.stars -= TUNE\.ENTRY_COST;/.test(startBody));
ok('练习局不写 runPending', /if \(!free\) \{\s*saveArc\(\{ runPending:/.test(startBody));
ok('练习局不清理老档案', /if \(!free\) \{\s*[\s\S]*?dropOldMeta\(\)/.test(startBody));
ok('开局撤掉首屏遮罩', /dropVail\(\);/.test(startBody));

ok('run 上记了 free 标记', /run\.free = free;/.test(arcade));
ok('拼词回调里练习局提前 return',
  /if \(run\.free\) \{[\s\S]*?return;[\s\S]*?\}/.test(arcade));
const onWord = (arcade.match(/host\.onWord\(function[\s\S]*?\n    \}\);/) || [''])[0];
ok('练习局不写记忆曲线',
  onWord.indexOf('run.free') < onWord.indexOf('srsUpdate(') && onWord.indexOf('run.free') >= 0);
ok('练习局照样统计对错', /run\.good\+\+|run\.bad\+\+/.test(onWord));
ok('练习局看提示不写 peek', /if \(!run\.free\) srsPeek\(w\)/.test(arcade));

const onTier = (arcade.match(/host\.onTier\(function[\s\S]*?\n    \}\);/) || [''])[0];
ok('清档只在非练习局加星', /if \(!run\.free\) \{[\s\S]*?bossPrice/.test(onTier));
ok('清档练习局不写 bestTier', !/saveArc\(\{[\s\S]*?bestTier/.test(onTier.replace(/if \(!run\.free\) \{[\s\S]*?\n      \}/, '')) || /if \(!run\.free\)/.test(onTier));

const finish = (arcade.match(/function finishRun\(sum\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('练习局结算星数归零', /var stars = free \? 0 : run\.starsRaw;/.test(finish));
ok('练习局不累加星、不写每日额度',
  /if \(!free\) \{[\s\S]*?ST\.saveStars \(\)|if \(!free\) \{[\s\S]*?ST\.saveStars\(\)/.test(finish));
ok('练习局写不进 bestTier', /if \(!free\) \{[\s\S]*?bestTier/.test(finish));
ok('结算带 free 标记出去', /free: free,/.test(finish));

ok('结算页显示「练习模式」', /res-free/.test(arcade) && /不计分 · 不扣星 · 不写记录/.test(arcade));
ok('练习局结算给「再来一局」', /id="arcHome2"[\s\S]*?再来一局/.test(arcade));
ok('再来一局原地重开', /startRun\(true\);/.test(arcade));
ok('退出时放回首页', /classList\.remove\('play-boot'\)/.test(arcade));
ok('直达模式不补上次的结算',
  /if \(!window\.__SM_PLAY\) setTimeout\(recoverPending, 900\);/.test(arcade));
ok('词表挂了有兜底（不让遮罩卡死）', /加载有点慢，先回首页了/.test(arcade));
ok('平板竖屏提示横过来', /横过来玩，字母盘更好按/.test(arcade));

/* ---------------- D. 接线 ---------------- */
console.log('\nD. 接线');
ok('app.js 启动后自动开局', /if \(window\.__SM_PLAY\) \{/.test(app));
ok('app.js 调 quickStart', /SM\.arcade\.quickStart\(\{ free: window\.__SM_PLAY\.free \}\)/.test(app));
ok('app.js 有模块缺失兜底', /闯关模块没加载出来/.test(app));
ok('css 有 .res-free', /\.res-free \{/.test(css));
ok('css 大屏也放大了 .res-free', /\.res-free b \{ font-size: 26px; \}/.test(css));
ok('server.py 有 /play 路由', /== "\/play"/.test(server));
ok('server.py 有 /play-ipad 路由', /== "\/play-ipad"/.test(server));
ok('server.py 路由透传查询串', /extra = \("&" \+ u\.query\) if u\.query else ""/.test(server));

/* ---------------- 汇总 ---------------- */
console.log('\n' + (fail ? '✗' : '✓') + ' ' + pass + ' 项通过' + (fail ? '，' + fail + ' 项失败' : '') + '（共 ' + (pass + fail) + ' 项）');
if (fail) { console.log('失败项：'); bad.forEach(x => console.log('  - ' + x)); process.exit(1); }
