# Stage 9 主题材质分区验收

日期：2026-10-15（Asia/Shanghai）

## 目标

让 Theme ON 不再只改变少量楼面与灯带，而是在不改变 StableCity、相机、天气、实例数量和 draw batch 的前提下，形成可辨认的建筑材质身份。

## 实现

- ThemeSpec 新增主体明暗、饰条、玻璃、植被、发光、巨构主体和内缘材质槽。
- 核心城市、外围城市和巨构消费同一主题调色表；Theme OFF 使用固定基线值。
- 外围城市保留 Seed 生成的明度和实例顺序，只在 `useMemo` 中进行 25% 色相/饱和度混合。
- 日间和日落填光小幅降低，夜景灯光结构保持；窗灯发光强度统一为 1.4。
- 未增加依赖、对象、draw batch、后处理或逐帧颜色分配。

## 自动验证

- `pnpm validate`：构建与 38 项源码契约通过。
- `node scripts/validate-metropolis.mjs`：4 个 Seed 的确定性、有限几何、核心保护、河道避让和桥梁跨岸通过。
- `node scripts/validate-weather.mjs`：雨雪、天气镜头层、高度雾、质量预算、运动与持久化契约通过。
- `node scripts/validate-theme.mjs`：三主题八个材质槽、外围混色比例、Seed 明度、填光值和夜间发光强度通过。
- `git diff --check`：通过。

## 浏览器实景抽查

入口：内置浏览器 `http://127.0.0.1:5174/?v=stage9-materials`。

- Harbor、Verdant、Ember 均在 Quality 单画布中切换并观察 Theme ON；标题与主题状态同步。
- Ember / Mega / Night / Rain / LOW：暖铜巨构、冷暗内缘与窗口层级仍可读，主题身份不依赖 HIGH 档特效。
- Theme OFF/ON 控件仍使用同一画布、同一固定机位、同一天气和时段。
- 本次没有从 Quality 页提取新的数值性能样本，因此不把历史 FPS、draw calls 或 triangles 冒充为 Stage 9 实测；性能结论仅限“实现未增加批次和对象”，后续仍需保存可重放的数值证据。

## 未完成

- 用户尚未给出 Harbor、Verdant、Ember 的最终视觉评分。
- 完整 12 状态截图矩阵和可重放浏览器数据仍未落盘。
- 真实移动 GPU、长时间闪烁录屏和跨设备性能仍未验证。
