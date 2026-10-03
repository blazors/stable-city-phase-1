# StableCity 项目接续记录

更新时间：2026-10-03（Asia/Shanghai）

## 当前目标

Art-First 3D Web City：先用确定性的 StableCity 作为稳定底座，再通过主题、天气、灯光和镜头形成可比较的视觉场景。当前优先级是宏观城市构图和视觉质量；暂不接入真实 AI、Image API 或 3D API。

## 已确认决定

- StableCity 核心结构保持稳定：16 个核心街区、60 个核心建筑、公共空地、巨构和交通骨架不因主题或天气重新生成。
- Production Console 使用同一 Run 上下文，Visual 页面与 System 页面互斥切换。
- 视觉目标：更广阔的城市尺度、河道与公园关系、分层天际线、受控灯光和非摄影写实的风格化氛围。
- Astra 只用于宏观构图、灯光、色彩、镜头和整体审美判断；普通工程、验证和 UI 收口可用其他模型继续。

## 已完成且有验证证据

- 天气氛围：晴空光晕、层云晚霞、薄雾柔光、日落和夜景调色，见 `docs/weather-validation.md`。
- 宏观城市第一轮：外围从规则矩形扩展为沿河城市，加入弯曲河道、滨水绿带、公园、桥梁、低层街区和远景建筑群。
- 画面入口：Overview 与 Mega Showcase 保持两个固定模式；总览标题改为“沿河生长的城市”。
- 工程校验：`scripts/validate-metropolis.mjs` 验证多种 seed 的确定性、核心区保护、河道避让和桥梁跨岸。
- 最近一次桌面采样（1440×960、Vite 开发服务）：约 60 FPS、16.6–16.7 ms、52 draws、约 115,082 tris；这是当前机器和当前取景的实测，不代表所有设备。
- `pnpm validate` 已通过；浏览器最终错误/警告采样为空。

## 当前工作区状态

- 稳定城市、外围都市、天气氛围、Production Console、运行报告和校验脚本均已提交到当前分支；最新接续记录见 `docs/stable-city-migration-context.md`。
- `AGENTS.md`、`output/` 和既有 `tmp/` 内容视为已有工作区内容，不能因本记录清理或删除。
- 本地开发服务可能随会话停止；继续时要先检查 `http://127.0.0.1:5173/` 是否可用，再刷新浏览器。

## 下一步（等待 Astra）

1. 评审河道—公园—核心城市—远景天际线的宏观主次关系。
2. 评审 Overview 与 Mega Showcase 的镜头语言、前中远景和巨构支配力。
3. 评审日落/夜景的灯光层级、河面反射和远景降饱和策略。
4. 只有在视觉方向明确后，才进入更高级的体积云、云影、景深或其他后处理；不先堆特效。

## 继续任务的固定恢复流程

1. 读取本文件和 `git status`。
2. 检查当前分支、最近 checkpoint 和本地开发服务。
3. 先跑 `pnpm validate` 与 `node scripts/validate-metropolis.mjs`。
4. 用浏览器重新打开 Overview，记录当前 FPS、帧耗时、draw calls、三角形和首帧时间。
5. 只处理本记录中“下一步”对应的内容；新依赖、删除文件、API 接入或受保护核心规则变更先提出 ChangeRequest。

## 工程收口验证（2026-10-03）

- `pnpm validate`：TypeScript、Vite build 和 8 项源码契约全部通过。
- `node scripts/validate-metropolis.mjs`：4 个 seed 的确定性、有限几何、核心保护、河道避让和桥梁跨岸全部通过。
- 内置浏览器抽查：Production Console 的 Overview、Assets、Quality、Pipeline、Cost、Debug、Intelligence 七个视图均能互斥切换；每次只保留一个主视图。
- 运行时组合抽查：3 个 Theme × 3 个时段 × 3 种天气共 27 组，以及 AUTO/HIGH/BALANCED/LOW 四档质量均能渲染并显示实时指标；抽查读数为约 60 FPS、16.7 ms、52 draws、107,054–115,082 tris。
- 仍未验证长时间闪烁录屏、真实移动设备 GPU 和用户视觉评分；这些属于后续验收，不伪造为已完成。

## 明确保留的工作

- 当前没有真实 Provider、模型、Image API 或 3D API 调用；接入它们必须另立 ChangeRequest。
- 宏观构图、镜头语言、天际线主次、灯光层级和高级后处理保留给 GPT-6 Astra 阶段。
