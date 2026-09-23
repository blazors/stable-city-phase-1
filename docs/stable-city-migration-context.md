# StableCity 迁移开发上下文

> 用途：把本文件交给 Mac 上的 ChatGPT/Codex，作为继续开发本项目的唯一启动上下文。代码事实以当前 Git 分支为准，聊天记录只作为背景。

## 项目身份

- 项目：StableCity Phase 1 / Art-First 3D Web City
- Git：`https://github.com/blazors/stable-city-phase-1.git`
- 当前分支：`codex/stable-city-phase1`
- 当前 checkpoint：`403ef84 优化城市天际线层次并改善日落河岸光照`
- 技术栈：React 19、TypeScript、Vite、Three.js、@react-three/fiber、@react-three/drei
- 包管理器：pnpm
- 本地启动：`pnpm install` 后执行 `pnpm dev`

## 产品目标

构建一个程序化、风格化、具有明确美术方向的 3D Web 城市。重点是观看城市，而不是城市经营玩法。

视觉优先级：

```text
Art Direction > Composition > Silhouette > Atmosphere > Theme Identity > Urban System > Performance > Management Gameplay
```

目标画面：宏观城市尺度、河道、公园、城市群、分层天际线、清晰 Hero、受控灯光、柔和大气深度、夸张但可读的尺度。

## 已锁定的核心规则

- StableCity 是稳定底座：16 个核心街区、60 个核心建筑、公共空地、巨构和交通骨架保持确定性。
- CitySeed、UrbanGrammar、StableCity、ThemeOverlay、AssetRegistry、EnvironmentState、FinalScene 是主要数据链。
- Theme、天气和资产不能重建或破坏核心道路、地块、基础体量和交通结构。
- Theme OFF 后 StableCity 仍必须成立。
- 每个镜头只允许一个真正 Hero；Overview 需要 1 个 Hero、2–3 个次级峰值、明确 Valley/Void、前中远景。
- Mega Showcase 中巨构是唯一 Hero，周围建筑、河道、桥梁、车辆和轨道负责提供尺度参照。

## 当前已实现

- `src/city.ts`：确定性的 StableCity 核心、UrbanGrammar、交通图、签名和结构校验。
- `src/metropolis.ts`：确定性的外围城市；弯曲河道、滨水绿带、公园、桥梁、低层街区、远景建筑群和分层建筑变体。
- `src/CityScene.tsx`：Three.js 场景、Overview/Mega 镜头、巨构、交通、河面 shader、灯光和实时性能指标。
- `src/Atmosphere.tsx`：晴空光晕、层云晚霞、薄雾柔光、日落和夜景天空。
- `src/App.tsx`：Production Console；Visual（Overview/Assets/Quality）和 System（Pipeline/Cost/Debug/Intelligence）互斥整页切换。
- `src/runPersistence.ts`：本地 Run、QC、性能和报告状态保存。
- `scripts/validate-source.mjs`：8 项源代码契约校验。
- `scripts/validate-metropolis.mjs`：多 seed 确定性、有限几何、核心保护、河道避让、桥梁跨岸校验。

## 已验证事实

最近一次 Mac/Windows 迁移前的桌面采样为 1440×960、Vite 开发服务：约 60 FPS、16.6–16.7 ms、52 draws、约 110,114–115,082 triangles；不同镜头会改变可见对象计数。`pnpm validate` 与 `node scripts/validate-metropolis.mjs` 均通过。当前项目没有真实 Provider、模型、Image API 或 3D API 调用。

## Astra 工作范围

Astra 只负责高阶视觉判断和实现指导：

1. 河道、公园、核心城区和远景天际线的主次关系。
2. Overview 与 Mega Showcase 的镜头语言、前中远景和巨构支配力。
3. 日落/夜景的灯光层级、河面反射、远景降饱和和色彩控制。
4. 之后再考虑体积云、云影、景深或其他后处理。

普通工程、构建、测试、文案、UI 收口可使用 Terra/Luna；API 接入另立 ChangeRequest。

## 继续开发前的固定流程

```text
读取本文件
→ git status / git log -1
→ pnpm validate
→ node scripts/validate-metropolis.mjs
→ 启动 pnpm dev
→ 浏览器打开 Overview，记录真实 FPS、frame time、draw calls、triangles、首帧时间
→ 只实现当前下一项并进行视觉验证
```

## 当前下一项

继续做 Astra 视觉阶段：审查并优化宏观构图、镜头语言、天际线和灯光层级。保留核心 StableCity 结构，不新增依赖，不接 API，不删除文件，不修改受保护核心规则；若必须改变这些边界，先提出 ChangeRequest。

## 迁移边界

- Git 仓库迁移代码、提交历史和本文件。
- ChatGPT 对话可以同账号同步；不同账号只能导出 `conversations.json` 后上传参考，不能恢复原聊天侧边栏。
- Codex/浏览器 Skill 属于本机或工作区配置，Mac 需要单独检查和安装。
- 不要把 API Key、Jev Key、登录凭据、本机缓存或 `tmp/` 上传到 Git。
