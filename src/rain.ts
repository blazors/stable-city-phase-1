import type { TimeOfDay } from './city'

export const rainBudgets = { auto: 1600, high: 2400, balanced: 1500, low: 600 }
export const rainPalettes = {
  day: { zenith: '#617888', horizon: '#a0afb4', haze: '#91a5af', water: '#324f5b', sun: '#d2dce1', ambient: '#b9ccd8', cloud: '#899aa5', shadow: '#465967' },
  sunset: { zenith: '#4d596c', horizon: '#adb0b2', haze: '#8996a2', water: '#344957', sun: '#d5c4b5', ambient: '#b4c1d0', cloud: '#8d969e', shadow: '#424f60' },
  night: { zenith: '#111e30', horizon: '#344858', haze: '#2c4254', water: '#152e3b', sun: '#aabbd0', ambient: '#819dbb', cloud: '#4d647b', shadow: '#23364a' },
} satisfies Record<TimeOfDay, Record<string, string>>

// Stable buffers; each pair is one world-space rain streak. Three scales share one draw.
export function createRainAttributes(count: number, seed = 6173) {
  const position = new Float32Array(count * 6), phase = new Float32Array(count * 2), layer = new Float32Array(count * 2), tip = new Float32Array(count * 2)
  let state = seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  // Near (2) is sparse, middle (1) dominates, far (0) stays short and faint.
  const nearCount = Math.round(count * .15), middleCount = Math.round(count * .55)
  const layers = new Uint8Array(count)
  layers.fill(2, 0, nearCount); layers.fill(1, nearCount, nearCount + middleCount)
  let shuffleState = (seed ^ 0x9e3779b9) >>> 0
  for (let i = count - 1; i > 0; i--) {
    shuffleState = (Math.imul(shuffleState, 1664525) + 1013904223) >>> 0
    const j = Math.floor(shuffleState / 4294967296 * (i + 1))
    const previous = layers[i]; layers[i] = layers[j]; layers[j] = previous
  }
  for (let i = 0; i < count; i++) {
    const scale = layers[i], x = (random() - .5) * 720, y = random() * 160, z = (random() - .5) * 720
    const offset = i * 6, start = random()
    position.set([x, y, z, x, y, z], offset)
    tip[i * 2 + 1] = 1
    phase[i * 2] = phase[i * 2 + 1] = start
    layer[i * 2] = layer[i * 2 + 1] = scale
  }
  return { position, phase, layer, tip }
}
