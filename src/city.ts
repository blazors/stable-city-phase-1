export type TimeOfDay = 'day' | 'sunset' | 'night'
export type Building = { id: string; x: number; z: number; width: number; depth: number; height: number; tone: number }
export type Block = { id: string; x: number; z: number; kind: 'urban' | 'void' | 'mega' }
export type StableCity = { seed: number; blocks: Block[]; buildings: Building[] }

// Mulberry32 makes layout independent from rendering, theme, and environment state.
const random = (seed: number) => () => { let t = seed += 0x6d2b79f5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }

export function createStableCity(seed = 240319): StableCity {
  const rand = random(seed)
  const blocks: Block[] = []
  const buildings: Building[] = []
  const spacing = 18
  const voidIds = new Set(['1:1', '2:1'])
  const megaIds = new Set(['1:2', '2:2'])
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    const key = `${col}:${row}`
    const x = (col - 1.5) * spacing
    const z = (row - 1.5) * spacing
    const kind = megaIds.has(key) ? 'mega' : voidIds.has(key) ? 'void' : 'urban'
    blocks.push({ id: key, x, z, kind })
    if (kind === 'urban') {
      const peak = (col === 0 && row === 3) || (col === 3 && row === 0)
      for (let n = 0; n < 5; n++) {
      const gx = n % 2, gz = Math.floor(n / 2)
      const density = (col === 1 || col === 2) ? 1.2 : 0.82
      const height = (6 + rand() * 15 + (peak ? 17 : 0)) * density
        buildings.push({ id: `${key}-${n}`, x: x - 4.3 + gx * 6 + rand() * 1.2, z: z - 4.4 + gz * 5.5 + rand() * 1.2, width: 3 + rand() * 1.8, depth: 3 + rand() * 2, height, tone: rand() })
      }
    }
  }
  return { seed, blocks, buildings }
}
