import type { TimeOfDay } from './city'
import type { QualityPreset, RenderMetrics } from './CityScene'
import type { Weather } from './Atmosphere'
import { moodFromStored, type ResolvedMood } from './mood'
import type { ThemeName } from './theme'
import type { CameraMode } from './camera'

export const SNAPSHOT_SCHEMA = 'stable-city.snapshot.v1'
export const SNAPSHOT_STORAGE_KEY = 'stable-city:snapshots:v1'
const SENSITIVE_KEYS = ['apiKey', 'authorization', 'cookie', 'rawResponse'] as const

export type GenerationTrace = {
  executionChannel?: string | null; requestedStrategy?: string | null; actualStrategy?: string | null
  provider?: string | null; model?: string | null; requestId?: string | null; status?: string | null; fallback?: string | null
  systemPrompt?: string | null; userPrompt?: string | null; negativePrompt?: string | null
  resolvedMoodSpec?: unknown; parameters?: Record<string, unknown> | null
  latencyMs?: number | null; tokens?: number | null; cost?: number | null; retry?: number | null; error?: string | null
}
export type CameraSnapshot = { mode: CameraMode; position: [number, number, number]; target: [number, number, number]; fov: number }
export type SceneSnapshot = {
  schema: typeof SNAPSHOT_SCHEMA; snapshotId: string; createdAt: string; title: string; notes: string
  citySeed: string; stableCitySignature: string; theme: { name: ThemeName; version: string }; activeMood: ResolvedMood
  mood: { prompt: string; source: string; version: number; resolvedMoodSpec: ResolvedMood }; time: TimeOfDay; weather: Weather
  camera: CameraSnapshot; quality: QualityPreset; viewport: { width: number; height: number; dpr: number }
  capture: { mode: 'scene-raw-no-postprocess'; mimeType: 'image/png'; width: number; height: number; includesDomUi: false; includesPostprocess: false }
  generation: Required<Pick<GenerationTrace, 'executionChannel' | 'requestedStrategy' | 'actualStrategy' | 'provider' | 'model' | 'requestId' | 'status' | 'fallback'>> & Omit<GenerationTrace, 'executionChannel' | 'requestedStrategy' | 'actualStrategy' | 'provider' | 'model' | 'requestId' | 'status' | 'fallback'>
  assets: { parentSnapshotId: string | null; iteration: number }; appVersion: string; gitCommit: string | null
  render: { metrics: RenderMetrics | null; loadMs: number | null }; restoreLimitations: string[]
}
export type SnapshotState = Pick<SceneSnapshot, 'time' | 'weather' | 'camera' | 'quality' | 'theme' | 'activeMood' | 'mood'>

const safeText = (value: unknown) => typeof value === 'string' ? value.slice(0, 12000) : ''
const finite = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => allowed.includes(value as T) ? value as T : fallback
const tuple3 = (value: unknown): [number, number, number] => Array.isArray(value) ? [finite(value[0]), finite(value[1]), finite(value[2])] : [0, 0, 0]
const cleanMood = (value: unknown, prompt = '') => moodFromStored(value, safeText(prompt))
const safeParameters = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null
  const allowed = ['seed', 'width', 'height', 'steps', 'temperature', 'strength', 'guidance', 'quality']
  return Object.fromEntries(allowed.filter(key => key in (value as Record<string, unknown>)).map(key => [key, (value as Record<string, unknown>)[key]]))
}
const cleanTrace = (trace?: GenerationTrace): SceneSnapshot['generation'] => ({
  executionChannel: safeText(trace?.executionChannel) || 'local', requestedStrategy: safeText(trace?.requestedStrategy) || 'local-template', actualStrategy: safeText(trace?.actualStrategy) || 'local-template', provider: safeText(trace?.provider) || 'none', model: safeText(trace?.model) || 'none', requestId: safeText(trace?.requestId) || null, status: safeText(trace?.status) || 'local-complete', fallback: safeText(trace?.fallback) || 'none',
  systemPrompt: safeText(trace?.systemPrompt) || null, userPrompt: safeText(trace?.userPrompt) || null, negativePrompt: safeText(trace?.negativePrompt) || null, resolvedMoodSpec: trace?.resolvedMoodSpec && typeof trace.resolvedMoodSpec === 'object' ? cleanMood(trace.resolvedMoodSpec) : null, parameters: safeParameters(trace?.parameters),
  latencyMs: finite(trace?.latencyMs), tokens: finite(trace?.tokens), cost: finite(trace?.cost), retry: finite(trace?.retry), error: safeText(trace?.error) || null,
})

