type Vec3 = [number, number, number]

export const cameraViews = {
  overview: { position: [-238, 112, -272] as Vec3, target: [0, 10, 55] as Vec3, fov: 46 },
  mega: { position: [-36, 29, -48] as Vec3, target: [-2, 15, 9] as Vec3, fov: 46 },
}

export function cameraPosition(mode: keyof typeof cameraViews, aspect: number): Vec3 {
  const { position, target } = cameraViews[mode]
  const fit = Math.max(1, Math.min(2.7, 1.35 / aspect))
  // Adapt distance around the subject, preserving direction and focal point.
  return position.map((value, axis) => target[axis] + (value - target[axis]) * fit) as Vec3
}
