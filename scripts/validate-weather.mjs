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
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
assert.match(app, /Object\.hasOwn\(weatherLabels, persistedUi\.weather\)/, 'stored weather validates against available options')
console.log('Weather rain buffers, budgets, palette, occlusion and persistence contracts passed.')
