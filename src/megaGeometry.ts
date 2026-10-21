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

export const megaMainBodies: MegaBox[] = [
  { position: [-27, 48, 9], size: [10, 96, 18] },
  { position: [27, 48, 9], size: [10, 96, 18] },
  { position: [0, 72, 9], size: [44, 14, 18] },
  { position: [0, 90, 9], size: [44, 12, 18] },
]

export const megaGateInset: MegaBox[] = [
  { position: [0, 28, 4.5], size: [36, 56, .55] },
  { position: [-18, 32, 3.5], size: [.8, 64, 6] },
  { position: [18, 32, 3.5], size: [.8, 64, 6] },
  { position: [0, 60, 3.5], size: [36, .8, 6] },
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
