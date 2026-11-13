/* ============================================================
   modules/vform.js — 动词后面接什么
   横线前面那个词，决定后面该用哪种形式：

     be good at + doing        is good at drawing
     How about + doing         How about beginning…
     Shall we + 动词原形        Shall we sing…?
     want to + 动词原形         wants to be a writer
     Let's + 动词原形           Let's cheer for them!
     help sb. (to) do          helps his teachers clean…

   这几个是四年级卷子上最爱考的搭配，也是孩子最爱错的地方 ——
   一律按「见动词就加 ing」或者「见动词就加 s」写。
   ============================================================ */
(function (SM) {
  'use strict';

  const U = SM.U, M = SM.M, Q = SM.quiz;

  /* 每个 builder 返回 { stem, right, wrongs, tip }
     stem 里的 ___ 就是要填的空，( ) 里给原形。 */
  const PATTERNS = [

    /* ---------- be good at + doing ---------- */
    function () {
      const sub = U.pick(['Lily', 'Amy', 'Tom', 'My sister', 'My brother', 'My friend']);
      const a = U.pick([
        { v: 'draw',  rest: '' },
        { v: 'swim',  rest: '' },
        { v: 'sing',  rest: '' },
        { v: 'dance', rest: '' },
        { v: 'cook',  rest: '' },
        { v: 'skate', rest: '' },
        { v: 'play football', rest: '' },
        { v: 'play the piano', rest: '' }
      ]);
      return {
        stem: sub + ' is good at ___ (' + a.v + ')'
              + (a.rest ? ' ' + a.rest : '') + '.',
        right: M.ingV(a.v),
        wrongs: [a.v, 'to ' + a.v, M.s3v(a.v)],
        tip: 'be good at 后面要跟动词的 -ing 形式，at 是介词。'
      };
    },

    /* ---------- How about + doing ---------- */
    function () {
      const a = U.pick([
        { v: 'begin', rest: 'with our project' },
        { v: 'visit', rest: 'the computer room' },
        { v: 'go',    rest: 'to the park' },
        { v: 'play',  rest: 'football' },
        { v: 'watch', rest: 'TV' },
        { v: 'read',  rest: 'this book' },
        { v: 'sing',  rest: 'a song' },
        { v: 'clean', rest: 'the classroom' }
      ]);
      return {
        stem: 'How about ___ (' + a.v + ') ' + a.rest + '?',
        right: M.ingV(a.v),
        wrongs: [a.v, 'to ' + a.v, M.s3v(a.v)],
        tip: 'How about 后面跟动词的 -ing 形式，about 是介词。'
      };
    },

    /* ---------- Shall we + 动词原形 ---------- */
    function () {
      const a = U.pick([
        { v: 'sing',  rest: 'a song for all the students' },
        { v: 'meet',  rest: 'in the reading room' },
        { v: 'go',    rest: 'to the zoo' },
        { v: 'play',  rest: 'basketball after school' },
        { v: 'watch', rest: 'TV now' },
        { v: 'visit', rest: 'the art room' },
        { v: 'clean', rest: 'the blackboard' }
      ]);
      return {
        stem: 'Shall we ___ (' + a.v + ') ' + a.rest + '?',
        right: a.v,
        wrongs: [M.s3v(a.v), M.ingV(a.v), 'to ' + a.v],
        tip: 'Shall we 后面跟动词原形，不加 s 也不加 ing。'
      };
    },

    /* ---------- want to + 动词原形 ---------- */
    function () {
      const a = U.pick([
        { sub: 'She',  want: 'wants',       v: 'be', rest: 'a writer' },
        { sub: 'He',   want: 'wants',       v: 'be', rest: 'a doctor' },
        { sub: 'Ben',  want: 'wants',       v: 'be', rest: 'a painter' },
        { sub: 'I',    want: 'want',        v: 'be', rest: 'a teacher' },
        { sub: 'They', want: 'want',        v: 'be', rest: 'painters' },
        { sub: 'Ben',  want: 'doesn\'t want', v: 'fall', rest: '' },
        { sub: 'They', want: 'want',        v: 'go', rest: 'to the park' },
        { sub: 'She',  want: 'wants',       v: 'read', rest: 'this book' }
      ]);
      return {
        stem: a.sub + ' ' + a.want + ' ___ (' + a.v + ')'
              + (a.rest ? ' ' + a.rest : '') + '.',
        right: 'to ' + a.v,
        wrongs: [a.v, M.ingV(a.v), M.s3v(a.v)],
        tip: 'want 后面要跟 to + 动词原形，写成 want do 是错的。'
      };
    },

    /* ---------- Let's + 动词原形 ---------- */
    function () {
      const a = U.pick([
        { v: 'cheer', rest: 'for them' },
        { v: 'go',    rest: 'to the park' },
        { v: 'play',  rest: 'football' },
        { v: 'sing',  rest: 'a song' },
        { v: 'clean', rest: 'the classroom' },
        { v: 'watch', rest: 'TV' }
      ]);
      return {
        stem: 'Let\'s ___ (' + a.v + ') ' + a.rest + '!',
        right: a.v,
        wrongs: [M.s3v(a.v), M.ingV(a.v), 'to ' + a.v],
        tip: 'Let\'s 后面跟动词原形，Let\'s = Let us。'
      };
    },

    /* ---------- help sb. (to) do ----------
       clean 和 to clean 都对，判分两个都认 ——
       help sb. do 和 help sb. to do 都是标准英语，只认一个就是冤枉孩子。 */
    function () {
      const a = U.pick([
        { sub: 'Ben',  help: 'often helps', sb: 'his teachers', v: 'clean', rest: 'the blackboard' },
        { sub: 'She',  help: 'often helps', sb: 'her mother',   v: 'wash',  rest: 'the dishes' },
        { sub: 'I',    help: 'often help',  sb: 'my sister',    v: 'carry', rest: 'the box' },
        { sub: 'Tom',  help: 'often helps', sb: 'his friend',   v: 'draw',  rest: 'a picture' },
        { sub: 'You',  help: 'can help',    sb: 'me',           v: 'carry', rest: 'this box' }
      ]);
      return {
        stem: a.sub + ' ' + a.help + ' ' + a.sb + ' ___ (' + a.v + ') ' + a.rest + '.',
        right: [a.v, 'to ' + a.v],
        wrongs: [M.s3v(a.v), M.ingV(a.v), M.past(a.v)],
        tip: 'help sb. 后面跟动词原形，也可以加 to（help sb. to do），两种都对。'
      };
    }
  ];

  function gen() {
    const b = U.pick(PATTERNS)();

    /* 一半选择、一半填空 —— 卷子上这两种都考 */
    if (U.rand(2) === 0) {
      const right = Array.isArray(b.right) ? b.right[0] : b.right;
      return Q.choice(b.stem, right, b.wrongs, b.tip);
    }
    const prompt = '用所给词的适当形式填空：\n' + b.stem;
    return Q.I(prompt, b.right, b.tip, 1);
  }

  SM.register({
    id: 'vform',
    name: '动词后接什么',
    sub: 'doing / to do / 原形',
    ico: '🔗',
    c1: '#C6A8FF', c2: '#A57BF5', cd: '#7B52C9',
    L: [
      { h: '为什么要看前面的词？', b: '动词后面填什么形式，不取决于动词本身，而取决于它前面那个词。前面是介词，就填 -ing；前面是 to，就填原形。',
        e: [['be good at drawing', 'at 是介词，用 doing'], ['want to be a writer', 'to 后面用原形']] },
      { h: 'be good at + doing', b: '「擅长做某事」。at 是介词，后面动词要加 ing。',
        e: [['Lily is good at drawing.', '莉莉擅长画画。'], ['He is good at swimming.', '他擅长游泳。']] },
      { h: 'How about + doing', b: '「……怎么样？」about 也是介词，后面同样用 ing。',
        e: [['How about visiting the computer room?', '去参观电脑房怎么样？'], ['How about beginning with our project?', '从我们的项目开始怎么样？']] },
      { h: 'Shall we + 动词原形', b: '「我们……好吗？」后面用原形，不加 s 也不加 ing。',
        e: [['Shall we sing a song?', '我们唱首歌好吗？'], ['Shall we meet in the reading room?', '我们在阅览室见面好吗？']] },
      { h: 'want to + 动词原形', b: 'want 后面必须跟 to，再接原形。想说「想当……」，就是 want to be。',
        e: [['She wants to be a writer.', '她想当作家。'], ['He doesn\'t want to fall.', '他不想摔倒。']] },
      { h: 'Let\'s + 动词原形', b: '「我们一起……吧」。Let\'s = Let us，后面用原形。',
        e: [['Let\'s cheer for them!', '我们为他们加油吧！'], ['Let\'s go to the park.', '我们去公园吧。']] },
      { h: 'help sb. (to) do', b: '「帮某人做某事」。help 后面跟原形，加不加 to 都可以。',
        e: [['Ben helps his teachers clean the blackboard.', ''], ['Can you help me carry the box?', '']] },
      { h: '最容易错的地方', b: '看见动词就随手加 s，或者随手加 ing。先看横线前面是什么词，再决定填什么。',
        e: [['Shall we sings?', '✘ 应该是 Shall we sing?'], ['How about to visit?', '✘ 应该是 How about visiting?']] }
    ],
    gen: function (n) { return Q.uniq(n, gen); }
  });

})(window.SM);
