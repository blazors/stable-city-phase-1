import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type ShaderMaterial } from 'three'
import { createRainAttributes } from './rain'

export function Rain({ count, night }: { count: number; night: boolean }) {
  const attributes = useMemo(() => createRainAttributes(count), [count])
  const material = useRef<ShaderMaterial>(null), elapsed = useRef(0), motion = useRef(true)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: night ? .75 : 1 } }), [night])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { motion.current = !preference.matches }
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useFrame((_, delta) => {
    if (motion.current) elapsed.current += Math.min(delta, .05)
    if (material.current) material.current.uniforms.uTime.value = elapsed.current
  })
  return <lineSegments frustumCulled={false}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[attributes.position, 3]} />
      <bufferAttribute attach="attributes-aPhase" args={[attributes.phase, 1]} />
      <bufferAttribute attach="attributes-aLayer" args={[attributes.layer, 1]} />
      <bufferAttribute attach="attributes-aTip" args={[attributes.tip, 1]} />
    </bufferGeometry>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthTest depthWrite={false}
      vertexShader={`attribute float aPhase, aLayer, aTip; uniform float uTime; varying float vAlpha;
        void main(){
          vec3 p=position;
          float fall=mod(aPhase*160.0+uTime*(19.0+aLayer*4.0),160.0);
          p.y=mod(p.y-fall+162.0,160.0)-2.0;
          float length=.65+aLayer*.75;
          p.y+=aTip*length; p.x-=aTip*length*.15;
          p.x+=sin(aPhase*6.283+uTime*.05)*2.0;
          // Type controls streak scale; actual camera distance controls spatial fading.
          float cameraDistance=distance(cameraPosition,p);
          vAlpha=(.12+aLayer*.035)*(1.0-smoothstep(250.0,760.0,cameraDistance));
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
        }`}
      fragmentShader={`varying float vAlpha; uniform float uOpacity; void main(){ gl_FragColor=vec4(.66,.76,.82,vAlpha*uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} />
  </lineSegments>
}

export function Snow({ count, night }: { count: number; night: boolean }) {
  const attributes = useMemo(() => {
    const rain = createRainAttributes(count, 8105)
    const position = new Float32Array(count * 3), phase = new Float32Array(count), layer = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      position.set(rain.position.subarray(i * 6, i * 6 + 3), i * 3)
      phase[i] = rain.phase[i * 2]; layer[i] = rain.layer[i * 2]
    }
    return { position, phase, layer }
  }, [count])
  const material = useRef<ShaderMaterial>(null), elapsed = useRef(0), motion = useRef(true)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: night ? .70 : 1 } }), [night])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { motion.current = !preference.matches }
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useFrame((_, delta) => {
    if (motion.current) elapsed.current += Math.min(delta, .05)
    if (material.current) material.current.uniforms.uTime.value = elapsed.current
  })
  return <points frustumCulled={false}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[attributes.position, 3]} />
      <bufferAttribute attach="attributes-aPhase" args={[attributes.phase, 1]} />
      <bufferAttribute attach="attributes-aLayer" args={[attributes.layer, 1]} />
    </bufferGeometry>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthTest depthWrite={false}
      vertexShader={`attribute float aPhase, aLayer; uniform float uTime; varying float vAlpha;
        void main(){
          vec3 p=position;
          p.y=mod(p.y-aPhase*160.0-uTime*(1.5+aLayer*.45)+162.0,160.0)-2.0;
          p.x+=sin(aPhase*6.283+uTime*.22)*2.2;
          p.z+=cos(aPhase*6.283+uTime*.16)*1.1;
          vec4 view=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*view;
          gl_PointSize=clamp((1.8+aLayer*1.6)*180.0/max(30.0,-view.z),1.0,7.0);
          vAlpha=(.18+aLayer*.12)*(1.0-smoothstep(280.0,800.0,distance(cameraPosition,p)));
        }`}
      fragmentShader={`varying float vAlpha; uniform float uOpacity;
        void main(){
          float radius=length(gl_PointCoord-.5);
          if(radius>.5) discard;
          gl_FragColor=vec4(.81,.88,.92,(1.0-smoothstep(.10,.5,radius))*vAlpha*uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
  </points>
}
