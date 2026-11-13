/* ============================================================
   mascot.js — 小鲸（鲸鱼尾巴女仆）
   ------------------------------------------------------------
   素材来自 dsh-dafeiyu（https://github.com/QCYTSN/dsh-dafeiyu），
   原始是 412×344 / 24fps 的透明 WebP 序列帧，这里用 ffmpeg 转成
   206×208 / 12fps 的 animated WebP，每组动作一个文件。

   为什么不逐帧 JS 播放：
     animated WebP 由浏览器原生解码，3444 帧如果逐帧 load
     会产生几千个请求；合成单个文件后，一组动作只发一次请求。

   动作清单（assets/pet/，共 15 个文件 / 12MB）：
     idle / thinking              循环，常驻用
     waiting                      抱着沙漏等（AI 请求中）
     working / working_command    忙起来 / 整理东西
     success / error              答对 / 答错
     head_pat / tail / poke       互动
     idle_stretch / idle_yawn     待机小动作
     eat_token                    彩蛋
     dragging / dragging_release  被拎起来 / 松手落地

   上游 16 组里 waiting 和 working_search 是同一段视频（都带沙漏张望），
   所以只存了一份。
   一次性动作的素材已经裁掉了开头 1.7 秒的静止帧，
   所以弹层里只显示 1~2 秒也能看到反应。
   ============================================================ */
