# Stage 7 · 固定机位与质量预算

## 目标

Stage 7 先建立可重复的视觉对照，不增加城市体量或新后处理。Overview 与 Mega 沿用已经通过投影测试的相机位置、焦点和 FOV；默认关闭轨道交互与相机摇晃，避免时段、天气和质量切换时把镜头漂移误认为画面差异。

## 固定构图

- Overview：完整读出河道两岸、公园走廊、核心巨构、次级峰值、城市低谷和外围绿色缓冲。
- Mega：完整读出巨构门洞、顶部肋条、左侧楼塔尺度参照、门洞后的低层城市和交通尺度。
- 时段、天气、质量和主题切换不得改变相机位置、焦点或 FOV。
- 固定状态下禁用 OrbitControls 与 CameraShake；Scene 仍保留显式 `cameraLocked` 接口，后续若增加“自由观察”入口，返回固定状态必须恢复预设。

## 质量预算

| 档位 | DPR | 主太阳阴影贴图 |
| --- | --- | --- |
| AUTO | 1–1.5 | 1024² |
| HIGH | 1–2 | 2048² |
| BALANCED | 1–1.25 | 1024² |
| LOW | 1 | 512² |

天气、城市结构和 Hero 轮廓在所有档位保持一致；降低档位只削减像素密度、阴影分辨率、粒子和细节预算。

## 验收边界

READY 输出已暴露 `configSignature`、revision、有效帧、采样时长、FPS、frame time、draw calls 和 triangles，浏览器驱动可直接生成逐格 JSON/CSV。fallback 由 `.scene-fallback` 查询，console 与 page error 必须由浏览器监听。

完整自动矩阵仍需浏览器驱动依赖。仓库当前没有 Playwright；根据 ChangeRequest 规则，本阶段没有自行新增依赖，也不把 60 格矩阵标记为自动化通过。建议后续审批后增加 `accept:stage7`：Overview 48 格、Mega 风险 12 格，并始终落盘失败行和运行环境信息。

## 验证命令

- `pnpm validate`
- `node scripts/validate-metropolis.mjs`
- `node scripts/validate-weather.mjs`
- `git diff --check`
