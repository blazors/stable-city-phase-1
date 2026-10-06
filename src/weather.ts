export type Weather = 'clear' | 'rain' | 'snow' | 'haze'

export const weatherLabels: Record<Weather, string> = {
  clear: '晴朗光影', rain: '雨幕湿城', snow: '风雪冷城', haze: '雾海城市',
}
export const weatherDescriptions: Record<Weather, string> = {
  clear: '日月光晕与流动层云，随时段改变光色。',
  rain: '冷灰雨云、分层雨丝与镜头水珠，湿润道路保留城市轮廓。',
  snow: '冷色雪云、飘雪与屋顶薄雪，镜头边缘覆上霜晶。',
  haze: '低位雾海淹没街道和低层楼群，高楼与巨构上半露出雾顶。',
}

// Older drafts used a separate cloudy-sky option; its clouds join the fair preset.
export function migrateWeather(value: unknown): Weather {
  if (value === 'rain' || value === 'snow' || value === 'haze') return value
  return 'clear'
}

export const weatherSchemaVersion = 2
export function migrateWeatherDraft<T extends { weather?: unknown; weatherVersion?: number }>(draft: T) {
  const weather = migrateWeather(draft.weather)
  if (draft.weatherVersion === weatherSchemaVersion && draft.weather === weather) return { ...draft, weather, weatherVersion: weatherSchemaVersion }
  // A changed visual preset cannot inherit a PASS from the previous environment.
  return { ...draft, weather, weatherVersion: weatherSchemaVersion, checked: [], qcResult: null,
    qcIssues: [], themeOffResult: null, themeMatrixResult: null }
}
