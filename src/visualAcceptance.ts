import type { TimeOfDay } from './city'
import type { QualityPreset } from './CityScene'
import type { ThemeName } from './theme'
import type { Weather } from './Atmosphere'

export type VisualAcceptance = {
  view: 'quality'
  theme: ThemeName
  mode: 'overview' | 'mega'
  time: TimeOfDay
  weather: Weather
  quality: QualityPreset
  compare: 'baseline' | 'theme'
}

export function getBenchmarkEnvironment(width: number, height: number, devicePixelRatio: number): 'ready' | 'mismatch' {
  return width === 1280 && height === 720 && Math.abs(devicePixelRatio - 1) <= 0.01 ? 'ready' : 'mismatch'
}

export type AcceptanceScenario = VisualAcceptance & {
  id: string
  url: string
  captureTarget: '[aria-label="视觉质量预览"]'
  evidenceStatus: 'not-executed'
}

export type VisualAcceptancePlan = {
  schemaVersion: 1
  kind: 'visual-acceptance-plan'
  seed: number
  cameraLocked: true
  viewport: { width: 1280; height: 720; deviceScaleFactor: 1 }
  scenarios: AcceptanceScenario[]
  animationCapture: { framePolicy: 'not-pixel-identical'; limitation: string }
}

function enumValue<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[], fallback: T): T {
  const value = params.get(key)
  return value !== null && allowed.includes(value as T) ? value as T : fallback
}

export function parseVisualAcceptance(search: string): VisualAcceptance | null {
  const params = new URLSearchParams(search)
  if (params.get('view') !== 'quality') return null
  return {
    view: 'quality',
    theme: enumValue(params, 'theme', ['harbor', 'verdant', 'ember'], 'harbor'),
    mode: enumValue(params, 'mode', ['overview', 'mega'], 'overview'),
    time: enumValue(params, 'time', ['sunset', 'day', 'night'], 'sunset'),
    weather: enumValue(params, 'weather', ['clear', 'rain', 'snow', 'haze'], 'clear'),
    quality: enumValue(params, 'quality', ['high', 'balanced', 'low', 'auto'], 'high'),
    compare: enumValue(params, 'compare', ['theme', 'baseline'], 'theme'),
  }
}

const scenarioDefinitions: Array<Omit<AcceptanceScenario, 'url' | 'captureTarget' | 'evidenceStatus'>> = [
  { id: 'harbor-sunset', view: 'quality', theme: 'harbor', mode: 'overview', time: 'sunset', weather: 'clear', quality: 'high', compare: 'theme' },
  { id: 'harbor-baseline', view: 'quality', theme: 'harbor', mode: 'overview', time: 'sunset', weather: 'clear', quality: 'high', compare: 'baseline' },
  { id: 'verdant-sunset', view: 'quality', theme: 'verdant', mode: 'overview', time: 'sunset', weather: 'clear', quality: 'high', compare: 'theme' },
  { id: 'ember-sunset', view: 'quality', theme: 'ember', mode: 'overview', time: 'sunset', weather: 'clear', quality: 'high', compare: 'theme' },
  { id: 'harbor-day', view: 'quality', theme: 'harbor', mode: 'overview', time: 'day', weather: 'clear', quality: 'high', compare: 'theme' },
  { id: 'harbor-night', view: 'quality', theme: 'harbor', mode: 'overview', time: 'night', weather: 'clear', quality: 'high', compare: 'theme' },
  { id: 'ember-rain-low', view: 'quality', theme: 'ember', mode: 'mega', time: 'night', weather: 'rain', quality: 'low', compare: 'theme' },
  { id: 'verdant-snow-balanced', view: 'quality', theme: 'verdant', mode: 'overview', time: 'day', weather: 'snow', quality: 'balanced', compare: 'theme' },
  { id: 'harbor-haze-mega', view: 'quality', theme: 'harbor', mode: 'mega', time: 'sunset', weather: 'haze', quality: 'high', compare: 'theme' },
]

export function createVisualAcceptancePlan(seed: number, pathname: string): VisualAcceptancePlan {
  const scenarios = scenarioDefinitions.map(scenario => {
    const params = new URLSearchParams()
    params.set('view', scenario.view)
    params.set('theme', scenario.theme)
    params.set('mode', scenario.mode)
    params.set('time', scenario.time)
    params.set('weather', scenario.weather)
    params.set('quality', scenario.quality)
    params.set('compare', scenario.compare)
    return {
      ...scenario,
      url: `${pathname}?${params.toString()}`,
      captureTarget: '[aria-label="视觉质量预览"]' as const,
      evidenceStatus: 'not-executed' as const,
    }
  })
  return {
    schemaVersion: 1,
    kind: 'visual-acceptance-plan',
    seed,
    cameraLocked: true,
    viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    scenarios,
    animationCapture: {
      framePolicy: 'not-pixel-identical',
      limitation: 'Animated elements are compared by scene state and sampled evidence; frame-by-frame pixel equality is not guaranteed.',
    },
  }
}
