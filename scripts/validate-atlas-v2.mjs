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
assert.deepEqual(config.dimensions, { width: 132, height: 92, depth: 36 }, 'mega overall dimensions are 132 x 92 x 36')
assert.deepEqual(config.center, [0, 46, 18], 'mega center is authored at [0,46,18]')
assert.deepEqual(config.gate, { width: 66, height: 66, depth: 36 }, 'portal clear opening is 66 x 66 x 36')
assert.equal(structure.inset.length, 0, 'portal has no rear wall or inset solids')
assert.deepEqual(structure.bodies.slice(0, 2).map(item => item.size), [[22, 52, 36], [22, 52, 36]], 'upper pillars use authored 22 x 52 x 36 sections')
assert.deepEqual(structure.bodies.slice(2, 4).map(item => item.size), [[30, 14, 40], [30, 14, 40]], 'expanded bases use authored 30 x 14 x 40 sections')
assert.deepEqual(structure.bodies[4].size, [120, 22, 36], 'main beam uses authored 120 x 22 x 36 section')
assert.deepEqual(mega.megaRoofFascia.size, [132, 4, 40], 'top cap uses authored 132 x 4 x 40 section')
assert.equal(mega.createMegaRoofRibs().length, 9, 'roof ribs are reduced to nine')
assert(mega.createMegaRoofRibs().every(item => item.size[1] >= .8 && item.size[1] <= 1.2), 'roof ribs stay within the reduced height budget')
assert.equal(structure.braces.length, 4, 'two real 8 x 8 braces per side are present')
assert(structure.braces.every(item => item.size[0] === 8 && item.size[2] === 8), 'braces retain a real 8 x 8 cross-section')
assert(bridge.decks.length === config.bridgePath.length - 1, 'bridge deck follows every path segment')
assert(bridge.rails.length === bridge.decks.length * 2, 'bridge has two continuous rail edges')
assert(bridge.supports.filter(item => item.size[1] >= config.bridgeHeight).length >= 3, 'bridge has at least three grounded piers')
const endpoint = config.bridgePath.at(-1)
assert(Math.abs(endpoint[0]) < config.portalWidth / 2, 'bridge endpoint enters portal width')
assert(config.bridgePath.some(([, , z]) => z > config.frontZ && z < config.frontZ + config.gate.depth), 'bridge path enters the gate tunnel')
assert(Math.abs(bridge.platform.position[2] - endpoint[2]) <= bridge.platform.size[2] / 2, 'bridge endpoint lands on the interior platform')
assert.deepEqual(bridge.platform, { position: [0, 15, 37], size: [12, .8, 14] }, 'interior platform is authored at [0,15,37]')
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
assert.deepEqual(camera.cameraViews.hero, { position: [-24, 3.5, -115], target: [0, 38, 16], fov: 50 }, 'Hero camera matches authored low street composition')
const heroCamera = camera.createSceneCamera('hero')
heroCamera.aspect = 2.4
heroCamera.position.set(...camera.cameraPosition('hero', heroCamera.aspect))
heroCamera.lookAt(...camera.cameraViews.hero.target)
heroCamera.updateProjectionMatrix()
heroCamera.updateMatrixWorld()
const heroProject = (x, y, z) => new Vector3(x, y, z).project(heroCamera)
const heroElevation = Math.atan2(camera.cameraViews.hero.target[1] - camera.cameraViews.hero.position[1], Math.hypot(camera.cameraViews.hero.position[0] - camera.cameraViews.hero.target[0], camera.cameraViews.hero.position[2] - camera.cameraViews.hero.target[2])) * 180 / Math.PI
assert(camera.cameraViews.hero.position[1] >= 3 && camera.cameraViews.hero.position[1] <= 10, 'hero camera remains in the low street-level height band')
assert(heroElevation >= 8 && heroElevation <= 15, `hero camera keeps the authored 8-15 degree elevation (got ${heroElevation.toFixed(2)})`)
const gateProjected = [-config.portalWidth / 2, config.portalWidth / 2].flatMap(x => [0, config.dimensions.height].flatMap(y => [config.frontZ, config.frontZ + config.gate.depth].map(z => heroProject(x, y, z))))
const gateScreenShare = Math.max(...gateProjected.map(point => point.x)) - Math.min(...gateProjected.map(point => point.x))
assert(gateScreenShare >= .50 && gateScreenShare <= .65, `hero gate width stays in the 50-65% screen band (got ${gateScreenShare.toFixed(3)})`)
const gateScreenHeight = (Math.max(...gateProjected.map(point => point.y)) - Math.min(...gateProjected.map(point => point.y))) / 2
assert(gateScreenHeight >= .65 && gateScreenHeight <= .80, `hero gate height stays in the 65-80% screen band (got ${gateScreenHeight.toFixed(3)})`)
assert(Math.max(...gateProjected.map(point => point.y)) < 1 && Math.min(...gateProjected.map(point => point.y)) > -1, 'hero gate remains fully inside the frame with sky and ground margins')
for (const [x, y, z] of config.bridgePath) {
  const projected = heroProject(x, y + .5, z)
  assert(!(projected.x < -.25 && projected.y < -.45), 'hero bridge stays out of the lower-left scene-caption safe zone')
}
for (const [x, , z] of config.bridgePath) {
  if (z > config.frontZ && z < config.frontZ + config.gate.depth) assert(Math.abs(x) < config.portalWidth / 2 - 3, 'bridge keeps its 6-unit deck clear of portal pillars')
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
assert.match(source, /cameraModePicker[\s\S]*3Q Elevated/, 'UI exposes the third camera preset')
assert.match(source, /saveUiDraft\(\{ time, weather, mode,/, 'camera mode remains in UI draft persistence')
console.log('ATLAS V2 portal, bridge, camera and caption-safe geometry checks passed.')
