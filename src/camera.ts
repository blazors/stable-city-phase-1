import { PerspectiveCamera } from 'three'

type Vec3 = [number, number, number]

export const cameraViews = {
  overview: { position: [-238, 112, -272] as Vec3, target: [0, 10, 55] as Vec3, fov: 46 },
  // A longer lens and stand-off reduce foreground enlargement while retaining street-scale context.
  mega: { position: [-60, 36, -60] as Vec3, target: [-2, 15, 9] as Vec3, fov: 38 },
}

export function cameraPosition(mode: keyof typeof cameraViews, aspect: number): Vec3 {
  const { position, target } = cameraViews[mode]
  const portrait = mode === 'mega' ? Math.max(0, Math.min(1, (.9 - aspect) / .4)) : 0
  const fit = Math.max(1, Math.min(2.7, 1.35 / aspect)) * (1 - portrait * .22)
  // Portrait Mega keeps the hero large and looks through the low central skyline valley.
  const offset = [14, 3, -9]
  return position.map((value, axis) => target[axis] + (value - target[axis] + offset[axis] * portrait) * fit) as Vec3
}

export function createSceneCamera(mode: keyof typeof cameraViews) {
  const view = cameraViews[mode]
  const camera = new PerspectiveCamera(view.fov, 1, .5, 1800)
  camera.position.set(...view.position)
  camera.lookAt(...view.target)
  camera.updateMatrixWorld()
  return camera
}
