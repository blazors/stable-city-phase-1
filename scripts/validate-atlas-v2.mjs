import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { Euler, Quaternion, Vector3 } from 'three'

const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const moduleFrom = output => import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
const configSource = await readFile(new URL('../src/sceneConfig.ts', import.meta.url), 'utf8')
const configUrl = `data:text/javascript;base64,${Buffer.from(transpile(configSource)).toString('base64')}`
const { sceneConfig } = await moduleFrom(transpile(configSource))
const resolveThree = `from '${import.meta.resolve('three')}'`
const cameraSource = (await readFile(new URL('../src/camera.ts', import.meta.url), 'utf8'))
  .replace(/from (['"])three\1/g, resolveThree)
  .replace(/from (['"])\.\/sceneConfig\1/g, `from '${configUrl}'`)
const camera = await moduleFrom(transpile(cameraSource))
const megaSource = (await readFile(new URL('../src/megaGeometry.ts', import.meta.url), 'utf8'))
  .replace(/from (['"])\.\/sceneConfig\1/g, `from '${configUrl}'`)
const mega = await moduleFrom(transpile(megaSource))
const citySource = await readFile(new URL('../src/city.ts', import.meta.url), 'utf8')
const city = await moduleFrom(transpile(citySource))

const config = sceneConfig.mega
const structure = mega.createMegaStructureGeometry()
const bridge = mega.createMegaBridgeGeometry()
assert.deepEqual(config.dimensions, { width: 180, height: 124, depth: 104 }, 'gate envelope is approximately 180 x 124 x 104')
assert.deepEqual(config.center, [0, 62, 22], 'gate remains centered at [0,62,22]')
assert.deepEqual(config.gate, { width: 56, height: 88, depth: 40 }, 'clear through opening is 56 x 88 x 40')
assert.deepEqual(structure.bodies.slice(0, 2).map(({ position, size }) => ({ position, size })), [
  { position: [-43, 44, 22], size: [30, 88, 40] },
  { position: [43, 44, 22], size: [30, 88, 40] },
], 'main gate piers preserve the authored P0 sections')
assert.deepEqual(structure.bodies[2], { position: [0, 97, 22], size: [116, 18, 40], rotation: undefined, quaternion: undefined }, 'main crossbeam meets both piers at y=88')
assert.deepEqual(structure.bodies[3], { position: [0, 109, 22], size: [124, 6, 42], rotation: undefined, quaternion: undefined }, 'lower crown tier uses the narrowed footprint')
assert.deepEqual(mega.megaRoofFascia.size, [140, 8, 50], 'middle crown tier steps out from the lower crown')
assert.deepEqual(mega.megaRoofDeck.size, [126, 8, 38], 'upper crown tier steps in again and reaches y=124')
assert.equal(mega.megaRoofDeck.position[1] + mega.megaRoofDeck.size[1] / 2, 124, 'crown reaches the 124-unit cap')
assert(structure.bodies.some(item => item.position.join(',') === '-70,3,22' && item.size.join(',') === '40,6,104'), 'left foundation has the specified P0 base')
assert(structure.bodies.some(item => item.position.join(',') === '70,3,22' && item.size.join(',') === '40,6,104'), 'right foundation mirrors the P0 base')

const legs = structure.braces
assert.equal(legs.length, 4, 'four long sloping supports use single boxes')
assert(legs.every(leg => leg.quaternion && leg.size[1] > 75), 'all four supports use quaternion-oriented full-length members')
const endpointsFor = leg => {
  const [x, y, z] = leg.position
  const axis = new Vector3(0, 1, 0).applyQuaternion(new Quaternion(...leg.quaternion)).multiplyScalar(leg.size[1] / 2)
  return [[x - axis.x, y - axis.y, z - axis.z], [x + axis.x, y + axis.y, z + axis.z]]
}
const expectedLegEnds = [
  [[-78, 6, -22], [-55, 78, 5]], [[-78, 6, 66], [-55, 78, 39]],
  [[78, 6, -22], [55, 78, 5]], [[78, 6, 66], [55, 78, 39]],
]
for (const target of expectedLegEnds) {
  const leg = legs.find(candidate => endpointsFor(candidate).every(point => target.some(endpoint => new Vector3(...point).distanceTo(new Vector3(...endpoint)) < 1e-6)))
  assert(leg, `a single diagonal member joins ${target[0].join(',')} to ${target[1].join(',')}`)
  assert(endpointsFor(leg).some(point => Math.abs(point[1] - 6) < 1e-6), 'lower leg end meets the foundation top at y=6')
}

assert.deepEqual(config.bridgePath, [[-175, 18, -54], [-120, 18, -44], [-80, 18, -34], [-32, 18, -18], [32, 18, -18], [80, 18, -34], [120, 18, -44], [175, 18, -54]], 'elevated traffic path crosses the gate front without a portal turn')
assert.equal(bridge.decks.length, config.bridgePath.length - 1, 'each continuous bridge segment has one deck')
assert(bridge.decks.every(deck => deck.size[0] === 8 && deck.size[1] === 1.6), 'bridge deck is 8 wide and 1.6 thick')
assert.equal(bridge.joints.length, config.bridgePath.length - 2, 'deck joints bridge every angled path node')
assert(bridge.joints.every((joint, index) => joint.size.join(',') === '8.8,1.6,8.8' && joint.position.join(',') === config.bridgePath[index + 1].join(',')), 'one low-profile plate closes each road seam')
assert.equal(bridge.rails.length, (config.bridgePath.length - 1) * 2, 'two rail runs cover every bridge segment')
const railEnds = item => {
  const [x, y, z] = item.position, angle = item.rotation[1], half = item.size[2] / 2
  const direction = [Math.sin(angle) * half, Math.cos(angle) * half]
  return [[x - direction[0], y, z - direction[1]], [x + direction[0], y, z + direction[1]]]
}
for (let side = 0; side < 2; side++) for (let segment = 0; segment < config.bridgePath.length - 2; segment++) {
  const [, end] = railEnds(bridge.rails[side * (config.bridgePath.length - 1) + segment])
  const [start] = railEnds(bridge.rails[side * (config.bridgePath.length - 1) + segment + 1])
  assert(new Vector3(...end).distanceTo(new Vector3(...start)) < 1e-6, 'adjacent rail members meet without gaps')
}
const piers = bridge.supports.filter(item => item.size[0] === 1.8)
assert(piers.every(item => item.position[1] - item.size[1] / 2 === 0 && item.position[1] + item.size[1] / 2 === 17.2), 'all outer bridge piers reach grade and meet the deck support')
assert(piers.every(item => Math.abs(item.position[0]) - item.size[0] / 2 > config.gate.width / 2), 'bridge piers stay fully outside the portal opening')
const roadZAtX = x => {
  const index = config.bridgePath.findIndex((node, i) => i < config.bridgePath.length - 1 && x >= node[0] && x <= config.bridgePath[i + 1][0])
  const from = config.bridgePath[index], to = config.bridgePath[index + 1]
  return from[2] + (to[2] - from[2]) * (x - from[0]) / (to[0] - from[0])
}
assert(piers.every(pier => Math.abs(pier.position[2] - roadZAtX(pier.position[0])) < 1e-9), 'each pier stays directly beneath the sloped road alignment')
assert(!('platform' in bridge), 'new lateral road has no legacy interior landing platform')

const obbIntersects = (a, b) => {
  const quat = item => item.quaternion ? new Quaternion(...item.quaternion) : new Quaternion().setFromEuler(new Euler(...(item.rotation ?? [0, 0, 0])))
  const axes = item => [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)].map(axis => axis.applyQuaternion(quat(item)))
  const axesA = axes(a), axesB = axes(b)
  const halfA = a.size.map(value => value / 2), halfB = b.size.map(value => value / 2)
  const delta = new Vector3(...b.position).sub(new Vector3(...a.position))
  const candidates = [...axesA, ...axesB, ...axesA.flatMap(axisA => axesB.map(axisB => new Vector3().crossVectors(axisA, axisB)))]
  return candidates.every(axis => {
    if (axis.lengthSq() < 1e-10) return true
    axis.normalize()
    const radius = (basis, half) => basis.reduce((sum, direction, index) => sum + half[index] * Math.abs(axis.dot(direction)), 0)
    return Math.abs(delta.dot(axis)) < radius(axesA, halfA) + radius(axesB, halfB) - 1e-6
  })
}
assert([...bridge.decks, ...bridge.joints].every(deck => legs.every(leg => !obbIntersects(deck, leg))), 'bridge deck and joints stay separated from all four diagonal legs')
assert(piers.every(pier => pier.position[0] - pier.size[0] / 2 > -28 || pier.position[0] + pier.size[0] / 2 < 28), 'no thick bridge pier intrudes into the clear central portal')

const occupied = [...structure.bodies, ...structure.inset, ...structure.braces, ...bridge.decks, ...bridge.joints, ...bridge.rails, ...bridge.supports]
const portalContains = point => point[0] > -28 && point[0] < 28 && point[1] > 0 && point[1] < 88 && point[2] > 2 && point[2] < 42
for (let x = -27; x <= 27; x += 3) for (let y = 1; y < 88; y += 3) for (let z = 3; z < 42; z += 3) {
  const point = [x, y, z]
  for (const item of occupied) {
    const relative = new Vector3(x - item.position[0], y - item.position[1], z - item.position[2])
    if (item.quaternion) relative.applyQuaternion(new Quaternion(...item.quaternion).invert())
    else if (item.rotation) relative.applyEuler(new Euler(...item.rotation))
    const inside = Math.abs(relative.x) < item.size[0] / 2 && Math.abs(relative.y) < item.size[1] / 2 && Math.abs(relative.z) < item.size[2] / 2
    assert(!(portalContains(point) && inside), `solid ${JSON.stringify(item)} does not occupy portal interior at ${point}`)
  }
}
assert.equal(structure.inset.length, 0, 'portal has no rear wall or inset solids')
const boxCount = occupied.length
assert(boxCount <= 110 && boxCount * 12 <= 1320, 'P0 geometry remains under the 110-box / 1,320-triangle budget')

assert.deepEqual(camera.cameraViews.hero, { position: [-104, 7, -202], target: [0, 59, 21], fov: 40 }, 'Hero camera matches P0 preset')
assert.deepEqual(camera.cameraViews.overview, { position: [-210, 165, -225], target: [0, 40, 20], fov: 42 }, 'Overview camera matches P0 preset')
assert.deepEqual(camera.cameraViews.elevated, { position: [-150, 85, -165], target: [0, 54, 22], fov: 43 }, 'Elevated camera matches P0 preset')
for (const mode of ['overview', 'mega', 'elevated']) assert.deepEqual(camera.createSceneCamera(mode).position.toArray(), camera.cameraViews[mode].position, `${mode} camera starts at its preset`)
assert.deepEqual(camera.cameraPosition('mega', .5), camera.cameraViews.mega.position, 'Hero remains fixed in the 16:9 stage')

const baselineCity = city.createStableCity()
assert.equal(baselineCity.buildings.length, 60, 'StableCity keeps all 60 buildings in its data model')
assert.equal(city.validateStableCity(baselineCity).valid, true, 'StableCity baseline contract still passes')
assert.equal(city.createStableCity(baselineCity.seed).signature, baselineCity.signature, 'render-only clearing preserves deterministic StableCity signature')
const sceneSource = await readFile(new URL('../src/CityScene.tsx', import.meta.url), 'utf8')
const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
assert.doesNotMatch(sceneSource, /<Architecture\b|<ThemeSignatureOverlay\b|<MetropolitanLandscape[\s\S]*?metropolis\.(?:visibleBodies|upperMasses|facadePanels|roofs|terraces|windows)\b/, 'ordinary city architecture, window batches, and theme overlay are not mounted')
assert.doesNotMatch(sceneSource, /snowCaps\(metropolis\.roofs\)|snowCaps\(megaClearance\.visibleBuildings/, 'ordinary building roof snow surfaces are removed')
assert.doesNotMatch(sceneSource, /\[0, 8\.[69], -30\]|\[x, 4\.25, -30\]|ref=\{train\}|train\.current|position=\{\[0, 9\.45, -30\]\}/, 'legacy elevated line, its piers, and its moving train are removed')
assert.match(sceneSource, /<instancedMesh ref=\{traffic\}/, 'ground vehicle instances remain mounted')
assert.match(sceneSource, /<Ground[\s\S]*?<MetropolitanLandscape[\s\S]*?<Megastructure[\s\S]*?<Transport[\s\S]*?<OrbitControls/, 'ground, landscape, Hero, transport, and orbit interaction remain mounted')
assert.match(sceneSource, /snowCaps\(metropolis\.parks\)/, 'park snow surfaces remain available')
assert.match(appSource, /city\.buildings\.length/, 'Production Console statistics retain StableCity building counts')
assert.match(appSource, /city\.signature/, 'Production Console retains StableCity signature diagnostics')
console.log('P0 cleared-city rendering, through-gate, sloped legs, bridge, cameras and geometry budget checks passed.')
