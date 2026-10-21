export type Vec3 = [number, number, number]

const cameraPreset = {
  overview: { position: [-270, 155, -305] as Vec3, target: [0, 28, 45] as Vec3, fov: 46 },
  hero: { position: [-48, 6, -142] as Vec3, target: [0, 42, 14] as Vec3, fov: 46 },
  elevated: { position: [-125, 63, -155] as Vec3, target: [0, 37, 18] as Vec3, fov: 46 },
} as const

export const sceneConfig = {
  camera: {
    cameraPreset,
    heroCameraTarget: [0, 42, 14] as Vec3,
    heroCameraFov: 46,
  },
  mega: {
    dimensions: { width: 132, height: 92, depth: 36 },
    center: [0, 46, 18] as Vec3,
    frontZ: 0,
    gate: { width: 66, height: 66, depth: 36 },
    gateHeightScale: 1,
    beamDepth: 36,
    portalWidth: 66,
    bridgePath: [[-60, 15, -56], [-45, 15, -34], [-20, 15, -18], [0, 15, -8], [0, 15, 28], [0, 15, 42]] as Vec3[],
    bridgeHeight: 15,
    clearance: { width: 132, depth: 36, margin: 2 },
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
export { cameraPreset }
