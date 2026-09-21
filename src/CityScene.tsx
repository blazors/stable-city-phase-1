import { addAfterEffect, Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraShake, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D, type Group, type ShaderMaterial } from 'three'
import { createStableCity, type TimeOfDay } from './city'
import { themeSpecs, type ThemeName } from './theme'
import { generateMetropolis } from './metropolis'

const city = createStableCity()
const metropolis = generateMetropolis(city.seed)
type Vec3 = [number, number, number]
type Box = { position: Vec3; size: Vec3; color?: string }
export type RenderMetrics = { fps: number; frameMs: number; calls: number; triangles: number }
export type QualityPreset = 'auto' | 'high' | 'balanced' | 'low'
const qualityConfig: Record<QualityPreset, { detail: number; traffic: number; dpr: [number, number] }> = {
  auto: { detail: 1, traffic: 16, dpr: [1, 1.5] },
  high: { detail: 1, traffic: 16, dpr: [1, 2] },
  balanced: { detail: .72, traffic: 10, dpr: [1, 1.25] },
  low: { detail: .45, traffic: 6, dpr: [1, 1] },
}
const palettes = {
  day: { sky: '#b5cbd0', water: '#527b82', sun: '#fff1d2', ambient: '#c1d9e2', power: 3.2 },
  sunset: { sky: '#a7b2c3', water: '#3d697c', sun: '#ffbb77', ambient: '#8eaacb', power: 4.3 },
  night: { sky: '#182b43', water: '#183342', sun: '#94bded', ambient: '#7898bc', power: 1.3 },
}

