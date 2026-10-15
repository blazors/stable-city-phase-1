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
  night: { hemisphere: .62, fill: .18 },
}

export function sceneFog(time: TimeOfDay, weather: Weather, color: string, overviewDistanceOffset = 0) {
  const { fogNear, fogFar } = weatherLighting[weather]
  // Cool aerial perspective separates the distant skyline without lifting near-field lighting.
  const offset = Math.max(0, overviewDistanceOffset)
  if (time === 'night' && weather === 'haze') return { color: '#344c60', near: fogNear + offset, far: fogFar + offset }
  return { color, near: fogNear + offset, far: fogFar + offset }
}
// Visible strips and receiver lights share world-space positions.
export const megaPracticalPositions: [number, number, number][] = [[-5.83, 11, 5.5], [5.83, 11, 5.5]]
