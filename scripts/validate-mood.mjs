import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/mood.ts', import.meta.url), 'utf8')
const required = ['MoodSpec', 'ResolvedMood', 'source: \'local-rule\'', 'parseMoodPrompt', 'moodExamples', 'MOOD_VERSION', '湿润', '红雾', '白雾', '无降水']
const missing = required.filter(token => !source.includes(token))
if (missing.length) throw new Error(`Mood V1 contract missing: ${missing.join(', ')}`)
console.log('Mood V1 source contract: PASS')