export function createSnapshot(input: Omit<SceneSnapshot, 'schema' | 'snapshotId' | 'createdAt' | 'generation'> & { generation?: GenerationTrace; snapshotId?: string; createdAt?: string }): SceneSnapshot {
  return sanitizeSnapshot({ ...input, schema: SNAPSHOT_SCHEMA, snapshotId: input.snapshotId ?? `SC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: input.createdAt ?? new Date().toISOString(), generation: cleanTrace(input.generation) })!
}

export function sanitizeSnapshot(value: unknown): SceneSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<SceneSnapshot>
  if (candidate.schema !== SNAPSHOT_SCHEMA || typeof candidate.snapshotId !== 'string' || !candidate.camera || !candidate.theme || !candidate.activeMood) return null
  const moodPrompt = safeText(candidate.mood?.prompt)
  const activeMood = cleanMood(candidate.activeMood, moodPrompt)
  const clean: SceneSnapshot = {
    schema: SNAPSHOT_SCHEMA, snapshotId: safeText(candidate.snapshotId), createdAt: safeText(candidate.createdAt), title: safeText(candidate.title), notes: safeText(candidate.notes), citySeed: safeText(candidate.citySeed), stableCitySignature: safeText(candidate.stableCitySignature),
    theme: { name: oneOf(candidate.theme.name, ['harbor', 'verdant', 'ember'], 'harbor'), version: safeText(candidate.theme.version) }, activeMood,
    mood: { prompt: moodPrompt, source: safeText(candidate.mood?.source) || activeMood.source, version: finite(candidate.mood?.version, 1), resolvedMoodSpec: cleanMood(candidate.mood?.resolvedMoodSpec, moodPrompt) },
    time: oneOf(candidate.time, ['day', 'sunset', 'night'], activeMood.time), weather: oneOf(candidate.weather, ['clear', 'rain', 'snow', 'haze'], activeMood.weather),
    camera: { mode: ((candidate.camera as unknown as { mode?: unknown }).mode === 'hero' ? 'mega' : oneOf(candidate.camera.mode, ['overview', 'mega', 'elevated'], 'overview')), position: tuple3(candidate.camera.position), target: tuple3(candidate.camera.target), fov: finite(candidate.camera.fov, 45) },
    quality: oneOf(candidate.quality, ['auto', 'high', 'balanced', 'low'], 'auto'), viewport: { width: finite(candidate.viewport?.width), height: finite(candidate.viewport?.height), dpr: finite(candidate.viewport?.dpr, 1) },
    capture: { mode: 'scene-raw-no-postprocess', mimeType: 'image/png', width: finite(candidate.capture?.width), height: finite(candidate.capture?.height), includesDomUi: false, includesPostprocess: false },
    generation: cleanTrace(candidate.generation), assets: { parentSnapshotId: candidate.assets?.parentSnapshotId ? safeText(candidate.assets.parentSnapshotId) : null, iteration: finite(candidate.assets?.iteration, 1) }, appVersion: safeText(candidate.appVersion), gitCommit: candidate.gitCommit ? safeText(candidate.gitCommit) : null,
    render: { metrics: candidate.render?.metrics ? { fps: finite(candidate.render.metrics.fps), frameMs: finite(candidate.render.metrics.frameMs), calls: finite(candidate.render.metrics.calls), triangles: finite(candidate.render.metrics.triangles), validFrames: finite(candidate.render.metrics.validFrames), sampleDurationMs: finite(candidate.render.metrics.sampleDurationMs), configRevision: finite(candidate.render.metrics.configRevision) } : null, loadMs: candidate.render?.loadMs == null ? null : finite(candidate.render.loadMs) },
    restoreLimitations: Array.isArray(candidate.restoreLimitations) && candidate.restoreLimitations.length ? candidate.restoreLimitations.map(safeText) : ['记录为场景基础渲染，不含 DOM 界面与镜头后处理。', '状态恢复仅恢复镜头模式，不改写自由观察后的精确相机位置。'],
  }
  // Export is an explicit allowlist; these keys are intentionally never copied.
  void SENSITIVE_KEYS
  clean.generation = cleanTrace(candidate.generation)
  return clean
}

export function loadSnapshots(storage: Storage | null = typeof window === 'undefined' ? null : window.localStorage): SceneSnapshot[] {
  if (!storage) return []
  try { const parsed = JSON.parse(storage.getItem(SNAPSHOT_STORAGE_KEY) ?? '[]'); return Array.isArray(parsed) ? parsed.map(sanitizeSnapshot).filter((s): s is SceneSnapshot => !!s).slice(0, 12) : [] } catch { return [] }
}
export function saveSnapshotMetadata(snapshot: SceneSnapshot, storage: Storage | null = typeof window === 'undefined' ? null : window.localStorage): SceneSnapshot[] {
  if (!storage) return [snapshot]
  const next = [snapshot, ...loadSnapshots(storage).filter(item => item.snapshotId !== snapshot.snapshotId)].slice(0, 12)
  try { storage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(next)) } catch { /* private mode or blocked storage */ }
  return next
}
export function snapshotJson(snapshot: SceneSnapshot) { return JSON.stringify(sanitizeSnapshot(snapshot), null, 2) }
export function snapshotFileName(snapshotId: string, extension: 'png' | 'json') { return `stable-city-snapshot-${snapshotId}.${extension}` }
