import { createStableCity, getStableCitySignature, validateStableCity, type StableCity } from './city'
import { routeCapability } from './router'
import { themeSpecs, type ThemeName } from './theme'

export type CoreValidation = {
  valid: boolean
  stableCity: boolean
  deterministic: boolean
  themeMatrix: boolean
  routing: boolean
  issues: string[]
}

export function validateCoreContracts(city: StableCity): CoreValidation {
  const cityCheck = validateStableCity(city)
  const deterministic = createStableCity(city.seed).signature === city.signature
  const themeNames = Object.keys(themeSpecs) as ThemeName[]
  const themeMatrix = new Set(themeNames.map(name => JSON.stringify(themeSpecs[name]))).size === themeNames.length
  const routing = ['立面设计说明', '交通尺度说明', '氛围设计说明'].every(name => routeCapability(name, 'auto').strategy === 'local-template')
  const stableCity = cityCheck.valid && getStableCitySignature(city) === city.signature
  const issues = [...cityCheck.issues]
  if (!deterministic && !issues.includes('determinism')) issues.push('determinism')
  if (!themeMatrix) issues.push('themeMatrix')
  if (!routing) issues.push('routing')
  return { valid: stableCity && deterministic && themeMatrix && routing, stableCity, deterministic, themeMatrix, routing, issues }
}
