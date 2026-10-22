import { megaConfig, type Vec3 } from './sceneConfig'
import type { Building } from './city'

export type MegaBox = { position: Vec3; size: Vec3; rotation?: Vec3 }

export const megaStructureBounds = { width: megaConfig.dimensions.width, height: megaConfig.dimensions.height, depth: megaConfig.dimensions.depth, center: megaConfig.center } as const

export const megaRoofSupportTop = megaStructureBounds.height
export const megaRoofFascia: MegaBox = { position: [0, 110, 20], size: [132, 16, 44] }
export const megaRoofDeck: MegaBox = { position: [0, 121, 21], size: [140, 6, 50] }

export const megaMainBodies: MegaBox[] = [
  { position: [-42, 53, 20], size: [20, 78, 40] },
  { position: [42, 53, 20], size: [20, 78, 40] },
  { position: [-55, 7, 20], size: [26, 14, 44] },
  { position: [55, 7, 20], size: [26, 14, 44] },
  { position: [0, 97, 20], size: [124, 10, 40] },
  megaRoofFascia,
  megaRoofDeck,
  ...[1, -1].flatMap(side => [
    { position: [side * 59, side === 1 ? 24 : 23, side === 1 ? 22 : 24] as Vec3, size: [20, side === 1 ? 20 : 18, side === 1 ? 36 : 32] as Vec3 },
    { position: [side * 59, side === 1 ? 43 : 37, side === 1 ? 22 : 24] as Vec3, size: [16, side === 1 ? 18 : 10, side === 1 ? 32 : 30] as Vec3 },
    { position: [side * 58, side === 1 ? 53 : 43, side === 1 ? 22 : 24] as Vec3, size: [24, 2, side === 1 ? 38 : 34] as Vec3 },
  ]),
  { position: [-11.75, 18, 41], size: [40.5, 1.2, 10] },
  { position: [23.75, 18, 41], size: [16.5, 1.2, 10] },
  { position: [0, 16.9, 41], size: [64, 1, 4] },
  ...[-28, 28].flatMap(x => [8, 36].map(z => ({ position: [x, 8.7, z] as Vec3, size: [1.8, 17.4, 1.8] as Vec3 }))),
]

// The opening is a true through-portal. Its side pillars and overhead beam are
// structural bodies; no inset or rear wall may occupy the 66 x 66 x 36 void.
export const megaGateInset: MegaBox[] = []

export const megaMajorBraces: MegaBox[] = [
  ...[-1, 1].flatMap(side => [1, 35].map(z => ({ position: [side * 55, 52, z] as Vec3, size: [8, 84.853, 10] as Vec3, rotation: [0, 0, side === 1 ? .141897 : -.141897] as Vec3 }))),
  ...[-52, -46, -40, -34, 34, 40, 46, 52].flatMap(x => [-1.5, 41.5].map(z => ({ position: [x, 64, z] as Vec3, size: [1.4, 100, 3] as Vec3 }))),
  ...[-60, -24, -12, 0, 12, 24, 60].map(x => ({ position: [x, 110, -2.8] as Vec3, size: [1.6, 16, 2.4] as Vec3 })),
  ...[-28, 28].map(x => ({ position: [x, 18, 18] as Vec3, size: [8, 1.2, 36] as Vec3 })),
]
export const megaDoorPillars = megaMainBodies.slice(0, 2)
export const megaDoorBeam = megaMainBodies[4]
export const megaDeepEntrance = megaGateInset[0]

type BridgeNode = Vec3
export type MegaBridgeGeometry = { decks: MegaBox[]; rails: MegaBox[]; supports: MegaBox[]; platform: MegaBox }

const bridgeSegment = (from: BridgeNode, to: BridgeNode, width: number, thickness: number, yOffset = 0): MegaBox => {
  const dx = to[0] - from[0], dz = to[2] - from[2], length = Math.hypot(dx, dz)
  return { position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + yOffset, (from[2] + to[2]) / 2], size: [width, thickness, length], rotation: [0, Math.atan2(dx, dz), 0] }
}

