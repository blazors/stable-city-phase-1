import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2, Vector3, type ShaderMaterial } from 'three'
import { sunDirection, type Weather } from './Atmosphere'
import type { TimeOfDay } from './city'
import type { QualityPreset } from './CityScene'
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
      vec2 cell=vec2(floor(uv.x*uGrid.x),0.0);
      float speed=.07+hash(cell+4.3)*.055;
      vec2 grid=vec2(uv.x*uGrid.x,uv.y*uGrid.y+uTime*speed);
      cell=floor(grid);
      vec2 local=fract(grid)-vec2(.24+hash(cell+3.7)*.52,.5);
      // Correct the actual cell aspect, including narrow browser viewports.
      local.x*=uAspect*uGrid.y/uGrid.x;
      float size=.037+hash(cell+8.1)*.031;
      vec2 drop=local/vec2(size,size*1.55);
      float radius=length(drop);
      float body=1.0-smoothstep(.72,1.0,radius);
      float rim=smoothstep(.55,.8,radius)*(1.0-smoothstep(.8,1.08,radius));
      float shine=(1.0-smoothstep(.18,.52,length(drop-vec2(-.30,.35))))*body;
      float trail=(1.0-smoothstep(size*.10,size*.33,abs(local.x)))
        *smoothstep(size, size*1.9,local.y)*(1.0-smoothstep(size*2.0,size*5.5,local.y));
      float present=step(.42,hash(cell+19.2));
      alpha=(rim*.48+body*.08+shine*.8+trail*.12)*present*uWeather.x;
      color=mix(vec3(.16,.25,.31),vec3(.88,.95,1.0),clamp(shine+trail*.4,0.0,1.0));
    }
    if(uWeather.y>0.0) {
      vec2 p=uv*vec2(uAspect,1.0);
      float grain=noise(p*24.0+vec2(3.1,7.8));
      if(uDetail>1.5) grain=mix(grain,noise(p*63.0+13.7),.28);
      if(uDetail>2.5) grain=mix(grain,noise(p*141.0+9.1),.15);
      float side=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
      float asymmetric=.55+.45*noise(p*4.8+vec2(2.3,8.7));
      float border=1.0-smoothstep(.008,.105*asymmetric,side);
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
    gl_FragColor=vec4(color,clamp(alpha*edge*uStrength,0.0,.36));
    #include <colorspace_fragment>
  }
`

export function LensWeather({ time, weather, quality, mode }: {
  time: TimeOfDay; weather: Weather; quality: QualityPreset; mode: 'overview' | 'mega'
}) {
  const material = useRef<ShaderMaterial>(null), motion = useRef(true), elapsed = useRef(0)
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
