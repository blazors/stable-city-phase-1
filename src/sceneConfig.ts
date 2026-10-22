export type Vec3 = [number, number, number]

const cameraPreset = {
  overview: { position: [-270, 155, -305] as Vec3, target: [0, 28, 45] as Vec3, fov: 46 },
  hero: { position: [-68, 14, -196] as Vec3, target: [-6, 62, 20] as Vec3, fov: 44 },
  elevated: { position: [-125, 63, -155] as Vec3, target: [0, 37, 18] as Vec3, fov: 46 },
} as const

export const sceneConfig = {
  camera: {
    cameraPreset,
    heroCameraTarget: [-6, 62, 20] as Vec3,
    heroCameraFov: 44,
  },
  mega: {
    dimensions: { width: 140, height: 124, depth: 50 },
    center: [0, 62, 21] as Vec3,
    frontZ: -4,
    gate: { width: 64, height: 92, depth: 40 },
    gateHeightScale: 1,
    beamDepth: 44,
    portalWidth: 64,
    bridgePath: [[150, 18, -30], [110, 18, -22], [76, 18, -16], [42, 18, -6], [12, 18, 6], [12, 18, 48], [12, 18, 62]] as Vec3[],
    bridgeHeight: 17.4,
    clearance: { width: 140, depth: 50, margin: 2 },
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
