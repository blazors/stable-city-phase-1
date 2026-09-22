import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

// Execute the actual generators without adding a test runner or emitting build files.
async function sourceModule(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { generateMetropolis, riverCenter, riverHalfWidth } = await sourceModule('../src/metropolis.ts')
const { createStableCity, validateStableCity } = await sourceModule('../src/city.ts')
const overlapsCore = ({ position: [x, , z], size: [w, , d] }) => Math.abs(x) - w / 2 < 41.5 && Math.abs(z) - d / 2 < 41.5
const overlapsRiver = ({ position: [x, , z], size: [w, , d] }) => [-.5, 0, .5].some(offset => {
  const px = x + offset * w
  return Math.abs(z - riverCenter(px)) - d / 2 < riverHalfWidth(px)
})
for (const seed of [0, 1, 240319, 4294967295]) {
  const city = createStableCity(seed), scene = generateMetropolis(seed)
  assert.equal(validateStableCity(city).valid, true, `core contract: ${seed}`)
  assert.deepEqual(scene, generateMetropolis(seed), `deterministic outskirts: ${seed}`)
  for (const [name, items] of Object.entries(scene)) {
    if (name === 'bridges') continue
    for (const item of items) {
      assert(item.position.every(Number.isFinite), `${name}: finite position`)
      assert(item.size.every(n => Number.isFinite(n) && n > 0), `${name}: positive dimensions`)
    }
  }
  for (const name of ['buildings', 'terraces', 'roads', 'parks', 'trees', 'paths']) {
    for (const item of scene[name]) assert(!overlapsCore(item), `${name}: protected core intrusion ${JSON.stringify(item)}`)
  }
  for (const name of ['buildings', 'terraces', 'roads']) {
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
