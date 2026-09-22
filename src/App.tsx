import { useCallback, useEffect, useRef, useState } from 'react'
import { Scene, metropolitanBuildingCount, type QualityPreset, type RenderMetrics } from './CityScene'
import { SceneBoundary } from './SceneBoundary'
import { weatherLabels, weatherDescriptions, type Weather } from './Atmosphere'

import { createStableCity, getStableCitySignature, validateStableCity, type TimeOfDay } from './city'
import { ProductionPanel } from './ProductionPanel'
import { themeSpecs, type ThemeName } from './theme'
import { getArtMetrics } from './artMetrics'
import { clearUiDraft, loadProductionDraft, loadUiDraft, saveUiDraft, type AssetKey, type ThemeMatrixResult, type ViewName } from './runPersistence'
import { getProviderSnapshot } from './provider'
import { validateCoreContracts } from './validation'
import { RUN_REPORT_VERSION, validateRunReport } from './runReport'

const city = createStableCity()
const themes = themeSpecs
const artMetrics = getArtMetrics(city)

const baselineSignature = city.signature
const coreValidation = validateCoreContracts(city)
const timeLabels = { day: '白昼', sunset: '日落', night: '夜晚' }
const themeLabels = { harbor: '矿石港湾', verdant: '绿洲中继', ember: '余烬铸城' }
const qualityLabels: Record<QualityPreset, string> = { auto: 'AUTO / 自适应', high: 'HIGH / 高质量', balanced: 'BALANCED / 平衡', low: 'LOW / 低负载' }
const runStatusLabels = { ATTENTION: '需处理', LIVE: '运行中', BOOTING: '启动中' }
const visualChecks = ['明暗与色彩层级', '巨构主角与剪影', '空间纵深与材质', '关闭主题后的可读性']
const viewLabels: Record<ViewName, string> = { overview: '总览', assets: '资产', quality: '质量', pipeline: '流程', cost: '成本', debug: '调试', intelligence: '洞察' }
type Decision = { id: string; title: string; detail: string }
type PerformanceSample = RenderMetrics & { capturedAt: string; view: ViewName; time: TimeOfDay; mode: 'overview' | 'mega'; quality: QualityPreset; weather: Weather }
const assetCatalog: Record<AssetKey, { title: string; short: string; meta: string; status: string; className: string }> = {
  hero: { title: '主角 / 巨构 · Hero', short: 'MEGA GATE', meta: 'v0.1 · 标志已锁定', status: '就绪', className: 'asset-hero' },
  signature: { title: '标志资产 · Signature', short: 'ATLAS CROWN', meta: 'v0.1 · 主题覆盖层', status: '就绪', className: 'asset-signature' },
  street: { title: '尺度参照 · Scale Set', short: 'STREET SCALE', meta: 'v0.1 · 车辆 + 轨道', status: '就绪', className: 'asset-street' },
  atmosphere: { title: '环境层 · Environment', short: 'ATMOSPHERE', meta: '实时 · 当前时段', status: '实时', className: 'asset-atmosphere' },
}
const defaultDecisions: Decision[] = [
  { id: '3d-api', title: '3D API 调用批准', detail: 'Provider 尚未连接，当前保持 procedural only。' },
  { id: 'hero-regenerate', title: '主角重生成 · Hero Regenerate', detail: '等待 GPT-6 Astra 完成高级视觉复核后再允许。' },
]

function QualityPicker({ value, onChange }: { value: QualityPreset; onChange: (next: QualityPreset) => void }) {
  return <label className="quality-picker"><span>渲染质量 <small>Render Quality</small></span><select value={value} onChange={event => onChange(event.target.value as QualityPreset)} aria-label="Render quality">{(Object.keys(qualityLabels) as QualityPreset[]).map(preset => <option key={preset} value={preset}>{qualityLabels[preset]}</option>)}</select></label>
}

function WeatherPicker({ value, onChange }: { value: Weather; onChange: (next: Weather) => void }) {
  return <div className="weather-picker"><span>天气氛围</span><div className="segmented" aria-label="天气氛围">{(Object.keys(weatherLabels) as Weather[]).map(preset => <button key={preset} aria-pressed={value === preset} title={weatherDescriptions[preset]} onClick={() => onChange(preset)}>{weatherLabels[preset]}</button>)}</div><small>{weatherDescriptions[value]}</small></div>
}

