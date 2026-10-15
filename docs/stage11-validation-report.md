# Stage 11 视觉验收进度

## 本轮结果

2026-10-15 在桌面 Edge 打开固定 `view=quality` 链接，以页面内置 30 帧采样门槛读取真实 Canvas 指标。九个计划场景中，六个取得完整样本，三个在单次 25 秒等待窗口内仍为 `pending`。`pending` 只表示样本不足，不等同于渲染失败。

| 场景 | 状态 | FPS | Frame time | Draw calls | Triangles |
| --- | --- | ---: | ---: | ---: | ---: |
| harbor-sunset | ready | 2.06 | 486.3 ms | 54 | 114,608 |
| harbor-baseline | pending | — | — | — | — |
| verdant-sunset | ready | 1.56 | 641.0 ms | 54 | 114,608 |
| ember-sunset | pending | — | — | — | — |
| harbor-day | pending | — | — | — | — |
| harbor-night | ready | 1.02 | 976.6 ms | 54 | 114,608 |
| ember-rain-low | ready | 0.99 | 1010.5 ms | 51 | 74,160 |
| verdant-snow-balanced | ready | 1.02 | 978.9 ms | 86 | 176,238 |
| harbor-haze-mega | ready | 0.99 | 1010.9 ms | 50 | 113,588 |

这些数据只代表本轮浏览器控制环境，不外推为所有桌面设备性能。截图、状态参数和页面 Canvas 均经实际查看；辅助结构中存在 Three.js 的隐藏 fallback 文本，不能仅凭文本节点判断 WebGL 失败。

## 视觉观察

- `harbor-haze-mega`：本轮构图最清楚。低雾形成前中远分层，巨构轮廓和城市尺度参照都能读出。
- `ember-rain-low`：主角暖色层级成立，但雨幕仍偏轻，路面湿反射不够明显，远景大面积压暗。
- `verdant-snow-balanced`：冰雪天气身份明确，但镜头边缘霜层和整体泛白过强，城市层级与主题颜色被明显吞没。
- `harbor-night`：巨构灯光可辨，外围城市与水岸接近黑场，宏观城市阅读性不足。
- 晴朗日落总览能读出河道、核心建筑群和外围城市，但材质与天际线仍偏程序化，尚未达到最终美术验收标准。

## 验收结论

- URL 状态恢复：通过。
- 草稿隔离：通过。
- Canvas 实际渲染：已确认。
- 九场景完整采样：部分通过，6 / 9。
- 本轮环境性能：不通过，所有完整样本均低于 3 FPS。
- 人工视觉质量：不通过，雪天遮挡、夜景黑位、雨天力度仍需修正。
- 最终 QC：保持 `INCOMPLETE`，未调用 AI 视觉判定。

## 下一阶段

1. 优先调整雪天镜头霜层、夜景环境填充光和雨天雨幕/湿反射，保持巨构主角层级。
2. 分析本轮极低 FPS 是浏览器控制开销、场景本身还是两者叠加；先测普通可见页面和固定 LOW 场景，再决定几何、阴影或天气 pass 的优化顺序。
3. 重新运行三项 pending 场景，并对修正后的雨、雪、夜景做同机位 Before/After。
