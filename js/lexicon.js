/* ============================================================
   lexicon.js — 词库 + 英语变形规则
   题目由「句型模板 × 词库 × 变形规则」现场生成，不依赖预制题
   ============================================================ */
(function (SM) {
  'use strict';

  const LEX = {};

  /* ---------------- 主语 ----------------
     k 决定这个主语「能做什么」：
       p = 人    a = 动物    t = 东西（车、物品）
     加这一项是为了防止出现「猫做作业」「公交车唱歌」这种讲不通的句子。
     It 统一按动物算 —— 课本里的 It 多半指小动物，配动物的动词最稳妥。
     adult 用来排掉「做作业」这种学生专属的事（我爸爸做作业 ×）。
     noSchool 排掉「去上学 / 走路上学」（我爸爸走路上学 ×）。
     注意 My teacher 只加 adult 不加 noSchool —— 老师确实去学校。
  -------------------------------------------- */
  LEX.subjects = [
    { s: 'I',            p: 'i',    cn: '我',         k: 'p' },
    { s: 'You',          p: 'you',  cn: '你',         k: 'p' },
    { s: 'He',           p: 'he',   cn: '他',         k: 'p' },
    { s: 'She',          p: 'she',  cn: '她',         k: 'p' },
    { s: 'It',           p: 'it',   cn: '它',         k: 'a' },
    { s: 'We',           p: 'we',   cn: '我们',       k: 'p' },
    { s: 'They',         p: 'they', cn: '他们',       k: 'p' },
    { s: 'Tom',          p: 'he',   cn: '汤姆',       k: 'p' },
    { s: 'Amy',          p: 'she',  cn: '艾米',       k: 'p' },
    { s: 'Jack',         p: 'he',   cn: '杰克',       k: 'p' },
    { s: 'Lily',         p: 'she',  cn: '莉莉',       k: 'p' },
    { s: 'My father',    p: 'he',   cn: '我爸爸',     k: 'p', adult: 1, noSchool: 1 },
    { s: 'My mother',    p: 'she',  cn: '我妈妈',     k: 'p', adult: 1, noSchool: 1 },
    { s: 'My brother',   p: 'he',   cn: '我哥哥',     k: 'p' },
    { s: 'My sister',    p: 'she',  cn: '我妹妹',     k: 'p' },
    { s: 'My teacher',   p: 'he',   cn: '我的老师',   k: 'p', adult: 1 },
    { s: 'The boy',      p: 'he',   cn: '那个男孩',   k: 'p' },
    { s: 'The girl',     p: 'she',  cn: '那个女孩',   k: 'p' },
    { s: 'The cat',      p: 'it',   cn: '那只猫',     k: 'a' },
    { s: 'The dog',      p: 'it',   cn: '那只狗',     k: 'a' },
    { s: 'The bus',      p: 'it',   cn: '那辆公交车', k: 't' },
    { s: 'The students', p: 'they', cn: '那些学生',   k: 'p' },
    { s: 'My parents',   p: 'they', cn: '我父母',     k: 'p', adult: 1, noSchool: 1 },
    { s: 'The boys',     p: 'they', cn: '那些男孩',   k: 'p' },
    { s: 'Tom and Amy',  p: 'they', cn: '汤姆和艾米', k: 'p' },
    { s: 'My friends',   p: 'they', cn: '我的朋友们', k: 'p' }
  ];

  /* ---------------- 动词（原形 + 宾语，{POSS} 按主语性别替换） ----------------
     按主语类型分三组：人做的 / 动物做的 / 东西能做的。
     每组里的句子都要念得通 —— 这是「题目逻辑」的底线。
     kidOnly：只有上学的孩子才会做（做作业），大人主语要排掉。

     还有两个字段管「状语配不配」：
       advs    这个动词自带的状语（状态动词用），给了就不再抽通用频率状语
       noAdv   完全不能带状语（have 表「拥有」）
       badAdv  排斥的状语（做晚饭不能配「每天早上」）
     状态动词（like / have）配频率状语是错的：「她每个周末喜欢音乐」讲不通。
  -------------------------------------------- */
  const V_PERSON = [
    { b: 'play',  obj: 'football',        cn: '踢足球' },
    { b: 'play',  obj: 'basketball',      cn: '打篮球' },
    { b: 'play',  obj: 'the piano',       cn: '弹钢琴' },
    /* like 是状态动词：只能配「很 / 非常」，不能配 every day 这类频率 */
    { b: 'like',  obj: 'apples',          cn: '喜欢苹果', advs: ['very much', 'a lot'] },
    { b: 'like',  obj: 'music',           cn: '喜欢音乐', advs: ['very much', 'a lot'] },
    { b: 'like',  obj: 'drawing',         cn: '喜欢画画', advs: ['very much', 'a lot'] },
    { b: 'watch', obj: 'TV',              cn: '看电视' },
    /* 上学只配「每天 / 每天早上」——「每周日去上学」「晚上去上学」都讲不通。
       这里用白名单（advs）而不是黑名单，省得漏一个。
       schoolOnly：只有学生和老师会「去上学」，爸爸不会。 */
    { b: 'go',    obj: 'to school',       cn: '去上学', advs: ['every day', 'every morning'], schoolOnly: 1 },
    /* 去睡觉配「早点」才自然 —— 光说「Lily doesn't go to bed.」等于说
       她从来不睡觉，讲不通。加上 early 之后各种句型都成立。 */
    { b: 'go',    obj: 'to bed early',    cn: '早睡', advs: ['every day', 'every evening', 'every night'] },
    { b: 'do',    obj: '{POSS} homework', cn: '做作业', kidOnly: 1 },
    /* have 表「拥有」，是状态，不带任何状语。
       pl：复数主语要换复数宾语 —— 「The students have a new bike.」
       一个班共用一辆自行车，不合常理。 */
    { b: 'have',  obj: 'a new bike',      pl: 'new bikes', cn: '有一辆新自行车', noAdv: 1 },
    { b: 'have',  obj: 'a red pen',       pl: 'red pens',  cn: '有一支红钢笔',   noAdv: 1 },
    { b: 'study', obj: 'English',         cn: '学英语' },
    { b: 'read',  obj: 'books',           cn: '读书' },
    { b: 'clean', obj: 'the room',        cn: '打扫房间' },
    { b: 'wash',  obj: 'the dishes',      cn: '洗碗' },
    { b: 'fly',   obj: 'kites',           cn: '放风筝', badAdv: ['every night'] },
    { b: 'cook',  obj: 'dinner',          cn: '做晚饭', badAdv: ['every morning'] },
    /* 复数主语不能共用「一个妈妈」—— 「Do your parents help their mother?」
       父母不共用一个妈，讲不通。复数换成 parents（帮的是外公外婆）。 */
    { b: 'help',  obj: '{POSS} mother',   pl: '{POSS} parents', cn: '帮妈妈' },
    { b: 'draw',  obj: 'pictures',        cn: '画画' },
    { b: 'eat',   obj: 'bananas',         cn: '吃香蕉' },
    { b: 'drink', obj: 'milk',            cn: '喝牛奶' },
    { b: 'walk',  obj: 'to school',       cn: '走路上学', advs: ['every day', 'every morning'], schoolOnly: 1 },
    /* teach us English 不能用 —— 主语是 I 时变成「我教我们英语」，
       把自己也算进被教的人里，语义矛盾。教英语本身没问题。 */
    { b: 'teach', obj: 'English',         cn: '教英语' },
    /* 刷牙是每天的事，配 every weekend / on Sundays 讲不通，用白名单钉死 */
    { b: 'brush', obj: '{POSS} teeth',    cn: '刷牙', advs: ['every day', 'every morning', 'every evening'] },
    { b: 'water', obj: 'the flowers',     cn: '浇花' }
  ];

  const V_ANIMAL = [
    { b: 'eat',   obj: 'fish',        cn: '吃鱼' },
    { b: 'drink', obj: 'milk',        cn: '喝牛奶' },
    { b: 'like',  obj: 'fish',        cn: '喜欢鱼',   advs: ['very much', 'a lot'] },
    { b: 'like',  obj: 'music',       cn: '喜欢音乐', advs: ['very much', 'a lot'] },
    /* 跑得快 / 跳得高 / 游得好 说的是「怎么样」，不是「多久一次」。
       配 every night 会出来「狗每天晚上跳得高」，读着别扭，所以不带状语。 */
    { b: 'run',   obj: 'fast',        cn: '跑得快', noAdv: 1 },
    { b: 'jump',  obj: 'high',        cn: '跳得高', noAdv: 1 },
    { b: 'play',  obj: 'with a ball', cn: '玩球' },
    { b: 'catch', obj: 'mice',        cn: '抓老鼠' },
    { b: 'sleep', obj: 'a lot',       cn: '睡得多' },
    { b: 'swim',  obj: 'well',        cn: '游得好', noAdv: 1 }
  ];

  const V_THING = [
    { b: 'go',    obj: 'to the city',        cn: '去城里' },
    /* 以前是 stop at the school gate。问题是「The bus」+「stop」会连成
       「the bus stop」（公交车站）这个名词，填空题里
       「___ the bus stop at the school gate?」填 Is 也成立，答案就不唯一了。
       换成 pass —— 「The bus passes the school.」没有歧义。 */
    { b: 'pass',  obj: 'the school',         cn: '经过学校' },
    { b: 'come',  obj: 'at seven',           cn: '七点来' },
    /* 以前是 four wheels —— 公交车轮子有几个说不清（4 个、6 个都有），
       小学生较真起来会觉得题目错了。换成座位数，任何公交车都成立。 */
    { b: 'have',  obj: 'many seats',         cn: '有很多座位', noAdv: 1 },
    { b: 'carry', obj: 'many people',        cn: '载很多人' }
  ];

  LEX.verbsBy = { p: V_PERSON, a: V_ANIMAL, t: V_THING };
  LEX.verbs = V_PERSON;   // 兼容旧引用（默认按「人」）

  /* ---------------- 时间状语 ---------------- */
  LEX.advs = ['every day', 'every morning', 'every evening', 'after school', 'on Sundays', 'every weekend', 'every night'];

  /* after school / on Sundays 只有上学的孩子才用得上，动物和车不用 */
  const SCHOOL_ADV = { 'after school': 1, 'on Sundays': 1 };

  /* ---------------- be 动词后的表语 ----------------
     k 缺省表示「谁都能用」；有 k 就只在对应主语上出现。

     pl：复数主语要换复数表语。以前 The students 会配 a teacher，
         生成「The students are a teacher.」—— 主表单复数打架。
     noSubj：主语本身已经是这个词，再配就成废话，或者干脆自相矛盾。
         「My teacher is a teacher.」 废话
         「The students are students.」 废话
         「The students are teachers.」 语法没错，但学生不是老师
         按主语的 cn 做包含判断，够用且不会误伤。
     noAdult：只有孩子才当得上的身份，大人主语要排掉。
         「My mother is a good student.」 语法没问题，但读着别扭。 */
  LEX.preds = [
    { p: 'a teacher',        pl: 'teachers',        cn: '一位老师',   k: ['p'], noSubj: ['老师', '学生'] },
    { p: 'a doctor',         pl: 'doctors',         cn: '一位医生',   k: ['p'] },
    { p: 'a student',        pl: 'students',        cn: '一名学生',   k: ['p'], noSubj: ['学生', '老师'], noAdult: 1 },
    { p: 'a good student',   pl: 'good students',   cn: '一个好学生', k: ['p'], noSubj: ['学生', '老师'], noAdult: 1 },
    { p: 'in the classroom', pl: 'in the classroom', cn: '在教室里',  k: ['p'] },
    { p: 'happy',            cn: '开心',       k: ['p', 'a'] },
    { p: 'tired',            cn: '累',         k: ['p', 'a'] },
    { p: 'hungry',           cn: '饿',         k: ['p', 'a'] },
    { p: 'very kind',        cn: '很和善',     k: ['p', 'a'] },
    { p: 'at home',          cn: '在家',       k: ['p', 'a'] },
    /* 十二岁是孩子的年龄。不加 noAdult 会出来「My parents are twelve years old.」 */
    { p: 'twelve years old', cn: '十二岁',     k: ['p', 'a'], noAdult: 1 },
    { p: 'from China',       cn: '来自中国',   k: ['p', 'a'] },
    { p: 'red',              cn: '红色的',     k: ['t'] },
    { p: 'at the bus stop',  cn: '在公交车站', k: ['t'] },
    { p: 'full of people',   cn: '挤满了人',   k: ['t'] }
  ];

  /* ---------------- 情态动词 can 后面的动作 ---------------- */
  LEX.canDo = [
    { v: 'swim',           cn: '游泳',     k: ['p', 'a'] },
    { v: 'run fast',       cn: '跑得快',   k: ['p', 'a'] },
    { v: 'jump high',      cn: '跳得高',   k: ['p', 'a'] },
    { v: 'climb the tree', cn: '爬树',     k: ['p', 'a'] },
    { v: 'catch mice',     cn: '抓老鼠',   k: ['a'] },
    { v: 'dance',          cn: '跳舞',     k: ['p'] },
    { v: 'sing',           cn: '唱歌',     k: ['p'] },
    { v: 'play the piano', cn: '弹钢琴',   k: ['p'] },
    { v: 'ride a bike',    cn: '骑自行车', k: ['p'] },
    { v: 'speak English',  cn: '说英语',   k: ['p'] },
    { v: 'play chess',     cn: '下棋',     k: ['p'] },
    { v: 'cook',           cn: '做饭',     k: ['p'] },
    { v: 'draw well',      cn: '画得好',   k: ['p'] }
  ];

  /* ============================================================
     按主语挑词 —— 题目逻辑的关键
     每个 pick 都先过这一层，就不会再出现「猫打篮球」这种句子
     ============================================================ */
  function fit(list, kind) {
    return list.filter(function (x) { return !x.k || x.k.indexOf(kind) >= 0; });
  }

  /** 这个主语能搭配的动词（东西那组很短，但一定有） */
  LEX.verbsFor = function (subj) {
    const kind = (subj && subj.k) || 'p';
    let pool = LEX.verbsBy[kind] || LEX.verbsBy.p;
    if (subj && subj.adult) {
      pool = pool.filter(function (v) { return !v.kidOnly; });
    }
    if (subj && subj.noSchool) {
      pool = pool.filter(function (v) { return !v.schoolOnly; });
    }
    /* 过滤完可能变空（理论上不会），退回人做的动词但要再过一遍筛子 */
    if (!pool.length) {
      pool = LEX.verbsBy.p.filter(function (v) {
        return !(subj && subj.adult && v.kidOnly) && !(subj && subj.noSchool && v.schoolOnly);
      });
    }
    return pool.length ? pool : LEX.verbsBy.p;
  };

  /**
   * 这个主语能配哪些表语。
   * 除了按主语类型（人 / 动物 / 东西）筛，还要排掉「废话表语」——
   * 主语是「我的老师」就别再配「一位老师」。
   */
  LEX.predsFor = function (kind, subj) {
    let r = fit(LEX.preds, kind || 'p');
    if (subj) {
      /* 大人不配「学生」这类孩子身份 */
      if (subj.adult) r = r.filter(function (x) { return !x.noAdult; });
      /* 主语是「我的老师」就别再配「一位老师」 */
      if (subj.cn) {
        r = r.filter(function (x) {
          if (!x.noSubj) return true;
          return !x.noSubj.some(function (w) { return subj.cn.indexOf(w) >= 0; });
        });
      }
    }
    return r.length ? r : fit(LEX.preds, kind || 'p');
  };

  /* we / they 算复数。you 不算 —— 「You are a teacher.」对一个人说是对的。 */
  LEX.isPlural = function (subj) {
    return !!(subj && (subj.p === 'they' || subj.p === 'we'));
  };

  /**
   * 表语按主语的单复数取形式。
   * a teacher → teachers（The students are teachers.）
   */
  LEX.predText = function (pred, subj) {
    if (!pred) return '';
    return (LEX.isPlural(subj) && pred.pl) ? pred.pl : pred.p;
  };

  /**
   * 动词宾语按主语取形式。
   * 复数主语要把 a new bike 变成 new bikes ——
   * 「The students have a new bike.」一个班共用一辆自行车，不合常理。
   * person 用于人称转换（I → you 时要换成 your）。
   */
  LEX.objFor = function (v, subj, person) {
    if (!v) return '';
    const who = person || (subj && subj.p) || 'it';
    if (LEX.isPlural(subj) && v.pl) return M.fillPoss(v.pl, who);
    return M.fillPoss(v.obj, who);
  };

  /** 可能为空 —— 车不会「会做某事」，调用方要判断 */
  LEX.canDoFor = function (kind) { return fit(LEX.canDo, kind || 'p'); };

  /**
   * 这个「主语 + 动词」能配哪些时间状语。
   * 返回空数组表示这句话不该带状语（have 表拥有）。
   *
   * 四道筛子：
   *   ① 动词自带状语（like → very much / a lot），给了就不再抽通用频率
   *   ② 动物和东西没有「放学后」「每周日」
   *   ③ 大人不放学 —— 以前只按 kind 过滤，会出现
   *      「My father goes to school after school.」
   *   ④ 动词自己排斥的时段（做晚饭不能配「每天早上」）
   */
  LEX.advsFor = function (kind, subj, verb) {
    if (verb && verb.advs) return verb.advs;
    if (verb && verb.noAdv) return [];

    let list = LEX.advs;
    if (kind && kind !== 'p') {
      list = list.filter(function (a) { return !SCHOOL_ADV[a]; });
    }
    if (subj && subj.adult) {
      list = list.filter(function (a) { return a !== 'after school'; });
    }
    if (verb && verb.badAdv) {
      list = list.filter(function (a) { return verb.badAdv.indexOf(a) < 0; });
    }
    return list.length ? list : ['every day'];
  };

  /* ---------------- 祈使句动作 ----------------
     不用「动词 + 介词/副词」这种可分离短语（turn on the light / put on your coat）——
     词块题里 Turn|on|the|light 也能拼成 Turn the light on.，
     两个都对，判分只能判一个，等于冤枉孩子。 */
  LEX.impYes = [
    { v: 'open the door',      cn: '打开门' },
    { v: 'close the window',   cn: '关上窗户' },
    { v: 'sit down',           cn: '坐下' },
    { v: 'stand up',           cn: '站起来' },
    { v: 'come in',            cn: '进来' },
    { v: 'clean the blackboard', cn: '擦黑板' },
    { v: 'wash your hands',    cn: '洗手' },
    { v: 'listen to me',       cn: '听我说' },
    { v: 'read this book',     cn: '读这本书' },
    { v: 'answer my question', cn: '回答我的问题' }
  ];

  LEX.impNo = [
    { v: 'run in the classroom',      cn: '在教室里跑' },
    { v: 'talk in class',             cn: '上课讲话' },
    { v: 'eat in the library',        cn: '在图书馆吃东西' },
    { v: 'play football in the street', cn: '在街上踢足球' },
    { v: 'make noise',                cn: '吵闹' },
    { v: 'touch the door',            cn: '摸门' },
    { v: 'swim in the river',         cn: '在河里游泳' },
    { v: 'climb the tree',            cn: '爬树' }
  ];

  /* ---------------- be 动词祈使句的形容词 ----------------
     肯定和否定得分成两组，不能混用：
       「Be careful!」是好话，「Don't be careful.」是教孩子「不要小心」——
       语义上反常识，AI 体检直接判了错。
     分界线是「这个形容词是不是孩子该有的好状态」：
       好状态 → 只能用在肯定句（Be quiet! ✓ / Don't be quiet. ✗）
       坏状态 → 只能用在否定句（Don't be late! ✓ / Be late. ✗）
  -------------------------------------------- */
  LEX.impBePos = [
    { v: 'careful', cn: '小心' },
    { v: 'quiet',   cn: '安静' },
    { v: 'happy',   cn: '开心' },
    { v: 'brave',   cn: '勇敢' },
    { v: 'polite',  cn: '有礼貌' }
  ];

  LEX.impBeNeg = [
    { v: 'late',     cn: '迟到' },
    { v: 'afraid',   cn: '害怕' },
    { v: 'sad',      cn: '难过' },
    { v: 'angry',    cn: '生气' },
    { v: 'lazy',     cn: '懒' },
    { v: 'careless', cn: '粗心' },
    { v: 'noisy',    cn: '吵闹' }
  ];

  /* 旧名保留，指向肯定组（其余地方按肯定句用） */
  LEX.impBe = LEX.impBePos;

  /* ---------------- 特殊疑问词：问句 ↔ 答语 配对 ---------------- */
  LEX.wh = [
    {
      w: 'When', hint: '问时间',
      /* 迷惑项：都长得像时间答语（At/On/In 开头），但不是具体时间。
         不放 Every day. —— 「When do you have an English class?」
         答 Every day. 其实也说得通（问频率），答案就不唯一了。
         也不能全是地点短语 —— 三个都是地点，孩子认出 where 就一次排掉三个。
         掺一个方式（By bike）、一个原因（Because…），才逼他逐个看。 */
      foil: ['At home.', 'In China.', 'By bike.', 'Because it is fun.'],
      items: [
        /* alt：同样是正确答案的写法。填空题判分要认，
           不然孩子填了完全正确的 What time 却被判错，比不做还伤。
           只有「几点钟」这种答语才适用 —— 生日、星期、放学后都不行。 */
        { q: '___ do you get up?', a: 'At six thirty.', alt: ['What time'] },
        { q: '___ is your birthday?', a: 'It is in May.' },
        { q: '___ do you have an English class?', a: 'On Monday.' },
        { q: '___ does he go to school?', a: 'At seven o\'clock.', alt: ['What time'] },
        { q: '___ do they play football?', a: 'After school.' }
      ]
    },
    {
      w: 'Where', hint: '问地点',
      /* 迷惑项：同样是 At/On/In 开头的介词短语，但说的是时间。
         最后两条故意不写成 'It is in May.' —— 会和 'In May.' 同时抽到，
         屏幕上两个 May 看着像重复，换成 'It is Monday.' 反而更像。

         光有时间干扰项也不够：碰上「Where are you from?」三个选项全是时间状语，
         孩子认出 where 就能一次排掉三个。所以再补三条「答非所问但不靠疑问词就能排除」的
         —— 介词混淆（in / from）、人称混淆（He / I）、答成年龄。 */
      foil: ['At six thirty.', 'On Monday.', 'In May.', 'At seven o\'clock.', 'Every night.',
             'It is at six thirty.', 'It is Monday.',
             'I am in China.', 'He is from China.', 'I am ten years old.'],
      items: [
        { q: '___ is the cat?', a: 'It is under the chair.' },
        { q: '___ is my book?', a: 'It is on the desk.' },
        { q: '___ are you from?', a: 'I am from China.' },
        { q: '___ does she work?', a: 'She works in a hospital.' },
        { q: '___ do you have lunch?', a: 'At school.' }
      ]
    },
    {
      w: 'Who', hint: '问人',
      /* 注意：这里绝对不能放职业（He is a doctor.）。
         「Who is that man?」用职业回答是说得通的，放进来就成了第二个正确答案。
         也不能放「It is a bag.」这种跟人完全无关的答语 ——
         问英语老师是谁，答「是个包」，孩子一眼就排除，等于白送。 */
      foil: ['He is ten.', 'He is at home.', 'He is fine.', 'She is at school.',
             'It is Amy\'s.', 'My name is Lily.'],
      items: [
        { q: '___ is that boy?', a: 'He is my brother.' },
        { q: '___ is your English teacher?', a: 'Mr. Green.' },
        { q: '___ is the girl in red?', a: 'She is Amy.' },
        { q: '___ is that man?', a: 'He is my uncle.' }
      ]
    },
    {
      w: 'What', hint: '问东西/事情',
      /* 迷惑项：人名、所有格、职业 —— 都像在回答 What，其实答的是 Who/Whose。
         带 They are… 的是给复数问句准备的，否则孩子靠单复数就能排除。 */
      foil: ['He is my brother.', 'She is Amy.', 'Mr. Green.', 'It is Amy\'s.',
             'It is under the chair.', 'They are Tom\'s.', 'They are my brothers.'],
      /* What 是个大筐：问名字、问东西、问动作、问职业都行，
         所以每题还得有自己的 foil，否则通用 foil 会跨到别的小类去。 */
      items: [
        { q: '___ is your name?', a: 'My name is Lily.',
          /* 不放 I am Lily. —— 它也是完全正确的答语（课本里 I'm Lily 和
             My name is Lily 都教），摆进来就是两个正确答案。 */
          foil: ['She is Lily.', 'It is Lily\'s.', 'He is a student.', 'I am ten.'] },
        { q: '___ are these?', a: 'They are apples.',
          foil: ['It is an apple.', 'They are red.', 'They are mine.', 'They are on the desk.'] },
        { q: '___ is your favourite fruit?', a: 'Apples.',
          foil: ['It is red.', 'Yes, I do.', 'Because it is sweet.', 'I like it very much.'] },
        { q: '___ are you doing?', a: 'I am reading.',
          /* 四个干扰项全是 I am + X，只差最后一个词 */
          foil: ['I am fine.', 'I am ten.', 'I am at home.', 'I am a student.'] },
        { q: '___ does your father do?', a: 'He is a doctor.',
          foil: ['He is fine.', 'He is ten.', 'He is at home.', 'He is my uncle.'] }
      ]
    },
    {
      w: 'Whose', hint: '问归属',
      /* 迷惑项都围着这道题的物品打转，只是答错了方向：
           It is Amy.        少一个 's —— 这是最经典的错误
           They are Tom.     复数也少 's
           She is Amy.       和 It is Amy's. 只差一个 's
           They are on the desk.  答成了 Where
           It is blue. / They are red.  答成了 What color
         不放「It is a bag.」「He is my brother.」这种跟铅笔毫无关系的答语 ——
         一眼排除，白送；也不放 Mr. Green. 这种光有人名的残句。 */
      foil: ['She is Amy.', 'It is Amy.', 'They are Tom.', 'They are on the desk.',
             'It is blue.', 'They are red.'],
      items: [
        { q: '___ bag is this?', a: 'It is Amy\'s.' },
        { q: '___ pencil is that?', a: 'It is mine.' },
        { q: '___ books are these?', a: 'They are Tom\'s.' },
        { q: '___ dog is it?', a: 'It is Lily\'s.' }
      ]
    },
    {
      w: 'How many', hint: '问可数数量',
      /* 迷惑项：全是「不可数 / 价钱 / 是非 / 地点」的答语 —— 和 How much 正好搞反。
         以前还放 A lot of water. / Two cups of milk.，问题是这两个直接点名了
         水、牛奶，碰上「How many pens are in the bag?」一眼就能靠名词排除，
         等于没考。现在只留「数量味」的词，不出现具体名词。
         Much. / Very much. 也不能同时出现 —— 意思几乎一样，区别度太低。 */
      foil: ['A little.', 'It is ten yuan.', 'Yes, I do.', 'On the desk.'],
      items: [
        { q: '___ books do you have?', a: 'I have five.' },
        /* 答语写成完整句子，不写光秃秃的 Six. ——
           反向题里「— Six.」配「How much is the book?」也说得通（六块钱），
           答案就不唯一了。「There are six.」只有 how many 接得住。 */
        { q: '___ apples are there on the table?', a: 'There are six.' },
        { q: '___ pens are in the bag?', a: 'There are three.' },
        { q: '___ students are in the classroom?', a: 'There are twenty.' }
      ]
    },
    {
      w: 'How much', hint: '问不可数数量/价钱',
      /* 迷惑项：全是「可数数字」的答语 —— 和 How many 正好搞反。
         不出现具体名词：Twenty pens. 这种一看到 pens 就知道跟水无关，白送。 */
      foil: ['Three.', 'Six.', 'I have five.', 'Many.', 'A lot of them.'],
      items: [
        { q: '___ milk is there in the glass?', a: 'A little.',
          /* 不放 In the glass. —— 题干里就有 in the glass，答语原样重复一遍，
             孩子不用懂知识点就能排除。 */
          foil: ['Three.', 'It is ten yuan.', 'Yes, there is.', 'A few.'] },
        { q: '___ is the book?', a: 'It is ten yuan.',
          foil: ['It is Monday.', 'It is blue.', 'It is a book.', 'It is on the desk.'] },
        /* 以前这里是 A little water. —— 它本身就是正确答案，
           「How much water do you drink every day?」答 A little water. 完全说得通，
           等于给了两个对的选项。换成 A few.：可数/不可数的经典混淆，才是真干扰。 */
        { q: '___ water do you drink every day?', a: 'Two cups.',
          foil: ['A few.', 'Yes, I do.', 'In the morning.', 'I like water.'] },
        { q: '___ is this bag?', a: 'It is fifty yuan.',
          foil: ['It is blue.', 'It is on the chair.', 'It is Amy\'s.', 'It is a bag.'] }
      ]
    },
    {
      w: 'How', hint: '问方式/状态',
      /* 这组题目差异大，迷惑项按题单给，见每题的 foil */
      foil: ['He is ten.', 'It is blue.', 'At six thirty.', 'Mr. Green.'],
      items: [
        { q: '___ do you go to school?', a: 'By bus.',
          foil: ['On bus.', 'In a bus.', 'By foot.', 'With bus.'] },
        { q: '___ is your father?', a: 'He is fine.',
          foil: ['He is ten.', 'He is a doctor.', 'He is my uncle.', 'He is at home.'] },
        { q: '___ do you spell it?', a: 'B-O-O-K.',
          /* 以前有 'B-O-O-K is it.' —— 语序不成立，是句病句，
             孩子一眼排除还会顺手记个错的。换成三个「答非所问」但本身正确的句子。 */
          foil: ['Yes, I do.', 'It is a book.', 'It is on the desk.', 'I like it.'] },
        { q: '___ is the weather today?', a: 'It is sunny.',
          foil: ['It is Monday.', 'It is ten yuan.', 'It is blue.', 'It is under the tree.'] }
      ]
    },
    {
      w: 'How old', hint: '问年龄',
      /* 迷惑项：都是「人称 + is/am + 形容词/名词」的答语，只有数字才对。
         I / He / She 三种人称都备着，免得问 She 却只给 I 和 He 的答语。 */
      foil: ['I am fine.', 'I am from China.', 'I am at school.',
             'He is fine.', 'He is a doctor.', 'He is at school.',
             'She is fine.', 'She is a teacher.', 'She is at school.',
             'It is ten yuan.'],
      items: [
        { q: '___ are you?', a: 'I am nine.' },
        { q: '___ is your sister?', a: 'She is seven.' },
        { q: '___ is Tom?', a: 'He is ten.' }
      ]
    },
    {
      w: 'What color', hint: '问颜色',
      /* 迷惑项：同样是 'It is + 形容词/名词'，但不是颜色。
         不放 'It is a bag.' —— 问颜色答「是个包」，跟颜色毫无关系，一眼排除。 */
      foil: ['It is sunny.', 'It is ten yuan.', 'It is Amy\'s.',
             'It is under the chair.', 'They are ten yuan.', 'They are under the chair.'],
      items: [
        { q: '___ is your bag?', a: 'It is blue.' },
        { q: '___ is the cat?', a: 'It is black and white.' },
        { q: '___ are the flowers?', a: 'They are red.' }
      ]
    }
  ];

  /* ============================================================
     名词单复数
     ------------------------------------------------------------
     pl 全部手写，不靠规则推。规则推不出 photo → photos 和
     potato → potatoes 的差别，也推不出 child → children。
     一个词推错就等于教错，所以宁可一个个列。

     art 不定冠词（an apple，不能写 a apple）
     ns  没有「一个」的说法（a half / a kilo 站不住），改写题跳过
     nf  不放进造句框（牙、脚放进「那边有三个…」很别扭），只做词形题
     np  不进选择题（persons 在正式英语里成立，答案不唯一）
     ab  抽象或不好指着说的词（story、party），只做改写题，
         不然会出来「I can see five days in the picture.」
     ============================================================ */
  const NOUN_RAW = [
    /* 规则变化：直接加 s */
    ['book', 'books', '书'],
    ['pen', 'pens', '钢笔'],
    ['pencil', 'pencils', '铅笔'],
    ['ruler', 'rulers', '尺子'],
    ['bag', 'bags', '书包'],
    ['desk', 'desks', '课桌'],
    ['chair', 'chairs', '椅子'],
    ['door', 'doors', '门'],
    ['window', 'windows', '窗户'],
    ['room', 'rooms', '房间'],
    ['fan', 'fans', '风扇'],
    ['ball', 'balls', '球'],
    ['toy', 'toys', '玩具'],
    ['boy', 'boys', '男孩'],
    ['key', 'keys', '钥匙'],
    ['flower', 'flowers', '花'],
    ['tree', 'trees', '树'],
    ['bird', 'birds', '鸟'],
    ['cat', 'cats', '猫'],
    ['dog', 'dogs', '狗'],
    ['car', 'cars', '小汽车'],
    ['bike', 'bikes', '自行车'],
    ['kite', 'kites', '风筝'],
    ['cake', 'cakes', '蛋糕'],
    ['cup', 'cups', '杯子'],
    ['plate', 'plates', '盘子'],
    ['spoon', 'spoons', '勺子'],
    ['fork', 'forks', '叉子'],
    ['hat', 'hats', '帽子'],
    ['shoe', 'shoes', '鞋'],
    ['sock', 'socks', '袜子'],
    ['shirt', 'shirts', '衬衫'],
    ['skirt', 'skirts', '短裙'],
    ['table', 'tables', '桌子'],
    ['bed', 'beds', '床'],
    ['lamp', 'lamps', '台灯'],
    ['phone', 'phones', '电话'],
    ['star', 'stars', '星星'],
    ['card', 'cards', '卡片'],
    ['gift', 'gifts', '礼物'],
    ['ticket', 'tickets', '票'],
    ['stamp', 'stamps', '邮票'],
    ['coin', 'coins', '硬币'],
    ['computer', 'computers', '电脑'],
    ['picture', 'pictures', '图画'],
    /* 元音开头，冠词要用 an */
    ['apple', 'apples', '苹果', 'an'],
    ['orange', 'oranges', '橙子', 'an'],
    ['egg', 'eggs', '鸡蛋', 'an'],
    ['elephant', 'elephants', '大象', 'an'],
    ['umbrella', 'umbrellas', '雨伞', 'an'],

    /* 以 s / x / ch / sh 结尾：加 es */
    ['bus', 'buses', '公交车'],
    ['box', 'boxes', '盒子'],
    ['watch', 'watches', '手表'],
    ['brush', 'brushes', '刷子'],
    ['class', 'classes', '班级', 'a', 'ab'],
    ['glass', 'glasses', '玻璃杯', 'a', 'np'],
    ['dish', 'dishes', '盘子'],
    ['beach', 'beaches', '海滩'],
    ['peach', 'peaches', '桃子'],
    ['dress', 'dresses', '连衣裙', 'a', 'np'],
    ['fox', 'foxes', '狐狸'],

    /* 辅音字母 + y：变 y 为 i 再加 es */
    ['city', 'cities', '城市'],
    ['library', 'libraries', '图书馆'],
    ['baby', 'babies', '婴儿'],
    ['story', 'stories', '故事', 'a', 'ab'],
    ['family', 'families', '家庭'],
    ['party', 'parties', '聚会', 'a', 'ab'],
    ['butterfly', 'butterflies', '蝴蝶'],
    ['cherry', 'cherries', '樱桃'],
    ['country', 'countries', '国家', 'a', 'ab'],
    ['factory', 'factories', '工厂'],

    /* 以 f / fe 结尾：变 f 为 v 再加 es */
    ['knife', 'knives', '小刀'],
    ['shelf', 'shelves', '架子'],
    ['leaf', 'leaves', '树叶'],
    ['wolf', 'wolves', '狼'],
    ['wife', 'wives', '妻子', 'a', 'nf'],
    ['half', 'halves', '一半', 'a', 'ns nf'],

    /* 以 o 结尾加 es */
    ['potato', 'potatoes', '土豆'],
    ['tomato', 'tomatoes', '西红柿'],
    ['hero', 'heroes', '英雄'],
    /* mangos 也是被接受的写法，放进选择题答案就不唯一了 */
    ['mango', 'mangoes', '芒果', 'a', 'np'],

    /* 以 o 结尾却只加 s —— 最容易错的四个 */
    ['photo', 'photos', '照片'],
    ['piano', 'pianos', '钢琴'],
    ['radio', 'radios', '收音机'],
    ['zoo', 'zoos', '动物园'],
    ['kilo', 'kilos', '公斤', 'a', 'ns nf'],

    /* 不规则变化 */
    ['child', 'children', '孩子'],
    ['mouse', 'mice', '老鼠'],
    ['tooth', 'teeth', '牙齿', 'a', 'nf'],
    ['foot', 'feet', '脚', 'a', 'nf'],
    ['man', 'men', '男人'],
    ['woman', 'women', '女人'],
    ['goose', 'geese', '鹅'],
    ['person', 'people', '人', 'a', 'np'],

    /* 单复数同形 */
    ['sheep', 'sheep', '绵羊']
  ];

  LEX.nouns = NOUN_RAW.map(function (r) {
    const f = r[4] || '';
    return {
      w: r[0], pl: r[1], cn: r[2], art: r[3] || 'a',
      ns: f.indexOf('ns') >= 0,     // 没有单数形式
      nf: f.indexOf('nf') >= 0,     // 不适合放进造句框
      np: f.indexOf('np') >= 0,     // 不适合进选择题
      ab: f.indexOf('ab') >= 0      // 抽象词，只做改写题
    };
  });

  /** 名词的复数形式（数据里已写好，这里只是取一下） */
  LEX.pluralOf = function (n) { return n.pl; };

  /* ---------------- 人称代词三件套 ----------------
     主格 s / 形容词性物主代词 poss / 宾格 obj。
     badP、badO 是选择题的干扰项，都是孩子真会写的：
       I → me / mine（宾格、名词性物主）
       they → there（同音，their / there 是经典错）
       we → are（同音）
     you 的宾格还是 you，所以宾格题里跳过它。 */
  LEX.pronouns = [
    { s: 'I', poss: 'my', obj: 'me', cn: '我',
      badP: ['I', 'me', 'mine'], badO: ['I', 'my', 'mine'] },
    { s: 'you', poss: 'your', obj: 'you', cn: '你',
      badP: ['you', 'yours', 'you\'re'], badO: [] },
    { s: 'he', poss: 'his', obj: 'him', cn: '他',
      badP: ['he', 'him', 'he\'s'], badO: ['he', 'his', 'himself'] },
    { s: 'she', poss: 'her', obj: 'her', cn: '她',
      badP: ['she', 'hers', 'she\'s'], badO: ['she', 'hers', 'herself'] },
    { s: 'we', poss: 'our', obj: 'us', cn: '我们',
      badP: ['we', 'us', 'are'], badO: ['we', 'our', 'ours'] },
    { s: 'they', poss: 'their', obj: 'them', cn: '他们',
      badP: ['they', 'them', 'there'], badO: ['they', 'their', 'theirs'] }
  ];

  /* ---------------- have / has 的句子 ----------------
     分两组：人是主语（能拥有个人物品）、场所是主语（能拥有设施）。
     不分组会出来「My sister has many desks.」这种讲不通的句子。 */

  /* 人 + 私人物品 */
  LEX.ownPeople = [
    { s: 'My sister', third: 1 }, { s: 'My brother', third: 1 },
    { s: 'Ben', third: 1 }, { s: 'Kitty', third: 1 },
    { s: 'Miss Li', third: 1 }, { s: 'The boy', third: 1 },
    { s: 'My teacher', third: 1 },
    { s: 'My classmates', third: 0 }, { s: 'The children', third: 0 },
    { s: 'My friends', third: 0 }, { s: 'Your parents', third: 0 },
    { s: 'We', third: 0 }, { s: 'I', third: 0 }
  ];

  LEX.ownThings = [
    'two new books', 'three red pens', 'many toys', 'some nice pictures',
    'two new bikes', 'many stamps', 'some new cards', 'three balls'
  ];

  /* 不带数量词的复数，给 some / any 那一型用。
     不能用整个名词表 —— 「Miss Li has some wives.」这种句子就出来了。
     只留孩子、老师真会拥有的东西。 */
  LEX.ownThingsPlain = [
    'books', 'pens', 'pencils', 'rulers', 'toys', 'pictures',
    'stamps', 'cards', 'coins', 'kites', 'balls', 'cakes'
  ];

  /* 场所 + 设施（同义句转换用，宾语一律复数） */
  LEX.ownPlaces = [
    { s: 'The library', third: 1 }, { s: 'Our classroom', third: 1 },
    { s: 'The art room', third: 1 }, { s: 'The computer room', third: 1 },
    { s: 'The hall', third: 1 }, { s: 'My room', third: 1 },
    { s: 'These halls', third: 0 }, { s: 'Our libraries', third: 0 },
    { s: 'The classrooms', third: 0 }
  ];

  LEX.roomThings = [
    'computers', 'pictures', 'chairs', 'windows', 'doors', 'desks',
    'books', 'flowers', 'fans', 'plants', 'toys', 'brushes'
  ];

  /* ============================================================
     变形规则
     ============================================================ */
  const M = {};

  /* be 动词 */
  M.be = function (person) {
    if (person === 'i') return 'am';
    if (person === 'he' || person === 'she' || person === 'it') return 'is';
    return 'are';
  };

  /* 第三人称单数 */
  M.s3 = function (v) {
    if (v === 'have') return 'has';
    if (v === 'be') return 'is';
    if (/(s|x|z|sh|ch|o)$/.test(v)) return v + 'es';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
    return v + 's';
  };

  /* 动词短语的三单：只变第一个词，后面的宾语原样不动。
     以前是整串加 s —— 「catch mice」变成「catch mices」，
     凭空造出一个英语里没有的词，孩子一眼就排除了，干扰项等于白给。
     现在 catch mice → catches mice，这才是孩子真会犯的错。 */
  M.s3v = function (phrase) {
    const w = String(phrase || '').split(' ');
    if (!w[0]) return phrase;
    w[0] = M.s3(w[0]);
    return w.join(' ');
  };

  /* 现在分词 */
  M.ing = function (v) {
    /* be 是例外：不能按「去掉词尾 e 加 ing」推，那会得到 bing */
    if (v === 'be') return 'being';
    if (/^(run|sit|swim|get|put|stop|shop|begin)$/.test(v)) return v + v.slice(-1) + 'ing';
    if (/ie$/.test(v)) return v.slice(0, -2) + 'ying';
    if (/[^e]e$/.test(v)) return v.slice(0, -1) + 'ing';
    return v + 'ing';
  };

  /* 动词短语的现在分词：同样只变第一个词。
     play football → playing football，不能变成 footballing。 */
  M.ingV = function (phrase) {
    const w = String(phrase || '').split(' ');
    if (!w[0]) return phrase;
    w[0] = M.ing(w[0]);
    return w.join(' ');
  };

  /* 不规则动词过去式。词库里出现的动词都要在这里查一遍，
     漏一个就会造出 drawed / teached 这种英语里没有的词当干扰项。 */
  const IRREG_PAST = {
    go: 'went', do: 'did', have: 'had', read: 'read', run: 'ran', eat: 'ate',
    see: 'saw', get: 'got', come: 'came', make: 'made', take: 'took',
    give: 'gave', write: 'wrote', drink: 'drank', fly: 'flew', swim: 'swam',
    catch: 'caught', sleep: 'slept', draw: 'drew', teach: 'taught',
    sing: 'sang', begin: 'began', meet: 'met', fall: 'fell', be: 'was',
    buy: 'bought', think: 'thought', say: 'said', find: 'found', tell: 'told'
  };

  /* 一般过去式（用于做干扰项） */
  M.past = function (v) {
    if (IRREG_PAST[v]) return IRREG_PAST[v];
    if (/e$/.test(v)) return v + 'd';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ied';
    if (/^(stop|shop|plan)$/.test(v)) return v + v.slice(-1) + 'ed';
    return v + 'ed';
  };

  /* 物主代词 */
  M.poss = function (person) {
    if (person === 'she') return 'her';
    if (person === 'it') return 'its';
    if (person === 'they') return 'their';
    if (person === 'we') return 'our';
    if (person === 'you') return 'your';
    if (person === 'i') return 'my';
    return 'his';
  };

  /* 第一人称 → 第二人称（改疑问句时用） */
  M.toSecond = function (s) {
    return s
      .replace(/\bI\b/g, 'you')
      .replace(/\bWe\b/g, 'you')
      .replace(/\bwe\b/g, 'you')
      .replace(/\bMy\b/g, 'Your')
      .replace(/\bmy\b/g, 'your')
      .replace(/\bOur\b/g, 'Your')
      .replace(/\bour\b/g, 'your')
      .replace(/\bam\b/g, 'are');
  };

  /* 是否需要把主语换成第二人称（I / We 开头） */
  M.needsSecond = function (person) {
    return person === 'i' || person === 'we';
  };

  /* 填充 {POSS} */
  M.fillPoss = function (str, person) {
    return str.replace(/\{POSS\}/g, M.poss(person));
  };

  /* ---------------- 大小写：句首 / 句中 ----------------
     主语写在句首时首字母大写（The cat / Tom）；
     挪到句子中间就要小写（the cat），但专有名词和 I 不变（Tom / I）。
     专有名词表按词库规模手写维护，够用且不会误伤。 */
  const PROPER = {
    I: 1, Tom: 1, Amy: 1, Jack: 1, Lily: 1, Ben: 1, Kitty: 1,
    Mr: 1, Mrs: 1, Miss: 1,
    China: 1, English: 1, Monday: 1, Sunday: 1, Saturday: 1
  };

  /* 句中形式：The cat → the cat；Tom → Tom */
  M.mid = function (s) {
    const t = String(s || '');
    if (!t) return t;
    const w = t.split(' ')[0];
    if (PROPER[w]) return t;
    return t.charAt(0).toLowerCase() + t.slice(1);
  };

  /* 句首形式：the cat → The cat；Tom → Tom */
  M.cap = function (s) {
    const t = String(s || '');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  };

  SM.LEX = LEX;
  SM.M = M;

})(window.SM);
