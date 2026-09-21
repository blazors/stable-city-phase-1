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
]

const failures = checks.flatMap(([label, pattern, file]) => pattern.test(read(file)) ? [] : [`${label} failed (${file})`])
if (failures.length) {
  console.error(`validate: ${failures.length} contract(s) failed`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`validate: ${checks.length} source contracts passed`)
