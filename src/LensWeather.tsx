import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2, Vector3, type ShaderMaterial, Scene as ThreeScene, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { useThree } from '@react-three/fiber'
import { sunDirection, type Weather } from './Atmosphere'
import type { TimeOfDay } from './city'
import type { QualityPreset } from './CityScene'
import type { CameraMode } from './camera'
import { lensBudgets, lensSafeHalfSize, lensStrength, lensWeatherProfiles } from './weatherLens'

const vertexShader = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime, uAspect, uDetail, uStrength, uSunVisible;
  uniform vec2 uGrid, uSafe, uSun;
  uniform vec4 uWeather;
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  void main() {
    vec2 uv=vUv;
    vec2 outside=abs(uv-.5)-uSafe;
    float edge=smoothstep(0.0,.075,max(outside.x,outside.y));
    if(edge<=0.0) discard;
    vec3 color=vec3(.77,.86,.91);
    float alpha=0.0;
    if(uWeather.x>0.0) {
      // Each fixed column has its own phase and speed; no CPU drop updates.
      float column=floor(uv.x*uGrid.x);
      vec2 seedCell=vec2(column,2.7);
      float speed=.13+hash(seedCell)*.09;
      vec2 grid=vec2(uv.x*uGrid.x,uv.y*uGrid.y+uTime*speed);
      float row=floor(grid.y);
      float bestAlpha=0.0;
      vec3 bestColor=color;
      for(int candidate=-1; candidate<=1; candidate++) {
        vec2 cell=vec2(column,row+float(candidate));
        vec2 local=vec2(grid.x-column,grid.y-(row+float(candidate)))-vec2(.20+hash(cell+3.7)*.60,.48);
        // Correct the actual cell aspect, including narrow browser viewports.
        local.x*=uAspect*uGrid.y/uGrid.x;
        float size=.13+hash(cell+8.1)*.10;
        vec2 drop=local/vec2(size,size*1.55);
        float radius=length(drop);
        float body=1.0-smoothstep(.72,1.0,radius);
        float rim=smoothstep(.52,.76,radius)*(1.0-smoothstep(.78,1.06,radius));
        float candidateShine=(1.0-smoothstep(.12,.42,length(drop-vec2(-.30,.35))))*body;
        float candidateTrail=(1.0-smoothstep(size*.10,size*.33,abs(local.x)))
          *smoothstep(size, size*1.9,local.y)*(1.0-smoothstep(size*2.0,size*4.8,local.y));
        float candidatePresent=step(.64,hash(cell+19.2));
        float candidateAlpha=(rim*.62+body*.10+candidateShine*.72+candidateTrail*.22)*candidatePresent*uWeather.x;
        if(candidateAlpha>bestAlpha){bestAlpha=candidateAlpha;bestColor=mix(vec3(.16,.25,.31),vec3(.88,.95,1.0),clamp(candidateShine+candidateTrail*.4,0.0,1.0));}
      }
      alpha=bestAlpha;
      color=bestColor;
    }
    if(uWeather.y>0.0) {
      vec2 p=uv*vec2(uAspect,1.0);
      float grain=noise(p*24.0+vec2(3.1,7.8));
      if(uDetail>1.5) grain=mix(grain,noise(p*63.0+13.7),.28);
      if(uDetail>2.5) grain=mix(grain,noise(p*141.0+9.1),.15);
      float side=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
      float asymmetric=.55+.45*noise(p*4.8+vec2(2.3,8.7));
      float bottom=(1.0-smoothstep(.006,.13*asymmetric,uv.y))*.95;
      float corners=(1.0-smoothstep(.035,.24,length(uv-vec2(0.0,0.0))))+(1.0-smoothstep(.035,.24,length(uv-vec2(1.0,0.0))));
      float border=max(1.0-smoothstep(.008,.095*asymmetric,side),max(bottom,corners*.72));
      // A sparse sixfold crystal pattern, broken up by grain and edge depth.
      vec2 crystal=fract(p*38.0)-.5;
      float angle=atan(crystal.y,crystal.x);
      float branch=pow(abs(cos(angle*3.0)),18.0)*(1.0-smoothstep(.12,.55,length(crystal)));
      float fingers=smoothstep(.50,.78,grain)* (1.0-smoothstep(.018,.15*asymmetric,side));
      alpha+=(border*(.35+grain*.45)+fingers*.5+branch*border*.20)*uWeather.y;
    }
    if(uWeather.z>0.0) {
      float side=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
      float film=(1.0-smoothstep(0.0,.17,side))*(.55+.45*noise(uv*vec2(uAspect,1.0)*16.0));
      alpha+=film*uWeather.z;
    }
    if(uWeather.w>0.0) {
      vec2 light=(uv-uSun)*vec2(uAspect,1.0);
      alpha+=exp(-dot(light,light)*5.0)*uWeather.w*uSunVisible;
    }
    gl_FragColor=vec4(color,clamp(alpha*edge*uStrength,0.0,.58));
    #include <colorspace_fragment>
  }
