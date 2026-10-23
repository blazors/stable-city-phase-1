import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute, InstancedMesh, Object3D, type ShaderMaterial } from 'three'
import { createStableCity, type TimeOfDay } from './city'
import { megaMaterialFamilies, themeSpecs, type ThemeName } from './theme'
import { generateMetropolis, riverReflectionSources, riverShader } from './metropolis'
import { Atmosphere, environmentPalette, sunDirection, type Weather } from './Atmosphere'
import { Rain, Snow } from './Precipitation'
import { LensWeather } from './LensWeather'
import { puddleBudgets, rainBudgets, rainPatches } from './rain'
import { snowBudgets, snowCaps, snowRoadEdges } from './snow'
import { cameraPosition, cameraViews, createSceneCamera, overviewDistanceOffset, type CameraMode } from './camera'
import { megaPracticalFixtures, megaPracticalLights, megaPracticalSpotIntensity, megaPracticalStripIntensity, sceneFog, timeLighting, weatherLighting } from './lighting'
import { createMegaBridgeGeometry, createMegaRoofVertices, createMegaStructureGeometry, megaMaintenanceBus, megaScaleWorkers } from './megaGeometry'
import { HeightFog } from './HeightFog'
import { heightFogBudgets, heightFogDensity, heightFogGLSL } from './heightFogModel'
import { applyMoodPalette, type ResolvedMood } from './mood'

