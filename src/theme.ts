export type ThemeName = 'harbor' | 'verdant' | 'ember'

export type ThemeSpec = {
  id: ThemeName
  label: string
  primary: string
  accent: string
  atmosphere: string
  primaryHue: string
  secondaryHue: string
  accentHue: string
  warmCoolRelation: string
  saturationProfile: string
  valueProfile: string
  contrastMode: string
  emissionHue: string
  atmosphereTint: string
  allowedSlots: string[]
  blockedFields: string[]
}

const sharedAllowedSlots = ['facade', 'crown', 'attachment', 'material', 'color', 'emission', 'vegetation', 'atmosphere']
const sharedBlockedFields = ['roadGraph', 'blocks', 'parcels', 'buildingBaseMass', 'megaCore', 'transportGraph']

export const themeSpecs: Record<ThemeName, ThemeSpec> = {
  harbor: { id: 'harbor', label: 'Harbor Mineral', primary: '#315f68', accent: '#e2b273', atmosphere: '#89aeb1', primaryHue: 'mineral teal', secondaryHue: 'weathered stone', accentHue: 'warm brass', warmCoolRelation: 'cool base / warm accent', saturationProfile: 'controlled', valueProfile: 'mid contrast', contrastMode: 'graphic', emissionHue: 'amber', atmosphereTint: 'sea mist', allowedSlots: sharedAllowedSlots, blockedFields: sharedBlockedFields },
  verdant: { id: 'verdant', label: 'Verdant Relay', primary: '#365e50', accent: '#e1bd69', atmosphere: '#91ae87', primaryHue: 'deep moss', secondaryHue: 'soft limestone', accentHue: 'sunlit gold', warmCoolRelation: 'cool green / warm accent', saturationProfile: 'soft rich', valueProfile: 'layered midtone', contrastMode: 'graphic', emissionHue: 'pale gold', atmosphereTint: 'green haze', allowedSlots: sharedAllowedSlots, blockedFields: sharedBlockedFields },
  ember: { id: 'ember', label: 'Ember Foundry', primary: '#6b4541', accent: '#efb07b', atmosphere: '#b87a70', primaryHue: 'oxidized umber', secondaryHue: 'charcoal metal', accentHue: 'heated copper', warmCoolRelation: 'warm base / hot accent', saturationProfile: 'focused', valueProfile: 'deep contrast', contrastMode: 'graphic', emissionHue: 'forge orange', atmosphereTint: 'dry ash', allowedSlots: sharedAllowedSlots, blockedFields: sharedBlockedFields },
}

export function interpretThemeBrief(input: string): ThemeName {
  const brief = input.toLowerCase()
  if (/绿|森林|植物|生态|verdant|moss/.test(brief)) return 'verdant'
  if (/余烬|工业|铸造|火|锈|ember|forge/.test(brief)) return 'ember'
  return 'harbor'
}
