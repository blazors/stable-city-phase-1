import type { TimeOfDay } from './city'
import type { Weather } from './Atmosphere'

export const weatherLighting = {
  clear: { direct: 1, fill: 1, fogNear: 340, fogFar: 920 },
  haze: { direct: .55, fill: 1.12, fogNear: 550, fogFar: 1300 },
  rain: { direct: .40, fill: .98, fogNear: 270, fogFar: 780 },
  snow: { direct: .48, fill: 1.02, fogNear: 245, fogFar: 820 },
}
export const timeLighting: Record<TimeOfDay, { hemisphere: number; fill: number }> = {
  day: { hemisphere: 1.8, fill: .75 },
  sunset: { hemisphere: 1.0, fill: .42 },
  night: { hemisphere: .62, fill: .18 },
}

export function sceneFog(time: TimeOfDay, weather: Weather, color: string) {
  const { fogNear, fogFar } = weatherLighting[weather]
  // Cool aerial perspective separates the distant skyline without lifting near-field lighting.
  if (time === 'night' && weather === 'haze') return { color: '#344c60', near: fogNear, far: fogFar }
  return { color, near: fogNear, far: fogFar }
}
// Visible strips and receiver lights share world-space positions.
export const megaPracticalPositions: [number, number, number][] = [[-5.83, 11, 5.5], [5.83, 11, 5.5]]
