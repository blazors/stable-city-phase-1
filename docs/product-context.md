# StableCity 项目事实与进度表

更新时间：2026-10-20（Asia/Shanghai）

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
| Stage 7 镜头预设与质量预算 | 已完成并恢复交互 | Overview/Mega 使用稳定预设；场景支持旋转、缩放和平移，并可重置回当前预设；不启用相机摇晃；HIGH 2048、AUTO/BALANCED 1024、LOW 512 阴影预算及分级 DPR | 用户最终交互手感仍可继续反馈 |
| Stage 8 质量页真实对照 | 已完成 | Quality 页在同一个 Canvas、同一镜头/天气/时段内切换 StableCity 基线与当前主题；切换会生成新的真实采样 revision | 仍需用户观看判断主题提升是否足够 |
| Stage 9 主题材质分区 | 已完成工程实现与主代理实景抽查 | 三个 Theme 已进入核心建筑、外围城市、巨构、玻璃、植被和发光材质；Theme OFF 保持固定基线；Ember 雨夜 LOW 仍保持主角层级 | Harbor / Verdant / Ember 的最终审美仍需用户评价 |
| Stage 10 材质响应与发光层级 | 已完成工程实现与主代理实景抽查 | 三主题具备独立 roughness/metalness；外围窗灯与路灯降权；Ember 雨夜 LOW、Harbor 白昼雪天仍可读；批次调用点未增长 | 三主题完整 10 组视觉矩阵与用户最终评分仍待完成 |
| Stage 11 无依赖视觉验收计划 | 已完成状态隔离并取得 6 / 9 场景样本 | 固定链接准确恢复状态且不回写草稿；桌面浏览器确认 Canvas 实际渲染；雨、雪、夜景、雾海已取得 30 帧指标与人工观察 | 三项场景仍 pending；本轮完整样本均低于 3 FPS；雪天遮挡、夜景黑位和雨天力度未通过视觉验收 |
| Stage 12 天气与夜景首轮修正 | 已完成工程实现与主代理实景初检 | 雪天霜层降权；夜景环境填充提升；雨丝、湿路和水面高光增强；未增加粒子、灯光、几何或 pass | 雨滴镜片仍偏抢眼；未完成严格同场景性能 A/B；整体视觉与性能仍未最终通过 |
| Stage 13 固定条件天气对照 | 已完成两轮 LOW 初测与基准守卫 | `harbor / overview / day / low` 下只切天气；验收模式固定 DPR 1、校验 1280×720，并在采样前丢弃热身帧；环境不符时返回 mismatch | 浏览器控制环境约 22.5 FPS 封顶，尚需多轮中位数或普通浏览器直接测量；雨滴视觉权重仍待单变量复核 |
| Stage 14 多轮中位数与雨滴复核 | 已完成主代理实景验收 | 三轮轮换共 9 个 READY 样本稳定在约 60 FPS；天气 Draw Call / 三角形增量与 Stage 13 一致；Ember 夜间巨构 LOW/BALANCED 连续复核中 Hero 均保持第一焦点 | 60 FPS 仍是节奏上限，不能推导 GPU 成本；BALANCED 大雨滴较醒目但未达到需要调参的证据门槛 |
| Stage 15 都市纵深与滨水夜景 | 已完成首轮工程实现与主代理实景复核 | 外围次峰移出 Hero 后方并形成双侧峰谷；公园主轴连续接入 -66 桥；夜景新增两条断续都市光路，远城改为低权重冷色窗光；核心、相机、河道、四桥、天气和巨构本体保持冻结；程序化滨水反射已由后续独立里程碑完成 | 用户审美评价待定 |
| Stage 16 外围建筑轮廓 | 已完成工程实现与主代理日落/夜晚/雪夜实景复核 | `buildings` 保留为 Stage 15 逻辑基线；新增 `visibleBodies` 与 `upperMasses` 形成相接、无体积重叠的轮廓分段；屋顶及雪盖贴合实际最高体量；单一共享 Boxes 批次，LOW 保留；晴朗场景实测较 Stage 15 增加 1 draw / 1,296 triangles | 用户审美评价仍待复核；当前 FPS 接近刷新上限，不能据此推导 GPU 成本 |
| Stage 17 外围立面节奏 | 已完成工程实现与主代理日落/夜晚/Theme OFF 实景复核 | 派生 garden / neighborhood / tower 三类立面节奏；新增共享 facadePanels 批次，636 个实例 / 7,632 triangles，内嵌到可见主体和塔楼上层；区分主体 intrinsic lightness；LOW 与 Theme OFF 均保留；实测较 Stage 16 增加 1 draw / 7,632 triangles，浏览器无 error | 用户最终审美评价仍待完成；当前 FPS 接近刷新上限，不能据此推导 GPU 成本 |
| Stage 18 公共空间地标系统 | 已完成工程实现与主代理白昼/夜晚/雪天实景复核 | 滨水叠檐亭与深公园南向开口 U 形棚架作为确定性派生几何；共享一个 Boxes 批次，LOW 保留；8 段低权重暖光仅在夜景实例化；雪盖只覆盖亭顶与平台；公园树在渲染派生时避让地标 footprint；原 buildings、河道、桥、相机、巨构和随机序列保持不变。白昼 LOW 为 59.99 FPS / 16.67 ms / 58 draws / 83,844 tris；夜晚 LOW 为 58.62 FPS / 17.06 ms / 59 draws / 83,940 tris；浏览器无 error | 用户最终审美评价仍待完成；当前 FPS 接近刷新上限，不能据此推导 GPU 成本 |
| Stage 19 Theme Signature Assets | 已完成工程实现与主代理 Overview/Mega 实景复核 | 保留三主题低位公共空间 signature，并在 Megastructure 两侧安全区追加可逆 Hero attachments：Harbor 双侧开放门框、Verdant 双侧三级水平翼棚、Ember 双侧向外递高三齿风帽；Theme OFF 返回空资产且不挂载 Overlay；实体共享一个无阴影 Boxes 批次，夜间强调共享一个低发光批次；LOW 保留完整资产；不修改 Megastructure Core、Metropolis/StableCity、道路、河桥或相机。Theme OFF 白昼 LOW 基线为 58 draws / 83,844 tris；Harbor、Verdant、Ember 白昼均为 59 draws，分别为 84,180 / 84,084 / 84,228 tris；Ember 夜雨 Overview LOW 为 63 draws / 85,700 tris，Mega 为 55 draws / 81,956 tris；全新浏览器无 error | 用户最终审美评价仍待完成；约 60 FPS 接近刷新上限，不能据此推导 GPU 成本 |
| Production Console 执行通道入口 | 已完成信息架构优化与主代理浏览器验收 | Pipeline 标题后常显四张原生单选通道卡：Auto · 自动选择为当前唯一可用的本地规则模板（非 AI）；Codex、3D API、Hybrid 明确未接入，并展示各自接入前置条件。固定摘要说明当前真实执行源为本地规则模板、非 AI、无模型调用、$0；不提供缺少后端和密钥存储支持的配置按钮，3D API Key 需未来 Provider 设置且不在当前页面输入。请求意图仍与实际 `local-template` 分开记录；切换仅影响后续新入队任务，草稿格式与恢复行为不变。运行日志 ID 在 8 条窗口后继续单调递增，并兼容旧草稿的重复 ID。`pnpm validate`、专项校验与 `git diff --check` 通过；全新浏览器 console error 为 0 | 真实 Codex、3D API 与 Hybrid 执行尚未接入，状态不得改为可用 |
| 自动浏览器回归 | 阻断 | 现有源码、构建和人工浏览器验收可继续 | 引入 Playwright 等新依赖前需 ChangeRequest |
| 外部 AI/API | 延后 | Provider 状态与成本均如实显示为未接入、$0 | API 凭据、预算与批准流程确认后再做 |

