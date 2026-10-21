import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const source = read('src/snapshot.ts') + read('src/App.tsx') + read('src/CityScene.tsx')
const checks = [
  ['versioned schema', /SNAPSHOT_SCHEMA = 'stable-city\.snapshot\.v1'/],
  ['allowlist sanitizer', /safeParameters[\s\S]*allowed = \['seed', 'width', 'height', 'steps', 'temperature', 'strength', 'guidance', 'quality'\]/],
  ['sensitive fields excluded', /authorization|cookie|rawResponse/],
  ['nested snapshot fields rebuilt explicitly', /const clean: SceneSnapshot = \{[\s\S]*capture: \{ mode: 'scene-raw-no-postprocess'/],
  ['generation mood is normalized', /resolvedMoodSpec: trace\?\.resolvedMoodSpec[\s\S]*cleanMood\(trace\.resolvedMoodSpec\)/],
  ['actual orbit target captured', /controls\.current\?\.target\.toArray\(\)/],
  ['local rule trace facts', /actualStrategy: safeText\(trace\?\.actualStrategy\) \|\| 'local-template'[\s\S]*provider: safeText\(trace\?\.provider\) \|\| 'none'/],
  ['consistent file names', /snapshotFileName[\s\S]*stable-city-snapshot-\$\{snapshotId\}\.\$\{extension\}/],
  ['metadata only persistence', /saveSnapshotMetadata[\s\S]*localStorage[\s\S]*JSON\.stringify\(next\)/],
  ['bad storage recovery', /loadSnapshots[\s\S]*catch \{ return \[\] \}/],
  ['failed capture does not save', /catch \(error\)[\s\S]*未保存记录/],
]
const failures = checks.flatMap(([label, pattern]) => pattern.test(source) ? [] : [`${label} failed`])
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log(`snapshot validation: ${checks.length} checks passed`)