export function App() {
  const persistedUi = useRef(loadUiDraft()).current
  const [time, setTime] = useState<TimeOfDay>(() => persistedUi?.time ?? 'sunset')
  const [weather, setWeather] = useState<Weather>(() => persistedUi?.weather && Object.hasOwn(weatherLabels, persistedUi.weather) ? persistedUi.weather : 'clouds')
  const [mode, setMode] = useState<'overview' | 'mega'>(() => persistedUi?.mode ?? 'overview')
  const [theme, setTheme] = useState<ThemeName>(() => persistedUi?.theme ?? 'harbor')
  const [enabled, setEnabled] = useState(() => persistedUi?.enabled ?? true)
  const [quality, setQuality] = useState<QualityPreset>(() => persistedUi?.quality ?? 'auto')
  const [view, setView] = useState<ViewName>(() => persistedUi?.view ?? 'overview')
  const [selectedAsset, setSelectedAsset] = useState<AssetKey>(() => persistedUi?.selectedAsset ?? 'hero')
  const [decisionDrawerOpen, setDecisionDrawerOpen] = useState(false)
  const [decisions, setDecisions] = useState<Decision[]>(() => persistedUi?.decisions?.length ? persistedUi.decisions : defaultDecisions)
  const runStartedAt = useRef(performance.now())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [metrics, setMetrics] = useState<RenderMetrics | null>(null)
  const [metricsHistory, setMetricsHistory] = useState<PerformanceSample[]>([])
  const [loadMs, setLoadMs] = useState<number | null>(null)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [qcResult, setQcResult] = useState<boolean | null>(() => persistedUi?.qcResult ?? null)
  const [qcIssues, setQcIssues] = useState<string[]>(() => persistedUi?.qcIssues ?? [])
  const [themeOffResult, setThemeOffResult] = useState<boolean | null>(() => persistedUi?.themeOffResult ?? null)
  const [themeMatrixResult, setThemeMatrixResult] = useState<ThemeMatrixResult | null>(() => persistedUi?.themeMatrixResult ?? null)
  const [reportMessage, setReportMessage] = useState('')
  const [runReportMessage, setRunReportMessage] = useState('')
  const [checked, setChecked] = useState<string[]>(() => persistedUi?.checked ?? [])
  const restoreVisualState = useRef(true)
  useEffect(() => {
    const interval = window.setInterval(() => setElapsedSeconds(Math.floor((performance.now() - runStartedAt.current) / 1000)), 1000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    if (restoreVisualState.current) { restoreVisualState.current = false; return }
    setChecked([]); setQcResult(null); setQcIssues([]); setThemeOffResult(null); setThemeMatrixResult(null)
  }, [enabled, mode, theme, time, weather])
  useEffect(() => { setSceneError(null) }, [enabled, mode, quality, theme, time, weather])
  const themeMatrixPass = themeMatrixResult !== null && Object.values(themeMatrixResult).every(result => result.stableCity && result.themeSpecDistinct)
  const qualityGate = coreValidation.valid && qcResult === true && themeOffResult === true && themeMatrixPass && checked.length === visualChecks.length && metrics !== null && loadMs !== null
  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`
  const runStatus = decisions.length ? 'ATTENTION' : metrics ? 'LIVE' : 'BOOTING'

  const updateMetrics = useCallback((next: RenderMetrics) => {
    setMetrics(next)
    setMetricsHistory(prev => [...prev, { ...next, capturedAt: new Date().toISOString(), view, time, mode, quality, weather }].slice(-90))
  }, [mode, quality, time, view, weather])

  useEffect(() => {
    saveUiDraft({ time, weather, mode, theme, enabled, quality, view, selectedAsset, decisions, checked, qcResult, qcIssues, themeOffResult, themeMatrixResult })
  }, [checked, decisions, enabled, mode, quality, qcIssues, qcResult, selectedAsset, theme, themeMatrixResult, themeOffResult, time, view, weather])

  function dismissDecision(id: string) {
    setDecisions(prev => prev.filter(decision => decision.id !== id))
  }

  function resetUiDraft() {
    clearUiDraft()
    setTime('sunset'); setWeather('clouds'); setMode('overview'); setTheme('harbor'); setEnabled(true); setQuality('auto'); setView('overview'); setSelectedAsset('hero')
    setDecisions(defaultDecisions); setChecked([]); setQcResult(null); setQcIssues([]); setThemeOffResult(null); setThemeMatrixResult(null)
    setSceneError(null)
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
      timeOfDay: time, weather,
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
    document.body.appendChild(anchor)
    anchor.click()
    window.setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url) }, 0)
    setReportMessage(`Quality Report 已导出；qualityGate=${qualityGate ? 'PASS' : 'INCOMPLETE'}，未调用 AI 视觉判定。`)
  }

  function exportPerformanceSnapshot() {
    const payload = {
      exportedAt: new Date().toISOString(),
      citySeed: city.seed,
      view,
      timeOfDay: time, weather,
      camera: mode,
      theme: themeLabels[theme],
      quality,
      loadMs,
      latest: metrics,
      samples: metricsHistory,
      note: '本地浏览器采样；未包含外部 Provider 调用。',
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `stable-city-performance-${city.seed}.json`
    document.body.appendChild(anchor)
    anchor.click()
    window.setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url) }, 0)
  }

  function exportRunReport() {
    const productionDraft = loadProductionDraft()
    const payload = {
      reportVersion: RUN_REPORT_VERSION,
      exportedAt: new Date().toISOString(),
      runContext: {
        runId: `RUN-${city.seed}-P1`,
        citySeed: city.seed,
        stableCitySignature: city.signature,
        themeVersion: `${theme}-local-01`,
        theme: themeLabels[theme],
        themeOverlay: enabled ? 'active' : 'off',
        timeOfDay: time, weather,
        camera: mode,
        quality,
        elapsedSeconds,
      },
      city: {
        blocks: city.blocks.length,
        buildings: city.buildings.length,
        parcels: city.parcels.length,
        heroBlock: city.heroBlock,
        secondaryPeaks: city.secondaryPeaks,
        publicVoids: city.publicVoids,
        urbanGrammar: city.urbanGrammar,
        transport: city.transport,
      },
      validation: { core: coreValidation, structureCheck: qcResult, structureIssues: qcIssues, themeOffTest: themeOffResult, themeMatrixTest: themeMatrixResult },
      visual: { visualChecks: visualChecks.map(name => ({ name, checked: checked.includes(name) })), qualityGate: qualityGate ? 'PASS' : 'INCOMPLETE', sceneError, aiVisualJudge: 'not executed' },
      decisionQueue: decisions,
      runtime: { loadMs, latest: metrics, samples: metricsHistory, note: '本地浏览器采样；未包含外部 Provider 调用。' },
      providers: getProviderSnapshot(),
      productionDraft: productionDraft ?? null,
    }
    const reportValidation = validateRunReport(payload)
    if (!reportValidation.valid) {
      setRunReportMessage(`Run Report 未导出：${reportValidation.issues.join('、')}`)
      return
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `stable-city-run-${city.seed}-report.json`
    document.body.appendChild(anchor)
    anchor.click()
    window.setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url) }, 0)
    setRunReportMessage(`Run Report 已导出；schema=${RUN_REPORT_VERSION}`)
  }

  return <main>
    <header className="app-header">
      <div className="identity"><span className="brand-mark" aria-hidden="true">A</span><div><h1>Atlas Gate</h1><p>城市创作工作台</p></div></div>
      <span className="project-status"><i />本地草稿 · Phase 1</span>
    </header>
    <section className="production-console" aria-label="Production Console">
      <header className="console-header">
        <div className="console-title"><p className="eyebrow">PRODUCTION CONSOLE</p><h2>场景工作台</h2><p>视觉与系统信息分开观看，同一个 Run 始终保持。</p></div>
        <div className="run-context" aria-label="Run Context Bar"><div className="context-heading"><span>运行上下文 · RUN CONTEXT</span><b>{runStatusLabels[runStatus]}</b></div><div className="context-grid"><div><span>运行 ID · Run ID</span><strong>RUN-{city.seed}-P1</strong></div><label><span>主题版本 · ThemeVersion</span><select value={theme} onChange={e => setTheme(e.target.value as ThemeName)}>{(Object.keys(themes) as ThemeName[]).map(name => <option key={name} value={name}>{name}-local-01</option>)}</select></label><div><span>状态 · Status</span><strong>{runStatusLabels[runStatus]}</strong></div><div><span>耗时 · Elapsed</span><strong>{elapsedLabel}</strong></div><div><span>累计成本 · Total Cost</span><strong>$0.00</strong></div></div><div className="context-actions"><label className="context-toggle"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /><span>主题覆盖层 · Theme overlay</span></label><span className={`core-check ${coreValidation.valid ? 'pass' : 'fail'}`}>结构校验：{coreValidation.valid ? '通过' : '需检查'}</span><button className="decision-trigger" onClick={() => setDecisionDrawerOpen(true)}>⚠ {decisions.length} 项待处理决定</button><button className="draft-reset" onClick={resetUiDraft}>重置本地草稿</button></div></div>
      </header>
      <nav className="view-nav" aria-label="Production Console navigation">
        <div className="nav-group"><span>视觉 · VISUAL</span><div><button className={view === 'overview' ? 'active' : ''} aria-pressed={view === 'overview'} onClick={() => setView('overview')}>总览 · Overview</button><button className={view === 'assets' ? 'active' : ''} aria-pressed={view === 'assets'} onClick={() => setView('assets')}>资产 · Assets</button><button className={view === 'quality' ? 'active' : ''} aria-pressed={view === 'quality'} onClick={() => setView('quality')}>质量 · Quality</button></div></div>
        <div className="nav-group"><span>系统 · SYSTEM</span><div><button className={view === 'pipeline' ? 'active' : ''} aria-pressed={view === 'pipeline'} onClick={() => setView('pipeline')}>流程 · Pipeline</button><button className={view === 'cost' ? 'active' : ''} aria-pressed={view === 'cost'} onClick={() => setView('cost')}>成本 · Cost</button><button className={view === 'debug' ? 'active' : ''} aria-pressed={view === 'debug'} onClick={() => setView('debug')}>调试 · Debug</button><button className={view === 'intelligence' ? 'active' : ''} aria-pressed={view === 'intelligence'} onClick={() => setView('intelligence')}>洞察 · Intelligence</button></div></div>
      </nav>
      <div className={`view-surface ${view}-surface`}>
        {view === 'overview' && <section className="surface-page visual-page overview-page"><div className="surface-heading"><span>视觉 / VISUAL · OVERVIEW</span><h2>城市总览</h2><p>观看当前 CitySeed、Theme 和 Environment 的整体状态。</p></div><div className="scene-toolbar"><div className="segmented" aria-label="镜头"><button aria-pressed={mode === 'overview'} onClick={() => setMode('overview')}>城市总览</button><button aria-pressed={mode === 'mega'} onClick={() => setMode('mega')}>巨构特写</button></div><div className="segmented" aria-label="时段">{(['day', 'sunset', 'night'] as TimeOfDay[]).map(t => <button key={t} aria-pressed={time === t} onClick={() => setTime(t)}>{timeLabels[t]}</button>)}</div><QualityPicker value={quality} onChange={setQuality} /></div><WeatherPicker value={weather} onChange={setWeather} /><div className="visual-stage" role="group" aria-label="城市三维预览">{sceneError ? <div className="scene-fallback" role="alert"><strong>3D 场景暂不可用</strong><small>{sceneError}。请切换质量或刷新页面重试。</small></div> : <SceneBoundary key={`overview-${mode}-${time}-${quality}`} fallback={<div className="scene-fallback" role="alert"><strong>3D 场景暂不可用</strong><small>{sceneError ?? '请降低渲染质量或刷新页面。'}</small></div>} onError={setSceneError}><Scene time={time} weather={weather} mode={mode} theme={theme} enabled={enabled} quality={quality} onUpdate={updateMetrics} onReady={setLoadMs} onError={setSceneError} /></SceneBoundary>}<div className={`scene-grade grade-${time}`} aria-hidden="true" /><div className={`scene-aperture aperture-${time}`} aria-hidden="true" /><div className="scene-caption"><span>01 / ATLAS DISTRICT</span><strong>{mode === 'overview' ? '沿河生长的城市' : '穿越城市的门'}</strong><small>{weatherLabels[weather]} · 拖动旋转 · 滚轮缩放</small></div></div><div className="visual-status-strip"><span>种子 {city.seed} · 核心 {city.blocks.length} 街区 / {city.buildings.length} 建筑 · 外围 {metropolitanBuildingCount} 建筑</span><span>{themes[theme].label} · {timeLabels[time]} · {weatherLabels[weather]} · {enabled ? '主题已启用' : '主题已关闭'} · {qualityLabels[quality]}</span><span className="metrics" aria-live="polite">{metrics ? `${metrics.fps.toFixed(0)} FPS · ${metrics.frameMs.toFixed(1)} ms · ${metrics.calls} draws · ${metrics.triangles.toLocaleString()} tris` : '采集渲染指标…'}</span></div></section>}
        {view === 'assets' && <section className="surface-page visual-page assets-page"><div className="surface-heading"><span>视觉 / VISUAL · ASSETS</span><h2>视觉资产</h2><p>浏览当前 Run 的主角、标志和环境资产，不混入调用日志与成本。</p></div><div className="asset-toolbar"><span>{themes[theme].label} · 主题版本 {theme}-local-01</span><button onClick={() => setView('pipeline')}>查看相关流程</button></div><div className="asset-gallery">{(Object.keys(assetCatalog) as AssetKey[]).map(key => { const asset = assetCatalog[key]; const meta = key === 'atmosphere' ? `${timeLabels[time]} · ${themes[theme].atmosphereTint}` : asset.meta; return <button key={key} className={`asset-card ${asset.className} ${selectedAsset === key ? 'selected' : ''}`} aria-pressed={selectedAsset === key} onClick={() => setSelectedAsset(key)}><div className={`asset-thumb ${asset.className}`}><span>程序化预览 · PROCEDURAL</span><b>{asset.short}</b></div><div className="asset-meta"><strong>{asset.title}</strong><span>{meta}</span><b>{asset.status}</b></div></button> })}</div><div className="asset-detail"><div><span>已选资产 · SELECTED ASSET</span><strong>{assetCatalog[selectedAsset].title}</strong><p>{assetCatalog[selectedAsset].status} · {selectedAsset === 'atmosphere' ? `${timeLabels[time]} / ${themes[theme].atmosphereTint}` : assetCatalog[selectedAsset].meta}</p></div><button onClick={() => setView('debug')}>查看生成日志 →</button></div><div className="asset-note">资产为当前程序化预览；真实 Image / 3D Provider 尚未连接。</div></section>}
        {view === 'quality' && <section className="surface-page visual-page quality-page"><div className="surface-heading"><span>视觉 / VISUAL · QUALITY</span><h2>视觉质量</h2><p>以完整观看为中心：录屏、截图、时段对照和视觉 QC 结论。</p></div><div className="scene-toolbar"><div className="segmented" aria-label="质量镜头"><button aria-pressed={mode === 'overview'} onClick={() => setMode('overview')}>总览 · Overview</button><button aria-pressed={mode === 'mega'} onClick={() => setMode('mega')}>巨构特写 · Showcase</button></div><div className="segmented" aria-label="质量环境">{(['day', 'sunset', 'night'] as TimeOfDay[]).map(t => <button key={t} aria-pressed={time === t} onClick={() => setTime(t)}>{timeLabels[t]}</button>)}</div><QualityPicker value={quality} onChange={setQuality} /></div><WeatherPicker value={weather} onChange={setWeather} /><div className="quality-stage" role="group" aria-label="视觉质量预览">{sceneError ? <div className="scene-fallback" role="alert"><strong>3D 场景暂不可用</strong><small>{sceneError}。请切换质量或刷新页面重试。</small></div> : <SceneBoundary key={`quality-${mode}-${time}-${quality}`} fallback={<div className="scene-fallback" role="alert"><strong>3D 场景暂不可用</strong><small>{sceneError ?? '请降低渲染质量或刷新页面。'}</small></div>} onError={setSceneError}><Scene time={time} weather={weather} mode={mode} theme={theme} enabled={enabled} quality={quality} onUpdate={updateMetrics} onReady={setLoadMs} onError={setSceneError} /></SceneBoundary>}<div className={`scene-grade grade-${time}`} aria-hidden="true" /><div className={`scene-aperture aperture-${time}`} aria-hidden="true" /><div className="scene-caption"><span>{mode === 'overview' ? '总览 / OVERVIEW' : '巨构特写 / SHOWCASE'} · {timeLabels[time]}</span><strong>{themes[theme].label}</strong><small>当前视觉结果 · {enabled ? '主题已启用' : '主题已关闭'}</small></div></div><div className="quality-summary"><div><span>视觉评分 · QC Score</span><strong>{qualityGate ? 'PASS' : '—'}</strong><small>{checked.length} / {visualChecks.length} 项检查已确认</small></div><div><span>问题标记 · Issue Marker</span><strong>{visualChecks.length - checked.length}</strong><small>等待人工复核</small></div><div><span>迭代版本 · Iteration</span><strong>v0.1</strong><small>当前本地预览</small></div></div><div className="comparison-row"><div className="comparison-frame before"><span>之前 · BEFORE</span><strong>StableCity 基线</strong><small>关闭主题覆盖层</small></div><div className="comparison-frame after"><span>现在 · AFTER</span><strong>{themes[theme].label}</strong><small>主题覆盖层预览</small></div></div><div className="quality-issue-grid">{visualChecks.map((item, index) => { const confirmed = checked.includes(item); return <button key={item} className={`issue-marker ${confirmed ? 'confirmed' : ''}`} aria-pressed={confirmed} onClick={() => setChecked(prev => confirmed ? prev.filter(value => value !== item) : [...prev, item])}><span>0{index + 1}</span><div><strong>{item}</strong><small>{confirmed ? '已确认 · CONFIRMED' : '待复核 · OPEN'}</small></div></button> })}</div><div className="iteration-history"><span>迭代记录 · ITERATION HISTORY</span><div><b>v0.0</b><small>StableCity 基线</small></div><i>→</i><div className="current"><b>v0.1</b><small>{themes[theme].label} 预览</small></div></div><div className="quality-actions"><button className="primary" onClick={() => setView('pipeline')}>查看相关流程</button><details className="quality-details"><summary>查看视觉 QC 检查</summary><div className="quality-checks"><p className="help">只记录观看结果、视觉问题和人工确认，不在此页展开工程日志。</p><p className="help">{checked.length} / {visualChecks.length} 项人工确认 · 未执行 AI 视觉判定</p><div className="quality-gate"><span>视觉校验 · Visual QC</span><b className={qualityGate ? 'pass' : 'incomplete'}>{qualityGate ? '通过 · PASS' : '未完成 · INCOMPLETE'}</b></div><button className="primary" onClick={exportQualityReport}>导出质量报告</button>{reportMessage && <p className="result" role="status">{reportMessage}</p>}</div></details></div></section>}
        {view === 'pipeline' && <section className="surface-page system-page pipeline-page"><div className="surface-heading"><span>系统 / SYSTEM · PIPELINE</span><h2>生产流程</h2><p>整页回答当前 Run 走到哪里、每一步发生了什么。</p></div><div className="timeline"><div className="timeline-step done"><i>01</i><div><strong>城市已组装 · StableCity assembled</strong><span>{city.blocks.length} 街区 · {city.buildings.length} 建筑 · 签名已锁定</span></div><b>就绪</b></div><div className="timeline-step active"><i>02</i><div><strong>主题版本 · {theme}-local-01</strong><span>{themes[theme].label} · 主题覆盖层 {enabled ? '已启用' : '已关闭'}</span></div><b>进行中</b></div><div className="timeline-step"><i>03</i><div><strong>制作任务 · Production tasks</strong><span>执行策略：本地模板 · Provider：未接入</span></div><b>就绪</b></div><div className={`timeline-step ${decisions.length ? 'blocked' : 'done'}`}><i>04</i><div><strong>决策门 · Decision gate</strong><span>{decisions.length ? `${decisions.length} 项待处理` : '没有待处理决定'}</span></div><b>{decisions.length ? '待处理' : '已通过'}</b></div></div><div className="pipeline-facts"><div><span>当前步骤 · Current step</span><strong>{metrics ? 'Canvas 已渲染' : 'Canvas 启动中'}</strong></div><div><span>耗时 · Duration</span><strong>{elapsedLabel}</strong></div><div><span>重试 · Retry</span><strong>0</strong></div><div><span>阻塞 · Blocker</span><strong>{decisions.length ? '等待 Provider 决定' : '无'}</strong></div></div></section>}
        {view === 'cost' && <section className="surface-page system-page cost-page"><div className="surface-heading"><span>系统 / SYSTEM · COST</span><h2>成本与资源</h2><p>只展示真实本地执行和已发生的资源使用，不伪造模型调用。</p></div><div className="cost-overview"><div><span>累计成本 · Total Cost</span><strong>$0.00</strong><small>仅本地回退</small></div><div><span>Token 用量 · Token Usage</span><strong>未调用</strong><small>没有模型请求</small></div><div><span>模型调用 · Model Calls</span><strong>0</strong><small>Provider 未接入</small></div><div><span>耗时 · Elapsed</span><strong>{elapsedLabel}</strong><small>当前 Run</small></div></div><div className="resource-table"><div><span>图像 API · Image API</span><b>0 · 未调用</b><small>仅 procedural preview</small></div><div><span>3D API</span><b>0 · 未调用</b><small>批准决定完成前不调用</small></div><div><span>Codex Run</span><b>0 · 未调用</b><small>没有外部 Codex 执行</small></div><div><span>Canvas 初始化 · Canvas init</span><b>{loadMs === null ? '—' : `${loadMs} ms`}</b><small>从初始化到首帧</small></div><div><span>当前帧耗时 · Current frame</span><b>{metrics === null ? '—' : `${metrics.frameMs.toFixed(1)} ms`}</b><small>实时渲染采样</small></div><div><span>预算 · Budget</span><b>未配置</b><small>没有预算规则</small></div></div><div className="cost-trend"><span>成本趋势 · Cost trend</span><strong>暂无真实调用样本</strong><small>当模型或 API 接入后，这里再记录阶段耗时与趋势。</small></div><div className="cost-actions"><button className="text-link" onClick={exportPerformanceSnapshot}>导出性能快照 · {metricsHistory.length} 条采样</button><button className="text-link" onClick={exportRunReport}>导出当前 Run 报告 · JSON</button><button className="text-link" onClick={() => setView('pipeline')}>查看相关流程 →</button>{runReportMessage && <small className="result" role="status">{runReportMessage}</small>}</div></section>}
        {view === 'debug' && <section className="surface-page system-page debug-page"><div className="surface-heading"><span>系统 / SYSTEM · DEBUG</span><h2>工程调试</h2><p>只看输入、输出、日志、错误和资产描述，不混入视觉 QC。</p></div><div className="debug-layout"><div><h3>运行事实 · Run facts</h3><div className="debug-list"><div><span>城市种子 · CitySeed</span><b>{city.seed}</b></div><div><span>稳定城市 · StableCity</span><b>{city.signature}</b></div><div><span>城市语法 · UrbanGrammar</span><b>{city.urbanGrammar.primaryAxis} / {city.urbanGrammar.secondaryRoads} secondary</b></div><div><span>街道与地块 · Street + Parcels</span><b>{city.urbanGrammar.localStreets} local / {city.parcels.length} parcels</b></div><div><span>密度带 · DensityBands</span><b>{city.urbanGrammar.densityBands.join(' / ')} / voids {city.urbanGrammar.publicVoids}</b></div><div><span>构图 · Composition</span><b>hero {city.heroBlock} / peaks {city.secondaryPeaks.length} / voids {city.publicVoids.length}</b></div><div><span>交通 · Transport</span><b>{city.transport.mainSpine} / rail {city.transport.elevatedRail ? 'on' : 'off'}</b></div><div><span>主题版本 · ThemeVersion</span><b>{theme}-local-01</b></div><div><span>环境 · Environment</span><b>{timeLabels[time]}</b></div></div></div><div><h3>Provider 与错误</h3><div className="provider-matrix"><div><span>主题 / Schema</span><b>Luna · 预留</b><small>当前：本地回退</small></div><div><span>工程 / 路由</span><b>Terra / Codex · 预留</b><small>当前：本地回退</small></div><div><span>Hero / 巨构复核</span><b>GPT-6 Astra · 预留</b><small>当前：未启用</small></div><div><span>图像 / 3D 生成</span><b>Provider 未接入</b><small>当前：仅 procedural</small></div></div><h3>API / ThemeSpec / AssetManifest · 原始数据</h3><pre>{JSON.stringify({ themeSpec: themes[theme], assetManifest: { hero: 'mega-gate-v0.1', signature: 'atlas-crown-v0.1', environment: `${time}-pass` }, overlay: enabled ? 'active' : 'off', stableCity: 'locked' }, null, 2)}</pre><h3>日志 · Logs</h3><div className="log"><span>[scene] stable city assembled</span><span>[theme] overlay {enabled ? 'applied' : 'disabled'}</span><span>[qc] awaiting manual visual review</span></div></div></div><details className="system-validation"><summary>运行系统校验 · Run system QC gates</summary><div className="quality-checks"><p className="help">工程校验只在 Debug 页按需执行，不打断视觉观察。</p><button className="primary" onClick={runStructureCheck}>运行结构检查</button><p className="result" role="status">{qcResult === null ? '尚未检查' : qcResult ? `通过：${city.blocks.length} 街区 / ${city.buildings.length} 建筑 / ${city.parcels.length} Parcel。` : `未通过：${qcIssues.join('、') || 'baseline'}。`}</p><button className="primary" onClick={() => { setEnabled(false); setThemeOffResult(getStableCitySignature(city) === baselineSignature) }}>运行 Theme OFF Test</button><p className="result" role="status">{themeOffResult === null ? '尚未检查' : themeOffResult ? '通过：Theme OFF 保持 StableCity 基线。' : '未通过：Theme OFF 结构发生变化。'}</p><button className="primary" onClick={runThemeMatrixTest}>运行 Theme Matrix Test</button><p className="result" role="status">{themeMatrixResult === null ? '尚未检查' : themeMatrixPass ? '通过：三个 ThemeSpec 可区分。' : '未通过：ThemeSpec 存在差异问题。'}</p><button className="primary" onClick={exportQualityReport}>导出 Quality Report</button>{reportMessage && <p className="result" role="status">{reportMessage}</p>}</div></details><button className="text-link" onClick={() => setView('pipeline')}>查看相关流程 →</button></section>}
        {view === 'intelligence' && <section className="surface-page system-page intelligence-page"><div className="surface-heading"><span>系统 / SYSTEM · INTELLIGENCE</span><h2>系统洞察</h2><p>把成功、失败、路由和改进建议沉淀为下一轮可用经验。</p></div><div className="intelligence-list"><article><span>成功模式 · Successful pattern</span><strong>StableCity signature + Theme OFF 保持一致</strong><small>当前已通过本地结构校验；不是视觉模型评分。</small></article><article><span>失败模式 · Failure pattern</span><strong>{decisions.length ? '外部 Provider 未接入' : '暂无待处理阻塞'}</strong><small>阻塞来自当前连接状态，不代表生成质量。</small></article><article><span>路由建议 · Router suggestion</span><strong>继续使用 local-template（本地模板）</strong><small>等待 Luna / Terra / Astra 接入后再切换。</small></article><article><span>Provider 表现 · Provider performance</span><strong>未执行真实调用</strong><small>没有可报告的 Token、延迟或成功率。</small></article><article><span>提示词改进 · Prompt improvement</span><strong>补充 Hero silhouette 与 scale reference 约束</strong><small>这属于下一轮高级视觉工作，需先切换 GPT-6 Astra。</small></article><article><span>预设改进 · Preset improvement</span><strong>保留 ThemeSpec 的完整视觉字段</strong><small>当前 Theme Matrix 已覆盖色相、冷暖、饱和度、明度和发光色。</small></article></div><div className="flywheel"><span>视觉智能飞轮 · Visual Intelligence Flywheel</span><b>观察 → QC → 记录 → 复核</b><small>本 Run 已记录 StableCity、Theme Matrix、结构问题和本地指标。</small></div><div className="experience-record"><span>经验记录 · Experience record</span><strong>local-first / 未调用外部服务</strong><small>只记录本地可验证事实，不把推断写成 Provider 经验。</small></div></section>}
        <div className={`run-controls-host ${view === 'pipeline' ? 'active' : 'inactive'}`} aria-hidden={view !== 'pipeline'}><details className="pipeline-details pipeline-run-details" open={view === 'pipeline'}><summary>打开当前 Run 控制台 · Run controls</summary><ProductionPanel seed={city.seed} theme={themes[theme].label} /></details></div>
      </div>
      <footer className="console-footer">本地模拟流程 · 当前视图：{viewLabels[view]} · 未连接 AI 服务</footer>
    </section>
    {decisionDrawerOpen && <div className="decision-sheet" role="dialog" aria-modal="true" aria-label="决定队列"><div className="sheet-backdrop" onClick={() => setDecisionDrawerOpen(false)} /><div className="sheet-panel"><div className="drawer-heading"><div><span>决定队列 · DECISION QUEUE</span><h3>需处理的决定</h3></div><button onClick={() => setDecisionDrawerOpen(false)} aria-label="关闭决定面板">关闭</button></div><p className="help">这些操作不会自动调用外部服务；记录决定后才会从当前队列移除。</p>{decisions.length ? <div className="decision-list">{decisions.map(decision => <article key={decision.id}><div><strong>{decision.title}</strong><p>{decision.detail}</p></div><button onClick={() => dismissDecision(decision.id)}>记录决定</button></article>)}</div> : <p className="empty-state">当前没有待处理决定。</p>}</div></div>}
  </main>
}