### Pipeline 页面收敛（2026-10-21）

- Pipeline 只保留 ProductionPanel：本地制作要求拆分、请求通道选择、ThemeSpec 候选确认、任务运行、人工审核/退回、完成留档、浏览器本地草稿和运行记录导出均为真实可操作能力。
- 移除页面中的静态 Timeline、Stage Status、Duration、Retry、Blocker 和 Decision gate 摘要；这些字段没有独立数据源，容易把 Canvas 状态、Provider 状态或固定的 `0` 误读为真实流程运行结果。
- Pipeline 仍作为普通 SYSTEM 导航入口，因为 ProductionPanel 具有独立价值；Overview 的自然语言 Mood 生成不重复迁移到 Pipeline。Provider 继续明确标记为未接入，不声称已有外部执行。

## 当前运行基线

### 画面记录 Snapshot V1（2026-10-21）

- Overview 提供轻量“记录此画面 / 查看记录”入口；V1 记录 Three/R3F 场景基础渲染（不含 DOM 界面及镜头后处理），下载 PNG 与同一 `snapshotId` 的 JSON sidecar，不把 PNG/base64 写入 localStorage。
- 浏览器只保存经过 allowlist 清理的最近 metadata；记录包含版本化 schema、CitySeed/StableCity、Theme/Mood、时间天气、相机、质量/viewport、真实 local-rule 执行事实、提示词字段、性能指标和恢复限制。当前未接 Provider 的字段为 `none`、`null`、`0` 或 `local-rule`，不伪造 API 响应。
- 恢复支持主题、氛围、时段、天气、镜头模式和质量；相机位置/target/fov 记录用于证据，但当前恢复动作不宣称完整相机恢复。截图失败不下载空 PNG，也不写入记录。
- 仅完成代码级与构建验证；未宣称真实浏览器视觉验收通过。仍需主代理在真实浏览器确认截图文件、JSON sidecar、恢复交互和无 UI 像素。

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
2. 请用户直接观看 Stage 16/17 的 Harbor Overview 白昼、日落、夜晚、雪天与 LOW；根据轮廓和立面节奏辨识度、实际 draw-call 变化决定是否接受本阶段。
3. 请用户直接观看 Stage 19 的 Harbor / Verdant / Ember Overview 白昼 LOW 与 Ember 夜雨；判断 Hero 附件是否形成足够明确且不过度的主题差异。
4. 完成真实移动 GPU、多设备与长时间闪烁录屏验收；当前本机 60 FPS 样本不能替代这些证据。
5. 若要接入真实 Provider / Image / 3D API，先确认服务、密钥管理、预算和批准门。
6. 自动浏览器回归需要新增依赖的 ChangeRequest；真实 SSR、物理水体、体积云/云影、真实大气散射和景深继续延后。

