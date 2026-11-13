/* 词库 T2 · 四年级下册（沪教牛津版 4B · 全 12 单元）
   依据：沪教牛津版（三起）四年级下册 Unit 1–12 课文核心词表，逐单元收词。
     U1 Touch and feel  U2 Smell and taste  U3 Look and see
     U4 Subjects        U5 Sport            U6 Music
     U7 My day          U8 Days of the week U9 A friend in Australia
     U10 My garden      U11 Children's Day  U12 The ugly duckling
   关卡口径：第 11–20 关，一关一个单元（19/20 关各并两个单元，见 game.js unitsFor）。
   格式： "单词|中文|词性|单元号"  —— 加载时统一解析，单元号 = 该词属于哪个 Unit。 */
window.VOCAB_T2 = [
  /* ---- U1 Touch and feel ---- */
  "touch|触摸|v.|1", "feel|摸起来；感到|v.|1", "soft|柔软的|adj.|1",
  "hard|坚硬的|adj.|1", "thick|厚的；粗的|adj.|1", "thin|薄的；细的|adj.|1",
  "blind|失明的|adj.|1", "noise|响声；噪音|n.|1", "young|年轻的|adj.|1",

  /* ---- U2 Smell and taste ---- */
  "smell|闻；嗅|v.|2", "strawberry|草莓|n.|2", "or|或者；还是|conj.|2",
  "watermelon|西瓜|n.|2", "grape|葡萄|n.|2", "fox|狐狸|n.|2",
  "round|圆的|adj.|2", "purple|紫色的|adj.|2", "wait|等待|v.|2",
  "minute|一会儿；分钟|n.|2", "get|得到；到达|v.|2", "those|那些|pron.|2",

  /* ---- U3 Look and see ---- */
  "rise|升起|v.|3", "shadow|影子|n.|3", "noon|中午|n.|3",
  "high|高的|adj.|3", "sky|天空|n.|3", "evening|傍晚；晚上|n.|3",
  "again|又；再|adv.|3", "night|夜晚|n.|3", "moon|月亮|n.|3",
  "him|他（宾格）|pron.|3", "stop|停止|v.|3", "at noon|在中午|phr.|3",
  "go down|落下|phr.|3", "at night|在夜晚|phr.|3", "take a walk|散步|phr.|3",

  /* ---- U4 Subjects ---- */
  "subject|学科；科目|n.|4", "lesson|课|n.|4", "Chinese|语文|n.|4",
  "maths|数学|n.|4", "English|英语|n.|4", "science|科学|n.|4",
  "PE|体育|n.|4", "music|音乐|n.|4", "art|美术|n.|4",
  "timetable|课程表|n.|4", "from|从；来自|prep.|4", "break|休息|n.|4",
  "favourite|最喜爱的|adj.|4",

  /* ---- U5 Sport ---- */
  "sport|体育运动|n.|5", "football|足球|n.|5", "club|俱乐部；兴趣小组|n.|5",
  "join|参加；加入|v.|5", "tell|告诉|v.|5", "about|关于|prep.|5",
  "basketball|篮球|n.|5", "volleyball|排球|n.|5", "us|我们（宾格）|pron.|5",
  "table tennis|乒乓球运动|n.|5", "play football|踢足球|phr.|5",
  "play basketball|打篮球|phr.|5", "play volleyball|打排球|phr.|5",

  /* ---- U6 Music ---- */
  "wonderful|使人愉快的；精彩的|adj.|6", "violin|小提琴|n.|6", "guitar|吉他|n.|6",
  "whose|谁的|pron.|6", "piano|钢琴|n.|6", "city|城市|n.|6",
  "bag|袋子|n.|6", "gold|金子|n.|6", "all|全部；所有|adj.|6",
  "play the violin|拉小提琴|phr.|6", "play the guitar|弹吉他|phr.|6",

  /* ---- U7 My day ---- */
  "o'clock|……点钟|adv.|7", "quarter|一刻钟|n.|7", "time|时间|n.|7",
  "half|一半|n.|7", "wash|洗|v.|7", "dinner|晚餐；正餐|n.|7",
  "start|开始|v.|7", "catch|捉住|v.|7", "get up|起床|phr.|7",
  "brush teeth|刷牙|phr.|7", "half past|……点半|phr.|7",
  "have breakfast|吃早餐|phr.|7", "go to school|去上学|phr.|7",
  "wash face|洗脸|phr.|7", "have lunch|吃午餐|phr.|7",
  "have dinner|吃晚餐|phr.|7", "go to bed|上床睡觉|phr.|7",

  /* ---- U8 Days of the week ---- */
  "week|星期；周|n.|8", "Monday|星期一|n.|8", "Tuesday|星期二|n.|8",
  "Wednesday|星期三|n.|8", "Thursday|星期四|n.|8", "Friday|星期五|n.|8",
  "Saturday|星期六|n.|8", "Sunday|星期日|n.|8", "clock|时钟|n.|8",
  "play chess|下国际象棋|phr.|8", "at the weekend|在周末|phr.|8",
  "late for|迟到|phr.|8", "email|电子邮件|n.|8", "hat|帽子|n.|8",
  "wear|穿；戴|v.|8", "yours|你的；你们的|pron.|8",

  /* ---- U9 A friend in Australia ---- */
  "China|中国|n.|9", "talk|谈话|v.|9", "with|和……一起|prep.|9",
  "January|一月|n.|9", "February|二月|n.|9", "March|三月|n.|9",
  "April|四月|n.|9", "May|五月|n.|9", "June|六月|n.|9",
  "July|七月|n.|9", "August|八月|n.|9", "September|九月|n.|9",
  "October|十月|n.|9", "November|十一月|n.|9", "December|十二月|n.|9",

  /* ---- U10 My garden ---- */
  "garden|花园|n.|10", "plant|植物|n.|10", "leaf|叶子|n.|10",
  "water|水；给……浇水|v.|10", "them|他们；她们；它们|pron.|10",
  "grow|生长；成长|v.|10", "seed|种子|n.|10", "every day|每天|phr.|10",
  "away|去别处|adv.|10",

  /* ---- U11 Children's Day ---- */
  "song|歌曲|n.|11", "zoo|动物园|n.|11", "cinema|电影院|n.|11",
  "museum|博物馆|n.|11", "also|也；还|adv.|11", "have a party|举办聚会|phr.|11",
  "quack|（鸭叫声）嘎嘎|n.|11",

  /* ---- U12 The ugly duckling ---- */
  "ugly|丑的；丑陋的|adj.|12", "duckling|小鸭|n.|12", "duck|鸭子|n.|12",
  "river|江；河|n.|12", "baby|宝宝|n.|12", "later|后来；以后|adv.|12",
  "back|背；回来|n.|12", "swan|天鹅|n.|12", "into|到……里面|prep.|12"
];
