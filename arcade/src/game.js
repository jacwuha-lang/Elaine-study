/* 单词风云录 · 第一关 Demo
   横版拼词战斗：看中文 → 拼英文 → 自动出招 → 连击 → 大招 */
(function () {
  'use strict';

  var W = 480, H = 270;
  var cvs = document.getElementById('game');
  var ctx = cvs.getContext('2d');
  var PF = window.PixelFont;
  var Art = window.Art;
  var PAL = Art.PAL;
  var WORDS = window.WORDS;
  var opening = null;

  /* ================= 嵌入式宿主（Elaine学英语 · 闯关） =================
     没有 window.ARCADE_HOST 时，这里就是原来的单机版，行为一点不变。
     有它时进入「无尽档位」：档 = 词汇难度，每档 10 只小怪 + 1 BOSS，
     地图每档轮换 5 张，装备与灵石由宿主带进来。 */
  var ARCADE = {
    on: false,          /* 这一局是否由宿主驱动 */
    active: false,      /* 宿主当前是否在前台（停机与键盘闸门用） */
    queue: [],          /* 宿主下发的本档词池 */
    tier: 1,            /* 当前档位（1 起） */
    box: null,          /* 宿主给的舞台尺寸 {w,h} */
    meta: null,         /* 装备/技能，开局带进来 */
    onWord: null,       /* (word, kind, ms) => void */
    onTier: null,       /* (tier) => void  本档清完 */
    onEnd: null,        /* (summary) => void 死亡/退出 */
    onShop: null,       /* (open) => void  局内商店开合 */
    onSpell: null,      /* (word) => void  花灵石看了提示：请宿主朗读拼写 */
    onSay: null,        /* (text) => void  招式名喊一声：闪身步 / 破空斩 / 万剑归宗 */
    onVoice: null,      /* (off) => void   语音开关变了：宿主据此静音所有 TTS 并记下来 */
    shops: 0,            /* 本局开过几次商店（上报用） */
    layout: 'land'       /* 'land' | 'portrait'：竖屏时字母盘搬出 canvas，交给 DOM 键盘 */
  };
  window.ARCADE = ARCADE;
  function arcOn() { return !!ARCADE.on; }
  /* 招式名喊一声，交给宿主的 TTS 念（引擎里不碰任何语音实现）。
     念失败、宿主没接，都只能影响听感，绝不能影响这一局 */
  function sayName(text) {
    if (!text) return;
    if (ARCADE.onSay) { try { ARCADE.onSay(text); } catch (e) { } }
  }
  /* 技能 → 它抬的那条属性（「属性又升级了」那句要用到） */
  var ATTR_OF = { jian: '攻击', gang: '气劲', shen: '闪避', hui: '暴击' };
  /* 台词：引擎只说「发生了什么」，句子长什么样由 lines.js 挑。
     没加载台词库、宿主没接 TTS，都只是没声音，不能影响这一局。 */
  function say(cat, vars) {
    if (!ARCADE.onSay) return;
    var L = window.ARCADE_LINES;
    if (!L || !L.pick) return;
    var t = '';
    try { t = L.pick(cat, vars); } catch (e) { return; }
    if (t) sayName(t);
  }
  /* 竖屏：480 宽压到手机屏后每键只剩十几像素，点不准，
     所以画布里不画字母盘，改由 DOM 提供 6 列大键盘（css/arcade.css 的 .arc-keys） */
  function arcPort() { return ARCADE.layout === 'portrait'; }

  var BW = 160, BH = 90;
  var bloomA = document.createElement('canvas');
  bloomA.width = BW; bloomA.height = BH;
  var bax = bloomA.getContext('2d');

  var ERR = null;
  window.addEventListener('error', function (e) {
    ERR = (e && e.message) ? e.message : String(e);
  });

  /* 全屏（原生 or 伪全屏）时把边距收窄，画面才真正铺满 */
  function fsMode() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
      document.documentElement.classList.contains('fs-fake'));
  }

  function fit() {
    /* 内嵌模式：尺寸完全由宿主容器决定，不做全屏吸附 */
    if (ARCADE.on && ARCADE.box) {
      var bs = Math.min(ARCADE.box.w / W, ARCADE.box.h / H);
      bs = Math.max(0.25, bs);
      cvs.style.width = (W * bs) + 'px';
      cvs.style.height = (H * bs) + 'px';
      return;
    }
    /* 屏幕够大就用整数倍（像素更锐利）；手机竖屏/小屏允许非整数缩放，保证整幅画面都在 */
    var full = fsMode();
    var padX = full ? 6 : 16;
    var padY = full ? 6 : 40;
    var sw = (window.innerWidth - padX) / W;
    var sh = (window.innerHeight - padY) / H;
    var s = Math.min(sw, sh);
    /* 桌面大屏取整数倍最锐利；小屏（手机横屏）优先铺满，允许非整数。
       全屏时只有「差一点点就整数」才吸附，免得为了 4 倍把两边黑边留得太大 */
    if (s >= 2) {
      if (full) {
        var f = Math.floor(s);
        if (f / s >= 0.94) s = f;
      } else {
        s = Math.floor(s);
      }
    }
    s = Math.max(0.3, s);
    cvs.style.width = (W * s) + 'px';
    cvs.style.height = (H * s) + 'px';
  }
  fit();
  window.__fitNow = fit;
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 120); });
  document.addEventListener('fullscreenchange', function () { setTimeout(fit, 60); });
  document.addEventListener('webkitfullscreenchange', function () { setTimeout(fit, 60); });

  /* ---------------- 音频 ---------------- */
  var AC = null, muted = false, MASTER = null;
  /* 语音（TTS）开关：只影响宿主那套朗读，跟音效各管一摊。
     状态由宿主持有（会记在 localStorage 里），引擎负责画按钮、点一下通知宿主。 */
  var voiceOff = false;

  function actx() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        MASTER = AC.createGain();
        MASTER.gain.value = muted ? 0 : 1;
        MASTER.connect(AC.destination);
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }

  function setMuted(v) {
    muted = !!v;
    if (MASTER) MASTER.gain.value = muted ? 0 : 1;
    if (!muted) {
      /* 开启时给一声确认音 */
      actx();
      tone(720, 1080, 0.09, 'sine', 0.05);
      setTimeout(function () { tone(1080, 1080, 0.06, 'sine', 0.04); }, 90);
    }
    S.toast = { text: muted ? '音效已关闭' : '音效已开启', t: 1.1, max: 1.1 };
  }

  /* 语音开关。quiet=true 时不弹提示（宿主开局同步状态用） */
  function setVoiceOff(v, quiet) {
    voiceOff = !!v;
    if (ARCADE.onVoice) { try { ARCADE.onVoice(voiceOff); } catch (e) { } }
    if (!quiet) {
      S.toast = { text: voiceOff ? '语音已关闭' : '语音已开启', t: 1.2, max: 1.2 };
      if (!voiceOff) sfx.tab();
    }
    return voiceOff;
  }
  function toggleVoice() { return setVoiceOff(!voiceOff, false); }

  function tone(f1, f2, dur, type, vol) {
    var a = actx();
    if (!a || muted) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f1, a.currentTime);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), a.currentTime + dur);
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.05, a.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(MASTER || a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.03);
  }

  function noise(dur, vol, freq) {
    var a = actx();
    if (!a || muted) return;
    var len = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, len, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = a.createBufferSource(); src.buffer = buf;
    var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.1;
    var g = a.createGain();
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    src.connect(f).connect(g).connect(MASTER || a.destination);
    src.start();
  }

  var sfx = {
    slash: function (m) { noise(0.10, 0.045, 2800); tone(680 + m * 90, 320, 0.10, 'sawtooth', 0.022); },
    hit: function () { noise(0.07, 0.05, 900); tone(180, 90, 0.10, 'square', 0.030); },
    crit: function () { tone(1500, 620, 0.16, 'square', 0.040); noise(0.14, 0.05, 2000); },
    kill: function () { noise(0.20, 0.055, 760); tone(300, 80, 0.22, 'triangle', 0.040); },
    miss: function () { tone(150, 85, 0.20, 'sawtooth', 0.045); },
    hurt: function () { tone(110, 60, 0.26, 'square', 0.050); noise(0.18, 0.045, 320); },
    dodge: function () { noise(0.16, 0.030, 1500); },
    tap: function (i) { tone(760 + (i % 6) * 70, 1120 + (i % 6) * 70, 0.06, 'sine', 0.026); },
    tapBad: function () { tone(220, 180, 0.07, 'triangle', 0.020); },
    back: function () { tone(520, 300, 0.09, 'sine', 0.022); },
    buy: function () {
      tone(880, 1320, 0.09, 'sine', 0.030);
      setTimeout(function () { tone(1320, 1760, 0.10, 'sine', 0.026); }, 70);
    },
    deny: function () { tone(210, 150, 0.14, 'square', 0.030); },
    /* 小怪被打错三次：低吼一声，耳朵先知道它生气了 */
    rage: function () { tone(96, 62, 0.30, 'sawtooth', 0.042); noise(0.22, 0.035, 260); },
    art1: function () { noise(0.18, 0.05, 2600); tone(900, 420, 0.20, 'sawtooth', 0.034); },
    art2: function () { tone(1240, 620, 0.30, 'sine', 0.034); noise(0.30, 0.030, 3400); },
    art3: function () { noise(0.34, 0.07, 700); tone(170, 58, 0.40, 'square', 0.048); },
    tab: function () { tone(660, 660, 0.05, 'sine', 0.024); setTimeout(function () { tone(880, 880, 0.06, 'sine', 0.022); }, 55); },
    wave: function () { tone(523, 523, 0.09, 'sine', 0.035); setTimeout(function () { tone(784, 784, 0.13, 'sine', 0.035); }, 90); },
    ultStart: function () {
      [392, 523, 659, 784].forEach(function (f, i) {
        setTimeout(function () { tone(f, f * 1.5, 0.30, 'triangle', 0.040); }, i * 80);
      });
    },
    ultHit: function () { tone(90, 40, 0.9, 'sawtooth', 0.08); noise(0.8, 0.08, 420); },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        setTimeout(function () { tone(f, f, 0.28, 'sine', 0.045); }, i * 140);
      });
    }
  };

  /* ---------------- 状态 ---------------- */
  var S = {
    scene: 'title',
    t: 0, camX: 0, bgT: 0, shake: 0, hitstop: 0, timeScale: 1, flash: 0, punch: 0,
    player: null,
    enemies: [], projs: [], orbs: [], parts: [], texts: [], slashes: [], swords: [], impacts: [],
    artFx: [],
    toast: null,
    wave: 0, waveState: 'idle', waveT: 0, spawnQ: [],
    wordPool: [], wordUsed: {}, spawnLog: [],
    input: '', lockId: null, mistakeLock: 0, inputShake: 0, wordStart: 0, keyPing: 0,
    /* 花灵石买提示：填好整个词 → 停住等确认 → 确认后由主角出招打掉
       timeBuff 是「键入时限」的倍率，用一次提示就整局翻倍 */
    paused: false, pendHint: null, hintCd: 0, hintCount: 0, timeBuff: 1, hoverHint: 0,
    ult: null, eid: 0, victory: null,
    /* 点读模式：给不会打字的小朋友用，底部字母盘直接点 */
    kid: true, upper: true, focusId: null, hoverKid: false, hoverTile: -1, hoverCard: 0, hoverAct: 0,
    hoverBack: false, hoverTab: false, hoverCase: false, hoverSkill: -1, hoverQi: false,
    hoverSw: false, hoverSkip: false, hoverVoice: false,
    lastTap: null, badLetter: null, kidBad: 0,
    stats: { correct: 0, wrong: 0, maxCombo: 0, time: 0, start: 0 },
    banner: null,
    ambient: [],
    /* 关卡与养成：灵石在关与关之间保留，买到的装备与技能一直生效 */
    level: 1, waves: [],
    meta: { weapon: -1, armor: -1, skills: {}, arts: {}, wordStat: {} },
    wsDirty: false, wsT: 0,
    camp: { tab: 0, sel: 0, page: 0, msg: '', msgT: 0, hover: -1, hoverTab: -1, hoverGo: false, hoverPrev: false, hoverNext: false }
  };

  /* 读取上次的点读模式开关（默认开） */
  try {
    var _kidSaved = window.localStorage.getItem('dfyl_kid');
    if (_kidSaved === '0') S.kid = false;
    var _caseSaved = window.localStorage.getItem('dfyl_case');
    if (_caseSaved === '0') S.upper = false;
  } catch (e0) { /* 本地文件可能禁用 localStorage */ }

  var BASE_ATK = 12, BASE_CRIT = 0.08;

  /* ---------------- 狂暴（红怪） ----------------
     同一个词老是拼错，那只怪就红眼：打人更痛、吟唱更快。
     拼对一次就消气——惩罚的是「卡住」，不是「手慢」。 */
  var RAGE_MAX = 3;
  var RAGE_DMG = [1, 1, 1.5, 2.0];       /* 0/1/2/3 层：弹丸伤害倍率 */
  var RAGE_CAST = [1, 1, 0.85, 0.68];    /* 吟唱间隔倍率 */
  var ORB_DMG = 7;                        /* 基础弹丸伤害 */
  var RAGE_GAP = 1.1;                     /* 两层怒气之间的最短间隔，防止乱按瞬间满怒 */

  /* 关卡、地图和波次由 levels.js 管理。 */
  var levels = window.createArcadeLevels(ARCADE, arcOn);
  var MAX_LEVEL = levels.MAX_LEVEL;
  var arcMapOf = levels.arcMapOf;
  var arcRound = levels.arcRound;
  var arcMobHp = levels.arcMobHp;
  var levelCfg = levels.levelCfg;
  var worldOf = levels.worldOf;
  var levelName = levels.levelName;
  var bossName = levels.bossName;
  var mobHp = levels.mobHp;
  var bossHp = levels.bossHp;
  var wavePlan = levels.wavePlan;
  var spreadMobs = levels.spreadMobs;
  var arcadeWaves = levels.arcadeWaves;
  var makeWaves = levels.makeWaves;

  function newPlayer() {
    return {
      x: 108, y: 206, hp: 100, maxHp: 100, qi: 0, combo: 0, comboT: 0,
      inv: 0, dodgeCd: 0, flash: 0, dash: 0, anim: 'idle', animT: 0,
      /* leapD / leapH：本次普通攻击要跳多远、抬多高（0 = 站着劈） */
      leapD: 0, leapH: 0,
      stones: 0, comboPop: 0,
      atk: BASE_ATK, crit: BASE_CRIT, critMul: 1.8, qiMul: 1, dodgeMax: 2.5, cleave: 0,
      /* 主动技冷却：0 破空 / 1 寒冰 / 2 雷罡（第 0 格闪避用 dodgeCd） */
      arts: [0, 0, 0], cdK: 1
    };
  }

  /* 把装备、技能与功法折算成属性（买完东西、开新关都走这里） */
  function applyMeta(p) {
    if (!p) return;
    var m = S.meta, sk = m.skills || {}, ar = m.arts || {};
    var oldMax = p.maxHp || 100;
    var jian = sk.jian || 0, hui = sk.hui || 0, gang = sk.gang || 0, shen = sk.shen || 0;
    var po = ar.po || 0, bing = ar.bing || 0, lei = ar.lei || 0;
    p.atk = BASE_ATK + (m.weapon >= 0 ? SHOP.weapon[m.weapon].atk : 0) + 4 * jian;
    p.crit = BASE_CRIT + 0.06 * hui;
    p.critMul = 1.8 + 0.15 * hui;          /* 会心越高，暴击越痛 */
    p.qiMul = 1 + 0.30 * gang;
    p.dodgeMax = Math.max(0.7, 2.5 - 0.5 * shen);
    p.cdK = Math.max(0.6, 1 - 0.08 * shen);  /* 身法同时缩短招式冷却 */
    p.cleave = jian >= 2 ? 0.55 : 0;        /* 剑气横扫：额外目标吃 55% 伤害 */
    /* 功法：三招各自的伤害与冷却 */
    p.artMul = [1 + 0.22 * po, 1 + 0.24 * bing, 1 + 0.22 * lei];
    p.artCdK = [1 - 0.08 * po, 1 - 0.07 * bing, 1 - 0.06 * lei];
    p.bingFreeze = 2.5 + 0.4 * bing;
    p.maxHp = 100 + (m.armor >= 0 ? SHOP.armor[m.armor].hp : 0);
    p.hp = Math.min(p.maxHp, (p.hp || p.maxHp) + Math.max(0, p.maxHp - oldMax));
    if (p.hp <= 0) p.hp = p.maxHp;
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  var ambientSystem = window.createArcadeAmbient({ S: S, W: W, H: H, ctx: ctx, Art: Art, rnd: rnd });
  var initAmbient = ambientSystem.initAmbient, updateAmbient = ambientSystem.updateAmbient, drawAmbient = ambientSystem.drawAmbient;

  /* 词池、错词记录和复习逻辑由 word-system.js 负责。 */
  var FORCE_WORDS = [];   /* 调试：?words=cake,apple 强制出词 */
  var wordSystem = window.createArcadeWordSystem({ S: S, ARCADE: ARCADE, arcOn: arcOn, WORDS: WORDS, MAX_LEVEL: MAX_LEVEL, FORCE_WORDS: FORCE_WORDS });
  var levelWords = wordSystem.levelWords;
  var pickWord = wordSystem.pickWord;
  var rerollWord = wordSystem.rerollWord;
  var markWord = wordSystem.markWord;
  var wordStat = wordSystem.wordStat;
  var needsReview = wordSystem.needsReview;
  var reviewCount = wordSystem.reviewCount;
  var loadWordStat = wordSystem.loadWordStat;
  var saveWordStat = wordSystem.saveWordStat;
  var pickReviewWord = wordSystem.pickReviewWord;

  /* ---------------- 战斗 ---------------- */
  /* 新游戏：清空养成，从第一关开始 */
  function startGame(skipOpening) {
    actx();
    if (opening) { opening.destroy(); opening = null; }
    S.level = 1;
    /* 重开一局只清养成；错词本是学习记录，跟着玩家走，不清 */
    S.meta = { weapon: -1, armor: -1, skills: {}, arts: {}, wordStat: S.meta.wordStat || {} };
    if (!skipOpening && window.MoyuanPrologue) {
      S.scene = 'prologue';
      opening = window.MoyuanPrologue.create({
        canvas: cvs, audioContext: actx,
        getMuted: function () { return muted; },
        setMuted: function (value) { muted = !!value; if (MASTER) MASTER.gain.value = muted ? 0 : 1; },
        onFinish: function () { opening = null; startLevel(1, true); }
      });
      opening.start();
      return;
    }
    startLevel(1, true);
  }

  /* 宿主开局：档位、词池、装备全由外面给 */
  function startArcade(opts) {
    opts = opts || {};
    actx();
    if (opening) { opening.destroy(); opening = null; }
    ARCADE.on = true;
    ARCADE.active = true;
    ARCADE.tier = Math.max(1, opts.tier | 0 || 1);
    ARCADE.queue = opts.words || [];
    ARCADE.shops = 0;
    S.endSent = false;
    /* 提示相关的状态每局归零：时限倍率、冷却、暂停面板 */
    S.timeBuff = 1; S.hintCd = 0; S.hintCount = 0;
    S.paused = false; S.pendHint = null; S.hoverHint = 0;
    S.meta = opts.meta || { weapon: -1, armor: -1, skills: {}, arts: {} };
    if (!S.meta.wordStat) S.meta.wordStat = {};
    startLevel(ARCADE.tier, true);
    fit();
  }

  /* 换下一档：血与气劲都带过去，灵石和装备留着，词池换新的 */
  function arcadeGoTier(tier, words) {
    ARCADE.tier = Math.max(1, tier | 0 || 1);
    ARCADE.queue = words || [];
    var keepHp = S.player ? S.player.hp : 0;
    var keepQi = S.player ? S.player.qi : 0;
    startLevel(ARCADE.tier, false, keepHp, keepQi);
  }

  /* 开一关：保留灵石与养成，重置战斗现场
     keepHp：内嵌模式换档时把剩下的血带过去（否则 BOSS 回血毫无意义）
     keepQi：气劲同样是攒下来的资源，过关不该清零 */
  function startLevel(lv, resetStones, keepHp, keepQi) {
    actx();
    var stones = (S.player && !resetStones) ? S.player.stones : 0;
    S.level = lv;
    Art.setWorld(worldOf(lv));
    S.scene = 'play';
    S.player = newPlayer();
    S.player.stones = stones;
    applyMeta(S.player);
    S.player.hp = keepHp > 0 ? Math.min(S.player.maxHp, keepHp) : S.player.maxHp;
    if (keepQi > 0) S.player.qi = Math.min(100, keepQi);
    S.enemies = []; S.projs = []; S.orbs = []; S.parts = [];
    S.texts = []; S.slashes = []; S.swords = []; S.impacts = []; S.artFx = [];
    S.wave = 0; S.waveState = 'idle'; S.waveT = 0; S.spawnQ = [];
    S.wordPool = []; S.wordUsed = {}; S.spawnLog = [];
    S.input = ''; S.lockId = null; S.mistakeLock = 0; S.inputShake = 0; S.focusId = null;
    S.paused = false; S.pendHint = null; S.hintCd = 0; S.hoverHint = 0;
    S.ult = null; S.timeScale = 1; S.hitstop = 0; S.shake = 0; S.flash = 0;
    S.stats = { correct: 0, wrong: 0, maxCombo: 0, time: 0, start: S.t };
    /* 新的一关：挨打台词的冷却也清零，别让上一关的时间戳把这一关的开头哑掉 */
    S.lastHurtSay = -99;
    S.banner = null;
    S.victory = null;
    S.waves = makeWaves(lv);
    S.camp = { tab: 0, sel: 0, page: 0, msg: '', msgT: 0, hover: -1, hoverTab: -1, hoverGo: false, hoverPrev: false, hoverNext: false };
    startWave();
  }

  function startWave() {
    var cfg = S.waves[S.wave];
    if (!cfg) { win(); return; }
    S.spawnQ = [];
    for (var i = 0; i < cfg.count; i++) {
      S.spawnQ.push({ t: 0.2 + i * 0.55, elite: cfg.elite && i === cfg.count - 1, i: i });
    }
    S.waveState = 'fight';
    banner(cfg.label, '');
    sfx.wave();
  }

  function spawnEnemy(elite, idx) {
    var w = pickWord();
    var n = S.enemies.length;
    idx = idx || 0;
    var cnt = (S.waves[S.wave] && S.waves[S.wave].count) || 1;
    /* 站位间距按卡片宽度（88）排：三只并排 224/312/400，卡片刚好相切，
       最右那张的右边缘 444 也不会伸进右上角的按钮列 */
    var step = 88;
    var baseX = cnt >= 3 ? 224 : 240;
    var rightLimit = arcOn() && elite ? 390 : 400;
    var y = elite ? 172 : 124 + (idx % 3) * 26;
    var cfg = levelCfg(S.level);
    var wc = S.waves[S.wave] || {};
    var hp = elite ? bossHp(S.level) : mobHp(S.level);
    /* 调试：记录本关出过的词，方便验证不重复 */
    S.spawnLog.push({ w: w.w, elite: !!elite, t: Math.round(S.t * 10) / 10 });
    S.enemies.push({
      id: ++S.eid,
      x: 520 + n * 26, y: y,
      targetX: Math.min(rightLimit, baseX + idx * step), targetY: y,
      hp: hp, maxHp: hp,
      word: w.w, meaning: w.m, pos: w.p,
      alive: true, elite: !!elite, seed: Math.random() * 10,
      kind: elite ? cfg.boss
        : (wc.kinds ? wc.kinds[idx % wc.kinds.length]
          : (wc.kind || (cfg.mobs ? cfg.mobs[Math.floor(Math.random() * cfg.mobs.length)] : cfg.mob))),
      segs: elite ? 6 : Math.min(4, 1 + Math.floor((S.level - 1) / 5)),
      castT: 10, castMax: 10, baseCast: 10, flash: 0, kx: 0, ky: 0, hitT: 0, dying: 0, frozen: 0, busy: 0,
      rage: 0, rageT: 0,
      anim: 'spawn', animT: 0, facing: -1, deathMax: 0.28
    });
  }

  /* 怒气：+1 层就更快更痛，2 层起整只变红（狂暴） */
  function setRage(e, v) {
    if (!e) return;
    v = clamp(v, 0, RAGE_MAX);
    if (v === e.rage) return;
    e.rage = v;
    e.castMax = (e.baseCast || 10) * RAGE_CAST[v];
    if (e.castT > e.castMax) e.castT = e.castMax;
  }

  function addRage(e) {
    if (!e || !e.alive) return;
    if (e.rageT > 0) return;              /* 乱按不会一口气顶满 */
    e.rageT = RAGE_GAP;
    if (e.rage >= RAGE_MAX) return;
    var was = e.rage;
    setRage(e, e.rage + 1);
    if (e.rage >= 2 && was < 2) {
      floatText(e.x, e.y - 46, e.rage >= 3 ? '狂 怒' : '狂 暴', '#ff7a5a', 2);
      S.shake = Math.max(S.shake, 3);
      sfx.rage();
    }
  }

  function updateWaves(dt) {
    if (S.waveState === 'fight') {
      for (var i = S.spawnQ.length - 1; i >= 0; i--) {
        S.spawnQ[i].t -= dt;
        if (S.spawnQ[i].t <= 0) {
          spawnEnemy(S.spawnQ[i].elite, S.spawnQ[i].i);
          S.spawnQ.splice(i, 1);
        }
      }
    } else if (S.waveState === 'clear') {
      S.waveT -= dt;
      if (S.waveT <= 0) {
        S.wave++;
        if (S.wave >= S.waves.length) win();
        else startWave();
      }
    }
  }

  function updateEnemies(dt) {
    for (var i = S.enemies.length - 1; i >= 0; i--) {
      var e = S.enemies[i];
      if (!e.alive) {
        if (e.dying > 0) {
          e.dying -= dt;
          e.flash = 0;          /* 濒死用斜切白光，不再叠白闪剪影 */
          if (e.dying <= 0) {
            spawnDeath(e);
            S.enemies.splice(i, 1);
          }
        }
        continue;
      }
      e.flash = Math.max(0, e.flash - dt);
      e.animT = (e.animT || 0) + dt;
      if (e.hitT > 0) e.hitT = Math.max(0, e.hitT - dt);
      if (e.rageT > 0) e.rageT = Math.max(0, e.rageT - dt);
      /* 刚吃下一剑、词还没换好：这段时间不再接受同一个词，免得重复输入 */
      if (e.busy > 0) e.busy = Math.max(0, e.busy - dt);
      e.kx -= e.kx * Math.min(1, dt * 8);
      e.ky -= e.ky * Math.min(1, dt * 8);
      /* 朝向始终追踪主角，闪避越过敌人后也能及时转身。 */
      if (Math.abs(S.player.x - e.x) > 1) e.facing = S.player.x < e.x ? -1 : 1;
      /* 寒冰咒：冻住期间不走位、不吟唱 */
      if (e.frozen > 0) {
        e.frozen = Math.max(0, e.frozen - dt);
        continue;
      }
      if (e.attackT > 0) e.attackT = Math.max(0, e.attackT - dt);
      if (e.hitT > 0) {
        e.anim = 'hit';
      } else if (e.attackT > 0) {
        e.anim = 'attack';
      } else if (e.x > e.targetX + 1) {
        e.anim = 'walk';
        e.x -= 210 * dt;
        if (e.x < e.targetX) e.x = e.targetX;
      } else {
        e.anim = 'idle';
        e.castT -= dt;
        if (e.castT <= 0) {
          enemyAttack(e);
          e.castT = e.castMax;
        }
      }
    }
  }

  function enemyAttack(e) {
    e.attackT = 0.48;
    e.anim = 'attack';
    e.animT = 0;
    S.orbs.push({
      x: e.x - 12, y: e.y,
      tx: S.player.x, ty: S.player.y - 28,
      t: 0, dur: 0.9, seed: Math.random() * 9,
      /* 红怪的弹丸更痛：伤害在这里定死，飞行途中改怒气不影响这一发 */
      dmg: Math.round(ORB_DMG * RAGE_DMG[e.rage || 0]),
      rage: e.rage || 0
    });
  }

  function updateOrbs(dt) {
    for (var i = S.orbs.length - 1; i >= 0; i--) {
      var o = S.orbs[i];
      o.t += dt / o.dur;
      if (o.t >= 1) {
        var dx = S.player.x - o.tx;
        var dy = (S.player.y - 28) - o.ty;
        if (Math.sqrt(dx * dx + dy * dy) < 22) hurtPlayer(o.dmg || ORB_DMG);
        burst(o.tx, o.ty, o.rage >= 2 ? '#ff7a5a' : '#7fd6b0', 7);
        S.orbs.splice(i, 1);
      }
    }
  }

  function hurtPlayer(dmg) {
    var p = S.player;
    if (p.inv > 0) return;
    p.hp -= dmg;
    p.inv = 0.7;
    p.flash = 0.4;
    p.combo = 0;
    /* 被怪打掉血就好，气劲不再跟着掉：气劲只用来放招和大招 */
    p.anim = 'hit'; p.animT = 0;
    S.shake = Math.max(S.shake, 5);
    S.flash = Math.max(S.flash, 0.22);
    floatText(p.x, p.y - 62, '-' + dmg, '#ff8a7a', 2);
    sfx.hurt();
    /* 挨打台词：掉血就喊太吵（0.7 秒无敌里能连挨两三下），四秒最多一句。
       最后那一下不喊「好痛」—— 紧接着要喊「我倒下了」，两句挤在一起会被
       宿主的节流吞掉，不如干脆只留后面那句。
       注意 lastHurtSay 可能正好是 0，不能用 `|| -99` 兜底 —— 0 会被当成没喊过。 */
    var lh = (S.lastHurtSay == null) ? -99 : S.lastHurtSay;
    if (p.hp > 0 && S.t - lh > 4) {
      S.lastHurtSay = S.t;
      say('hurt');
    }
    if (p.hp <= 0) die();
  }

  function dodge() {
    var p = S.player;
    if (p.dodgeCd > 0) return;
    p.inv = 0.42;
    p.dodgeCd = p.dodgeMax;
    p.dash = -46;
    /* 闪避有自己的 8 帧动作，播完（0.42s，正好等于无敌时间）再回 idle */
    p.anim = 'dodge'; p.animT = 0;
    sfx.dodge();
    say('dodge');
    for (var i = 0; i < 6; i++) {
      S.parts.push({
        x: p.x + rnd(-8, 8), y: p.y - rnd(10, 44),
        vx: rnd(-20, -60), vy: rnd(-8, 8),
        g: 0, life: 0.3, max: 0.3, color: '#bfe6ff', size: 1
      });
    }
  }

  var skillSystem = window.createArcadeSkills({ S: S, ctx: ctx, Art: Art, sfx: sfx, dodge: dodge, focusEnemy: focusEnemy, applyHit: applyHit, sayName: sayName, floatText: function () { return floatText.apply(null, arguments); } });
  var artCdMax = skillSystem.artCdMax, artCd = skillSystem.artCd, artFx = skillSystem.artFx, useArt = skillSystem.useArt, drawArtFx = skillSystem.drawArtFx;

  /* ---------------- 输入 ---------------- */
  /* 指针事件统一在文件末尾注册，避免重复绑定 */

  function typeLetter(ch, forceId) {
    if (S.paused) return;
    if (S.mistakeLock > 0) return;
    if (S.scene !== 'play') return;

    var buf = S.input + ch;
    var cands = [], busyHit = false, i;
    for (i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (!e.alive) continue;
      if (forceId != null && e.id !== forceId) continue;
      /* 这一只刚吃剑、词正在换：这段时间整只先不受理 */
      if (e.busy > 0) { busyHit = true; continue; }
      if (e.word.indexOf(buf) !== 0) continue;
      cands.push(e);
    }
    if (!cands.length) {
      /* 剑气还在飞的这零点几秒里按键一律不算错，免得玩家被自己的连招罚血 */
      if (busyHit) { S.inputShake = 0.1; return; }
      mistake(); return;
    }

    if (S.input === '') S.wordStart = S.t;
    S.input = buf;

    var exact = null;
    for (var j = 0; j < cands.length; j++) {
      if (cands[j].word === buf) { exact = cands[j]; break; }
    }
    if (exact) { fire(exact); return; }

    cands.sort(function (a, b) { return Math.abs(a.x - 108) - Math.abs(b.x - 108); });
    S.lockId = cands[0].id;
    S.focusId = cands[0].id;
  }

  /* fromHint：这个字是用灵石买来的，伤害打折、不涨连击与气劲，也不算「自己拼对」 */
  function fire(e, fromHint) {
    var p = S.player;
    var dt = S.t - S.wordStart;
    var mult = fromHint ? 0.7 : (dt <= 1.2 ? 2 : dt <= 2.2 ? 1.5 : dt <= 3.5 ? 1 : 0.75);

    if (!fromHint) {
      p.combo += 1;
      p.comboT = 4;
      p.comboPop = 0.25;
      p.qi = Math.min(100, p.qi + Math.round((mult >= 2 ? 12 : 8) * p.qiMul));
      if (p.combo > S.stats.maxCombo) S.stats.maxCombo = p.combo;
    }
    S.stats.correct++;
    /* 自己拼对的才算学会；提示过的只记一笔「看过答案」 */
    if (e) markWord(e.word, fromHint ? 'h' : 'c');

    var comboMult = 1 + Math.min(33, p.combo - 1) * 0.06;
    var crit = Math.random() < p.crit;
    var dmg;
    if (fromHint) {
      /* 提示这一刀：小怪直接清掉，妖王只削三成血 —— 否则 20 灵石就能秒王 */
      dmg = e && e.elite ? Math.max(1, Math.round(e.maxHp * 0.34)) : (e ? e.maxHp : 0);
    } else {
      dmg = Math.round(p.atk * mult * comboMult * (crit ? p.critMul : 1));
    }

    p.anim = 'attack'; p.animT = 0;
    /* 跳到怪跟前：位移按开火瞬间的距离算。敌人在飞的过程中还会往前走一点，
       所以留 38px 站位余量，落点正好在它左前方、剑尖够得着的位置。
       竖直方向要抬到妖所在的高度（妖是浮空的，不抬刀就劈在它脚下）。 */
    p.leapD = Math.max(0, Math.min(360, e.x - p.x - 38));
    p.leapH = Math.max(0, Math.min(96, p.y - e.y - 18));
    /* 刀光 / 剑气都挂在「弧线最高点」那个位置上，也就是人真正冲到最前的一瞬 */
    var sp = leapAt(p.leapD, p.leapH, ATK_HIT);
    var strikeX = p.x + sp.dx + 26;
    var strikeY = p.y - sp.dy - 34;
    /* 三段剑势轮换：横扫 / 撩剑 / 劈斩 */
    p.swing = ((p.swing || 0) + 1) % 3;
    var SV = [
      { a0: -2.00, a1: 0.55 },
      { a0: 0.85, a1: -1.75 },
      { a0: -2.30, a1: 1.30 }
    ][p.swing];
    /* 刀光等主角跳到跟前才亮，不是在家门口挥空 */
    S.slashes.push({
      x: strikeX, y: strikeY, r: 22,
      a0: SV.a0, a1: SV.a1, t: 0, dur: 0.24, delay: ATK_HIT
    });
    var pAng = Math.atan2(e.y - 6 - strikeY, e.x - strikeX);
    /* 剑气：从落点再补最后一段，伤害落点与刀锋对上 */
    S.projs.push({
      x: strikeX, y: strikeY,
      tx: e.x, ty: e.y - 6,
      t: 0, delay: ATK_HIT + 0.02, dur: 0.10, ang: pAng,
      target: e, dmg: dmg, crit: crit, mult: mult
    });

    if (mult >= 2) {
      floatText(e.x, e.y - 30, 'PERFECT', '#ffe08a', 1);
    }
    if (crit) {
      floatText(e.x, e.y - 40, '会心', '#ff9a7a', 1);
    }
    /* 剑意 2 级：剑气横扫，顺带削到另一个敌人 */
    if (p.cleave > 0) {
      var other = null, best = 1e9;
      for (var oi = 0; oi < S.enemies.length; oi++) {
        var oe = S.enemies[oi];
        if (!oe.alive || oe === e) continue;
        var dd = Math.abs(oe.x - e.x);
        if (dd < best) { best = dd; other = oe; }
      }
      if (other) {
        var cDmg = Math.round(dmg * p.cleave);
        S.projs.push({
          x: strikeX, y: strikeY,
          tx: other.x, ty: other.y - 6,
          t: 0, delay: 0.30, dur: 0.2, ang: 0,
          target: other, dmg: cDmg, crit: false, mult: mult
        });
        floatText(other.x, other.y - 30, '剑气', '#9fe8ff', 1);
      }
    }
    S.input = '';
    S.lockId = null;
    /* 剑气还要飞一段才落：这段时间先锁住这只怪，避免同一个词被连拼两遍 */
    if (e) e.busy = Math.max(e.busy || 0, ATK_SWING);
    sfx.slash(mult);
  }

  function mistake() {
    var p = S.player;
    S.stats.wrong++;
    p.combo = 0;
    p.qi = Math.max(0, p.qi - 15);
    p.hp -= 4;
    p.flash = 0.25;
    S.mistakeLock = 0.28;
    S.inputShake = 0.32;
    S.shake = Math.max(S.shake, 4);
    S.flash = Math.max(S.flash, 0.18);
    floatText(p.x, p.y - 62, 'MISS', '#ff7a6a', 2);
    sfx.miss();
    /* 拼错的这个词记一笔；正在拼的那只怪也跟着上火。
       用 inputOwner 而不是 focusEnemy —— 后者会回落到「最近的怪」，
       拼 A 的时候按错键可能记到 B 头上。 */
    var tgt = inputOwner();
    if (tgt) {
      markWord(tgt.word, 'w');
      addRage(tgt);
    }
    if (p.hp <= 0) die();
  }

  /* ---------------- 点读模式：底部字母台 ---------------- */
  function setKid(v) {
    S.kid = !!v;
    S.input = ''; S.lockId = null; S.focusId = null; S.hoverTile = -1;
    try { window.localStorage.setItem('dfyl_kid', S.kid ? '1' : '0'); } catch (e) { }
    S.toast = { text: S.kid ? '点读模式：开 · 点字母出招' : '点读模式：关 · 用键盘拼写', t: 1.5, max: 1.5 };
  }

  /* 输入框里这串字母到底属于哪只怪 —— 只认前缀真能对上的。
     三只怪同屏时，「正在拼的那只被剑气劈死」会让 lockId 失效，
     focusEnemy() 于是回落到最近的怪；如果照样拿它算时限、记错词，
     就会把超时算到一只玩家根本没在拼的怪头上。 */
  function inputOwner() {
    if (!S.input) return null;
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.alive && e.word.indexOf(S.input) === 0) return e;
    }
    return null;
  }

  /* 当前字母台对应的目标：正在拼的 > 手动选的 > 最近的 */
  function focusEnemy() {
    var i, e;
    if (S.lockId != null) {
      for (i = 0; i < S.enemies.length; i++) {
        e = S.enemies[i];
        if (e.id === S.lockId && e.alive) return e;
      }
    }
    if (S.focusId != null) {
      for (i = 0; i < S.enemies.length; i++) {
        e = S.enemies[i];
        if (e.id === S.focusId && e.alive) return e;
      }
      S.focusId = null;
    }
    var best = null, bd = 1e9;
    for (i = 0; i < S.enemies.length; i++) {
      e = S.enemies[i];
      if (!e.alive) continue;
      var d = Math.abs(e.x - 120);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function setFocus(e) {
    if (!e || !e.alive) return;
    if (S.focusId !== e.id) { S.input = ''; S.lockId = null; }
    S.focusId = e.id;
  }

  function typedLenFor(e) {
    return (e && S.lockId === e.id) ? S.input.length : 0;
  }

  /* 当前输入是不是「拼错了」（点读模式允许错字落格，这里只做判定） */
  function inputBad() {
    if (!S.input) return false;
    var e = focusEnemy();
    if (!e) return false;
    return e.word.indexOf(S.input) !== 0;
  }

  /* ---------------- 点读模式：字母盘 ---------------- */
  /* 字母盘改成横贯底部的一整条，落在气血条正上方，方块因此能做大一圈 */
  var PAL_X = 66, PAL_R = 426, PAL_Y = 210, PAL_H = 28;
  /* 右上角的大小写开关 */
  var CASE_BTN = { x: 452, y: 76, w: 22, h: 22 };
  /* 局内商店按钮：只有内嵌模式（接进 Elaine学英语）才出现 */
  var SHOP_BTN = { x: 452, y: 100, w: 22, h: 22 };

  /* 盘面字母一多，就会挤成一排小方块：11 个起分两行，21 个起分三行，
     每行字母数尽量平均（11 → 6 + 5，21 → 7 + 7 + 7）。
     多出来的行只往上长，底边不动 —— 底下的「切换 / 跳过 / 退格」就永远贴在同一行。 */
  function paletteRows(n) {
    if (n > 20) return 3;
    if (n > 10) return 2;
    return 1;
  }

  function paletteBox() {
    var rows = paletteRows(paletteLetters().length);
    var h = PAL_H + (rows - 1) * 30;
    return { x: PAL_X, y: PAL_Y + PAL_H - h, w: PAL_R - PAL_X, h: h, rows: rows };
  }

  function paletteTiles(letters, box) {
    var n = letters.length;
    if (!n) return [];
    var rows = paletteRows(n);
    /* 平均分行：先按 ceil 分配，余数自然落在前面几行 */
    var per = Math.ceil(n / rows);
    var counts = [], left = n, r;
    for (r = 0; r < rows; r++) {
      var c = Math.min(per, left);
      counts.push(c);
      left -= c;
    }

    /* 同一盘里方块一样大：宽度按最满的那一行算 */
    var pad = 4;
    var avail = box.w - pad * 2;
    var gap = per > 9 ? 2 : 3;
    var tw = Math.floor((avail - (per - 1) * gap) / per);
    if (tw > 36) tw = 36;
    if (tw < 12) { gap = 1; tw = Math.floor((avail - (per - 1)) / per); }
    if (tw < 7) tw = 7;

    var th = Math.floor((box.h - 6 - (rows - 1) * 2) / rows);
    if (th > 26) th = 26;

    var vtot = rows * th + (rows - 1) * 2;
    var y = box.y + Math.round((box.h - vtot) / 2);

    var out = [], idx = 0, i, j;
    for (i = 0; i < rows; i++) {
      var cnt = counts[i];
      var tot = cnt * tw + (cnt - 1) * gap;
      var x0 = Math.round(box.x + (box.w - tot) / 2);
      for (j = 0; j < cnt; j++) {
        out.push({ x: x0 + j * (tw + gap), y: y, w: tw, h: th, ch: letters[idx++], row: i });
      }
      y += th + 2;
    }
    return out;
  }

  /* 盘面字母：把场上所有单词用到的字母去重，按 A→Z 排序。
     小朋友看到的是一堆可点的字母，而不是排好序的答案；同一个字母可以反复点。 */
  function paletteLetters() {
    var words = [], i, j, out = [], seen = {};
    for (i = 0; i < S.enemies.length; i++) {
      if (S.enemies[i].alive) words.push(S.enemies[i].word);
    }
    for (i = 0; i < words.length; i++) {
      var w = String(words[i]).toUpperCase();
      for (j = 0; j < w.length; j++) {
        var c = w.charAt(j);
        if (!seen[c]) { seen[c] = 1; out.push(c); }
      }
    }
    out.sort();
    if (!S.upper) {
      for (i = 0; i < out.length; i++) out[i] = out[i].toLowerCase();
    }
    return out;
  }

  function drawPalette(letters, box) {
    var tiles = paletteTiles(letters, box);
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var hov = S.hoverTile === i;
      var hitT = (S.lastTap && S.lastTap.ch === t.ch) ? S.lastTap.t : 0;
      var badT = (S.badLetter && S.badLetter.ch === t.ch) ? S.badLetter.t : 0;

      var bg = 'rgba(8,20,16,0.92)';
      var bc = hov ? '#9fd0b4' : '#3f6f5e';
      var tc = '#cfe4d8';
      if (badT > 0) { bg = 'rgba(58,18,16,0.95)'; bc = '#e8705a'; tc = '#ff9a8a'; }
      else if (hitT > 0) { bg = 'rgba(52,42,16,0.95)'; bc = '#ffe08a'; tc = '#fff3cf'; }

      ctx.fillStyle = bg;
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.fillStyle = bc;
      ctx.fillRect(t.x, t.y, t.w, 1); ctx.fillRect(t.x, t.y + t.h - 1, t.w, 1);
      ctx.fillRect(t.x, t.y, 1, t.h); ctx.fillRect(t.x + t.w - 1, t.y, 1, t.h);
      /* 底部一道浅色，让方块有“键帽”的厚度 */
      if (hov) {
        ctx.fillStyle = 'rgba(159,208,180,0.10)';
        ctx.fillRect(t.x + 1, t.y + 1, t.w - 2, t.h - 2);
      }

      var sc = (t.w >= 17 && t.h >= 17) ? 2 : 1;
      var lw = PF.width(t.ch, sc);
      var lh = 7 * sc;
      PF.draw(ctx, t.ch,
        Math.round(t.x + (t.w - lw) / 2),
        Math.round(t.y + (t.h - lh) / 2),
        sc, tc, '#07120e');
    }
  }

  /* 点一个字母：先进输入框，对错用颜色区分（错的不扣血，退格可改） */
  function kidLetter(ch) {
    ch = String(ch).toLowerCase();
    if (S.paused) return;
    if (S.scene !== 'play' || S.mistakeLock > 0) return;
    var e = focusEnemy();
    if (!e) return;

    /* 已经拼满且没对上：这一下当作「重新开始」 */
    if (S.input.length >= e.word.length) S.input = '';

    var buf = S.input + ch;
    var target = null, i;
    if (e.word.indexOf(buf) === 0) {
      target = e;
    } else {
      /* 这个字母可能属于另一只怪：自动把目标切过去 */
      for (i = 0; i < S.enemies.length; i++) {
        var o = S.enemies[i];
        if (o.alive && o.id !== e.id && o.word.indexOf(buf) === 0) { target = o; break; }
      }
    }

    if (S.input === '') S.wordStart = S.t;
    S.input = buf;

    if (target) {
      S.lockId = target.id;
      S.focusId = target.id;
      S.kidBad = 0;
      if (buf === target.word) { fire(target); return; }
      sfx.tap(buf.length - 1);
      return;
    }

    /* 拼错：字母照样落格并标红，等小朋友自己退格改 */
    S.lockId = e.id;
    S.focusId = e.id;
    S.kidBad = 1.6;
    S.inputShake = 0.22;
    S.badLetter = { ch: ch.toUpperCase(), t: 0.45 };
    sfx.tapBad();
    /* 点读模式不扣血，但怪一样会生气（红怪照样更痛） */
    addRage(e);
    if (buf.length >= e.word.length) {
      S.shake = Math.max(S.shake, 2);
      floatText(e.x, e.y - 46, '拼错啦', '#ff9a8a', 1);
    }
  }

  /* 退格：撤销上一个字母 */
  function kidBack() {
    if (S.paused) return;
    if (S.scene !== 'play' || S.mistakeLock > 0) return;
    if (!S.input.length) { S.inputShake = 0.16; sfx.tapBad(); return; }
    S.input = S.input.slice(0, -1);
    S.kidBad = 0;
    if (!S.input) { S.lockId = null; S.wordStart = S.t; }
    sfx.back();
  }

  /* 切换：在所有活着的怪之间按位置轮换 */
  function kidNext() {
    if (S.scene !== 'play') return;
    var alive = [], i;
    for (i = 0; i < S.enemies.length; i++) {
      if (S.enemies[i].alive) alive.push(S.enemies[i]);
    }
    if (alive.length < 2) { S.inputShake = 0.16; sfx.tapBad(); return; }
    alive.sort(function (a, b) { return a.x - b.x; });
    var cur = focusEnemy(), idx = -1;
    for (i = 0; i < alive.length; i++) {
      if (cur && alive[i].id === cur.id) { idx = i; break; }
    }
    var next = alive[(idx + 1) % alive.length];
    S.input = '';
    S.lockId = null;
    S.focusId = next.id;
    S.kidBad = 0;
    S.wordStart = S.t;
    sfx.tab();
  }

  /* 跳过：花 5 点气血把这一个词换掉（这词实在不会拼时的后门） */
  function kidSkip() {
    if (S.paused) return;
    if (S.scene !== 'play' || S.mistakeLock > 0) return;
    var p = S.player, e = focusEnemy();
    if (!e) { S.inputShake = 0.16; sfx.tapBad(); return; }
    if (p.hp <= 5) {
      sfx.deny();
      S.toast = { text: '气血不足 · 跳过要 5 点气血', t: 1.5, max: 1.5 };
      S.inputShake = 0.16;
      return;
    }
    var skippedWord = e.word;
    if (!rerollWord(e)) { sfx.tapBad(); return; }
    /* 跳过的那个词没拼过，记一笔逃课（换上的新词已经写进 e.word 了） */
    markWord(skippedWord, 's');
    p.hp -= 5;
    p.flash = 0.18;
    S.input = '';
    S.lockId = null;
    S.kidBad = 0;
    S.wordStart = S.t;
    floatText(e.x, e.y - 30, '跳过 -5', '#ff9a8a', 1);
    floatText(p.x, p.y - 62, '-5', '#ff8a7a', 1);
    sfx.back();
  }

  /* ---------------- 键入时限 ----------------
     从敲下第一个字母开始算，不敲就不计时 —— 读题、想中文的那段时间不罚。
     限时约束的是手速：超时按拼错处理，断连击、掉血、这个词换一个新的。 */
  /* 小朋友手慢，整体比最初放宽一倍（原 16 + 1.2/字母）：
     4 个字母 36.8 秒、7 个 48.8 秒、10 个 56 秒，配合提示的 ×2 更宽。 */
  var TIME_BASE = 32;        /* 基础秒数 */
  var TIME_PER_CHAR = 2.4;   /* 每个字母再加的秒数，长词宽松些 */

  function wordLimit(word) {
    var n = String(word || '').length || 5;
    return (TIME_BASE + n * TIME_PER_CHAR) * (S.timeBuff || 1);
  }

  /* 还剩多少（0~1）。没在拼、或者输入已经不属于任何一只怪，都当作满格 */
  function wordLeftRatio() {
    if (!S.input) return 1;
    var e = inputOwner();
    if (!e) return 1;
    var lim = wordLimit(e.word);
    if (lim <= 0) return 0;
    return clamp(1 - (S.t - S.wordStart) / lim, 0, 1);
  }

  function wordTimeout() {
    var p = S.player, e = inputOwner();
    if (!p) return;
    var slowWord = e ? e.word : null;
    p.combo = 0;
    p.qi = Math.max(0, p.qi - 10);
    p.hp -= 4;
    p.flash = 0.25;
    S.mistakeLock = 0.3;
    S.inputShake = 0.3;
    S.shake = Math.max(S.shake, 4);
    S.stats.wrong++;
    S.input = '';
    S.lockId = null;
    floatText(p.x, p.y - 62, '超时', '#ffb45a', 2);
    S.toast = { text: '手慢了 · 换个词再来', t: 1.8, max: 1.8 };
    sfx.miss();
    /* 只有「输入真属于某只怪」才记它不熟、才换它的词；
       输入已经找不到归属时只罚手速，不牵连别的词。 */
    if (slowWord) markWord(slowWord, 'w');
    if (e) rerollWord(e);
    S.wordStart = S.t;
    if (p.hp <= 0) die();
  }

  /* ---------------- 提示：20 灵石买一个答案 ----------------
     扣灵石 → 整个词填进输入框 → 整局停住 → 玩家确认后才真的出招。
     确认后的那一刀伤害固定打折、不涨连击，也不算「自己拼对」。 */
  var HINT_COST = 20;
  var HINT_CD = 6;          /* 两次提示之间至少隔 6 秒（暂停期间不计） */
  var HINT_BTN = { x: 452, y: 124, w: 22, h: 26 };

  /* 面板尺寸随布局走：竖屏画布被压到 390 宽，字和按钮都得放大才看得清、点得着 */
  function hintLayout() {
    var port = arcPort();
    var w = port ? 408 : 236, h = port ? 202 : 148;
    var x = (W - w) / 2, y = port ? 34 : 60;
    var bw = port ? 168 : 96, bh = port ? 40 : 26, gap = port ? 20 : 16;
    var by = y + h - bh - (port ? 14 : 8);
    var left = (W - (bw * 2 + gap)) / 2;
    return {
      port: port, x: x, y: y, w: w, h: h,
      ok: { x: left, y: by, w: bw, h: bh },
      no: { x: left + bw + gap, y: by, w: bw, h: bh }
    };
  }

  function hintReady() {
    var p = S.player;
    if (!arcOn() || S.scene !== 'play' || S.paused) return false;
    if (!p || p.stones < HINT_COST || S.hintCd > 0) return false;
    return !!focusEnemy();
  }

  function askHint() {
    if (!arcOn() || S.scene !== 'play' || S.paused) return;
    var p = S.player, e = focusEnemy();
    if (!p || !e) { sfx.deny(); return; }
    if (S.hintCd > 0) {
      sfx.deny();
      S.toast = { text: '提示还在冷却 · 再打两个词', t: 1.4, max: 1.4 };
      return;
    }
    if (p.stones < HINT_COST) {
      sfx.deny();
      S.toast = { text: '灵石不够 · 提示要 ' + HINT_COST, t: 1.8, max: 1.8 };
      return;
    }
    p.stones -= HINT_COST;
    S.hintCd = HINT_CD;
    S.hintCount++;
    /* 用一次就整局翻倍；再点不会叠成四倍、八倍 */
    S.timeBuff = Math.max(2, S.timeBuff || 1);
    S.pendHint = { eid: e.id, word: e.word, prev: S.input, prevLock: S.lockId };
    S.input = e.word;
    S.lockId = e.id;
    S.focusId = e.id;
    S.kidBad = 0;
    S.paused = true;
    sfx.tab();
    /* 拼读给玩家听：字母逐个念，再念整词。宿主没接 TTS 就算了，
       朗读失败绝不能影响这一局。 */
    if (ARCADE.onSpell) { try { ARCADE.onSpell(e.word); } catch (e2) { } }
  }

  function confirmHint() {
    if (!S.paused || !S.pendHint) return;
    var ph = S.pendHint, e = null, i;
    for (i = 0; i < S.enemies.length; i++) {
      if (S.enemies[i].id === ph.eid && S.enemies[i].alive) { e = S.enemies[i]; break; }
    }
    S.paused = false;
    S.pendHint = null;
    /* 伤害按「提示那一刀」的固定倍率算，不占手速的便宜 */
    S.wordStart = S.t - 0.8;
    if (e && e.word === ph.word) {
      S.input = e.word;
      fire(e, true);
    } else {
      S.input = '';
      S.lockId = null;
    }
  }

  function cancelHint() {
    if (!S.paused || !S.pendHint) return;
    var ph = S.pendHint;
    S.paused = false;
    S.pendHint = null;
    S.input = ph.prev || '';
    S.lockId = ph.prevLock != null ? ph.prevLock : null;
    S.toast = { text: '自己拼 · 时限已翻倍', t: 1.6, max: 1.6 };
    sfx.back();
  }

  /* 手上带一点容差：竖屏按钮换算到页面后只有三十几像素高，边缘抠太死很难点 */
  function hintPanelHit(px2, py2, b) {
    return px2 >= b.x - 2 && px2 <= b.x + b.w + 2 && py2 >= b.y - 2 && py2 <= b.y + b.h + 2;
  }

  function tapLetter(i) {
    var letters = paletteLetters();
    var ch = letters[i];
    if (!ch) return;
    S.lastTap = { ch: ch, t: 0.15 };
    kidLetter(ch);
  }

  function paletteHit(px2, py2) {
    var tiles = paletteTiles(paletteLetters(), paletteBox());
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (px2 >= t.x - 1 && px2 <= t.x + t.w && py2 >= t.y - 3 && py2 <= t.y + t.h + 1) return i;
    }
    return -1;
  }

  /* 同时在场 4 只以上时把词卡收窄一点，四张卡才排得开、不互相压住 */
  function cardWidth() {
    /* 同屏最多 3 只小怪 + 1 个 BOSS，站位间距 94，88 宽正好不打架 */
    return 88;
  }

  function cardRect(e) {
    var w = cardWidth(), h = 52;
    /* 右边留 32px：右上角是音效/切换/钱袋/灯泡那一列按钮，卡片别钻到它们下面 */
    return {
      x: clamp(Math.round(e.x - w / 2), 4, W - w - 32),
      y: Math.round(e.y - 82 - (e.elite ? 38 : 0)),
      w: w, h: h
    };
  }

  /* ---------------- 释义排版 ----------------
     卡面只有 88 宽，15px 一行只装得下 5 个汉字，长释义以前会被「…」吃掉后面一半。
     现在：先缩字号保一行 → 缩到 11px 还不行就折两行（优先在分号逗号处断）→ 最后才截断。 */
  var MEAN_FONT = '"Microsoft YaHei","PingFang SC",sans-serif';
  var MEAN_ONE = [15, 14, 13, 12, 11];
  var MEAN_TWO = [12, 11, 10];
  var MEAN_SEP = '；;，,、（）() ';
  /* 行尾可以丢掉的连接符；括号不行，丢了括号就断了 */
  var MEAN_DROP = '；;，,、';

  function meanCut(txt) {
    var n = txt.length, i, best = Math.ceil(n / 2), bestD = 1e9;
    for (i = 1; i < n; i++) {
      if (MEAN_SEP.indexOf(txt.charAt(i - 1)) < 0) continue;
      var d = Math.abs(i - n / 2);
      if (d < bestD) { bestD = d; best = i; }
    }
    best = Math.max(1, Math.min(n - 1, best));
    /* 断点落在一对括号中间时，把断点挪到括号外面，别出现「意思是（」这种 */
    var depth = 0;
    for (i = 0; i < best; i++) {
      var c = txt.charAt(i);
      if (c === '（' || c === '(') depth++;
      else if (c === '）' || c === ')') depth--;
    }
    if (depth > 0) {
      var open = Math.max(txt.lastIndexOf('（', best - 1), txt.lastIndexOf('(', best - 1));
      if (open > 0) best = open;
      else {
        var close = txt.indexOf('）', best);
        if (close < 0) close = txt.indexOf(')', best);
        if (close > 0 && close < n - 1) best = close + 1;
      }
    }
    return Math.max(1, Math.min(n - 1, best));
  }

  function meanFit(txt, maxW) {
    var i, s, a, b, cut;
    txt = String(txt || '');
    if (!txt) return { lines: [''], size: 15 };
    for (i = 0; i < MEAN_ONE.length; i++) {
      s = MEAN_ONE[i];
      ctx.font = 'bold ' + s + 'px ' + MEAN_FONT;
      if (ctx.measureText(txt).width <= maxW) return { lines: [txt], size: s };
    }
    cut = meanCut(txt);
    a = txt.slice(0, cut);
    b = txt.slice(cut);
    /* 断在分号逗号上就把那个分隔符丢掉，行尾挂着「；」不好看 */
    if (a.length > 1 && MEAN_DROP.indexOf(a.charAt(a.length - 1)) >= 0) {
      a = a.slice(0, -1);
    }
    for (i = 0; i < MEAN_TWO.length; i++) {
      s = MEAN_TWO[i];
      ctx.font = 'bold ' + s + 'px ' + MEAN_FONT;
      if (ctx.measureText(a).width <= maxW && ctx.measureText(b).width <= maxW) {
        return { lines: [a, b], size: s };
      }
    }
    /* 极小概率：某一行仍超宽，逐字截到放得下 */
    s = MEAN_TWO[MEAN_TWO.length - 1];
    ctx.font = 'bold ' + s + 'px ' + MEAN_FONT;
    if (ctx.measureText(a).width > maxW) {
      while (a.length > 1 && ctx.measureText(a + '…').width > maxW) a = a.slice(0, -1);
      a += '…';
    }
    while (b.length > 1 && ctx.measureText(b + '…').width > maxW) b = b.slice(0, -1);
    if (ctx.measureText(b).width > maxW) b = b.slice(0, -1) + '…';
    return { lines: [a, b], size: s };
  }

  function cardHit(px2, py2) {
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (!e.alive) continue;
      var r = cardRect(e);
      if (px2 >= r.x - 2 && px2 <= r.x + r.w + 2 && py2 >= r.y - 2 && py2 <= r.y + r.h + 2) return e;
    }
    return null;
  }

  /* src: 'word' 自己拼对打中 / 'art' 技能 / 'ult' 大招
     只有 'word' 才算学会，也只有它会消掉怪的怒气 */
  function applyHit(e, dmg, crit, src) {
    if (!e || !e.alive) return;
    src = src || 'word';
    e.hp -= dmg;
    e.flash = 0.13;
    /* 受击后坐：先被推开，再弹回原位 */
    e.kx = (crit ? 12 : 7);
    e.ky = -2;
    e.hitT = 0.26;
    e.anim = 'hit';
    e.animT = 0;
    S.hitstop = Math.max(S.hitstop, crit ? 0.075 : 0.05);
    S.shake = Math.max(S.shake, crit ? 6 : 3);
    S.punch = Math.max(S.punch, crit ? 0.05 : 0.028);
    S.flash = Math.max(S.flash, crit ? 0.16 : 0.07);
    floatText(e.x + rnd(-9, 9), e.y - 13, String(dmg), crit ? '#ffd76a' : '#ffffff', crit ? 3 : 2);
    spawnHit(e.x, e.y, crit);
    if (crit) sfx.crit(); else sfx.hit();
    /* 出手台词：只在暴击 / 连击 / 击杀这三种情况下念，而且只有三成机会。
       普通的一刀出声会盖住单词发音，越打越听不清 —— 所以干脆不吭声。 */
    if (src === 'word') {
      var cb = S.player ? S.player.combo : 0;
      if ((crit || e.hp <= 0 || cb >= 2) && Math.random() < 0.3) say('hit');
    }
    if (e.hp <= 0) { killEnemy(e, src); return; }
    /* 拼对了就消气：红怪退回常态 */
    if (src === 'word' && e.rage > 0) setRage(e, 0);
    /* 没打死：换一个新词，下一刀要重新拼。
       无尽模式下所有怪都换 —— 以前前 5 档小怪 segs=1 不换词，一只怪要
       把同一个词拼 2-4 遍，玩家会以为「拼对了还被要求重拼」。
       关卡模式保持原样：低关一词一刀，血条分段了才换。 */
    if (arcOn() || e.segs > 1 || e.elite) {
      if (rerollWord(e)) {
        if (S.lockId === e.id) { S.lockId = null; S.input = ''; }
        floatText(e.x, e.y - 30, '再拼一词', '#9fd0b4', 1);
      }
      /* 剑气飞行的这 0.3 秒内先不收这只怪，防止同一单词被连拼两次 */
      e.busy = 0.34;
    }
  }

  function killEnemy(e, src) {
    if (!e.alive) return;
    e.alive = false;
    e.hp = 0;
    e.flash = 0;         /* 立刻取消白闪剪影，避免顿帧期间糊成一团 */
    e.dying = arcOn() ? 0.46 : 0.11;
    e.deathMax = e.dying;
    e.anim = 'defeat';
    e.animT = 0;
    e.kx = 5;
    S.player.stones += e.elite ? 60 : 8;
    /* 打死 BOSS 回一口血：一局半小时，中途没有恢复点会越打越缩。
       BOSS 是天然的分段点，让它成为「打得稳」的奖励。 */
    if (arcOn() && e.elite) {
      var rate = (ARCADE.hpRate != null) ? ARCADE.hpRate : 0.25;
      var heal = Math.round(S.player.maxHp * rate);
      if (heal > 0) {
        S.player.hp = Math.min(S.player.maxHp, S.player.hp + heal);
        floatText(S.player.x, S.player.y - 46, '+' + heal, '#8ef0a8', 3);
        burst(S.player.x, S.player.y - 18, '#8ef0a8', 12);
        tone(720, 1080, 0.22, 'sine', 0.05);
      }
    }
    /* 技能/大招打死的词没拼过：记一笔逃课，之后会回流重考 */
    if (src && src !== 'word') markWord(e.word, 'k');
    sfx.kill();
    if (S.lockId === e.id) { S.lockId = null; S.input = ''; }
    if (S.focusId === e.id) S.focusId = null;
  }

  function checkWave() {
    if (S.scene !== 'play') return;
    if (S.waveState !== 'fight') return;
    if (S.spawnQ.length) return;
    if (S.enemies.some(function (e) { return e.alive; })) return;
    S.waveState = 'clear';
    /* 波次多了，赶路时间不能太长：普通波 1.2 秒，最后一波留够 2.2 秒再进结算 */
    S.waveT = (S.wave >= S.waves.length - 1) ? 2.2 : 1.2;
    banner('WAVE CLEAR', '');
    S.player.qi = Math.min(100, S.player.qi + 5);
  }

  /* 打死妖王：先走一屏结算，再进营地 */
  function win() {
    S.stats.time = S.t - S.stats.start;
    S.flash = 0.5;
    var acc = S.stats.correct + S.stats.wrong;
    var rate = acc ? Math.round(S.stats.correct / acc * 100) : 0;
    S.scene = 'victory';
    S.waveState = 'done';
    S.victory = {
      level: S.level, name: levelName(S.level), boss: bossName(S.level),
      rate: rate, time: S.stats.time, combo: S.stats.maxCombo,
      correct: S.stats.correct, wrong: S.stats.wrong,
      review: reviewCount(),
      stones: S.player.stones,
      hp: Math.max(0, Math.ceil(S.player.hp)), maxHp: S.player.maxHp,
      arc: arcOn(), tier: ARCADE.tier,
      t: 0
    };
    S.player.anim = 'idle'; S.player.animT = 0;
    sfx.win();
    if (arcOn() && ARCADE.onTier) {
      ARCADE.onTier(ARCADE.tier, {
        rate: rate, hp: Math.max(0, S.player.hp), maxHp: S.player.maxHp,
        stones: S.player.stones, correct: S.stats.correct, wrong: S.stats.wrong
      });
    }
  }

  /* 档结算屏点"继续"：进下一档 */
  function arcadeNextFromVictory() {
    var n = ARCADE.pending;
    ARCADE.pending = null;
    if (n && n.words && n.words.length) {
      arcadeGoTier(n.tier, n.words);
      return;
    }
    /* 宿主还没备好词：问一次，它会回头调 ARCADE.goTier */
    if (ARCADE.onNeedTier) ARCADE.onNeedTier(ARCADE.tier + 1);
  }

  /* 结算屏点一下 → 进营地 */
  function enterCamp() {
    var v = S.victory;
    S.scene = 'camp';
    S.camp = {
      tab: 0, sel: 0, page: 0, hover: -1, hoverTab: -1, hoverGo: false,
      hoverPrev: false, hoverNext: false,
      msgT: 3.4,
      msg: v
        ? ('第 ' + v.level + ' 关 通 关 · 正确率 ' + v.rate + '% · 待复习 ' + (v.review || 0) + ' 词 · 灵石 ' + v.stones)
        : '通 关 ！'
    };
    S.victory = null;
    sfx.tab();
  }

  function die() {
    S.scene = 'dead';
    S.player.hp = 0;
    say('dead');
    S.stats.time = S.t - S.stats.start;
    /* 内嵌模式：血空了就是这一局结束，交给宿主结账 */
    if (arcOn() && !S.endSent) {
      S.endSent = true;
      if (ARCADE.onEnd) {
        ARCADE.onEnd({
          died: true, tier: ARCADE.tier, stones: S.player.stones,
          correct: S.stats.correct, wrong: S.stats.wrong,
          maxCombo: S.stats.maxCombo, time: S.stats.time, shops: ARCADE.shops
        });
      }
    }
  }

  /* ---------------- 关卡之间：道具点 / 洞府天地 ---------------- */
  function campRows() {
    var out = [], i;
    if (S.camp.tab === 0) {
      for (i = 0; i < SHOP.weapon.length; i++) out.push({ kind: 'weapon', idx: i, item: SHOP.weapon[i] });
      for (i = 0; i < SHOP.armor.length; i++) out.push({ kind: 'armor', idx: i, item: SHOP.armor[i] });
      for (i = 0; i < SHOP.item.length; i++) out.push({ kind: 'item', idx: i, item: SHOP.item[i] });
      return out;
    }
    /* 功法放前面：进洞府第一眼就能看到三招能练，技能加点排在后面 */
    for (i = 0; i < ART_UPG.length; i++) out.push({ kind: 'art', idx: i, item: ART_UPG[i] });
    for (i = 0; i < SKILLS.length; i++) out.push({ kind: 'skill', idx: i, item: SKILLS[i] });
    return out;
  }

  function campSay(text) { S.camp.msg = text; S.camp.msgT = 1.8; }

  function campLevel(row) {
    if (row.kind === 'skill') return S.meta.skills[row.item.id] || 0;
    if (row.kind === 'art') return (S.meta.arts && S.meta.arts[row.item.id]) || 0;
    return 0;
  }

  function campCost(row) {
    if (row.kind !== 'skill' && row.kind !== 'art') return row.item.cost;
    var lv = campLevel(row);
    return lv >= row.item.max ? 0 : row.item.cost[lv];
  }

  function campOwned(row) {
    if (row.kind === 'skill' || row.kind === 'art') return campLevel(row) >= row.item.max;
    if (row.kind === 'weapon') return S.meta.weapon === row.idx;
    if (row.kind === 'armor') return S.meta.armor === row.idx;
    return false;
  }

  function campBuy(row) {
    if (!row) return;
    var p = S.player, cost = campCost(row);
    if (campOwned(row)) {
      campSay(row.kind === 'weapon' || row.kind === 'armor' ? '已经装备着了' : '这门功夫已经学满了');
      sfx.deny();
      return;
    }
    if (p.stones < cost) { campSay('灵石不够 · 再去打几只'); sfx.deny(); return; }
    p.stones -= cost;
    if (row.kind === 'skill' || row.kind === 'art') {
      var lv = campLevel(row);
      if (row.kind === 'skill') S.meta.skills[row.item.id] = lv + 1;
      else {
        if (!S.meta.arts) S.meta.arts = {};
        S.meta.arts[row.item.id] = lv + 1;
      }
      applyMeta(p);
      campSay((row.kind === 'art' ? '功法精进「' : '修成「') + row.item.name + '」Lv' + (lv + 1));
      /* 升级台词：招式只说这一招；技能一半说等级、一半说它抬的那条属性。
         两条都带着技能名，玩家一定听得出升的是哪一个。 */
      if (row.kind === 'art') {
        say('art', { name: row.item.name, lv: lv + 1 });
      } else if (Math.random() < 0.5) {
        say('skill', { name: row.item.name, lv: lv + 1 });
      } else {
        say('attr', { name: row.item.name, lv: lv + 1, attr: ATTR_OF[row.item.id] || '属性' });
      }
    } else if (row.kind === 'item') {
      var add = 0;
      if (row.item.heal) {
        add = typeof row.item.heal === 'string'
          ? Math.round(p.maxHp * parseFloat(row.item.heal) / 100)
          : row.item.heal;
      }
      if (add) p.hp = Math.min(p.maxHp, p.hp + add);
      if (row.item.qi) p.qi = Math.min(100, p.qi + row.item.qi);
      campSay('服下「' + row.item.name + '」' + (add ? ' · 气血 +' + add : ''));
      /* 丹药：回血说气血、回气说回蓝，名字跟着道具走（小还丹 / 大还丹 / 回气散） */
      say(row.item.qi ? 'qi' : 'heal', { name: row.item.name });
    } else {
      S.meta[row.kind] = row.idx;
      applyMeta(p);
      campSay('换上「' + row.item.name + '」');
      /* 装备台词：剑报攻击、甲报气血，数值就是这次真正加上去的那个 */
      say(row.kind === 'weapon' ? 'weapon' : 'armor', {
        name: row.item.name,
        n: row.kind === 'weapon' ? row.item.atk : row.item.hp
      });
    }
    sfx.buy();
  }

  function campTab(n) {
    S.camp.tab = (n + 2) % 2;
    S.camp.sel = 0;
    S.camp.page = 0;
    S.camp.hover = -1;
    sfx.tab();
  }

  function campNextLevel() {
    if (S.camp && S.camp.fromRun) { backToRun(); return; }
    if (S.level >= MAX_LEVEL) {
      campSay('三十关已尽 · 天门已开，此后再无妖物可挡你');
      return;
    }
    /* 无尽模式下营地只是中转，气劲照旧带过去 */
    var qi = (arcOn() && S.player) ? S.player.qi : 0;
    startLevel(S.level + 1, false, 0, qi);
  }

  /* ---------------- 局内商店（内嵌模式） ----------------
     只切 scene，不动 S.enemies / hp / 冷却 / 当前词：
     回来就是原地继续，不需要序列化任何东西。 */
  function openShopInRun() {
    if (!arcOn() || S.scene !== 'play') return;
    S.camp = {
      tab: 0, sel: 0, page: 0, hover: -1, hoverTab: -1,
      hoverGo: false, hoverPrev: false, hoverNext: false,
      msgT: 3.2, msg: '灵石 ' + S.player.stones + ' · 买完接着打',
      fromRun: true
    };
    S.scene = 'camp';
    ARCADE.shops++;
    sfx.tab();
    if (ARCADE.onShop) ARCADE.onShop(true);
  }

  function backToRun() {
    if (!S.camp || !S.camp.fromRun) return;
    S.scene = 'play';
    S.camp.fromRun = false;
    if (ARCADE.onShop) ARCADE.onShop(false);
    sfx.tab();
  }

  /* ---------------- 新手教程：热区 ----------------
     返回画布逻辑坐标（480×270），外层按 canvas 显示缩放换算成屏幕坐标。
     只描述「哪块是干嘛的」，不接管任何事件。 */
  function hotspots(page) {
    var out = [];
    /* place：说明文字往哪边放（left/above/below），tip 为空就只画框不写字 */
    /* 编号往哪边打：'tl' 左上角（默认）/ 'tc' 上边正中 / 'r' 右边外侧。
       商店页底下那几个框排得太紧，只能按位置挑，不然编号会互相压住 */
    function add(id, r, tip, place, num) {
      if (!r) return;
      out.push({
        id: id, x: r.x, y: r.y, w: r.w, h: r.h,
        tip: tip || '', place: place || 'below', num: num || 'tl'
      });
    }

    if (page === 'camp') {
      add('tab-item', CAMP_TAB[0], '道具点：买剑、买甲、买丹药', 'above', 'tc');
      add('tab-skill', CAMP_TAB[1], '洞府天地：学功法，攻击 / 气劲 / 闪避一起涨', 'above', 'tc');
      if (S.camp) {
        var per = campPerPage(), rows = campRows();
        var first = S.camp.page * per;
        var n = Math.min(per, Math.max(0, rows.length - first));
        if (n > 0) {
          var a2 = campCardRect(first), b2 = campCardRect(first + n - 1);
          add('list', {
            x: a2.x - 4, y: a2.y - 4,
            w: (b2.x + b2.w) - a2.x + 8, h: (b2.y + b2.h) - a2.y + 8
          }, '点卡片就买，买了立刻生效', 'left');
        }
        if (campPageCount() > 1) {
          /* 两个箭头和中间的页码是一行，框一个整体、写一条说明，
             分成两个 28px 的小框在手机上根本看不清 */
          var pv = CAMP_PREV, nx = CAMP_NEXT;
          var p0x = Math.min(pv.x, nx.x), p0y = Math.min(pv.y, nx.y);
          add('pager', {
            x: p0x, y: p0y,
            w: Math.max(pv.x + pv.w, nx.x + nx.w) - p0x,
            h: Math.max(pv.y + pv.h, nx.y + nx.h) - p0y
          }, '左右箭头翻页（共 ' + campPageCount() + ' 页）', 'below', 'r');
        }
        add('go', CAMP_GO, '点这里回战场，血和进度都还在', 'below', 'r');
      }
      return out;
    }

    /* 战斗界面：右侧一列小按钮，说明放左边，免得压住下面那个。
       最上面两个（音效 / 语音）只隔 2px，各写一条说明会撞在一起 ——
       框成一块，用一句话把上下两个都讲清 */
    add('audio', {
      x: BTN.x, y: BTN.y, w: BTN.w,
      h: (BTNV.y + BTNV.h) - BTN.y
    }, '音效开关 · 语音朗读开关', 'left');
    add('case', CASE_BTN, '大小写', 'left');
    if (arcOn()) add('shop', SHOP_BTN, '买药', 'left');
    add('hint', HINT_BTN, '提示 · 20 灵石', 'left');
    /* 底部一条：四个框共用一条说明 */
    if (!arcPort()) {
      add('sw', BTN_SW, '', 'above');
      add('skip', BTN_SK, '', 'above');
      add('palette', paletteBox(), '点字母拼单词 · 左边换目标 / 跳过，右边退格', 'above');
      add('bs', BTN_BS, '', 'above');
    }
    /* 技能栏 + 气劲：框两个，说明共用一条 */
    add('skills', { x: SK_X, y: SK_Y, w: SK_N * (SK_W + SK_GAP) - SK_GAP, h: 21 },
      '闪避 + 三招 · 气劲满 100 才能放', 'above');
    add('qi', { x: 354, y: 241, w: 118, h: 21 }, '', 'above');
    return out;
  }

  /* ---------------- 大招 ---------------- */
  /* 气劲攒满 100 就能当场放，不再需要先默写三个单词 */
  function tryUlt() {
    if (S.scene !== 'play' || S.player.qi < 100) return;
    /* 场上没怪就别白扔 100 气劲（赶路的那两秒容易误按） */
    if (!aliveCount()) return;
    S.scene = 'ult';
    S.ult = { phase: 'fx', fxT: 0, hit: false };
    S.input = ''; S.lockId = null;
    S.player.anim = 'cast'; S.player.animT = 0;
    sfx.ultStart();
    sayName('万剑归宗');
    startUltFx();
  }

  function startUltFx() {
    var u = S.ult;
    if (!u) return;
    u.phase = 'fx';
    u.fxT = 0;
    S.flash = 1;
    S.shake = 9;
    S.timeScale = 1;
    S.spawnQ = [];
    S.player.anim = 'cast'; S.player.animT = 0;
    for (var i = 0; i < 42; i++) {
      S.swords.push({
        x: 12 + Math.random() * (W - 24),
        y: -40 - Math.random() * 220,
        vy: 520 + Math.random() * 320,
        delay: Math.random() * 0.55
      });
    }
    sfx.ultHit();
  }

  function updateUlt(dt) {
    var u = S.ult;
    if (!u) { S.scene = 'play'; return; }
    u.fxT += dt;
    if (u.fxT > 0.34 && !u.hit) {
      u.hit = true;
      var list = S.enemies.filter(function (e) { return e.alive; });
      list.forEach(function (e) {
        floatText(e.x, e.y - 26, '999', '#ffe9a8', 2);
        spawnDeath(e);
        e.alive = false;
        /* 大招清屏等于把这些词全跳过了：记逃课，之后回流重考 */
        markWord(e.word, 'k');
      });
      S.enemies = [];
      S.player.stones += 120;
      S.player.qi = 0;
      S.shake = 10;
    }
    if (u.fxT > 2.0) {
      S.scene = 'play';
      S.ult = null;
      S.timeScale = 1;
      S.player.anim = 'idle'; S.player.animT = 0;
      checkWave();
    }
  }

  /* ---------------- 实体更新 ---------------- */
  function updatePlayer(dt, wdt) {
    var p = S.player;
    p.animT += dt;
    p.inv = Math.max(0, p.inv - dt);
    p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    for (var ai = 0; ai < p.arts.length; ai++) p.arts[ai] = Math.max(0, p.arts[ai] - dt);
    p.flash = Math.max(0, p.flash - dt * 2.5);
    p.comboPop = Math.max(0, p.comboPop - dt);
    p.dash += (0 - p.dash) * Math.min(1, dt * 9);
    if (p.comboT > 0) {
      p.comboT -= dt;
      if (p.comboT <= 0) p.combo = 0;
    }
    if (p.anim === 'attack' && p.animT > ATK_LEN) p.anim = 'idle';
    if (p.anim === 'hit' && p.animT > 0.3) p.anim = 'idle';
    if (p.anim === 'dodge' && p.animT > 0.42) p.anim = 'idle';
    /* 三招的起手式各自播完再回站姿（时长 = 图集里该动作的总长） */
    if (p.anim === 'skill' && p.animT > 1.10) p.anim = 'idle';
    if (p.anim === 'seal' && p.animT > 1.18) p.anim = 'idle';
    if (p.anim === 'talisman' && p.animT > 1.07) p.anim = 'idle';
    S.mistakeLock = Math.max(0, S.mistakeLock - dt);
    S.inputShake = Math.max(0, S.inputShake - dt * 2);

    /* 跑动扬尘：脚下每隔一小会儿踢起一点土，配合迈步节奏 */
    if (S.scene === 'play' || S.scene === 'title') {
      p.dustT = (p.dustT || 0) - dt;
      if (p.dustT <= 0) {
        p.dustT = 0.15 + Math.random() * 0.09;
        S.parts.push({
          x: p.x - 7 + Math.random() * 8, y: p.y - 1 + Math.random() * 2,
          vx: -(18 + Math.random() * 26), vy: -(3 + Math.random() * 10),
          g: 34, life: 0.26 + Math.random() * 0.16, max: 0.42,
          color: Math.random() < 0.55 ? '#c3d2b4' : '#93a992', size: 1
        });
      }
    }
  }

  function updateProjs(dt) {
    for (var i = S.projs.length - 1; i >= 0; i--) {
      var pr = S.projs[i];
      if (pr.delay > 0) { pr.delay -= dt; continue; }
      pr.t += dt / pr.dur;
      if (pr.t >= 1) {
        var tx = pr.target && pr.target.alive ? pr.target.x : pr.tx;
        var ty = pr.target && pr.target.alive ? pr.target.y : pr.ty;
        impactAt(tx, ty, pr.crit, pr.ang);
        applyHit(pr.target, pr.dmg, pr.crit);
        S.projs.splice(i, 1);
      }
    }
  }

  function updateSlashes(dt) {
    for (var i = S.slashes.length - 1; i >= 0; i--) {
      var s = S.slashes[i];
      /* delay：刀光要等主角跳到怪跟前才亮（普通攻击用） */
      if (s.delay > 0) { s.delay -= dt; continue; }
      s.t += dt;
      if (s.t >= s.dur) S.slashes.splice(i, 1);
    }
  }

  function updateSwords(dt) {
    var raining = S.ult && S.ult.phase === 'fx' && S.ult.fxT < 1.55;
    for (var i = S.swords.length - 1; i >= 0; i--) {
      var s = S.swords[i];
      if (s.delay > 0) { s.delay -= dt; continue; }
      s.y += s.vy * dt;
      if (s.y > 236) {
        burst(s.x, 228, '#bfefff', 5);
        if (raining) {
          /* 回收：从高空重新落下，保持剑雨连绵 */
          s.x = 12 + Math.random() * (W - 24);
          s.y = -70 - Math.random() * 150;
          s.vy = 520 + Math.random() * 320;
        } else {
          S.swords.splice(i, 1);
        }
      }
    }
  }

  var effects = window.createArcadeEffects({ S: S, ctx: ctx, Art: Art, rnd: rnd });
  var updateImpacts = effects.updateImpacts;
  var impactAt = effects.impactAt;
  var drawImpacts = effects.drawImpacts;
  var updateParticles = effects.updateParticles;
  var updateTexts = effects.updateTexts;
  var updateBanner = effects.updateBanner;
  var banner = effects.banner;
  var floatText = effects.floatText;
  var burst = effects.burst;
  var spawnHit = effects.spawnHit;
  var spawnDeath = effects.spawnDeath;

  /* ---------------- 主循环 ---------------- */
  /* 迈腿的时机：只有清完一波、走向下一波的时候；打斗时两条腿站定 */
  function walking() {
    return S.scene === 'play' && S.waveState === 'clear';
  }

  function update(dt) {
    if (S.scene === 'prologue' && opening) { opening.update(dt); return; }
    /* 提示确认面板开着：整个世界停住，连 S.t 都不走，
       所以暂停多久都不会消耗答题时限，怪物也不会趁机发弹丸 */
    if (S.paused) return;
    S.t += dt;
    updateAmbient(dt);

    /* 错词本攒够 1.2 秒再写盘，免得每拼对一个词都碰一次 localStorage */
    if (S.wsDirty) {
      S.wsT -= dt;
      if (S.wsT <= 0) { S.wsT = 1.2; saveWordStat(); }
    }

    if (S.scene === 'title') {
      S.camX += dt * 5;
      S.bgT += dt;
      return;
    }

    S.flash = Math.max(0, S.flash - dt * 2.2);
    if (S.scene === 'victory' && S.victory) S.victory.t += dt;
    if (S.hitstop > 0) {
      S.hitstop -= dt;
      return;
    }
    S.shake = Math.max(0, S.shake - dt * 26);
    S.punch -= S.punch * Math.min(1, dt * 13);
    var wdt = dt * S.timeScale;
    /* 打斗时镜头与雾带全部定住，只有赶路才往前推（波次之间是奔跑，速度给足） */
    if (walking()) {
      S.camX += wdt * 54;
      S.bgT += wdt;
    }

    updatePlayer(dt, wdt);

    if (S.scene === 'play') {
      updateWaves(wdt);
      updateEnemies(wdt);
      updateOrbs(wdt);
    } else if (S.scene === 'ult') {
      updateUlt(dt);
    }

    updateProjs(dt);
    updateSlashes(dt);
    updateParticles(dt);
    updateTexts(dt);
    updateBanner(dt);
    updateSwords(dt);
    updateImpacts(dt);
    for (var fi = S.artFx.length - 1; fi >= 0; fi--) {
      S.artFx[fi].t += dt;
      if (S.artFx[fi].t >= S.artFx[fi].dur) S.artFx.splice(fi, 1);
    }
    if (S.toast) {
      S.toast.t -= dt;
      if (S.toast.t <= 0) S.toast = null;
    }
    if (S.lastTap) {
      S.lastTap.t -= dt;
      if (S.lastTap.t <= 0) S.lastTap = null;
    }
    if (S.badLetter) {
      S.badLetter.t -= dt;
      if (S.badLetter.t <= 0) S.badLetter = null;
    }
    if (S.kidBad > 0) S.kidBad = Math.max(0, S.kidBad - dt);
    if (S.keyPing > 0) S.keyPing = Math.max(0, S.keyPing - dt);
    if (S.camp.msgT > 0) S.camp.msgT = Math.max(0, S.camp.msgT - dt);
    if (S.hintCd > 0) S.hintCd = Math.max(0, S.hintCd - dt);

    /* 键入时限：只有真的在拼的时候才走表，而且只对「输入真正对得上的那只」计时。
       目标被打死 / 换了词之后，输入就没有归属了 —— 直接清掉，
       不拿旁边那只怪顶替（否则会把超时算到玩家没在拼的词头上）。 */
    if (S.scene === 'play' && S.input.length && S.mistakeLock <= 0) {
      var te = inputOwner();
      if (!te) {
        S.input = ''; S.lockId = null; S.wordStart = S.t;
      } else if (S.t - S.wordStart > wordLimit(te.word)) {
        wordTimeout();
      }
    }

    if (S.scene === 'play') checkWave();
  }

  /* ---------------- 绘制：世界 ---------------- */

  /* 普通攻击的位移：跃出去、在空中劈一剑、顺势落回原位，全程一条连续弧线。
     时间轴与 Sprite.ATK 一致，改一边必须同步另一边。
     dx 是相对原位的水平偏移；dy 是离地高度 —— 妖是浮在空中的，
     所以除了横移还要抬到它所在的高度，否则刀会劈在它脚底下。 */
  var ATK_TAKEOFF = 0.14, ATK_SWING = 0.42, ATK_HIT = 0.29, ATK_LEN = 0.62;
  if (typeof Sprite !== 'undefined' && Sprite.ATK) {
    ATK_TAKEOFF = Sprite.ATK.OUT; ATK_SWING = Sprite.ATK.SWING;
    ATK_HIT = Sprite.ATK.HIT; ATK_LEN = Sprite.ATK.LEN;
  }

  var ATK_TURN = 0.46;   /* 冲到最前、也就是剑锋触敌的位置（占整段的比例） */

  /* 给定「跳多远 / 抬多高 / 演到第几秒」，返回这一瞬间的位移。
     横向是等速冲出去再等速弹回来（在 ATK_TURN 处瞬间掉头，不留悬停），
     纵向是一条正弦拱，最高点正好落在劈中的那一刻。 */
  function leapAt(d, h, at) {
    var u = at / ATK_LEN;
    if (u < 0) u = 0; if (u > 1) u = 1;
    var k = u < ATK_TURN ? (u / ATK_TURN) : (1 - (u - ATK_TURN) / (1 - ATK_TURN));
    if (k < 0) k = 0;
    return { dx: d * k, dy: (h + 7) * Math.sin(Math.PI * u) };
  }

  var worldRenderer = window.createArcadeWorldRenderer({
    S: S, ctx: ctx, Art: Art, PF: PF, ATK_LEN: ATK_LEN, ATK_TURN: ATK_TURN,
    RAGE_MAX: RAGE_MAX, MEAN_FONT: MEAN_FONT, leapAt: leapAt, clamp: clamp,
    walking: walking, focusEnemy: focusEnemy, cardRect: cardRect, meanFit: meanFit
  });
  var drawPlayerWorld = worldRenderer.drawPlayerWorld, drawEnemies = worldRenderer.drawEnemies;
  var drawProjectiles = worldRenderer.drawProjectiles, drawSlashes = worldRenderer.drawSlashes;
  var drawSwords = worldRenderer.drawSwords, drawParticles = worldRenderer.drawParticles;
  var drawTexts = worldRenderer.drawTexts;

  var hudRenderer = window.createArcadeHudRenderer({
    S: S, W: W, H: H, ctx: ctx, PF: PF, Art: Art, clamp: clamp, arcOn: arcOn,
    arcPort: arcPort, fsMode: fsMode, focusEnemy: focusEnemy, drawPalette: drawPalette,
    hintReady: hintReady, hintPanelHit: hintPanelHit, wordLeftRatio: wordLeftRatio,
    paletteBox: paletteBox, paletteLetters: paletteLetters, inputBad: inputBad,
    cancelHint: cancelHint, levelName: levelName, bossName: bossName, campRows: campRows,
    campLevel: campLevel, campCost: campCost, campOwned: campOwned, sfx: sfx,
    muted: muted, voiceOff: voiceOff, artCd: artCd, artCdMax: artCdMax,
    PAL_Y: PAL_Y, PAL_H: PAL_H, CASE_BTN: CASE_BTN, SHOP_BTN: SHOP_BTN,
    HINT_BTN: HINT_BTN, HINT_COST: HINT_COST
  });
  var drawHUD = hudRenderer.drawHUD, drawUltVeil = hudRenderer.drawUltVeil;
  var drawUltUI = hudRenderer.drawUltUI, drawSpeakerBtn = hudRenderer.drawSpeakerBtn;
  var drawVoiceBtn = hudRenderer.drawVoiceBtn, drawKidBtn = hudRenderer.drawKidBtn;
  var drawCaseBtn = hudRenderer.drawCaseBtn, drawShopBtn = hudRenderer.drawShopBtn;
  var drawHintBtn = hudRenderer.drawHintBtn, drawHintPanel = hudRenderer.drawHintPanel;
  var drawToast = hudRenderer.drawToast, drawOverlays = hudRenderer.drawOverlays;
  var campCardRect = hudRenderer.campCardRect, campPage = hudRenderer.campPage;
  var campRowVisible = hudRenderer.campRowVisible, campPageCount = hudRenderer.campPageCount;
  var skillRect = hudRenderer.skillRect, toggleCase = hudRenderer.toggleCase;
  var hitSkill = hudRenderer.hitSkill, hitCase = hudRenderer.hitCase;
  var hitSw = hudRenderer.hitSw, hitSkip = hudRenderer.hitSkip, hitBs = hudRenderer.hitBs;
  var BTN = hudRenderer.BTN, BTNV = hudRenderer.BTNV, BTN2 = hudRenderer.BTN2;
  var BTN_SW = hudRenderer.BTN_SW, BTN_SK = hudRenderer.BTN_SK, BTN_BS = hudRenderer.BTN_BS;
  var aliveCount = hudRenderer.aliveCount;
  var SK_X = hudRenderer.SK_X, SK_Y = hudRenderer.SK_Y, SK_W = hudRenderer.SK_W;
  var SK_GAP = hudRenderer.SK_GAP, SK_N = hudRenderer.SK_N;
  var CAMP_TAB = hudRenderer.CAMP_TAB, CAMP_GO = hudRenderer.CAMP_GO;
  var CAMP_PREV = hudRenderer.CAMP_PREV, CAMP_NEXT = hudRenderer.CAMP_NEXT;
  var campPerPage = hudRenderer.campPerPage;

  /* ---------------- 渲染 ---------------- */
  function render() {
    if (S.scene === 'prologue' && opening) { opening.render(); return; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sh = S.shake;
    var ox = sh > 0 ? Math.round((Math.random() - 0.5) * sh) : 0;
    var oy = sh > 0 ? Math.round((Math.random() - 0.5) * sh) : 0;
    ctx.save();
    ctx.translate(ox, oy);
    if (S.punch > 0.0005) {
      ctx.translate(W / 2, H / 2);
      ctx.scale(1 + S.punch, 1 + S.punch);
      ctx.translate(-W / 2, -H / 2);
    }

    Art.drawBackground(ctx, S.camX, S.t, S.bgT);
    drawAmbient(false);
    drawUltVeil();

    if (S.player) {
      drawEnemies();
      drawPlayerWorld();
    }

    drawProjectiles();
    drawSlashes();
    drawImpacts();
    drawArtFx();
    drawSwords();
    drawParticles();
    drawAmbient(true);
    drawTexts();

    ctx.restore();

    /* 廉价 bloom：缩小 → 自乘提亮 → 放大叠加 */
    bax.globalCompositeOperation = 'source-over';
    bax.clearRect(0, 0, BW, BH);
    bax.imageSmoothingEnabled = true;
    bax.drawImage(cvs, 0, 0, BW, BH);
    bax.globalCompositeOperation = 'multiply';
    bax.drawImage(bloomA, 0, 0);
    bax.drawImage(bloomA, 0, 0);
    bax.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = arcOn() ? 0.018 : 0.14;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bloomA, 0, 0, W, H);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;

    Art.drawVignette(ctx);

    if (S.flash > 0) {
      ctx.fillStyle = 'rgba(255,250,235,' + Math.min(0.62, S.flash * 0.55) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    if (S.scene === 'play') drawHUD();
    drawUltUI();
    drawToast();
    drawOverlays();
    if (S.scene !== 'camp' && S.scene !== 'victory') { drawSpeakerBtn(); drawVoiceBtn(); drawKidBtn(); }
    drawCaseBtn();
    drawShopBtn();
    drawHintBtn();
    drawHintPanel();     /* 最上层：提示买完之后的确认面板 */

    if (ERR) {
      ctx.fillStyle = 'rgba(120,20,20,0.9)';
      ctx.fillRect(0, H - 26, W, 26);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(String(ERR).slice(0, 90), 6, H - 9);
    }
  }

  /* ---------------- 输入 ---------------- */
  function canvasPos(ev) {
    var r = cvs.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width * W,
      y: (ev.clientY - r.top) / r.height * H
    };
  }

  function hitBtn(px2, py2) {
    return px2 >= BTN.x && px2 <= BTN.x + BTN.w && py2 >= BTN.y && py2 <= BTN.y + BTN.h;
  }

  function hitVoice(px2, py2) {
    return px2 >= BTNV.x && px2 <= BTNV.x + BTNV.w && py2 >= BTNV.y && py2 <= BTNV.y + BTNV.h;
  }

  function campPointer(x, y) {
    var i;
    for (i = 0; i < CAMP_TAB.length; i++) {
      var tb = CAMP_TAB[i];
      if (x >= tb.x && x <= tb.x + tb.w && y >= tb.y && y <= tb.y + tb.h) { campTab(i); return; }
    }
    if (campPageCount() > 1) {
      if (inCampBox(CAMP_PREV, x, y)) { campPage(S.camp.page - 1); return; }
      if (inCampBox(CAMP_NEXT, x, y)) { campPage(S.camp.page + 1); return; }
    }
    if (x >= CAMP_GO.x && x <= CAMP_GO.x + CAMP_GO.w &&
        y >= CAMP_GO.y && y <= CAMP_GO.y + CAMP_GO.h) { campNextLevel(); return; }
    var rows = campRows();
    for (i = 0; i < rows.length; i++) {
      if (!campRowVisible(i)) continue;
      var r = campCardRect(i);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        S.camp.sel = i;
        campBuy(rows[i]);
        return;
      }
    }
  }

  function hitKid(px2, py2) {
    return px2 >= BTN2.x && px2 <= BTN2.x + BTN2.w && py2 >= BTN2.y && py2 <= BTN2.y + BTN2.h;
  }

  cvs.addEventListener('pointerdown', function (ev) {
    if (ARCADE.on && !ARCADE.active) return;
    var q = canvasPos(ev);
    ev.preventDefault();
    if (S.scene === 'prologue' && opening) { opening.toggle(); return; }

    /* 提示面板开着：只有「确认出招 / 自己拼」两个按钮能点 */
    if (S.paused) { hintPanelPointer(q.x, q.y); return; }

    if (hitBtn(q.x, q.y)) { setMuted(!muted); return; }
    if (hitVoice(q.x, q.y)) { toggleVoice(); return; }
    if (hitCase(q.x, q.y)) { toggleCase(); return; }
    if (hitShop(q.x, q.y)) { openShopInRun(); return; }
    if (hitHint(q.x, q.y)) { askHint(); return; }
    if (S.scene !== 'ult' && S.scene !== 'camp' && hitKid(q.x, q.y)) { setKid(!S.kid); return; }

    if (S.scene === 'camp') {
      campPointer(q.x, q.y);
      return;
    }
    if (S.scene === 'victory') {
      if (!(S.victory && S.victory.t > 0.35)) return;
      if (arcOn()) arcadeNextFromVictory(); else enterCamp();
      return;
    }
    if (S.scene === 'title' || S.scene === 'clear' || S.scene === 'dead') {
      if (arcOn()) return;          /* 内嵌模式：死了就是这一局结束，别自作主张重开 */
      if (S.scene === 'dead') startLevel(S.level, false);
      else startGame();
      return;
    }
    /* 大招已经直接放出去了，这段时间只放演出，不再接受输入 */
    if (S.scene === 'ult') return;
    if (S.scene === 'play') {
      /* 技能栏先判：闪避 / 破空 / 寒冰 / 雷罡，然后是字母盘 */
      var si = hitSkill(q.x, q.y);
      if (si >= 0) { useArt(si); return; }
      if (hitQi(q.x, q.y)) { if (S.player && S.player.qi >= 100) tryUlt(); return; }
      if (hitBs(q.x, q.y)) { kidBack(); return; }
      if (hitSw(q.x, q.y)) { kidNext(); return; }
      if (hitSkip(q.x, q.y)) { kidSkip(); return; }
      if (S.kid) {
        var ti = paletteHit(q.x, q.y);
        if (ti >= 0) { tapLetter(ti); return; }
      }
      var ce = cardHit(q.x, q.y);
      if (ce) setFocus(ce);
    }
  });

  cvs.addEventListener('pointermove', function (ev) {
    if (S.scene === 'prologue') { cvs.style.cursor = 'pointer'; return; }
    var q = canvasPos(ev);
    S.hoverBtn = hitBtn(q.x, q.y);
    S.hoverVoice = !S.paused && S.scene !== 'camp' && S.scene !== 'victory' && hitVoice(q.x, q.y);

    if (S.paused) {
      var L = hintLayout(), hh = 0;
      if (hintPanelHit(q.x, q.y, L.ok)) hh = 1;
      else if (hintPanelHit(q.x, q.y, L.no)) hh = 2;
      S.hoverHint = hh;
      cvs.style.cursor = hh ? 'pointer' : 'default';
      return;
    }

    if (S.scene === 'camp') {
      var ci, hot2 = false;
      S.camp.hover = -1; S.camp.hoverTab = -1; S.camp.hoverGo = false;
      S.camp.hoverPrev = false; S.camp.hoverNext = false;
      for (ci = 0; ci < CAMP_TAB.length; ci++) {
        var ct = CAMP_TAB[ci];
        if (q.x >= ct.x && q.x <= ct.x + ct.w && q.y >= ct.y && q.y <= ct.y + ct.h) {
          S.camp.hoverTab = ci; hot2 = true;
        }
      }
      if (q.x >= CAMP_GO.x && q.x <= CAMP_GO.x + CAMP_GO.w &&
          q.y >= CAMP_GO.y && q.y <= CAMP_GO.y + CAMP_GO.h) { S.camp.hoverGo = true; hot2 = true; }
      if (campPageCount() > 1) {
        if (inCampBox(CAMP_PREV, q.x, q.y) && S.camp.page > 0) { S.camp.hoverPrev = true; hot2 = true; }
        if (inCampBox(CAMP_NEXT, q.x, q.y) && S.camp.page < campPageCount() - 1) { S.camp.hoverNext = true; hot2 = true; }
      }
      var crows = campRows();
      for (ci = 0; ci < crows.length; ci++) {
        if (!campRowVisible(ci)) continue;
        var cr = campCardRect(ci);
        if (q.x >= cr.x && q.x <= cr.x + cr.w && q.y >= cr.y && q.y <= cr.y + cr.h) {
          S.camp.hover = ci; hot2 = true;
        }
      }
      cvs.style.cursor = hot2 ? 'pointer' : 'default';
      return;
    }

    S.hoverKid = hitKid(q.x, q.y);
    S.hoverCase = hitCase(q.x, q.y);
    S.hoverTile = -1;
    S.hoverCard = 0;
    S.hoverBack = false;
    S.hoverTab = false;
    S.hoverAct = 0;
    S.hoverSkill = -1;
    S.hoverQi = false;
    if (S.scene === 'play') {
      S.hoverSkill = hitSkill(q.x, q.y);
      S.hoverQi = hitQi(q.x, q.y);
      S.hoverBack = hitBs(q.x, q.y);
      S.hoverSw = hitSw(q.x, q.y);
      S.hoverSkip = hitSkip(q.x, q.y);
      S.hoverShop = hitShop(q.x, q.y);
      S.hoverHint = hitHint(q.x, q.y) ? 3 : 0;
      var ce = cardHit(q.x, q.y);
      S.hoverCard = ce ? ce.id : 0;
      if (S.kid) S.hoverTile = paletteHit(q.x, q.y);
    }
    var hot = S.hoverBtn || S.hoverVoice || S.hoverKid || S.hoverCase || S.hoverShop || S.hoverHint || S.hoverTile >= 0 || S.hoverCard ||
      S.hoverSkill >= 0 || S.hoverQi || S.hoverBack || S.hoverSw || S.hoverSkip;
    cvs.style.cursor = hot ? 'pointer' : 'default';
  });

  /* 把按键归一成 a-z：中文输入法激活时 ev.key 会变成 "Process"，
     但 ev.code / keyCode 仍然指向真实键位，所以做三层兜底 */
  function keyLetter(ev) {
    var k = ev.key;
    if (typeof k === 'string' && k.length === 1) {
      var c = k.toLowerCase();
      if (c >= 'a' && c <= 'z') return c;
    }
    var m = /^Key([A-Z])$/.exec(ev.code || '');
    if (m) return m[1].toLowerCase();
    var kc = ev.keyCode || ev.which || 0;
    if (kc >= 65 && kc <= 90) return String.fromCharCode(kc).toLowerCase();
    return '';
  }

  var imeWarned = false;
  function imeBusy(ev) {
    return ev.keyCode === 229 || ev.key === 'Process' || ev.isComposing === true;
  }

  window.addEventListener('keydown', function (ev) {
    if (ARCADE.on && !ARCADE.active) return;
    if (S.scene === 'prologue' && opening) { opening.handleKey(ev); return; }
    var k = ev.key;
    if (k === ' ' || k === 'Backspace' || k === 'Enter' || k === 'Tab' || k === 'ArrowUp' ||
        k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' ||
        k === 'PageUp' || k === 'PageDown') ev.preventDefault();

    /* 音效开关只绑非字母键：26 个字母全部留给拼写 */
    if (k === '`' || k === '~') { setMuted(!muted); return; }

    /* 提示面板开着：回车确认、Esc 取消，别的键一律不理 */
    if (S.paused) {
      if (k === 'Enter' || k === ' ') { confirmHint(); return; }
      if (k === 'Escape' || k === 'Backspace') { cancelHint(); return; }
      return;
    }

    if (S.scene === 'camp') {
      var krows = campRows();
      if (k === 'Tab') { campTab(S.camp.tab + (ev.shiftKey ? -1 : 1)); return; }
      if (k === 'ArrowUp' || k === 'ArrowLeft') {
        S.camp.sel = (S.camp.sel + krows.length - 1) % krows.length; campEnsureSel(); sfx.tab(); return;
      }
      if (k === 'ArrowDown' || k === 'ArrowRight') {
        S.camp.sel = (S.camp.sel + 1) % krows.length; campEnsureSel(); sfx.tab(); return;
      }
      if (k === 'PageUp') { campPage(S.camp.page - 1); return; }
      if (k === 'PageDown') { campPage(S.camp.page + 1); return; }
      if (k === 'Enter') { campBuy(krows[S.camp.sel]); return; }
      if (k === ' ' || k === 'Escape') { campNextLevel(); return; }
      return;
    }

    if (S.scene === 'title') {
      /* 修饰键不当作「任意键」 */
      if (k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta' ||
          k === 'CapsLock' || k === 'Tab' || k === 'ContextMenu') return;
      startGame();
      return;
    }
    if (S.scene === 'victory') {
      if ((k === ' ' || k === 'Enter') && S.victory && S.victory.t > 0.35) {
        if (arcOn()) arcadeNextFromVictory(); else enterCamp();
      }
      return;
    }
    if (S.scene === 'clear' || S.scene === 'dead') {
      if (k === ' ' || k === 'Enter') {
        if (arcOn()) return;
        if (S.scene === 'dead') startLevel(S.level, false);
        else startGame();
        return;
      }
    }
    /* 数字键 1-4：对应技能栏四格（闪避 / 破空 / 寒冰 / 雷罡） */
    if (k.length === 1 && k >= '1' && k <= '4') {
      if (S.scene === 'play') { useArt(parseInt(k, 10) - 1); return; }
    }
    /* 大小写：点读模式下按 CapsLock 也能切 */
    if (k === 'CapsLock') {
      if (S.scene === 'play') { toggleCase(); return; }
    }
    if (k === ' ') {
      if (S.scene === 'play') dodge();
      return;
    }
    if (k === 'Enter') {
      if (S.scene === 'play') tryUlt();
      return;
    }
    if (k === 'Escape') {
      S.input = ''; S.lockId = null;
      return;
    }
    if (k === 'Tab') {
      /* Tab：切换要拼的单词 */
      if (S.scene === 'play') kidNext();
      return;
    }
    if (k === 'Backspace') {
      /* Backspace：撤销一个字母；点读模式下不扣血 */
      if (S.input.length) {
        S.input = S.input.slice(0, -1);
        S.kidBad = 0;
        if (!S.input) { S.lockId = null; S.wordStart = S.t; }
        sfx.back();
      }
      return;
    }
    var lc = keyLetter(ev);
    if (lc) {
      if (S.scene === 'play') {
        if (ev.repeat) return;
        S.keyPing = 0.2;                 /* 输入框亮一下，确认按键被收到 */
        if (imeBusy(ev) && !imeWarned) {
          imeWarned = true;
          S.toast = { text: '输入法在拦截按键 · 按 Shift 切英文更稳', t: 2.4, max: 2.4 };
        }
        typeLetter(lc);
      }
    }
  });

  /* 营地列表用滚轮翻页 */
  cvs.addEventListener('wheel', function (ev) {
    if (S.scene !== 'camp') return;
    ev.preventDefault();
    campPage(S.camp.page + (ev.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  /* ---------------- 启动 ---------------- */
  var FREEZE = false;
  var BOT = false, botT = 0;

  /* 调试机器人：自动拼写最近目标，用于回归测试与录屏 */
  function botStep(dt) {
    if (!BOT) return;
    botT += dt;
    if (botT < 0.1) return;
    botT = 0;
    if (S.scene !== 'play' || !S.player) return;
    var list = S.enemies.filter(function (e) { return e.alive; });
    if (!list.length) return;
    var tgt = null, i;
    for (i = 0; i < list.length; i++) if (list[i].id === S.lockId) tgt = list[i];
    if (!tgt) {
      tgt = list[0];
      for (i = 1; i < list.length; i++) {
        if (Math.abs(list[i].x - 108) < Math.abs(tgt.x - 108)) tgt = list[i];
      }
    }
    if (S.input && tgt.word.indexOf(S.input) !== 0) S.input = '';
    if (S.input.length < tgt.word.length) typeLetter(tgt.word.charAt(S.input.length));
    if (S.player.qi >= 100) tryUlt();
  }

  function boot() {
    Art.init();
    initAmbient();
    S.player = newPlayer();
    loadWordStat();

    /* 调试入口：?auto=1 直接开局，fast=N 快进 N 秒，lock=1 自动锁定一张词卡 */
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('kid') === '0') S.kid = false;
      if (q.get('kid') === '1') S.kid = true;
      if (q.get('bot')) BOT = true;
      if (q.get('words')) {
        var fwl = q.get('words').split(',');
        for (var wi = 0; wi < fwl.length; wi++) FORCE_WORDS.push(fwl[wi]);
      }
      if (q.get('auto')) {
        startGame(true);
        if (q.get('lv')) startLevel(parseInt(q.get('lv'), 10) || 1, false);
        var fast = parseFloat(q.get('fast') || '0');
        for (var fi = 0; fi < fast * 60; fi++) { botStep(1 / 60); update(1 / 60); }
        if (q.get('lock')) {
          var alive = S.enemies.filter(function (e) { return e.alive; });
          if (alive.length) {
            var w0 = alive[0].word;
            for (var ti = 0; ti < Math.min(2, w0.length); ti++) typeLetter(w0.charAt(ti));
          }
        }
        if (q.get('atk')) {
          var av = S.enemies.filter(function (e) { return e.alive; });
          if (av.length) {
            var aw = av[0].word;
            for (var ai = 0; ai < aw.length; ai++) typeLetter(aw.charAt(ai));
            var nf = parseInt(q.get('atk'), 10) || 0;
            for (var fj = 0; fj < nf; fj++) update(1 / 60);
          }
        }
        if (q.get('hit')) {
          var hv = S.enemies.filter(function (e) { return e.alive; });
          if (hv.length) {
            applyHit(hv[0], 24, true);
            for (var hi = 0; hi < 8; hi++) update(1 / 60);
          }
        }
        if (q.get('ult')) {
          /* 先让第一波怪出场，不然气劲满了也没目标可斩 */
          for (var ue = 0; ue < 40 && !aliveCount(); ue++) update(1 / 60);
          S.player.qi = 100;
          tryUlt();
          /* 演出跑完（2 秒），直接看落点结果 */
          if (!q.get('still')) for (var uj = 0; uj < 130; uj++) update(1 / 60);
        }
        if (q.get('boss')) {
          S.enemies = []; S.wave = 2; S.spawnQ = [];
          startWave();
          for (var bi = 0; bi < 230; bi++) update(1 / 60);
        }
        /* 调试：?type=ca 开局直接敲入若干字母，用于检查输入框渲染 */
        if (q.get('type')) {
          var tstr = q.get('type');
          for (var ki = 0; ki < tstr.length; ki++) typeLetter(tstr.charAt(ki));
        }
        /* 调试：?camp=300 直接进关卡之间的营地，带 300 灵石 */
        if (q.get('camp')) {
          S.player.stones = parseInt(q.get('camp'), 10) || 200;
          win();
        }
        if (q.get('freeze')) FREEZE = true;
      }
    } catch (e) { }

    window.__wfy = {
      getOpening: function () { return opening; },
      S: S, startGame: startGame, typeLetter: typeLetter,
      tryUlt: tryUlt, fire: fire, dodge: dodge,
      paletteLetters: paletteLetters, paletteTiles: paletteTiles, paletteBox: paletteBox,
      paletteRows: paletteRows,
      kidBack: kidBack, kidNext: kidNext, kidSkip: kidSkip, inputBad: inputBad, update: update,
      askHint: askHint, confirmHint: confirmHint, cancelHint: cancelHint,
      wordLimit: wordLimit, wordLeftRatio: wordLeftRatio, wordTimeout: wordTimeout,
      HINT_BTN: HINT_BTN, hintLayout: hintLayout, HINT_COST: HINT_COST,
      TIME_BASE: TIME_BASE, TIME_PER_CHAR: TIME_PER_CHAR,
      render: render,
      meanFit: meanFit, meanCut: meanCut, cardRect: cardRect, cardWidth: cardWidth,
      campRows: campRows, campBuy: campBuy, campTab: campTab, campNextLevel: campNextLevel,
      campCardRect: campCardRect, campPage: campPage, campRowVisible: campRowVisible,
      campPageCount: campPageCount,
      startLevel: startLevel, applyMeta: applyMeta, win: win, enterCamp: enterCamp,
      openShopInRun: openShopInRun, backToRun: backToRun, hotspots: hotspots,
      useArt: useArt, artCd: artCd, artCdMax: artCdMax, skillRect: skillRect,
      toggleCase: toggleCase, paletteHit: paletteHit, hitSkill: hitSkill, hitCase: hitCase,
      toggleVoice: toggleVoice, hitVoice: hitVoice, BTN: BTN, BTNV: BTNV, BTN2: BTN2,
      voiceOff: function () { return voiceOff; },
      hitSw: hitSw, hitSkip: hitSkip, hitBs: hitBs, levelWords: levelWords, makeWaves: makeWaves,
      levelCfg: levelCfg, worldOf: worldOf, mobHp: mobHp, bossHp: bossHp, arcadeWaves: arcadeWaves,
      hurtPlayer: hurtPlayer, applyHit: applyHit, rerollWord: rerollWord,
      inputOwner: inputOwner, focusEnemy: focusEnemy, spawnEnemy: spawnEnemy,
      markWord: markWord, wordStat: wordStat, needsReview: needsReview, reviewCount: reviewCount,
      setRage: setRage, addRage: addRage, pickReviewWord: pickReviewWord, mistake: mistake,
      pickWord: pickWord, enemyAttack: enemyAttack, killEnemy: killEnemy,
      say: say, sayName: sayName, ATTR_OF: ATTR_OF,
      RAGE_DMG: RAGE_DMG, RAGE_CAST: RAGE_CAST, ORB_DMG: ORB_DMG
    };

    /* ---------------- 宿主 API（Elaine学英语 调这几个） ---------------- */
    ARCADE.start = function (opts) { startArcade(opts); };
    ARCADE.goTier = function (tier, words) { arcadeGoTier(tier, words); };
    /* 宿主提前把下一档的词备好，结算屏点"继续"就能秒进 */
    ARCADE.prepare = function (tier, words) { ARCADE.pending = { tier: tier, words: words }; };
    ARCADE.setWords = function (words) { ARCADE.queue = words || []; };
    ARCADE.setBox = function (w, h) { ARCADE.box = (w && h) ? { w: w, h: h } : null; fit(); };
    ARCADE.setActive = function (v) {
      ARCADE.active = !!v;
      if (ARCADE.active) { actx(); last = performance.now(); }
      fit();
    };
    ARCADE.openShop = function () { openShopInRun(); };
    ARCADE.closeShop = function () { backToRun(); };
    /* 提示：20 灵石买一个答案，填好 → 暂停 → 玩家确认后才出招 */
    ARCADE.hint = function () { askHint(); };
    /* 新手教程用：当前画面里各按钮的位置（画布逻辑坐标） */
    ARCADE.hotspots = function (page) { return hotspots(page); };
    ARCADE.confirmHint = function () { confirmHint(); };
    ARCADE.cancelHint = function () { cancelHint(); };
    /* 语音开关：宿主开局把上次的开关状态同步进来（静默，不弹提示）；
       用户点按钮时走 toggleVoice()，会顺手回调 ARCADE.onVoice 让宿主记账 */
    ARCADE.setVoiceOff = function (v) { return setVoiceOff(v, true); };
    ARCADE.voiceOff = function () { return voiceOff; };
    /* 竖屏时宿主把字母盘搬成 DOM 键盘，这里只留一个开关和两个入口 */
    ARCADE.setLayout = function (name) {
      ARCADE.layout = (name === 'portrait') ? 'portrait' : 'land';
      fit();
    };
    ARCADE.kidLetter = function (ch) {
      if (ARCADE.on && !ARCADE.active) return;
      kidLetter(ch);
    };
    ARCADE.kidBack = function () {
      if (ARCADE.on && !ARCADE.active) return;
      kidBack();
    };
    ARCADE.state = function () { return S; };
    ARCADE.hpRate = 0.25;
    ARCADE.stop = function () {
      ARCADE.active = false;
      ARCADE.on = false;
      S.scene = 'title';
      S.paused = false;
      S.pendHint = null;
    };
    ARCADE.summary = function () {
      return {
        tier: ARCADE.tier, died: S.scene === 'dead',
        stones: S.player ? S.player.stones : 0,
        correct: S.stats.correct, wrong: S.stats.wrong,
        maxCombo: S.stats.maxCombo, time: S.stats.time,
        hp: S.player ? S.player.hp : 0, maxHp: S.player ? S.player.maxHp : 0,
        shops: ARCADE.shops
      };
    };

    var last = performance.now(), acc = 0;

    function frame(now) {
      /* 宿主退出后空转：不 update 不 render，但 rAF 链路留着，回来能立刻接上 */
      if (ARCADE.on && !ARCADE.active) {
        last = now; acc = 0;
        requestAnimationFrame(frame);
        return;
      }
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      var steps = 0;
      if (!FREEZE) {
        while (acc >= 1 / 60 && steps < 5) {
          botStep(1 / 60);
          update(1 / 60);
          acc -= 1 / 60;
          steps++;
        }
      } else {
        acc = 0;
      }
      render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  boot();
})();
