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
const backWall = structure.inset[0]
assert(backWall.position[2] > config.frontZ + 1, 'gate rear wall is recessed behind the front plane')
assert(backWall.size[2] < config.gate.depth, 'gate has an actual open tunnel depth')
assert(structure.inset.some(item => item.position[0] < 0 && item.size[2] === config.gate.depth), 'gate has a left side wall')
assert(structure.inset.some(item => item.position[0] > 0 && item.size[2] === config.gate.depth), 'gate has a right side wall')
assert(bridge.decks.length === config.bridgePath.length - 1, 'bridge deck follows every path segment')
assert(bridge.rails.length === bridge.decks.length * 2, 'bridge has two continuous rail edges')
assert(bridge.supports.filter(item => item.size[1] >= config.bridgeHeight).length >= 3, 'bridge has at least three grounded piers')
const endpoint = config.bridgePath.at(-1)
assert(Math.abs(endpoint[0]) < config.portalWidth / 2, 'bridge endpoint enters portal width')
assert(endpoint[2] > config.frontZ && endpoint[2] < config.frontZ + config.gate.depth, 'bridge endpoint enters the gate tunnel')
assert(bridge.platform.position[2] > endpoint[2], 'bridge endpoint lands on the interior platform')

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
