# Stage 10 材质响应分层

日期：2026-10-15（Asia/Shanghai）

## 实现范围

- 每个 ThemeSpec 增加六组材质响应：核心主体、饰条、玻璃，以及巨构主体、肋条、内嵌面。
- Architecture 与 Megastructure 读取主题 roughness/metalness；Theme OFF 保留 Stage 9 核心和巨构材质默认值。
- 外围建筑主体固定 .88/.02，屋顶固定 .90/.02；外围窗灯夜间强度为 .85。
- 外围城市路灯批次仅在自身调用点将夜间 glow 覆盖为 1.1。核心窗灯仍为 1.4；巨构灯带没有提高强度。
- 未调整几何、实例顺序、相机、天气预算或批次结构，也未增加依赖、API、对象、draw batch、灯光或 pass。

## 自动验收

scripts/validate-theme.mjs 校验三主题六组数值、Theme OFF 默认材质、外围主体/屋顶响应、外围窗灯上限、路灯调用点、核心窗灯强度和批次数约束。

## 验证结果

- `pnpm validate`：构建通过，38 项源码契约通过。
- `node scripts/validate-theme.mjs`：三主题响应值、OFF 默认值、外围参数、灯光和 5 个实例化 / 33 个共享盒子批次调用点通过。
- `node scripts/validate-metropolis.mjs`：4 个 Seed 的确定性、有限几何、核心保护、河道避让和桥梁跨岸通过。
- `node scripts/validate-weather.mjs`：雨雪、镜头天气层、高度雾、质量预算、运动和持久化契约通过。
- `git diff --check`：通过。构建输出包含既有的大型 bundle 提示，不影响构建成功。

## 主代理浏览器抽查

- Ember / Mega / Night / Rain / LOW：巨构暖光主角保持可读，外围窗灯和路灯降权后不再与 Hero 争夺注意力。
- Harbor / Overview / Day / Snow / LOW：城市总轮廓、河道和核心建筑仍可辨认；雪雾可以主导环境而不破坏城市层级。
- Canvas 实际截图能够渲染。辅助无障碍树会同时暴露 Canvas fallback 文案，不能仅凭该文案判定 WebGL 失败；最终以真实截图和可见画面为准。
- 本轮未提取新的数值性能样本，因此只确认批次调用点与对象结构未增长，不把旧 FPS 数据当作 Stage 10 结果。