## 固定恢复流程

1. 读取本文件并检查 Git 状态、当前分支和最近 checkpoint。
2. 检查本地开发服务；需要时重新启动并打开 `http://127.0.0.1:5173/`。
3. 运行 `pnpm validate`、`node scripts/validate-metropolis.mjs`、`node scripts/validate-weather.mjs`、`node scripts/validate-theme.mjs` 和 `git diff --check`。
4. 在真实浏览器记录 viewport、DPR、质量、天气、镜头、主题状态、revision、FPS、frame time、draw calls、triangles 与控制台错误。
5. 只推进本进度表当前队列；任何扩大范围的变更先提出 ChangeRequest。

## 专题证据

### Natural language Mood V1（2026-10-20）

- 已加入版本化 `MoodSpec` / `ResolvedMood` 与 `source=local-rule` 本地规则解析器；规则可组合时段、降水、冷暖/红雾/白雾、湿润、雾、巨构灯光和镜头响应，输入案例仅作提示。
- 总览页提供多行自然语言输入、生成与恢复入口；总览中的独立时段/天气控件已移除，由 Mood 统一决定，镜头与质量继续保留；Quality 页仍保留固定环境控件用于验收。`activeMood`、`prompt`、`source`、`version` 随 UI 草稿持久化，并兼容旧草稿迁移。
- 普通视觉导航只公开 Overview；Assets 与 Quality 的现有实现暂作为内部能力保留，不再占用主导航。旧草稿若停留在这两个页面会自动回到 Overview，视觉验收 URL 仍可进入 Quality。
- Debug 仅保留为内部诊断实现，不出现在普通 SYSTEM 导航；旧草稿若停留在 Debug 会迁移到 Pipeline，资产页的日志入口也回到可操作的流程页。Run facts、Provider 占位、伪日志、原始 JSON 与 QC gate 不作为普通用户导航能力删除，继续供内部验收与诊断使用。
- 仅完成代码级与构建验证；未声称视觉验收通过。真实浏览器、多设备性能和协同氛围的最终视觉验收仍由主代理执行。

- 滨水反射与夜间层次：Water 继续使用单个 20,000×20,000 水面 plane；五个 `riverReflectionSources` 由 TypeScript 展开为固定 GLSL 锚点，暖/冷反射色分别为 #d6a66e 与 #58798c。反射仅作用于河道，日/日落/夜采用 .12/.42/1 强度，雨/雾衰减，雪与河道冰面关闭新增动态反射；现有整岸暖碎光已降低以免叠加。无新增 mesh、pass、API 或依赖。源码测试约束固定锚点、颜色、日夜/天气门控和单水面 plane。2026-10-18 在内置浏览器 Harbor / Overview / Night / Clear / LOW 实测：60.01 FPS、16.66 ms、57 draws、84,076 triangles、Canvas 首帧 121 ms；与上一里程碑对象统计相同。夜景河面保持暗面、反射锚点可辨且未压过 Hero；Snow 状态已确认加载且源码门控关闭新增动态反射。
- 宏观构图：`docs/macro-composition-validation.md`
- 天气与镜头：`docs/weather-validation.md`
- 固定机位与质量预算：`docs/stage7-fixed-camera-validation.md`
- 主题材质分区：`docs/stage9-theme-material-validation.md`
- 材质响应与发光层级：`docs/stage10-material-response.md`
- 历史迁移说明：`docs/stable-city-migration-context.md`（非当前事实源）
