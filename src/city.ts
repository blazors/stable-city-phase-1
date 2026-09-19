export type TimeOfDay = 'day' | 'sunset' | 'night'
export type Building = { id: string; x: number; z: number; width: number; depth: number; height: number; tone: number }
export type Block = { id: string; x: number; z: number; kind: 'urban' | 'void' | 'mega' }
export type Parcel = { id: string; blockId: string; buildingId: string; x: number; z: number; width: number; depth: number; density: 'core' | 'edge' }
export type UrbanGrammar = { primaryAxis: 'north-south'; secondaryRoads: number; localStreets: number; publicVoids: number; densityBands: Array<'core' | 'edge'> }
export type TransportGraph = { mainSpine: 'east-west'; elevatedRail: boolean; stationCount: number }
export type StableCity = { seed: number; blocks: Block[]; buildings: Building[]; parcels: Parcel[]; urbanGrammar: UrbanGrammar; transport: TransportGraph; heroBlock: string; secondaryPeaks: string[]; publicVoids: string[]; signature: string }
type StableCityData = Omit<StableCity, 'signature'>

export function getStableCitySignature(city: StableCityData): string {
  const source = JSON.stringify({ seed: city.seed, blocks: city.blocks, buildings: city.buildings, parcels: city.parcels, urbanGrammar: city.urbanGrammar, transport: city.transport, heroBlock: city.heroBlock, secondaryPeaks: city.secondaryPeaks, publicVoids: city.publicVoids })
  let hash = 2166136261
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `stable-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function validateStableCity(city: StableCity): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  if (city.blocks.length !== 16) issues.push('blocks')
  if (city.buildings.length !== 60) issues.push('buildings')
  if (city.parcels.length !== city.buildings.length) issues.push('parcels')
  if (city.urbanGrammar.primaryAxis !== 'north-south' || city.urbanGrammar.secondaryRoads !== 4 || city.urbanGrammar.localStreets !== 16 || city.urbanGrammar.publicVoids !== 2 || city.urbanGrammar.densityBands.join('|') !== 'core|edge') issues.push('urbanGrammar')
  if (city.transport.mainSpine !== 'east-west' || !city.transport.elevatedRail || city.transport.stationCount !== 1) issues.push('transport')
  if (city.heroBlock !== '1:2' || city.secondaryPeaks.length !== 2 || city.publicVoids.length !== 2) issues.push('composition')
  if (getStableCitySignature(city) !== city.signature) issues.push('signature')
  return { valid: issues.length === 0, issues }
}

// Mulberry32 makes layout independent from rendering, theme, and environment state.
const random = (seed: number) => () => { let t = seed += 0x6d2b79f5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }

export function createStableCity(seed = 240319): StableCity {
  const rand = random(seed)
  const blocks: Block[] = []
  const buildings: Building[] = []
  const parcels: Parcel[] = []
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
        const building = { id: `${key}-${n}`, x: x - 4.3 + gx * 6 + rand() * 1.2, z: z - 4.4 + gz * 5.5 + rand() * 1.2, width: 3 + rand() * 1.8, depth: 3 + rand() * 2, height, tone: rand() }
        buildings.push(building)
        parcels.push({ id: `parcel-${building.id}`, blockId: key, buildingId: building.id, x: building.x, z: building.z, width: building.width + 1.2, depth: building.depth + 1.2, density: col === 1 || col === 2 ? 'core' : 'edge' })
      }
    }
  }
  const urbanGrammar: UrbanGrammar = { primaryAxis: 'north-south', secondaryRoads: 4, localStreets: 16, publicVoids: blocks.filter(block => block.kind === 'void').length, densityBands: ['core', 'edge'] }
  const transport: TransportGraph = { mainSpine: 'east-west', elevatedRail: true, stationCount: 1 }
  const publicVoids = blocks.filter(block => block.kind === 'void').map(block => block.id)
  const stableCity = { seed, blocks, buildings, parcels, urbanGrammar, transport, heroBlock: '1:2', secondaryPeaks: ['0:3', '3:0'], publicVoids }
  return { ...stableCity, signature: getStableCitySignature(stableCity) }
}
