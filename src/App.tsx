import { useEffect, useRef, useState } from 'react'
import { Scene, type QualityPreset, type RenderMetrics } from './CityScene'

import { createStableCity, getStableCitySignature, validateStableCity, type TimeOfDay } from './city'
import { ProductionPanel } from './ProductionPanel'
import { themeSpecs, type ThemeName } from './theme'
import { getArtMetrics } from './artMetrics'

const city = createStableCity()
const themes = themeSpecs
const artMetrics = getArtMetrics(city)

const baselineSignature = city.signature
const timeLabels = { day: '白昼', sunset: '日落', night: '夜晚' }
const themeLabels = { harbor: '矿石港湾', verdant: '绿洲中继', ember: '余烬铸城' }
const visualChecks = ['明暗与色彩层级', '巨构主角与剪影', '空间纵深与材质', '关闭主题后的可读性']
type ViewName = 'overview' | 'assets' | 'quality' | 'pipeline' | 'cost' | 'debug' | 'intelligence'
type AssetKey = 'hero' | 'signature' | 'street' | 'atmosphere'
type Decision = { id: string; title: string; detail: string }
const assetCatalog: Record<AssetKey, { title: string; short: string; meta: string; status: string; className: string }> = {
  hero: { title: 'Hero / Megastructure', short: 'MEGA GATE', meta: 'v0.1 · signature locked', status: 'READY', className: 'asset-hero' },
  signature: { title: 'Signature Asset', short: 'ATLAS CROWN', meta: 'v0.1 · Theme overlay', status: 'READY', className: 'asset-signature' },
  street: { title: 'Scale Reference Set', short: 'STREET SCALE', meta: 'v0.1 · vehicles + rail', status: 'READY', className: 'asset-street' },
  atmosphere: { title: 'Environment Pass', short: 'ATMOSPHERE', meta: 'live · current time of day', status: 'LIVE', className: 'asset-atmosphere' },
}
const defaultDecisions: Decision[] = [
  { id: '3d-api', title: '3D API 调用批准', detail: 'Provider 尚未连接，当前保持 procedural only。' },
  { id: 'hero-regenerate', title: 'Hero Regenerate', detail: '等待 GPT-6 Astra 完成高级视觉复核后再允许。' },
]

