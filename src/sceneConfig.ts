export type Vec3 = [number, number, number]

const cameraPreset = {
  overview: { position: [-270, 155, -305] as Vec3, target: [0, 28, 45] as Vec3, fov: 46 },
  hero: { position: [-65, 7, -205] as Vec3, target: [0, 52, 9] as Vec3, fov: 40 },
  elevated: { position: [-116, 58, -164] as Vec3, target: [-3, 24, 8] as Vec3, fov: 43 },
} as const

export const sceneConfig = {
  camera: {
    cameraPreset,
    heroCameraTarget: [0, 52, 9] as Vec3,
    heroCameraFov: 40,
  },
  mega: {
    dimensions: { width: 64, height: 96, depth: 18 },
    center: [0, 48, 9] as Vec3,
    frontZ: 0,
    gate: { width: 36, height: 56, depth: 16 },
    gateHeightScale: 1,
    beamDepth: 6,
    portalWidth: 36,
    bridgePath: [[-60, 15, -56], [-50, 15, -30], [-42, 15, -6], [-6, 15, 10]] as Vec3[],
    bridgeHeight: 15,
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
export { cameraPreset }
