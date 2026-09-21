type Box = { position: [number, number, number]; size: [number, number, number]; color?: string }

// The original district remains the civic center. These seeded districts form its wider setting.
export function generateMetropolis(seed: number) {
  let state = seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  const land: Box[] = [], buildings: Box[] = [], roofs: Box[] = [], windows: Box[] = [], parks: Box[] = [], trees: Box[] = [], paths: Box[] = [], lights: Box[] = []
  const roads: Box[] = [], terraces: Box[] = []
  const bank = (x: number) => 65 + Math.sin(x / 56) * 11
  for (let x = -150; x < 150; x += 3) {
    const center = bank(x + 1.5)
    land.push({ position: [x + 1.5, -1.2, (-120 + center - 12) / 2], size: [3, 2, center - 12 + 120] })
    land.push({ position: [x + 1.5, -1.2, (150 + center + 12) / 2], size: [3, 2, 150 - center - 12] })
    for (const side of [-1, 1]) {
      parks.push({ position: [x + 1.5, -.08, center + side * 17], size: [3, .18, 9] })
      paths.push({ position: [x + 1.5, .03, center + side * 13.3], size: [3, .15, 1.1] })
      if (x % 6 === 0) lights.push({ position: [x + 1.5, .35, center + side * 12.4], size: [1.5, .16, .2] })
      trees.push({ position: [x + 1.5, 1.5 + random(), center + side * (17 + random() * 3)], size: [1.8, 3.2, 2.2], color: random() > .5 ? '#567a62' : '#769574' })
    }
  }
  for (let x = -138; x <= 138; x += 15) for (let z = -108; z <= 138; z += 15) {
    if (Math.abs(x) < 46 && Math.abs(z) < 46) continue
    if (Math.abs(z - bank(x)) < 26) continue
    roads.push({ position: [x - 5, .04, z + 1], size: [1.8, .1, 15] })
    roads.push({ position: [x + 1, .05, z - 5], size: [15, .1, 1.8] })
    // Broad western park and low waterfront quarters create valleys between clusters.
    if (x < -48 && x > -106 && z > -40 && z < 35) {
      parks.push({ position: [x, -.03, z], size: [14.9, .22, 14.9] })
      paths.push({ position: [x, .12, z], size: [15, .13, 1] })
      for (let i = 0; i < 6; i++) trees.push({ position: [x + (random() - .5) * 12, 2, z + (random() - .5) * 11], size: [2.5, 4, 2.5], color: '#5b8065' })
      continue
    }
    const cluster = Math.exp(-((x - 76) ** 2 + (z - 112) ** 2) / 1900)
    const gardenQuarter = x < -45
    const height = 4 + random() * (gardenQuarter ? 5 : 9) + cluster * 22
    const width = gardenQuarter ? 8 + random() * 3 : 4 + random() * 4, depth = 5 + random() * 4
    const px = x + random() * 3, pz = z + random() * 3
    buildings.push({ position: [px, height / 2, pz], size: [width, height, depth], color: random() > .65 ? '#b0b1a0' : '#597879' })
    roofs.push({ position: [px, height + .3, pz], size: [width * .7, .6, depth * .75] })
    if (cluster > .3) {
      terraces.push({ position: [px, height + 1.7, pz], size: [width * .66, 3, depth * .65], color: '#8eaaa7' })
    } else if (gardenQuarter) {
      terraces.push({ position: [px, height + .55, pz], size: [width * .8, .4, depth * .8], color: '#63816b' })
    } else {
      terraces.push({ position: [px + width * .42, 1.5, pz], size: [width * .9, 3, depth + 1], color: '#84928c' })
    }
    for (let y = 2; y < height; y += 3) {
      windows.push({ position: [px, y, pz - depth / 2 - .03], size: [width * .65, .24, .06] })
      windows.push({ position: [px - width / 2 - .03, y, pz], size: [.06, .24, depth * .6] })
    }
  }
  for (const x of [-108, -48, 48, 108]) {
    paths.push({ position: [x, .06, -38], size: [3, .13, 160] })
    paths.push({ position: [x, .06, 111], size: [3, .13, 76] })
  }
  for (const z of [-72, -42, 108]) paths.push({ position: [0, .06, z], size: [290, .13, 3] })
  const bridges = [-108, -48, 48, 108].map(x => ({ x, z: bank(x) }))
  return { land, buildings, roofs, windows, parks, trees, paths, lights, bridges, roads, terraces }
}
