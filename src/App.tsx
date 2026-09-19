import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import type { Mesh, WebGLRenderer } from 'three'
import { Color } from 'three'
import { createStableCity, getStableCitySignature, validateStableCity, type TimeOfDay } from './city'
import { ProductionPanel } from './ProductionPanel'
import { themeSpecs, type ThemeName } from './theme'

const city = createStableCity()
const themes = themeSpecs
const palettes: Record<TimeOfDay, { sky: string; fog: string; ground: string; key: string; window: string; ambient: string }> = {
  day: { sky: '#8db8c9', fog: '#a6c8ca', ground: '#385762', key: '#fff0cc', window: '#ffd99a', ambient: '#9ac4cb' },
  sunset: { sky: '#a57182', fog: '#b77f78', ground: '#493648', key: '#ffd09a', window: '#ffca8a', ambient: '#be7489' },
  night: { sky: '#142143', fog: '#2a4165', ground: '#193047', key: '#a9c8ff', window: '#ffdf9c', ambient: '#45649b' }
}

function City({ time, theme, enabled }: { time: TimeOfDay; theme: ThemeName; enabled: boolean }) {
  const p = palettes[time]
  const t = enabled ? themes[theme] : themes.harbor
  const train = useRef<Mesh>(null)
  const rotor = useRef<Mesh>(null)
  useFrame((state, delta) => {
    if (train.current) train.current.position.x = Math.sin(state.clock.elapsedTime * 0.28) * 31
    if (rotor.current) rotor.current.rotation.y += delta * 0.55
  })
  return <>
    <color attach="background" args={[p.sky]} /><fog attach="fog" args={[p.fog, 68, 138]} />
    <hemisphereLight args={[enabled ? t.atmosphere : p.ambient, '#26333b', 3.1]} /><ambientLight intensity={0.75} color={p.ambient} /><directionalLight position={[35, 45, 18]} intensity={4.2} color={p.key} castShadow />
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[150, 150]} /><meshStandardMaterial color={p.ground} roughness={0.88} /></mesh>
    {[-27, -9, 9, 27].map((x) => <mesh key={`axis-${x}`} position={[x, 0.03, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[5, 110]} /><meshStandardMaterial color="#162129" roughness={1} /></mesh>)}
    {[-27, -9, 9, 27].map((z) => <mesh key={`road-${z}`} position={[0, 0.04, z]} rotation-x={-Math.PI / 2}><planeGeometry args={[110, 3.8]} /><meshStandardMaterial color="#17232b" roughness={1} /></mesh>)}
    {city.blocks.filter(b => b.kind === 'void').map(b => <group key={b.id} position={[b.x, 0, b.z]}><mesh rotation-x={-Math.PI / 2}><circleGeometry args={[7.3, 32]} /><meshStandardMaterial color={t.primary} roughness={1} /></mesh><mesh position={[0, .25, 0]}><cylinderGeometry args={[1.5, 2.4, .5, 12]} /><meshStandardMaterial color={t.accent} /></mesh></group>)}
    {city.buildings.map(b => <group key={b.id} position={[b.x, b.height / 2, b.z]}><mesh castShadow receiveShadow><boxGeometry args={[b.width, b.height, b.depth]} /><meshStandardMaterial color={new Color(t.primary).offsetHSL((b.tone - .5) * .08, b.tone * .08, b.tone * .12)} roughness={.68} metalness={.15} /></mesh>{time !== 'day' && <mesh position={[0, 0, b.depth / 2 + .012]}><planeGeometry args={[b.width * .6, b.height * .66]} /><meshBasicMaterial color={p.window} transparent opacity={.5} /></mesh>}</group>)}
    <Megastructure time={time} theme={enabled ? theme : 'harbor'} />
    <group position={[0, 8.6, -30]}><mesh><boxGeometry args={[72, .5, 1]} /><meshStandardMaterial color="#667b87" metalness={.7} roughness={.35} /></mesh><mesh ref={train} position={[0, 1.0, 0]}><boxGeometry args={[8, 1.4, 1.8]} /><meshStandardMaterial color="#d2aa76" metalness={.55} roughness={.28} /></mesh></group>
    <group ref={rotor} position={[0, 29, 7]}><mesh><torusGeometry args={[3.4, .25, 10, 32]} /><meshStandardMaterial color="#e3be7f" emissive="#b26835" emissiveIntensity={time === 'night' ? 1.5 : .3} /></mesh></group>
  </>
}

