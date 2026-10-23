import type { TimeOfDay } from './city'
import type { Weather } from './Atmosphere'

export const weatherLighting = {
  clear: { direct: 1, fill: 1, fogNear: 340, fogFar: 920 },
  haze: { direct: .55, fill: 1.12, fogNear: 550, fogFar: 1300 },
  rain: { direct: .40, fill: .98, fogNear: 270, fogFar: 780 },
  snow: { direct: .48, fill: 1.02, fogNear: 245, fogFar: 820 },
}
export const timeLighting: Record<TimeOfDay, { hemisphere: number; fill: number }> = {
  day: { hemisphere: 1.55, fill: .62 },
  sunset: { hemisphere: .88, fill: .35 },
  night: { hemisphere: .84, fill: .30 },
}

export function sceneFog(time: TimeOfDay, weather: Weather, color: string, overviewDistanceOffset = 0) {
  const { fogNear, fogFar } = weatherLighting[weather]
  // Cool aerial perspective separates the distant skyline without lifting near-field lighting.
  const offset = Math.max(0, overviewDistanceOffset)
  if (time === 'night' && weather === 'haze') return { color: '#344c60', near: fogNear + offset, far: fogFar + offset }
  return { color, near: fogNear + offset, far: fogFar + offset }
}

export const megaPracticalTimeMultipliers: Record<TimeOfDay, number> = { day: .1, sunset: .55, night: 1 }
export const megaPracticalLights = [
  { position: [-15, 87.4, 8], target: [-28, 40, 15], baseIntensity: 3200, angle: .35, distance: 80 },
  { position: [15, 87.4, 8], target: [28, 40, 15], baseIntensity: 3200, angle: .35, distance: 80 },
  { position: [-27, 40, 6], target: [-10, 88, 18], baseIntensity: 2200, angle: .36, distance: 80 },
  { position: [27, 40, 6], target: [10, 88, 18], baseIntensity: 2200, angle: .36, distance: 80 },
] as const satisfies { position: [number, number, number]; target: [number, number, number]; baseIntensity: number; angle: number; distance: number }[]

// Visible source housings, aperture strips, and a few subordinate work lights share one batch.
export const megaPracticalFixtures = [
  { position: [-15, 87.4, 8], size: [.32, 1.2, .44], emissiveScale: 1 },
  { position: [15, 87.4, 8], size: [.32, 1.2, .44], emissiveScale: 1 },
  { position: [-27, 40, 6], size: [.34, .32, .42], emissiveScale: 1 },
  { position: [27, 40, 6], size: [.34, .32, .42], emissiveScale: 1 },
  { position: [-27.92, 44, 15], size: [.30, 80, .16], emissiveScale: 1 },
  { position: [27.92, 44, 15], size: [.30, 80, .16], emissiveScale: 1 },
  { position: [0, 87.94, 22], size: [56, .12, .18], emissiveScale: 1 },
  { position: [-27.5, 40, 4], size: [.98, .14, 3.8], emissiveScale: 1 },
  { position: [27.5, 40, 4], size: [.98, .14, 3.8], emissiveScale: 1 },
  { position: [-65, 64.7, 22], size: [.18, .12, 28], emissiveScale: .25 },
  { position: [65, 64.7, 22], size: [.18, .12, 28], emissiveScale: .25 },
  { position: [0, 17.08, -18], size: [28, .12, .18], emissiveScale: .25 },
] as const satisfies { position: [number, number, number]; size: [number, number, number]; emissiveScale: number }[]

const clampLightLevel = (level: number) => Math.max(0, Math.min(1, Number.isFinite(level) ? level : .55))
export function megaPracticalMoodMultiplier(lightLevel = .55) {
  return .72 + clampLightLevel(lightLevel) * .28
}
export function megaPracticalSpotIntensity(time: TimeOfDay, lightLevel = .55, baseIntensity = 3200) {
  return baseIntensity * megaPracticalTimeMultipliers[time] * megaPracticalMoodMultiplier(lightLevel)
}
export function megaPracticalStripIntensity(time: TimeOfDay, lightLevel = .55) {
  return 1.85 * megaPracticalTimeMultipliers[time] * megaPracticalMoodMultiplier(lightLevel)
}
