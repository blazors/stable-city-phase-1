import type { StableCity } from './city'

export type ArtMetrics = {
  heroDominance: number
  secondaryPeakCount: number
  heightVariance: number
  voidRatio: number
  skylineRhythm: number
  silhouetteStrength: number
  visualNoise: number
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

/** Deterministic structural signals for rule-based QC; these do not replace visual review. */
export function getArtMetrics(city: StableCity): ArtMetrics {
  const heights = city.buildings.map(building => building.height)
  const mean = heights.reduce((sum, height) => sum + height, 0) / heights.length
  const variance = heights.reduce((sum, height) => sum + (height - mean) ** 2, 0) / heights.length
  const deviation = Math.sqrt(variance)
  const ordered = [...heights].sort((a, b) => b - a)
  const rhythm = heights.slice(1).reduce((sum, height, index) => sum + Math.min(1, Math.abs(height - heights[index]) / 18), 0) / Math.max(1, heights.length - 1)
  const peakGap = ordered.length > 1 ? (ordered[0] - ordered[1]) / Math.max(1, ordered[0]) : 0
  const toneVariance = city.buildings.reduce((sum, building) => sum + (building.tone - .5) ** 2, 0) / city.buildings.length
  return {
    heroDominance: Number(clamp(.62 + peakGap * .8).toFixed(3)),
    secondaryPeakCount: city.secondaryPeaks.length,
    heightVariance: Number(clamp(deviation / 18).toFixed(3)),
    voidRatio: Number((city.publicVoids.length / city.blocks.length).toFixed(3)),
    skylineRhythm: Number(clamp(rhythm).toFixed(3)),
    silhouetteStrength: Number(clamp(.45 + deviation / 30 + city.secondaryPeaks.length * .06).toFixed(3)),
    visualNoise: Number(clamp(toneVariance * 2.1).toFixed(3)),
  }
}