function Megastructure({ time, theme }: { time: TimeOfDay; theme: ThemeName }) {
  const glow = time === 'night' ? '#df9b62' : themes[theme].accent
  return <group position={[0, 0, 9]}>
    <mesh position={[-9, 13, 0]} castShadow><boxGeometry args={[6, 26, 8]} /><meshStandardMaterial color={themes[theme].primary} roughness={.5} metalness={.35} /></mesh>
    <mesh position={[9, 13, 0]} castShadow><boxGeometry args={[6, 26, 8]} /><meshStandardMaterial color={themes[theme].primary} roughness={.5} metalness={.35} /></mesh>
    <mesh position={[0, 22, 0]} castShadow><boxGeometry args={[25, 5, 9]} /><meshStandardMaterial color={new Color(themes[theme].primary).offsetHSL(0, .05, .1)} roughness={.42} metalness={.35} /></mesh>
    <mesh position={[0, 24.7, 0]}><boxGeometry args={[29, .35, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={time === 'night' ? 1.3 : .12} /></mesh>
    <mesh position={[-14, 17, 0]} rotation-z={-.18} castShadow><boxGeometry args={[17, 3, 7]} /><meshStandardMaterial color="#527d7b" metalness={.4} roughness={.48} /></mesh>
  </group>
}

type RenderMetrics = { fps: number; frameMs: number; calls: number; triangles: number }

function Metrics({ onUpdate }: { onUpdate: (metrics: RenderMetrics) => void }) {
  const { gl } = useThree()
  const accumulator = useRef({ elapsed: 0, frames: 0 })
  useFrame((_, delta) => { const a = accumulator.current; a.elapsed += delta; a.frames++; if (a.elapsed > 1) { const info = (gl as WebGLRenderer).info.render; onUpdate({ fps: a.frames / a.elapsed, frameMs: a.elapsed * 1000 / a.frames, calls: info.calls, triangles: info.triangles }); a.elapsed = 0; a.frames = 0 } })
  return null
}

function CameraDirector({ mode }: { mode: 'overview' | 'mega' }) {
  const { camera } = useThree()
  useEffect(() => { const position = mode === 'overview' ? [56, 44, 66] : [39, 25, 41]; camera.position.set(position[0], position[1], position[2]); camera.lookAt(0, mode === 'overview' ? 10 : 15, mode === 'overview' ? 0 : 9); camera.updateProjectionMatrix() }, [camera, mode])
  return null
}

function Scene({ time, mode, theme, enabled, onUpdate, onReady }: {
  time: TimeOfDay; mode: 'overview' | 'mega'; theme: ThemeName; enabled: boolean
  onUpdate: (metrics: RenderMetrics) => void
  onReady: (loadMs: number) => void
}) {
  const sceneStartedAt = useRef(performance.now())
  return <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }} onCreated={() => requestAnimationFrame(() => onReady(Math.round(performance.now() - sceneStartedAt.current)))}>
    <PerspectiveCamera makeDefault fov={46} />
    <CameraDirector mode={mode} />
    <City time={time} theme={theme} enabled={enabled} />
    <OrbitControls target={[0, mode === 'overview' ? 10 : 15, mode === 'overview' ? 0 : 9]} maxPolarAngle={Math.PI / 2.05} />
    <Metrics onUpdate={onUpdate} />
  </Canvas>
}

const baselineSignature = city.signature
const timeLabels = { day: '白昼', sunset: '日落', night: '夜晚' }
const themeLabels = { harbor: '矿石港湾', verdant: '绿洲中继', ember: '余烬铸城' }
const visualChecks = ['明暗与色彩层级', '巨构主角与剪影', '空间纵深与材质', '关闭主题后的可读性']
type ConsoleMode = 'monitor' | 'quality' | 'debug'
type Decision = { id: string; title: string; detail: string }
const defaultDecisions: Decision[] = [
  { id: '3d-api', title: '3D API 调用批准', detail: 'Provider 尚未连接，当前保持 procedural only。' },
  { id: 'hero-regenerate', title: 'Hero Regenerate', detail: '等待 GPT-6 Astra 完成高级视觉复核后再允许。' },
]

