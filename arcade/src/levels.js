/* 关卡配置、怪物血量和波次规划。 */
(function (global) {
  'use strict';
  global.createArcadeLevels = function (ARCADE, arcOn) {
  /* 5 张地图：每张一套配色主题（art.js 的 THEMES 21-25）+ 4 只小怪 + 1 只 BOSS */
  var ARCADE_MAPS = [
    { theme: 21, name: '梦幻乐园', mobs: ['candy', 'balloon', 'cupcake', 'lollipop'], boss: 'carouselKing', mobName: '棉花糖团', bossName: '旋转木马王' },
    { theme: 22, name: '学习天地', mobs: ['eraser', 'pencil', 'inkpot', 'ruler'], boss: 'boardGiant', mobName: '橡皮怪', bossName: '黑板巨人' },
    { theme: 23, name: '冬日校园', mobs: ['snowball', 'scarf', 'broom', 'icicle'], boss: 'snowPrincipal', mobName: '雪球怪', bossName: '雪人校长' },
    { theme: 24, name: '冰雪天地', mobs: ['icecrystal', 'snowrabbit', 'icecone', 'frostflower'], boss: 'iceDragon', mobName: '冰晶小妖', bossName: '冰龙幼崽' },
    { theme: 25, name: '炙热沙漠', mobs: ['sandpuff', 'cactus', 'beetle', 'tumbleweed'], boss: 'sandPharaoh', mobName: '沙团怪', bossName: '沙暴法老' }
  ];
  /* 每档换一张地图：1 梦幻乐园 / 2 学习天地 / 3 冬日校园 / 4 冰雪天地 / 5 炙热沙漠 / 6 回到乐园…
     一轮五档，连着打不会撞见同一套背景与小怪 */
  function arcMapOf(tier) {
    var t = Math.max(1, tier | 0);
    return ARCADE_MAPS[(t - 1) % ARCADE_MAPS.length];
  }
  /* 第几轮（每转完五张图算一轮），第二轮起妖王带前缀，免得一模一样 */
  function arcRound(tier) {
    return Math.floor((Math.max(1, tier | 0) - 1) / ARCADE_MAPS.length);
  }
  var ARC_PREFIX = ['', '狂暴·', '暗影·', '深渊·', '焚天·'];
  /* 档位血量：每 8 档算一轮，轮内爬坡，跨轮抬高基数 */
  /* 档位血量：涨得比关卡模式缓，因为无尽档位没有 "过关重置"，每局还从新手村起。
     1.32 的复利到第 8 档要拼 8 遍同一个词；1.18 让每只怪落在 2-4 刀
     （拼对没死会换一个新词，所以刀数 = 这一只要拼几个不同的词）。 */
  function arcMobHp(tier) {
    var t = Math.max(1, tier | 0);
    var round = Math.floor((t - 1) / 8);
    var idx = ((t - 1) % 8) + 1;
    return Math.round(22 * Math.pow(1.18, idx - 1) * Math.pow(1.5, round));
  }


  /* 20 关：每关一套主题 + 专属小怪 / 妖王 */
  var LEVELS = [
    null,
    { name: '竹海晨雾', theme: 1, mob: 'bamboo', boss: 'bambooKing', mobName: '竹叶妖', bossName: '竹魅妖王' },
    { name: '枫林晚照', theme: 2, mob: 'lantern', boss: 'lanternKing', mobName: '灯笼怪', bossName: '怒灯笼大头怪' },
    { name: '雪岭寒潭', theme: 3, mob: 'snowman', boss: 'santa', mobName: '雪人怪', bossName: '黑化圣诞老人' },
    { name: '桃花溪谷', theme: 4, mob: 'peach', boss: 'peachQueen', mobName: '桃枝妖', bossName: '桃夭花魁' },
    { name: '荷塘月夜', theme: 5, mob: 'lotus', boss: 'lotusKing', mobName: '荷叶精', bossName: '九窍莲藕妖' },
    { name: '黄沙古渡', theme: 6, mob: 'sandworm', boss: 'scorpionKing', mobName: '流沙虫', bossName: '沙暴蝎王' },
    { name: '幽篁鬼市', theme: 7, mob: 'paperdoll', boss: 'paperGranny', mobName: '纸人', bossName: '千面纸扎婆' },
    { name: '火山熔谷', theme: 8, mob: 'firelizard', boss: 'lavaGiant', mobName: '火蜥', bossName: '熔岩巨灵' },
    { name: '云梦泽畔', theme: 9, mob: 'waterghost', boss: 'riverLord', mobName: '水鬼', bossName: '无面河伯' },
    { name: '剑冢荒原', theme: 10, mob: 'swordspirit', boss: 'swordLord', mobName: '锈剑灵', bossName: '万剑冢主' },
    { name: '雷泽高原', theme: 11, mob: 'thunderbeast', boss: 'thunderLord', mobName: '雷鼠', bossName: '雷公兽' },
    { name: '药王谷', theme: 12, mob: 'herbsprite', boss: 'herbKing', mobName: '药锄精', bossName: '百草毒王' },
    { name: '敦煌壁画', theme: 13, mob: 'muralfairy', boss: 'deerKing', mobName: '壁画飞天', bossName: '九色鹿王' },
    { name: '冰封王座', theme: 14, mob: 'icesoldier', boss: 'frostKing', mobName: '冰甲兵', bossName: '冰霜君王' },
    { name: '鬼哭林', theme: 15, mob: 'hangedghost', boss: 'treeMother', mobName: '吊死鬼', bossName: '千年树母' },
    { name: '星陨坑', theme: 16, mob: 'starbug', boss: 'meteorGolem', mobName: '星屑虫', bossName: '陨星魔像' },
    { name: '天音阁', theme: 17, mob: 'bellspirit', boss: 'bellLord', mobName: '编钟灵', bossName: '钟馗乐正' },
    { name: '血月魔域', theme: 18, mob: 'bloodbat', boss: 'bloodLord', mobName: '血蝠', bossName: '血月魔君' },
    { name: '九幽黄泉', theme: 19, mob: 'hellfire', boss: 'judge', mobName: '冥火', bossName: '阎罗判官' },
    { name: '天门云海', theme: 20, mob: 'cloudgeneral', boss: 'demonEmperor', mobName: '云将', bossName: '天魔帝君' }
  ];

  /* 三十关：二十套场景循环两轮，21 关起换个名头再来一遍（妖物更硬） */
  var MAX_LEVEL = 30;
  function levelCfg(lv) {
    if (arcOn()) {
      var m = arcMapOf(ARCADE.tier);
      var r = arcRound(ARCADE.tier);
      return {
        name: m.name, theme: m.theme,
        mob: m.mobs[0], mobs: m.mobs, boss: m.boss,
        mobName: m.mobName,
        bossName: (ARC_PREFIX[r] || '') + m.bossName
      };
    }
    var n = Math.max(1, Math.min(MAX_LEVEL, lv | 0));
    if (n <= 20) return LEVELS[n] || LEVELS[1];
    return LEVELS[((n - 1) % 20) + 1];
  }
  function worldOf(lv) { return levelCfg(lv).theme; }
  function levelName(lv) {
    if (arcOn()) return '第 ' + ARCADE.tier + ' 档 · ' + arcMapOf(ARCADE.tier).name;
    var n = Math.max(1, Math.min(MAX_LEVEL, lv | 0));
    return n <= 20 ? levelCfg(n).name : levelCfg(n).name + ' · 重临';
  }
  function bossName(lv) { return levelCfg(lv).bossName; }

  /* 血量曲线：后段小怪要多打几个词才倒 */
  function mobHp(lv) {
    if (arcOn()) return arcMobHp(ARCADE.tier);
    return Math.round(22 * Math.pow(1.13, lv - 1));
  }
  function bossHp(lv) {
    /* 无尽模式：BOSS 是小怪 2.4 倍（原来 3.2，一刀一个词要拼十几遍） */
    if (arcOn()) return Math.round(arcMobHp(ARCADE.tier) * 2.4);
    return Math.round(mobHp(lv) * 3.2);
  }

  /* ---------------- 波次：按「整关小怪总数」排 ----------------
     1-3 关   10 只小怪 + 1 妖王（一只一只来）
     4-10 关  15 只小怪 + 1 妖王
     11-20 关 20 只小怪 + 1 妖王
     21-30 关 30 只小怪 + 2 妖王（副妖王插在中段） */
  function wavePlan(lv) {
    if (lv <= 3) return { mobs: 10, bosses: 1, waves: 10 };
    if (lv <= 10) return { mobs: 15, bosses: 1, waves: 10 };
    if (lv <= 20) return { mobs: 20, bosses: 1, waves: 10 };
    return { mobs: 30, bosses: 2, waves: 10 };
  }

  /* 把 total 只小怪尽量平均地摊到 n 波里（多的那几只均匀插在中间） */
  function spreadMobs(total, n) {
    var base = Math.floor(total / n), extra = total % n;
    var out = [], acc = 0, i;
    for (i = 0; i < n; i++) {
      acc += extra;
      var add = 0;
      while (acc >= n) { acc -= n; add++; }
      out.push(base + add);
    }
    return out;
  }

  /* 一档 = 10 只小怪分 4 波（3/3/2/2）+ 1 只 BOSS（无尽模式）。
     同屏最多 3 只，词卡不会挤在一起；单档约 2.5-3 分钟。 */
  function arcadeWaves(tier) {
    var total = 10, waves = 4, out = [], i;
    var m = arcMapOf(tier);
    var base = Math.floor(total / waves), extra = total % waves, acc = 0;
    for (i = 0; i < waves; i++) {
      acc += extra;
      var add = 0;
      while (acc >= waves) { acc -= waves; add++; }
      out.push({
        count: base + add, elite: false,
        /* 一波混两种小怪，同屏就能看出这片区域有哪几样东西；
           四波铺开正好把这张图的四种都过一遍 */
        kinds: [m.mobs[i % m.mobs.length], m.mobs[(i + 1) % m.mobs.length]],
        kind: m.mobs[i % m.mobs.length],
        label: '第 ' + tier + ' 档 · ' + (i + 1) + '/' + waves
      });
    }
    out.push({
      count: 1, elite: true,
      kind: m.boss,
      /* 妖王报名字，玩家才知道这只和上一档不是同一只 */
      label: (ARC_PREFIX[arcRound(tier)] || '') + m.bossName + ' 现身'
    });
    return out;
  }

  function makeWaves(lv) {
    if (arcOn()) return arcadeWaves(ARCADE.tier);
    var plan = wavePlan(lv);
    var counts = spreadMobs(plan.mobs, plan.waves);
    var out = [], i;
    var midBoss = plan.bosses > 1 ? Math.floor(plan.waves / 2) : -1;  /* 副妖王在第 6 波后 */
    var waveNo = 0;
    for (i = 0; i < plan.waves; i++) {
      waveNo++;
      out.push({
        count: counts[i],
        elite: false,
        label: '第 ' + lv + ' 关 · 第' + waveNo + '波'
      });
      if (i === midBoss - 1) {
        out.push({ count: 1, elite: true, label: '第 ' + lv + ' 关 · 妖王' });
      }
    }
    out.push({
      count: 1,
      elite: true,
      label: '第 ' + lv + ' 关 · ' + (plan.bosses > 1 ? '大妖王' : '妖王')
    });
    return out;
  }

  return { MAX_LEVEL: MAX_LEVEL, arcMapOf: arcMapOf, arcRound: arcRound, arcMobHp: arcMobHp, levelCfg: levelCfg, worldOf: worldOf, levelName: levelName, bossName: bossName, mobHp: mobHp, bossHp: bossHp, wavePlan: wavePlan, spreadMobs: spreadMobs, arcadeWaves: arcadeWaves, makeWaves: makeWaves };
  };
})(window);
