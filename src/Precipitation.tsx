import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2, type ShaderMaterial } from 'three'
import { createRainAttributes, createRainRibbonAttributes } from './rain'

export function Rain({ count, night }: { count: number; night: boolean }) {
  const attributes = useMemo(() => createRainRibbonAttributes(count), [count])
  const material = useRef<ShaderMaterial>(null), elapsed = useRef(0), motion = useRef(true)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: night ? .92 : 1 }, uResolution: { value: new Vector2(1, 1) } }), [night])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { motion.current = !preference.matches }
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useFrame(({ gl }, delta) => {
    if (motion.current) elapsed.current += Math.min(delta, .05)
    if (material.current) {
      material.current.uniforms.uTime.value = elapsed.current
      gl.getDrawingBufferSize(material.current.uniforms.uResolution.value)
    }
  })
  return <mesh frustumCulled={false} raycast={() => null}>
    <bufferGeometry>
      <bufferAttribute attach="index" args={[attributes.index, 1]} />
      <bufferAttribute attach="attributes-position" args={[attributes.position, 3]} />
      <bufferAttribute attach="attributes-aPhase" args={[attributes.phase, 1]} />
      <bufferAttribute attach="attributes-aLayer" args={[attributes.layer, 1]} />
      <bufferAttribute attach="attributes-aTip" args={[attributes.tip, 1]} />
      <bufferAttribute attach="attributes-aSide" args={[attributes.side, 1]} />
    </bufferGeometry>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthTest depthWrite={false}
      vertexShader={`attribute float aPhase, aLayer, aTip, aSide; uniform float uTime; uniform vec2 uResolution; varying float vAlpha, vTip, vSide;
        void main(){
          vec3 p=position;
          float fall=mod(aPhase*160.0+uTime*(24.0+aLayer*4.6),160.0);
          p.y=mod(p.y-fall+162.0,160.0)-2.0;
          float gust=sin(uTime*.18)*.09;
          vec3 direction=normalize(vec3(-.38-gust,1.0,-.14));
          p.x=mod(p.x+360.0+uTime*(6.0+aLayer*1.4)+sin(aPhase*6.283+uTime*.35)*2.5,720.0)-360.0;
          p.z=mod(p.z+360.0+uTime*(2.0+aLayer*.35),720.0)-360.0;
          float length=1.1+aLayer*1.4;
          p+=direction*aTip*length;
          // Layers control length, speed and width while camera distance keeps the city readable.
          float cameraDistance=distance(cameraPosition,p);
          vAlpha=(.19+aLayer*.05)*(1.0-smoothstep(260.0,760.0,cameraDistance))*smoothstep(1.5,10.0,cameraDistance);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
          vec2 screenDirection=normalize((projectionMatrix*viewMatrix*vec4(direction,0.0)).xy);
          vec2 across=vec2(-screenDirection.y,screenDirection.x);
          // Pixel width survives driver line-width limits and follows framebuffer DPR.
          gl_Position.xy+=across*aSide*(1.45+aLayer*1.15)*2.0/uResolution*gl_Position.w;
          vTip=aTip; vSide=aSide;
        }`}
      fragmentShader={`varying float vAlpha, vTip, vSide; uniform float uOpacity; void main(){
        float edge=1.0-smoothstep(.72,1.0,abs(vSide));
        float tail=mix(.95,.18,vTip);
        gl_FragColor=vec4(.70,.81,.87,vAlpha*uOpacity*edge*tail);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} />
  </mesh>
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
  return <points frustumCulled={false} raycast={() => null}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[attributes.position, 3]} />
      <bufferAttribute attach="attributes-aPhase" args={[attributes.phase, 1]} />
      <bufferAttribute attach="attributes-aLayer" args={[attributes.layer, 1]} />
    </bufferGeometry>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthTest depthWrite={false}
      vertexShader={`attribute float aPhase, aLayer; uniform float uTime; varying float vAlpha; varying vec2 vWind;
        void main(){
          vec3 p=position;
          vec3 wind=normalize(vec3(1.0,-.52,.24));
          p.y=mod(p.y-aPhase*160.0-uTime*(3.8+aLayer*1.15)+162.0,160.0)-2.0;
          // Strong horizontal shear and a bounded crosswind create directional snow划.
          p.x=mod(p.x+360.0+uTime*(15.0+aLayer*2.6)+sin(aPhase*6.283+uTime*.65+p.z*.025)*6.0,720.0)-360.0;
          p.z=mod(p.z+360.0+uTime*(5.2+aLayer*.8)+cos(aPhase*6.283+uTime*.47+p.x*.025)*3.0,720.0)-360.0;
          vec4 view=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*view;
          vWind=normalize((projectionMatrix*viewMatrix*vec4(wind,0.0)).xy);
          gl_PointSize=clamp((2.0+aLayer*2.2)*210.0/max(30.0,-view.z),1.0,9.0);
          float cameraDistance=distance(cameraPosition,p);
          vAlpha=(.18+aLayer*.08)*(1.0-smoothstep(280.0,800.0,cameraDistance))*smoothstep(4.0,16.0,cameraDistance);
        }`}
      fragmentShader={`varying float vAlpha; varying vec2 vWind; uniform float uOpacity;
        void main(){
          vec2 axis=normalize(vWind), q=gl_PointCoord-.5;
          q=vec2(dot(q,axis),dot(q,vec2(-axis.y,axis.x)));
          float radius=length(q/vec2(1.45,.42));
          if(radius>.5) discard;
          float slash=1.0-smoothstep(.12,.5,radius);
          gl_FragColor=vec4(.81,.88,.92,slash*vAlpha*uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
  </points>
}