`

const postFragmentShader = `
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform float uTime, uAspect, uDetail, uStrength;
  uniform vec2 uGrid, uSafe;
  uniform vec4 uWeather;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  void main(){
    vec2 uv=vUv; vec4 sceneColor=texture2D(tDiffuse,uv);
    vec2 outside=abs(uv-.5)-uSafe; float edge=smoothstep(0.0,.075,max(outside.x,outside.y));
    if(edge<=0.0){gl_FragColor=sceneColor;return;}
    vec3 result=sceneColor.rgb;
    if(uWeather.x>0.0){
      float column=floor(uv.x*uGrid.x); vec2 seedCell=vec2(column,2.7); float speed=.13+hash(seedCell)*.09; vec2 grid=vec2(uv.x*uGrid.x,uv.y*uGrid.y+uTime*speed); float row=floor(grid.y);
      float bestLens=0.0,bestBody=0.0,bestRim=0.0,bestShine=0.0,bestTrail=0.0,bestPresent=0.0;vec2 bestNormal=vec2(0.0);
      for(int candidate=-1; candidate<=1; candidate++) {
        vec2 cell=vec2(column,row+float(candidate)); vec2 local=vec2(grid.x-column,grid.y-(row+float(candidate)))-vec2(.20+hash(cell+3.7)*.60,.48);local.x*=uAspect*uGrid.y/uGrid.x;
        float size=.13+hash(cell+8.1)*.10;vec2 drop=local/vec2(size,size*1.55);float radius=length(drop);
        float body=1.0-smoothstep(.68,1.0,radius);float rim=smoothstep(.50,.76,radius)*(1.0-smoothstep(.78,1.08,radius));
        float shine=(1.0-smoothstep(.10,.40,length(drop-vec2(-.30,.35))))*body;
        float trail=(1.0-smoothstep(size*.10,size*.30,abs(local.x)))*smoothstep(size,size*1.8,local.y)*(1.0-smoothstep(size*1.9,size*4.8,local.y));
        float present=step(.64,hash(cell+19.2));float lens=clamp((body+rim+shine+trail)*present*edge*uStrength,0.0,1.0);
        if(lens>bestLens){bestLens=lens;bestBody=body;bestRim=rim;bestShine=shine;bestTrail=trail;bestPresent=present;bestNormal=normalize(drop+vec2(.0001));}
      }
      vec2 refractUv=clamp(uv+(bestNormal*bestBody*.0045+vec2(-.0015,.004)*bestTrail)*bestPresent*uWeather.x,vec2(0.0),vec2(1.0));
      vec3 refracted=texture2D(tDiffuse,refractUv).rgb;result=mix(sceneColor.rgb,refracted,bestLens*.82);result*=1.0-bestBody*bestPresent*edge*.08;
      result+=vec3(.82,.91,.96)*(bestRim*.18+bestShine*.30+bestTrail*.07)*bestPresent*edge*uWeather.x;
    }
    if(uWeather.y>0.0){
      vec2 p=uv*vec2(uAspect,1.0);float macro=noise(p*5.0+vec2(2.3,8.7));float middle=noise(p*38.0+vec2(3.1,7.8));float fine=uDetail>2.5?noise(p*132.0+9.1):noise(p*72.0+9.1);
      float side=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));float border=1.0-smoothstep(.008,.085+macro*.045,side);float bottom=(1.0-smoothstep(.005,.12+macro*.035,uv.y))*.92;
      float corners=max(1.0-smoothstep(.035,.24,length(uv)),1.0-smoothstep(.035,.24,length(uv-vec2(1.0,0.0))));float fingers=smoothstep(.56,.78,middle)*(1.0-smoothstep(.02,.15+macro*.03,side));
      float frost=clamp(max(border,max(bottom,corners*.78))*(.48+middle*.34)+fingers*.28+fine*.08,0.0,1.0)*edge*uStrength*uWeather.y;
      vec2 displacement=vec2(noise(p*73.0)-.5,noise(p*91.0+4.0)-.5)*.004*uWeather.y;vec2 refractUv=clamp(uv+displacement,vec2(0.0),vec2(1.0));vec3 ice=texture2D(tDiffuse,refractUv).rgb;
      if(uDetail>2.5)ice=(ice+texture2D(tDiffuse,clamp(refractUv+vec2(.002,0.0),vec2(0.0),vec2(1.0))).rgb+texture2D(tDiffuse,clamp(refractUv-vec2(.002,0.0),vec2(0.0),vec2(1.0))).rgb+texture2D(tDiffuse,clamp(refractUv+vec2(0.0,.002),vec2(0.0),vec2(1.0))).rgb+texture2D(tDiffuse,clamp(refractUv-vec2(0.0,.002),vec2(0.0),vec2(1.0))).rgb)*.2;
      else ice=(ice+texture2D(tDiffuse,clamp(refractUv+vec2(.002,.001),vec2(0.0),vec2(1.0))).rgb)*.5;
      vec3 frostColor=mix(vec3(.32,.42,.48),vec3(.82,.90,.92),clamp(frost*1.55,0.0,1.0));result=mix(sceneColor.rgb,mix(ice,frostColor,clamp(frost*.72,0.0,.66)),frost);
    }
    gl_FragColor=vec4(result,sceneColor.a);
  }
