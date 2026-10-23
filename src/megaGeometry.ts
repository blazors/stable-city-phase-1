import { megaConfig, type Vec3 } from './sceneConfig'
import type { Building } from './city'

export type Quaternion = [number, number, number, number]
export type MegaBox = { position: Vec3; size: Vec3; rotation?: Vec3; quaternion?: Quaternion }

export const megaStructureBounds = { width: megaConfig.dimensions.width, height: megaConfig.dimensions.height, depth: megaConfig.dimensions.depth, center: megaConfig.center } as const

export const megaRoofSupportTop = megaStructureBounds.height
export const megaRoofFascia: MegaBox = { position: [0, 118.4, 22], size: [126, 4.8, 36] }
export const megaRoofDeck: MegaBox = { position: [0, 121.3, 22], size: [130, .6, 40] }
export const megaServiceBoxes: MegaBox[] = [
  { position: [-65, 74, 22], size: [18, 20, 34] },
  { position: [65, 74, 22], size: [18, 20, 34] },
]
export const megaServicePlatforms: MegaBox[] = [
  { position: [-65, 66, 22], size: [24, 2.4, 40] },
  { position: [65, 66, 22], size: [24, 2.4, 40] },
]

export const megaMainBodies: MegaBox[] = [
  { position: [-43, 44, 22], size: [30, 88, 40] },
  { position: [43, 44, 22], size: [30, 88, 40] },
  { position: [0, 97, 22], size: [116, 18, 40] },
  megaRoofFascia,
  megaRoofDeck,
  ...megaServiceBoxes,
  ...megaServicePlatforms,
  { position: [-70, 3, 22], size: [40, 6, 104] },
  { position: [70, 3, 22], size: [40, 6, 104] },
]

// The opening is a true through-portal: no solid may occupy its clear volume.
export const megaGateInset: MegaBox[] = []

const beamBetween = (from: Vec3, to: Vec3, width: number, depth: number): MegaBox => {
  const direction: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
  const length = Math.hypot(...direction)
  const unit: Vec3 = direction.map(value => value / length) as Vec3
  // Quaternion rotating a box's local +Y axis onto the endpoint direction.
  const q: Quaternion = [unit[2], 0, -unit[0], 1 + unit[1]]
  const qLength = Math.hypot(...q)
  return {
    position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
    size: [width, length, depth],
    quaternion: q.map(value => value / qLength) as Quaternion,
  }
}

export function createMegaRoofVertices() {
  const lower: Vec3[] = [[-62, 106, 1], [-62, 106, 43], [62, 106, 43], [62, 106, 1]]
  const upper: Vec3[] = [[-70, 116, -3], [-70, 116, 47], [70, 116, 47], [70, 116, -3]]
  const vertices: number[] = []
  const triangle = (a: Vec3, b: Vec3, c: Vec3) => vertices.push(...a, ...b, ...c)
  triangle(lower[0], lower[2], lower[1]); triangle(lower[0], lower[3], lower[2])
  triangle(upper[0], upper[1], upper[2]); triangle(upper[0], upper[2], upper[3])
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4
    triangle(lower[i], lower[next], upper[next])
    triangle(lower[i], upper[next], upper[i])
  }
  return vertices
}

export const megaRoofFrame: MegaBox[] = [
  { position: [0, 123.2, -3], size: [140, .8, .8] },
  { position: [0, 123.2, 47], size: [140, .8, .8] },
  { position: [-70, 123.2, 22], size: [.8, .8, 50] },
  { position: [70, 123.2, 22], size: [.8, .8, 50] },
]

export const megaLongitudinalRibs: MegaBox[] = [-1, 1].flatMap(side => [1.8, 42.2].flatMap(z => [31, 39, 47, 55].map(offset => ({
  position: [side * offset, 46, z] as Vec3,
  size: [1.4, 84, 2.4] as Vec3,
}))))

export const megaDoorFrames: MegaBox[] = [1.1, 22, 42.9].flatMap(z => [
  { position: [-29, 44, z] as Vec3, size: [1, 88, 1.6] as Vec3 },
  { position: [29, 44, z] as Vec3, size: [1, 88, 1.6] as Vec3 },
  { position: [0, 88.6, z] as Vec3, size: [58, 1.2, 1.6] as Vec3 },
])

export const megaServiceBraces: MegaBox[] = [-1, 1].flatMap(side => [5, 39].map(z => beamBetween(
  [side * 58, 62, z], [side * 75, 66, z], 2.2, 2.2,
)))

export const megaMajorBraces: MegaBox[] = [
  ...[-1, 1].flatMap(side => [
    beamBetween([side * 78, 6, -22], [side * 55, 78, 5], 10, 12),
    beamBetween([side * 78, 6, 66], [side * 55, 78, 39], 10, 12),
  ]),
]
export const megaDoorPillars = megaMainBodies.slice(0, 2)
export const megaDoorBeam = megaMainBodies[2]
export const megaDeepEntrance = megaGateInset[0]

type BridgeNode = Vec3
export type MegaBridgeGeometry = { decks: MegaBox[]; joints: MegaBox[]; girders: MegaBox[]; rails: MegaBox[]; railPosts: MegaBox[]; supports: MegaBox[] }

