import type { TimeOfDay } from './city'
import type { Weather } from './weather'

export const MOOD_VERSION = 1
export type MoodTemperature = 'cool' | 'neutral' | 'warm' | 'red-mist' | 'white-mist'

export type MoodSpec = {
  version: number
  time: TimeOfDay
  weather: Weather
  temperature: MoodTemperature
  wetness: number
  fog: number
  monumentalLights: number
  lensResponse: 'subtle' | 'cinematic' | 'dramatic'
}

export type ResolvedMood = MoodSpec & {
  source: 'local-rule'
  prompt: string
  precipitation: 'none' | 'rain' | 'snow'
  wetnessLevel: number
  fogLevel: number
  lightLevel: number
  lensLevel: number
}

export function applyMoodPalette<T extends { zenith: string; horizon: string; haze: string; water: string; sun: string; ambient: string; cloud: string; shadow: string }>(base: T, mood?: ResolvedMood | null): T {
  if (!mood || mood.temperature === 'neutral') return base
  const palettes = {
    cool: { zenith: '#142e48', horizon: '#456574', haze: '#385668', water: '#142f42', sun: '#b9d9ed', ambient: '#7195aa', cloud: '#536d7d', shadow: '#172c3b' },
    warm: { zenith: '#54405d', horizon: '#d58b67', haze: '#8b6671', water: '#453849', sun: '#ffd29a', ambient: '#c69b92', cloud: '#d9a07f', shadow: '#3f3041' },
    'red-mist': { zenith: '#18253a', horizon: '#713446', haze: '#592f42', water: '#251f31', sun: '#e45c61', ambient: '#855061', cloud: '#744051', shadow: '#211825' },
    'white-mist': { zenith: '#91a7aa', horizon: '#d7dfda', haze: '#c7d2cf', water: '#728b8d', sun: '#f0e4c7', ambient: '#cbd8d4', cloud: '#e1e5df', shadow: '#76898a' },
  } as const
  return { ...base, ...palettes[mood.temperature] }
}

export const moodExamples = [
  '黄昏，红雾，湿润街道，巨构实景灯更亮，镜头轻微雨痕',
  '深夜无降水，冷蓝色，薄雾，城市灯光克制，电影镜头',
  '白天大雪，白雾，冷色，湿润地面，镜头保持清晰',
]

export const defaultMoodSpec: MoodSpec = {
  version: MOOD_VERSION, time: 'sunset', weather: 'clear', temperature: 'neutral',
  wetness: 0, fog: .12, monumentalLights: .55, lensResponse: 'subtle',
}
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))

export function resolveMood(spec: Partial<MoodSpec>, prompt = ''): ResolvedMood {
  const safe = { ...defaultMoodSpec, ...spec, version: MOOD_VERSION }
  const wetness = clamp01(safe.wetness)
  const fog = clamp01(safe.fog)
  const monumentalLights = clamp01(safe.monumentalLights)
  const lensLevel = safe.lensResponse === 'dramatic' ? .9 : safe.lensResponse === 'cinematic' ? .55 : .22
  return { ...safe, wetness, fog, monumentalLights, source: 'local-rule', prompt, precipitation: safe.weather === 'rain' ? 'rain' : safe.weather === 'snow' ? 'snow' : 'none', wetnessLevel: wetness, fogLevel: fog, lightLevel: monumentalLights, lensLevel }
}

export function parseMoodPrompt(input: string): ResolvedMood {
  const prompt = input.trim()
  const lower = prompt.toLowerCase()
  const spec: MoodSpec = { ...defaultMoodSpec }
  if (/深夜|午夜|夜晚|夜色|夜/.test(prompt) || /midnight|night/.test(lower)) spec.time = 'night'
  else if (/白天|白昼|晴天|日光|清晨|午后/.test(prompt) || /day|morning/.test(lower)) spec.time = 'day'
  else if (/黄昏|日落|傍晚|暮色/.test(prompt) || /sunset|dusk/.test(lower)) spec.time = 'sunset'
  if (/大雪|下雪|雪|风雪/.test(prompt) || /snow/.test(lower)) spec.weather = 'snow'
  else if (/下雨|雨幕|暴雨|小雨|雨/.test(prompt) || /rain/.test(lower)) spec.weather = 'rain'
  else if (/雾|霾|雾海/.test(prompt) || /fog|haze|mist/.test(lower)) spec.weather = 'haze'
  if (/无降水|不下雨|干燥|晴朗/.test(prompt)) spec.weather = 'clear'
  if (/红雾|赤雾|红色雾/.test(prompt)) { spec.temperature = 'red-mist'; spec.weather = 'haze' }
  else if (/白雾|乳白雾|白色雾/.test(prompt)) { spec.temperature = 'white-mist'; spec.weather = 'haze' }
  else if (/冷|冰|蓝|寒/.test(prompt)) spec.temperature = 'cool'
  else if (/暖|金|橙|夕阳/.test(prompt)) spec.temperature = 'warm'
  if (/湿润|潮湿|积水|反光路面|湿地/.test(prompt)) spec.wetness = .82
  if (/薄雾|轻雾/.test(prompt)) spec.fog = .34
  if (/浓雾|厚雾|雾海/.test(prompt)) spec.fog = .82
  if (/巨构.*(灯|光)|灯.*(更亮|增强|明亮)|实景灯/.test(prompt)) spec.monumentalLights = .9
  if (/灯光克制|低照度|暗灯/.test(prompt)) spec.monumentalLights = .28
  if (/镜头.*(强|明显|戏剧)|电影镜头|cinematic|dramatic/.test(lower)) spec.lensResponse = 'cinematic'
  if (/轻微|克制|清晰|无镜头效果/.test(prompt)) spec.lensResponse = 'subtle'
  if (/强烈|夸张|戏剧化/.test(prompt)) spec.lensResponse = 'dramatic'
  if (spec.weather === 'rain') spec.wetness = Math.max(spec.wetness, .58)
  if (spec.weather === 'snow') spec.wetness = Math.min(spec.wetness, .22)
  if (spec.weather === 'haze') spec.fog = Math.max(spec.fog, .62)
  return resolveMood(spec, prompt)
}

export function moodFromStored(value: unknown, prompt = ''): ResolvedMood {
  if (!value || typeof value !== 'object') return resolveMood(defaultMoodSpec, prompt)
  const candidate = value as Partial<MoodSpec>
  return resolveMood(candidate, prompt)
}
