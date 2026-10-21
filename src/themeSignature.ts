import type { ThemeName } from './theme'
import { megaConfig } from './sceneConfig'

export type ThemeSignatureBox = {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  slot?: 'hero'
}

export type ThemeSignature = {
  bodies: ThemeSignatureBox[]
  accents: ThemeSignatureBox[]
  attachments: ThemeSignatureBox[]
}

const box = (position: [number, number, number], size: [number, number, number], color: string): ThemeSignatureBox => ({ position, size, color })
const heroAccent = (position: [number, number, number], size: [number, number, number], color: string): ThemeSignatureBox => ({ ...box(position, size, color), slot: 'hero' })

// Stage 18 public-space anchors: the waterfront pavilion and deep-park courtyard.
const pavilion = { x: -105, z: -3 }
const courtyard = { x: -77, z: -40 }

export function buildThemeSignature(theme: ThemeName | null): ThemeSignature {
  if (!theme) return { bodies: [], accents: [], attachments: [] }

  const spec = {
    harbor: { primary: '#315f68', accent: '#e2b273', trim: '#8aaba8', foliage: '#557762' },
    verdant: { primary: '#365e50', accent: '#e1bd69', trim: '#8fa27b', foliage: '#64815c' },
    ember: { primary: '#6b4541', accent: '#efb07b', trim: '#a2765d', foliage: '#6b7058' },
  }[theme]
  const bodies: ThemeSignatureBox[] = []
  const accents: ThemeSignatureBox[] = []
  const attachments: ThemeSignatureBox[] = []

  if (theme === 'harbor') {
    // Two open dock frames, raised above the pavilion roof, with quiet courtyard crossbeams.
    for (const x of [pavilion.x - 6.5, pavilion.x + 6.5]) {
      for (const dx of [-3, 3]) for (const dz of [-1.5, 1.5]) {
        bodies.push(box([x + dx, 7.05, pavilion.z + dz], [.36, 3.3, .36], spec.primary))
      }
      bodies.push(box([x, 8.82, pavilion.z - 1.5], [6.36, .36, .36], spec.trim))
      bodies.push(box([x, 8.82, pavilion.z + 1.5], [6.36, .36, .36], spec.trim))
      bodies.push(box([x - 3, 8.82, pavilion.z], [.36, .36, 3.36], spec.trim))
      bodies.push(box([x + 3, 8.82, pavilion.z], [.36, .36, 3.36], spec.trim))
    }
    for (const z of [courtyard.z - 3, courtyard.z + 3]) {
      bodies.push(box([courtyard.x, 5.85, z], [12, .28, .34], spec.trim))
    }
    for (const x of [pavilion.x - 6.5, pavilion.x + 6.5]) {
      accents.push(box([x, 8.84, pavilion.z - 1.5], [2.2, .08, .12], spec.accent))
      accents.push(box([x, 8.84, pavilion.z + 1.5], [2.2, .08, .12], spec.accent))
    }
  }

  if (theme === 'verdant') {
    // Three broken, receding shade tiers form a stepped canopy above the pavilion.
    for (const [y, width, depth] of [[6.15, 18, 10], [7.15, 14, 7.5], [8.15, 10, 5]] as const) {
      for (const side of [-1, 1]) {
        bodies.push(box([pavilion.x + side * width * .255, y, pavilion.z], [width * .43, .3, depth], spec.foliage))
      }
    }
    for (const xSide of [-1, 1]) for (const zSide of [-1, 1]) {
      bodies.push(box([pavilion.x + xSide * 8.8, .62, pavilion.z + zSide * 5.8], [2.6, 1.05, 1.8], spec.trim))
    }
    for (const xSide of [-1, 1]) for (const tier of [0, 1, 2]) {
      const width = [18, 14, 10][tier]
      accents.push(box([pavilion.x + xSide * width * .255, 6.31 + tier, pavilion.z - 4.7 + tier * 1.2], [1.5, .07, .1], spec.accent))
    }
  }

  if (theme === 'ember') {
    // Three paired, unequal-height vent stacks with short radiator ends.
    for (const x of [pavilion.x - 7, pavilion.x, pavilion.x + 7]) {
      bodies.push(box([x - 1.15, 6.25, pavilion.z], [.72, 1.7, .72], spec.primary))
      bodies.push(box([x - 1.15, 7.17, pavilion.z], [1.1, .18, 1.1], spec.accent))
      bodies.push(box([x + 1.15, 7.15, pavilion.z], [.72, 3.5, .72], spec.primary))
      bodies.push(box([x + 1.15, 9.02, pavilion.z], [1.1, .18, 1.1], spec.accent))
      for (const side of [-1, 1]) {
        bodies.push(box([x + side * 1.85, 5.68, pavilion.z + 1.25], [.22, .48, 1.5], spec.trim))
        accents.push(box([x + side * 1.85, 5.7, pavilion.z + 1.25], [.24, .12, .9], spec.accent))
      }
    }
  }

  // Keep attachments seated on the new 64 x 96 x 18 gate instead of the old roof anchor.
  const heroAnchor = { y: megaConfig.gate.height, z: megaConfig.frontZ + megaConfig.dimensions.depth / 2 }
  for (const side of [-1, 1]) {
    if (theme === 'harbor') {
      // Open gate frames sit beside the hero, with outward corbels and clear centers.
      for (const z of [-4, 4]) attachments.push(box([side * 18.2, heroAnchor.y + 1.2, heroAnchor.z + z], [.6, 33, .6], spec.primary))
      attachments.push(box([side * 18.2, heroAnchor.y + 27.2, heroAnchor.z], [.6, .5, 9.2], spec.trim))
      for (const z of [-4, 4]) attachments.push(box([side * 21, heroAnchor.y + 22, heroAnchor.z + z], [3, .7, .65], spec.trim))
      accents.push(heroAccent([side * 18.2, heroAnchor.y + 27.25, heroAnchor.z], [.34, .08, 5.6], spec.accent))
    }

    if (theme === 'verdant') {
      // Three offset wing shelves and narrow vertical supports on each side.
      for (const [tier, offset] of [[0, 0], [1, -.35], [2, -.7]] as const) {
        attachments.push(box([side * (19 + offset), heroAnchor.y + tier * 8, heroAnchor.z], [tier === 2 ? 6.8 : 7.2, .38, 7.8], spec.foliage))
      }
      attachments.push(box([side * 17.8, heroAnchor.y + 8, heroAnchor.z - 2.1], [.24, 18, .34], spec.trim))
      attachments.push(box([side * 17.8, heroAnchor.y + 8, heroAnchor.z + 2.1], [.24, 18, .34], spec.trim))
      accents.push(heroAccent([side * 19, heroAnchor.y + 8.16, heroAnchor.z - 3.1], [2.8, .08, .14], spec.accent))
    }

    if (theme === 'ember') {
      // Three vents climb outward on each side above a compact support beam.
      const positions = [18.2, 20.5, 22.8]
      const heights = [12, 19, 26]
      for (const [index, x] of positions.entries()) {
        const height = heights[index]
        attachments.push(box([side * x, heroAnchor.y - 7 + height / 2, heroAnchor.z], [.55, height, .8], spec.primary))
        attachments.push(box([side * x, heroAnchor.y - 7 + height + .18, heroAnchor.z], [.92, .36, 1.2], spec.trim))
      }
      attachments.push(box([side * 20.5, heroAnchor.y - 7, heroAnchor.z], [5.1, .4, .65], spec.trim))
      accents.push(heroAccent([side * 22.8, heroAnchor.y + 19.2, heroAnchor.z], [.44, .12, .48], spec.accent))
    }
  }

  return { bodies, accents, attachments }
}