(function (SM) {
  'use strict';

  const BASE = 'assets/pet/';

  /* 时长按「帧数 ÷ 12fps」算，用于播完自动回待机 */
  const CLIPS = {
    idle:         { ms: 10080, loop: true,  cn: '待机' },
    thinking:     { ms: 10080, loop: true,  cn: '思考' },
    waiting:      { ms: 10080, loop: true,  cn: '抱着沙漏等' },
    working:      { ms: 10080, loop: true,  cn: '忙起来' },
    working_command: { ms: 10080, loop: true, cn: '整理东西' },
    success:      { ms: 8420,  cn: '开心' },
    error:        { ms: 3250,  cn: '难过' },
    head_pat:     { ms: 8420,  cn: '摸头' },
    tail:         { ms: 8420,  cn: '摇尾巴' },
    poke:         { ms: 8420,  cn: '被戳' },
    idle_stretch: { ms: 8420,  cn: '伸懒腰' },
    idle_yawn:    { ms: 8420,  cn: '打哈欠' },
    eat_token:    { ms: 8420,  cn: '吃东西' },
    dragging:     { ms: 6000,  loop: true,  cn: '被拎起来' },
    dragging_release: { ms: 2080, cn: '落地' }
  };

  /* 旧代码传的 mood → 新素材的动作 */
  const MOOD = {
    happy: 'idle',
    cheer: 'success',
    wow:   'head_pat',
    sad:   'error',
    think: 'thinking',
    wait:  'waiting',
    work:  'working'
  };

  const timers = new WeakMap();
  function clearTimers(el) {
    const t = timers.get(el);
    if (t) { t.forEach(clearTimeout); timers.delete(el); }
  }
  function keep(el, id) {
    if (!timers.has(el)) timers.set(el, []);
    timers.get(el).push(id);
  }

  /* 预加载过的 clip，避免切换时白一下 */
  const loaded = {};
  function preload(clip) {
    if (loaded[clip]) return;
    loaded[clip] = true;
    const im = new Image();
    im.src = BASE + clip + '.webp';
  }

  function url(clip) { return BASE + clip + '.webp'; }

  /**
   * 切到某个动作。
   * 同一个动作重播时，先摘掉 src 再设回去 —— 否则浏览器认为
   * 「src 没变」，动画会停在原来的进度上不动。
   */
  function setClip(el, clip, restart) {
    if (!el || !CLIPS[clip]) return;
    const img = el.tagName === 'IMG' ? el : el.querySelector('.mascot');
    if (!img) return;
    const now = img.dataset.clip;
    if (now === clip && !restart) return;
    if (now === clip && restart) {
      img.removeAttribute('src');
      void img.offsetWidth;
    }
    img.dataset.clip = clip;
    img.src = url(clip);
  }

  /** 回到待机；被「钉住」的元素（比如练习页的思考态）不回去 */
  function toIdle(el) {
    if (!el || el.dataset.pin) return;
    setClip(el, 'idle');
  }

  /** 播一次，播完回待机 */
  function play(el, clip, ms) {
    if (!el) return;
    const c = CLIPS[clip];
    if (!c) return;
    clearTimers(el);
    preload(clip);
    setClip(el, clip, true);
    if (c.loop) return;
    keep(el, setTimeout(function () { toIdle(el); }, ms || c.ms));
  }

  /* ---------------- 兼容旧接口 ---------------- */

  /** 返回一段 HTML，顶层元素带 .mascot（app.js 里直接 innerHTML 用） */
  function svg(mood, cls) {
    const clip = MOOD[mood] || 'idle';
    return '<img class="mascot pet ' + (cls || '') + '" data-clip="' + clip + '"'
      + ' src="' + url(clip) + '" alt="" draggable="false">';
  }

  function setMood(el, mood) {
    if (!el) return;
    const clip = MOOD[mood] || 'idle';
    if (clip === 'idle' || clip === 'thinking') {
      /* 循环态：钉住，别被「播完回待机」的逻辑打回去 */
      el.dataset.pin = clip === 'thinking' ? '1' : '';
      setClip(el, clip);
    } else {
      play(el, clip);
    }
  }

  /** 弹一下（纯 CSS，不换素材） */
  function jump(el, scale) {
    if (!el) return;
    el.style.setProperty('--jump-h', scale || '10px');
    el.classList.remove('is-jump');
    void el.offsetWidth;
    el.classList.add('is-jump');
    keep(el, setTimeout(function () { el.classList.remove('is-jump'); }, 640));
  }

  function shake(el) {
    if (!el) return;
    el.classList.remove('is-shake');
    void el.offsetWidth;
    el.classList.add('is-shake');
    keep(el, setTimeout(function () { el.classList.remove('is-shake'); }, 520));
  }

  /** 序列帧没有独立眼球，保留空实现让旧调用不出错 */
  function look() {}
  function autoLook() { return function () {}; }

  /* ---------------- 表演动作 ---------------- */

  function dance(el, ms) {
    if (!el) return;
    clearTimers(el);
    preload('tail');
    setClip(el, 'tail', true);
    if (SM.sfx && SM.sfx.dance) SM.sfx.dance();
    keep(el, setTimeout(function () { toIdle(el); }, ms || 5200));
  }

  function sing(el, ms) {
    if (!el) return;
    clearTimers(el);
    preload('success');
    setClip(el, 'success', true);
    if (SM.sfx && SM.sfx.sing) SM.sfx.sing();

    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.12;
    for (let i = 0; i < 3; i++) {
      keep(el, setTimeout(function () {
        if (SM.fx && SM.fx.notes) SM.fx.notes(cx, cy, 4);
      }, i * 780));
    }
    keep(el, setTimeout(function () { toIdle(el); }, ms || 5600));
  }

  /* ---------------- 状态动作：等 / 忙 / 被拎起来 ---------------- */

  /** 抱着沙漏等你（AI 正在想、语音正在合成） */
  function wait(el) {
    if (!el) return;
    clearTimers(el);
    preload('waiting');
    setClip(el, 'waiting', true);
  }

  /** 忙起来（生成题目、整理东西），loop 一直转，直到调用方切走 */
  function work(el, clip) {
    if (!el) return;
    const c = clip === 'command' ? 'working_command' : 'working';
    clearTimers(el);
    preload(c);
    setClip(el, c, true);
  }

  /** 被拎起来：拖动时循环悬空姿势 */
  function lift(el) {
    if (!el) return;
    clearTimers(el);
    preload('dragging');
    setClip(el, 'dragging', true);
  }

  /** 松手：完整播一遍落地（2.08 秒）再回待机 */
  function drop(el) {
    if (!el) return;
    play(el, 'dragging_release', CLIPS.dragging_release.ms);
  }

  /**
   * 让宠物可以被拖着走。
   * 只在首页绑 —— 练习页拖它会挡住做题。
   * 拖动超过 6px 就吞掉这次 click，避免「拖完又触发一次表演」。
   */
  function bindDrag(el) {
    if (!el || el.dataset.dragBound) return;
    el.dataset.dragBound = '1';
    const wrap = el.closest('.m-wrap') || el.parentElement;
    let sx = 0, sy = 0, on = false, moved = false;

    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      on = true; moved = false; sx = e.clientX; sy = e.clientY;
      if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
      el.classList.add('is-dragging');
      if (wrap) wrap.classList.add('is-dragging');
    });

    el.addEventListener('pointermove', function (e) {
      if (!on) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 6) {
        moved = true;
        lift(el);
      }
      if (!moved) return;
      /* 只在屏幕范围内飘，别拖出手机外面找不回来。
         顺带放大一点点 —— 素材里「悬空」要播到第 2 秒才明显，
         先给个浮起来的手感，孩子才觉得真的被拎起来了。 */
      const lim = 90;
      const cx = Math.max(-lim, Math.min(lim, dx));
      const cy = Math.max(-lim, Math.min(lim, dy));
      el.style.transform = 'translate(' + cx + 'px,' + cy + 'px) rotate(' + (cx * 0.05) + 'deg) scale(1.06)';
    });

    function end() {
      if (!on) return;
      on = false;
      el.classList.remove('is-dragging');
      if (wrap) wrap.classList.remove('is-dragging');
      if (!moved) return;
      el.classList.add('is-dropping');
      el.style.transform = '';
      drop(el);
      setTimeout(function () { el.classList.remove('is-dropping'); }, 340);
      /* 等 click 走完再复位，否则这一下会被当成点击 */
      setTimeout(function () { moved = false; }, 300);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    /* 拖完那一下别再触发 click（表演 / 摸头） */
    el.addEventListener('click', function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  const LINES = [
    '嘿嘿，好痒！', '我在陪你做题呀', '加油加油！', '你戳我啦～',
    '今天也要认真学习哦', '我们一起闯关吧！', '这道题不难的', '我唱歌好听吗？'
  ];

  /** 只出声，不冒泡 */
  function speakVoice(text) {
    const blip = function () { if (SM.sfx) SM.sfx.blip(720); };
    const ok = SM.voice ? SM.voice.sayZh(text, { fail: blip }) : false;
    if (!ok) blip();
  }

  /* ---------------- 点击动作池 ----------------
     按钮去掉之后，点一下是唯一的互动入口，所以每个动作都必须
     同时说话 —— 否则孩子点了只看到动，听不到声，会觉得「坏了」。
     p 加起来是 1。
     （原来还有个「转一圈变颜色」的变身动作，观感不好，已经整个删掉了）
  -------------------------------------------- */
  const ACTS = [
    { name: 'dance',   p: 0.17, run: function (el, talk) {
        dance(el); talk('跟着我一起动起来！');
      } },
    { name: 'sing',    p: 0.16, run: function (el, talk) {
        sing(el); talk('♪ 一闪一闪亮晶晶～');
      } },
    { name: 'pat',     p: 0.12, run: function (el, talk) {
        play(el, 'head_pat', 3600); talk('嘿嘿，好痒！');
      } },
    { name: 'poke',    p: 0.11, run: function (el, talk) {
        play(el, 'poke', 3600); talk('你戳我啦～');
      } },
    { name: 'stretch', p: 0.10, run: function (el, talk) {
        play(el, 'idle_stretch', 3600); talk('伸个懒腰，继续加油！');
      } },
    { name: 'say',     p: 0.10, run: function (el, talk) {
        jump(el, '16px');
        talk(LINES[Math.floor(Math.random() * LINES.length)]);
      } },
    { name: 'yawn',    p: 0.08, run: function (el, talk) {
        play(el, 'idle_yawn', 3400); talk('哈～有点困，但我还陪着你');
      } },
    { name: 'eat',     p: 0.08, run: function (el, talk) {
        play(el, 'eat_token', 3800); talk('嗯嗯，吃饱了才有力气学习');
      } },
    /* 这两个是「小鲸在忙自己的事」，偶尔抽到会有点惊喜。
       working 是循环动作，自己不会停，所以手动定个 4 秒回待机 */
    { name: 'work',    p: 0.04, run: function (el, talk) {
        work(el);
        keep(el, setTimeout(function () { toIdle(el); }, 4200));
        talk('我在帮你整理错题本～');
      } },
    { name: 'tidy',    p: 0.04, run: function (el, talk) {
        work(el, 'command');
        keep(el, setTimeout(function () { toIdle(el); }, 4200));
        talk('等我一下，我把题目理一理');
      } }
  ];

  /**
   * 随机表演一个
   * @param {object} opt {line: 自定义「说话」出口}
   */
  function act(el, opt) {
    if (!el) return '';
    opt = opt || {};
    /* 没传 line 就自己冒泡 + 配音 */
    const talk = opt.line || function (t) { say(el, t); speakVoice(t); };

    let r = Math.random();
    for (let i = 0; i < ACTS.length; i++) {
      r -= ACTS[i].p;
      if (r <= 0) {
        ACTS[i].run(el, talk);
        return ACTS[i].name;
      }
    }
    /* 浮点误差兜底 */
    ACTS[ACTS.length - 1].run(el, talk);
    return ACTS[ACTS.length - 1].name;
  }

  /** 冒泡说话（只有气泡） */
  function say(el, text) {
    if (!el) return;
    const wrap = el.closest('.m-wrap') || el.parentElement;
    if (!wrap) return;
    let bubble = wrap.querySelector('.m-bubble');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'm-bubble';
      wrap.appendChild(bubble);
    }
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubble._t);
    bubble._t = setTimeout(function () { bubble.classList.remove('show'); }, 2600);
  }

  /** 冒泡 + 真的念出来 */
  function speak(el, text) {
    if (!el) return;
    say(el, text);
    speakVoice(text);
  }

  function poke(el) { act(el); }

  /**
   * 挂到容器并启动 idle 行为
   * @param {object} opt {click:false} 关掉自带的「点一下表演」
   */
  function mount(container, mood, opt) {
    if (!container) return null;
    opt = opt || {};
    const clip = MOOD[mood] || 'idle';
    container.innerHTML = svg(mood || 'happy');
    const el = container.querySelector('.mascot');
    if (!el) return null;

    if (clip === 'thinking') el.dataset.pin = '1';

    /* 一次性动作空闲时预载，别等孩子答对了才开始下载 */
    setTimeout(function () {
      ['success', 'error', 'thinking', 'head_pat', 'tail', 'poke'].forEach(preload);
    }, 1200);

    if (opt.click !== false) {
      el.addEventListener('click', function () { poke(el); });
    }
    return el;
  }

  SM.mascot = {
    svg: svg,
    mount: mount,
    setMood: setMood,
    play: play,
    jump: jump,
    shake: shake,
    look: look,
    autoLook: autoLook,
    dance: dance,
    sing: sing,
    wait: wait,
    work: work,
    lift: lift,
    drop: drop,
    bindDrag: bindDrag,
    act: act,
    poke: poke,
    say: say,
    speak: speak,
    preload: preload,
    CLIPS: CLIPS
  };

})(window.SM);
