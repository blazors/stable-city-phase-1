# Stage 4 macro composition

Stage 4 keeps the locked StableCity core, river equations, four bridges and metropolitan world boundary unchanged. The Overview camera retreats to show both river banks, the central park corridor, the two secondary skyline peaks and the softened green city edge in one frame. Linear scene fog and the water distance haze receive the same Overview-only distance compensation; Mega Showcase keeps its previous camera and fog behavior.

Outer density is still deterministic. Selected non-garden, non-tower parcels replace one generic mass with two smaller offset masses; the result is 288 outer buildings for the default and validation seeds, compared with the 291-building Stage 3 baseline. The small net reduction comes from reserving the continuous northern green buffer, while the paired parcels add local building-group rhythm. Each resulting mass owns one aligned roof and terrace. The northern buffer and central park clearing prevent the additional rhythm from filling every void.

Quality presets never remove land, roads, parks, bridges or base buildings. Balanced and Low only use stable prefix samples for trees, windows and waterfront lights; Low also removes non-tower roof terraces. This keeps the city silhouette and navigation landmarks stable while reducing peripheral detail.

Automated validation covers four seeds, protected-core and river clearance, bridge spans, density budget, attached roofs and terraces, northern green buffer, two-building parcel presence, wide Overview framing, camera far/orbit bounds, fog compensation and quality-detail contracts. Browser validation must still inspect Overview in clear day/sunset/night and haze, plus Mega day/night, because passing geometry and projection checks does not establish visual quality.

## Stage 15 · 都市纵深与滨水夜景

本阶段冻结 StableCity 核心、Overview/Mega 相机、河道公式、四桥位置、天气强度和巨构本体，只重组外围城市的宏观层级。东北次峰从巨构正后方移向外围，并将两组峰群的高度上限约束为 38；中央 `|x| <= 54` 的低层视廊继续保持不高于 8。外围建筑仍使用确定性生成，默认验证种子为 291 栋，没有扩张城市边界。

公园新增一条连续主步道，连接到 x=-66 的桥南入口。两条外围大道和公园步道使用同一个实例化发光批次形成断续夜景光路；光路在河岸停止，不跨水面悬空。外围窗灯拆成中景暖光与远景低强度冷光两个层级，实际点光源数量不增加。

首轮 1280×720、DPR 1、Harbor / Overview / Clear / LOW 实景复核确认：白昼可以看到偏移后的远景峰群、中央谷地、河道和公园轴线；夜晚核心暖光仍是第一焦点，远景冷光没有覆盖核心。LOW 夜景运行样本为 55 draws / 75,148 triangles；这只证明本轮实际工作量，没有证明 GPU 时间相同。程序化滨水暖色反射没有和本轮合并，避免同时修改水 shader 后难以判断构图收益。

## Stage 16 · 外围建筑轮廓

保留 `buildings` 作为 Stage 15 的逻辑基线，另派生一段式 `visibleBodies` 和 `upperMasses`：花园街区使用偏置上层体量，双峰塔楼使用较窄的顶部塔身，普通街坊只对由坐标与既有 variant 决定的稳定子集添加偏置短翼或上层。上层楼体下段缩至上层底部，两段只相接、不重叠；屋顶缩至上层轮廓并随之偏移，雪盖继续从 `roofs` 计算。所有可见体量均在逻辑建筑包围盒内，不抬高原有最高点；上层楼体中过高的旧窗被裁掉。筛选与尺寸计算不调用随机数，既有 `buildings` 清单、Seed、道路、河流、核心、相机与天气保持不变。

新轮廓使用现有 `Boxes`/InstancedMesh 路径新增单一批次，继续响应主题主体色，且在 LOW 保留。工程验证覆盖多 Seed 确定性、Stage 15 建筑清单签名、上层体量归属与包围盒、核心/河流净空、主题着色和批次调用点。

主代理在内置浏览器以 1280×720、DPR 1、Harbor / Overview / LOW 做了日落、夜晚与雪夜复核：近景花园街区、远侧街坊与双峰塔楼已出现可辨认的退台轮廓，核心巨构仍是第一焦点，雪盖跟随缩小后的实际屋面，没有保留整块悬浮顶板。晴朗日落样本为 59.99 FPS / 16.67 ms / 56 draws / 76,444 triangles，晴朗夜晚样本为 58.96 FPS / 16.96 ms / 56 draws / 76,444 triangles，雪夜样本为 60.38 FPS / 16.56 ms / 58 draws / 80,368 triangles，Canvas 首帧初始化 156 ms。相对 Stage 15 LOW 夜景样本，晴朗场景增加 1 draw 与 1,296 triangles；FPS 接近显示刷新上限，只记录为本机可见页面样本，不推导 GPU 成本。