`

const lensShader = { uniforms: {
  tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 }, uDetail: { value: 1 }, uStrength: { value: 1 }, uSunVisible: { value: 0 },
  uGrid: { value: new Vector2() }, uSafe: { value: new Vector2(...lensSafeHalfSize) }, uSun: { value: new Vector2() }, uWeather: { value: [0, 0, 0, 0] },
}, vertexShader, fragmentShader: postFragmentShader }

function PostProcessLens({ time, weather, quality, mode, elapsed }: { time: TimeOfDay; weather: Weather; quality: QualityPreset; mode: CameraMode; elapsed: MutableRefObject<number> }) {
  const { gl, scene, camera, size, viewport } = useThree()
  const composer = useRef<EffectComposer | null>(null), pass = useRef<ShaderPass | null>(null), motion = useRef(true)
  const sun = useMemo(() => new Vector3(), [])
  const direction = useMemo(() => sunDirection(time), [time])
  const budget = lensBudgets[quality], profile = lensWeatherProfiles[weather]
  useEffect(() => {
    const renderer = gl as WebGLRenderer
    const previousAutoReset = renderer.info.autoReset
    renderer.info.autoReset = false
    const next = new EffectComposer(renderer)
    const samples = quality === 'high' ? 4 : 2
    next.renderTarget1.samples = samples
    next.renderTarget2.samples = samples
    next.setPixelRatio(renderer.getPixelRatio())
    next.addPass(new RenderPass(scene as ThreeScene, camera))
    const shaderPass = new ShaderPass(lensShader)
    const outputPass = new OutputPass()
    shaderPass.uniforms.uDetail.value = budget.detail
    shaderPass.uniforms.uGrid.value.set(budget.columns, budget.rows)
    shaderPass.uniforms.uStrength.value = lensStrength(time, mode)
    shaderPass.uniforms.uWeather.value = [profile.rain, profile.frost, profile.dew, profile.glow]
    next.addPass(shaderPass); next.addPass(outputPass)
    composer.current = next; pass.current = shaderPass
    return () => { shaderPass.dispose(); outputPass.dispose(); next.dispose(); renderer.info.autoReset = previousAutoReset; composer.current = null; pass.current = null }
  }, [gl, scene, camera])
  useEffect(() => {
    const current = pass.current, next = composer.current
    if (!current || !next) return
    current.uniforms.uDetail.value = budget.detail
    current.uniforms.uGrid.value.set(budget.columns, budget.rows)
    current.uniforms.uStrength.value = lensStrength(time, mode)
    current.uniforms.uWeather.value = [profile.rain, profile.frost, profile.dew, profile.glow]
  }, [budget.detail, budget.columns, budget.rows, time, mode, profile.rain, profile.frost, profile.dew, profile.glow])
  useEffect(() => {
    const next = composer.current
    if (!next) return
    const samples = quality === 'high' ? 4 : 2
    if (next.renderTarget1.samples !== samples || next.renderTarget2.samples !== samples) {
      next.renderTarget1.dispose(); next.renderTarget2.dispose()
      next.renderTarget1.samples = samples; next.renderTarget2.samples = samples
    }
    next.setSize(size.width, size.height)
  }, [quality, size.width, size.height])
  useEffect(() => {
    const next = composer.current
    if (!next) return
    next.setPixelRatio(gl.getPixelRatio()); next.setSize(size.width, size.height)
  }, [gl, size.width, size.height, viewport.dpr])
  useEffect(() => { const preference = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => { motion.current = !preference.matches }; update(); preference.addEventListener('change', update); return () => preference.removeEventListener('change', update) }, [])
  useFrame(({ camera: activeCamera }, delta) => {
    if (motion.current) elapsed.current += Math.min(delta, .05)
    const current = pass.current, next = composer.current
    if (!current || !next) { gl.render(scene, activeCamera); return }
    const values = current.uniforms
    values.uTime.value = elapsed.current; values.uAspect.value = size.width / size.height
    sun.copy(activeCamera.position).addScaledVector(direction, 1000).applyMatrix4(activeCamera.matrixWorldInverse)
    values.uSunVisible.value = sun.z < 0 ? 1 : 0; sun.applyMatrix4(activeCamera.projectionMatrix); values.uSun.value.set(sun.x * .5 + .5, sun.y * .5 + .5)
    gl.info.reset(); next.render()
  }, 1)
  return null
}

function OverlayLensWeather({ time, weather, quality, mode, elapsed }: {
  time: TimeOfDay; weather: Weather; quality: QualityPreset; mode: CameraMode; elapsed: MutableRefObject<number>
}) {
  const material = useRef<ShaderMaterial>(null), motion = useRef(true)
  const sun = useMemo(() => new Vector3(), [])
  const uniforms = useMemo(() => {
    const budget = lensBudgets[quality], profile = lensWeatherProfiles[weather]
    return {
      uTime: { value: elapsed.current }, uAspect: { value: 1 }, uDetail: { value: budget.detail },
      uStrength: { value: lensStrength(time, mode) }, uGrid: { value: new Vector2(budget.columns, budget.rows) },
      uSafe: { value: new Vector2(...lensSafeHalfSize) }, uSun: { value: new Vector2() }, uSunVisible: { value: 0 },
      uWeather: { value: [profile.rain, profile.frost, profile.dew, profile.glow] },
    }
  }, [time, weather, quality, mode])
  const direction = useMemo(() => sunDirection(time), [time])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { motion.current = !preference.matches }
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useFrame(({ camera, size }, delta) => {
    if (motion.current) elapsed.current += Math.min(delta, .05)
    if (!material.current) return
    const values = material.current.uniforms
    values.uTime.value = elapsed.current
    values.uAspect.value = size.width / size.height
    sun.copy(camera.position).addScaledVector(direction, 1000).applyMatrix4(camera.matrixWorldInverse)
    values.uSunVisible.value = sun.z < 0 ? 1 : 0
    sun.applyMatrix4(camera.projectionMatrix)
    values.uSun.value.set(sun.x * .5 + .5, sun.y * .5 + .5)
  })
  return <mesh frustumCulled={false} renderOrder={1000} raycast={() => null}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}
      transparent depthTest={false} depthWrite={false} toneMapped={false} />
  </mesh>
}

export function LensWeather({ time, weather, quality, mode }: {
  time: TimeOfDay; weather: Weather; quality: QualityPreset; mode: CameraMode
}) {
  const elapsed = useRef(0)
  return quality !== 'low' && (weather === 'rain' || weather === 'snow')
    ? <PostProcessLens time={time} weather={weather} quality={quality} mode={mode} elapsed={elapsed} />
    : <OverlayLensWeather time={time} weather={weather} quality={quality} mode={mode} elapsed={elapsed} />
}
