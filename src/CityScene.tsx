import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D, type Group, type ShaderMaterial } from 'three'
import { createStableCity, type TimeOfDay } from './city'
import { themeSpecs, type ThemeName } from './theme'
import { generateMetropolis, riverReflectionSources, riverShader } from './metropolis'
import { Atmosphere, environmentPalette, sunDirection, type Weather } from './Atmosphere'
import { Rain, Snow } from './Precipitation'
import { LensWeather } from './LensWeather'
import { puddleBudgets, rainBudgets, rainPatches } from './rain'
import { snowBudgets, snowCaps, snowRoadEdges } from './snow'
import { cameraPosition, cameraViews, createSceneCamera, overviewDistanceOffset } from './camera'
import { megaPracticalPositions, sceneFog, timeLighting, weatherLighting } from './lighting'
import { createMegaRoofRibs, megaRoofDeck, megaRoofFascia } from './megaGeometry'
import { HeightFog } from './HeightFog'
import { heightFogBudgets, heightFogDensity, heightFogGLSL } from './heightFogModel'

const city = createStableCity()
const metropolis = generateMetropolis(city.seed)
const snowSurfaces = [
  ...snowCaps(city.buildings.map(b => ({ position: [b.x, b.height + .16, b.z] as Vec3, size: [b.width + .22, .32, b.depth + .22] as Vec3 }))),
  ...snowCaps(city.buildings.map(b => ({ position: [b.x, b.height + .7, b.z] as Vec3, size: [b.width * .57, 1.1, b.depth * .58] as Vec3 }))),
  ...snowCaps(metropolis.roofs), ...snowCaps(metropolis.parks),
  ...snowRoadEdges(metropolis.roads),
  ...snowCaps([megaRoofDeck, ...createMegaRoofRibs()]),
  ...snowCaps(city.blocks.filter(b => b.kind === 'void').map(b => ({ position: [b.x, .12, b.z] as Vec3, size: [14, .24, 14] as Vec3 }))),
  ...snowRoadEdges([-36, -18, 0, 18, 36].flatMap(v => [
    { position: [v, .025, 0] as Vec3, size: [v === 0 ? 4.6 : 3, .05, 78] as Vec3 },
    { position: [0, .035, v] as Vec3, size: [78, .05, 3] as Vec3 },
  ])),
]
export const metropolitanBuildingCount = metropolis.buildings.length
type Vec3 = [number, number, number]
type Box = { position: Vec3; size: Vec3; color?: string; tower?: boolean }
export type RenderMetrics = { fps: number; frameMs: number; calls: number; triangles: number; validFrames: number; sampleDurationMs: number; configRevision: number }
type CanvasMetrics = Omit<RenderMetrics, 'configRevision'>
export type QualityPreset = 'auto' | 'high' | 'balanced' | 'low'
export const waterWaveBudgets: Record<QualityPreset, number> = { auto: 3, high: 3, balanced: 2, low: 1 }
export const renderQualityBudgets: Record<QualityPreset, { dpr: [number, number]; shadowMapSize: number }> = {
  auto: { dpr: [1, 1.5], shadowMapSize: 1024 },
  high: { dpr: [1, 2], shadowMapSize: 2048 },
  balanced: { dpr: [1, 1.25], shadowMapSize: 1024 },
  low: { dpr: [1, 1], shadowMapSize: 512 },
}
const qualityConfig: Record<QualityPreset, { detail: number; traffic: number; waterLayers: number }> = {
  auto: { detail: 1, traffic: 16, waterLayers: waterWaveBudgets.auto },
  high: { detail: 1, traffic: 16, waterLayers: waterWaveBudgets.high },
  balanced: { detail: .72, traffic: 10, waterLayers: waterWaveBudgets.balanced },
  low: { detail: .45, traffic: 6, waterLayers: waterWaveBudgets.low },
}

// Shared geometry/material batches keep architectural detail inexpensive.
function Boxes({ items, color = '#ffffff', glow = false, night = false, foliage = false, wet = false, roughness, metalness, emissive, emissiveIntensity }: { items: Box[]; color?: string; glow?: boolean; night?: boolean; foliage?: boolean; wet?: boolean; roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number }) {
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
    <meshStandardMaterial color={color} roughness={roughness ?? (glow ? .45 : wet ? .22 : .82)} metalness={metalness ?? (glow ? .15 : wet ? .10 : .04)} emissive={emissive ?? (glow ? color : '#000000')} emissiveIntensity={emissiveIntensity ?? (glow ? (night ? 1.8 : .08) : 0)} />
  </instancedMesh>
}