const city = createStableCity()
const metropolis = generateMetropolis(city.seed)
const snowSurfaces = [
  ...snowCaps(metropolis.parks),
  ...snowRoadEdges(metropolis.roads),
  ...snowCaps(city.blocks.filter(b => b.kind === 'void').map(b => ({ position: [b.x, .12, b.z] as Vec3, size: [14, .24, 14] as Vec3 }))),
  ...snowRoadEdges([-36, -18, 0, 18, 36].flatMap(v => [
    { position: [v, .025, 0] as Vec3, size: [v === 0 ? 4.6 : 3, .05, 78] as Vec3 },
    { position: [0, .035, v] as Vec3, size: [78, .05, 3] as Vec3 },
  ])),
]
export const metropolitanBuildingCount = metropolis.buildings.length
type Vec3 = [number, number, number]
type Box = { position: Vec3; size: Vec3; color?: string; emissiveScale?: number; tower?: boolean; rotation?: Vec3; quaternion?: [number, number, number, number] }
export type RenderMetrics = { fps: number; frameMs: number; calls: number; triangles: number; validFrames: number; sampleDurationMs: number; configRevision: number }
export type SceneCanvasHandle = { capture: () => Promise<{ blob: Blob; width: number; height: number }>; camera: () => { position: [number, number, number]; target: [number, number, number]; fov: number } }
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
function Boxes({ items, color = '#ffffff', glow = false, night = false, foliage = false, wet = false, roughness, metalness, emissive, emissiveIntensity, castShadow, receiveShadow, emissiveInstanceColor = false }: { items: Box[]; color?: string; glow?: boolean; night?: boolean; foliage?: boolean; wet?: boolean; roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number; castShadow?: boolean; receiveShadow?: boolean; emissiveInstanceColor?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    items.forEach((item, i) => {
      object.position.set(...item.position)
      object.rotation.set(...(item.rotation ?? [0, 0, 0]))
      if (item.quaternion) object.quaternion.set(...item.quaternion)
      object.scale.set(...item.size)
      object.updateMatrix()
      ref.current!.setMatrixAt(i, object.matrix)
      const instanceColor = new Color(item.color ?? '#ffffff')
      if (item.emissiveScale !== undefined) instanceColor.multiplyScalar(item.emissiveScale)
      ref.current!.setColorAt(i, instanceColor)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={castShadow ?? !glow} receiveShadow={receiveShadow ?? !glow}>
    {foliage ? <icosahedronGeometry args={[.65, 1]} /> : <boxGeometry />}
    <meshStandardMaterial color={color} roughness={roughness ?? (glow ? .45 : wet ? .22 : .82)} metalness={metalness ?? (glow ? .15 : wet ? .10 : .04)} emissive={emissive ?? (glow ? color : '#000000')} emissiveIntensity={emissiveIntensity ?? (glow ? (night ? 1.8 : .08) : 0)} onBeforeCompile={emissiveInstanceColor ? shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor;') } : undefined} />
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

function Megastructure({ theme }: { theme: ThemeName | null }) {
  const structure = useMemo(() => createMegaStructureGeometry(), [])
  const bridge = useMemo(() => createMegaBridgeGeometry(), [])
  const roofGeometry = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(createMegaRoofVertices(), 3))
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    return geometry
  }, [])
  useEffect(() => () => roofGeometry.dispose(), [roofGeometry])
  const materials = megaMaterialFamilies(theme)
  return <>
    <Boxes color={materials.mineral.color} roughness={materials.mineral.roughness} metalness={materials.mineral.metalness} items={structure.bodies} />
    <mesh geometry={roofGeometry} castShadow receiveShadow>
      <meshStandardMaterial color={materials.mineral.color} roughness={materials.mineral.roughness} metalness={materials.mineral.metalness} />
    </mesh>
    <Boxes color={materials.steel.color} roughness={materials.steel.roughness} metalness={materials.steel.metalness} items={[
      ...structure.braces, ...structure.ribs, ...structure.serviceBraces,
      ...bridge.decks, ...bridge.joints, ...bridge.girders, ...bridge.supports, ...bridge.rails, ...bridge.railPosts,
    ]} />
    <Boxes color={materials.interior.color} roughness={materials.interior.roughness} metalness={materials.interior.metalness} items={[
      ...structure.inset,
      ...structure.frames,
    ]} />
    <Boxes color={materials.equipment.color} roughness={materials.equipment.roughness} metalness={materials.equipment.metalness} items={[...structure.equipment, ...structure.roofFrame]} />
  </>
}

function MaintenanceBus() {
  return <Boxes items={megaMaintenanceBus} color="#ffffff" roughness={.68} metalness={.08} castShadow={false} receiveShadow={false} />
}

function ScaleWorkers() {
  return <Boxes items={megaScaleWorkers} color="#ffffff" roughness={.82} metalness={.02} castShadow={false} receiveShadow={false} />
}

function MegaPracticalLights({ time, theme, mood }: { time: TimeOfDay; theme: ThemeName | null; mood: ResolvedMood | undefined }) {
  const scene = useThree(state => state.scene)
  const targets = useMemo(() => megaPracticalLights.map(light => {
    const target = new Object3D()
    target.position.set(light.target[0], light.target[1], light.target[2])
    return target
  }), [])
  useLayoutEffect(() => {
    targets.forEach(target => scene.add(target))
    return () => targets.forEach(target => scene.remove(target))
  }, [scene, targets])
  const lightColor = useMemo(() => new Color('#FFC681').lerp(new Color(theme ? themeSpecs[theme].emission : '#FFC681'), .38).getStyle(), [theme])
  const fixtures = useMemo(() => megaPracticalFixtures.map(fixture => ({
    position: [...fixture.position] as Vec3,
    size: [...fixture.size] as Vec3,
    emissiveScale: fixture.emissiveScale,
  })), [])
  const lightLevel = mood?.monumentalLights ?? mood?.lightLevel ?? .55
  return <>
    {targets.map((target, index) => <spotLight key={`mega-practical-${index}`} position={[...megaPracticalLights[index].position] as Vec3} target={target} color={lightColor} intensity={megaPracticalSpotIntensity(time, lightLevel, megaPracticalLights[index].baseIntensity)} distance={megaPracticalLights[index].distance} angle={megaPracticalLights[index].angle} penumbra={.75} decay={2} castShadow={false} />)}
    <Boxes items={fixtures} color={lightColor} emissive={lightColor} glow emissiveIntensity={megaPracticalStripIntensity(time, lightLevel)} emissiveInstanceColor castShadow={false} receiveShadow={false} />
  </>
}

function Water({ time, weather, mode, quality, mood }: { time: TimeOfDay; weather: Weather; mode: CameraMode; quality: QualityPreset; mood: ResolvedMood | null }) {
  const overviewOffset = mode === 'overview' ? overviewDistanceOffset() : 0
  const reflectionWeights = [.38, .68, .28, .52, .32] as const
  const reflectionAnchors = riverReflectionSources.map((x, index) => `reflection+=anchorReflection(world,${x.toFixed(1)},${reflectionWeights[index].toFixed(2)});`).join('\n')
  const material = useRef<ShaderMaterial>(null)
  const elapsed = useRef(0), motion = useRef(true)
  const uniforms = useMemo(() => {
    const p = applyMoodPalette(environmentPalette(time, weather), mood); const water = new Color(p.water); water.multiplyScalar(.82 + (mood?.wetnessLevel ?? 0) * .18)
      return { uTime: { value: 0 }, uColor: { value: water }, uHaze: { value: new Color(p.horizon) }, uNight: { value: time === 'night' ? 1 : 0 }, uReflectionTier: { value: time === 'night' ? 1 : time === 'sunset' ? .42 : .12 }, uReflectionWeather: { value: weather === 'snow' ? 0 : weather === 'rain' ? .42 : weather === 'haze' ? .55 : 1 }, uSun: { value: sunDirection(time) }, uSunColor: { value: new Color(p.sun) }, uRain: { value: weather === 'rain' ? 1 : 0 }, uIce: { value: weather === 'snow' ? 1 : 0 }, uReflection: { value: weather === 'snow' ? .15 : weather === 'rain' ? .22 : weather === 'haze' ? .25 : .7 }, uWaveLayers: { value: waterWaveBudgets[quality] }, uHeightFogColor: { value: new Color(sceneFog(time, weather, p.haze, overviewOffset).color) }, uHeightFogDensity: { value: (mood?.fogLevel ?? 0) > .2 ? heightFogDensity(mode) * (mood?.fogLevel ?? 0) / .62 : weather === 'haze' ? heightFogDensity(mode) : 0 }, uHeightFogDetail: { value: heightFogBudgets[quality] }, uHeightFogTime: { value: 0 } }
  }, [time, weather, mode, quality, overviewOffset, mood])
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

function Ground({ time, weather, mode, quality, mood }: { time: TimeOfDay; weather: Weather; mode: CameraMode; quality: QualityPreset; mood?: ResolvedMood }) {
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
    return { paving, road, markings, lamps, supports }
  }, [])
  const roads = useMemo(() => [...details.road, ...metropolis.roads], [details])
  return <>
    <Water time={time} weather={weather} mode={mode} quality={quality} mood={mood ?? null} />
    {/* Keep the structural slab below the paving surface to avoid coplanar depth fighting. */}
    <Boxes color="#4e6668" items={[{ position: [0, -1.2, 0], size: [83, 2.3, 83] }]} />
    <Boxes color="#788a83" items={[{ position: [0, -.12, 0], size: [81, .24, 81] }, ...details.paving]} />
    <Boxes color={(mood?.wetnessLevel ?? 0) > .35 || weather === 'rain' ? '#2e424b' : '#3e5359'} items={details.road} wet={(mood?.wetnessLevel ?? 0) > .35 || weather === 'rain'} />
    {((mood?.wetnessLevel ?? 0) > .5 || weather === 'rain') && <RainPuddles night={night} quality={quality} roads={roads} />}
    <Boxes color="#abb9ac" items={details.markings} />
    <Boxes color="#738c87" items={details.supports} />
    <Boxes color="#f2c17e" items={details.lamps} glow night={night} />
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
      trees: tintSeededItems(metropolis.trees, spec.foliage, '#ffffff'),
    }
  }, [theme])
  const land = themed?.land ?? metropolis.land, parks = themed?.parks ?? metropolis.parks
  const paths = themed?.paths ?? metropolis.paths
  const allTrees = themed?.trees ?? metropolis.trees
  const pick = <T,>(items: T[], ratio: number) => items.slice(0, Math.ceil(items.length * ratio))
  const treeBudget = quality === 'high' || quality === 'auto' ? 180 : quality === 'balanced' ? 120 : 72
  const trees = pick(allTrees, Math.min(1, treeBudget / Math.max(1, allTrees.length)))
  const lights = quality === 'high' || quality === 'auto' ? metropolis.lights : pick(metropolis.lights, quality === 'balanced' ? .75 : .5)
  return <>
    <Boxes items={land} color={theme ? '#ffffff' : '#778782'} />
    <Boxes items={parks} color={theme ? '#ffffff' : '#526f56'} />
    <Boxes items={paths} color={theme ? '#ffffff' : '#a9ac96'} />
    <Boxes items={metropolis.roads} color={weather === 'rain' ? '#304953' : '#485f65'} wet={weather === 'rain'} />
    <Boxes items={trees} foliage />
    <Boxes items={lights} color="#e9b779" glow night={night} emissiveIntensity={night ? .22 : .06} />
    <Boxes items={metropolis.routeLights} color="#d6a66e" glow night={night} emissiveIntensity={night ? .15 : .025} />
    {metropolis.bridges.map(({ x, z, span }) => <group key={x} position={[x, 0, z]}>
      <Boxes color="#b4b6a9" items={[{ position: [0, .65, 0], size: [5, 1, span] }, ...[-1, 1].map(v => ({ position: [0, -1, v * (span / 2 - 5)] as Vec3, size: [3, 3, 1] as Vec3 }))]} />
      <Boxes color="#f0c78e" glow night={night} items={[-2.4, 2.4].map(v => ({ position: [v, 1.4, 0], size: [.13, .2, span] }))} />
      {[-2.3, 2.3].map(v => <mesh key={v} position={[v, 1, 0]} rotation-y={Math.PI / 2} scale={[1, .3, 1]}><torusGeometry args={[span / 2 - 2, .24, 6, 40, Math.PI]} /><meshStandardMaterial color="#a8c4c3" roughness={.6} /></mesh>)}
    </group>)}
  </>
}

