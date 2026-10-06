import type { QualityPreset } from './CityScene'

// Both cameras observe the same world-space layer; only optical density changes.
export const heightFogTop = 17
export const heightFogFalloff = 7
export const heightFogBudgets = { high: 2, auto: 2, balanced: 1, low: 0 } satisfies Record<QualityPreset, number>
// Keep the fog sea readable instead of saturating the long overview sight line.
// The close camera needs slightly less attenuation so the megastructure retains detail.
export function heightFogDensity(mode: 'overview' | 'mega') { return mode === 'mega' ? .024 : .032 }

export function heightFogPrimitive(y: number, top = heightFogTop, falloff = heightFogFalloff) {
  if (y >= top) return 0
  if (y <= top - falloff) return y - top + falloff * .5
  return -((top - y) ** 2) / (2 * falloff)
}

export function heightFogOpticalDepth(camera: readonly number[], surface: readonly number[], density: number) {
  const dy = surface[1] - camera[1]
  const distance = Math.hypot(...surface.map((value, axis) => value - camera[axis]))
  const average = Math.abs(dy) < .0001
    ? Math.max(0, Math.min(1, (heightFogTop - (camera[1] + surface[1]) * .5) / heightFogFalloff))
    : (heightFogPrimitive(surface[1]) - heightFogPrimitive(camera[1])) / dy
  return distance * Math.max(0, average) * density
}

export const heightFogGLSL = `
  uniform vec3 uHeightFogColor;
  uniform float uHeightFogDensity, uHeightFogTime, uHeightFogDetail;
  float heightFogPrimitive(float y) {
    if(y>=17.0) return 0.0;
    if(y<=10.0) return y-13.5;
    return -(17.0-y)*(17.0-y)/14.0;
  }
  vec3 applyHeightFog(vec3 color, vec3 world) {
    if(uHeightFogDensity<=0.0) return color;
    float dy=world.y-cameraPosition.y;
    float average=abs(dy)<.0001 ? clamp((17.0-(cameraPosition.y+world.y)*.5)/7.0,0.0,1.0)
      : (heightFogPrimitive(world.y)-heightFogPrimitive(cameraPosition.y))/dy;
    float breakup=1.0;
    if(uHeightFogDetail>.5) breakup=.88+.12*sin(world.x*.033+world.z*.019+uHeightFogTime*.035);
    if(uHeightFogDetail>1.5) breakup*=.93+.07*cos(world.z*.077-world.x*.021-uHeightFogTime*.021);
    float optical=distance(cameraPosition,world)*max(0.0,average)*uHeightFogDensity*breakup;
    return mix(color,uHeightFogColor,1.0-exp(-min(optical,14.0)));
  }
`
