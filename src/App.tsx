import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import type { Mesh, WebGLRenderer } from 'three'
import { Color } from 'three'
import { createStableCity, getStableCitySignature, type TimeOfDay } from './city'
import { ProductionPanel } from './ProductionPanel'

const city = createStableCity()
type ThemeName = 'harbor' | 'verdant' | 'ember'
const themes: Record<ThemeName, { label: string; primary: string; accent: string; atmosphere: string }> = {
  harbor: { label: 'Harbor Mineral', primary: '#315f68', accent: '#e2b273', atmosphere: '#89aeb1' },
  verdant: { label: 'Verdant Relay', primary: '#365e50', accent: '#e1bd69', atmosphere: '#91ae87' },
  ember: { label: 'Ember Foundry', primary: '#6b4541', accent: '#efb07b', atmosphere: '#b87a70' }
}
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
  onReady: () => void
}) {
  return <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }} onCreated={() => requestAnimationFrame(onReady)}>
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

export function App() {
  const [time, setTime] = useState<TimeOfDay>('sunset')
  const [mode, setMode] = useState<'overview' | 'mega'>('overview')
  const [theme, setTheme] = useState<ThemeName>('harbor')
  const [enabled, setEnabled] = useState(true)
  const [panel, setPanel] = useState<'monitor' | 'quality' | 'debug'>('monitor')
  const [metrics, setMetrics] = useState<RenderMetrics | null>(null)
  const [loadMs, setLoadMs] = useState<number | null>(null)
  const [qcResult, setQcResult] = useState<boolean | null>(null)
  const [themeOffResult, setThemeOffResult] = useState<boolean | null>(null)
  const [checked, setChecked] = useState<string[]>([])
  useEffect(() => { setChecked([]); setQcResult(null) }, [time, mode, theme, enabled])
  useEffect(() => { setThemeOffResult(null) }, [time, mode, theme])
  useEffect(() => { if (enabled) setThemeOffResult(null) }, [enabled])

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
          <Scene time={time} mode={mode} theme={theme} enabled={enabled} onUpdate={setMetrics} onReady={() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
            const start = navigation?.startTime ?? 0
            setLoadMs(Math.round(performance.now() - start))
          }} />
          <div className="scene-caption"><span>01 / ATLAS DISTRICT</span><strong>{mode === 'overview' ? '秩序之中的城市' : '穿越城市的门'}</strong><small>拖动旋转 · 滚轮缩放</small></div>
        </div>
        <div className="scene-status">
          <span>SEED {city.seed} · {city.blocks.length} 街区 · {city.buildings.length} 建筑</span>
          <span className="metrics">{metrics ? `${metrics.fps.toFixed(0)} FPS · ${metrics.frameMs.toFixed(1)} ms · ${metrics.calls} draws · ${metrics.triangles.toLocaleString()} tris` : '采集渲染指标…'}</span>
        </div>
      </section>
      <aside className="console" aria-label="制作控制台">
        <div className="console-title"><p className="eyebrow">PRODUCTION CONSOLE</p><h2>场景工作台</h2><p>从城市骨架，到完整的世界。</p></div>
        <nav className="panel-tabs" aria-label="控制台">
          {(['monitor', 'quality', 'debug'] as const).map((item, i) => <button key={item} aria-pressed={panel === item} onClick={() => setPanel(item)}>{['运行监视', '质量与成本', '调试与洞察'][i]}</button>)}
        </nav>
        <div className="panel-body">
          {panel === 'monitor' && <>
            <div className="section-heading"><h3>选择氛围</h3><span>03 PRESETS</span></div>
            <p className="help">调整材质配色与环境色，城市布局保持固定。</p>
            <div className="theme-list">{(Object.keys(themes) as ThemeName[]).map((name, i) =>
              <button key={name} className={`theme-choice ${name}`} aria-pressed={theme === name} onClick={() => setTheme(name)}>
                <span className="theme-swatch" aria-hidden="true"><i /><i /><i /></span>
                <span><strong>{themeLabels[name]}</strong><small>{themes[name].label}</small></span><b>0{i + 1}</b>
              </button>)}
            </div>
            <label className="toggle-row"><span>启用主题覆盖<small>关闭后对照基础港湾材质</small></span><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /></label>
            <div className="note"><strong>结构锁定</strong><p>Seed、街区、建筑体量与巨构不会随主题重新生成。</p></div>
          </>}
          {panel === 'monitor' && <div className="monitor-task"><ProductionPanel seed={city.seed} theme={themes[theme].label} /></div>}
          {panel === 'quality' && <>
            <div className="section-heading"><h3>Quality</h3><span>LIVE SNAPSHOT</span></div>
            <p className="help">当前画面和 StableCity 基线的可验证指标。</p>
            <div className="metric-grid"><div><strong>{metrics ? metrics.fps.toFixed(0) : '—'}</strong><span>FPS</span></div><div><strong>{metrics ? metrics.frameMs.toFixed(1) : '—'}</strong><span>FRAME MS</span></div><div><strong>{metrics?.calls ?? '—'}</strong><span>DRAWS</span></div><div><strong>{metrics ? metrics.triangles.toLocaleString() : '—'}</strong><span>TRIS</span></div><div><strong>{loadMs ?? '—'}</strong><span>LOAD MS</span></div></div>
            <h3>结构检查</h3><p className="help">对比当前城市数据与本次加载时的基准。</p>
            <button className="primary" onClick={() => setQcResult(getStableCitySignature(city) === baselineSignature && city.blocks.length === 16 && city.buildings.length === 60)}>运行结构检查</button>
            <p className="result" role="status">{qcResult === null ? '尚未检查' : qcResult ? `通过：StableCity 签名一致，${city.blocks.length} 街区 / ${city.buildings.length} 建筑 / ${city.parcels.length} Parcel。` : '未通过：StableCity 签名发生变化。'}</p>
            <h3>Theme OFF Test</h3><p className="help">关闭主题覆盖，确认主题不会改写 StableCity 基线。</p>
            <button className="primary" onClick={() => { setEnabled(false); setThemeOffResult(getStableCitySignature(city) === baselineSignature) }}>运行 Theme OFF Test</button>
            <p className="result" role="status">{themeOffResult === null ? '尚未检查' : themeOffResult ? '通过：主题关闭后 StableCity 签名保持一致。' : '未通过：主题关闭后结构发生变化。'}</p>
            <h3>人工视觉检查</h3><p className="help">切换主题、时段或镜头后会清空确认。</p>
            {visualChecks.map(item => <label className="check-row" key={item}><input type="checkbox" checked={checked.includes(item)} onChange={e => setChecked(prev => e.target.checked ? [...prev, item] : prev.filter(value => value !== item))} />{item}</label>)}
            <p className="help">{checked.length} / {visualChecks.length} 项人工确认 · 未执行 AI 视觉判定</p>
            <div className="cost-row"><span>本地运行成本</span><b>$0.00</b></div>
          </>}
          {panel === 'debug' && <>
            <div className="section-heading"><h3>Debug</h3><span>READ ONLY</span></div>
            <p className="help">查看本次场景装配的输入、策略与限制。</p>
            <div className="debug-list"><div><span>CitySeed</span><b>{city.seed}</b></div><div><span>StableCity</span><b>{city.signature}</b></div><div><span>UrbanGrammar</span><b>{city.urbanGrammar.primaryAxis} / {city.urbanGrammar.secondaryRoads} secondary</b></div><div><span>Composition</span><b>hero {city.heroBlock} / peaks {city.secondaryPeaks.length} / voids {city.publicVoids.length}</b></div><div><span>Transport</span><b>{city.transport.mainSpine} / rail {city.transport.elevatedRail ? 'on' : 'off'}</b></div><div><span>ThemeVersion</span><b>{theme}-local-01</b></div><div><span>Environment</span><b>{timeLabels[time]}</b></div><div><span>Execution</span><b>Procedural + local mock</b></div><div><span>AI Provider</span><b>未连接</b></div></div>
            <h3>ThemeSpec 快照</h3><pre>{JSON.stringify({ identity: themeLabels[theme], overlay: enabled ? 'active' : 'off', stableCity: 'locked', accent: themes[theme].accent }, null, 2)}</pre>
            <h3>运行日志</h3><div className="log"><span>[scene] stable city assembled</span><span>[theme] overlay {enabled ? 'applied' : 'disabled'}</span><span>[qc] awaiting manual visual review</span></div>
          </>}
        </div>
        <div className="console-footer">本地模拟流程 · 未连接 AI 服务</div>
      </aside>
    </div>
  </main>
}
