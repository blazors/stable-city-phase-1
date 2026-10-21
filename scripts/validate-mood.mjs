import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/mood.ts', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const required = ['MoodSpec', 'ResolvedMood', 'source: \'local-rule\'', 'parseMoodPrompt', 'moodExamples', 'MOOD_VERSION', '湿润', '红雾', '白雾', '无降水']
const missing = required.filter(token => !source.includes(token))
if (missing.length) throw new Error(`Mood V1 contract missing: ${missing.join(', ')}`)
const overview = app.split("{view === 'overview' && <section")[1]?.split("{view === 'assets'")[0] ?? ''
if (overview.includes('aria-label="时段"') || overview.includes('<WeatherPicker')) {
  throw new Error('Overview must let the natural-language Mood own time and weather')
}
const quality = app.split("{view === 'quality' && <section")[1]?.split("<section className={`surface-page system-page pipeline-page")[0] ?? ''
if (!quality.includes('aria-label="质量环境"') || !quality.includes('<WeatherPicker')) {
  throw new Error('Quality must retain explicit environment controls for fixed-condition review')
}
const visualNav = app.split('<span>视觉 · VISUAL</span>')[1]?.split('<span>系统 · SYSTEM</span>')[0] ?? ''
if (visualNav.includes('资产 · Assets') || visualNav.includes('质量 · Quality') || !visualNav.includes('总览 · Overview')) {
  throw new Error('Public visual navigation must expose only Overview')
}
if (!app.includes("persistedUi?.view === 'assets' || persistedUi?.view === 'quality' ? 'overview'")) {
  throw new Error('Hidden legacy visual views must migrate back to Overview')
}
const systemNav = app.split('<span>系统 · SYSTEM</span>')[1]?.split('</nav>')[0] ?? ''
if (systemNav.includes('调试 · Debug') || !systemNav.includes('流程 · Pipeline')) {
  throw new Error('Public system navigation must hide Debug and retain Pipeline')
}
console.log('Mood V1 source contract: PASS')
