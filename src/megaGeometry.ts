import { megaConfig, type Vec3 } from './sceneConfig'
import type { Building } from './city'

export type MegaBox = { position: Vec3; size: Vec3; rotation?: Vec3 }

export const megaStructureBounds = { width: megaConfig.dimensions.width, height: megaConfig.dimensions.height, depth: megaConfig.dimensions.depth, center: megaConfig.center } as const

// Keep the roof layers physically separated. Interpenetrating thin slabs and
// fins produce unstable depth/shadow results while orbiting close to the hero.
export const megaRoofSupportTop = megaStructureBounds.height
export const megaRoofFascia: MegaBox = { position: [0, megaRoofSupportTop - 2, 18], size: [132, 4, 40] }
export const megaRoofDeck: MegaBox = { position: [0, megaRoofSupportTop - 4.1, 18], size: [126, .12, 38] }
export const megaRoofRibY = megaRoofSupportTop + 1
export const megaRoofRibHeight = 1

export const megaMainBodies: MegaBox[] = [
  { position: [-44, 40, 18], size: [22, 52, 36] },
  { position: [44, 40, 18], size: [22, 52, 36] },
  { position: [-51, 7, 18], size: [30, 14, 40] },
  { position: [51, 7, 18], size: [30, 14, 40] },
  { position: [0, 77, 18], size: [120, 22, 36] },
]

// The opening is a true through-portal. Its side pillars and overhead beam are
// structural bodies; no inset or rear wall may occupy the 66 x 66 x 36 void.
export const megaGateInset: MegaBox[] = []

export const megaMajorBraces: MegaBox[] = [
  { position: [-44, 40, 2], size: [8, 52, 8], rotation: [0, 0, -.22] },
  { position: [-44, 40, 34], size: [8, 52, 8], rotation: [0, 0, -.22] },
  { position: [44, 40, 2], size: [8, 52, 8], rotation: [0, 0, .22] },
  { position: [44, 40, 34], size: [8, 52, 8], rotation: [0, 0, .22] },
]
export const megaDoorPillars = megaMainBodies.slice(0, 2)
export const megaDoorBeam = megaMainBodies[4]
export const megaDeepEntrance = megaGateInset[0]

type BridgeNode = Vec3
export type MegaBridgeGeometry = { decks: MegaBox[]; rails: MegaBox[]; supports: MegaBox[]; platform: MegaBox }

const bridgeSegment = (from: BridgeNode, to: BridgeNode, width: number, yOffset = 0): MegaBox => {
  const dx = to[0] - from[0], dz = to[2] - from[2], length = Math.hypot(dx, dz)
  return { position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + yOffset, (from[2] + to[2]) / 2], size: [width, .8, length], rotation: [0, Math.atan2(dx, dz), 0] }
}

export function createMegaBridgeGeometry(): MegaBridgeGeometry {
  const width = 6
  const decks: MegaBox[] = [], rails: MegaBox[] = [], supports: MegaBox[] = []
  for (let i = 0; i < megaConfig.bridgePath.length - 1; i++) {
    const from = megaConfig.bridgePath[i], to = megaConfig.bridgePath[i + 1]
    const dx = to[0] - from[0], dz = to[2] - from[2], angle = Math.atan2(dx, dz)
    decks.push(bridgeSegment(from, to, width))
    for (const side of [-1, 1]) {
      const offsetX = Math.cos(angle) * side * (width / 2 - .24), offsetZ = -Math.sin(angle) * side * (width / 2 - .24)
      rails.push({ ...bridgeSegment(from, to, .28, .58), position: [(from[0] + to[0]) / 2 + offsetX, (from[1] + to[1]) / 2 + .58, (from[2] + to[2]) / 2 + offsetZ] })
    }
  }
  // Three grounded piers plus a fourth at the gate approach keep the elevated
  // route legible as a supported platform instead of a floating ribbon.
  for (const [x, , z] of megaConfig.bridgePath.slice(0, 3)) {
    supports.push({ position: [x, megaConfig.bridgeHeight / 2, z], size: [.9, megaConfig.bridgeHeight, .9] })
    supports.push({ position: [x, megaConfig.bridgeHeight - .55, z], size: [width + 1, .7, 1.1] })
  }
  const last = megaConfig.bridgePath.at(-1)!
  return { decks, rails, supports, platform: { position: [0, 15, 37], size: [12, .8, 14] } }
}

export function createMegaStructureGeometry() {
  return {
    bodies: megaMainBodies.map(item => ({ ...item, position: [...item.position] as Vec3, size: [...item.size] as Vec3 })),
    inset: megaGateInset.map(item => ({ ...item, position: [...item.position] as Vec3, size: [...item.size] as Vec3 })),
    braces: megaMajorBraces.map(item => ({ ...item, position: [...item.position] as Vec3, size: [...item.size] as Vec3, rotation: item.rotation ? [...item.rotation] as Vec3 : undefined })),
  }
}

export function createMegaRoofRibs(): MegaBox[] {
  const ribs: MegaBox[] = []
  for (let x = -48; x <= 48; x += 12) ribs.push({ position: [x, megaRoofRibY, 18], size: [1, megaRoofRibHeight, 36] })
  return ribs
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
