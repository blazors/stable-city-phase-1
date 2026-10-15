# StableCity 项目事实与进度表

更新时间：2026-10-15（Asia/Shanghai）

本文件是项目当前状态的唯一入口。专题实现和验收细节保留在对应证据文档中；旧迁移记录仅作历史参考。

## 当前目标与不可变边界

Art-First 3D Web City 以确定性 `StableCity` 为底座，通过主题、天气、灯光和固定镜头形成可比较的视觉场景。

- 核心结构锁定：16 个核心街区、60 个核心建筑、公共空地、巨构与交通骨架不因主题或天气重建。
- Production Console 保持同一 Run；Visual 与 System 页面互斥显示，一次只承载一种观察任务。
- 视觉方向：广阔城市尺度、河道与公园关系、分层天际线、强主角剪影、受控色彩与非摄影写实氛围。
- 当前仍为 local-first procedural preview；未接入真实模型、Image API、3D API 或 Provider。
- 新依赖、删除文件、API 接入和受保护核心规则变更必须先提出 ChangeRequest。

## 阶段进度

| 阶段 | 状态 | 已验证结果 | 仍需处理 |
| --- | --- | --- | --- |
| StableCity 基础 | 已完成 | 确定性 Seed、城市语法、16 街区、60 建筑、巨构、交通与结构签名 | 不得被主题/天气破坏 |
| Stage 4 宏观构图 | 已完成工程实现 | 弯曲河道、滨水绿带、公园、桥梁、次峰与 288 个外围建筑；多 Seed 几何校验通过 | 用户最终审美评分仍待完成 |
| 天气与氛围 | 已完成当前范围 | 晴、雨、雪、雾四类；湿路/水洼、暴雪/结冰、高度雾、水面、云层、光晕和天气镜头层 | 当前为艺术化近似，不宣称 SSR 或物理体积模拟 |
| Stage 6 性能证据 | 已完成机制与一次人工矩阵 | 可见 Canvas 帧采样、revision 作废、后台暂停；2026-10-14 完成 Overview 48 格 + Mega 12 格人工浏览器抽查 | 原始逐格 JSON 未落盘，尚不是可重放自动回归 |
| Stage 7 固定机位与预算 | 已完成 | Overview/Mega 默认固定相机；默认禁用轨道与摇晃；HIGH 2048、AUTO/BALANCED 1024、LOW 512 阴影预算及分级 DPR | 自由观察入口尚未做产品决定 |
| Stage 8 质量页真实对照 | 已完成 | Quality 页在同一个 Canvas、同一镜头/天气/时段内切换 StableCity 基线与当前主题；切换会生成新的真实采样 revision | 仍需用户观看判断主题提升是否足够 |
| Stage 9 主题材质分区 | 已完成工程实现与主代理实景抽查 | 三个 Theme 已进入核心建筑、外围城市、巨构、玻璃、植被和发光材质；Theme OFF 保持固定基线；Ember 雨夜 LOW 仍保持主角层级 | Harbor / Verdant / Ember 的最终审美仍需用户评价 |
| Stage 10 材质响应与发光层级 | 已完成工程实现与主代理实景抽查 | 三主题具备独立 roughness/metalness；外围窗灯与路灯降权；Ember 雨夜 LOW、Harbor 白昼雪天仍可读；批次调用点未增长 | 三主题完整 10 组视觉矩阵与用户最终评分仍待完成 |
| Stage 11 无依赖视觉验收计划 | 已完成状态隔离并取得 6 / 9 场景样本 | 固定链接准确恢复状态且不回写草稿；桌面浏览器确认 Canvas 实际渲染；雨、雪、夜景、雾海已取得 30 帧指标与人工观察 | 三项场景仍 pending；本轮完整样本均低于 3 FPS；雪天遮挡、夜景黑位和雨天力度未通过视觉验收 |
| 自动浏览器回归 | 阻断 | 现有源码、构建和人工浏览器验收可继续 | 引入 Playwright 等新依赖前需 ChangeRequest |
| 外部 AI/API | 延后 | Provider 状态与成本均如实显示为未接入、$0 | API 凭据、预算与批准流程确认后再做 |

## 当前运行基线

- Stage 6 验收环境：1280×720、DPR 1、本机内置浏览器。
- 代表性样本约 59–61 FPS、16.3–17.0 ms。`frameMs` 是 Canvas 采样节拍，draw calls / triangles 是最近渲染帧计数，不是 GPU 时间或跨设备保证。
- Overview 夜雨：HIGH 87 draws / 208,324 tris；LOW 55 / 75,180。
- Overview 夜雪：HIGH 87 / 207,122；LOW 55 / 77,818。
- Mega 夜雨：HIGH 77 / 206,212；LOW 45 / 73,068。
- Mega 夜雪：HIGH 77 / 205,010；LOW 45 / 75,706。
- 2026-10-03 的约 52 draws、107k–115k tris 是历史版本读数，不再代表当前场景。

## 验收矩阵

- 自动工程检查：TypeScript、Vite build、源码契约、城市确定性和天气数学校验必须全部通过。
- 浏览器验收：固定相机、单 Canvas 主题对照、采样签名/revision、风险天气和控制台错误由主代理实测。
- 视觉验收：用户对宏观城市、灯光、天气强度和主题对照的评价仍是最终标准。
- 设备验收：长时间闪烁录屏、真实移动 GPU 与多设备性能尚未完成，不得写成已通过。

## 当前队列与 ChangeRequest

1. 收集用户对 Stage 10 材质响应和外围降权的视觉反馈，不再继续盲目微调参数。
2. 按 Stage 11 报告先修正雪天镜头霜层、夜景环境填充光和雨天雨幕/湿反射，再补跑三项 pending 场景并做同机位 Before/After。
3. 若要接入真实 Provider / Image / 3D API，先确认服务、密钥管理、预算和批准门。
4. 真实 SSR、物理水体、体积云/云影、真实大气散射和景深继续延后，避免在性能边界确认前堆叠高成本 pass。

## 固定恢复流程

1. 读取本文件并检查 Git 状态、当前分支和最近 checkpoint。
2. 检查本地开发服务；需要时重新启动并打开 `http://127.0.0.1:5173/`。
3. 运行 `pnpm validate`、`node scripts/validate-metropolis.mjs`、`node scripts/validate-weather.mjs`、`node scripts/validate-theme.mjs` 和 `git diff --check`。
4. 在真实浏览器记录 viewport、DPR、质量、天气、镜头、主题状态、revision、FPS、frame time、draw calls、triangles 与控制台错误。
5. 只推进本进度表当前队列；任何扩大范围的变更先提出 ChangeRequest。

## 专题证据

- 宏观构图：`docs/macro-composition-validation.md`
- 天气与镜头：`docs/weather-validation.md`
- 固定机位与质量预算：`docs/stage7-fixed-camera-validation.md`
- 主题材质分区：`docs/stage9-theme-material-validation.md`
- 材质响应与发光层级：`docs/stage10-material-response.md`
- 历史迁移说明：`docs/stable-city-migration-context.md`（非当前事实源）
