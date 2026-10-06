import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Mesh, MeshStandardMaterial } from 'three'
import type { QualityPreset } from './CityScene'
import { heightFogBudgets, heightFogDensity, heightFogGLSL } from './heightFogModel'

export function HeightFog({ color, mode, quality }: { color: string; mode: 'overview' | 'mega'; quality: QualityPreset }) {
  const { scene } = useThree()
  const motion = useRef(true), elapsed = useRef(0)
  const uniforms = useMemo(() => ({
    uHeightFogColor: { value: new Color(color) }, uHeightFogDensity: { value: heightFogDensity(mode) },
    uHeightFogTime: { value: 0 }, uHeightFogDetail: { value: heightFogBudgets[quality] },
  }), [])
  useLayoutEffect(() => {
    uniforms.uHeightFogColor.value.set(color)
    uniforms.uHeightFogDensity.value = heightFogDensity(mode)
    uniforms.uHeightFogDetail.value = heightFogBudgets[quality]
  }, [color, mode, quality, uniforms])
  useLayoutEffect(() => {
    const materials = new Set<MeshStandardMaterial>()
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return
      const list = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of list) if (material instanceof MeshStandardMaterial) materials.add(material)
    })
    const restore = [...materials].map(material => {
      const compile = material.onBeforeCompile, cache = material.customProgramCacheKey
      material.onBeforeCompile = (shader, renderer) => {
        compile.call(material, shader, renderer)
        Object.assign(shader.uniforms, uniforms)
        shader.vertexShader = 'varying vec3 vHeightFogWorld;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vec4 heightFogPosition=vec4(transformed,1.0);
          #ifdef USE_INSTANCING
            heightFogPosition=instanceMatrix*heightFogPosition;
          #endif
          vHeightFogWorld=(modelMatrix*heightFogPosition).xyz;`)
        shader.fragmentShader = 'varying vec3 vHeightFogWorld;\n' + heightFogGLSL + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          outgoingLight=applyHeightFog(outgoingLight,vHeightFogWorld);
          #include <opaque_fragment>`)
      }
      material.customProgramCacheKey = () => cache.call(material) + ':height-fog-v1'
      material.needsUpdate = true
      return () => { material.onBeforeCompile = compile; material.customProgramCacheKey = cache; material.needsUpdate = true }
    })
    return () => restore.forEach(reset => reset())
  }, [scene, uniforms])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { motion.current = !preference.matches }
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useFrame((_, delta) => {
    if (motion.current) elapsed.current += Math.min(delta, .05)
    uniforms.uHeightFogTime.value = elapsed.current
  })
  return null
}
