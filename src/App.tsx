import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import type { Mesh, WebGLRenderer } from 'three'
import { Color, MathUtils } from 'three'
import { createStableCity, type TimeOfDay } from './city'

const city = createStableCity()
const palettes: Record<TimeOfDay, { sky: string; fog: string; ground: string; key: string; window: string; ambient: string }> = {
  day: { sky: '#8db8c9', fog: '#a6c8ca', ground: '#385762', key: '#fff0cc', window: '#ffd99a', ambient: '#9ac4cb' },
  sunset: { sky: '#a57182', fog: '#b77f78', ground: '#493648', key: '#ffd09a', window: '#ffca8a', ambient: '#be7489' },
  night: { sky: '#142143', fog: '#2a4165', ground: '#193047', key: '#a9c8ff', window: '#ffdf9c', ambient: '#45649b' }
}

function City({ time }: { time: TimeOfDay }) {
  const p = palettes[time]
  const train = useRef<Mesh>(null)
  const rotor = useRef<Mesh>(null)
  useFrame((state, delta) => {
    if (train.current) train.current.position.x = Math.sin(state.clock.elapsedTime * 0.28) * 31
    if (rotor.current) rotor.current.rotation.y += delta * 0.55
  })
  return <>
    <color attach="background" args={[p.sky]} /><fog attach="fog" args={[p.fog, 68, 138]} />
    <hemisphereLight args={[p.ambient, '#26333b', 3.1]} /><ambientLight intensity={0.75} color={p.ambient} /><directionalLight position={[35, 45, 18]} intensity={4.2} color={p.key} castShadow />
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[150, 150]} /><meshStandardMaterial color={p.ground} roughness={0.88} /></mesh>
    {[-27, -9, 9, 27].map((x) => <mesh key={`axis-${x}`} position={[x, 0.03, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[5, 110]} /><meshStandardMaterial color="#162129" roughness={1} /></mesh>)}
    {[-27, -9, 9, 27].map((z) => <mesh key={`road-${z}`} position={[0, 0.04, z]} rotation-x={-Math.PI / 2}><planeGeometry args={[110, 3.8]} /><meshStandardMaterial color="#17232b" roughness={1} /></mesh>)}
    {city.blocks.filter(b => b.kind === 'void').map(b => <group key={b.id} position={[b.x, 0, b.z]}><mesh rotation-x={-Math.PI / 2}><circleGeometry args={[7.3, 32]} /><meshStandardMaterial color="#527271" roughness={1} /></mesh><mesh position={[0, .25, 0]}><cylinderGeometry args={[1.5, 2.4, .5, 12]} /><meshStandardMaterial color="#d5b878" /></mesh></group>)}
    {city.buildings.map(b => <group key={b.id} position={[b.x, b.height / 2, b.z]}><mesh castShadow receiveShadow><boxGeometry args={[b.width, b.height, b.depth]} /><meshStandardMaterial color={new Color().setHSL(.54 + b.tone * .06, .33, .38 + b.tone * .12)} roughness={.68} metalness={.15} /></mesh>{time !== 'day' && <mesh position={[0, 0, b.depth / 2 + .012]}><planeGeometry args={[b.width * .6, b.height * .66]} /><meshBasicMaterial color={p.window} transparent opacity={.5} /></mesh>}</group>)}
    <Megastructure time={time} />
    <group position={[0, 8.6, -30]}><mesh><boxGeometry args={[72, .5, 1]} /><meshStandardMaterial color="#667b87" metalness={.7} roughness={.35} /></mesh><mesh ref={train} position={[0, 1.0, 0]}><boxGeometry args={[8, 1.4, 1.8]} /><meshStandardMaterial color="#d2aa76" metalness={.55} roughness={.28} /></mesh></group>
    <group ref={rotor} position={[0, 29, 7]}><mesh><torusGeometry args={[3.4, .25, 10, 32]} /><meshStandardMaterial color="#e3be7f" emissive="#b26835" emissiveIntensity={time === 'night' ? 1.5 : .3} /></mesh></group>
  </>
}