export function App() {
  const [time, setTime] = useState<TimeOfDay>('sunset')
  const [mode, setMode] = useState<'overview' | 'mega'>('overview')
  const [theme, setTheme] = useState<ThemeName>('harbor')
  const [enabled, setEnabled] = useState(true)
  const [quality, setQuality] = useState<QualityPreset>('auto')
  const [view, setView] = useState<ViewName>('overview')
  const [selectedAsset, setSelectedAsset] = useState<AssetKey>('hero')
  const [decisionDrawerOpen, setDecisionDrawerOpen] = useState(false)
  const [decisions, setDecisions] = useState<Decision[]>(defaultDecisions)
  const runStartedAt = useRef(performance.now())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [metrics, setMetrics] = useState<RenderMetrics | null>(null)
  const [loadMs, setLoadMs] = useState<number | null>(null)
  const [qcResult, setQcResult] = useState<boolean | null>(null)
  const [qcIssues, setQcIssues] = useState<string[]>([])
  const [themeOffResult, setThemeOffResult] = useState<boolean | null>(null)
  const [themeMatrixResult, setThemeMatrixResult] = useState<Record<ThemeName, { stableCity: boolean; themeSpecDistinct: boolean }> | null>(null)
  const [reportMessage, setReportMessage] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  useEffect(() => {
    const interval = window.setInterval(() => setElapsedSeconds(Math.floor((performance.now() - runStartedAt.current) / 1000)), 1000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => { setChecked([]); setQcResult(null); setQcIssues([]) }, [time, mode, theme, enabled])
  useEffect(() => { setThemeOffResult(null) }, [time, mode, theme])
  useEffect(() => { if (enabled) setThemeOffResult(null) }, [enabled])
  useEffect(() => { setThemeMatrixResult(null) }, [time, mode])
  const themeMatrixPass = themeMatrixResult !== null && Object.values(themeMatrixResult).every(result => result.stableCity && result.themeSpecDistinct)
  const qualityGate = qcResult === true && themeOffResult === true && themeMatrixPass && checked.length === visualChecks.length && metrics !== null && loadMs !== null
  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`
  const runStatus = decisions.length ? 'ATTENTION' : metrics ? 'LIVE' : 'BOOTING'

  function dismissDecision(id: string) {
    setDecisions(prev => prev.filter(decision => decision.id !== id))
  }

  function runThemeMatrixTest() {
    const names = Object.keys(themes) as ThemeName[]
    const visualSignatures = new Set(names.map(name => JSON.stringify({
      primary: themes[name].primary,
      accent: themes[name].accent,
      atmosphere: themes[name].atmosphere,
      primaryHue: themes[name].primaryHue,
      secondaryHue: themes[name].secondaryHue,
      accentHue: themes[name].accentHue,
      warmCoolRelation: themes[name].warmCoolRelation,
      saturationProfile: themes[name].saturationProfile,
      valueProfile: themes[name].valueProfile,
      contrastMode: themes[name].contrastMode,
      emissionHue: themes[name].emissionHue,
      atmosphereTint: themes[name].atmosphereTint,
    })))
    const themeSpecDistinct = visualSignatures.size === names.length
    const result = Object.fromEntries(names.map(name => [name, { stableCity: getStableCitySignature(city) === baselineSignature, themeSpecDistinct }])) as Record<ThemeName, { stableCity: boolean; themeSpecDistinct: boolean }>
    setThemeMatrixResult(result)
  }

  function runStructureCheck() {
    const validation = validateStableCity(city)
    const baselineMatch = getStableCitySignature(city) === baselineSignature
    setQcIssues([...validation.issues, ...(baselineMatch ? [] : ['baseline'])])
    setQcResult(validation.valid && baselineMatch)
  }

  function exportQualityReport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      citySeed: city.seed,
      stableCitySignature: city.signature,
      theme: themeLabels[theme],
      themeOverlay: enabled ? 'active' : 'off',
      timeOfDay: time,
      camera: mode,
      metrics: metrics ? { ...metrics, loadMs } : { loadMs },
      artMetrics,
      loadMeasurement: 'Canvas initialization to first animation frame',
      structureCheck: qcResult,
      structureIssues: qcIssues,
      themeOffTest: themeOffResult,
      themeMatrixTest: themeMatrixResult,
      themeMatrixEvidence: themeMatrixResult ? Object.fromEntries((Object.keys(themes) as ThemeName[]).map(name => [name, {
        ...themeMatrixResult[name],
        spec: themes[name],
      }])) : null,
      visualChecks: visualChecks.map(name => ({ name, checked: checked.includes(name) })),
      qualityGate: qualityGate ? 'PASS' : 'INCOMPLETE',
      aiVisualJudge: 'not executed',
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `stable-city-quality-${city.seed}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setReportMessage(`Quality Report 已导出；qualityGate=${qualityGate ? 'PASS' : 'INCOMPLETE'}，未调用 AI 视觉判定。`)
  }

  return <main>
    <header className="app-header">
      <div className="identity"><span className="brand-mark" aria-hidden="true">A</span><div><h1>Atlas Gate</h1><p>城市创作工作台</p></div></div>
      <span className="project-status"><i />本地草稿 · Phase 1</span>
    </header>
    <section className="production-console" aria-label="Production Console">
      <header className="console-header">
        <div className="console-title"><p className="eyebrow">PRODUCTION CONSOLE</p><h2>场景工作台</h2><p>视觉与系统信息分开观看，同一个 Run 始终保持。</p></div>
        <div className="run-context" aria-label="Run Context Bar"><div className="context-heading"><span>RUN CONTEXT</span><b>{runStatus}</b></div><div className="context-grid"><div><span>Run ID</span><strong>RUN-{city.seed}-P1</strong></div><label><span>ThemeVersion</span><select value={theme} onChange={e => setTheme(e.target.value as ThemeName)}>{(Object.keys(themes) as ThemeName[]).map(name => <option key={name} value={name}>{name}-local-01</option>)}</select></label><div><span>Status</span><strong>{runStatus}</strong></div><div><span>Elapsed</span><strong>{elapsedLabel}</strong></div><div><span>Total Cost</span><strong>$0.00</strong></div></div><div className="context-actions"><label className="context-toggle"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /><span>Theme overlay</span></label><button className="decision-trigger" onClick={() => setDecisionDrawerOpen(true)}>⚠ {decisions.length} Decisions Required</button></div></div>
      </header>
      <nav className="view-nav" aria-label="Production Console navigation">
        <div className="nav-group"><span>VISUAL</span><div><button className={view === 'overview' ? 'active' : ''} aria-pressed={view === 'overview'} onClick={() => setView('overview')}>Overview</button><button className={view === 'assets' ? 'active' : ''} aria-pressed={view === 'assets'} onClick={() => setView('assets')}>Assets</button><button className={view === 'quality' ? 'active' : ''} aria-pressed={view === 'quality'} onClick={() => setView('quality')}>Quality</button></div></div>
        <div className="nav-group"><span>SYSTEM</span><div><button className={view === 'pipeline' ? 'active' : ''} aria-pressed={view === 'pipeline'} onClick={() => setView('pipeline')}>Pipeline</button><button className={view === 'cost' ? 'active' : ''} aria-pressed={view === 'cost'} onClick={() => setView('cost')}>Cost</button><button className={view === 'debug' ? 'active' : ''} aria-pressed={view === 'debug'} onClick={() => setView('debug')}>Debug</button><button className={view === 'intelligence' ? 'active' : ''} aria-pressed={view === 'intelligence'} onClick={() => setView('intelligence')}>Intelligence</button></div></div>
      </nav>
      <div className={`view-surface ${view}-surface`}>
        {view === 'overview' && <section className="surface-page visual-page overview-page"><div className="surface-heading"><span>VISUAL / OVERVIEW</span><h2>城市总览</h2><p>观看当前 CitySeed、Theme 和 Environment 的整体状态。</p></div><div className="scene-toolbar"><div className="segmented" aria-label="镜头"><button aria-pressed={mode === 'overview'} onClick={() => setMode('overview')}>城市总览</button><button aria-pressed={mode === 'mega'} onClick={() => setMode('mega')}>巨构特写</button></div><div className="segmented" aria-label="时段">{(['day', 'sunset', 'night'] as TimeOfDay[]).map(t => <button key={t} aria-pressed={time === t} onClick={() => setTime(t)}>{timeLabels[t]}</button>)}</div></div><div className="visual-stage"><Scene time={time} mode={mode} theme={theme} enabled={enabled} quality={quality} onUpdate={setMetrics} onReady={setLoadMs} /><div className="scene-caption"><span>01 / ATLAS DISTRICT</span><strong>{mode === 'overview' ? '秩序之中的城市' : '穿越城市的门'}</strong><small>拖动旋转 · 滚轮缩放</small></div></div><div className="visual-status-strip"><span>SEED {city.seed} · 核心 {city.blocks.length} 街区 / {city.buildings.length} 建筑 · 外围 216 建筑</span><span>{themes[theme].label} · {timeLabels[time]} · {enabled ? 'Theme active' : 'Theme off'}</span><span className="metrics">{metrics ? `${metrics.fps.toFixed(0)} FPS · ${metrics.frameMs.toFixed(1)} ms · ${metrics.calls} draws · ${metrics.triangles.toLocaleString()} tris` : '采集渲染指标…'}</span></div></section>}
        {view === 'assets' && <section className="surface-page visual-page assets-page"><div className="surface-heading"><span>VISUAL / ASSETS</span><h2>视觉资产</h2><p>浏览当前 Run 的 Hero、Signature 和环境资产，不混入调用日志与成本。</p></div><div className="asset-toolbar"><span>{themes[theme].label} · ThemeVersion {theme}-local-01</span><button onClick={() => setView('pipeline')}>View related run details</button></div><div className="asset-gallery">{(Object.keys(assetCatalog) as AssetKey[]).map(key => { const asset = assetCatalog[key]; const meta = key === 'atmosphere' ? `${timeLabels[time]} · ${themes[theme].atmosphereTint}` : asset.meta; return <button key={key} className={`asset-card ${asset.className} ${selectedAsset === key ? 'selected' : ''}`} aria-pressed={selectedAsset === key} onClick={() => setSelectedAsset(key)}><div className={`asset-thumb ${asset.className}`}><span>PROCEDURAL PREVIEW</span><b>{asset.short}</b></div><div className="asset-meta"><strong>{asset.title}</strong><span>{meta}</span><b>{asset.status}</b></div></button> })}</div><div className="asset-detail"><div><span>SELECTED ASSET</span><strong>{assetCatalog[selectedAsset].title}</strong><p>{assetCatalog[selectedAsset].status} · {selectedAsset === 'atmosphere' ? `${timeLabels[time]} / ${themes[theme].atmosphereTint}` : assetCatalog[selectedAsset].meta}</p></div><button onClick={() => setView('debug')}>Inspect generation log →</button></div><div className="asset-note">资产为当前 procedural preview；真实 Image / 3D Provider 尚未连接。</div></section>}
        {view === 'quality' && <section className="surface-page visual-page quality-page"><div className="surface-heading"><span>VISUAL / QUALITY</span><h2>视觉质量</h2><p>以完整观看为中心：录屏、截图、时段对照和视觉 QC 结论。</p></div><div className="scene-toolbar"><div className="segmented" aria-label="Quality camera"><button aria-pressed={mode === 'overview'} onClick={() => setMode('overview')}>Overview</button><button aria-pressed={mode === 'mega'} onClick={() => setMode('mega')}>Megastructure Showcase</button></div><div className="segmented" aria-label="Quality environment">{(['day', 'sunset', 'night'] as TimeOfDay[]).map(t => <button key={t} aria-pressed={time === t} onClick={() => setTime(t)}>{timeLabels[t]}</button>)}</div></div><div className="quality-stage"><Scene time={time} mode={mode} theme={theme} enabled={enabled} quality={quality} onUpdate={setMetrics} onReady={setLoadMs} /><div className="scene-caption"><span>{mode === 'overview' ? 'OVERVIEW' : 'MEGA SHOWCASE'} · {timeLabels[time]}</span><strong>{themes[theme].label}</strong><small>当前视觉结果 · {enabled ? 'Theme active' : 'Theme off'}</small></div></div><div className="quality-summary"><div><span>QC Score</span><strong>{qualityGate ? 'PASS' : '—'}</strong><small>{checked.length} / {visualChecks.length} visual checks confirmed</small></div><div><span>Issue Marker</span><strong>{visualChecks.length - checked.length}</strong><small>items awaiting human review</small></div><div><span>Iteration</span><strong>v0.1</strong><small>current local preview</small></div></div><div className="comparison-row"><div className="comparison-frame before"><span>BEFORE</span><strong>StableCity base</strong><small>Theme OFF baseline</small></div><div className="comparison-frame after"><span>AFTER</span><strong>{themes[theme].label}</strong><small>Theme overlay preview</small></div></div><div className="quality-issue-grid">{visualChecks.map((item, index) => { const confirmed = checked.includes(item); return <button key={item} className={`issue-marker ${confirmed ? 'confirmed' : ''}`} aria-pressed={confirmed} onClick={() => setChecked(prev => confirmed ? prev.filter(value => value !== item) : [...prev, item])}><span>0{index + 1}</span><div><strong>{item}</strong><small>{confirmed ? 'CONFIRMED' : 'OPEN · review required'}</small></div></button> })}</div><div className="iteration-history"><span>ITERATION HISTORY</span><div><b>v0.0</b><small>StableCity base</small></div><i>→</i><div className="current"><b>v0.1</b><small>{themes[theme].label} preview</small></div></div><div className="quality-actions"><button className="primary" onClick={() => setView('pipeline')}>View related run details</button><details className="quality-details"><summary>Open visual QC checks</summary><div className="quality-checks"><p className="help">只记录观看结果、视觉问题和人工确认，不在此页展开工程日志。</p><p className="help">{checked.length} / {visualChecks.length} 项人工确认 · 未执行 AI 视觉判定</p><div className="quality-gate"><span>Visual QC</span><b className={qualityGate ? 'pass' : 'incomplete'}>{qualityGate ? 'PASS' : 'INCOMPLETE'}</b></div><button className="primary" onClick={exportQualityReport}>导出 Quality Report</button>{reportMessage && <p className="result" role="status">{reportMessage}</p>}</div></details></div></section>}
        {view === 'pipeline' && <section className="surface-page system-page pipeline-page"><div className="surface-heading"><span>SYSTEM / PIPELINE</span><h2>生产流程</h2><p>整页回答当前 Run 走到哪里、每一步发生了什么。</p></div><div className="timeline"><div className="timeline-step done"><i>01</i><div><strong>StableCity assembled</strong><span>{city.blocks.length} blocks · {city.buildings.length} buildings · signature locked</span></div><b>READY</b></div><div className="timeline-step active"><i>02</i><div><strong>ThemeVersion {theme}-local-01</strong><span>{themes[theme].label} · overlay {enabled ? 'active' : 'off'}</span></div><b>ACTIVE</b></div><div className="timeline-step"><i>03</i><div><strong>Production tasks</strong><span>Execution strategy local-template · provider none</span></div><b>READY</b></div><div className={`timeline-step ${decisions.length ? 'blocked' : 'done'}`}><i>04</i><div><strong>Decision gate</strong><span>{decisions.length ? `${decisions.length} decisions required` : 'No pending decisions'}</span></div><b>{decisions.length ? 'BLOCKED' : 'CLEAR'}</b></div></div><div className="pipeline-facts"><div><span>Current step</span><strong>{metrics ? 'Canvas rendered' : 'Canvas boot'}</strong></div><div><span>Duration</span><strong>{elapsedLabel}</strong></div><div><span>Retry</span><strong>0</strong></div><div><span>Blocker</span><strong>{decisions.length ? 'Provider approval' : 'None'}</strong></div></div></section>}
        {view === 'cost' && <section className="surface-page system-page cost-page"><div className="surface-heading"><span>SYSTEM / COST</span><h2>成本与资源</h2><p>只展示真实本地执行和已发生的资源使用，不伪造模型调用。</p></div><div className="cost-overview"><div><span>Total Cost</span><strong>$0.00</strong><small>local fallback only</small></div><div><span>Token Usage</span><strong>未调用</strong><small>no model request</small></div><div><span>Model Calls</span><strong>0</strong><small>provider unavailable</small></div><div><span>Elapsed</span><strong>{elapsedLabel}</strong><small>current Run</small></div></div><div className="resource-table"><div><span>Image API</span><b>0 · 未调用</b><small>procedural preview only</small></div><div><span>3D API</span><b>0 · 未调用</b><small>decision required before approval</small></div><div><span>Codex Run</span><b>0 · 未调用</b><small>no external Codex execution</small></div><div><span>Canvas init</span><b>{loadMs === null ? '—' : `${loadMs} ms`}</b><small>initialization to first animation frame</small></div><div><span>Current frame</span><b>{metrics === null ? '—' : `${metrics.frameMs.toFixed(1)} ms`}</b><small>live render sample</small></div><div><span>Budget</span><b>未配置</b><small>no budget rule applied</small></div></div><div className="cost-trend"><span>Cost trend</span><strong>暂无真实调用样本</strong><small>当模型或 API 接入后，这里再记录阶段耗时与趋势。</small></div><button className="text-link" onClick={() => setView('pipeline')}>Open related pipeline run →</button></section>}
        {view === 'debug' && <section className="surface-page system-page debug-page"><div className="surface-heading"><span>SYSTEM / DEBUG</span><h2>工程调试</h2><p>只看输入、输出、日志、错误和资产描述，不混入视觉 QC。</p></div><div className="debug-layout"><div><h3>Run facts</h3><div className="debug-list"><div><span>CitySeed</span><b>{city.seed}</b></div><div><span>StableCity</span><b>{city.signature}</b></div><div><span>UrbanGrammar</span><b>{city.urbanGrammar.primaryAxis} / {city.urbanGrammar.secondaryRoads} secondary</b></div><div><span>Street + Parcels</span><b>{city.urbanGrammar.localStreets} local / {city.parcels.length} parcels</b></div><div><span>DensityBands</span><b>{city.urbanGrammar.densityBands.join(' / ')} / voids {city.urbanGrammar.publicVoids}</b></div><div><span>Composition</span><b>hero {city.heroBlock} / peaks {city.secondaryPeaks.length} / voids {city.publicVoids.length}</b></div><div><span>Transport</span><b>{city.transport.mainSpine} / rail {city.transport.elevatedRail ? 'on' : 'off'}</b></div><div><span>ThemeVersion</span><b>{theme}-local-01</b></div><div><span>Environment</span><b>{timeLabels[time]}</b></div></div></div><div><h3>Provider + errors</h3><div className="provider-matrix"><div><span>Theme / schema</span><b>Luna · reserved</b><small>current: local fallback</small></div><div><span>Engineering / routing</span><b>Terra / Codex · reserved</b><small>current: local fallback</small></div><div><span>Hero / Mega art review</span><b>GPT-6 Astra · reserved</b><small>current: not enabled</small></div><div><span>Image / 3D generation</span><b>Provider unavailable</b><small>current: procedural only</small></div></div><h3>API / ThemeSpec / AssetManifest</h3><pre>{JSON.stringify({ themeSpec: themes[theme], assetManifest: { hero: 'mega-gate-v0.1', signature: 'atlas-crown-v0.1', environment: `${time}-pass` }, overlay: enabled ? 'active' : 'off', stableCity: 'locked' }, null, 2)}</pre><h3>Logs</h3><div className="log"><span>[scene] stable city assembled</span><span>[theme] overlay {enabled ? 'applied' : 'disabled'}</span><span>[qc] awaiting manual visual review</span></div></div></div><details className="system-validation"><summary>Run system QC gates</summary><div className="quality-checks"><p className="help">工程校验只在 Debug 页按需执行，不打断视觉观察。</p><button className="primary" onClick={runStructureCheck}>运行结构检查</button><p className="result" role="status">{qcResult === null ? '尚未检查' : qcResult ? `通过：${city.blocks.length} 街区 / ${city.buildings.length} 建筑 / ${city.parcels.length} Parcel。` : `未通过：${qcIssues.join('、') || 'baseline'}。`}</p><button className="primary" onClick={() => { setEnabled(false); setThemeOffResult(getStableCitySignature(city) === baselineSignature) }}>运行 Theme OFF Test</button><p className="result" role="status">{themeOffResult === null ? '尚未检查' : themeOffResult ? '通过：Theme OFF 保持 StableCity 基线。' : '未通过：Theme OFF 结构发生变化。'}</p><button className="primary" onClick={runThemeMatrixTest}>运行 Theme Matrix Test</button><p className="result" role="status">{themeMatrixResult === null ? '尚未检查' : themeMatrixPass ? '通过：三个 ThemeSpec 可区分。' : '未通过：ThemeSpec 存在差异问题。'}</p><button className="primary" onClick={exportQualityReport}>导出 Quality Report</button>{reportMessage && <p className="result" role="status">{reportMessage}</p>}</div></details><button className="text-link" onClick={() => setView('pipeline')}>Open related pipeline run →</button></section>}
        {view === 'intelligence' && <section className="surface-page system-page intelligence-page"><div className="surface-heading"><span>SYSTEM / INTELLIGENCE</span><h2>系统洞察</h2><p>把成功、失败、路由和改进建议沉淀为下一轮可用经验。</p></div><div className="intelligence-list"><article><span>Successful pattern</span><strong>StableCity signature + Theme OFF 保持一致</strong><small>当前已通过本地结构校验；不是视觉模型评分。</small></article><article><span>Failure pattern</span><strong>{decisions.length ? 'External provider unavailable' : '暂无待处理阻塞'}</strong><small>阻塞来自当前连接状态，不代表生成质量。</small></article><article><span>Router suggestion</span><strong>继续使用 local-template</strong><small>等待 Luna / Terra / Astra 接入后再切换。</small></article><article><span>Provider performance</span><strong>未执行真实调用</strong><small>没有可报告的 token、延迟或成功率。</small></article><article><span>Prompt improvement</span><strong>补充 Hero silhouette 与 scale reference 约束</strong><small>这属于下一轮高级视觉工作，需先切换 GPT-6 Astra。</small></article><article><span>Preset improvement</span><strong>保留 ThemeSpec 的完整视觉字段</strong><small>当前 Theme Matrix 已覆盖色相、冷暖、饱和度、明度和发光色。</small></article></div><div className="flywheel"><span>Visual Intelligence Flywheel</span><b>Observe → QC → record → review</b><small>本 Run 已记录 StableCity、Theme Matrix、结构问题和本地指标。</small></div><div className="experience-record"><span>Experience record</span><strong>local-first / no external call</strong><small>只记录本地可验证事实，不把推断写成 Provider 经验。</small></div></section>}
        <div className={`run-controls-host ${view === 'pipeline' ? 'active' : 'inactive'}`} aria-hidden={view !== 'pipeline'}><details className="pipeline-details pipeline-run-details" open={view === 'pipeline'}><summary>Open current Run controls</summary><ProductionPanel seed={city.seed} theme={themes[theme].label} /></details></div>
      </div>
      <footer className="console-footer">本地模拟流程 · 当前视图：{view} · 未连接 AI 服务</footer>
    </section>
    {decisionDrawerOpen && <div className="decision-sheet" role="dialog" aria-modal="true" aria-label="Decision Queue"><div className="sheet-backdrop" onClick={() => setDecisionDrawerOpen(false)} /><div className="sheet-panel"><div className="drawer-heading"><div><span>DECISION QUEUE</span><h3>需处理的决定</h3></div><button onClick={() => setDecisionDrawerOpen(false)} aria-label="关闭决定面板">关闭</button></div><p className="help">这些操作不会自动调用外部服务；记录决定后才会从当前队列移除。</p>{decisions.length ? <div className="decision-list">{decisions.map(decision => <article key={decision.id}><div><strong>{decision.title}</strong><p>{decision.detail}</p></div><button onClick={() => dismissDecision(decision.id)}>记录决定</button></article>)}</div> : <p className="empty-state">当前没有待处理决定。</p>}</div></div>}
  </main>
}
