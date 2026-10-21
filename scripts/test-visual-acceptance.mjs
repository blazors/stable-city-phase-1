import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/visualAcceptance.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
const { parseVisualAcceptance, createVisualAcceptancePlan, getBenchmarkEnvironment } = await import(moduleUrl)

assert.equal(parseVisualAcceptance('?view=overview&theme=ember'), null, 'only quality view enables temporary acceptance mode')
assert.equal(parseVisualAcceptance('?view=quality&view=overview').view, 'quality', 'duplicate view fields use the first value')
assert.equal(getBenchmarkEnvironment(1280, 720, 1), 'ready', 'fixed viewport and DPR are benchmark-ready')
assert.equal(getBenchmarkEnvironment(1279, 720, 1), 'mismatch', 'a different viewport blocks benchmark readiness')
assert.equal(getBenchmarkEnvironment(1280, 720, 1.25), 'mismatch', 'a different device pixel ratio blocks benchmark readiness')
assert.equal(getBenchmarkEnvironment(1280, 720, 1.009), 'ready', 'small device pixel ratio rounding stays within tolerance')

const defaults = parseVisualAcceptance('?view=quality')
assert.deepEqual({ theme: defaults.theme, mode: defaults.mode, time: defaults.time, weather: defaults.weather, quality: defaults.quality, compare: defaults.compare }, {
  theme: 'harbor', mode: 'overview', time: 'sunset', weather: 'clear', quality: 'high', compare: 'theme',
}, 'missing fields use fixed acceptance defaults')

const strict = parseVisualAcceptance('?view=quality&theme=ember&theme=invalid&mode=unexpected&time=day&weather=rain&quality=low&compare=baseline')
assert.deepEqual({ theme: strict.theme, mode: strict.mode, time: strict.time, weather: strict.weather, quality: strict.quality, compare: strict.compare }, {
  theme: 'ember', mode: 'overview', time: 'day', weather: 'rain', quality: 'low', compare: 'baseline',
}, 'enum values are strict, field-local, and duplicate values use the first item')
assert.equal(parseVisualAcceptance('?view=quality&mode=elevated').mode, 'elevated', '3Q Elevated is a supported acceptance mode')

const plan = createVisualAcceptancePlan(2401, '/city/')
assert.equal(plan.schemaVersion, 1)
assert.equal(plan.kind, 'visual-acceptance-plan')
assert.equal(plan.seed, 2401)
assert.equal(plan.cameraLocked, true)
assert.deepEqual(plan.viewport, { width: 1280, height: 720, deviceScaleFactor: 1 })
assert.deepEqual(plan.scenarios.map(scenario => scenario.id), [
  'harbor-sunset', 'harbor-baseline', 'verdant-sunset', 'ember-sunset', 'harbor-day', 'harbor-night',
  'ember-rain-low', 'verdant-snow-balanced', 'harbor-haze-mega', 'harbor-elevated',
])
for (const scenario of plan.scenarios) {
  assert.equal(scenario.url.startsWith('/city/?'), true, `${scenario.id} has a full relative URL`)
  assert.equal(parseVisualAcceptance(new URL(scenario.url, 'https://example.test').search).view, 'quality')
  assert.equal(scenario.captureTarget, '[aria-label="视觉质量预览"]')
  assert.equal(scenario.evidenceStatus, 'not-executed')
}
assert.equal(plan.scenarios[1].compare, 'baseline')
assert.equal(plan.scenarios[6].weather, 'rain')
assert.equal(plan.scenarios[6].quality, 'low')
assert.equal(plan.scenarios[6].mode, 'mega')
assert.equal(plan.scenarios[6].time, 'night')
assert.equal(plan.scenarios[7].weather, 'snow')
assert.equal(plan.scenarios[7].quality, 'balanced')
assert.equal(plan.scenarios[7].mode, 'overview')
assert.equal(plan.scenarios[7].time, 'day')
assert.equal(plan.scenarios[8].mode, 'mega')
assert.equal(plan.scenarios[9].mode, 'elevated')
assert.equal(plan.animationCapture.framePolicy, 'not-pixel-identical')

console.log('Visual acceptance pure-function checks passed.')