function Megastructure({ time }: { time: TimeOfDay }) {
  const glow = time === 'night' ? '#df9b62' : '#5e8390'
  return <group position={[0, 0, 9]}>
    <mesh position={[-9, 13, 0]} castShadow><boxGeometry args={[6, 26, 8]} /><meshStandardMaterial color="#34535b" roughness={.5} metalness={.35} /></mesh>
    <mesh position={[9, 13, 0]} castShadow><boxGeometry args={[6, 26, 8]} /><meshStandardMaterial color="#34535b" roughness={.5} metalness={.35} /></mesh>
    <mesh position={[0, 22, 0]} castShadow><boxGeometry args={[25, 5, 9]} /><meshStandardMaterial color="#456c72" roughness={.42} metalness={.35} /></mesh>
    <mesh position={[0, 11.5, 0]}><boxGeometry args={[12, 23, 9.2]} /><meshStandardMaterial color="#172b32" /></mesh>
    <mesh position={[0, 24.7, 0]}><boxGeometry args={[29, .35, 10]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={time === 'night' ? 1.3 : .12} /></mesh>
    <mesh position={[-14, 17, 0]} rotation-z={-.18} castShadow><boxGeometry args={[17, 3, 7]} /><meshStandardMaterial color="#527d7b" metalness={.4} roughness={.48} /></mesh>
  </group>
}

function Metrics({ time }: { time: TimeOfDay }) {
  const { gl } = useThree()
  const [metrics, setMetrics] = useState({ fps: 0, calls: 0, triangles: 0 })
  const accumulator = useRef({ elapsed: 0, frames: 0 })
  useFrame((_, delta) => { const a = accumulator.current; a.elapsed += delta; a.frames++; if (a.elapsed > 1) { const info = (gl as WebGLRenderer).info.render; setMetrics({ fps: Math.round(a.frames / a.elapsed), calls: info.calls, triangles: info.triangles }); a.elapsed = 0; a.frames = 0 } })
  return <Html className="metrics" fullscreen><span>{time.toUpperCase()}</span><span>{metrics.fps} FPS · {metrics.fps ? (1000 / metrics.fps).toFixed(1) : '—'} ms</span><span>{metrics.calls} draws · {metrics.triangles.toLocaleString()} tris</span></Html>
}

function CameraDirector({ mode }: { mode: 'overview' | 'mega' }) {
  const { camera } = useThree()
  useEffect(() => { const position = mode === 'overview' ? [56, 44, 66] : [39, 25, 41]; camera.position.set(position[0], position[1], position[2]); camera.lookAt(0, mode === 'overview' ? 10 : 15, mode === 'overview' ? 0 : 9); camera.updateProjectionMatrix() }, [camera, mode])
  return null
}

function Scene({ time, mode }: { time: TimeOfDay; mode: 'overview' | 'mega' }) { return <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}><PerspectiveCamera makeDefault fov={46} /><CameraDirector mode={mode} /><City time={time} /><OrbitControls target={[0, mode === 'overview' ? 10 : 15, mode === 'overview' ? 0 : 9]} maxPolarAngle={Math.PI / 2.05} /><Metrics time={time} /></Canvas> }

export function App() { const [time, setTime] = useState<TimeOfDay>('sunset'); const [mode, setMode] = useState<'overview' | 'mega'>('overview'); const cameraText = mode === 'overview' ? 'Overview — primary axis / voids / secondary peaks' : 'Mega Showcase — span / void / scale reference'; return <main><header><div><p className="eyebrow">STABLE CITY / PHASE 1</p><h1>Atlas Gate</h1><p className="subtitle">Deterministic seed 240319 · 16 blocks · {city.buildings.length} ordinary buildings</p></div><div className="controls">{(['day','sunset','night'] as TimeOfDay[]).map(t => <button className={time === t ? 'active' : ''} onClick={() => setTime(t)} key={t}>{t}</button>)}</div></header><section className="viewport"><Scene time={time} mode={mode} /><div className="director"><button className={mode === 'overview' ? 'active' : ''} onClick={() => setMode('overview')}>Overview</button><button className={mode === 'mega' ? 'active' : ''} onClick={() => setMode('mega')}>Mega Showcase</button><p>{cameraText}</p></div></section><footer><span>Cosmic order · Machine spine · Organism density</span><span>Theme OFF: base city remains legible</span></footer></main> }
