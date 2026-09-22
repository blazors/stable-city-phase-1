type Box = { position: [number, number, number]; size: [number, number, number]; color?: string }

// Shared by land placement and the water shader; the river stays outside the locked core.
export const riverCenter = (x: number) => 84 + Math.sin(x / 95) * 24 - .002 * Math.max(-x, 0) ** 2
export const riverHalfWidth = (x: number) => 14 + 8 * Math.exp(-((x + 165) ** 2) / 7000)
export const riverShader = `
  float riverCenterAt(float x) { return 84.0+sin(x/95.0)*24.0-.002*pow(max(-x,0.0),2.0); }
  float riverWidthAt(float x) { return 14.0+8.0*exp(-pow(x+165.0,2.0)/7000.0); }
`

// The original district remains the civic center. These seeded districts form its wider setting.
export function generateMetropolis(seed: number) {
  let state = seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  const land: Box[] = [], buildings: Box[] = [], roofs: Box[] = [], windows: Box[] = [], parks: Box[] = [], trees: Box[] = [], paths: Box[] = [], lights: Box[] = []
  const roads: Box[] = [], terraces: Box[] = []
  const southEdge = (x: number) => -156 + Math.sin(x / 65) * 18 + .0006 * x * x
  const northEdge = (x: number) => 252 + Math.sin(x / 80) * 22 - .0005 * x * x
  for (let x = -258; x < 258; x += 3) {
    const px = x + 1.5, center = riverCenter(px), width = riverHalfWidth(px)
    const south = southEdge(px), north = northEdge(px)
    land.push({ position: [px, -1.2, (south + center - width) / 2], size: [3, 2, center - width - south] })
    land.push({ position: [px, -1.2, (north + center + width) / 2], size: [3, 2, north - center - width] })
    for (const side of [-1, 1]) {
      parks.push({ position: [px, -.08, center + side * (width + 6)], size: [3, .18, 12] })
      paths.push({ position: [px, .03, center + side * (width + 2)], size: [3, .15, 1.5] })
      if (x % 9 === 0) lights.push({ position: [px, .35, center + side * (width + .8)], size: [1.5, .16, .2] })
      if (x % 6 === 0) trees.push({ position: [px, 2, center + side * (width + 6 + random() * 4)], size: [2.5, 4, 2.7], color: random() > .5 ? '#567a62' : '#819271' })
    }
  }
  for (let x = -234; x <= 234; x += 18) for (let z = -126; z <= 234; z += 18) {
    if (Math.abs(x) < 54 && Math.abs(z) < 54) continue
    if (z < southEdge(x) + 16 || z > northEdge(x) - 18) continue
    // Reserve the full footprint, including its road, along the curved bank.
    if ([-9, 0, 9].some(dx => Math.abs(z - riverCenter(x + dx)) < riverHalfWidth(x + dx) + 22)) continue
    const parkAxis = -77 + Math.sin(z / 65) * 14
    const park = Math.abs(x - parkAxis) < 25 && z > -100 && z < 72
    const edgeGarden = Math.abs(x) > 215 || z < southEdge(x) + 33
    if (park || edgeGarden) {
      parks.push({ position: [x, -.08, z], size: [17.9, .18, 17.9] })
      if (park) paths.push({ position: [x, .12, z], size: [2, .13, 18] })
      for (let i = 0; i < (park ? 5 : 3); i++) trees.push({ position: [x + (random() - .5) * 13, 2, z + (random() - .5) * 13], size: [3, 4, 3], color: '#5b8065' })
      continue
    }
    roads.push({ position: [x - 8, -.01, z], size: [2, .12, 18] })
    roads.push({ position: [x, 0, z - 8], size: [18, .12, 2] })
    const eastPeak = Math.exp(-((x - 126) ** 2 / 2100 + (z - 180) ** 2 / 1800))
    const westPeak = Math.exp(-((x + 162) ** 2 / 2600 + (z - 108) ** 2 / 1500))
    const cluster = Math.max(eastPeak, westPeak * .7)
    const gardenQuarter = z < -45 || (x < -100 && z < 35)
    const height = 4 + random() * (gardenQuarter ? 4 : 6) + cluster * 19
    const width = gardenQuarter ? 9 + random() * 3 : 6 + random() * 4, depth = 7 + random() * 4
    const px = x + random() * 2, pz = z + random() * 2
    buildings.push({ position: [px, height / 2, pz], size: [width, height, depth], color: gardenQuarter ? (random() > .5 ? '#b7b39b' : '#82958a') : (random() > .7 ? '#a5b2ac' : '#5d7c83') })
    roofs.push({ position: [px, height + .3, pz], size: [width * .7, .6, depth * .75] })
    if (cluster > .3) {
      terraces.push({ position: [px, height + 1.7, pz], size: [width * .66, 3, depth * .65], color: '#8eaaa7' })
    } else if (gardenQuarter) {
      terraces.push({ position: [px, height + .55, pz], size: [width * .8, .4, depth * .8], color: '#63816b' })
    } else {
      terraces.push({ position: [px + width * .42, 1.5, pz], size: [width * .9, 3, depth + 1], color: '#84928c' })
    }
    for (let y = 2; y < height; y += 3.5) {
      windows.push({ position: [px, y, pz - depth / 2 - .03], size: [width * .65, .24, .06] })
      windows.push({ position: [px - width / 2 - .03, y, pz], size: [.06, .24, depth * .6] })
    }
  }
  const bridges = [-174, -66, 66, 174].map(x => ({ x, z: riverCenter(x), span: riverHalfWidth(x) * 2 + 12 }))
  for (const { x, z, span } of bridges) for (const side of [-1, 1]) {
    paths.push({ position: [x, .16, z + side * (span / 2 + 10)], size: [5, .16, 20] })
  }
  return { land, buildings, roofs, windows, parks, trees, paths, lights, bridges, roads, terraces }
}
