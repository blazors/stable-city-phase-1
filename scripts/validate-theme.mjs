import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const sceneConfigSource = fs.readFileSync(new URL('../src/sceneConfig.ts', import.meta.url), 'utf8')
const sceneConfigOutput = ts.transpileModule(sceneConfigSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const sceneConfigUrl = `data:text/javascript;base64,${Buffer.from(sceneConfigOutput).toString('base64')}`
async function sourceModule(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  const resolved = outputText.replace(/from (['"])\.\/sceneConfig\1/g, `from '${sceneConfigUrl}'`)
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`)
}

const { themeSpecs } = await sourceModule('../src/theme.ts')
const { buildThemeSignature } = await sourceModule('../src/themeSignature.ts')
const { megaConfig } = await sourceModule('../src/sceneConfig.ts')
const { timeLighting } = await sourceModule('../src/lighting.ts')
const scene = fs.readFileSync(new URL('../src/CityScene.tsx', import.meta.url), 'utf8')
const signatureSource = fs.readFileSync(new URL('../src/themeSignature.ts', import.meta.url), 'utf8')
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
const themeNames = ['harbor', 'verdant', 'ember']
const signatures = themeNames.map(theme => buildThemeSignature(theme))
for (const [index, theme] of themeNames.entries()) {
  const signature = signatures[index]
  assert.deepEqual(signature, buildThemeSignature(theme), `${theme} signature is deterministic`)
  assert(signature.bodies.length > 0 && signature.bodies.length <= 40, `${theme} body budget is bounded`)
  assert(signature.accents.length > 0 && signature.accents.length <= 8, `${theme} accent budget is bounded`)
  assert(signature.attachments.length > 0, `${theme} has Hero attachments`)
  const allBoxes = [...signature.bodies, ...signature.attachments, ...signature.accents]
  assert(allBoxes.length <= 120, `${theme} public-space and Hero assets stay within 120 boxes`)
  assert(allBoxes.length * 12 <= 1440, `${theme} public-space and Hero assets stay within 1,440 box triangles`)
  assert(allBoxes.every(item => /^#[\da-f]{6}$/i.test(item.color)), `${theme} uses explicit palette colors`)
  const palette = new Set([themeSpecs[theme].primary, themeSpecs[theme].accent, themeSpecs[theme].trim, themeSpecs[theme].foliage])
  assert(allBoxes.every(item => palette.has(item.color)), `${theme} signature colors come from its theme spec`)
  assert.equal(signature.attachments.length, { harbor: 10, verdant: 10, ember: 14 }[theme], `${theme} has the authored bilateral attachment set`)
  const heroAssets = [...signature.attachments, ...signature.accents.filter(item => item.slot === 'hero')]
  assert.equal(signature.accents.filter(item => item.slot === 'hero').length, 2, `${theme} has two night-only Hero accents`)
  for (const attachment of heroAssets) {
    const [x, y, z] = attachment.position, [width, height, depth] = attachment.size
    assert(Math.abs(x) - width / 2 >= megaConfig.gate.width / 2 - 5, `${theme} attachment stays outside the protected central gate zone`)
    assert(Math.abs(x) + width / 2 <= megaConfig.dimensions.width / 2, `${theme} attachment stays inside the Hero x range`)
    assert(z - depth / 2 >= megaConfig.frontZ && z + depth / 2 <= megaConfig.frontZ + megaConfig.dimensions.depth, `${theme} attachment stays inside the Hero z range`)
    assert(y + height / 2 <= megaConfig.dimensions.height, `${theme} attachment stays below the Hero height cap`)
    assert(Math.abs(x) - width / 2 > 3, `${theme} attachment stays clear of the central rotor`)
  }
  if (theme === 'harbor') {
    assert.equal(signature.attachments.filter(item => item.size[1] === 33).length, 4, 'Harbor has two gate posts on each side')
    assert.equal(signature.attachments.filter(item => item.size[1] === .5).length, 2, 'Harbor has one top beam on each side')
    assert.equal(signature.attachments.filter(item => item.size[0] === 3).length, 4, 'Harbor has two outward corbels on each side')
  }
  if (theme === 'verdant') {
    assert.equal(signature.attachments.filter(item => item.size[1] === .38).length, 6, 'Verdant has three wing shelves on each side')
    assert.equal(signature.attachments.filter(item => item.size[0] === .24).length, 4, 'Verdant has narrow supports on both sides')
  }
  if (theme === 'ember') {
    assert.equal(signature.attachments.filter(item => item.size[0] === .55).length, 6, 'Ember has three vents on each side')
    assert.equal(signature.attachments.filter(item => item.size[0] === .92).length, 6, 'Ember has a cap on each vent')
    for (const side of [-1, 1]) {
      const vents = signature.attachments.filter(item => Math.sign(item.position[0]) === side && item.size[0] === .55).sort((a, b) => Math.abs(a.position[0]) - Math.abs(b.position[0]))
      assert(vents[0].size[1] < vents[1].size[1] && vents[1].size[1] < vents[2].size[1], 'Ember vent stacks rise toward each outer edge')
    }
  }
}
const shapeSignature = signature => JSON.stringify([...signature.bodies, ...signature.attachments, ...signature.accents].map(({ position, size }) => ({ position, size })))
assert.equal(new Set(signatures.map(shapeSignature)).size, 3, 'all three theme signatures have distinct geometry')
assert.deepEqual(buildThemeSignature(null), { bodies: [], accents: [], attachments: [] }, 'Theme OFF creates no public-space or Hero assets')
assert.doesNotMatch(signatureSource, /Math\.random|generateMetropolis|createStableCity|metropolis\.|selectThemeCrownAnchors|ThemeTowerAnchor|crowns/, 'signature generation is isolated from city generators, random streams and tower crowns')
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
assert.match(scene, /visibleBodies: tintSeededItems\(metropolis\.visibleBodies, spec\.bodyLight, '#ffffff'\)/, 'visible outer bodies follow the active theme body tint')
assert.match(scene, /<Boxes items=\{visibleBodies\} roughness=\{\.88\} metalness=\{\.02\} \/>/, 'visible outer bodies use one shared fixed-response batch')
assert.match(scene, /const visibleBodies = themed\?\.visibleBodies \?\? metropolis\.visibleBodies/, 'visible outer bodies retain the Theme OFF baseline')
assert.match(scene, /upperMasses: tintSeededItems\(metropolis\.upperMasses, spec\.bodyLight, '#ffffff'\)/, 'upper masses follow the active theme body tint')
assert.match(scene, /<Boxes items=\{upperMasses\} roughness=\{\.88\} metalness=\{\.02\} \/>/, 'upper masses use one shared fixed-response batch')
assert.match(scene, /const upperMasses = themed\?\.upperMasses \?\? metropolis\.upperMasses/, 'upper masses remain visible with Theme OFF and in every quality tier')
assert.match(scene, /facadePanels: tintSeededItems\(metropolis\.facadePanels, spec\.glass, '#ffffff'\)/, 'facade panels receive the glass hue while retaining their source lightness')
assert.match(scene, /const facadePanels = themed\?\.facadePanels \?\? metropolis\.facadePanels/, 'Theme OFF keeps the generated facade panel colors')
assert.match(scene, /<Boxes items=\{facadePanels\} roughness=\{\.82\} metalness=\{\.04\} \/>/, 'all facade rhythms share one non-emissive material batch')
assert.equal([...scene.matchAll(/<Boxes items=\{facadePanels\}/g)].length, 1, 'facade panels are rendered in exactly one shared batch')
assert.doesNotMatch(scene.match(/<Boxes items=\{facadePanels\}[^>]+\/>/)?.[0] ?? '', /glow|emissive/, 'facade rhythms do not add light emission')
assert.match(scene, /<Boxes items=\{roofs\}[^\n]*roughness=\{\.90\} metalness=\{\.02\}/, 'outskirts roofs remain fixed at .90/.02')
assert.match(scene, /const warmWindows = windows\.filter[\s\S]*const coolWindows = windows\.filter/, 'outskirts windows split into warm middle-city and cool distant-city layers')
assert.match(scene, /emissiveIntensity=\{night \? \.78 : \.08\} glow night=\{night\} \/>/, 'middle-city windows remain subordinate to the hero')
assert.match(scene, /emissive=\{night \? '#58798c' : undefined\} emissiveIntensity=\{night \? \.12 : \.04\}/, 'distant windows use a restrained cool hierarchy')
assert.match(scene, /<Boxes items=\{lights\} color="#e9b779" glow night=\{night\} emissiveIntensity=\{night \? \.65 : \.06\} \/>/, 'waterfront lights remain below the core emission tier')
assert.match(scene, /<Boxes items=\{metropolis\.routeLights\} color="#d6a66e" glow night=\{night\} emissiveIntensity=\{night \? \.55 : \.025\} \/>/, 'route lights create one restrained metropolitan night network')
assert.match(scene, /<Boxes color="#f2c17e" items=\{details\.lamps\} glow night=\{night\} \/>/, 'core street lamps retain the shared glow default')
assert.equal([...scene.matchAll(/<Boxes\b/g)].length, 40, 'P0 mega greybox keeps the bounded shared Boxes budget')
assert.equal([...scene.matchAll(/<instancedMesh\b/g)].length, 5, 'Stage 16 reuses the existing shared instancing mechanism')
assert.match(scene, /function ThemeSignatureOverlay\([\s\S]*?buildThemeSignature\(theme\)[\s\S]*?\[\.\.\.signature\.bodies, \.\.\.signature\.attachments\][\s\S]*?<Boxes items=\{bodies\}[\s\S]*?castShadow=\{false\} receiveShadow=\{false\}[\s\S]*?night && <Boxes items=\{signature\.accents\}[\s\S]*?emissiveIntensity=\{\.18\} castShadow=\{false\} receiveShadow=\{false\}/, 'public-space and Hero attachment boxes share one non-shadowing batch and night accents share one low-emission batch')
assert.match(scene, /\{enabled && <ThemeSignatureOverlay theme=\{theme\} night=\{night\} \/>\}/, 'Theme OFF does not mount the signature overlay')
assert.doesNotMatch(scene.match(/function ThemeSignatureOverlay\([\s\S]*?\n\}/)?.[0] ?? '', /quality|detail/, 'LOW retains the complete signature asset set')
console.log('Theme materials, signature geometry budgets, Theme OFF behavior, lighting and batching contracts passed.')