function Transport({ night, count }: { night: boolean; count: number }) {
  const traffic = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
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
    <instancedMesh ref={traffic} args={[undefined, undefined, count]} frustumCulled={false} castShadow><boxGeometry /><meshStandardMaterial color="#d4bc92" roughness={.65} emissive="#b58241" emissiveIntensity={night ? .5 : 0} /></instancedMesh>
  </>
}

function CameraDirector({ mode, controls }: { mode: CameraMode; controls: { current: ComponentRef<typeof OrbitControls> | null } }) {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    if ('aspect' in camera) camera.aspect = size.width / Math.max(1, size.height)
    const target = cameraViews[mode].target
    camera.position.set(...cameraPosition(mode, size.width / size.height))
    camera.lookAt(...target)
    controls.current?.target.set(...target)
    controls.current?.update()
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

export function Scene({ time, mode, theme, enabled, weather = 'clear', quality = 'auto', benchmark = false, mood: moodProp, onUpdate, onReady, onError, onCanvasReady }: {
  time: TimeOfDay; mode: CameraMode; theme: ThemeName; enabled: boolean
  weather?: Weather
  quality?: QualityPreset
  mood?: ResolvedMood
  benchmark?: boolean
  onUpdate: (metrics: CanvasMetrics) => void; onReady: (ms: number) => void; onError?: (message: string) => void; onCanvasReady?: (handle: SceneCanvasHandle | null) => void
}) {
  benchmark = benchmark || new URLSearchParams(window.location.search).get('view') === 'quality'
  const startedAt = useRef(performance.now())
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const mood = moodProp
  const effectiveWeather = mood && mood.wetnessLevel > .72 && weather === 'clear' ? 'rain' : weather
  const p = applyMoodPalette(environmentPalette(time, effectiveWeather), mood), night = time === 'night', config = qualityConfig[quality]
  const lightPosition = sunDirection(time).multiplyScalar(120)
  const lighting = timeLighting[time], weatherLight = weatherLighting[effectiveWeather]
  const fog = sceneFog(time, effectiveWeather, p.haze, mode === 'overview' ? overviewDistanceOffset() : 0)
  const sceneCamera = useMemo(() => createSceneCamera(mode), [mode])
  return <Canvas
    camera={sceneCamera}
    onCreated={({ camera, size, gl, scene }) => {
      if ('aspect' in camera) camera.aspect = size.width / Math.max(1, size.height)
      camera.position.set(...cameraPosition(mode, size.width / size.height))
      camera.lookAt(...cameraViews[mode].target)
      camera.updateProjectionMatrix()
      onCanvasReady?.({
        camera: () => ({ position: camera.position.toArray() as [number, number, number], target: (controls.current?.target.toArray() ?? cameraViews[mode].target) as [number, number, number], fov: 'fov' in camera ? camera.fov : 45 }),
        capture: async () => {
          gl.render(scene, camera)
          const blob = await new Promise<Blob | null>(resolve => gl.domElement.toBlob(resolve, 'image/png'))
          if (!blob || blob.size === 0) throw new Error('Canvas 未生成有效 PNG')
          return { blob, width: gl.domElement.width, height: gl.domElement.height }
        },
      })
    }}
    shadows
    data-hero-aspect={mode === 'mega' ? 'fixed' : 'fluid'}
    dpr={benchmark ? 1 : renderQualityBudgets[quality].dpr}
    gl={{ antialias: true }}
    style={mode === 'mega' ? { position: 'relative', width: 'min(100%, 177.7778cqh)', height: 'auto', aspectRatio: '16 / 9' } : { position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    fallback={<div className="scene-fallback" role="alert"><strong>3D 场景暂不可用</strong><small>请降低渲染质量或刷新页面。</small></div>}
  >
    <color attach="background" args={[p.haze]} /><fog attach="fog" args={[fog.color, fog.near, fog.far]} />
    <Atmosphere time={time} weather={effectiveWeather} lowDetail={quality === 'low'} quality={quality} mood={mood} />
    <CameraDirector mode={mode} controls={controls} />
    <hemisphereLight args={[p.ambient, '#4c5159', lighting.hemisphere * weatherLight.fill * (.72 + (mood?.lightLevel ?? .55) * .28)]} />
    <directionalLight position={[-80, 65, -100]} color={p.ambient} intensity={lighting.fill * weatherLight.fill * (.72 + (mood?.lightLevel ?? .55) * .28)} />
    <directionalLight position={lightPosition} color={p.sun} intensity={p.power * weatherLight.direct * (.72 + (mood?.lightLevel ?? .55) * .28)} castShadow shadow-mapSize={[renderQualityBudgets[quality].shadowMapSize, renderQualityBudgets[quality].shadowMapSize]} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={110} shadow-camera-bottom={-25} shadow-camera-far={260} shadow-normalBias={.08} shadow-bias={-.00015} />
    <Ground time={time} weather={effectiveWeather} mode={mode} quality={quality} mood={mood} />
    <MetropolitanLandscape theme={enabled ? theme : null} night={night} weather={effectiveWeather} quality={quality} />
    {effectiveWeather === 'rain' && <Rain count={Math.round(rainBudgets[quality] * (mood?.wetnessLevel ? .7 + mood.wetnessLevel * .3 : 1))} night={night} />}
    {effectiveWeather === 'snow' && <><SnowSurfaces items={snowSurfaces} color={night ? '#a2b4c5' : '#c6d5da'} /><Snow count={snowBudgets[quality]} night={night} /></>}
    <Megastructure theme={enabled ? theme : null} /><MegaPracticalLights time={time} theme={enabled ? theme : null} mood={mood} /><Transport night={night} count={config.traffic} /><MaintenanceBus /><ScaleWorkers />
    <OrbitControls ref={controls} key={mode} makeDefault target={cameraViews[mode].target} maxPolarAngle={mode === 'mega' ? 112 * Math.PI / 180 : Math.PI / 2.12} minDistance={25} maxDistance={mode === 'overview' ? 1700 : 800} enableDamping dampingFactor={.06} />
    <WebGLGuard onError={onError} />
    <LensWeather time={time} weather={effectiveWeather} quality={quality} mode={mode} />
    {(effectiveWeather === 'haze' || (mood?.fogLevel ?? 0) > .2) && <HeightFog color={fog.color} mode={mode} quality={quality} densityScale={Math.max(.2, (mood?.fogLevel ?? .62) / .62) * (mode === 'mega' ? .0625 : 1)} />}
    <Metrics startedAt={startedAt.current} onUpdate={onUpdate} onReady={onReady} />
  </Canvas>
}