export function createMegaBridgeGeometry(): MegaBridgeGeometry {
  const width = 7
  const decks: MegaBox[] = [], rails: MegaBox[] = [], supports: MegaBox[] = []
  const path = megaConfig.bridgePath
  const platform: MegaBox = { position: [12, 18, 62], size: [18, 1.2, 14] }
  for (let i = 0; i < path.length - 1; i++) {
    const to = i === path.length - 2
      ? [path[i + 1][0], path[i + 1][1], platform.position[2] - platform.size[2] / 2] as Vec3
      : path[i + 1]
    decks.push(bridgeSegment(path[i], to, width, 1.2))
  }
  for (let i = 1; i < path.length - 1; i++) {
    const before = path[i], previous = path[i - 1], next = path[i + 1]
    const incoming = Math.atan2(before[0] - previous[0], before[2] - previous[2])
    const outgoing = Math.atan2(next[0] - before[0], next[2] - before[2])
    if (Math.abs(incoming - outgoing) > .001) decks.push({ position: [before[0], before[1], before[2]], size: [7.2, 1.2, 7.2] })
  }
  const railOffset = width / 2 - .375
  for (const side of [-1, 1]) {
    const railNodes = path.map((node, index) => {
      const previous = path[Math.max(0, index - 1)], next = path[Math.min(path.length - 1, index + 1)]
      const previousAngle = index ? Math.atan2(node[0] - previous[0], node[2] - previous[2]) : Math.atan2(next[0] - node[0], next[2] - node[2])
      const nextAngle = index < path.length - 1 ? Math.atan2(next[0] - node[0], next[2] - node[2]) : previousAngle
      const offsetPoint = (angle: number) => [node[0] + Math.cos(angle) * side * railOffset, node[2] - Math.sin(angle) * side * railOffset]
      const a = offsetPoint(previousAngle), b = offsetPoint(nextAngle)
      if (index === 0 || index === path.length - 1 || Math.abs(previousAngle - nextAngle) < 1e-5) return [a[0], node[1] + .825, a[1]] as Vec3
      const half = (previousAngle + nextAngle) / 2, scale = railOffset / Math.max(.25, Math.cos((nextAngle - previousAngle) / 2))
      return [node[0] + Math.cos(half) * side * scale, node[1] + .825, node[2] - Math.sin(half) * side * scale] as Vec3
    })
    for (let i = 0; i < railNodes.length - 1; i++) rails.push(bridgeSegment(railNodes[i], railNodes[i + 1], .25, .45))
  }
  const piers = [
    ...path.slice(0, 4).map((node, index) => ({ node, angle: Math.atan2(path[index + 1][0] - node[0], path[index + 1][2] - node[2]) })),
    ...([ [12, 18, 6], [12, 18, 30], [12, 18, 62] ] as Vec3[]).map(node => ({ node, angle: 0 })),
  ]
  for (const { node: [x, , z], angle } of piers) {
    const pierHeight = megaConfig.bridgeHeight - 1
    supports.push({ position: [x, pierHeight / 2, z], size: [1.4, pierHeight, 1.4] })
    supports.push({ position: [x, 16.9, z], size: [8, 1, 1.4], rotation: [0, angle, 0] })
  }
  return { decks, rails, supports, platform }
}

export function createMegaStructureGeometry() {
  return {
    bodies: megaMainBodies.map(item => ({ ...item, position: [...item.position] as Vec3, size: [...item.size] as Vec3 })),
    inset: megaGateInset.map(item => ({ ...item, position: [...item.position] as Vec3, size: [...item.size] as Vec3 })),
    braces: megaMajorBraces.map(item => ({ ...item, position: [...item.position] as Vec3, size: [...item.size] as Vec3, rotation: item.rotation ? [...item.rotation] as Vec3 : undefined })),
  }
}

export function intersectsMegaHeroFootprint(position: Vec3, size: Vec3, margin = 0) {
  return position[0] - size[0] / 2 < megaHeroClearanceRegion.maxX + margin &&
    position[0] + size[0] / 2 > megaHeroClearanceRegion.minX - margin &&
    position[2] - size[2] / 2 < megaHeroClearanceRegion.maxZ + margin &&
    position[2] + size[2] / 2 > megaHeroClearanceRegion.minZ - margin
}

export function intersectsMegaBridgeCorridor(position: Vec3, size: Vec3, margin = 3) {
  const radius = Math.max(size[0], size[2]) / 2 + margin
  for (let i = 0; i < megaConfig.bridgePath.length - 1; i++) {
    const from = megaConfig.bridgePath[i], to = megaConfig.bridgePath[i + 1]
    const dx = to[0] - from[0], dz = to[2] - from[2]
    const lengthSquared = dx * dx + dz * dz
    const t = Math.max(0, Math.min(1, ((position[0] - from[0]) * dx + (position[2] - from[2]) * dz) / lengthSquared))
    const nearestX = from[0] + t * dx, nearestZ = from[2] + t * dz
    if (Math.hypot(position[0] - nearestX, position[2] - nearestZ) <= radius) return true
  }
  return false
}

export type MegaClearanceRegion = { minX: number; maxX: number; minZ: number; maxZ: number }
export const megaHeroClearanceRegion: MegaClearanceRegion = {
  minX: -megaConfig.clearance.width / 2,
  maxX: megaConfig.clearance.width / 2,
  minZ: megaConfig.frontZ,
  maxZ: megaConfig.frontZ + megaConfig.clearance.depth,
}
const megaHeroClearanceEnvelope: MegaClearanceRegion = {
  minX: megaHeroClearanceRegion.minX - megaConfig.clearance.margin,
  maxX: megaHeroClearanceRegion.maxX + megaConfig.clearance.margin,
  minZ: megaHeroClearanceRegion.minZ - megaConfig.clearance.margin,
  maxZ: megaHeroClearanceRegion.maxZ + megaConfig.clearance.margin,
}

type StableCityLike = { buildings: Building[] }
type StableBuilding = Building
const overlapsClearance = (building: StableBuilding, region: MegaClearanceRegion) =>
  building.x - building.width / 2 < region.maxX && building.x + building.width / 2 > region.minX &&
  building.z - building.depth / 2 < region.maxZ && building.z + building.depth / 2 > region.minZ

/** Rendering-only clearance; StableCity data and its signature remain unchanged. */
export function deriveMegaHeroClearance(city: StableCityLike) {
  const clearedBuildingIds = city.buildings.filter(building => overlapsClearance(building, megaHeroClearanceEnvelope) || intersectsMegaBridgeCorridor([building.x, 0, building.z], [building.width, 1, building.depth])).map(building => building.id)
  const cleared = new Set(clearedBuildingIds)
  return { region: megaHeroClearanceRegion, envelope: megaHeroClearanceEnvelope, clearedBuildingIds, visibleBuildings: city.buildings.filter(building => !cleared.has(building.id)) }
}
