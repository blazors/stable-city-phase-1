export type MegaBox = {
  position: [number, number, number]
  size: [number, number, number]
}

// Keep the roof layers physically separated. Interpenetrating thin slabs and
// fins produce unstable depth/shadow results while orbiting close to the hero.
export const megaRoofSupportTop = 24.5
export const megaRoofFascia: MegaBox = { position: [0, 24.6, 9], size: [29, .14, 10] }
export const megaRoofDeck: MegaBox = { position: [0, 24.79, 9], size: [25, .12, 8] }
export const megaRoofRibY = 26
export const megaRoofRibHeight = 2.1

export function createMegaRoofRibs(): MegaBox[] {
  const ribs: MegaBox[] = []
  for (let x = -13; x <= 13; x += 1.3) ribs.push({ position: [x, megaRoofRibY, 9], size: [.28, megaRoofRibHeight, 10.5] })
  return ribs
}
