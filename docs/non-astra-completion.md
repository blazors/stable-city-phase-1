# StableCity 非 Astra 工程收口

更新时间：2026-10-03（Asia/Shanghai）

这份清单用于迁移和断档恢复。它只记录可以独立开发、构建和验证的工程内容，不把审美判断或外部 API 接入伪装成已完成。

## 已完成

- **稳定城市底座**：CitySeed、UrbanGrammar、16 个核心街区、60 个核心建筑、地块、公共空地、巨构和交通图保持确定性。
- **宏观外围工程**：弯曲河道、滨水绿带、公园、桥梁、低层街区、远景建筑群和分层建筑变体已经接入；河道避让和桥梁跨岸有自动校验。
- **环境状态**：白昼、日落、夜晚；晴空光晕、层云晚霞、薄雾柔光；主题、天气、质量和镜头状态可以保存到本地 Run 草稿。
- **Production Console**：Overview、Assets、Quality、Pipeline、Cost、Debug、Intelligence 七个完整视图互斥切换；当前 Run 上下文和 Decision Queue 不丢失。
- **本地执行边界**：请求策略只记录意图，实际执行固定为 `local-template`；Provider、Image API、3D API 未连接，不发送外部请求。
- **报告与指标**：Run Report、Quality Report、性能快照、Theme OFF、Theme Matrix、结构检查均有本地导出或界面入口。
- **迁移资料**：产品上下文、天气验证、跨设备迁移上下文已写入 `docs/`，并明确 API/Astra 边界。

## 本轮验证证据

```text
pnpm validate                         通过
node scripts/validate-metropolis.mjs  通过（4 个 seed）
Console 视图切换                    7 / 7 通过
主题 × 时段 × 天气                   27 / 27 通过
渲染质量档                           4 / 4 通过
运行时抽样                           约 60 FPS · 16.7 ms · 52 draws
```

三维三角形数随主题、天气、质量和镜头变化，本轮抽查范围约为 107,054–115,082 tris。没有把一次抽样外推为所有设备性能。

## 明确留到下一阶段

1. **GPT-6 Astra**：宏观城市构图、河道—公园—城区主次、镜头语言、天际线、灯光和高级后处理。
2. **API ChangeRequest**：Provider、Image API、3D API、Token/Cost 真实统计和外部调用审批。
3. **后续验收**：长时间闪烁录屏、真实移动设备 GPU、用户视觉评分。

除上述三类外，本项目当前没有已知的普通工程待办需要继续堆叠。后续若出现新需求，应先判断是否属于 Astra 或 API ChangeRequest，避免重复改动稳定底座。
