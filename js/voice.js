/* ============================================================
   voice.js — 三条路，按场景选最快的那条

   ① 宠物说话（小鲸的中文台词）
      → Edge TTS（微软在线语音，经 server.py 代理）
      → 1~2 秒出声，音色是真人录音级别
      → 断网 / 没装 edge-tts 时退到本地 IndexTTS2，再退浏览器语音

   ② 题目朗读（英文句子，点 🔊 / 点例句）
      → 浏览器自带 SpeechSynthesis
      → 零延迟、不联网、不占显卡
      → 设备没装英文嗓音时，退到 Edge TTS 的英文童声

   ③ 全都不可用 → 调用方放一声「哔」

   统一入口：
     V.say(text, lang, hooks, opt)
     V.sayZh(text, hooks)        宠物说话
     V.sayEn(text, hooks)        念英文
     V.readQuestion(text, hooks) 念题干里的英文部分

   hooks：{ start, end, fail, slow }，也可以直接传一个函数当失败回调
   ============================================================ */
(function (SM) {
  'use strict';

  const V = {};

  /* ---------- 状态 ---------- */
  let serverOk = false;      // 本地服务（/api/*）可用
  let edgeOk = false;        // Edge TTS 可用
  let speechOk = false;      // 浏览器语音可用
  let checked = false;       // 是否探测完
  let info = null;           // /api/health 返回的详情
  let voiceTag = '';         // 音色版本号，换了音色就让浏览器缓存失效
  let curAudio = null;       // 正在播的 <audio>
  let playToken = 0;         // 每次说话 +1，旧回调凭 token 作废

  /* 宠物音色：Edge 中文女声，默认晓伊（活泼少女，最贴小鲸的形象） */
  const ZH_VOICE = 'zh-CN-XiaoyiNeural';
  const EN_VOICE = 'en-US-AnaNeural';       // 英文童声，读例句给孩子听

  let edgeVoice = ZH_VOICE;
  let enVoice = EN_VOICE;                   // 英文音色也可换，和中文分开存
  let edgeRate = -6;                        // 给孩子听，稍慢一点
  try {
    const saved = SM.store && SM.store.get ? SM.store.get('sm_voice') : null;
    if (saved && typeof saved === 'string') edgeVoice = saved;
    const savedEn = SM.store && SM.store.get ? SM.store.get('sm_voice_en') : null;
    if (savedEn && typeof savedEn === 'string') enVoice = savedEn;
  } catch (e) { /* ignore */ }

  /* ---------- 浏览器语音 ---------- */
  let synth = null;
  try { synth = window.speechSynthesis || null; } catch (e) { synth = null; }
  speechOk = !!synth;

  let voices = [];
  function loadVoices() {
    if (!synth) return;
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
  }
  loadVoices();
  if (synth && typeof synth.addEventListener === 'function') {
    try { synth.addEventListener('voiceschanged', loadVoices); } catch (e) { /* 老浏览器忽略 */ }
  }

  function pickVoice(lang) {
    const want = String(lang || 'zh').slice(0, 2).toLowerCase();
    let hit = null;
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      const vl = String(v.lang || '').toLowerCase();
      if (vl.indexOf(want) !== 0) continue;
      if (v.localService) return v;      // 本地嗓音延迟低，优先
      if (!hit) hit = v;
    }
    return hit;
  }

  /* ---------- 服务端探测 ---------- */
  let probeTries = 0;
  function probe() {
    let done = false;
    const finish = function (ok, j) {
      if (done) return;
      done = true;
      checked = true;
      serverOk = !!ok;
      info = j || null;
      edgeOk = !!(ok && j && j.edge);
      if (serverOk && j && j.voice_id) voiceTag = String(j.voice_id);
      if (serverOk) {
        try { if (SM.onVoiceReady) SM.onVoiceReady(j); } catch (e) { /* ignore */ }
      } else if (probeTries < 6) {
        /* 可能只是服务还没起来（先开网页后开服务），过几秒再试 */
        probeTries++;
        setTimeout(probe, 3000);
      }
    };

    /* file:// 直接打开时 fetch 相对路径会抛错，2.5 秒没结果就按「没有服务」处理 */
    const timer = setTimeout(function () { finish(false, null); }, 2500);

    try {
      fetch('/api/health', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          clearTimeout(timer);
          finish(!!(j && j.ok), j);
        })
        .catch(function () {
          clearTimeout(timer);
          finish(false, null);
        });
    } catch (e) {
      clearTimeout(timer);
      finish(false, null);
    }
  }
  probe();

  /* ---------- 对外状态 ---------- */
  V.mode = function () {
    if (edgeOk) return 'edge';
    if (serverOk) return 'server';
    if (speechOk) return 'speech';
    return 'none';
  };
  V.ok = function () { return edgeOk || serverOk || speechOk; };
  V.checked = function () { return checked; };
  V.info = function () { return info; };
  V.hasServer = function () { return serverOk; };
  V.hasEdge = function () { return edgeOk; };
  V.edgeVoice = function () { return edgeVoice; };
  V.setEdgeVoice = function (v) {
    edgeVoice = v || ZH_VOICE;
    try { if (SM.store && SM.store.set) SM.store.set('sm_voice', edgeVoice); } catch (e) { /* ignore */ }
  };
  V.enVoice = function () { return enVoice; };
  V.setEnVoice = function (v) {
    enVoice = v || EN_VOICE;
    try { if (SM.store && SM.store.set) SM.store.set('sm_voice_en', enVoice); } catch (e) { /* ignore */ }
  };

  V.stop = function () {
    playToken++;
    if (curAudio) {
      try { curAudio.pause(); } catch (e) { /* ignore */ }
      curAudio = null;
    }
    if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } }
  };

  /* ---------- 英文抽取 ---------- */
  /**
   * 把一段中英混排的题干抽成纯英文，用来朗读
   * 「把 “We like apples.” 改成一般疑问句」→「We like apples.」
   */
  V.englishOf = function (text) {
    let s = String(text || '');
    s = s.replace(/\n/g, ' ');
    s = s.replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ' ');
    /* 先保住单词内部的撇号（Lily's / don't / I'm），否则会被当成引号删掉，
       念出来变成 "Lily s" */
    s = s.replace(/([A-Za-z])['\u2019]([A-Za-z])/g, '$1\u0001$2');
    /* 再删各种引号 */
    s = s.replace(/[\u201c\u201d\u2018\u2019"'\u300c\u300d\u300e\u300f]/g, ' ');
    s = s.replace(/\u0001/g, "'");
    /* 空格下划线 = 填空，念成 blank */
    s = s.replace(/_{2,}/g, ' blank ');
    s = s.replace(/[\u2014\u2013\-/|]+/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    if ((s.match(/[a-zA-Z]/g) || []).length < 2) return '';
    return s;
  };

  /* ---------- hooks 归一 ---------- */
  function normHooks(h) {
    if (!h) return {};
    if (typeof h === 'function') return { fail: h };   // 兼容旧签名
    return h;
  }

  function fire(hooks, name, a, b) {
    const fn = hooks && hooks[name];
    if (typeof fn !== 'function') return;
    try { fn(a, b); } catch (e) { /* 回调自己炸了不该影响播放 */ }
  }

  /* ---------- ① Edge TTS（首选，1~2 秒） ---------- */
  function edgeUrl(text, isEn, opt) {
    const voice = (opt && opt.voice) || (isEn ? enVoice : edgeVoice);
    const rate = (opt && opt.edgeRate != null) ? opt.edgeRate : (isEn ? 0 : edgeRate);
    return '/api/edge-tts?text=' + encodeURIComponent(text) +
           '&voice=' + encodeURIComponent(voice) +
           '&rate=' + encodeURIComponent(rate);
  }

  function playEdge(text, isEn, hooks, token, opt, onFail) {
    let a;
    try { a = new Audio(); } catch (e) { return false; }
    curAudio = a;
    a.preload = 'auto';
    a.src = edgeUrl(text, isEn, opt);

    let started = false;
    let settled = false;
    let giveUp = null;

    const slowTimer = setTimeout(function () {
      if (token !== playToken || started) return;
      fire(hooks, 'slow');
    }, 600);

    function cleanup() {
      clearTimeout(slowTimer);
      if (giveUp) clearTimeout(giveUp);
      if (curAudio === a) curAudio = null;
    }
    function failOnce() {
      if (settled) return;
      settled = true;
      cleanup();
      if (token !== playToken) return;
      onFail();
    }

    a.addEventListener('playing', function () {
      if (token !== playToken) return;
      started = true;
      settled = true;
      clearTimeout(slowTimer);
      fire(hooks, 'start');
    });
    a.addEventListener('ended', function () {
      if (token !== playToken) return;
      cleanup();
      fire(hooks, 'end');
    });
    a.addEventListener('error', failOnce);

    /* Edge 正常 1~2 秒，8 秒还没出声就当网络不行，交给下一级 */
    giveUp = setTimeout(function () {
      if (token !== playToken || started) return;
      try { a.pause(); } catch (e) { /* ignore */ }
      failOnce();
    }, 8000);

    let p;
    try { p = a.play(); } catch (e) { failOnce(); return true; }
    if (p && typeof p.catch === 'function') p.catch(failOnce);
    return true;
  }

  /* ---------- ② 本地 IndexTTS2（后备，6~8 秒但有缓存） ---------- */
  function ttsUrl(text, lang) {
    return '/api/tts?lang=' + encodeURIComponent(lang === 'EN' ? 'EN' : 'ZH') +
           '&text=' + encodeURIComponent(text) +
           (voiceTag ? '&v=' + encodeURIComponent(voiceTag) : '');
  }
  V.ttsUrl = ttsUrl;

  function playServer(text, lang, hooks, token, opt, onFail) {
    let a;
    try { a = new Audio(); } catch (e) { return false; }
    curAudio = a;
    a.preload = 'auto';
    a.src = ttsUrl(text, lang);

    let started = false;
    let settled = false;
    let giveUp = null;

    const slowTimer = setTimeout(function () {
      if (token !== playToken || started) return;
      fire(hooks, 'slow');
    }, 700);

    function cleanup() {
      clearTimeout(slowTimer);
      if (giveUp) clearTimeout(giveUp);
      if (curAudio === a) curAudio = null;
    }
    function failOnce() {
      if (settled) return;
      settled = true;
      cleanup();
      if (token !== playToken) return;
      onFail();
    }

    a.addEventListener('playing', function () {
      if (token !== playToken) return;
      started = true;
      settled = true;
      clearTimeout(slowTimer);
      fire(hooks, 'start');
    });
    a.addEventListener('ended', function () {
      if (token !== playToken) return;
      cleanup();
      fire(hooks, 'end');
    });
    a.addEventListener('error', failOnce);

    /* 超过 20 秒还没出声就当服务卡住了，交给下一级 */
    giveUp = setTimeout(function () {
      if (token !== playToken || started) return;
      try { a.pause(); } catch (e) { /* ignore */ }
      failOnce();
    }, 20000);

    let p;
    try { p = a.play(); } catch (e) { failOnce(); return true; }
    if (p && typeof p.catch === 'function') p.catch(failOnce);
    return true;
  }

  /* ---------- ③ 浏览器语音 ---------- */
  function playSpeech(text, lang, hooks, token, opt, onFail) {
    if (!synth) return false;
    opt = opt || {};
    try {
      try { synth.cancel(); } catch (e) { /* ignore */ }

      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'zh-CN';
      u.rate = opt.rate === undefined ? 1 : opt.rate;
      u.pitch = opt.pitch === undefined ? 1.3 : opt.pitch;
      u.volume = opt.volume === undefined ? 1 : opt.volume;

      const v = pickVoice(u.lang);
      if (v) u.voice = v;

      let started = false;
      u.onstart = function () {
        if (token !== playToken) return;
        started = true;
        fire(hooks, 'start');
      };
      u.onend = function () {
        if (token !== playToken) return;
        fire(hooks, 'end');
      };
      u.onerror = function () {
        if (token !== playToken || started) return;
        onFail();
      };

      /* 有些设备有 speechSynthesis 却没装嗓音，speak() 会静默失败 */
      setTimeout(function () {
        if (token !== playToken || started) return;
        onFail();
      }, 700);

      synth.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- 统一入口 ---------- */
  /**
   * 说一句话
   * @param {string} text
   * @param {string} lang   'ZH' | 'EN'（也接受 'zh-CN' / 'en-US'）
   * @param {object|function} hooks  {start,end,fail,slow} 或旧版失败回调
   * @param {object} opt    {prefer:'edge'|'server'|'speech', rate, pitch, volume, voice}
   */
  V.say = function (text, lang, hooks, opt) {
    const t = String(text || '').trim();
    if (!t) return false;
    hooks = normHooks(hooks);
    opt = opt || {};

    const isEn = /^en/i.test(String(lang || ''));
    const short = isEn ? 'EN' : 'ZH';
    const bcp = isEn ? 'en-US' : 'zh-CN';

    V.stop();
    const token = playToken;

    const tryEdge = function (next) {
      if (!edgeOk || !playEdge(t, isEn, hooks, token, opt, next)) next();
    };
    const tryServer = function (next) {
      if (!serverOk || !playServer(t, short, hooks, token, opt, next)) next();
    };
    const trySpeech = function (next) {
      if (!speechOk || !playSpeech(t, bcp, hooks, token, opt, next)) next();
    };

    let order;
    if (opt.prefer === 'speech') {
      order = [trySpeech, tryEdge, tryServer];
    } else if (opt.prefer === 'server') {
      order = [tryServer, tryEdge, trySpeech];
    } else {
      order = [tryEdge, tryServer, trySpeech];
    }

    let i = 0;
    const run = function () {
      if (i >= order.length) {
        setTimeout(function () {
          if (token === playToken) fire(hooks, 'fail');
        }, 0);
        return;
      }
      order[i++](run);
    };
    run();
    return true;
  };

  /* 小鲸说中文台词：Edge TTS 优先 */
  V.sayZh = function (text, hooks, opt) {
    return V.say(text, 'ZH', hooks, Object.assign({ prefer: 'edge', rate: 1.0, pitch: 1.15 }, opt || {}));
  };

  /* 念英文句子：Edge 音色优先（设置里选了哪个就用哪个），
     没服务才退浏览器语音。原来写的是浏览器优先，结果设置里换英文音色
     完全听不出变化 —— 因为浏览器语音根本不认 Edge 的音色 ID。 */
  V.sayEn = function (text, hooks, opt) {
    return V.say(text, 'EN', hooks, Object.assign({ prefer: 'edge', rate: 0.86, pitch: 1.0 }, opt || {}));
  };

  /** 朗读题干里的英文部分 */
  V.readQuestion = function (text, hooks) {
    const en = V.englishOf(text);
    if (!en) {
      const h = normHooks(hooks);
      setTimeout(function () { fire(h, 'fail'); }, 0);
      return false;
    }
    return V.sayEn(en, hooks);
  };

  /* 读单个单词 / 短语（点选项时用） */
  V.readWord = function (word, hooks) {
    const en = V.englishOf(word);
    if (!en) return false;
    return V.sayEn(en, hooks);
  };

  /* ---------- 预热 ---------- */
  /** 让浏览器把某句音频拉进 HTTP 缓存，不发声 */
  V.prefetch = function (text, lang) {
    if (!serverOk) return;
    const t = String(text || '').trim();
    if (!t) return;
    const isEn = /^en/i.test(String(lang || ''));
    try {
      fetch(edgeUrl(t, isEn), { cache: 'force-cache' }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  };

  /**
   * 批量预热（只有 IndexTTS2 需要，Edge 快到不用预生成）
   * @param {Array<[string,string]>} list [[文本, 'ZH'|'EN'], ...]
   */
  V.warm = function (list) {
    if (!serverOk || !list || !list.length) return;
    try {
      fetch('/api/prewarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: list })
      }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  };

  SM.voice = V;

})(window.SM);
