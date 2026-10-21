import { megaConfig, type Vec3 } from './sceneConfig'
import type { Building } from './city'

export type MegaBox = { position: Vec3; size: Vec3; rotation?: Vec3 }

export const megaStructureBounds = { width: megaConfig.dimensions.width, height: megaConfig.dimensions.height, depth: megaConfig.dimensions.depth, center: megaConfig.center } as const

// Keep the roof layers physically separated. Interpenetrating thin slabs and
// fins produce unstable depth/shadow results while orbiting close to the hero.
export const megaRoofSupportTop = megaStructureBounds.height
export const megaRoofFascia: MegaBox = { position: [0, megaRoofSupportTop + .2, 9], size: [64, .14, 18] }
export const megaRoofDeck: MegaBox = { position: [0, megaRoofSupportTop + .45, 9], size: [60, .12, 16] }
export const megaRoofRibY = megaRoofSupportTop + 2
export const megaRoofRibHeight = 2.1

const gateHeight = megaConfig.gate.height * megaConfig.gateHeightScale
const gateDepth = megaConfig.gate.depth
const gateBeamDepth = Math.min(megaConfig.beamDepth, gateDepth)

export const megaMainBodies: MegaBox[] = [
  { position: [-27, 48, 9], size: [10, 96, 18] },
  { position: [27, 48, 9], size: [10, 96, 18] },
  { position: [0, 72, 9], size: [44, 14, 18] },
  { position: [0, 90, 9], size: [44, 12, 18] },
]

export const megaGateInset: MegaBox[] = [
  // The rear wall is deliberately deep in the portal. The front remains a
  // negative-space opening so the hero camera reads a real tunnel, not a decal.
  { position: [0, gateHeight / 2, gateDepth - .8], size: [megaConfig.portalWidth, gateHeight, .8] },
  { position: [-megaConfig.portalWidth / 2, gateHeight / 2, gateDepth / 2], size: [.8, gateHeight + 8, gateDepth] },
  { position: [megaConfig.portalWidth / 2, gateHeight / 2, gateDepth / 2], size: [.8, gateHeight + 8, gateDepth] },
  { position: [0, gateHeight, gateDepth / 2], size: [megaConfig.portalWidth, .8, gateDepth] },
  { position: [0, gateHeight - .45, gateBeamDepth / 2], size: [megaConfig.portalWidth + .8, .55, gateBeamDepth] },
]

export const megaMajorBraces: MegaBox[] = [
  { position: [-23, 43, 1.2], size: [3.2, 58, .9], rotation: [0, 0, -.34] },
  { position: [23, 43, 1.2], size: [3.2, 58, .9], rotation: [0, 0, .34] },
  { position: [-27, 74, 1.2], size: [2.4, 38, .8], rotation: [0, 0, .36] },
  { position: [27, 74, 1.2], size: [2.4, 38, .8], rotation: [0, 0, -.36] },
]
export const megaDoorPillars = megaMainBodies.slice(0, 2)
export const megaDoorBeam = megaMainBodies[2]
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
  return { decks, rails, supports, platform: { position: [last[0], last[1], last[2] + 2.2], size: [width, .8, 4.4] } }
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
  for (let x = -30; x <= 30; x += 2.4) ribs.push({ position: [x, megaRoofRibY, 9], size: [.32, megaRoofRibHeight, 16.5] })
  return ribs
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
  const clearedBuildingIds = city.buildings.filter(building => overlapsClearance(building, megaHeroClearanceEnvelope)).map(building => building.id)
  const cleared = new Set(clearedBuildingIds)
  return { region: megaHeroClearanceRegion, envelope: megaHeroClearanceEnvelope, clearedBuildingIds, visibleBuildings: city.buildings.filter(building => !cleared.has(building.id)) }
}
