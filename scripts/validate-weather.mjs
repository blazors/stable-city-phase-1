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
const lensSource = fs.readFileSync(new URL('../src/weatherLens.ts', import.meta.url), 'utf8')
const lensOutput = ts.transpileModule(lensSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { lensBudgets, lensWeatherProfiles, lensSafeHalfSize, lensEdgeMask, lensStrength } = await import(`data:text/javascript;base64,${Buffer.from(lensOutput).toString('base64')}`)
assert.deepEqual(Object.keys(lensWeatherProfiles).sort(), ['clear', 'clouds', 'haze', 'rain', 'snow'])
assert.deepEqual(lensSafeHalfSize, [.30, .32])
for (let x = 20; x <= 80; x++) for (let y = 18; y <= 82; y++) {
  assert(Math.abs(lensEdgeMask(x / 100, y / 100)) < 1e-20, 'central 60% x 64% remains transparent')
}
for (const [u, v] of [[0, 0], [1, 1], [0, .5], [.5, 1]]) assert.equal(lensEdgeMask(u, v), 1)
assert(lensEdgeMask(.15, .5) > 0 && lensEdgeMask(.15, .5) < 1, 'edge has a smooth outward feather')
for (const profile of Object.values(lensWeatherProfiles)) for (const value of Object.values(profile)) {
  assert(Number.isFinite(value) && value >= 0 && value <= .36, 'lens weather stays bounded')
}
assert(lensWeatherProfiles.rain.rain > 0 && lensWeatherProfiles.rain.frost === 0)
assert(lensWeatherProfiles.snow.frost > 0 && lensWeatherProfiles.snow.rain === 0)
assert(lensWeatherProfiles.haze.dew > lensWeatherProfiles.rain.dew)
assert(lensWeatherProfiles.clear.glow <= .025 && lensWeatherProfiles.clouds.glow <= .015)
const qualities = ['high', 'auto', 'balanced', 'low']
for (let i = 1; i < qualities.length; i++) {
  const previous = lensBudgets[qualities[i - 1]], current = lensBudgets[qualities[i]]
  assert(previous.detail >= current.detail && previous.columns >= current.columns && previous.rows >= current.rows)
}
assert.equal(lensStrength('day', 'overview'), 1)
assert.equal(lensStrength('day', 'mega'), .8)
assert.equal(lensStrength('night', 'mega'), .52)
const lens = fs.readFileSync(new URL('../src/LensWeather.tsx', import.meta.url), 'utf8')
assert.match(lens, /gl_Position = vec4\(position.xy, 0.0, 1.0\)/, 'lens is screen-space')
assert.match(lens, /renderOrder=\{1000\} raycast=\{\(\) => null\}/, 'lens does not intercept interaction')
assert.match(lens, /transparent depthTest=\{false\} depthWrite=\{false\}/, 'lens never affects scene depth')
assert.match(lens, /if\(edge<=0.0\) discard/, 'protected center skips lens fragments')
assert.match(lens, /if \(motion.current\) elapsed.current \+= Math.min\(delta, \.05\)/, 'reduced motion freezes lens time')
assert.match(lens, /preference.addEventListener\('change', update\)/, 'runtime reduced motion changes are observed')
assert.match(lens, /preference.removeEventListener\('change', update\)/, 'preference listener is cleaned up')
assert.doesNotMatch(lens, /Math\.random|WebGLRenderTarget|camera\.position\.set|camera\.lookAt|setInterval/, 'lens does not mutate camera or allocate a render target')
assert.match(lens, /sun.z < 0 \? 1 : 0/, 'sun behind camera cannot create a lens glow')
assert.match(scene, /<LensWeather time=\{time\} weather=\{weather\} quality=\{quality\} mode=\{mode\} \/>/, 'both scene modes share lens integration')
console.log('Rain, snow and weather lens buffers, budgets, protected center, preference, depth and persistence contracts passed.')