const bridgeSegment = (from: BridgeNode, to: BridgeNode, width: number, thickness: number, yOffset = 0): MegaBox => {
  const dx = to[0] - from[0], dz = to[2] - from[2], length = Math.hypot(dx, dz)
  return { position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + yOffset, (from[2] + to[2]) / 2], size: [width, thickness, length], rotation: [0, Math.atan2(dx, dz), 0] }
}

export function createMegaBridgeGeometry(): MegaBridgeGeometry {
  const width = 8
  const decks: MegaBox[] = [], joints: MegaBox[] = [], girders: MegaBox[] = [], rails: MegaBox[] = [], railPosts: MegaBox[] = [], supports: MegaBox[] = []
  const path = megaConfig.bridgePath
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i], to = path[i + 1]
    decks.push(bridgeSegment(from, to, width, 1.6))
    const angle = Math.atan2(to[0] - from[0], to[2] - from[2])
    const normalX = Math.cos(angle), normalZ = -Math.sin(angle)
    for (const side of [-1, 1]) girders.push({
      position: [(from[0] + to[0]) / 2 + side * normalX * 3.8, 16.8, (from[2] + to[2]) / 2 + side * normalZ * 3.8],
      size: [1.2, 1.6, Math.hypot(to[0] - from[0], to[2] - from[2])],
      rotation: [0, angle, 0],
    })
  }
  for (let i = 1; i < path.length - 1; i++) joints.push({ position: path[i], size: [8.8, 1.6, 8.8] })

  const railOffset = width / 2 - .2
  for (const side of [-1, 1]) {
    const railNodes = path.map((node, index) => {
      const previous = path[Math.max(0, index - 1)], next = path[Math.min(path.length - 1, index + 1)]
      const previousAngle = index ? Math.atan2(node[0] - previous[0], node[2] - previous[2]) : Math.atan2(next[0] - node[0], next[2] - node[2])
      const nextAngle = index < path.length - 1 ? Math.atan2(next[0] - node[0], next[2] - node[2]) : previousAngle
      const offsetPoint = (angle: number) => [node[0] + Math.cos(angle) * side * railOffset, node[2] - Math.sin(angle) * side * railOffset]
      const a = offsetPoint(previousAngle), b = offsetPoint(nextAngle)
      if (index === 0 || index === path.length - 1 || Math.abs(previousAngle - nextAngle) < 1e-5) return [a[0], node[1] + .8, a[1]] as Vec3
      const half = (previousAngle + nextAngle) / 2, scale = railOffset / Math.max(.25, Math.cos((nextAngle - previousAngle) / 2))
      return [node[0] + Math.cos(half) * side * scale, node[1] + .8, node[2] - Math.sin(half) * side * scale] as Vec3
    })
    for (let i = 0; i < railNodes.length - 1; i++) rails.push(bridgeSegment(railNodes[i], railNodes[i + 1], .25, .5, .8))
    for (let i = 0; i < railNodes.length; i += 2) railPosts.push({ position: [railNodes[i][0], railNodes[i][1] + .6, railNodes[i][2]], size: [.25, 1.2, .25] })
  }

  // Piers stop outside the clear portal; the central 56-unit opening stays free.
  for (const x of [-150, -90, -45, 45, 90, 150]) {
    const segmentIndex = path.findIndex((node, index) => index < path.length - 1 && x >= node[0] && x <= path[index + 1][0])
    const from = path[segmentIndex], to = path[segmentIndex + 1]
    const t = (x - from[0]) / (to[0] - from[0])
    const z = from[2] + (to[2] - from[2]) * t
    const height = 17.2
    supports.push({ position: [x, height / 2, z], size: [1.8, height, 1.8] })
    const angle = Math.atan2(to[0] - from[0], to[2] - from[2])
    supports.push({ position: [x, height + .4, z], size: [9, .8, 1.8], rotation: [0, angle, 0] })
  }
  return { decks, joints, girders, rails, railPosts, supports }
}

export function createMegaStructureGeometry() {
  const copy = (item: MegaBox) => ({
    ...item,
    position: [...item.position] as Vec3,
    size: [...item.size] as Vec3,
    rotation: item.rotation ? [...item.rotation] as Vec3 : undefined,
    quaternion: item.quaternion ? [...item.quaternion] as Quaternion : undefined,
  })
  return {
    bodies: megaMainBodies.map(copy),
    inset: megaGateInset.map(copy),
    braces: megaMajorBraces.map(copy),
    ribs: megaLongitudinalRibs.map(copy),
    frames: megaDoorFrames.map(copy),
    serviceBraces: megaServiceBraces.map(copy),
    roofFrame: megaRoofFrame.map(copy),
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
const overlapsClearance = (building: Building, region: MegaClearanceRegion) =>
  building.x - building.width / 2 < region.maxX && building.x + building.width / 2 > region.minX &&
  building.z - building.depth / 2 < region.maxZ && building.z + building.depth / 2 > region.minZ

/** Rendering-only clearance; StableCity data and its signature remain unchanged. */
export function deriveMegaHeroClearance(city: StableCityLike) {
  const clearedBuildingIds = city.buildings.filter(building => overlapsClearance(building, megaHeroClearanceEnvelope) || intersectsMegaBridgeCorridor([building.x, 0, building.z], [building.width, 1, building.depth])).map(building => building.id)
  const cleared = new Set(clearedBuildingIds)
  return { region: megaHeroClearanceRegion, envelope: megaHeroClearanceEnvelope, clearedBuildingIds, visibleBuildings: city.buildings.filter(building => !cleared.has(building.id)) }
}
