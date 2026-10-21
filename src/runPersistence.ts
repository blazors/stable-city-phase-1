import type { TimeOfDay } from './city'
import type { QualityPreset } from './CityScene'
import type { ThemeName } from './theme'
import type { Weather } from './Atmosphere'
import type { RequestedStrategy, Capability } from './router'
import { migrateWeatherDraft, weatherSchemaVersion } from './weather'
import type { ResolvedMood } from './mood'
import type { CameraMode } from './camera'

const UI_KEY = 'stable-city:ui-draft:v1'
const PRODUCTION_KEY = 'stable-city:production-draft:v1'

export type ViewName = 'overview' | 'assets' | 'quality' | 'pipeline' | 'cost' | 'debug' | 'intelligence'
export type AssetKey = 'hero' | 'signature' | 'street' | 'atmosphere'
export type StoredDecision = { id: string; title: string; detail: string }
export type ThemeMatrixResult = Record<ThemeName, { stableCity: boolean; themeSpecDistinct: boolean }>
export type UiDraft = {
  weather?: Weather
  weatherVersion?: number
  time: TimeOfDay; mode: CameraMode; theme: ThemeName; enabled: boolean; quality: QualityPreset; view: ViewName; selectedAsset: AssetKey
  decisions?: StoredDecision[]; checked?: string[]; qcResult?: boolean | null; qcIssues?: string[]; themeOffResult?: boolean | null; themeMatrixResult?: ThemeMatrixResult | null
  activeMood?: ResolvedMood; prompt?: string; source?: 'local-rule'; version?: number
}
export type StoredTask = { id: number; name: string; input: string; themeVersion: string; capability: Capability; requestedStrategy: RequestedStrategy; strategy: 'local-template'; provider: 'none'; fallbackReason: 'auto-local' | 'provider-unavailable'; output: string; status: 'queued' | 'review' | 'approved' | 'rejected' }
export type ProductionDraft = { brief: string; tasks: StoredTask[]; events: Array<{ id: number; label: string }>; requestedStrategy: RequestedStrategy; themeCandidate: ThemeName | null; themeCandidateStatus: 'preview' | 'confirmed' | 'rejected' | null }

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

function write<T>(key: string, value: T) {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode or blocked storage */ }
}

export function loadUiDraft(): Partial<UiDraft> | null {
  const draft = read<Partial<UiDraft>>(UI_KEY)
  if (!draft) return null
  const storedMode = (draft as { mode?: unknown }).mode
  const mode: CameraMode | undefined = storedMode === 'overview' || storedMode === 'mega' || storedMode === 'elevated' ? storedMode : storedMode === 'hero' ? 'mega' : undefined
  return migrateWeatherDraft({ ...draft, mode })
}
export function saveUiDraft(value: UiDraft) { write(UI_KEY, { ...value, weatherVersion: weatherSchemaVersion }) }
export function clearUiDraft() { try { window.localStorage.removeItem(UI_KEY) } catch { /* ignore */ } }
export function loadProductionDraft(): Partial<ProductionDraft> | null { return read<Partial<ProductionDraft>>(PRODUCTION_KEY) }
export function saveProductionDraft(value: ProductionDraft) { write(PRODUCTION_KEY, value) }
export function clearProductionDraft() { try { window.localStorage.removeItem(PRODUCTION_KEY) } catch { /* ignore */ } }