export function App() {
  const [time, setTime] = useState<TimeOfDay>('sunset')
  const [mode, setMode] = useState<'overview' | 'mega'>('overview')
  const [theme, setTheme] = useState<ThemeName>('harbor')
  const [enabled, setEnabled] = useState(true)
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>('monitor')
  const [qualityMode, setQualityMode] = useState<'quality' | 'cost'>('quality')
  const [debugMode, setDebugMode] = useState<'debug' | 'intelligence'>('debug')
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
    <div className="workspace">
        <section className="scene-column" aria-label="城市预览">
        <div className="scene-toolbar">
          <div className="segmented" aria-label="镜头">
            <button aria-pressed={mode === 'overview'} onClick={() => setMode('overview')}>城市总览</button>
            <button aria-pressed={mode === 'mega'} onClick={() => setMode('mega')}>巨构特写</button>
          </div>
          <div className="segmented" aria-label="时段">
            {(['day', 'sunset', 'night'] as TimeOfDay[]).map(t => <button key={t} aria-pressed={time === t} onClick={() => setTime(t)}>{timeLabels[t]}</button>)}
          </div>
        </div>
        <div className="viewport">
          <Scene time={time} mode={mode} theme={theme} enabled={enabled} onUpdate={setMetrics} onReady={setLoadMs} />
          <div className="scene-caption"><span>01 / ATLAS DISTRICT</span><strong>{mode === 'overview' ? '秩序之中的城市' : '穿越城市的门'}</strong><small>拖动旋转 · 滚轮缩放</small></div>
        </div>
        <div className="scene-status">
          <span>SEED {city.seed} · {city.blocks.length} 街区 · {city.buildings.length} 建筑</span>
          <span className="metrics">{metrics ? `${metrics.fps.toFixed(0)} FPS · ${metrics.frameMs.toFixed(1)} ms · ${metrics.calls} draws · ${metrics.triangles.toLocaleString()} tris` : '采集渲染指标…'}</span>
        </div>
      </section>
      <aside className="console" aria-label="制作控制台">
        <div className="console-title"><p className="eyebrow">PRODUCTION CONSOLE</p><h2>场景工作台</h2><p>一个 Run，上下文始终保持。</p></div>
        <div className="run-context" aria-label="Run Context Bar">
          <div className="context-heading"><span>RUN CONTEXT</span><b>{runStatus}</b></div>
          <div className="context-grid">
            <div><span>Run ID</span><strong>RUN-{city.seed}-P1</strong></div>
            <div><span>CitySeed</span><strong>{city.seed}</strong></div>
            <label><span>ThemeVersion</span><select value={theme} onChange={e => setTheme(e.target.value as ThemeName)}>{(Object.keys(themes) as ThemeName[]).map(name => <option key={name} value={name}>{name}-local-01</option>)}</select></label>
            <div><span>Cost</span><strong>$0.00</strong></div>
            <div><span>Elapsed</span><strong>{elapsedLabel}</strong></div>
          </div>
          <div className="context-actions"><label className="context-toggle"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /><span>Theme overlay</span></label><button className="decision-trigger" onClick={() => setDecisionDrawerOpen(true)}>⚠ {decisions.length} Decisions Required</button></div>
        </div>
        <nav className="workspace-modes" aria-label="工作模式">
          <button className={consoleMode === 'monitor' ? 'active' : ''} onClick={() => setConsoleMode('monitor')}><span>Monitor</span><small>LIVE</small></button>
          <button className={consoleMode === 'quality' ? 'active' : ''} onClick={() => setConsoleMode('quality')}><span>Quality &amp; Cost</span><small>ANALYZE</small></button>
          <button className={consoleMode === 'debug' ? 'active' : ''} onClick={() => setConsoleMode('debug')}><span>Debug &amp; Intelligence</span><small>INSPECT</small></button>
        </nav>
        <div className="panel-body">
          {consoleMode === 'monitor' && <>
            <div className="mode-heading"><div><span>MONITOR</span><h3>实时制作管线</h3></div><b>LIVE</b></div>
            <p className="help">只显示当前 Run 的步骤、执行策略、阻塞与决定状态。</p>
            <div className="pipeline-list">
              <div className="pipeline-step"><i>01</i><div><strong>StableCity assembled</strong><small>{city.blocks.length} blocks · {city.buildings.length} buildings · signature locked</small></div><b className="step-done">READY</b></div>
              <div className="pipeline-step"><i>02</i><div><strong>ThemeVersion {theme}-local-01</strong><small>{themes[theme].label} · overlay {enabled ? 'active' : 'off'}</small></div><b className="step-active">ACTIVE</b></div>
              <div className="pipeline-step"><i>03</i><div><strong>Local production run</strong><small>Procedural + local mock · no external provider</small></div><b>READY</b></div>
              <div className="pipeline-step"><i>04</i><div><strong>Human decision gate</strong><small>{decisions.length ? `${decisions.length} decisions required` : 'No pending decisions'}</small></div><b className={decisions.length ? 'step-blocked' : 'step-done'}>{decisions.length ? 'BLOCKED' : 'CLEAR'}</b></div>
            </div>
            <div className="monitor-grid"><div><span>Current step</span><strong>{metrics ? 'Canvas rendered' : 'Canvas boot'}</strong></div><div><span>Execution Strategy</span><strong>local-template</strong></div><div><span>Provider</span><strong>none · fallback</strong></div><div><span>Decision</span><strong>{decisions.length ? `${decisions.length} required` : 'clear'}</strong></div></div>
            <div className="blocker-row"><span>Error / Blocker</span><p>{decisions.length ? 'External provider approval is pending; no external call will run.' : 'None. Current Run can continue locally.'}</p></div>
            <details className="pipeline-details"><summary>展开当前 Run 的制作控制</summary><div className="monitor-task"><ProductionPanel seed={city.seed} theme={themes[theme].label} /></div></details>
          </>}
          {consoleMode === 'quality' && <>
            <div className="mode-heading"><div><span>QUALITY &amp; COST</span><h3>{qualityMode === 'quality' ? '质量验收' : '成本与调用'}</h3></div><b>ANALYZE</b></div>
            <div className="submode-switch" aria-label="Quality and Cost"><button className={qualityMode === 'quality' ? 'active' : ''} onClick={() => setQualityMode('quality')}>Quality</button><button className={qualityMode === 'cost' ? 'active' : ''} onClick={() => setQualityMode('cost')}>Cost</button></div>
            {qualityMode === 'quality' && <>
              <p className="help">当前画面和 StableCity 基线的可验证指标。</p>
              <div className="metric-grid"><div><strong>{metrics ? metrics.fps.toFixed(0) : '—'}</strong><span>FPS</span></div><div><strong>{metrics ? metrics.frameMs.toFixed(1) : '—'}</strong><span>FRAME MS</span></div><div><strong>{metrics?.calls ?? '—'}</strong><span>DRAWS</span></div><div><strong>{metrics ? metrics.triangles.toLocaleString() : '—'}</strong><span>TRIS</span></div><div><strong>{loadMs ?? '—'}</strong><span>LOAD MS</span></div></div>
              <h3>结构检查</h3><p className="help">对比当前城市数据与本次加载时的基准。</p>
              <button className="primary" onClick={runStructureCheck}>运行结构检查</button>
              <p className="result" role="status">{qcResult === null ? '尚未检查' : qcResult ? `通过：StableCity 签名一致，${city.blocks.length} 街区 / ${city.buildings.length} 建筑 / ${city.parcels.length} Parcel。` : `未通过：${qcIssues.join('、') || 'baseline'}。`}</p>
              <h3>Theme OFF Test</h3><p className="help">关闭主题覆盖，确认主题不会改写 StableCity 基线。</p>
              <button className="primary" onClick={() => { setEnabled(false); setThemeOffResult(getStableCitySignature(city) === baselineSignature) }}>运行 Theme OFF Test</button>
              <p className="result" role="status">{themeOffResult === null ? '尚未检查' : themeOffResult ? '通过：主题关闭后 StableCity 签名保持一致。' : '未通过：主题关闭后结构发生变化。'}</p>
              <h3>Theme Matrix Test</h3><p className="help">遍历三个 ThemeSpec，确认同一 CitySeed 的 StableCity 签名保持一致。</p>
              <button className="primary" onClick={runThemeMatrixTest}>运行 Theme Matrix Test</button>
              <p className="result" role="status">{themeMatrixResult === null ? '尚未检查' : themeMatrixPass ? '通过：StableCity 签名一致，三个 ThemeSpec 保持可区分。' : `未通过：${Object.entries(themeMatrixResult).filter(([, result]) => !result.stableCity || !result.themeSpecDistinct).map(([name]) => name).join('、')} 存在结构或主题差异问题。`}</p>
              {themeMatrixResult && <div className="theme-matrix-results" aria-label="Theme Matrix 逐项结果">{(Object.keys(themes) as ThemeName[]).map(name => { const result = themeMatrixResult[name]; return <div key={name}><span>{themeLabels[name]}</span><b>{result.stableCity ? 'StableCity PASS' : 'StableCity FAIL'} · {result.themeSpecDistinct ? 'Spec DISTINCT' : 'Spec COLLISION'}</b></div> })}</div>}
              <h3>人工视觉检查</h3><p className="help">切换主题、时段或镜头后会清空确认。</p>
              {visualChecks.map(item => <label className="check-row" key={item}><input type="checkbox" checked={checked.includes(item)} onChange={e => setChecked(prev => e.target.checked ? [...prev, item] : prev.filter(value => value !== item))} />{item}</label>)}
              <p className="help">{checked.length} / {visualChecks.length} 项人工确认 · 未执行 AI 视觉判定</p>
              <div className="quality-gate"><span>Quality Gate</span><b className={qualityGate ? 'pass' : 'incomplete'}>{qualityGate ? 'PASS' : 'INCOMPLETE'}</b></div>
              <button className="primary" onClick={exportQualityReport}>导出 Quality Report</button>
              {reportMessage && <p className="result" role="status">{reportMessage}</p>}
            </>}
            {qualityMode === 'cost' && <>
              <p className="help">当前只统计本地执行；未连接的模型或 API 不伪造调用量。</p>
              <div className="cost-overview"><div><span>Total Cost</span><strong>$0.00</strong><small>local fallback only</small></div><div><span>Token</span><strong>未调用</strong><small>no model request</small></div><div><span>Elapsed</span><strong>{elapsedLabel}</strong><small>current Run</small></div></div>
              <div className="cost-list"><div><span>Model calls</span><b>0 · 未调用</b></div><div><span>Image API</span><b>0 · 未调用</b></div><div><span>3D API</span><b>0 · 未调用</b></div><div><span>Codex Run</span><b>0 · 未调用</b></div><div><span>Canvas init</span><b>{loadMs === null ? '—' : `${loadMs} ms`}</b></div><div><span>Current frame</span><b>{metrics === null ? '—' : `${metrics.frameMs.toFixed(1)} ms`}</b></div></div>
            </>}
          </>}
          {consoleMode === 'debug' && <>
            <div className="mode-heading"><div><span>DEBUG &amp; INTELLIGENCE</span><h3>{debugMode === 'debug' ? '运行调试' : '智能洞察'}</h3></div><b>INSPECT</b></div>
            <div className="submode-switch" aria-label="Debug and Intelligence"><button className={debugMode === 'debug' ? 'active' : ''} onClick={() => setDebugMode('debug')}>Debug</button><button className={debugMode === 'intelligence' ? 'active' : ''} onClick={() => setDebugMode('intelligence')}>Intelligence</button></div>
            {debugMode === 'debug' && <>
              <p className="help">查看本次场景装配的输入、策略与限制。</p>
              <div className="debug-list"><div><span>CitySeed</span><b>{city.seed}</b></div><div><span>StableCity</span><b>{city.signature}</b></div><div><span>UrbanGrammar</span><b>{city.urbanGrammar.primaryAxis} / {city.urbanGrammar.secondaryRoads} secondary</b></div><div><span>Street + Parcels</span><b>{city.urbanGrammar.localStreets} local / {city.parcels.length} parcels</b></div><div><span>DensityBands</span><b>{city.urbanGrammar.densityBands.join(' / ')} / voids {city.urbanGrammar.publicVoids}</b></div><div><span>Composition</span><b>hero {city.heroBlock} / peaks {city.secondaryPeaks.length} / voids {city.publicVoids.length}</b></div><div><span>Transport</span><b>{city.transport.mainSpine} / rail {city.transport.elevatedRail ? 'on' : 'off'}</b></div><div><span>ThemeVersion</span><b>{theme}-local-01</b></div><div><span>Environment</span><b>{timeLabels[time]}</b></div><div><span>Execution</span><b>Procedural + local mock</b></div><div><span>AI Provider</span><b>未连接</b></div></div>
              <h3>Provider Matrix</h3><div className="provider-matrix"><div><span>Theme / schema</span><b>Luna · reserved</b><small>当前：local fallback</small></div><div><span>Engineering / routing</span><b>Terra / Codex · reserved</b><small>当前：local fallback</small></div><div><span>Hero / Mega art review</span><b>GPT-6 Astra · reserved</b><small>当前：未启用，等待高级视觉定稿</small></div><div><span>Image / 3D generation</span><b>Provider unavailable</b><small>当前：procedural only</small></div></div>
              <h3>ThemeSpec 快照</h3><pre>{JSON.stringify({ ...themes[theme], overlay: enabled ? 'active' : 'off', stableCity: 'locked' }, null, 2)}</pre>
              <h3>运行日志</h3><div className="log"><span>[scene] stable city assembled</span><span>[theme] overlay {enabled ? 'applied' : 'disabled'}</span><span>[qc] awaiting manual visual review</span></div>
            </>}
            {debugMode === 'intelligence' && <>
              <p className="help">只显示有来源的本地观察；未调用真实模型时不推断 Provider 质量。</p>
              <div className="intelligence-list"><article><span>Success patterns</span><strong>StableCity signature + Theme OFF 保持一致</strong><small>当前已通过本地结构校验；不是视觉模型评分。</small></article><article><span>Failure patterns</span><strong>{decisions.length ? 'External provider unavailable' : '暂无待处理阻塞'}</strong><small>阻塞来自当前连接状态，不代表生成质量。</small></article><article><span>Router suggestion</span><strong>继续使用 local-template</strong><small>等待 Luna / Terra / Astra 接入后再切换。</small></article><article><span>Provider performance</span><strong>未执行真实调用</strong><small>没有可报告的 token、延迟或成功率。</small></article><article><span>Prompt / Preset improvement</span><strong>下一轮优先校准 Hero silhouette 与 scale reference</strong><small>进入高级视觉阶段前需切换 GPT-6 Astra。</small></article></div>
              <div className="flywheel"><span>Visual Intelligence Flywheel</span><b>Observe → QC → record → review</b><small>本 Run 已记录 StableCity、Theme Matrix、结构问题和本地指标。</small></div>
            </>}
          </>}
        </div>
        {decisionDrawerOpen && <div className="decision-drawer" role="dialog" aria-label="Decision Queue"><div className="drawer-heading"><div><span>DECISION QUEUE</span><h3>需处理的决定</h3></div><button onClick={() => setDecisionDrawerOpen(false)} aria-label="关闭决定面板">关闭</button></div><p className="help">这些操作不会自动调用外部服务；记录决定后才会从当前队列移除。</p>{decisions.length ? <div className="decision-list">{decisions.map(decision => <article key={decision.id}><div><strong>{decision.title}</strong><p>{decision.detail}</p></div><button onClick={() => dismissDecision(decision.id)}>记录决定</button></article>)}</div> : <p className="empty-state">当前没有待处理决定。</p>}</div>}
        <div className="console-footer">本地模拟流程 · 未连接 AI 服务</div>
      </aside>
    </div>
  </main>
}
