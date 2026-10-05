import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/rain.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
const { createRainAttributes, rainBudgets, rainPalettes } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
for (const [quality, count] of Object.entries(rainBudgets)) {
  const a = createRainAttributes(count), b = createRainAttributes(count)
  assert.equal(a.position.length, count * 6, `${quality}: two endpoints per streak`)
  for (const key of Object.keys(a)) {
    assert.deepEqual(a[key], b[key], `${quality}: deterministic ${key}`)
    assert(a[key].every(Number.isFinite), `${quality}: finite ${key}`)
  }
  assert.equal(new Set(a.layer).size, 3, `${quality}: three layers`)
  const layers = [0, 0, 0]
  for (let i = 0; i < count; i++) layers[a.layer[i * 2]]++
  const near = Math.round(count * .15), middle = Math.round(count * .55)
  assert.deepEqual(layers, [count - near - middle, middle, near], `${quality}: exact near/middle/far 15/55/30 distribution`)
  for (let i = 0; i < count; i++) {
    assert.equal(a.phase[i * 2], a.phase[i * 2 + 1], 'endpoints wrap together')
    assert.equal(a.layer[i * 2], a.layer[i * 2 + 1], 'endpoints share their layer')
    assert.equal(a.tip[i * 2], 0); assert.equal(a.tip[i * 2 + 1], 1)
  }
}
assert(rainBudgets.high > rainBudgets.auto && rainBudgets.auto >= rainBudgets.balanced && rainBudgets.balanced > rainBudgets.low)
assert.equal(rainBudgets.low, 600)
for (const palette of Object.values(rainPalettes)) for (const color of Object.values(palette)) assert.match(color, /^#[a-f\d]{6}$/i)
const precipitation = fs.readFileSync(new URL('../src/Precipitation.tsx', import.meta.url), 'utf8')
assert.match(precipitation, /transparent depthTest depthWrite=\{false\}/, 'precipitation is occluded by opaque architecture')
assert.match(precipitation, /prefers-reduced-motion: reduce/, 'rain respects reduced motion')
assert.match(precipitation, /night \? \.75 : 1/, 'night rain reduces opacity')
assert.match(precipitation, /distance\(cameraPosition,p\)/, 'world-space rain fades with actual camera distance')
assert.match(precipitation, /19\.0\+aLayer\*4\.0/, 'near streaks fall faster than far streaks')
assert.match(precipitation, /\.65\+aLayer\*\.75/, 'near streaks are longer than far streaks')
assert.match(precipitation, /\.12\+aLayer\*\.035/, 'far streaks remain fainter')
const snowSource = fs.readFileSync(new URL('../src/snow.ts', import.meta.url), 'utf8')
const snowOutput = ts.transpileModule(snowSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { snowBudgets, snowPalettes, snowCaps, snowRoadEdges } = await import(`data:text/javascript;base64,${Buffer.from(snowOutput).toString('base64')}`)
assert.deepEqual(snowBudgets, { high: 1600, auto: 1200, balanced: 1000, low: 400 })
for (const count of Object.values(snowBudgets)) {
  const a = createRainAttributes(count, 8105), b = createRainAttributes(count, 8105)
  assert.deepEqual(a, b, 'snow reuses deterministic three-layer world-box attributes')
  const counts = [0, 0, 0]
  for (let i = 0; i < count; i++) counts[a.layer[i * 2]]++
  assert.deepEqual(counts, [Math.round(count * .30), Math.round(count * .55), Math.round(count * .15)], 'snow is near sparse / middle dominant / far small')
}
for (const palette of Object.values(snowPalettes)) {
  for (const color of Object.values(palette)) assert.match(color, /^#[a-f\d]{6}$/i)
  assert(parseInt(palette.water.slice(1, 3), 16) < 60, 'snow river remains dark')
}
const surface = { position: [10, 8, 20], size: [4, 2, 6] }
const original = structuredClone(surface), [cap] = snowCaps([surface])
assert.deepEqual(surface, original, 'snow overlays never mutate authoritative geometry')
assert(cap.position[1] - cap.size[1] / 2 > surface.position[1] + surface.size[1] / 2, 'snow caps clear the receiver top')
assert.equal(cap.size[1], .10, 'thin snow preserves roof silhouette')
for (const road of [{ position: [0, .025, 0], size: [3, .05, 78] }, { position: [0, .035, 0], size: [78, .05, 3] }]) {
  const edges = snowRoadEdges([road])
  assert.equal(edges.length, 2)
  const axis = road.size[0] < road.size[2] ? 0 : 2
  assert(edges.every(edge => Math.abs(edge.position[axis]) - edge.size[axis] / 2 > 1), 'snow road edges leave the central driving lane dark')
}
assert.match(precipitation, /<points frustumCulled=\{false\}>/, 'snow uses a single point batch')
assert.match(precipitation, /gl_PointCoord/, 'snowflakes have soft round silhouettes')
assert.match(precipitation, /1\.8\+aLayer\*1\.6/, 'near snowflakes are larger')
assert.match(precipitation, /sin\(aPhase\*6\.283\+uTime\*\.22\)/, 'snow has bounded light wind')
const scene = fs.readFileSync(new URL('../src/CityScene.tsx', import.meta.url), 'utf8')
assert.match(scene, /snowCaps\(\[megaRoofDeck, \.\.\.createMegaRoofRibs\(\)\]\)/, 'snow follows the separate hero roof ribs')
assert.match(scene, /count=\{snowBudgets\[quality\]\}/, 'all qualities retain snow identity')
assert.match(scene, /function SnowSurfaces[\s\S]*?<planeGeometry \/>/, 'snow cover uses a low-triangle instanced plane batch')
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
assert.match(app, /Object\.hasOwn\(weatherLabels, persistedUi\.weather\)/, 'stored weather validates against available options')
console.log('Rain and snow buffers, budgets, palettes, surface clearance, occlusion and persistence contracts passed.')
