import type { Weather } from './Atmosphere'
import type { TimeOfDay } from './city'
import type { QualityPreset } from './CityScene'

export const lensBudgets = {
  high: { detail: 3, columns: 12, rows: 7 },
  auto: { detail: 2, columns: 10, rows: 6 },
  balanced: { detail: 2, columns: 8, rows: 5 },
  low: { detail: 1, columns: 6, rows: 4 },
} satisfies Record<QualityPreset, { detail: number; columns: number; rows: number }>

export const lensWeatherProfiles = {
  clear: { rain: 0, frost: 0, dew: 0, glow: .025 },
  haze: { rain: 0, frost: 0, dew: .11, glow: .018 },
  rain: { rain: .34, frost: 0, dew: .025, glow: 0 },
  snow: { rain: 0, frost: .27, dew: .035, glow: 0 },
} satisfies Record<Weather, { rain: number; frost: number; dew: number; glow: number }>

// Exact central 60% x 64% stays clear; the feather begins outside it.
export const lensSafeHalfSize = [.30, .32] as const
export function lensEdgeMask(u: number, v: number) {
  const distance = Math.max(Math.abs(u - .5) - lensSafeHalfSize[0], Math.abs(v - .5) - lensSafeHalfSize[1])
  const t = Math.max(0, Math.min(1, distance / .075))
  return t * t * (3 - 2 * t)
}

export function lensStrength(time: TimeOfDay, mode: 'overview' | 'mega') {
  return (time === 'night' ? .65 : 1) * (mode === 'mega' ? .8 : 1)
}
