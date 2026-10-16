import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import { Vector3 } from 'three'

// Execute the actual generators without adding a test runner or emitting build files.
async function sourceModule(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  const resolved = outputText.replace(/from (['"])three\1/g, `from '${import.meta.resolve('three')}'`)
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`)
}
const { generateMetropolis, riverCenter, riverHalfWidth } = await sourceModule('../src/metropolis.ts')
const { createStableCity, validateStableCity } = await sourceModule('../src/city.ts')
const { cameraPosition, cameraViews, createSceneCamera, overviewDistanceOffset } = await sourceModule('../src/camera.ts')
const { weatherLighting, timeLighting, megaPracticalPositions, sceneFog } = await sourceModule('../src/lighting.ts')
const { createMegaRoofRibs, megaRoofDeck, megaRoofFascia, megaRoofRibHeight, megaRoofRibY, megaRoofSupportTop } = await sourceModule('../src/megaGeometry.ts')
const verticalBounds = ({ position: [, y], size: [, height] }) => ({ bottom: y - height / 2, top: y + height / 2 })
const fasciaBounds = verticalBounds(megaRoofFascia), deckBounds = verticalBounds(megaRoofDeck)
assert(fasciaBounds.bottom > megaRoofSupportTop, 'Mega roof fascia clears the support beam')
assert(deckBounds.bottom > fasciaBounds.top, 'Mega roof deck clears the accent fascia')
const roofRibs = createMegaRoofRibs()
assert(roofRibs.length > 15, 'Mega roof keeps its strong repeated-fin silhouette')
assert(megaRoofRibY - megaRoofRibHeight / 2 > deckBounds.top, 'Mega roof ribs clear the deck instead of interpenetrating it')
assert.deepEqual(Object.keys(weatherLighting), ['clear', 'haze', 'rain', 'snow'], 'four consolidated weather modes have lighting')
for (const time of Object.keys(timeLighting)) for (const weather of Object.keys(weatherLighting)) {
  const fog = sceneFog(time, weather, '#243c54')
  const baseline = weatherLighting[weather]
  assert.equal(fog.near, baseline.fogNear, 'fog adjustment preserves the near-field boundary')
  if (time === 'night' && weather === 'haze') {
    assert.equal(fog.far, baseline.fogFar, 'night fog sea preserves the same upper-skyline aerial distance')
    assert.equal(fog.color, '#344c60', 'night haze uses the authored cool aerial perspective')
  } else assert.deepEqual(fog, { color: '#243c54', near: baseline.fogNear, far: baseline.fogFar }, `${time}/${weather}: original fog retained`)
}
assert.deepEqual(sceneFog('night', 'clear', '#abcdef'), { color: '#abcdef', near: 340, far: 920 }, 'leaving night haze restores caller palette and clear distance')
assert(overviewDistanceOffset() > 0 && overviewDistanceOffset() < 100, 'overview distance compensation matches the wider authored camera')
assert.deepEqual(sceneFog('day', 'clear', '#abcdef', overviewDistanceOffset()), { color: '#abcdef', near: 340 + overviewDistanceOffset(), far: 920 + overviewDistanceOffset() }, 'overview fog follows the wider camera distance')
assert.deepEqual(sceneFog('day', 'clear', '#abcdef', 0), { color: '#abcdef', near: 340, far: 920 }, 'Mega keeps the original fog distance')
assert.deepEqual(weatherLighting.rain, { direct: .40, fill: .98, fogNear: 270, fogFar: 780 }, 'rain follows the authored visibility and lighting budget')
assert.deepEqual(weatherLighting.snow, { direct: .48, fill: 1.02, fogNear: 245, fogFar: 820 }, 'snow preserves authored near-field visibility')
assert(weatherLighting.clear.direct > weatherLighting.haze.direct && weatherLighting.haze.direct > weatherLighting.rain.direct, 'weather softens direct light progressively')
assert(weatherLighting.haze.fogNear > weatherLighting.clear.fogNear && weatherLighting.haze.fogFar > weatherLighting.clear.fogFar, 'fog sea keeps high skyline clear while its separate low layer hides streets')
for (const weather of Object.values(weatherLighting)) {
  assert(weather.fogFar > weather.fogNear && weather.fogNear > 100, 'fog preserves near-field receivers')
  for (const time of Object.values(timeLighting)) assert(time.hemisphere * weather.fill > .4 && time.fill > 0, 'lighting preserves silhouette fill in every state')
}
assert.equal(megaPracticalPositions.length, 2, 'bounded practical light count')
assert(megaPracticalPositions.every(position => position.every(Number.isFinite)), 'finite visible emitter positions')
for (const mode of ['overview', 'mega']) {
  const { position, target, fov } = cameraViews[mode]
  const initial = createSceneCamera(mode)
  assert.deepEqual(initial.position.toArray(), position, `${mode}: first-frame position is ready before mount`)
  const expectedDirection = new Vector3(...target).sub(initial.position).normalize()
  assert(initial.getWorldDirection(new Vector3()).distanceTo(expectedDirection) < 1e-9, `${mode}: first-frame direction targets the subject`)
  assert(initial.position.y > target[1] && initial.fov === fov, `${mode}: initial camera is above subject with authored lens`)
  assert.deepEqual(cameraPosition(mode, 1.5), position, `${mode}: desktop camera preset`)
  assert(fov > 30 && fov < 60, `${mode}: moderate perspective`)
  for (const aspect of [.5, 1, 1.5, 2.5]) {
    const adapted = cameraPosition(mode, aspect)
    assert(adapted.every(Number.isFinite), `${mode}: finite adapted position`)
    const scale = (adapted[0] - target[0]) / (position[0] - target[0])
    assert(scale >= 1 && scale <= 2.7, `${mode}: bounded viewport fit`)
    const distance = Math.hypot(...adapted.map((value, axis) => value - target[axis]))
    assert(distance < (mode === 'overview' ? 1700 : 800), `${mode}: orbit bounds retain adapted camera`)
    assert(distance < initial.far, `${mode}: adapted camera stays inside the far plane`)
    if (mode !== 'mega' || aspect >= .9) {
      for (let axis = 1; axis < 3; axis++) assert(Math.abs(adapted[axis] - target[axis] - (position[axis] - target[axis]) * scale) < 1e-9, `${mode}: landscape viewport preserves viewing direction`)
    } else {
      assert(Math.abs((adapted[0] - target[0]) / (adapted[2] - target[2])) < Math.abs((position[0] - target[0]) / (position[2] - target[2])), 'portrait Mega turns toward the central skyline valley')
    }
  }
}
const overviewCamera = createSceneCamera('overview')
overviewCamera.aspect = 1.5
overviewCamera.position.set(...cameraPosition('overview', 1.5))
overviewCamera.lookAt(...cameraViews.overview.target)
overviewCamera.updateProjectionMatrix()
overviewCamera.updateMatrixWorld()
for (const [x, z] of [[-234, -126], [234, -126], [-234, 234], [234, 234]]) {
  const projected = new Vector3(x, 0, z).project(overviewCamera)
  assert(Math.abs(projected.x) < 1.25 && projected.y > -1.25 && projected.y < .9, `overview keeps the occupied metropolitan grid near the safe frame`)
}
const foregroundTower = createStableCity().buildings.find(building => building.id === '1:0-0')
for (const aspect of [.5, 1.5]) {
  const camera = createSceneCamera('mega')
  camera.aspect = aspect
  camera.position.set(...cameraPosition('mega', aspect))
  camera.lookAt(...cameraViews.mega.target)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  const project = (x, y, z) => new Vector3(x, y, z).project(camera)
  const top = project(foregroundTower.x, foregroundTower.height, foregroundTower.z)
  const base = project(foregroundTower.x, 0, foregroundTower.z)
  const heroTop = project(0, 29, 9), heroBase = project(0, 0, 9)
  const heroHeight = heroTop.y - heroBase.y
  assert((top.y - base.y) / heroHeight < 1.35, 'Mega foreground tower has bounded perspective enlargement')
  assert(top.x < -.25 && top.x > -.9, 'Mega foreground tower stays a left-side scale reference')
  assert(heroHeight > .3 && heroTop.y < .8 && heroBase.y > -.8, 'Mega hero retains readable scale with vertical breathing room')
  if (aspect === .5) {
    assert(heroHeight > .38, 'portrait Mega preserves hero size instead of over-retreating')
    for (const x of [-13, 13]) for (const y of [0, 27]) {
      assert(Math.abs(project(x, y, 9).x) < .85, 'portrait Mega gate stays inside horizontal safe frame')
    }
  }
}
const overlapsCore = ({ position: [x, , z], size: [w, , d] }) => Math.abs(x) - w / 2 < 41.5 && Math.abs(z) - d / 2 < 41.5
const overlapsRiver = ({ position: [x, , z], size: [w, , d] }) => [-.5, 0, .5].some(offset => {
  const px = x + offset * w
  return Math.abs(z - riverCenter(px)) - d / 2 < riverHalfWidth(px)
})
const buildingSignatures = new Map([[0, 'ceaa3081'], [1, 'c2372da5'], [240319, 'eb5974fa'], [4294967295, '90d3a96f']])
const signature = items => {
  let hash = 2166136261
  for (const character of JSON.stringify(items)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619) }
  return (hash >>> 0).toString(16)
}
for (const seed of [0, 1, 240319, 4294967295]) {
  const city = createStableCity(seed), scene = generateMetropolis(seed)
  assert.equal(validateStableCity(city).valid, true, `core contract: ${seed}`)
  assert.deepEqual(scene, generateMetropolis(seed), `deterministic outskirts: ${seed}`)
  assert.equal(signature(scene.buildings), buildingSignatures.get(seed), `Stage 15 building masses stay unchanged: ${seed}`)
  const civicApron = scene.buildings.filter(({ position: [x, , z] }) => Math.abs(x) < 57 && z >= 54)
  assert(civicApron.length > 0, 'civic apron and skyline valley exist')
  assert(civicApron.every(({ size: [, height] }) => height <= 8), 'open civic apron and skyline valley stay low')
  const eastPeak = scene.buildings.filter(({ position: [x, , z], size: [, height] }) => x > 150 && z > 125 && height >= 25)
  const westPeak = scene.buildings.filter(({ position: [x, , z], size: [, height] }) => x < -120 && z > 70 && height >= 20)
  assert(eastPeak.length >= 3 && westPeak.length >= 2, 'flanking skyline peaks use grouped towers rather than isolated needles')
  assert(scene.buildings.every(({ size: [, height] }) => height <= 38), 'outer skyline remains inside the authored height cap')
  const parkMouth = scene.parks.filter(({ position: [x], size: [w] }) => w === 3 && x > -115 && x < -45)
  assert.equal(parkMouth.filter(({ size: [, , depth] }) => depth === 22).length, parkMouth.length / 2, 'south-bank park mouth widens continuously')
  assert(scene.buildings.length > 250 && scene.buildings.length <= Math.floor(291 * 1.25), 'controlled density stays within the 25% metropolitan budget without hollowing out the city')
  assert.equal(scene.visibleBodies.length, scene.buildings.length, 'every logical building has one visible body segment')
  assert.equal(scene.roofs.length, scene.buildings.length, 'every outer building receives exactly one roof')
  assert.equal(scene.terraces.length, scene.buildings.length, 'every outer building receives exactly one terrace')
  assert(scene.upperMasses.length > 100 && scene.upperMasses.length <= scene.buildings.length, 'upper masses stay a bounded subset of outer buildings')
  assert(scene.upperMasses.some(item => item.upperMassStyle === 'garden') && scene.upperMasses.some(item => item.upperMassStyle === 'tower') && scene.upperMasses.some(item => item.upperMassStyle === 'neighborhood'), 'all three district silhouette treatments are represented')
  for (const upper of scene.upperMasses) {
    const [x, y, z] = upper.position, [width, height, depth] = upper.size
    assert(upper.size.every(value => Number.isFinite(value) && value > 0), 'upper mass dimensions are finite and positive')
    assert(upper.position.every(Number.isFinite), 'upper mass position is finite')
    const index = upper.buildingIndex, base = scene.buildings[index], body = scene.visibleBodies[index]
    assert(base && body, 'upper mass references one existing logical and visible building')
    const [bx, by, bz] = base.position, [bw, bh, bd] = base.size
    const bodyTop = body.position[1] + body.size[1] / 2
    assert(Math.abs(x - bx) + width / 2 <= bw / 2 + 1e-9 && Math.abs(z - bz) + depth / 2 <= bd / 2 + 1e-9, 'upper mass stays inside its original footprint')
    assert(Math.abs(bodyTop - (y - height / 2)) < 1e-9, 'visible body and upper mass meet without overlapping volumes')
    assert(Math.abs(y + height / 2 - (by + bh / 2)) < 1e-9, 'upper mass preserves the original building height')
    assert(!overlapsCore(upper) && !overlapsRiver(upper), 'upper mass preserves protected core and river clearance')
  }
  const promenade = scene.paths.find(({ position: [x], size: [width, , depth] }) => Math.abs(x + 77) < 1e-9 && width === 3.6 && depth > 100)
  assert(promenade, 'civic park receives a continuous promenade toward the -66 bridge')
  assert(scene.routeLights.length >= 80 && scene.routeLights.length <= 100, 'bounded route-light network marks the two avenues and park axis')
  assert(scene.routeLights.every(item => !overlapsRiver(item)), 'route-light network stops at the river banks instead of floating over water')
  scene.buildings.forEach((building, index) => {
    const [x, y, z] = building.position, [width, height, depth] = building.size
    const body = scene.visibleBodies[index], upper = scene.upperMasses.find(item => item.buildingIndex === index)
    const topMass = upper ?? body, roof = scene.roofs[index], terrace = scene.terraces[index]
    assert(Math.abs(body.position[1] - body.size[1] / 2) < 1e-9, 'visible body remains grounded at its original base')
    assert(Math.abs(body.position[1] + body.size[1] / 2 + (upper?.size[1] ?? 0) - height) < 1e-9, 'visible body and upper mass union reaches the original building height')
    assert(Math.abs(roof.position[0] - topMass.position[0]) < 1e-9 && Math.abs(roof.position[2] - topMass.position[2]) < 1e-9, 'roof follows the actual highest mass center')
    assert(Math.abs(roof.position[1] - (topMass.position[1] + topMass.size[1] / 2 + .12)) < 1e-9, 'roof aligns to the actual highest mass top')
    if (upper) assert(roof.size[0] <= topMass.size[0] + 1e-9 && roof.size[2] <= topMass.size[2] + 1e-9, 'stepped roof does not overhang the actual highest mass')
    else assert(roof.size[0] >= width && roof.size[2] >= depth, 'unstepped roof continues to cover its body')
    assert.deepEqual([terrace.position[0], terrace.position[2]], [x, z], 'terrace stays centered on its building')
    assert(body.size[0] <= width && body.size[2] <= depth, 'visible body stays inside the logical building footprint')
  })
  for (const window of scene.windows) {
    const body = scene.visibleBodies[window.buildingIndex]
    const upper = scene.upperMasses.find(item => item.buildingIndex === window.buildingIndex)
    if (upper) assert(window.position[1] + window.size[1] / 2 <= body.position[1] + body.size[1] / 2 + 1e-9, 'stepped building windows stay on the shortened visible body')
  }
  const pairedBuildings = scene.buildings.filter((building, index, buildings) => buildings.slice(index + 1).some(other =>
    !building.tower && !other.tower && Math.abs(Math.abs(building.position[0] - other.position[0]) - 6.8) < 1e-9 && Math.abs(building.position[2] - other.position[2]) <= 1
  ))
  assert(pairedBuildings.length > 0, 'controlled two-building parcels are generated')
  const northEdge = x => 252 + Math.sin(x / 80) * 22 - .0005 * x * x
  assert(scene.buildings.every(({ position: [x, , z] }) => z <= northEdge(x) - 36), 'north edge green buffer remains free of buildings')
  for (const [name, items] of Object.entries(scene)) {
    if (name === 'bridges') continue
    for (const item of items) {
      assert(item.position.every(Number.isFinite), `${name}: finite position`)
      assert(item.size.every(n => Number.isFinite(n) && n > 0), `${name}: positive dimensions`)
    }
  }
  for (const name of ['buildings', 'visibleBodies', 'upperMasses', 'terraces', 'roads', 'parks', 'trees', 'paths', 'routeLights']) {
    for (const item of scene[name]) assert(!overlapsCore(item), `${name}: protected core intrusion ${JSON.stringify(item)}`)
  }
  for (const name of ['buildings', 'visibleBodies', 'upperMasses', 'terraces', 'roads']) {
    for (const item of scene[name]) assert(!overlapsRiver(item), `${name}: river intrusion ${JSON.stringify(item)}`)
  }
  for (const bridge of scene.bridges) {
    for (const dx of [-2.5, 0, 2.5]) {
      assert(bridge.z - bridge.span / 2 < riverCenter(bridge.x + dx) - riverHalfWidth(bridge.x + dx), 'bridge reaches south bank')
      assert(bridge.z + bridge.span / 2 > riverCenter(bridge.x + dx) + riverHalfWidth(bridge.x + dx), 'bridge reaches north bank')
    }
  }
  console.log(`seed ${seed}: ${scene.buildings.length} outer buildings, ${scene.bridges.length} bridges, core ${city.signature}; geometry checks passed`)
}
assert.notDeepEqual(generateMetropolis(0).buildings, generateMetropolis(1).buildings, 'different seeds vary outer buildings')
console.log('Metropolitan determinism, finite geometry, protected core, river clearance and bridge spans passed.')
