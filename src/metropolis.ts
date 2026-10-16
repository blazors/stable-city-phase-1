type Box = { position: [number, number, number]; size: [number, number, number]; color?: string; tower?: boolean }

// Shared by land placement and the water shader; the river stays outside the locked core.
export const riverCenter = (x: number) => 84 + Math.sin(x / 95) * 24 - .002 * Math.max(-x, 0) ** 2
export const riverHalfWidth = (x: number) => 14 + 8 * Math.exp(-((x + 165) ** 2) / 7000)
export const riverReflectionSources = [-174, -66, 0, 66, 174] as const
export const riverShader = `
  float riverCenterAt(float x) { return 84.0+sin(x/95.0)*24.0-.002*pow(max(-x,0.0),2.0); }
  float riverWidthAt(float x) { return 14.0+8.0*exp(-pow(x+165.0,2.0)/7000.0); }
`

// The original district remains the civic center. These seeded districts form its wider setting.
export function generateMetropolis(seed: number) {
  let state = seed >>> 0
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  const land: Box[] = [], buildings: Box[] = [], roofs: Box[] = [], windows: Box[] = [], parks: Box[] = [], trees: Box[] = [], paths: Box[] = [], lights: Box[] = [], routeLights: Box[] = []
  const roads: Box[] = [], terraces: Box[] = []
  const southEdge = (x: number) => -156 + Math.sin(x / 65) * 18 + .0006 * x * x
  const northEdge = (x: number) => 252 + Math.sin(x / 80) * 22 - .0005 * x * x
  for (let x = -258; x < 258; x += 3) {
    const px = x + 1.5, center = riverCenter(px), width = riverHalfWidth(px)
    const south = southEdge(px), north = northEdge(px)
    land.push({ position: [px, -1.2, (south + center - width) / 2], size: [3, 2, center - width - south] })
    land.push({ position: [px, -1.2, (north + center + width) / 2], size: [3, 2, north - center - width] })
    for (const side of [-1, 1]) {
      // Widen the south-bank green where the civic park meets the river.
      const greenWidth = side === -1 && px > -115 && px < -45 ? 22 : 12
      parks.push({ position: [px, -.08, center + side * (width + greenWidth / 2)], size: [3, .18, greenWidth] })
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
    // Reserve a little extra before applying the seeded building offset so the
    // visible northern skyline still lands behind a continuous green buffer.
    const edgeGarden = Math.abs(x) > 215 || z < southEdge(x) + 33 || z > northEdge(x) - 40
    if (park || edgeGarden) {
      parks.push({ position: [x, -.08, z], size: [17.9, .18, 17.9] })
      if (park) paths.push({ position: [x, .12, z], size: [2, .13, 18] })
      const deepPark = park && z >= -54 && z <= 18 && Math.abs(x - parkAxis) <= 14
      for (let i = 0; i < (park ? (deepPark ? 2 : 5) : 3); i++) trees.push({ position: [x + (random() - .5) * 13, 2, z + (random() - .5) * 13], size: [3, 4, 3], color: '#5b8065' })
      continue
    }
    roads.push({ position: [x - 8, -.01, z], size: [2, .12, 18] })
    roads.push({ position: [x, 0, z - 8], size: [18, .12, 2] })
    // Offset the eastern peak from the hero's rear silhouette so Overview reads
    // as two flanking districts with a deliberate central skyline valley.
    const eastPeak = Math.exp(-((x - 198) ** 2 / 2300 + (z - 174) ** 2 / 2100))
    const westPeak = Math.exp(-((x + 162) ** 2 / 2600 + (z - 108) ** 2 / 1500))
    const cluster = Math.max(eastPeak, westPeak * .7)
    // A low civic apron and a quiet gap between the two distant peaks keep
    // the core readable across the river, without changing its locked masses.
    const civicApron = Math.abs(x) <= 54 && z >= 54 && z < riverCenter(x)
    const skylineValley = Math.abs(x) <= 54 && z > riverCenter(x)
    const gardenQuarter = z < -45 || (x < -100 && z < 35) || civicApron || skylineValley
    // Coherent neighbourhood silhouettes: long residential slabs, compact blocks,
    // and slender towers concentrated at the two distant peaks.
    const variant = Math.abs(Math.round(x / 18) + Math.round(z / 18) * 3) % 4
    const tower = !gardenQuarter && cluster > .34
    const height = Math.min(38, 4 + random() * (gardenQuarter ? 4 : 6) + (gardenQuarter ? 0 : cluster * 28))
    const width = tower ? 5 + random() * 2 : variant === 0 ? 12 : variant === 1 ? 5 : 8 + random() * 3
    const depth = tower ? 6 + random() * 2 : variant === 1 ? 12 : variant === 0 ? 5 : 7 + random() * 3
    const px = x + random() * 2, pz = z + random() * 2
    const color = gardenQuarter ? (random() > .5 ? '#b7b39b' : '#82958a') : (random() > .7 ? '#a5b2ac' : '#5d7c83')
    const addBuilding = (bx: number, bz: number, bw: number, bd: number, bh: number) => {
      buildings.push({ position: [bx, bh / 2, bz], size: [bw, bh, bd], color, tower })
      roofs.push({ position: [bx, bh + .12, bz], size: [bw + .15, .24, bd + .15], tower })
      terraces.push({ position: [bx, bh + (tower ? 1.7 : gardenQuarter ? .36 : .7), bz], size: [tower ? bw * .66 : gardenQuarter ? bw * .8 : bw * .35, tower ? 3 : gardenQuarter ? .2 : .9, tower ? bd * .65 : gardenQuarter ? bd * .8 : bd * .45], color: tower ? '#8eaaa7' : gardenQuarter ? '#63816b' : '#84928c', tower })
      for (let y = 2; y < bh; y += 3.5) if ((Math.floor(y) + variant) % 3 !== 0) { windows.push({ position: [bx + (variant - 1.5) * bw * .1, y, bz - bd / 2 - .03], size: [bw * .38, .3, .06] }); windows.push({ position: [bx - bw / 2 - .03, y, bz], size: [.06, .3, bd * .4] }) }
    }
    if (!gardenQuarter && cluster < .34 && variant === 2) {
      const gap = 3.4, delta = 1.5 + random() * 1.5, secondHeight = Math.max(2, height - delta)
      addBuilding(px - gap, pz + (random() - .5), 4.5 + random() * .5, 7 + random() * 3, height)
      addBuilding(px + gap, pz + (random() - .5), 4.5 + random() * .5, 7 + random() * 3, secondHeight)
    } else addBuilding(px, pz, width, depth, height)
  }
  const bridges = [-174, -66, 66, 174].map(x => ({ x, z: riverCenter(x), span: riverHalfWidth(x) * 2 + 12 }))
  for (const { x, z, span } of bridges) for (const side of [-1, 1]) {
    paths.push({ position: [x, .16, z + side * (span / 2 + 10)], size: [5, .16, 20] })
  }
  // A continuous civic promenade connects the main park to the -66 bridge.
  // It is deliberately off the protected core and shares the existing path batch.
  const parkBridge = bridges.find(bridge => bridge.x === -66)!
  const promenadeNorth = parkBridge.z - parkBridge.span / 2 - 8
  paths.push({ position: [-77, .14, (-96 + promenadeNorth) / 2], size: [3.6, .16, promenadeNorth + 96] })
  paths.push({ position: [-71.5, .15, promenadeNorth], size: [11, .16, 3.6] })

  // Macro night lighting: two metropolitan avenues and the park promenade form
  // a readable network without adding real lights or changing the road graph.
  for (const x of [-126, 126]) for (let z = -108; z <= 216; z += 18) {
    if ([-6.8, 6.8].some(dx => Math.abs(z - riverCenter(x + dx)) < riverHalfWidth(x + dx) + 13)) continue
    routeLights.push({ position: [x - 6.8, .11, z], size: [.14, .07, 5.2] })
    routeLights.push({ position: [x + 6.8, .11, z], size: [.14, .07, 5.2] })
  }
  for (let z = -90; z <= promenadeNorth; z += 12) {
    routeLights.push({ position: [-79, .24, z], size: [.14, .09, 4.4] })
    routeLights.push({ position: [-75, .24, z], size: [.14, .09, 4.4] })
  }
  return { land, buildings, roofs, windows, parks, trees, paths, lights, routeLights, bridges, roads, terraces }
}
