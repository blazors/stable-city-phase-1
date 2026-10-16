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
const expectedResponses = {
  harbor: { coreBody: { roughness: .84, metalness: .03 }, coreTrim: { roughness: .62, metalness: .12 }, coreGlass: { roughness: .34, metalness: .12 }, megaBody: { roughness: .74, metalness: .05 }, megaRibs: { roughness: .48, metalness: .20 }, megaInset: { roughness: .36, metalness: .16 } },
  verdant: { coreBody: { roughness: .90, metalness: .01 }, coreTrim: { roughness: .78, metalness: .03 }, coreGlass: { roughness: .43, metalness: .08 }, megaBody: { roughness: .84, metalness: .02 }, megaRibs: { roughness: .66, metalness: .06 }, megaInset: { roughness: .48, metalness: .08 } },
  ember: { coreBody: { roughness: .78, metalness: .08 }, coreTrim: { roughness: .56, metalness: .22 }, coreGlass: { roughness: .32, metalness: .18 }, megaBody: { roughness: .67, metalness: .14 }, megaRibs: { roughness: .44, metalness: .28 }, megaInset: { roughness: .31, metalness: .22 } },
}
for (const [name, spec] of Object.entries(themeSpecs)) {
  for (const slot of materialSlots) assert.match(spec[slot], /^#[\da-f]{6}$/i, `${name}.${slot} is a valid hex color`)
  assert.deepEqual(materialSlots.map(slot => spec[slot]), expectedSlots[name], `${name} matches the authored material palette`)
  assert.deepEqual(spec.materialResponse, expectedResponses[name], `${name} matches the authored roughness and metalness response`)
}
for (const slot of materialSlots) assert.equal(new Set(Object.values(themeSpecs).map(spec => spec[slot])).size, 3, `${slot} separates all three themes`)
assert.deepEqual(timeLighting, {
  day: { hemisphere: 1.55, fill: .62 },
  sunset: { hemisphere: .88, fill: .35 },
  night: { hemisphere: .84, fill: .30 },
}, 'Stage 9 fill values preserve night and use the authored day/sunset reduction')
const mix = Number(scene.match(/const themeMix = ([\d.]+)/)?.[1])
assert(mix >= .2 && mix <= .3, 'outskirts receive 20–30% theme mixing')
assert.match(scene, /color\.setHSL\([\s\S]*?hsl\.l\)/, 'outskirts keep the original seed lightness')
assert.match(scene, /emissiveIntensity=\{night \? 1\.4 : \.08\}/, 'night window emission is 1.4')
assert.match(scene, /const response = theme \? themeSpecs\[theme\]\.materialResponse : null/, 'Theme OFF has no material response override')
assert.match(scene, /roughness=\{roughness \?\? \(glow \? \.45 : wet \? \.22 : \.82\)\} metalness=\{metalness \?\? \(glow \? \.15 : wet \? \.10 : \.04\)\}/, 'wet roads stay smoother than the shared dry material default')
assert.match(scene, /color=\{night \? '#526e7a' : '#547582'\} roughness=\{\.16\} metalness=\{\.08\}/, 'night puddles retain the brighter low-roughness response')
assert.match(scene, /roughness=\{response\?\.coreBody\.roughness\} metalness=\{response\?\.coreBody\.metalness\}/, 'core body consumes optional theme response')
assert.match(scene, /roughness=\{response\?\.coreTrim\.roughness\} metalness=\{response\?\.coreTrim\.metalness\}/, 'core trim consumes optional theme response')
assert.match(scene, /roughness=\{response\?\.coreGlass\.roughness\} metalness=\{response\?\.coreGlass\.metalness\}/, 'core glass consumes optional theme response')
assert.match(scene, /roughness=\{spec\?\.materialResponse\.megaBody\.roughness \?\? \.82\} metalness=\{spec\?\.materialResponse\.megaBody\.metalness \?\? \.04\}/, 'mega body keeps Stage 9 defaults when Theme is OFF')
assert.match(scene, /roughness=\{spec\?\.materialResponse\.megaRibs\.roughness \?\? \.82\} metalness=\{spec\?\.materialResponse\.megaRibs\.metalness \?\? \.04\}/, 'mega ribs keep Stage 9 defaults when Theme is OFF')
assert.match(scene, /roughness=\{spec\?\.materialResponse\.megaInset\.roughness \?\? \.82\} metalness=\{spec\?\.materialResponse\.megaInset\.metalness \?\? \.04\}/, 'mega inset keeps Stage 9 defaults when Theme is OFF')
assert.match(scene, /<Boxes items=\{buildings\} roughness=\{\.88\} metalness=\{\.02\} \/>/, 'outskirts building body remains fixed at .88/.02')
assert.match(scene, /<Boxes items=\{roofs\}[^\n]*roughness=\{\.90\} metalness=\{\.02\}/, 'outskirts roofs remain fixed at .90/.02')
assert.match(scene, /const warmWindows = windows\.filter[\s\S]*const coolWindows = windows\.filter/, 'outskirts windows split into warm middle-city and cool distant-city layers')
assert.match(scene, /emissiveIntensity=\{night \? \.78 : \.08\} glow night=\{night\} \/>/, 'middle-city windows remain subordinate to the hero')
assert.match(scene, /emissive=\{night \? '#58798c' : undefined\} emissiveIntensity=\{night \? \.12 : \.04\}/, 'distant windows use a restrained cool hierarchy')
assert.match(scene, /<Boxes items=\{lights\} color="#e9b779" glow night=\{night\} emissiveIntensity=\{night \? \.65 : \.06\} \/>/, 'waterfront lights remain below the core emission tier')
assert.match(scene, /<Boxes items=\{metropolis\.routeLights\} color="#d6a66e" glow night=\{night\} emissiveIntensity=\{night \? \.55 : \.025\} \/>/, 'route lights create one restrained metropolitan night network')
assert.match(scene, /<Boxes color="#f2c17e" items=\{details\.lamps\} glow night=\{night\} \/>/, 'core street lamps retain the shared glow default')
assert.equal([...scene.matchAll(/<instancedMesh\b/g)].length, 5, 'instanced batch callsite count remains 5')
assert.equal([...scene.matchAll(/<Boxes\b/g)].length, 35, 'macro depth adds only two shared box batch callsites')
console.log('Theme material slots and response values, Theme OFF defaults, outskirts limits, lighting and batch constraints passed.')
