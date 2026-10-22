import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { Vector3 } from 'three'

const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const moduleFrom = output => import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
const configUrl = `data:text/javascript;base64,${Buffer.from(transpile(await readFile(new URL('../src/sceneConfig.ts', import.meta.url), 'utf8'))).toString('base64')}`
const { sceneConfig } = await moduleFrom(transpile(await readFile(new URL('../src/sceneConfig.ts', import.meta.url), 'utf8')))
const resolveThree = `from '${import.meta.resolve('three')}'`
const camera = await moduleFrom(transpile((await readFile(new URL('../src/camera.ts', import.meta.url), 'utf8')).replace(/from (['"])three\1/g, resolveThree).replace(/from (['"])\.\/sceneConfig\1/g, `from '${configUrl}'`)))
const mega = await moduleFrom(transpile((await readFile(new URL('../src/megaGeometry.ts', import.meta.url), 'utf8')).replace(/from (['"])three\1/g, resolveThree).replace(/from (['"])\.\/sceneConfig\1/g, `from '${configUrl}'`)))
const city = await moduleFrom(transpile(await readFile(new URL('../src/city.ts', import.meta.url), 'utf8')))

const config = sceneConfig.mega
const structure = mega.createMegaStructureGeometry()
const bridge = mega.createMegaBridgeGeometry()
assert.deepEqual(config.dimensions, { width: 140, height: 124, depth: 50 }, 'mega overall dimensions are 140 x 124 x 50')
assert.deepEqual(config.center, [0, 62, 21], 'mega center is authored at [0,62,21]')
assert.deepEqual(config.gate, { width: 64, height: 92, depth: 40 }, 'portal clear opening is 64 x 92 x 40')
assert.equal(structure.inset.length, 0, 'portal has no rear wall or inset solids')
assert.deepEqual(structure.bodies.slice(0, 2).map(item => item), [
  { position: [-42, 53, 20], size: [20, 78, 40] }, { position: [42, 53, 20], size: [20, 78, 40] },
], 'main piers retain the authored x ±42 dimensions and position')
assert.deepEqual(structure.bodies.slice(2, 4).map(item => item), [
  { position: [-55, 7, 20], size: [26, 14, 44] }, { position: [55, 7, 20], size: [26, 14, 44] },
], 'expanded bases retain the authored x ±55 dimensions and position')
assert.deepEqual(structure.bodies.slice(4, 7).map(item => item), [
  { position: [0, 97, 20], size: [124, 10, 40] }, mega.megaRoofFascia, mega.megaRoofDeck,
], 'three roof tiers meet continuously and the roof aliases reference those same boxes')
assert.equal(mega.megaRoofFascia.position[1] - mega.megaRoofFascia.size[1] / 2, 102, 'second crown tier starts exactly at the first tier top')
assert.equal(mega.megaRoofDeck.position[1] - mega.megaRoofDeck.size[1] / 2, 118, 'upper roof deck starts exactly at the fascia top')
assert.equal(structure.braces.filter(item => item.size[0] === 8 && item.size[1] === 84.853).length, 4, 'four long diagonal piers use the authored section')
assert.equal(structure.braces.filter(item => item.size[1] === 100 && item.size[0] === 1.4).length, 16, 'front and rear facades use eight full-height ribs each')
assert.equal(structure.braces.filter(item => item.position[1] === 110 && item.size[1] === 16).length, 7, 'crown face receives seven full-depth ribs')
const corridors = structure.braces.filter(item => item.position[1] === 18 && item.size[0] === 8 && item.size[1] === 1.2)
assert.deepEqual(corridors.map(item => item.position[0]), [-28, 28], 'paired internal side corridors sit along both inner faces')
assert(corridors.every(item => item.position[2] + item.size[2] / 2 === 36), 'inner corridors meet the rear platform without overlapping it')
const rearPlatform = structure.bodies.filter(item => item.position[1] === 18 && item.position[2] === 41 && item.size[1] === 1.2)
assert.deepEqual(rearPlatform.map(item => [item.position[0] - item.size[0] / 2, item.position[0] + item.size[0] / 2]), [[-32, 8.5], [15.5, 32]], 'rear platform leaves the 7-unit bridge lane clear without losing either side landing')
assert(bridge.decks.length > config.bridgePath.length - 1, 'bridge deck follows the path to its landing and adds turn plates')
assert.equal(bridge.decks.filter(item => item.size[0] === 7.2 && item.size[1] === 1.2 && item.size[2] === 7.2).length, 4, 'all four bridge turns receive 7.2-unit joint plates')
assert(bridge.rails.length === (config.bridgePath.length - 1) * 2, 'bridge has two continuous rail edges')
const bridgePiers = bridge.supports.filter(item => item.size[0] === 1.4)
const bridgeCrossheads = bridge.supports.filter(item => item.size[1] === 1)
assert.equal(bridgePiers.length, 7, 'seven bridge piers reach the ground')
const endpoint = config.bridgePath.at(-1)
assert(Math.abs(endpoint[0]) < config.portalWidth / 2, 'bridge endpoint enters portal width')
assert(config.bridgePath.some(([, , z]) => z > config.frontZ && z < config.frontZ + config.gate.depth), 'bridge path enters the gate tunnel')
assert(Math.abs(bridge.platform.position[2] - endpoint[2]) <= bridge.platform.size[2] / 2, 'bridge endpoint lands on the interior platform')
assert.deepEqual(bridge.platform, { position: [12, 18, 62], size: [18, 1.2, 14] }, 'bridge lands on the authored end platform')
const finalDeck = bridge.decks[config.bridgePath.length - 2]
assert.equal(finalDeck.position[2] + finalDeck.size[2] / 2, bridge.platform.position[2] - bridge.platform.size[2] / 2, 'final deck meets the landing edge without coplanar overlap')
assert.equal(bridge.decks[0].size[1], 1.2, 'bridge deck thickness is 1.2')
assert(bridge.rails.every(item => item.size[0] === .25 && item.size[1] === .45), 'bridge rails keep the authored slim section')
assert(bridge.rails.every(item => Math.abs(item.position[1] - .225 - 18 - .6) < 1e-9), 'bridge rails sit directly on the deck edges')
const railSegmentEnds = item => {
  const [x, y, z] = item.position, angle = item.rotation[1], half = item.size[2] / 2
  const direction = [Math.sin(angle) * half, Math.cos(angle) * half]
  return [[x - direction[0], y, z - direction[1]], [x + direction[0], y, z + direction[1]]]
}
for (let side = 0; side < 2; side++) for (let segment = 0; segment < config.bridgePath.length - 2; segment++) {
  const [, end] = railSegmentEnds(bridge.rails[side * (config.bridgePath.length - 1) + segment])
  const [start] = railSegmentEnds(bridge.rails[side * (config.bridgePath.length - 1) + segment + 1])
  assert(Math.hypot(end[0] - start[0], end[2] - start[2]) < 1e-6, 'adjacent rail segments share their exact mitered turn point')
}
assert(bridge.supports.every(item => item.size[0] === 1.4 || item.position[1] === 16.9), 'bridge supports use grounded piers and under-deck crossheads')
assert(bridgePiers.every(item => item.position[1] - item.size[1] / 2 === 0), 'every bridge pier reaches grade')
assert(bridgePiers.every(item => item.position[1] + item.size[1] / 2 === 16.4), 'every bridge pier meets its crosshead without penetrating it')
assert(bridgeCrossheads.every(item => item.position[1] - item.size[1] / 2 === 16.4 && item.position[1] + item.size[1] / 2 === 17.4), 'crossheads connect pier tops to deck undersides without overlap')
assert(endpoint[2] > config.frontZ + config.dimensions.depth, 'bridge extends through and beyond the rear facade')

const visibleBuildings = mega.deriveMegaHeroClearance(city.createStableCity()).visibleBuildings
const clearAt = (x, z, radius = 3.2) => visibleBuildings.every(building =>
  Math.abs(x - building.x) > radius + building.width / 2 || Math.abs(z - building.z) > radius + building.depth / 2)
for (let i = 0; i < config.bridgePath.length - 1; i++) {
  const from = config.bridgePath[i], to = config.bridgePath[i + 1]
  for (let step = 0; step <= 10; step++) {
    const t = step / 10
    const sampleX = from[0] + (to[0] - from[0]) * t, sampleZ = from[2] + (to[2] - from[2]) * t
    const blocking = visibleBuildings.find(building => Math.abs(sampleX - building.x) <= 3.2 + building.width / 2 && Math.abs(sampleZ - building.z) <= 3.2 + building.depth / 2)
    assert(!blocking, `bridge keeps clearance from visible ordinary buildings at ${sampleX},${sampleZ}${blocking ? ` (${blocking.x},${blocking.z})` : ''}`)
  }
}

const elevatedCamera = camera.createSceneCamera('elevated')
assert.deepEqual(camera.cameraViews.hero, { position: [-68, 14, -196], target: [-6, 62, 20], fov: 44 }, 'Hero camera uses the fixed authored 16:9 composition')
const heroCamera = camera.createSceneCamera('hero')
heroCamera.aspect = 16 / 9
heroCamera.position.set(...camera.cameraPosition('hero', 16 / 9))
heroCamera.lookAt(...camera.cameraViews.hero.target)
heroCamera.updateProjectionMatrix()
heroCamera.updateMatrixWorld()
const heroProject = (x, y, z) => new Vector3(x, y, z).project(heroCamera)
const heroElevation = Math.atan2(camera.cameraViews.hero.target[1] - camera.cameraViews.hero.position[1], Math.hypot(camera.cameraViews.hero.position[0] - camera.cameraViews.hero.target[0], camera.cameraViews.hero.position[2] - camera.cameraViews.hero.target[2])) * 180 / Math.PI
assert(heroElevation >= 0 && heroElevation < 20, `hero camera keeps the authored upward viewing angle (got ${heroElevation.toFixed(2)})`)
assert.deepEqual(camera.cameraPosition('hero', .5), camera.cameraViews.hero.position, 'Hero camera is not dolly-adapted to a narrow outer slot')
const projectedBox = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap(x => [y0, y1].flatMap(y => [z0, z1].map(z => heroProject(x, y, z))))
const entityProjected = projectedBox(-70, 70, 0, 124, -4, 46)
const entityWidthShare = (Math.max(...entityProjected.map(point => point.x)) - Math.min(...entityProjected.map(point => point.x))) / 2
const entityHeightShare = (Math.max(...entityProjected.map(point => point.y)) - Math.min(...entityProjected.map(point => point.y))) / 2
assert(entityWidthShare >= .45 && entityWidthShare <= .55, `Hero entity occupies 45-55% frame width (got ${entityWidthShare.toFixed(3)})`)
assert(entityHeightShare >= .75 && entityHeightShare <= .85, `Hero entity occupies 75-85% frame height (got ${entityHeightShare.toFixed(3)})`)
assert(entityProjected.every(point => Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1), 'complete Hero entity remains inside the 16:9 frame')
const gateProjected = projectedBox(-32, 32, 0, 92, 0, 40)
assert(gateProjected.every(point => Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1), 'actual 64 x 92 x 40 gate clearance remains in frame')
const opening = { x: [-32, 32], y: [0, 92], z: [0, 40] }
for (const item of [...structure.bodies.slice(0, 13), ...structure.inset]) {
  const [x, y, z] = item.position, [w, h, d] = item.size
  assert(x + w / 2 <= opening.x[0] || x - w / 2 >= opening.x[1] || y + h / 2 <= opening.y[0] || y - h / 2 >= opening.y[1] || z + d / 2 <= opening.z[0] || z - d / 2 >= opening.z[1], `exterior solid preserves the through-opening: ${JSON.stringify(item)}`)
}
for (const item of [...structure.bodies, ...structure.inset, ...structure.braces]) {
  const [x, y, z] = item.position, [w, h, d] = item.size
  assert(Math.abs(x) - w / 2 >= 24 || y + h / 2 <= 20 || y - h / 2 >= 92 || z + d / 2 <= 0 || z - d / 2 >= 36, `central volume above the interior bridge remains open: ${JSON.stringify(item)}`)
}
for (const [x, y, z] of config.bridgePath) {
  const projected = heroProject(x, y + .5, z)
  assert(!(projected.x > .25 && projected.y < -.45), 'hero bridge stays out of the lower-right scene-caption safe zone')
}
for (const [x, , z] of config.bridgePath) {
  if (z > 0 && z < 40) assert(Math.abs(x) < config.portalWidth / 2 - 3.5, 'bridge keeps its 7-unit deck clear of portal pillars')
}
assert.deepEqual(camera.cameraViews.elevated, { position: [-125, 63, -155], target: [0, 37, 18], fov: 46 }, 'Elevated camera matches authored composition')
elevatedCamera.aspect = 1280 / 720
elevatedCamera.position.set(...camera.cameraPosition('elevated', elevatedCamera.aspect))
elevatedCamera.lookAt(...camera.cameraViews.elevated.target)
elevatedCamera.updateProjectionMatrix()
for (const [x, y, z] of config.bridgePath) {
  const projected = new Vector3(x, y + .5, z).project(elevatedCamera)
  assert(!(projected.x < -.25 && projected.y < -.45), 'bridge stays out of the lower-left scene-caption safe zone')
}

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const sceneSource = await readFile(new URL('../src/CityScene.tsx', import.meta.url), 'utf8')
const styleSource = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')
assert.match(source, /cameraModePicker[\s\S]*3Q Elevated/, 'UI exposes the third camera preset')
assert.match(source, /saveUiDraft\(\{ time, weather, mode,/, 'camera mode remains in UI draft persistence')
assert.match(sceneSource, /data-hero-aspect=\{mode === 'mega' \? 'fixed' : 'fluid'\}[\s\S]*style=\{mode === 'mega' \? \{ position: 'relative', width: 'min\(100%, 177\.7778cqh\)', height: 'auto', aspectRatio: '16 \/ 9' \}/, 'Hero Canvas host uses its real centered 16:9 drawing surface')
assert.match(styleSource, /container-type: size; display: grid; place-items: center/,'Hero frame is contained and centered in the responsive slot')
assert.match(styleSource, /\.scene-caption \{ left: calc\(\(100cqw - min\(100cqw, 177\.7778cqh\)\) \/ 2 \+ 22px\); right: auto;/, 'caption follows the actual 16:9 frame edge and stays in the lower-left title-safe area')
assert.match(styleSource, /\.scene-grade, [\s\S]*?\.scene-aperture \{ left: 50%; top: 50%; right: auto; bottom: auto; width: min\(100cqw, 177\.7778cqh\); aspect-ratio: 16 \/ 9; transform: translate\(-50%, -50%\); \}/, 'grade and aperture share the exact contained 16:9 Hero frame')
console.log('ATLAS V2 portal, bridge, camera and caption-safe geometry checks passed.')
