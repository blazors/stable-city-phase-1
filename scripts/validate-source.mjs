import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const checks = [
  ['StableCity block contract', /city\.blocks\.length !== 16/, 'src/city.ts'],
  ['StableCity building contract', /city\.buildings\.length !== 60/, 'src/city.ts'],
  ['UrbanGrammar contract', /secondaryRoads !== 4 .*localStreets !== 16 .*publicVoids !== 2/s, 'src/city.ts'],
  ['Transport contract', /mainSpine !== 'east-west' .*elevatedRail .*stationCount !== 1/s, 'src/city.ts'],
  ['Theme visual fields', /primaryHue: string.*warmCoolRelation: string.*saturationProfile: string.*valueProfile: string.*contrastMode: string.*emissionHue: string.*atmosphereTint: string/s, 'src/theme.ts'],
  ['Local routing boundary', /strategy: 'local-template'.*provider: 'none'/s, 'src/router.ts'],
  ['Run report version', /RUN_REPORT_VERSION = 'local-run-report\.v1'/, 'src/runReport.ts'],
  ['Run report schema guard', /runContext.*city.*runtime.*providers/s, 'src/runReport.ts'],
  ['Camera and orbit share the focal point', /camera\.lookAt\(\.\.\.cameraViews\[mode\]\.target\).*<OrbitControls[^>]*target=\{cameraViews\[mode\]\.target\}/s, 'src/CityScene.tsx'],
  ['Camera mode clears previous orbit damping', /<OrbitControls key=\{mode\}/, 'src/CityScene.tsx'],
  ['Visible practicals share light position and colour', /megaPracticalPositions\.map\(position => \(\{ position, size:.*night && megaPracticalPositions\.map\(position => <pointLight[^>]*position=\{position\} color=\{accent\}/s, 'src/CityScene.tsx'],
  ['Sun and key light share environment direction', /lightPosition = sunDirection\(time\).*<directionalLight position=\{lightPosition\}/s, 'src/CityScene.tsx'],
  ['Sky disc uses environment direction', /uSun: \{ value: sunDirection\(time\) \}/, 'src/Atmosphere.tsx'],
  ['Sunset shader state resets outside sunset', /uSunset: \{ value: time === 'sunset' \? 1 : 0 \}/, 'src/Atmosphere.tsx'],
  ['Scene grade has no screen tint or scanline layer', /\.scene-grade \{[^}]*pointer-events: none; background: none; \}.*\.scene-grade::before, \.scene-grade::after \{ content: none; \}/s, 'src/style.css'],
  ['Night grade preserves shadow contrast', /\.visual-stage:has\(\.grade-night\), \.quality-stage:has\(\.grade-night\) \{[^}]*--scene-contrast: 1;/, 'src/style.css'],
  ['Aperture leaves a wide transparent hero region', /\.scene-aperture::before \{[^}]*transparent 0 58%/, 'src/style.css'],
  ['Night aperture is lighter than the daytime edge falloff', /\.scene-aperture\.aperture-night \{ opacity: \.1; \}/, 'src/style.css'],
  ['Overview and Quality share canvas grading', /\.visual-stage canvas, \.quality-stage canvas \{[^}]*filter: saturate\(var\(--scene-saturation\)\) contrast\(var\(--scene-contrast\)\)/, 'src/style.css'],
]

const failures = checks.flatMap(([label, pattern, file]) => pattern.test(read(file)) ? [] : [`${label} failed (${file})`])
if (failures.length) {
  console.error(`validate: ${failures.length} contract(s) failed`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`validate: ${checks.length} source contracts passed`)
