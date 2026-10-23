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
  .replace(/from (['"])three\1/g, resolveThree)
  .replace(/from (['"])\.\/sceneConfig\1/g, `from '${configUrl}'`)
const mega = await moduleFrom(transpile(megaSource))
const { megaMaintenanceBus, megaScaleWorkers } = mega
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
assert.deepEqual(mega.megaRoofFascia, { position: [0, 118.4, 22], size: [126, 4.8, 36] }, 'equipment tier is recessed and 4.8 units tall')
assert.deepEqual(mega.megaRoofDeck, { position: [0, 121.3, 22], size: [130, .6, 40] }, 'thin crown cap sits above the equipment tier')
const roof = mega.createMegaRoofVertices()
const roofPoints = Array.from({ length: roof.length / 3 }, (_, index) => roof.slice(index * 3, index * 3 + 3))
assert.deepEqual([Math.min(...roofPoints.map(point => point[0])), Math.min(...roofPoints.map(point => point[1])), Math.min(...roofPoints.map(point => point[2]))], [-70, 106, -3], 'roof frustum lower edge follows the authored eave')
assert.deepEqual([Math.max(...roofPoints.map(point => point[0])), Math.max(...roofPoints.map(point => point[1])), Math.max(...roofPoints.map(point => point[2]))], [70, 116, 47], 'roof frustum upper edge steps outward')
assert.equal(roof.length / 9, 12, 'closed sloped roof frustum uses twelve triangles')
assert.equal(mega.megaRoofFrame.length, 4, 'sparse equipment guard uses four rails')
assert(structure.bodies.some(item => item.position.join(',') === '-70,3,22' && item.size.join(',') === '40,6,104'), 'left foundation has the specified P0 base')
assert(structure.bodies.some(item => item.position.join(',') === '70,3,22' && item.size.join(',') === '40,6,104'), 'right foundation mirrors the P0 base')
assert.deepEqual(mega.megaServiceBoxes.map(item => item.position), [[-65, 74, 22], [65, 74, 22]], 'service boxes are lifted to both shoulders')
assert.deepEqual(mega.megaServicePlatforms.map(item => item.position), [[-65, 66, 22], [65, 66, 22]], 'service platforms sit beneath the shoulder boxes')
assert.equal(structure.equipment.length, 5, 'equipment family separates the crown cap, service boxes, and platforms from mineral mass')

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
assert.equal(structure.ribs.length, 16, 'each pillar has four front and four rear longitudinal ribs')
assert.equal(structure.frames.length, 9, 'three open-bottom portal frames contain two jambs and one head each')
assert.equal(structure.serviceBraces.length, 4, 'shoulder platforms use only a few diagonal short braces')

assert.deepEqual(config.bridgePath, [[-175, 18, -54], [-120, 18, -44], [-80, 18, -34], [-32, 18, -18], [32, 18, -18], [80, 18, -34], [120, 18, -44], [175, 18, -54]], 'elevated traffic path crosses the gate front without a portal turn')
assert.equal(bridge.decks.length, config.bridgePath.length - 1, 'each continuous bridge segment has one deck')
assert(bridge.decks.every(deck => deck.size[0] === 8 && deck.size[1] === 1.6), 'bridge deck is 8 wide and 1.6 thick')
assert.equal(bridge.joints.length, config.bridgePath.length - 2, 'deck joints bridge every angled path node')
assert(bridge.joints.every((joint, index) => joint.size.join(',') === '8.8,1.6,8.8' && joint.position.join(',') === config.bridgePath[index + 1].join(',')), 'one low-profile plate closes each road seam')
assert.equal(bridge.rails.length, (config.bridgePath.length - 1) * 2, 'two rail runs cover every bridge segment')
assert.equal(bridge.girders.length, (config.bridgePath.length - 1) * 2, 'two continuous side girders follow every elevated-road segment')
assert.equal(bridge.railPosts.length, 8, 'rail posts appear at alternating path nodes')
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
const pierCaps = bridge.supports.filter(item => item.size[0] === 9)
assert(piers.every(item => item.position[1] - item.size[1] / 2 === 0 && item.position[1] + item.size[1] / 2 === 17.2), 'all outer bridge piers reach grade and meet the deck support')
assert.equal(pierCaps.length, 6, 'each outer pier has one transverse cap')
const pathDirectionAt = x => {
  const index = config.bridgePath.findIndex((node, i) => i < config.bridgePath.length - 1 && x >= node[0] && x <= config.bridgePath[i + 1][0])
  const from = config.bridgePath[index], to = config.bridgePath[index + 1]
  return new Vector3(to[0] - from[0], 0, to[2] - from[2]).normalize()
}
assert(pierCaps.every(cap => {
  const transverse = new Vector3(1, 0, 0).applyEuler(new Euler(...cap.rotation))
  return Math.abs(transverse.dot(pathDirectionAt(cap.position[0]))) < 1e-6
}), 'pier caps turn perpendicular to the elevated-road direction')
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
assert([...bridge.decks, ...bridge.joints, ...bridge.girders, ...bridge.rails, ...bridge.railPosts].every(item => legs.every(leg => !obbIntersects(item, leg))), 'all elevated-road details stay separated from the four diagonal legs')
assert(bridge.girders.every((girder, index) => obbIntersects(girder, bridge.decks[Math.floor(index / 2)])), 'each side girder overlaps its matching deck segment')
assert(structure.ribs.every(rib => rib.size[1] === 84 && structure.bodies.slice(0, 2).some(column => obbIntersects(rib, column))), 'longitudinal ribs overlap their supporting columns')
const aperture = { position: [0, 44, 22], size: [56, 88, 40] }
assert(structure.frames.every(frame => !obbIntersects(frame, aperture)), 'open-bottom door frames preserve the complete portal clearance')
assert(mega.megaServicePlatforms.every((platform, index) => obbIntersects(platform, mega.megaServiceBoxes[index]) && structure.bodies.slice(0, 2).some(column => obbIntersects(platform, column))), 'shoulder platforms overlap their service boxes and main columns')
assert(structure.serviceBraces.every(brace => structure.bodies.slice(0, 2).some(column => obbIntersects(brace, column)) && mega.megaServicePlatforms.some(platform => obbIntersects(brace, platform))), 'short braces join the shoulder structure to the platforms')
assert(structure.serviceBraces.every(brace => legs.some(leg => obbIntersects(brace, leg))), 'shoulder braces seat into the diagonal leg joints')

assert.equal(structure.inset.length, 3, 'two side receiver skins and one soffit use real-thickness boxes')
const [leftSkin, rightSkin, soffit] = structure.inset
assert.equal(leftSkin.position[0] + leftSkin.size[0] / 2, -28, 'left receiver inner edge stops at X=-28')
assert.equal(rightSkin.position[0] - rightSkin.size[0] / 2, 28, 'right receiver inner edge stops at X=28')
assert.equal(soffit.position[1] - soffit.size[1] / 2, 88, 'soffit lower surface stops at Y=88')
assert(obbIntersects(leftSkin, structure.bodies[0]) && obbIntersects(rightSkin, structure.bodies[1]), 'side skins overlap their columns instead of floating free')
assert(obbIntersects(soffit, structure.bodies[2]), 'soffit overlaps the crossbeam at its underside')
assert(![leftSkin, rightSkin, soffit].some(item => obbIntersects(item, aperture)), 'receiver skins stop at opening boundaries without invading clear volume')

const bridgeStructure = [...bridge.decks, ...bridge.joints, ...bridge.girders, ...bridge.rails, ...bridge.railPosts, ...bridge.supports]
const materialFamilies = [
  structure.bodies,
  [...structure.braces, ...structure.ribs, ...structure.serviceBraces, ...bridgeStructure],
  [...structure.inset, ...structure.frames],
  [...structure.equipment, ...structure.roofFrame],
]
const familyItems = materialFamilies.flat()
const familyKeys = familyItems.map(({ position, size, rotation, quaternion }) => JSON.stringify({ position, size, rotation, quaternion }))
assert.equal(new Set(familyKeys).size, familyKeys.length, 'mineral, steel, interior, and equipment boxes are mutually exclusive')

assert.equal(megaMaintenanceBus.length, 6, 'maintenance bus uses one six-box instance batch')
const busWheels = megaMaintenanceBus.filter(item => item.size.join(',') === '0.75,0.6,0.45')
assert.equal(busWheels.length, 4, 'maintenance bus has four wheel blocks')
assert(busWheels.every(wheel => wheel.position[1] - wheel.size[1] / 2 === 18.8), 'all bus wheel bottoms contact the elevated deck at Y=18.8')
assert(megaMaintenanceBus.every(item => item.position[0] - item.size[0] / 2 >= -32 && item.position[0] + item.size[0] / 2 <= 32 && item.position[2] - item.size[2] / 2 >= -22 && item.position[2] + item.size[2] / 2 <= -14), 'bus is contained by the central straight segment and bridge width')
assert(megaMaintenanceBus.every(item => bridgeStructure.every(detail => !obbIntersects(item, detail)) && legs.every(leg => !obbIntersects(item, leg))), 'bus clears bridge rails, supports, and diagonal legs')

assert.equal(megaScaleWorkers.length, 12, 'four scale workers use one twelve-box instance batch')
const expectedWorkerFeet = [[-22, 18.8, -21.1], [-19, 18.8, -21.1], [-61, 6, -18], [-64, 6, -18]]
for (let index = 0; index < megaScaleWorkers.length; index += 3) {
  const [head, torso, lower] = megaScaleWorkers.slice(index, index + 3)
  const foot = [lower.position[0], lower.position[1] - lower.size[1] / 2, lower.position[2]]
  assert.deepEqual(foot, expectedWorkerFeet[index / 3], 'worker lower box meets its authored bridge or foundation foot point')
  assert(Math.abs(head.position[1] + head.size[1] / 2 - foot[1] - 1.78) < 1e-9, 'each three-box worker proxy is 1.78 units tall')
  assert(Math.abs(torso.position[1] - torso.size[1] / 2 - (lower.position[1] + lower.size[1] / 2)) < 1e-9, 'torso connects to the lower-body block')
  assert(Math.abs(head.position[1] - head.size[1] / 2 - (torso.position[1] + torso.size[1] / 2)) < 1e-9, 'head connects to the torso block')
}
assert(megaScaleWorkers.every(worker => bridge.rails.every(rail => !obbIntersects(worker, rail)) && bridge.railPosts.every(post => !obbIntersects(worker, post)) && legs.every(leg => !obbIntersects(worker, leg))), 'all scale workers clear railings, posts, and diagonal legs')

const occupied = [...familyItems, ...megaMaintenanceBus, ...megaScaleWorkers]
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
const boxCount = occupied.length
const triangleCount = boxCount * 12 + roof.length / 9
assert(boxCount <= 132 && triangleCount <= 1596, `P3 gate, bridge, bus, and workers stay under 132 boxes / 1,596 triangles (boxes=${boxCount}, tris=${triangleCount})`)

assert.deepEqual(camera.cameraViews.hero, { position: [-130, 8, -255], target: [0, 48, 21], fov: 40 }, 'Hero camera pulls back to reveal crown sky margin and the complete foundation')
assert.deepEqual(camera.cameraViews.overview, { position: [-210, 165, -225], target: [0, 40, 20], fov: 42 }, 'Overview camera matches P0 preset')
assert.deepEqual(camera.cameraViews.elevated, { position: [-150, 85, -165], target: [0, 54, 22], fov: 43 }, 'Elevated camera matches P0 preset')
for (const mode of ['overview', 'mega', 'elevated']) assert.deepEqual(camera.createSceneCamera(mode).position.toArray(), camera.cameraViews[mode].position, `${mode} camera starts at its preset`)
assert.deepEqual(camera.cameraPosition('mega', .5), camera.cameraViews.mega.position, 'Hero remains fixed in the 16:9 stage')
const heroDirection = new Vector3(...camera.cameraViews.mega.position).sub(new Vector3(...camera.cameraViews.mega.target))
const heroPolarAngle = Math.acos(heroDirection.y / heroDirection.length())
assert(heroPolarAngle * 180 / Math.PI < 112, 'Hero low-angle preset stays inside the 112-degree polar limit')

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
console.log(`P3 city clearing, four material families, through-portal, bus/workers, continuous bridge, cameras and geometry budget passed (${boxCount} instances, ${triangleCount} triangles).`)
