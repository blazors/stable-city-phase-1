export type Vec3 = [number, number, number]

export const sceneConfig = {
  camera: {
    overview: { position: [-270, 155, -305] as Vec3, target: [0, 28, 45] as Vec3, fov: 46 },
    hero: { position: [-65, 7, -205] as Vec3, target: [0, 52, 9] as Vec3, fov: 40 },
  },
  mega: {
    dimensions: { width: 64, height: 96, depth: 18 },
    center: [0, 48, 9] as Vec3,
    frontZ: 0,
    gate: { width: 36, height: 56, depth: 5 },
    clearance: { width: 64, depth: 18, margin: 2 },
  },
  projection: {
    cameraHeight: [3, 10] as const,
    elevationDegrees: [8, 15] as const,
    gateScreenShare: [0.55, 0.75] as const,
    megaToCoreMedian: [4, 8] as const,
  },
} as const

export const cameraConfig = sceneConfig.camera
export const megaConfig = sceneConfig.mega
export const heroProjectionThresholds = sceneConfig.projection
