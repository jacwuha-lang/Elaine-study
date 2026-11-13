# 第三方素材署名与许可

本项目（句子魔法 / Sentence Magic）是一款家庭内部使用的英语句子改写练习工具，
**不作任何商业用途**。以下为所用第三方素材的出处与许可。

## 一、角色动画（assets/pet/）

角色形象为社区二创的 DeepSeek「大肥鱼」（鲸鱼娘），**并非 DeepSeek 官方形象**，
与 DeepSeek 官方无隶属或背书关系。

| 环节 | 出处 |
| --- | --- |
| 形象原型「溟月」 | B 站 [@上善无形](https://space.bilibili.com/4456176) |
| DeepSeek 版（女仆鲸鱼娘）设计 | B 站 [@ZipZipPipe](https://space.bilibili.com/4168597) |
| 动画素材与生成链 | [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) |
| 序列帧转码与打包 | [QCYTSN/dsh-dafeiyu](https://github.com/QCYTSN/dsh-dafeiyu) |

### 适用许可

- **代码**（上述两个仓库的源码）：MIT License
- **动画素材 / 提示词 / 源视频**：上游声明「允许开源使用，**禁止商用**」
- **角色形象**：**CC BY-NC-SA 4.0**（署名 — 非商业性使用 — 相同方式共享）

形象作者的声明原文：「大肥鱼是遵守 CC BY-NC-SA 4.0 协议的形象，
不可以以任何形式商业化。」

> 说明：`dsh-dafeiyu` 的 `ASSET_LICENSE.md` 将转码后的 `assets/pet/` 标注为 MIT。
> 但上游 `PC2005-cloud/dsh-pet` 明确保留素材的非商业限制，
> 下游转码不能单方面放宽授权。本文件按**更严格的上游条款**声明。

### 本地处理

本项目将上游 24fps 透明 WebM 序列帧重新编码为 12fps 的 animated WebP，
共 15 组动作（上游 16 组中 `waiting` 与 `working_search` 为同一段素材）。
转码不改变原始美术作品的著作权归属。

## 二、其他第三方组件

| 组件 | 用途 | 许可 / 说明 |
| --- | --- | --- |
| Edge TTS | 角色语音合成 | 调用微软 Edge 朗读接口，非公开 API，本项目不随包分发其代码 |
| DeepSeek API | 讲题、鼓励语、判分复核 | 由使用者自行填写 API Key，本项目不内置任何密钥 |

## 三、使用范围

本项目的代码与题库生成逻辑为原创。角色素材的使用限于：

- 家庭内部学习使用
- 非商业目的的技术分享

**如需商业使用，须自行替换 `assets/pet/` 下的角色素材，或向上述权利人取得书面授权。**
