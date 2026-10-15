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
  ['Theme material slots are part of every theme spec', /bodyLight: string.*bodyDark: string.*trim: string.*glass: string.*foliage: string.*emission: string.*megaBody: string.*megaInset: string/s, 'src/theme.ts'],
  ['Theme OFF passes the fixed baseline into core, outskirts and mega materials', /<Architecture theme=\{enabled \? theme : null\}.*<MetropolitanLandscape theme=\{enabled \? theme : null\}.*<Megastructure accent=\{enabled \? themeSpecs\[theme\]\.emission : '#b1a286'\} theme=\{enabled \? theme : null\}/s, 'src/CityScene.tsx'],
  ['Architecture keeps its five existing material batches', /function Architecture[\s\S]*?return <>((?:<Boxes [^>]+ \/>){5})<\/>/, 'src/CityScene.tsx'],
  ['Outskirts theme mix is memoized and preserves source lightness', /const themeMix = \.25[\s\S]*?function tintSeededItems[\s\S]*?color\.setHSL\([\s\S]*?hsl\.l\)[\s\S]*?const themed = useMemo\([\s\S]*?\}, \[theme\]\)/, 'src/CityScene.tsx'],
  ['Night windows use the Stage 9 emission level', /windows\}[^\n]*emissiveIntensity=\{night \? 1\.4 : \.08\}/, 'src/CityScene.tsx'],
  ['Boxes material overrides retain their existing defaults', /roughness=\{roughness \?\? \(glow \? \.45 : wet \? \.30 : \.82\)\} metalness=\{metalness \?\? \(glow \? \.15 : wet \? \.10 : \.04\)\} emissive=\{emissive \?\? \(glow \? color : '#000000'\)\} emissiveIntensity=\{emissiveIntensity \?\? \(glow \? \(night \? 1\.8 : \.08\) : 0\)\}/, 'src/CityScene.tsx'],
  ['Day and sunset fill are reduced while night stays fixed', /day: \{ hemisphere: 1\.55, fill: \.62 \},\s*sunset: \{ hemisphere: \.88, fill: \.35 \},\s*night: \{ hemisphere: \.62, fill: \.18 \}/, 'src/lighting.ts'],
  ['Local routing boundary', /strategy: 'local-template'.*provider: 'none'/s, 'src/router.ts'],
  ['Scene errors clear the current performance sample', /useEffect\(\(\) => \{ if \(sceneError\) setMetrics\(null\) \}, \[sceneError\]\)/, 'src/App.tsx'],
  ['Run report version', /RUN_REPORT_VERSION = 'local-run-report\.v1'/, 'src/runReport.ts'],
  ['Run report schema guard', /runContext.*city.*runtime.*providers/s, 'src/runReport.ts'],
  ['Camera and orbit share the focal point', /camera\.lookAt\(\.\.\.cameraViews\[mode\]\.target\).*<OrbitControls[^>]*target=\{cameraViews\[mode\]\.target\}/s, 'src/CityScene.tsx'],
  ['Camera mode clears previous orbit damping', /<OrbitControls key=\{mode\}/, 'src/CityScene.tsx'],
  ['Default comparison camera is fixed', /cameraLocked = true.*<OrbitControls[^>]*enabled=\{!cameraLocked\}.*!cameraLocked && mode === 'overview' && <CameraShake/s, 'src/CityScene.tsx'],
  ['Overview caption describes the fixed comparison camera', /固定机位 · 环境对照/, 'src/App.tsx'],
  ['Quality comparison state stays local and does not replace the global theme toggle', /useState<'baseline' \| 'theme'>\('theme'\).*sceneEnabled = view === 'quality' \? qualityCompare === 'theme' : enabled/s, 'src/App.tsx'],
  ['Quality uses one existing Scene with only its theme flag controlled by the comparison', /<Scene time=\{time\} weather=\{weather\} mode=\{mode\} theme=\{theme\} enabled=\{sceneEnabled\} quality=\{quality\}/, 'src/App.tsx'],
  ['Quality comparison controls expose accurate Theme OFF and Theme ON states', /aria-label="主题视觉对照"[\s\S]*aria-pressed=\{qualityCompare === 'baseline'\}[\s\S]*setQualityCompare\('baseline'\)[\s\S]*THEME OFF[\s\S]*aria-pressed=\{qualityCompare === 'theme'\}[\s\S]*setQualityCompare\('theme'\)[\s\S]*THEME ON/, 'src/App.tsx'],
  ['Theme comparison invalidates the sampled configuration revision', /\[hasVisualScene, mode, quality, sceneEnabled, theme, time, view, weather\]/, 'src/App.tsx'],
  ['Quality samples identify the rendered Theme ON or OFF state', /enabled: sceneEnabled, configSignature/, 'src/App.tsx'],
  ['Quality comparison state is not persisted in the UI draft', /saveUiDraft\(\{ time, weather, mode, theme, enabled, quality, view, selectedAsset, decisions, checked, qcResult, qcIssues, themeOffResult, themeMatrixResult \}\)/, 'src/App.tsx'],
  ['Canvas owns the preframed camera from its first mount', /sceneCamera = useMemo\(\(\) => createSceneCamera\(mode\), \[mode\]\).*<Canvas\s+camera=\{sceneCamera\}/s, 'src/CityScene.tsx'],
  ['First canvas frame fits the actual viewport', /onCreated=\{\(\{ camera, size \}\) => \{\s+camera\.position\.set\(\.\.\.cameraPosition\(mode, size\.width \/ size\.height\)\)/, 'src/CityScene.tsx'],
  ['Scene has no delayed default camera replacement', /^(?![\s\S]*<PerspectiveCamera\b)/, 'src/CityScene.tsx'],
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
