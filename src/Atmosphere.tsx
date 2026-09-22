import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, Vector3, type Mesh, type ShaderMaterial } from 'three'
import type { TimeOfDay } from './city'

export type Weather = 'clear' | 'clouds' | 'haze'
export const weatherLabels: Record<Weather, string> = { clear: '晴空光晕', clouds: '层云晚霞', haze: '薄雾柔光' }
export const weatherDescriptions: Record<Weather, string> = {
  clear: '少云天空与柔和日晕；夜间转为月晕。',
  clouds: '缓慢流动的层云，随白昼、日落和夜晚改变光色。',
  haze: '更柔和的光照与远景薄雾，保留近景轮廓。',
}

// Environment owns light direction and colour; themes never rebuild the city.
export const atmospherePalettes = {
  day: { zenith: '#477f9c', horizon: '#d8e1da', haze: '#b8cfd0', water: '#497985', sun: '#fff1d5', ambient: '#c2dce8', cloud: '#fff7e3', shadow: '#8babb7', direction: [.5, .55, .68], power: 3.0 },
  sunset: { zenith: '#535b86', horizon: '#e8b69a', haze: '#ada1a4', water: '#4a6778', sun: '#ffc183', ambient: '#b1c1dc', cloud: '#f7c09c', shadow: '#454c6e', direction: [.38, .09, .92], power: 3.5 },
  night: { zenith: '#0c182d', horizon: '#344a66', haze: '#243c54', water: '#183342', sun: '#bed5f1', ambient: '#819dc7', cloud: '#7d94b3', shadow: '#263c59', direction: [.55, .3, .78], power: 1.2 },
} satisfies Record<TimeOfDay, { zenith: string; horizon: string; haze: string; water: string; sun: string; ambient: string; cloud: string; shadow: string; direction: number[]; power: number }>

export function sunDirection(time: TimeOfDay) {
  const [x, y, z] = atmospherePalettes[time].direction
  return new Vector3(x, y, z).normalize()
}

const vertexShader = `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = clip.xyww;
  }
`

const fragmentShader = `
  varying vec3 vDirection;
  uniform vec3 uZenith, uHorizon, uSunColor, uCloud, uShadow, uSun;
  uniform float uTime, uCoverage, uHaze, uNight, uDetail;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float n = .53*noise(p); p = mat2(1.6,1.2,-1.2,1.6)*p;
    n += .27*noise(p); p = mat2(1.6,1.2,-1.2,1.6)*p;
    n += .13*noise(p);
    if (uDetail > .5) n += .07*noise(p*2.03);
    return n;
  }
  void main() {
    vec3 d = normalize(vDirection);
    float height = max(d.y, 0.0);
    float cosine = clamp(dot(d, uSun), -1.0, 1.0);
    float angle = acos(cosine);
    vec3 sky = mix(uHorizon, uZenith, pow(smoothstep(0.0, .24, height), .65));
    float aureole = exp(-angle*angle/ .014) * .72 + exp(-angle*angle/ .15) * .19;
    // A faint 22-degree halo, anchored to the actual sun rather than the screen.
    float halo = exp(-pow((angle-.384)/.024, 2.0)) * .055 * (1.0-uHaze*.7);
    sky += uSunColor * (aureole + halo) * mix(1.0, .3, uNight) * smoothstep(0.0, .04, height);
    float disc = 1.0-smoothstep(.012, .017, angle);
    sky = mix(sky, uSunColor*2.7, disc);

    // Hemisphere mapping is stable when orbiting; no camera-facing cloud cards.
    vec2 p = d.xz / (height + .24);
    vec2 drift = vec2(uTime*.0028, uTime*.0009);
    float body = fbm(p*2.6 + drift + vec2(8.3, 2.1));
    float bands = fbm(p*vec2(1.25, 5.0) + drift*.65 + vec2(17.0, 31.0));
    float density = smoothstep(.56-uCoverage*.30, .77-uCoverage*.21, body*.74+bands*.26);
    density *= smoothstep(.025, .15, height);
    float edge = (1.0-smoothstep(.12, .6, density))*density;
    float sunSide = pow(max(cosine, 0.0), 5.0);
    vec3 cloud = mix(uShadow, uCloud, clamp(.16 + body*.38 + sunSide*.32, 0.0, 1.0));
    cloud += uSunColor*edge*sunSide*.9*(1.0-uNight*.8);
    sky = mix(sky, cloud, density*.82);
    float wisps = smoothstep(.58, .76, fbm(p*vec2(1.8, 9.0)+drift*.4+45.0));
    sky = mix(sky, uCloud, wisps*.15*smoothstep(.03,.3,height)*(1.0-uNight*.65));
    sky = mix(sky, uHorizon, uHaze*.32*(1.0-smoothstep(0.0,.7,height)));
    gl_FragColor = vec4(sky, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function Atmosphere({ time, weather, lowDetail }: { time: TimeOfDay; weather: Weather; lowDetail: boolean }) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const motion = useRef(true)
  const elapsed = useRef(0)
  const uniforms = useMemo(() => {
    const p = atmospherePalettes[time]
    return {
      uZenith: { value: new Color(p.zenith) }, uHorizon: { value: new Color(p.horizon) },
      uSunColor: { value: new Color(p.sun) }, uCloud: { value: new Color(p.cloud) },
      uShadow: { value: new Color(p.shadow) }, uSun: { value: sunDirection(time) },
      uTime: { value: 0 }, uNight: { value: time === 'night' ? 1 : 0 },
      uCoverage: { value: weather === 'clouds' ? 1 : weather === 'haze' ? .55 : 0 },
      uHaze: { value: weather === 'haze' ? 1 : .12 }, uDetail: { value: lowDetail ? 0 : 1 },
    }
  }, [time, weather, lowDetail])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { motion.current = !preference.matches }
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useFrame(({ camera }, delta) => {
    mesh.current?.position.copy(camera.position)
    if (motion.current) elapsed.current += Math.min(delta, .05)
    if (material.current) material.current.uniforms.uTime.value = elapsed.current
  })
  return <mesh ref={mesh} frustumCulled={false} renderOrder={-100}>
    <sphereGeometry args={[1, 32, 16]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} side={BackSide} depthWrite={false} depthTest={false} />
  </mesh>
}
