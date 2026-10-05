import type { TimeOfDay } from './city'

export const snowBudgets = { high: 1600, auto: 1200, balanced: 1000, low: 400 }
export const snowPalettes = {
  day: { zenith: '#788f9f', horizon: '#bfced2', haze: '#a6bbc5', water: '#304e5b', sun: '#dce4e7', ambient: '#c3d6e1', cloud: '#b2c2ca', shadow: '#718594' },
  sunset: { zenith: '#6a7a92', horizon: '#bcc1ca', haze: '#9caebb', water: '#304958', sun: '#ded0c4', ambient: '#bfcddd', cloud: '#aab8c8', shadow: '#5b6d86' },
  night: { zenith: '#15243a', horizon: '#41566e', haze: '#344b61', water: '#172f3c', sun: '#bfd0e1', ambient: '#91abc8', cloud: '#718ba3', shadow: '#344960' },
} satisfies Record<TimeOfDay, Record<string, string>>

type SurfaceBox = { position: [number, number, number]; size: [number, number, number] }
export function snowCaps(surfaces: SurfaceBox[]): SurfaceBox[] {
  return surfaces.map(({ position: [x, y, z], size: [width, height, depth] }) => ({ position: [x, y + height / 2 + .075, z], size: [width * .96, .10, depth * .96] }))
}

export function snowRoadEdges(roads: SurfaceBox[]): SurfaceBox[] {
  return roads.flatMap(({ position: [x, y, z], size: [width, height, depth] }) => [-1, 1].map(side => width < depth
    ? { position: [x + side * (width / 2 - .12), y + height / 2 + .055, z] as [number, number, number], size: [.22, .06, depth] as [number, number, number] }
    : { position: [x, y + height / 2 + .055, z + side * (depth / 2 - .12)] as [number, number, number], size: [width, .06, .22] as [number, number, number] }))
}
