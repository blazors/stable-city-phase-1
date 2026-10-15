# Stage 11 无依赖视觉验收计划

## 已实现

- 只有 URL 首个 `view` 参数严格等于 `quality` 时进入临时验收态；`theme`、`mode`、`time`、`weather`、`quality`、`compare` 分别严格枚举。缺失或非法字段各自回退为 `harbor / overview / sunset / clear / high / theme`，重复字段采用 `URLSearchParams.get()` 的第一项。
- 验收 URL 状态覆盖相应初始状态，不从 UI 草稿补字段。验收态期间所有 UI 草稿保存 effect 都跳过；不带 `view=quality` 重新打开时继续使用既有草稿加载语义。
- Quality 页只在验收态显示“链接预览 · 未保存到草稿”和“导出验收清单”。导出是 `schemaVersion: 1` 的计划 JSON，不包含真实截图或通过结论。
- 固定 9 场景为：`harbor-sunset`、`harbor-baseline`、`verdant-sunset`、`ember-sunset`、`harbor-day`、`harbor-night`、`ember-rain-low`、`verdant-snow-balanced`、`harbor-haze-mega`。每项都带完整相对 URL、`captureTarget: [aria-label="视觉质量预览"]` 和 `evidenceStatus: not-executed`。
- 计划固定 `cameraLocked: true`、1280×720、deviceScaleFactor 1，并说明动画场景不要求逐帧像素一致。
- `quality-stage` 的 `data-acceptance-status` 在非验收态为 `inactive`；验收态仅在当前 revision 样本 ready、首帧耗时非空、无场景错误且页面可见时为 `ready`，错误、后台暂停和其余未就绪状态分别为 `error`、`paused`、`pending`。

## 场景参数

| 场景 | Theme | Camera | Time | Weather | Quality | Compare |
| --- | --- | --- | --- | --- | --- | --- |
| harbor-sunset | harbor | overview | sunset | clear | high | theme |
| harbor-baseline | harbor | overview | sunset | clear | high | baseline |
| verdant-sunset | verdant | overview | sunset | clear | high | theme |
| ember-sunset | ember | overview | sunset | clear | high | theme |
| harbor-day | harbor | overview | day | clear | high | theme |
| harbor-night | harbor | overview | night | clear | high | theme |
| ember-rain-low | ember | mega | night | rain | low | theme |
| verdant-snow-balanced | verdant | overview | day | snow | balanced | theme |
| harbor-haze-mega | harbor | mega | sunset | haze | high | theme |

## 验收边界

纯函数与源码契约验证计划解析、场景清单结构及状态门槛；构建成功不代表 9 个 URL 已经在浏览器逐一运行。当前导出的所有证据状态都是 `not-executed`，不标记 PASS、不伪造截图或渲染指标。动画帧可能随时间变化，跨运行不做逐像素一致承诺。

## 本轮真实验证

- 在内置浏览器打开 `ember / mega / night / rain / low / theme` 验收链接，页面准确恢复了六项状态，并显示“链接预览 · 未保存到草稿”与导出入口。
- 随后打开不含 `view=quality` 的新链接，既有草稿仍恢复为 `harbor / overview / day / snow / low / theme`，证明验收链接没有覆盖草稿。
- 本轮浏览器 WebGL 场景返回了应用的降级提示；刷新与释放旧标签后仍未恢复。因此没有把任何场景标记为视觉通过，也没有记录截图或性能数据。该运行时问题需在下一轮证据采集前单独排查。
