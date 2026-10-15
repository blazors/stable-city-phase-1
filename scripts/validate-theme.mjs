import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

async function sourceModule(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}

const { themeSpecs } = await sourceModule('../src/theme.ts')
const { timeLighting } = await sourceModule('../src/lighting.ts')
const scene = fs.readFileSync(new URL('../src/CityScene.tsx', import.meta.url), 'utf8')
const materialSlots = ['bodyLight', 'bodyDark', 'trim', 'glass', 'foliage', 'emission', 'megaBody', 'megaInset']
const expectedSlots = {
  harbor: ['#c3c9bc', '#315b66', '#8aaba8', '#254650', '#557762', '#e2b273', '#c3c9bc', '#315b66'],
  verdant: ['#cecdb2', '#365c49', '#8fa27b', '#2e4941', '#64815c', '#e1cf8b', '#cecdb2', '#365c49'],
  ember: ['#bfa18d', '#583f3c', '#a2765d', '#303d44', '#6b7058', '#ee995d', '#bfa18d', '#583f3c'],
}
for (const [name, spec] of Object.entries(themeSpecs)) {
  for (const slot of materialSlots) assert.match(spec[slot], /^#[\da-f]{6}$/i, `${name}.${slot} is a valid hex color`)
  assert.deepEqual(materialSlots.map(slot => spec[slot]), expectedSlots[name], `${name} matches the authored material palette`)
}
for (const slot of materialSlots) assert.equal(new Set(Object.values(themeSpecs).map(spec => spec[slot])).size, 3, `${slot} separates all three themes`)
assert.deepEqual(timeLighting, {
  day: { hemisphere: 1.55, fill: .62 },
  sunset: { hemisphere: .88, fill: .35 },
  night: { hemisphere: .62, fill: .18 },
}, 'Stage 9 fill values preserve night and use the authored day/sunset reduction')
const mix = Number(scene.match(/const themeMix = ([\d.]+)/)?.[1])
assert(mix >= .2 && mix <= .3, 'outskirts receive 20–30% theme mixing')
assert.match(scene, /color\.setHSL\([\s\S]*?hsl\.l\)/, 'outskirts keep the original seed lightness')
assert.match(scene, /emissiveIntensity=\{night \? 1\.4 : \.08\}/, 'night window emission is 1.4')
console.log('Theme material slots, three-theme separation, mix ratio, seed lightness, lighting and night emission passed.')
