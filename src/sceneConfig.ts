export type Vec3 = [number, number, number]

const cameraPreset = {
  overview: { position: [-210, 165, -225] as Vec3, target: [0, 40, 20] as Vec3, fov: 42 },
  hero: { position: [-130, 8, -255] as Vec3, target: [0, 48, 21] as Vec3, fov: 40 },
  elevated: { position: [-150, 85, -165] as Vec3, target: [0, 54, 22] as Vec3, fov: 43 },
} as const

export const sceneConfig = {
  camera: {
    cameraPreset,
    heroCameraTarget: [0, 48, 21] as Vec3,
    heroCameraFov: 40,
  },
  mega: {
    dimensions: { width: 180, height: 124, depth: 104 },
    center: [0, 62, 22] as Vec3,
    frontZ: 2,
    gate: { width: 56, height: 88, depth: 40 },
    gateHeightScale: 1,
    beamDepth: 40,
    portalWidth: 56,
    bridgePath: [[-175, 18, -54], [-120, 18, -44], [-80, 18, -34], [-32, 18, -18], [32, 18, -18], [80, 18, -34], [120, 18, -44], [175, 18, -54]] as Vec3[],
    bridgeHeight: 17.2,
    clearance: { width: 180, depth: 40, margin: 2 },
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
