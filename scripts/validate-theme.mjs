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

const { megaMaterialFamilies, themeSpecs } = await sourceModule('../src/theme.ts')
const { buildThemeSignature } = await sourceModule('../src/themeSignature.ts')
const { megaConfig } = await sourceModule('../src/sceneConfig.ts')
const { timeLighting, megaPracticalLights, megaPracticalFixtures, megaPracticalTimeMultipliers, megaPracticalMoodMultiplier, megaPracticalSpotIntensity, megaPracticalStripIntensity } = await sourceModule('../src/lighting.ts')
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
const materialFamilyNames = ['mineral', 'steel', 'interior', 'equipment']
const offFamilies = megaMaterialFamilies(null)
const harborFamilies = megaMaterialFamilies('harbor')
assert.deepEqual(offFamilies, {
  mineral: { color: '#aaaeb0', roughness: .80, metalness: .03 },
  steel: { color: '#606d75', roughness: .52, metalness: .28 },
  interior: { color: '#99978c', roughness: .62, metalness: .10 },
  equipment: { color: '#7d898d', roughness: .66, metalness: .16 },
}, 'Theme OFF uses its independent neutral material-family palette')
assert.deepEqual(harborFamilies, {
  mineral: { color: '#a5b3b5', roughness: .80, metalness: .03 },
  steel: { color: '#52717b', roughness: .52, metalness: .28 },
  interior: { color: '#9c9b89', roughness: .62, metalness: .10 },
  equipment: { color: '#718b8e', roughness: .66, metalness: .16 },
}, 'Harbor family values match the explicit authored palette and preserve a warm-neutral interior receiver')
assert.notDeepEqual(offFamilies, harborFamilies, 'Theme OFF remains independent from Harbor theme materials')
const expectedThemeFamilies = {
  verdant: {
    mineral: { color: '#a9b8a5', roughness: .88, metalness: .02 },
    steel: { color: '#5b756a', roughness: .68, metalness: .10 },
    interior: { color: '#a0a58d', roughness: .70, metalness: .08 },
    equipment: { color: '#718568', roughness: .74, metalness: .10 },
  },
  ember: {
    mineral: { color: '#b59b8d', roughness: .76, metalness: .10 },
    steel: { color: '#755752', roughness: .48, metalness: .30 },
    interior: { color: '#a68e82', roughness: .58, metalness: .16 },
    equipment: { color: '#825d53', roughness: .64, metalness: .22 },
  },
}
for (const [theme, families] of Object.entries(expectedThemeFamilies)) assert.deepEqual(megaMaterialFamilies(theme), families, `${theme} uses an explicit four-family palette`)
for (const theme of ['harbor', 'verdant', 'ember']) {
  const families = megaMaterialFamilies(theme)
  assert.equal(new Set(materialFamilyNames.map(name => families[name].color)).size, 4, `${theme} has four visually distinct material families`)
  for (const family of materialFamilyNames) {
    assert.match(families[family].color, /^#[\da-f]{6}$/i, `${theme}.${family} keeps a valid color`)
    assert(families[family].roughness >= 0 && families[family].roughness <= 1, `${theme}.${family} roughness stays in range`)
    assert(families[family].metalness >= 0 && families[family].metalness <= 1, `${theme}.${family} metalness stays in range`)
  }
}
for (const family of materialFamilyNames) assert.equal(new Set(['harbor', 'verdant', 'ember'].map(theme => megaMaterialFamilies(theme)[family].color)).size, 3, `${family} preserves Theme ON variation`)
const themeNames = ['harbor', 'verdant', 'ember']
const signatures = themeNames.map(theme => buildThemeSignature(theme))
for (const [index, theme] of themeNames.entries()) {
  const signature = signatures[index]
  assert.deepEqual(signature, buildThemeSignature(theme), `${theme} signature is deterministic`)
  assert(signature.bodies.length > 0 && signature.bodies.length <= 40, `${theme} body budget is bounded`)
  assert(signature.accents.length > 0 && signature.accents.length <= 8, `${theme} accent budget is bounded`)
  assert(signature.attachments.length > 0, `${theme} has Hero attachments`)
  assert(signature.attachments.every(item => item.slot === 'hero'), `${theme} attachments are marked as hidden Hero-slot decor`)
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
assert.deepEqual(megaPracticalLights, [
  { position: [-15, 87.4, 8], target: [-28, 40, 15], baseIntensity: 3200, angle: .35, distance: 80 },
  { position: [15, 87.4, 8], target: [28, 40, 15], baseIntensity: 3200, angle: .35, distance: 80 },
  { position: [-27, 40, 6], target: [-10, 88, 18], baseIntensity: 2200, angle: .36, distance: 80 },
  { position: [27, 40, 6], target: [10, 88, 18], baseIntensity: 2200, angle: .36, distance: 80 },
], 'four gate spots use authored sources, targets and grouped wash settings')
assert.deepEqual(megaPracticalFixtures.slice(4, 6), [
  { position: [-27.92, 44, 15], size: [.30, 80, .16], emissiveScale: 1 },
  { position: [27.92, 44, 15], size: [.30, 80, .16], emissiveScale: 1 },
], 'vertical aperture strips project into the opening and connect to the header strip')
assert.deepEqual(megaPracticalTimeMultipliers, { day: .1, sunset: .55, night: 1 }, 'practical lights keep the authored day/sunset/night tiers')
assert(megaPracticalMoodMultiplier(.9) > megaPracticalMoodMultiplier(.28) && megaPracticalMoodMultiplier(0) > 0, 'mood dims or raises practicals without extinguishing them')
assert.equal(megaPracticalSpotIntensity('night', .55, megaPracticalLights[0].baseIntensity), 3200 * megaPracticalMoodMultiplier(.55), 'upper down-wash keeps its nighttime baseline')
assert.equal(megaPracticalSpotIntensity('night', .55, megaPracticalLights[2].baseIntensity), 2200 * megaPracticalMoodMultiplier(.55), 'lower up-wash keeps its nighttime baseline')
assert(Math.abs(megaPracticalSpotIntensity('day', .55, megaPracticalLights[0].baseIntensity) / megaPracticalSpotIntensity('night', .55, megaPracticalLights[0].baseIntensity) - .1) < 1e-12, 'spotlights keep their daylight multiplier')
assert(Math.abs(megaPracticalSpotIntensity('sunset', .55, megaPracticalLights[0].baseIntensity) / megaPracticalSpotIntensity('night', .55, megaPracticalLights[0].baseIntensity) - .55) < 1e-12, 'spotlights keep their sunset multiplier')
assert(megaPracticalSpotIntensity('night', .9) > megaPracticalSpotIntensity('night', .28), 'mood light level drives the four physical spots')
assert(megaPracticalStripIntensity('night', 0) >= 1.3 && megaPracticalStripIntensity('night', 1) <= 2.2, 'primary strips remain in the authored 1.3–2.2 night range')
assert.equal(megaPracticalFixtures.length, 12, 'one shared practical batch contains four sources, aperture strips, mounts and three secondary strips')
assert.equal(megaPracticalFixtures.filter(item => item.emissiveScale === .25).length, 3, 'service-platform and bridge strips emit at quarter strength')
assert(megaPracticalFixtures.every(({ position, size }) => [...position, ...size].every(Number.isFinite)), 'practical fixture transforms stay finite')
for (const weather of ['clear', 'haze', 'rain', 'snow']) {
  for (const time of ['day', 'sunset', 'night']) {
    assert(megaPracticalLights.every(light => megaPracticalSpotIntensity(time, .55, light.baseIntensity) > 0) && megaPracticalStripIntensity(time, .55) > 0, `${weather}/${time} keeps practical sources alive`)
  }
}
const practicalComponent = scene.match(/function MegaPracticalLights[\s\S]*?\n}\n\nfunction Water/)?.[0] ?? ''
assert.equal((practicalComponent.match(/<Boxes\b/g) ?? []).length, 1, 'all visible practical fixtures share one instanced batch')
assert.match(practicalComponent, /targets\.forEach\(target => scene\.add\(target\)\)[\s\S]*return \(\) => targets\.forEach\(target => scene\.remove\(target\)\)/, 'spot targets are registered with and removed from the actual scene')
assert.match(practicalComponent, /distance=\{megaPracticalLights\[index\]\.distance\} angle=\{megaPracticalLights\[index\]\.angle\} penumbra=\{\.75\} decay=\{2\} castShadow=\{false\}/, 'each local spot uses grouped cone/range settings, quadratic falloff and no shadow map')
assert.match(practicalComponent, /theme \? themeSpecs\[theme\]\.emission : '#FFC681'\), \.38\)/, 'practical source hue mixes 38% of the active theme emission into its warm base')
assert.match(practicalComponent, /emissiveIntensity=\{megaPracticalStripIntensity\(time, lightLevel\)\} emissiveInstanceColor/, 'main and secondary strips use the shared emissive-scale batch')
assert.match(scene, /totalEmissiveRadiance \*= vColor/, 'per-instance linear color scales emissive output without another material batch')
assert.match(scene, /<Megastructure theme=\{enabled \? theme : null\} \/><MegaPracticalLights time=\{time\} theme=\{enabled \? theme : null\} mood=\{mood\} \/><Transport/, 'practicals remain mounted across weather states and respect Theme OFF')
assert.doesNotMatch(scene, /MegaPracticalHalo|megaPracticalPositions/, 'the suspended legacy practical rig stays removed')
const mix = Number(scene.match(/const themeMix = ([\d.]+)/)?.[1])
assert(mix >= .2 && mix <= .3, 'outskirts receive 20–30% theme mixing')
assert.match(scene, /color\.setHSL\([\s\S]*?hsl\.l\)/, 'outskirts keep the original seed lightness')
assert.match(scene, /roughness=\{roughness \?\? \(glow \? \.45 : wet \? \.22 : \.82\)\} metalness=\{metalness \?\? \(glow \? \.15 : wet \? \.10 : \.04\)\}/, 'wet roads stay smoother than the shared dry material default')
assert.match(scene, /color=\{night \? '#526e7a' : '#547582'\} roughness=\{\.16\} metalness=\{\.08\}/, 'night puddles retain the brighter low-roughness response')
assert.match(scene, /const materials = megaMaterialFamilies\(theme\)/, 'the Mega uses the shared four-family theme resolver')
for (const family of materialFamilyNames) assert.match(scene, new RegExp(`color=\\{materials\\.${family}\\.color\\} roughness=\\{materials\\.${family}\\.roughness\\} metalness=\\{materials\\.${family}\\.metalness\\}`), `${family} is rendered with its own family material`)
assert.match(scene, /\.\.\.bridge\.decks, \.\.\.bridge\.joints, \.\.\.bridge\.girders, \.\.\.bridge\.supports, \.\.\.bridge\.rails, \.\.\.bridge\.railPosts/, 'all elevated bridge structures share the steel family batch')
assert.match(scene, /function MaintenanceBus\(\)[\s\S]*?<Boxes items=\{megaMaintenanceBus\}/, 'maintenance bus is a single instance batch')
assert.match(scene, /function ScaleWorkers\(\)[\s\S]*?<Boxes items=\{megaScaleWorkers\}/, 'four scale workers are a single instance batch')
assert.match(scene, /<MaintenanceBus \/><ScaleWorkers \/>/, 'scale references remain mounted with the Hero scene')
assert.doesNotMatch(scene, /visibleBodies|upperMasses|facadePanels|metropolis\.roofs|metropolis\.terraces|metropolis\.windows|warmWindows|coolWindows/, 'ordinary building, roof, terrace, and window batches are absent from P0 rendering')
assert.doesNotMatch(scene, /<Architecture\b|<ThemeSignatureOverlay\b/, 'core architecture and decorative signature overlays are not mounted')
assert.match(scene, /<Boxes items=\{lights\} color="#e9b779" glow night=\{night\} emissiveIntensity=\{night \? \.22 : \.06\} \/>/, 'waterfront lights remain below the core emission tier')
assert.match(scene, /<Boxes items=\{metropolis\.routeLights\} color="#d6a66e" glow night=\{night\} emissiveIntensity=\{night \? \.15 : \.025\} \/>/, 'route lights create one restrained metropolitan night network')
assert.match(scene, /<Boxes color="#f2c17e" items=\{details\.lamps\} glow night=\{night\} \/>/, 'core street lamps retain the shared glow default')
assert(scene.match(/<Boxes\b/g).length < 40, 'ordinary building batches are removed from the draw-call source budget')
assert(scene.match(/<instancedMesh\b/g).length <= 5, 'P0 keeps dynamic and surface geometry instanced')
assert.match(scene, /<Megastructure theme=\{enabled \? theme : null\} \/>/, 'ThemeSpec still colors the replacement Mega')
console.log('P0 city clearing, theme data preservation, lighting and instancing contracts passed.')