// Shared geometry/material batches keep architectural detail inexpensive.
function Boxes({ items, color = '#ffffff', glow = false, night = false, foliage = false }: { items: Box[]; color?: string; glow?: boolean; night?: boolean; foliage?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    items.forEach((item, i) => {
      object.position.set(...item.position)
      object.scale.set(...item.size)
      object.updateMatrix()
      ref.current!.setMatrixAt(i, object.matrix)
      ref.current!.setColorAt(i, new Color(item.color ?? '#ffffff'))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={!glow} receiveShadow={!glow}>
    {foliage ? <icosahedronGeometry args={[.65, 1]} /> : <boxGeometry />}
    <meshStandardMaterial color={color} roughness={glow ? .45 : .82} metalness={glow ? .15 : .04} emissive={glow ? color : '#000000'} emissiveIntensity={glow ? (night ? 1.8 : .08) : 0} />
  </instancedMesh>
}

function Architecture({ theme, night, detail }: { theme: ThemeName | null; night: boolean; detail: number }) {
  const { masses, trim, glass, windows, landscape } = useMemo(() => {
    const primary = theme ? themeSpecs[theme].primary : '#536d72'
    const masses: Box[] = [], trim: Box[] = [], glass: Box[] = [], windows: Box[] = [], landscape: Box[] = []
    city.buildings.forEach((b, index) => {
      const color = new Color(primary).lerp(new Color(b.tone > .55 ? '#d5cfb6' : '#273e4c'), b.tone > .55 ? .56 : .23).getStyle()
      masses.push({ position: [b.x, b.height / 2, b.z], size: [b.width, b.height, b.depth], color })
      trim.push({ position: [b.x, .35, b.z], size: [b.width + .6, .7, b.depth + .6] })
      trim.push({ position: [b.x, b.height + .16, b.z], size: [b.width + .22, .32, b.depth + .22] })
      masses.push({ position: [b.x, b.height + .7, b.z], size: [b.width * .57, 1.1, b.depth * .58], color })
      for (let y = 1.6; y < b.height - .7; y += detail > .8 ? 1.65 : detail > .55 ? 2.15 : 3.1) {
        glass.push({ position: [b.x, y, b.z], size: [b.width + .025, .52, b.depth + .025] })
        if ((Math.floor(y) + index) % 3 !== 0) {
          windows.push({ position: [b.x + b.width * .19, y, b.z - b.depth / 2 - .025], size: [b.width * .25, .29, .035] })
          windows.push({ position: [b.x + b.width / 2 + .025, y, b.z - b.depth * .18], size: [.035, .29, b.depth * .3] })
        }
      }
      // Vertical stone fins break the horizontal bands without changing base mass.
      if (detail > .55) for (const offset of [-.32, .32]) trim.push({ position: [b.x + b.width * offset, b.height / 2, b.z], size: [.16, b.height, b.depth + .11] })
    })
    for (const block of city.blocks.filter(b => b.kind === 'void')) {
      trim.push({ position: [block.x, .12, block.z], size: [14, .24, 14] })
      glass.push({ position: [block.x, .28, block.z], size: [8, .12, 9] })
      for (const x of [-5.8, 5.8]) for (const z of [-5, 0, 5]) {
        masses.push({ position: [block.x + x, 1, block.z + z], size: [.25, 2, .25], color: '#6b6954' })
        landscape.push({ position: [block.x + x, 2.5, block.z + z], size: [2.1, 2.2, 2.1], color: z === 0 ? '#7c937e' : '#4c7267' })
      }
    }
    return { masses, trim, glass, windows, landscape }
  }, [theme, detail])
  return <><Boxes items={masses} /><Boxes items={trim} color="#8b9d95" /><Boxes items={glass} color="#405e67" /><Boxes items={landscape} /><Boxes items={windows} color={night ? '#f2c17e' : '#687f82'} glow night={night} /></>
}

function Megastructure({ accent, night }: { accent: string; night: boolean }) {
  const rotor = useRef<Group>(null)
  useFrame((_, delta) => { if (rotor.current) rotor.current.rotation.y += delta * .13 })
  const ribs = useMemo(() => {
    const result: Box[] = []
    for (const x of [-9, 9]) {
      for (const dx of [-2.4, -1.2, 0, 1.2, 2.4]) result.push({ position: [x + dx, 13, 4.82], size: [.28, 26, .55] })
      for (const z of [6, 8, 10, 12]) result.push({ position: [x + (x > 0 ? 3.12 : -3.12), 13, z], size: [.3, 26, .26] })
    }
    for (let x = -13; x <= 13; x += 1.3) result.push({ position: [x, 26, 9], size: [.28, 2.2, 10.5] })
    return result
  }, [])
  return <>
    <Boxes color="#d4ccb1" items={[
      { position: [-9, 13, 9], size: [6, 26, 8] }, { position: [9, 13, 9], size: [6, 26, 8] },
      { position: [0, 22, 9], size: [25, 5, 9] },
      { position: [-9, 1, 9], size: [8, 2, 10] }, { position: [9, 1, 9], size: [8, 2, 10] },
    ]} />
    <Boxes color="#e2dac3" items={ribs} />
    <Boxes color="#2e525a" items={[
      { position: [-5.93, 10.5, 9], size: [.12, 18, 7] }, { position: [5.93, 10.5, 9], size: [.12, 18, 7] },
      { position: [0, 21.5, 4.45], size: [23, 1.8, .16] }, { position: [0, 25.5, 9], size: [25, 1.5, 8] },
    ]} />
    <Boxes color={accent} glow night={night} items={[
      { position: [0, 24.7, 9], size: [29, .35, 10] },
      { position: [-5.83, 11, 5.5], size: [.12, 17, .15] }, { position: [5.83, 11, 5.5], size: [.12, 17, .15] },
      { position: [0, 19.4, 5.5], size: [11.5, .13, .15] },
    ]} />
    <mesh position={[-14, 17, 9]} rotation-z={-.18} castShadow receiveShadow><boxGeometry args={[17, 3, 7]} /><meshStandardMaterial color="#607b7a" roughness={.7} /></mesh>
    <Boxes color="#b8bca9" items={[{ position: [-21, 9, 9], size: [1, 15, 1] }, { position: [-14, 18.5, 9], size: [16, .18, 6] }]} />
    <group position={[0, 27.8, 9]} ref={rotor}>
      <mesh rotation-x={Math.PI / 2} castShadow><torusGeometry args={[2.7, .17, 8, 40]} /><meshStandardMaterial color={accent} roughness={.5} metalness={.4} /></mesh>
      <Boxes color={accent} items={[{ position: [0, 0, 0], size: [5.5, .18, .18] }, { position: [0, 0, 0], size: [.18, .18, 5.5] }]} />
    </group>
  </>
}

function Water({ color, night }: { color: string; night: boolean }) {
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new Color(color) }, uHaze: { value: new Color(night ? '#182b43' : '#a7b2c3') }, uNight: { value: night ? 1 : 0 } }), [color, night])
  useFrame(({ clock }) => { if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime })
  return <mesh position={[0, -1.85, 0]} rotation-x={-Math.PI / 2}>
    <planeGeometry args={[2000, 2000]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={`varying vec3 world;
      void main(){ world=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0); }`}
      fragmentShader={`varying vec3 world; uniform float uTime; uniform float uNight; uniform vec3 uColor; uniform vec3 uHaze;
      void main(){
        float ripple=sin(world.x*.38+sin(world.z*.3)+uTime*.4)*sin(world.z*.8-uTime*.3);
        float riverCenter=65.0+sin(world.x/56.0)*11.0;
        float extent=1.0-smoothstep(142.0,153.0,abs(world.x));
        float shore=exp(-abs(abs(world.z-riverCenter)-11.5)*.5)*extent;
        float broken=pow(max(0.0,sin(world.x*.8+sin(world.z*1.1)+uTime*.4)),6.0);
        float glint=pow(max(0.0,ripple),14.0);
        float channel=(1.0-smoothstep(10.0,14.0,abs(world.z-riverCenter)))*extent;
        vec3 water=uColor*(.83+.04*ripple*channel);
        water+=vec3(.65,.39,.14)*shore*broken*(.08+uNight*.18);
        water+=vec3(.19,.29,.34)*glint*.04*channel;
        gl_FragColor=vec4(mix(water,uHaze,smoothstep(270.0,680.0,distance(cameraPosition,world))),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} />
  </mesh>
}

function Ground({ water, night }: { water: string; night: boolean }) {
  const details = useMemo(() => {
    const paving: Box[] = [], road: Box[] = [], markings: Box[] = [], lamps: Box[] = [], supports: Box[] = []
    // Streets occupy gaps between immutable parcels, not the building centers.
    for (const v of [-36, -18, 0, 18, 36]) {
      road.push({ position: [v, .025, 0], size: [v === 0 ? 4.6 : 3, .05, 78] })
      road.push({ position: [0, .035, v], size: [78, .05, 3] })
      for (let p = -37; p < 39; p += 4) {
        if (Math.abs(p % 18) < 3) continue
        markings.push({ position: [v, .075, p], size: [.08, .025, 1.4] })
        markings.push({ position: [p, .085, v], size: [1.4, .025, .08] })
      }
    }
    for (const side of [-1, 1]) {
      paving.push({ position: [side * 40, .15, 0], size: [2, .3, 82] })
      paving.push({ position: [0, .15, side * 40], size: [82, .3, 2] })
      for (let p = -36; p <= 36; p += 6) {
        supports.push({ position: [p, 1.1, side * 39], size: [.12, 2.2, .12] })
        lamps.push({ position: [p, 2.2, side * 39], size: [.3, .18, .3] })
      }
    }
    for (let x = -36; x <= 36; x += 9) supports.push({ position: [x, 4.25, -30], size: [.6, 8.5, .6] })
    return { paving, road, markings, lamps, supports }
  }, [])
  return <>
    <Water color={water} night={night} />
    {/* Keep the structural slab below the paving surface to avoid coplanar depth fighting. */}
    <Boxes color="#4e6668" items={[{ position: [0, -1.2, 0], size: [83, 2.3, 83] }]} />
    <Boxes color="#788a83" items={[{ position: [0, -.12, 0], size: [81, .24, 81] }, ...details.paving]} />
    <Boxes color="#3e5359" items={details.road} />
    <Boxes color="#abb9ac" items={details.markings} />
    <Boxes color="#738c87" items={details.supports} />
    <Boxes color="#f2c17e" items={details.lamps} glow night={night} />
    <Boxes color="#b1b5a3" items={[{ position: [0, 8.6, -30], size: [76, .5, 2.5] }]} />
    <Boxes color="#3a545b" items={[{ position: [0, 8.9, -30], size: [76, .12, 1.8] }]} />
  </>
}

function MetropolitanLandscape({ night }: { night: boolean }) {
  return <>
    <Boxes items={metropolis.land} color="#778782" />
    <Boxes items={metropolis.parks} color="#526f56" />
    <Boxes items={metropolis.paths} color="#a9ac96" />
    <Boxes items={metropolis.roads} color="#485f65" />
    <Boxes items={metropolis.buildings} />
    <Boxes items={metropolis.roofs} color="#8a9c97" />
    <Boxes items={metropolis.terraces} />
    <Boxes items={metropolis.trees} foliage />
    <Boxes items={metropolis.windows} color={night ? '#eabb7a' : '#496876'} glow night={night} />
    <Boxes items={metropolis.lights} color="#e9b779" glow night={night} />
    {metropolis.bridges.map(({ x, z }) => <group key={x} position={[x, 0, z]}>
      <Boxes color="#b4b6a9" items={[{ position: [0, .65, 0], size: [5, 1, 32] }, ...[-9, 9].map(v => ({ position: [0, -1, v] as Vec3, size: [3, 3, 1] as Vec3 }))]} />
      <Boxes color="#f0c78e" glow night={night} items={[-2.4, 2.4].map(v => ({ position: [v, 1.4, 0], size: [.13, .2, 32] }))} />
      {[-2.3, 2.3].map(v => <mesh key={v} position={[v, 1, 0]} rotation-y={Math.PI / 2} scale={[1, .45, 1]}><torusGeometry args={[13, .24, 6, 40, Math.PI]} /><meshStandardMaterial color="#a8c4c3" roughness={.6} /></mesh>)}
    </group>)}
    {night && <><pointLight position={[0, 8, 2]} color="#ffd098" intensity={450} distance={48} decay={2} /><pointLight position={[-11, 16, 2]} color="#ffb86d" intensity={180} distance={28} decay={2} /></>}
  </>
}

function Transport({ night, count }: { night: boolean; count: number }) {
  const train = useRef<Group>(null)
  const traffic = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (train.current) train.current.position.x = Math.sin(t * .12) * 31
    if (!traffic.current) return
    for (let i = 0; i < count; i++) {
      const direction = i % 2 ? 1 : -1
      const p = ((t * (2.2 + i % 3 * .3) + i * 11) % 74 - 37) * direction
      dummy.position.set(p, .45, (i < 8 ? -18 : 36) + direction * .65)
      dummy.scale.set(1.4, .55, .65)
      dummy.updateMatrix()
      traffic.current.setMatrixAt(i, dummy.matrix)
    }
    traffic.current.instanceMatrix.needsUpdate = true
  })
  return <>
    <group ref={train} position={[0, 9.45, -30]}>
      <Boxes color="#ddd2b0" items={[-2.8, 0, 2.8].map(x => ({ position: [x, 0, 0], size: [2.6, 1, 1.5] }))} />
      <Boxes color={night ? '#f2c17e' : '#2e535f'} glow night={night} items={[-2.8, 0, 2.8].map(x => ({ position: [x, .12, -.76], size: [2.1, .37, .025] }))} />
    </group>
    <instancedMesh ref={traffic} args={[undefined, undefined, count]} frustumCulled={false} castShadow><boxGeometry /><meshStandardMaterial color="#d4bc92" roughness={.65} emissive="#b58241" emissiveIntensity={night ? .5 : 0} /></instancedMesh>
  </>
}

function CameraDirector({ mode }: { mode: 'overview' | 'mega' }) {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    const position: Vec3 = mode === 'overview' ? [-210, 174, -242] : [-18, 18, -20]
    const fit = Math.max(1, 1.35 / (size.width / size.height))
    camera.position.set(position[0] * fit, position[1] * fit, position[2] * fit)
    camera.lookAt(0, mode === 'overview' ? 0 : 13, mode === 'overview' ? 24 : 9)
    camera.updateProjectionMatrix()
  }, [camera, mode, size.width, size.height])
  return null
}

function Metrics({ startedAt, onReady, onUpdate }: { startedAt: number; onReady: (ms: number) => void; onUpdate: (metrics: RenderMetrics) => void }) {
  const { gl } = useThree()
  const ready = useRef(false)
  useEffect(() => {
    let last = performance.now(), elapsed = 0, frames = 0, renderedFrame = -1
    return addAfterEffect(() => {
      const now = performance.now()
      if (gl.info.render.frame === renderedFrame) return
      renderedFrame = gl.info.render.frame
      if (!ready.current) { ready.current = true; onReady(Math.round(now - startedAt)); last = now; return }
      const delta = now - last
      last = now
      if (document.hidden || delta > 250) { elapsed = 0; frames = 0; return }
      elapsed += delta; frames++
      if (elapsed >= 1000) {
        onUpdate({ fps: frames * 1000 / elapsed, frameMs: elapsed / frames, calls: gl.info.render.calls, triangles: gl.info.render.triangles })
        elapsed = 0; frames = 0
      }
    })
  }, [gl, onReady, onUpdate, startedAt])
  return null
}

function WebGLGuard({ onError }: { onError?: (message: string) => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const handleLost = (event: Event) => { event.preventDefault(); onError?.('WebGL context lost · 渲染上下文丢失') }
    canvas.addEventListener('webglcontextlost', handleLost)
    return () => canvas.removeEventListener('webglcontextlost', handleLost)
  }, [gl, onError])
  return null
}

export function Scene({ time, mode, theme, enabled, quality = 'auto', onUpdate, onReady, onError }: {
  time: TimeOfDay; mode: 'overview' | 'mega'; theme: ThemeName; enabled: boolean
  quality?: QualityPreset
  onUpdate: (metrics: RenderMetrics) => void; onReady: (ms: number) => void; onError?: (message: string) => void
}) {
  const startedAt = useRef(performance.now())
  const p = palettes[time], night = time === 'night', config = qualityConfig[quality]
  return <Canvas shadows dpr={config.dpr} gl={{ antialias: true }} fallback={<div className="scene-fallback" role="alert"><strong>3D 场景暂不可用</strong><small>请降低渲染质量或刷新页面。</small></div>}>
    <color attach="background" args={[p.sky]} /><fog attach="fog" args={[p.sky, 270, 680]} />
    <PerspectiveCamera makeDefault fov={mode === 'overview' ? 40 : 56} near={.5} far={1000} />
    <CameraDirector mode={mode} />
    <hemisphereLight args={[p.ambient, '#384b53', night ? .85 : time === 'sunset' ? 1.3 : 2]} />
    <directionalLight position={[-35, 55, -28]} color={p.sun} intensity={p.power} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-65} shadow-camera-right={65} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-far={180} shadow-normalBias={.08} shadow-bias={-.00015} />
    <Ground water={p.water} night={night} /><Architecture theme={enabled ? theme : null} night={night} detail={config.detail} />
    <MetropolitanLandscape night={night} />
    <Megastructure accent={enabled ? themeSpecs[theme].accent : '#b1a286'} night={night} /><Transport night={night} count={config.traffic} />
    <OrbitControls makeDefault target={[0, mode === 'overview' ? 0 : 13, mode === 'overview' ? 24 : 9]} maxPolarAngle={Math.PI / 2.12} minDistance={25} maxDistance={600} enableDamping dampingFactor={.06} />
    {mode === 'overview' && <CameraShake intensity={.35} maxYaw={.025} maxPitch={.018} maxRoll={.006} yawFrequency={.07} pitchFrequency={.05} rollFrequency={.04} />}
    <WebGLGuard onError={onError} />
    <Metrics startedAt={startedAt.current} onUpdate={onUpdate} onReady={onReady} />
  </Canvas>
}
