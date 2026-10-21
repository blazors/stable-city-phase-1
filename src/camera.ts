import { PerspectiveCamera } from 'three'
import { cameraConfig, type Vec3 } from './sceneConfig'

export type CameraMode = 'overview' | 'mega' | 'elevated'
const heroCameraPreset = { ...cameraConfig.cameraPreset.hero, target: cameraConfig.heroCameraTarget, fov: cameraConfig.heroCameraFov }

export const cameraViews = {
  overview: cameraConfig.cameraPreset.overview,
  // `mega` is retained as the UI and persistence mode name; `hero` is the authored preset name.
  mega: heroCameraPreset,
  elevated: cameraConfig.cameraPreset.elevated,
  hero: heroCameraPreset,
}
export const overviewDistanceOffset = () => Math.max(0, Math.hypot(...cameraViews.overview.position.map((value, axis) => value - cameraViews.overview.target[axis])) - 420)

export function cameraPosition(mode: CameraMode, aspect: number): Vec3 {
  const { position, target } = cameraViews[mode]
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const fit = Math.max(1, Math.min(mode === 'overview' ? 2.25 : 2.7, (mode === 'overview' ? .9 : .64) / safeAspect))
  const adapted = position.map((value, axis) => target[axis] + (value - target[axis]) * fit) as Vec3
  // Keep the close-up camera above the ground when a narrow viewport needs a dolly-back.
  if (mode !== 'overview') adapted[1] = Math.max(3, adapted[1])
  return adapted
}

export function createSceneCamera(mode: CameraMode) {
  const view = cameraViews[mode]
  const camera = new PerspectiveCamera(view.fov, 1, .5, 2600)
  camera.position.set(...view.position)
  camera.lookAt(...view.target)
  camera.updateMatrixWorld()
  return camera
}