function SnowSurfaces({ items, color }: { items: Box[]; color: string }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    items.forEach((item, i) => {
      object.position.set(...item.position)
      object.rotation.set(-Math.PI / 2, 0, 0)
      object.scale.set(item.size[0], item.size[2], 1)
      object.updateMatrix()
      ref.current!.setMatrixAt(i, object.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>
    <planeGeometry />
    <meshStandardMaterial color={color} roughness={.94} metalness={0} />
  </instancedMesh>
}

function Architecture({ theme, night, detail }: { theme: ThemeName | null; night: boolean; detail: number }) {
  const { masses, trim, glass, windows, landscape } = useMemo(() => {
    const primary = theme ? themeSpecs[theme].primary : '#536d72'
    const spec = theme ? themeSpecs[theme] : null
    const masses: Box[] = [], trim: Box[] = [], glass: Box[] = [], windows: Box[] = [], landscape: Box[] = []
    city.buildings.forEach((b, index) => {
      const color = spec
        ? (b.tone > .55 ? spec.bodyLight : spec.bodyDark)
        : new Color(primary).lerp(new Color(b.tone > .55 ? '#d5cfb6' : '#273e4c'), b.tone > .55 ? .56 : .23).getStyle()
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
        landscape.push({ position: [block.x + x, 2.5, block.z + z], size: [2.1, 2.2, 2.1], color: spec ? spec.foliage : (z === 0 ? '#7c937e' : '#4c7267') })
      }
    }
    return { masses, trim, glass, windows, landscape }
  }, [theme, detail])
  const response = theme ? themeSpecs[theme].materialResponse : null
  return <><Boxes items={masses} roughness={response?.coreBody.roughness} metalness={response?.coreBody.metalness} /><Boxes items={trim} color={theme ? themeSpecs[theme].trim : '#8b9d95'} roughness={response?.coreTrim.roughness} metalness={response?.coreTrim.metalness} /><Boxes items={glass} color={theme ? themeSpecs[theme].glass : '#405e67'} roughness={response?.coreGlass.roughness} metalness={response?.coreGlass.metalness} /><Boxes items={landscape} /><Boxes items={windows} color={night ? '#f2c17e' : '#687f82'} emissive={theme ? themeSpecs[theme].emission : undefined} emissiveIntensity={night ? 1.4 : .08} glow night={night} /></>
}

const themeMix = .25
function tintSeededItems(items: Box[], target: string, fallback: string): Box[] {
  const targetColor = new Color(target), targetHsl = targetColor.getHSL({ h: 0, s: 0, l: 0 })
  return items.map(item => {
    const color = new Color(item.color ?? fallback), hsl = color.getHSL({ h: 0, s: 0, l: 0 })
    const hueDelta = ((targetHsl.h - hsl.h + 1.5) % 1) - .5
    color.setHSL((hsl.h + hueDelta * themeMix + 1) % 1, hsl.s + (targetHsl.s - hsl.s) * themeMix, hsl.l)
    return { ...item, color: color.getStyle() }
  })
}

function MegaPracticalHalo({ accent, time, quality }: { accent: string; time: TimeOfDay; quality: QualityPreset }) {
  const ref = useRef<InstancedMesh>(null)
  const uniforms = useMemo(() => ({ uColor: { value: new Color(accent) }, uOpacity: { value: time === 'night' ? .24 : .065 } }), [accent, time])
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    megaPracticalPositions.forEach((position, index) => {
      object.position.set(position[0], position[1], position[2] + .12)
      object.updateMatrix()
      ref.current!.setMatrixAt(index, object.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [])
  if (time === 'day' || quality === 'low') return null
  return <instancedMesh ref={ref} args={[undefined, undefined, megaPracticalPositions.length]} frustumCulled={false} raycast={() => null}>
    <planeGeometry args={[2.4, 16.4]} />
    <shaderMaterial uniforms={uniforms} transparent depthTest depthWrite={false} vertexShader={`varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }`}
      fragmentShader={`varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity;
      void main(){ vec2 p=vUv-.5; float edge=1.0-smoothstep(.18,.52,length(vec2(p.x*.95,p.y*.62))); float vertical=smoothstep(.03,.18,vUv.y)*(1.0-smoothstep(.82,.97,vUv.y)); gl_FragColor=vec4(uColor,edge*vertical*uOpacity); }`} />
  </instancedMesh>
}

function Megastructure({ accent, theme, night, sunset, quality, time }: { accent: string; theme: ThemeName | null; night: boolean; sunset: boolean; quality: QualityPreset; time: TimeOfDay }) {
  const rotor = useRef<Group>(null)
  useFrame((_, delta) => { if (rotor.current) rotor.current.rotation.y += delta * .13 })
  const ribs = useMemo(() => {
    const result: Box[] = []
    for (const x of [-9, 9]) {
      for (const dx of [-2.4, -1.2, 0, 1.2, 2.4]) result.push({ position: [x + dx, 13, 4.82], size: [.28, 26, .55] })
      for (const z of [6, 8, 10, 12]) result.push({ position: [x + (x > 0 ? 3.12 : -3.12), 13, z], size: [.3, 26, .26] })
    }
    result.push(...createMegaRoofRibs())
    return result
  }, [])
  const spec = theme ? themeSpecs[theme] : null
  return <>
    <Boxes color={spec?.megaBody ?? '#d4ccb1'} roughness={spec?.materialResponse.megaBody.roughness ?? .82} metalness={spec?.materialResponse.megaBody.metalness ?? .04} items={[
      { position: [-9, 13, 9], size: [6, 26, 8] }, { position: [9, 13, 9], size: [6, 26, 8] },
      { position: [0, 22, 9], size: [25, 5, 9] },
      { position: [-9, 1, 9], size: [8, 2, 10] }, { position: [9, 1, 9], size: [8, 2, 10] },
    ]} />
    <Boxes color={spec?.trim ?? '#e2dac3'} roughness={spec?.materialResponse.megaRibs.roughness ?? .82} metalness={spec?.materialResponse.megaRibs.metalness ?? .04} items={ribs} />
    <Boxes color={spec?.megaInset ?? '#2e525a'} roughness={spec?.materialResponse.megaInset.roughness ?? .82} metalness={spec?.materialResponse.megaInset.metalness ?? .04} items={[
      { position: [-5.93, 10.5, 9], size: [.12, 18, 7] }, { position: [5.93, 10.5, 9], size: [.12, 18, 7] },
      { position: [0, 21.5, 4.45], size: [23, 1.8, .16] }, megaRoofDeck,
    ]} />
    <Boxes color={accent} emissive={accent} glow night={night} items={[
      megaRoofFascia,
      ...megaPracticalPositions.map(position => ({ position, size: [.12, 17, .15] as Vec3 })),
      { position: [0, 19.4, 5.5], size: [11.5, .13, .15] },
    ]} />
    <mesh position={[-14, 17, 9]} rotation-z={-.18} castShadow receiveShadow><boxGeometry args={[17, 3, 7]} /><meshStandardMaterial color={spec?.megaBody ?? '#607b7a'} roughness={.7} /></mesh>
    <Boxes color={spec?.trim ?? '#b8bca9'} items={[{ position: [-21, 9, 9], size: [1, 15, 1] }, { position: [-14, 18.5, 9], size: [16, .18, 6] }]} />
    {night && megaPracticalPositions.map(position => <pointLight key={position[0]} position={position} color={accent} intensity={28} distance={16} decay={2} />)}
    <MegaPracticalHalo accent={accent} time={sunset ? 'sunset' : time} quality={quality} />
    <group position={[0, 27.8, 9]} ref={rotor}>
      <mesh rotation-x={Math.PI / 2} castShadow><torusGeometry args={[2.7, .17, 8, 40]} /><meshStandardMaterial color={accent} roughness={.5} metalness={.4} /></mesh>
      <Boxes color={accent} items={[{ position: [0, 0, 0], size: [5.5, .18, .18] }, { position: [0, 0, 0], size: [.18, .18, 5.5] }]} />
    </group>
  </>
}

function Water({ time, weather, mode, quality }: { time: TimeOfDay; weather: Weather; mode: 'overview' | 'mega'; quality: QualityPreset }) {
  const overviewOffset = mode === 'overview' ? overviewDistanceOffset() : 0
  const reflectionWeights = [.38, .68, .28, .52, .32] as const
  const reflectionAnchors = riverReflectionSources.map((x, index) => `reflection+=anchorReflection(world,${x.toFixed(1)},${reflectionWeights[index].toFixed(2)});`).join('\n')
  const material = useRef<ShaderMaterial>(null)
  const elapsed = useRef(0), motion = useRef(true)
  const uniforms = useMemo(() => {
    const p = environmentPalette(time, weather)
      return { uTime: { value: 0 }, uColor: { value: new Color(p.water) }, uHaze: { value: new Color(p.horizon) }, uNight: { value: time === 'night' ? 1 : 0 }, uReflectionTier: { value: time === 'night' ? 1 : time === 'sunset' ? .42 : .12 }, uReflectionWeather: { value: weather === 'snow' ? 0 : weather === 'rain' ? .42 : weather === 'haze' ? .55 : 1 }, uSun: { value: sunDirection(time) }, uSunColor: { value: new Color(p.sun) }, uRain: { value: weather === 'rain' ? 1 : 0 }, uIce: { value: weather === 'snow' ? 1 : 0 }, uReflection: { value: weather === 'snow' ? .15 : weather === 'rain' ? .22 : weather === 'haze' ? .25 : .7 }, uWaveLayers: { value: waterWaveBudgets[quality] }, uHeightFogColor: { value: new Color(sceneFog(time, weather, p.haze, overviewOffset).color) }, uHeightFogDensity: { value: weather === 'haze' ? heightFogDensity(mode) : 0 }, uHeightFogDetail: { value: heightFogBudgets[quality] }, uHeightFogTime: { value: 0 } }
  }, [time, weather, mode, quality, overviewOffset])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { motion.current = !preference.matches }
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useFrame((_, delta) => {
    if (motion.current) elapsed.current += Math.min(delta, .05)
    if (material.current) {
      material.current.uniforms.uTime.value = elapsed.current
      material.current.uniforms.uHeightFogTime.value = elapsed.current
    }
  })
  return <mesh position={[0, -1.85, 0]} rotation-x={-Math.PI / 2}>
    <planeGeometry args={[20000, 20000]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={`varying vec3 world;
      void main(){ world=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0); }`}
      fragmentShader={`varying vec3 world; uniform float uTime; uniform float uNight; uniform float uReflectionTier; uniform float uReflectionWeather; uniform vec3 uColor; uniform vec3 uHaze; uniform vec3 uSun; uniform vec3 uSunColor; uniform float uReflection; uniform float uRain; uniform float uIce; uniform float uWaveLayers;
      ${riverShader}
      vec3 anchorReflection(vec3 point,float anchorX,float weight){
        float riverCenter=riverCenterAt(point.x);
        float width=riverWidthAt(point.x);
        float channel=1.0-smoothstep(width-2.0,width+2.0,abs(point.z-riverCenter));
        float anchor=exp(-pow((point.x-anchorX)/7.5,2.0));
        float warmBand=anchor*exp(-pow((point.x-anchorX)/2.6,2.0));
        float ripple=0.72+0.28*sin(point.z*.29+uTime*.8+anchorX*.07);
        vec3 warm=vec3(.839,.651,.431);
        vec3 cool=vec3(.345,.475,.549);
        vec3 coldBase=cool*anchor*channel*ripple*(.07+.045*uNight)*weight;
        vec3 warmCore=warm*warmBand*channel*ripple*(.035+.13*uNight)*weight;
        return coldBase+warmCore;
      }
      ${heightFogGLSL}
      float waveHeight(vec2 p, float scale, float speed, float amplitude, float time) {
        float a=dot(p,vec2(.92,.31))*scale+time*speed;
        float b=dot(p,vec2(-.36,.88))*scale*1.63-time*speed*.71;
        return sin(a)*amplitude+sin(b)*amplitude*.42;
      }
      vec2 waveGradient(vec2 p, float fineFade, float time) {
        vec2 g=vec2(0.0);
        float a=dot(p,vec2(.92,.31))*.16+time*.24;
        float b=dot(p,vec2(-.36,.88))*.26-time*.17;
        g+=vec2(.92,.31)*cos(a)*.16*.20+vec2(-.36,.88)*cos(b)*.26*.42*.20;
        if(uWaveLayers>1.5){
          float c=dot(p,vec2(.74,.67))*.56+time*.61;
          float d=dot(p,vec2(-.82,.27))*.83-time*.43;
          g+=fineFade*(vec2(.74,.67)*cos(c)*.56*.075+vec2(-.82,.27)*cos(d)*.83*.075*.38);
        }
        if(uWaveLayers>2.5){
          float e=dot(p,vec2(.37,.93))*1.72+time*1.12;
          float f=dot(p,vec2(-.97,.18))*2.38-time*.79;
          g+=fineFade*fineFade*(vec2(.37,.93)*cos(e)*1.72*.027+vec2(-.97,.18)*cos(f)*2.38*.027*.36);
        }
        return g;
      }
      void main(){
        float riverCenter=riverCenterAt(world.x);
        float riverWidth=riverWidthAt(world.x);
        float extent=1.0-smoothstep(250.0,261.0,abs(world.x));
        float shore=exp(-abs(abs(world.z-riverCenter)-riverWidth)*.5)*extent;
        float channel=(1.0-smoothstep(riverWidth-2.0,riverWidth+2.0,abs(world.z-riverCenter)))*extent;
        float freeze=channel*uIce;
        float distanceFade=1.0-smoothstep(120.0,620.0,distance(cameraPosition,world));
        float riverPhase=world.z-riverCenter;
        float swell=waveHeight(world.xz,.16,.24,.20,uTime);
        float riverRipple=waveHeight(vec2(world.x,riverPhase),.62,1.05,.075,uTime*1.0);
        riverRipple+=uRain*waveHeight(vec2(world.x*1.2,riverPhase*1.4),1.15,2.2,.035,uTime);
        float dynamicRiver=(1.0-freeze*.98);
        float ripple=swell*mix(1.0,dynamicRiver,channel)+riverRipple*channel*dynamicRiver;
        vec2 gradient=waveGradient(world.xz,distanceFade,uTime);
        gradient*=mix(1.0,dynamicRiver,channel);
        gradient+=channel*dynamicRiver*vec2(cos(world.x*.62+uTime)*.032,sin(riverPhase*1.2-uTime*.8)*.028);
        vec3 normal=normalize(vec3(-gradient.x,1.0,-gradient.y));
        float broken=pow(max(0.0,sin(world.x*.8+sin(world.z*1.1)+uTime*.4)),6.0)*dynamicRiver;
        float glint=pow(max(0.0,dot(reflect(-uSun,normal),normalize(cameraPosition-world))),18.0)*channel*dynamicRiver;
        vec3 water=uColor*(.83+.035*ripple);
        water+=vec3(.65,.39,.14)*shore*broken*(.025+uNight*.055);
        water+=vec3(.19,.29,.34)*glint*.04*channel;
        vec3 viewDirection=normalize(cameraPosition-world);
        float spec=pow(max(0.0,dot(reflect(-uSun,normal),viewDirection)),150.0);
        float shimmer=.4+.6*pow(max(0.0,sin(world.z*1.5+uTime*.6+sin(world.x*.9))),3.0)*dynamicRiver;
        spec*=1.0-freeze*.98;
        vec3 reflection=vec3(0.0);
        ${reflectionAnchors}
        reflection*=uReflectionWeather*dynamicRiver;
        water+=reflection*uReflectionTier;
        // Only the curved river channel becomes static ice; the surrounding 20000-unit water plane remains water.
        float iceGrain=.5+.5*sin(world.x*.23+sin(world.z*.11)*2.0)*sin(world.z*.31+world.x*.07);
        vec3 ice=mix(vec3(.30,.43,.49),vec3(.53,.64,.68),iceGrain);
        ice+=vec3(.04,.05,.055)*pow(max(0.0,sin(world.x*.67+world.z*.13)),18.0);
        water=mix(water,ice,freeze*.96);
        water+=uSunColor*spec*shimmer*uReflection;
        gl_FragColor=vec4(applyHeightFog(mix(water,uHaze,smoothstep(${(420 + overviewOffset).toFixed(1)},${(950 + overviewOffset).toFixed(1)},distance(cameraPosition,world))),world),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} />
  </mesh>
}

function Ground({ time, weather, mode, quality }: { time: TimeOfDay; weather: Weather; mode: 'overview' | 'mega'; quality: QualityPreset }) {
  const night = time === 'night'
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
  const roads = useMemo(() => [...details.road, ...metropolis.roads], [details])
  return <>
    <Water time={time} weather={weather} mode={mode} quality={quality} />
    {/* Keep the structural slab below the paving surface to avoid coplanar depth fighting. */}
    <Boxes color="#4e6668" items={[{ position: [0, -1.2, 0], size: [83, 2.3, 83] }]} />
    <Boxes color="#788a83" items={[{ position: [0, -.12, 0], size: [81, .24, 81] }, ...details.paving]} />
    <Boxes color={weather === 'rain' ? '#2e424b' : '#3e5359'} items={details.road} wet={weather === 'rain'} />
    {weather === 'rain' && <RainPuddles night={night} quality={quality} roads={roads} />}
    <Boxes color="#abb9ac" items={details.markings} />
    <Boxes color="#738c87" items={details.supports} />
    <Boxes color="#f2c17e" items={details.lamps} glow night={night} />
    <Boxes color="#b1b5a3" items={[{ position: [0, 8.6, -30], size: [76, .5, 2.5] }]} />
    <Boxes color="#3a545b" items={[{ position: [0, 8.9, -30], size: [76, .12, 1.8] }]} />
  </>
}

function RainPuddles({ night, quality, roads }: { night: boolean; quality: QualityPreset; roads: Box[] }) {
  const patches = useMemo(() => rainPatches(roads, puddleBudgets[quality]), [roads, quality])
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    patches.forEach((patch, i) => {
      object.position.set(...patch.position)
      object.rotation.set(-Math.PI / 2, 0, 0)
      object.scale.set(patch.size[0], patch.size[2], 1)
      object.updateMatrix()
      ref.current!.setMatrixAt(i, object.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [patches])
  return <instancedMesh ref={ref} args={[undefined, undefined, patches.length]} receiveShadow>
    <planeGeometry />
    <meshStandardMaterial color={night ? '#526e7a' : '#547582'} roughness={.16} metalness={.08} />
  </instancedMesh>
}

function MetropolitanLandscape({ theme, night, weather, quality }: { theme: ThemeName | null; night: boolean; weather: Weather; quality: QualityPreset }) {
  const themed = useMemo(() => {
    if (!theme) return null
    const spec = themeSpecs[theme]
    return {
      land: tintSeededItems(metropolis.land, spec.bodyDark, '#778782'),
      parks: tintSeededItems(metropolis.parks, spec.foliage, '#526f56'),
      paths: tintSeededItems(metropolis.paths, spec.trim, '#a9ac96'),
      visibleBodies: tintSeededItems(metropolis.visibleBodies, spec.bodyLight, '#ffffff'),
      upperMasses: tintSeededItems(metropolis.upperMasses, spec.bodyLight, '#ffffff'),
      facadePanels: tintSeededItems(metropolis.facadePanels, spec.glass, '#ffffff'),
      roofs: tintSeededItems(metropolis.roofs, spec.trim, '#8a9c97'),
      terraces: tintSeededItems(metropolis.terraces, spec.bodyDark, '#ffffff'),
      trees: tintSeededItems(metropolis.trees, spec.foliage, '#ffffff'),
    }
  }, [theme])
  const land = themed?.land ?? metropolis.land, parks = themed?.parks ?? metropolis.parks
  const paths = themed?.paths ?? metropolis.paths
  const visibleBodies = themed?.visibleBodies ?? metropolis.visibleBodies
  const upperMasses = themed?.upperMasses ?? metropolis.upperMasses
  const facadePanels = themed?.facadePanels ?? metropolis.facadePanels
  const roofs = themed?.roofs ?? metropolis.roofs, allTerraces = themed?.terraces ?? metropolis.terraces
  const allTrees = themed?.trees ?? metropolis.trees
  const pick = <T,>(items: T[], ratio: number) => items.slice(0, Math.ceil(items.length * ratio))
  const trees = quality === 'high' || quality === 'auto' ? allTrees : pick(allTrees, quality === 'balanced' ? .75 : .5)
  const windows = quality === 'high' || quality === 'auto' ? metropolis.windows : pick(metropolis.windows, quality === 'balanced' ? .6 : .3)
  const warmWindows = windows.filter(({ position: [, , z] }) => z <= 92)
  const coolWindows = windows.filter(({ position: [, , z] }) => z > 92)
  const lights = quality === 'high' || quality === 'auto' ? metropolis.lights : pick(metropolis.lights, quality === 'balanced' ? .75 : .5)
  const terraces = quality === 'low' ? allTerraces.filter(item => item.tower) : allTerraces
  return <>
    <Boxes items={land} color={theme ? '#ffffff' : '#778782'} />
    <Boxes items={parks} color={theme ? '#ffffff' : '#526f56'} />
    <Boxes items={paths} color={theme ? '#ffffff' : '#a9ac96'} />
    <Boxes items={metropolis.roads} color={weather === 'rain' ? '#304953' : '#485f65'} wet={weather === 'rain'} />
    <Boxes items={visibleBodies} roughness={.88} metalness={.02} />
    <Boxes items={upperMasses} roughness={.88} metalness={.02} />
    <Boxes items={facadePanels} roughness={.82} metalness={.04} />
    <Boxes items={roofs} color={theme ? '#ffffff' : '#8a9c97'} roughness={.90} metalness={.02} />
    <Boxes items={terraces} />
    <Boxes items={trees} foliage />
    <Boxes items={warmWindows} color={night ? '#eabb7a' : '#496876'} emissive={theme ? themeSpecs[theme].emission : undefined} emissiveIntensity={night ? .78 : .08} glow night={night} />
    <Boxes items={coolWindows} color={night ? '#607f91' : '#496876'} emissive={night ? '#58798c' : undefined} emissiveIntensity={night ? .12 : .04} glow night={night} />
    <Boxes items={lights} color="#e9b779" glow night={night} emissiveIntensity={night ? .65 : .06} />
    <Boxes items={metropolis.routeLights} color="#d6a66e" glow night={night} emissiveIntensity={night ? .55 : .025} />
    {metropolis.bridges.map(({ x, z, span }) => <group key={x} position={[x, 0, z]}>
      <Boxes color="#b4b6a9" items={[{ position: [0, .65, 0], size: [5, 1, span] }, ...[-1, 1].map(v => ({ position: [0, -1, v * (span / 2 - 5)] as Vec3, size: [3, 3, 1] as Vec3 }))]} />
      <Boxes color="#f0c78e" glow night={night} items={[-2.4, 2.4].map(v => ({ position: [v, 1.4, 0], size: [.13, .2, span] }))} />
      {[-2.3, 2.3].map(v => <mesh key={v} position={[v, 1, 0]} rotation-y={Math.PI / 2} scale={[1, .3, 1]}><torusGeometry args={[span / 2 - 2, .24, 6, 40, Math.PI]} /><meshStandardMaterial color="#a8c4c3" roughness={.6} /></mesh>)}
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
    camera.position.set(...cameraPosition(mode, size.width / size.height))
    camera.lookAt(...cameraViews[mode].target)
    camera.updateProjectionMatrix()
  }, [camera, mode, size.width, size.height])
  return null
}

function Metrics({ startedAt, onReady, onUpdate }: { startedAt: number; onReady: (ms: number) => void; onUpdate: (metrics: CanvasMetrics) => void }) {
  const { gl } = useThree()
  const ready = useRef(false)
  const sample = useRef({ elapsed: 0, frames: 0, warmupElapsed: 0, warmupFrames: 0, warmingUp: true, recoveringFromHidden: document.hidden })
  useEffect(() => {
    const handleVisibility = () => {
      sample.current = { elapsed: 0, frames: 0, warmupElapsed: 0, warmupFrames: 0, warmingUp: true, recoveringFromHidden: true }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])
  useEffect(() => { sample.current = { elapsed: 0, frames: 0, warmupElapsed: 0, warmupFrames: 0, warmingUp: true, recoveringFromHidden: true } }, [onUpdate])
  useFrame((_state, deltaSeconds) => {
      const now = performance.now()
      const current = sample.current
      if (!ready.current) { ready.current = true; onReady(Math.round(now - startedAt)); return }
      if (document.hidden) { current.recoveringFromHidden = true; current.elapsed = 0; current.frames = 0; current.warmupElapsed = 0; current.warmupFrames = 0; current.warmingUp = true; return }
      if (current.recoveringFromHidden) { current.recoveringFromHidden = false; return }
      const delta = deltaSeconds * 1000
      if (current.warmingUp) {
        current.warmupElapsed += delta; current.warmupFrames++
        if (current.warmupElapsed >= 500 && current.warmupFrames >= 10) current.warmingUp = false
        return
      }
      // Visible stalls belong to the user-perceived cadence; hidden-page gaps are reset above.
      current.elapsed += delta; current.frames++
      if (current.elapsed >= 1000 && current.frames >= 30) {
        // frameMs is visible Canvas cadence; counters are the latest complete render frame, not GPU time.
        onUpdate({ fps: current.frames * 1000 / current.elapsed, frameMs: current.elapsed / current.frames, calls: gl.info.render.calls, triangles: gl.info.render.triangles, validFrames: current.frames, sampleDurationMs: current.elapsed })
        current.elapsed = 0; current.frames = 0
      }
  })
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

export function Scene({ time, mode, theme, enabled, weather = 'clear', quality = 'auto', benchmark = false, onUpdate, onReady, onError }: {
  time: TimeOfDay; mode: 'overview' | 'mega'; theme: ThemeName; enabled: boolean
  weather?: Weather
  quality?: QualityPreset
  benchmark?: boolean
  onUpdate: (metrics: CanvasMetrics) => void; onReady: (ms: number) => void; onError?: (message: string) => void
}) {
  benchmark = benchmark || new URLSearchParams(window.location.search).get('view') === 'quality'
  const startedAt = useRef(performance.now())
  const p = environmentPalette(time, weather), night = time === 'night', config = qualityConfig[quality]
  const lightPosition = sunDirection(time).multiplyScalar(120)
  const lighting = timeLighting[time], weatherLight = weatherLighting[weather]
  const fog = sceneFog(time, weather, p.haze, mode === 'overview' ? overviewDistanceOffset() : 0)
  const sceneCamera = useMemo(() => createSceneCamera(mode), [mode])
  return <Canvas
    camera={sceneCamera}
    onCreated={({ camera, size }) => {
      camera.position.set(...cameraPosition(mode, size.width / size.height))
      camera.lookAt(...cameraViews[mode].target)
      camera.updateProjectionMatrix()
    }}
    shadows
    dpr={benchmark ? 1 : renderQualityBudgets[quality].dpr}
    gl={{ antialias: true }}
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    fallback={<div className="scene-fallback" role="alert"><strong>3D 场景暂不可用</strong><small>请降低渲染质量或刷新页面。</small></div>}
  >
    <color attach="background" args={[p.haze]} /><fog attach="fog" args={[fog.color, fog.near, fog.far]} />
    <Atmosphere time={time} weather={weather} lowDetail={quality === 'low'} quality={quality} />
    <CameraDirector mode={mode} />
    <hemisphereLight args={[p.ambient, '#4c5159', lighting.hemisphere * weatherLight.fill]} />
    <directionalLight position={[-80, 65, -100]} color={p.ambient} intensity={lighting.fill * weatherLight.fill} />
    <directionalLight position={lightPosition} color={p.sun} intensity={p.power * weatherLight.direct} castShadow shadow-mapSize={[renderQualityBudgets[quality].shadowMapSize, renderQualityBudgets[quality].shadowMapSize]} shadow-camera-left={-65} shadow-camera-right={65} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-far={260} shadow-normalBias={.08} shadow-bias={-.00015} />
    <Ground time={time} weather={weather} mode={mode} quality={quality} /><Architecture theme={enabled ? theme : null} night={night} detail={config.detail} />
    <MetropolitanLandscape theme={enabled ? theme : null} night={night} weather={weather} quality={quality} />
    {weather === 'rain' && <Rain count={rainBudgets[quality]} night={night} />}
    {weather === 'snow' && <><SnowSurfaces items={snowSurfaces} color={night ? '#a2b4c5' : '#c6d5da'} /><Snow count={snowBudgets[quality]} night={night} /></>}
    <Megastructure accent={enabled ? themeSpecs[theme].emission : '#b1a286'} theme={enabled ? theme : null} night={night} sunset={time === 'sunset'} time={time} quality={quality} /><Transport night={night} count={config.traffic} />
    <OrbitControls key={mode} makeDefault target={cameraViews[mode].target} maxPolarAngle={Math.PI / 2.12} minDistance={25} maxDistance={mode === 'overview' ? 1700 : 800} enableDamping dampingFactor={.06} />
    <WebGLGuard onError={onError} />
    <LensWeather time={time} weather={weather} quality={quality} mode={mode} />
    {weather === 'haze' && <HeightFog color={fog.color} mode={mode} quality={quality} />}
    <Metrics startedAt={startedAt.current} onUpdate={onUpdate} onReady={onReady} />
  </Canvas>
}
