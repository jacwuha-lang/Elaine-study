/* 词库 T1 · 四年级上册（沪教牛津版 4A · 全 12 单元）
   依据：沪教牛津版（三起）四年级上册 Unit 1–12 课文核心词表，逐单元收词。
     U1  Meeting new people      U2  Can you swim?      U3  Are you happy?
     U4  Do you have any cousins? U5 My friends          U6  My parents
     U7  At school                U8  At the shop        U9  At home
     U10 Around my home           U11 Shapes             U12 Weather
   关卡口径：第 1–10 关，一关一个单元（9/10 关各并两个单元，见 game.js unitsFor）。
   格式： "单词|中文|词性|单元号"  —— 加载时统一解析，单元号 = 该词属于哪个 Unit。
   注意：只收课本单词表里真实出现的词，不收低年级起步词（hello/cat/dog 不在本册）。 */
window.VOCAB_T1 = [
  /* ---- U1 Meeting new people ---- */
  "meet|相识；结识|v.|1", "new|新的|adj.|1", "morning|早晨；上午|n.|1",
  "classmate|同班同学|n.|1", "her|她的；她|pron.|1", "name|名字|n.|1",
  "sit|坐|v.|1", "afternoon|下午|n.|1", "his|他的|pron.|1",

  /* ---- U2 Can you swim? ---- */
  "run|跑|v.|2", "fast|快的；迅速地|adj.|2", "fly|飞；放飞|v.|2",
  "draw|画画|v.|2", "write|写字；书写|v.|2", "jump|跳|v.|2",
  "welcome|欢迎|v.|2", "woof|（狗叫声）汪汪|n.|2", "but|但是|conj.|2",

  /* ---- U3 Are you happy? ---- */
  "happy|开心的|adj.|3", "sad|难过的|adj.|3", "tired|累的；疲惫的|adj.|3",
  "hungry|饥饿的|adj.|3", "full|饱的|adj.|3", "thirsty|口渴的|adj.|3",
  "bird|鸟|n.|3", "see|看见|v.|3", "bottle|瓶子|n.|3", "drink|喝|v.|3",

  /* ---- U4 Do you have any cousins? ---- */
  "any|任何的|adj.|4", "cousin|堂（表）兄弟姐妹|n.|4", "family|家庭|n.|4",
  "parents|父母|n.|4", "grandparent|（外）祖父母|n.|4", "son|儿子|n.|4",
  "grandfather|祖父；外公|n.|4", "grandpa|爷爷；外公|n.|4",
  "grandmother|祖母；外婆|n.|4", "grandma|奶奶；外婆|n.|4",
  "uncle|叔叔；舅舅|n.|4", "aunt|姑妈；姨妈|n.|4", "that|那个|pron.|4",

  /* ---- U5 My friends ---- */
  "T-shirt|T 恤衫|n.|5", "brown|棕色的|adj.|5", "shorts|短裤|n.|5",
  "ride|骑|v.|5", "skirt|短裙|n.|5", "dress|连衣裙|n.|5",
  "shirt|（男式）衬衫|n.|5", "tooth|牙齿|n.|5", "teeth|牙齿（复数）|n.|5",
  "sharp|锋利的；尖的|adj.|5", "help|帮助|v.|5", "a pair of|一双；一对|phr.|5",
  "get out|出去|phr.|5",

  /* ---- U6 My parents ---- */
  "nurse|护士|n.|6", "fireman|消防员|n.|6", "teacher|老师|n.|6",
  "doctor|医生|n.|6", "bus driver|公共汽车司机|n.|6", "kid|小孩|n.|6",
  "so|如此；所以|adv.|6", "fire|火；火灾|n.|6", "people|人；人们|n.|6",
  "job|工作；职业|n.|6", "play with|和……一起玩|phr.|6",

  /* ---- U7 At school ---- */
  "school|学校|n.|7", "office|办公室|n.|7", "busy|忙碌的|adj.|7",
  "computer|计算机；电脑|n.|7", "many|许多|adj.|7", "library|图书馆|n.|7",
  "playground|操场|n.|7", "classroom|教室|n.|7", "toilet|厕所|n.|7",
  "animal|动物|n.|7", "forest|森林|n.|7", "pupil|小学生|n.|7",
  "try|尝试|v.|7", "first|第一|num.|7", "climb trees|爬树|phr.|7",

  /* ---- U8 At the shop ---- */
  "shop|商店|n.|8", "tomato|西红柿|n.|8", "soup|汤|n.|8",
  "potato|土豆|n.|8", "carrot|胡萝卜|n.|8", "thirty|三十|num.|8",
  "fish|鱼|n.|8", "meat|肉|n.|8", "rice|米饭|n.|8",
  "glasses|眼镜|n.|8", "want|想要|v.|8", "together|一起|adv.|8",
  "magic|有魔力的；魔术|adj.|8",

  /* ---- U9 At home ---- */
  "need|需要|v.|9", "where|哪里|adv.|9", "box|盒子|n.|9",
  "give|给|v.|9", "plate|盘子|n.|9", "table|桌子|n.|9",
  "lunch|午餐|n.|9", "beside|在……旁边|prep.|9", "kitchen|厨房|n.|9",
  "floor|地板|n.|9", "angry|生气的|adj.|9", "under|在……下面|prep.|9",
  "in|在……里|prep.|9", "on|在……上面|prep.|9",

  /* ---- U10 Around my home ---- */
  "around|在……周围|prep.|10", "home|家|n.|10", "street|街道|n.|10",
  "park|公园|n.|10", "near|在……附近|prep.|10", "behind|在……后面|prep.|10",
  "supermarket|超市|n.|10", "restaurant|餐馆|n.|10", "live|居住|v.|10",
  "old|旧的；老的|adj.|10", "eat|吃|v.|10", "nice|美好的|adj.|10",
  "food|食物|n.|10", "a lot of|许多|phr.|10",

  /* ---- U11 Shapes ---- */
  "shape|形状|n.|11", "picture|图画|n.|11", "square|正方形|n.|11",
  "circle|圆形|n.|11", "star|星形；星星|n.|11", "rectangle|长方形|n.|11",
  "triangle|三角形|n.|11", "today|今天|n.|11", "well|好地|adv.|11",

  /* ---- U12 Weather ---- */
  "weather|天气|n.|12", "rainy|下雨的|adj.|12", "cloudy|多云的|adj.|12",
  "windy|有风的|adj.|12", "sunny|晴朗的|adj.|12", "cloud|云|n.|12",
  "rain|雨；下雨|n.|12", "sun|太阳|n.|12", "wind|风|n.|12"
];
