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
