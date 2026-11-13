# 游戏 JavaScript 模块位置

## 武道擂台

- `js/pk/models.js` 是模型公共入口；现有页面继续从这里导入。
- `js/pk/model/soldiers.js`：士兵公共骨架和模型克隆；`character-head.js` 管理面部、分级头盔和蓝红将军面貌，`character-armor.js` 管理战袍和普通衣甲，`general-armor.js` 管理将军层甲，`cloth.js` 管理褶皱披风。
- `js/pk/model/heraldry.js`：双方共用的百合花、展翼纹章，以及盾牌、军旗、城堡旗帜使用的纹章贴图。
- `js/pk/model/archer.js`：弓箭手的弓、箭和箭筒。
- `js/pk/model/spearman.js`：长矛兵的长矛和投掷兵的短矛、备用武器。
- `js/pk/model/mage-equipment.js`：方士法杖、法球和饰物。
- `js/pk/model/shield.js`：冲锋兵和将军的盾牌。
- `js/pk/model/soldier-pose.js`：动作调度、上下身动作混合和盾牌朝向；`pose-curves.js` 提供连续的单调三次动作曲线，`pose-mixer.js` 在出招、受击、收招之间保留姿势与关节惯性。`melee-pose.js` 管理近战和受击，`ranged-pose.js` 管理拉弓、过顶投掷、施法及远程武器近战。
- `js/pk/model/visual-scale.js`：统一士兵视觉尺寸，方士与二级兵等大，将军保持普通士兵的 1.5 倍。
- `js/pk/model/arm-ik.js`：两段手臂的几何解算和武器世界朝向；`combat-contact.js` 在正式动作之后将刀尖瞄向甲面或盾面，举盾朝向来袭者，保留握把与手掌的连接，并限制关节突然翻转。
- `js/pk/model/walk-pose.js`：按移动距离推进步态，支持前进、倒退、横移、原地迈步转身，计算脚掌滚动、肩胯错相与重心变化；`foot-placement.js` 统一支撑和摆腿的足部目标，通过三维腿部逆运动学锁定落脚点，柔化伸腿极限和突发修正。
- `js/pk/model/shared.js`、`teams.js`、`textures.js`：共享几何材质缓存、阵营配色、程序贴图。
- `js/pk/model/castle.js`、`castle-details.js`、`castle-gate.js`：可升级城堡、塔窗和拱形城门；`architecture.js` 提供共用的拱窗和曲线尖顶；`scenery.js` 管理阔叶树和灌木。
- `js/pk/model/ground-texture.js`：可重复的土路石片与草地程序贴图，独立于建筑贴图。
- `js/pk/scene.js` 是战场入口，管理镜头和光照；`scene/landscape.js` 只保留环境组装入口，`backdrop.js` 管理天空、山脊和村落，`backdrop-castle.js` 管理远景主堡，`terrain.js` 管理地面与路石，`roadside.js` 管理草花、树群、木栏和战旗，`instancing.js` 管理批量网格与固定随机种子。
- `js/pk/scene/unit-motion.js`：快照动作进度预测和模型姿态同步。`motion-track.js` 缓存服务器位置样本，以 85ms 的显示缓冲平滑 20Hz 坐标，只做短时外推；`unit-heading.js` 管理转向速度与加速度、出招朝向锁定、目标注视和转身迈步。
- `js/pk/scene/combat-spacing.js`：修正快照插值后的身体重叠，普通兵和将军按各自体型留出距离；`pk_combat_geometry.py` 提供服务器的体型、身体间距、近战距离与围攻半径。更改尺寸时须同步两端；刀剑和盾牌不计入身体半径。
- `js/pk/scene/team-layout.js`：将物理左右位置与红蓝阵营分开，统一人物、城堡、头顶血条和道路军旗的阵营映射；不镜像角色或战斗坐标。
- `js/pk/scene/projectiles.js` 管理抛物线箭矢、投掷物、法球和尘团，`collapse.js` 管理城堡坍塌，`war-decor.js` 管理纯装饰的攻城器械、营帐、烽火和烟雾，`siege-tower.js` 管理木制攻城塔。
- `js/pk/scene/combat-effects.js`：战斗事件特效入口；`weapon-trails.js` 按真实武器位置绘制挥砍拖尾，`skill-effects.js` 管理将军蓄力、光刃冲击波和方士聚能、施法与命中特效；`fx-particles.js` 提供有数量上限的粒子池，`skill-geometry.js` 缓存共用特效几何和贴图。
- `js/pk/scene/atmosphere.js`：纯观赏的时间与天气入口；`sky-cycle.js` 管理日夜、天空和场景光照，`weather.js` 管理雨雪、风与雾，不读取或修改战斗属性。
- `js/pk/ui/faction-choice.js`：男将军、女将军阵营与左侧、右侧出场的独立选择及本地记忆，顶部血条按物理位置排列；`environment-controls.js`：时间、天气选择及本地偏好保存。建房、加入与人机对手阵营、位置由 `server.py` 校验。
- `css/pk-battle.css`：武道对战的顶部城堡血条、计时牌和题目面板样式。
- `css/pk-atmosphere.css`：阵营选择、对应血条配色和天气时间面板样式。

士兵战斗属性、攻击距离和服务器结算仍在 `server.py`，前端模型文件只管理画面。

近战接触与伤害仍以服务器结果为准，前端手臂和刀剑瞄准不增加额外伤害。远程攻城保留 `shot/thrust` 动作，以 `gate/ty` 标记城堡投射物，在服务端飞行计时结束后扣城堡血量；近战兵继续使用 `smash`。

`pk-preview.html?m=showcase` 查看双方部队与场景；`?m=lineup&walk=0` 查看兵种与将军；`?m=soldier&t=2&kind=archer&view=front` 单独检查某兵种。可附加 `&time=night&weather=rain` 检查夜雨等氛围；时间支持 `auto/dawn/noon/dusk/night`，天气支持 `auto/clear/wind/rain/snow/fog`。预览与正式战场使用同一套模型和生成模块。

`pk-preview.html?m=motion` 查看 14 人接敌与持续混战，可暂停和重新播放。`scene/motion-preview.js` 通过正式同步、动作和特效模块播放 `assets/pk-motion-replay.json`；运行 `python tools/pk_motion_replay.py` 可用当前服务端规则重新生成固定种子的回放，不读取或修改玩家存档。

附加 `&scene=siege` 查看弓箭手、投掷兵、长矛兵、方士攻城回放（`assets/pk-siege-replay.json`），同一个生成脚本同时更新两份回放。

## 单词闯关

- `arcade/src/levels.js`：关卡、地图、敌人血量和波次。
- `arcade/src/word-system.js`：词池选择、掌握度、错词记录和回流。
- `arcade/src/art-backgrounds.js`：地图主题与背景图层。
- `arcade/src/art-player.js`：主角绘制。
- `arcade/src/art-creatures.js`：妖物图鉴与参数化怪物绘制。
- `arcade/src/art.js`：公共绘图工具、原有的前三关怪物和绘图入口。
- `arcade/src/ambient.js`、`skills.js`、`effects.js`：环境粒子、主动技能和战斗特效。
- `arcade/src/world-renderer.js`：角色、敌人、投射物和战斗文字的世界层绘制。
- `arcade/src/hud-renderer.js`：HUD、技能栏、营地商店、提示面板和所有街机热区绘制。
- `arcade/src/game.js`：游戏状态、战斗、界面、交互和主循环；仍可继续按界面与系统拆分。

街机代码使用普通脚本加载。添加模块时，需要同时维护 `arcade/host.js`（主应用内嵌入口）和 `arcade/index.html`（独立页面）的加载顺序；模块应放在使用它的脚本之前。`node arcade/selftest13.js` 会检查两边顺序并覆盖地图、妖物和主角绘制。

## 回归检查

在项目根目录运行：

```powershell
$env:PYTHONIOENCODING = 'utf-8'
python tools/pk_selftest.py
python tools/pk_melee_test.py
python tools/pk_units_test.py
python tools/pk_faction_test.py
python tools/pk_contact_test.py
Get-ChildItem arcade -Filter 'selftest*.js' | ForEach-Object { node $_.FullName }
```

启动本地服务器后运行 `node tools/pk_motion_test.cjs`，检查快照抖动、短时丢包、急停、180 度原地转身、换脚、动作切换和真实混战回放。默认访问 `http://127.0.0.1:8792`；可用 `PK_TEST_URL` 指定地址，`PLAYWRIGHT_MODULE`、`PK_CHROMIUM` 指定本机浏览器测试依赖。该检查不创建对局或修改玩家存档。

`node tools/pk_contact_visual_test.cjs` 检查双将军及大小兵接触、实际刀尖与甲面/盾面的距离、盾牌朝向和火花位置，以及两侧各兵种的抛物线攻城投射物；使用与上述检查相同的环境变量。可选 `PK_CAPTURE_DIR` 保存检查截图。
