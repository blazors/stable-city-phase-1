export type ThemeName = 'harbor' | 'verdant' | 'ember'

export type ThemeSpec = {
  id: ThemeName
  label: string
  primary: string
  accent: string
  bodyLight: string
  bodyDark: string
  trim: string
  glass: string
  foliage: string
  emission: string
  megaBody: string
  megaInset: string
  materialResponse: {
    coreBody: { roughness: number; metalness: number }
    coreTrim: { roughness: number; metalness: number }
    coreGlass: { roughness: number; metalness: number }
    megaBody: { roughness: number; metalness: number }
    megaRibs: { roughness: number; metalness: number }
    megaInset: { roughness: number; metalness: number }
  }
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
  harbor: { id: 'harbor', label: 'Harbor Mineral', primary: '#315f68', accent: '#e2b273', bodyLight: '#c3c9bc', bodyDark: '#315b66', trim: '#8aaba8', glass: '#254650', foliage: '#557762', emission: '#e2b273', megaBody: '#c3c9bc', megaInset: '#315b66', materialResponse: { coreBody: { roughness: .84, metalness: .03 }, coreTrim: { roughness: .62, metalness: .12 }, coreGlass: { roughness: .34, metalness: .12 }, megaBody: { roughness: .74, metalness: .05 }, megaRibs: { roughness: .48, metalness: .20 }, megaInset: { roughness: .36, metalness: .16 } }, atmosphere: '#89aeb1', primaryHue: 'mineral teal', secondaryHue: 'weathered stone', accentHue: 'warm brass', warmCoolRelation: 'cool base / warm accent', saturationProfile: 'controlled', valueProfile: 'mid contrast', contrastMode: 'graphic', emissionHue: 'amber', atmosphereTint: 'sea mist', allowedSlots: sharedAllowedSlots, blockedFields: sharedBlockedFields },
  verdant: { id: 'verdant', label: 'Verdant Relay', primary: '#365e50', accent: '#e1bd69', bodyLight: '#cecdb2', bodyDark: '#365c49', trim: '#8fa27b', glass: '#2e4941', foliage: '#64815c', emission: '#e1cf8b', megaBody: '#cecdb2', megaInset: '#365c49', materialResponse: { coreBody: { roughness: .90, metalness: .01 }, coreTrim: { roughness: .78, metalness: .03 }, coreGlass: { roughness: .43, metalness: .08 }, megaBody: { roughness: .84, metalness: .02 }, megaRibs: { roughness: .66, metalness: .06 }, megaInset: { roughness: .48, metalness: .08 } }, atmosphere: '#91ae87', primaryHue: 'deep moss', secondaryHue: 'soft limestone', accentHue: 'sunlit gold', warmCoolRelation: 'cool green / warm accent', saturationProfile: 'soft rich', valueProfile: 'layered midtone', contrastMode: 'graphic', emissionHue: 'pale gold', atmosphereTint: 'green haze', allowedSlots: sharedAllowedSlots, blockedFields: sharedBlockedFields },
  ember: { id: 'ember', label: 'Ember Foundry', primary: '#6b4541', accent: '#efb07b', bodyLight: '#bfa18d', bodyDark: '#583f3c', trim: '#a2765d', glass: '#303d44', foliage: '#6b7058', emission: '#ee995d', megaBody: '#bfa18d', megaInset: '#583f3c', materialResponse: { coreBody: { roughness: .78, metalness: .08 }, coreTrim: { roughness: .56, metalness: .22 }, coreGlass: { roughness: .32, metalness: .18 }, megaBody: { roughness: .67, metalness: .14 }, megaRibs: { roughness: .44, metalness: .28 }, megaInset: { roughness: .31, metalness: .22 } }, atmosphere: '#b87a70', primaryHue: 'oxidized umber', secondaryHue: 'charcoal metal', accentHue: 'heated copper', warmCoolRelation: 'warm base / hot accent', saturationProfile: 'focused', valueProfile: 'deep contrast', contrastMode: 'graphic', emissionHue: 'forge orange', atmosphereTint: 'dry ash', allowedSlots: sharedAllowedSlots, blockedFields: sharedBlockedFields },
}

export function interpretThemeBrief(input: string): ThemeName {
  const brief = input.toLowerCase()
  if (/绿|森林|植物|生态|verdant|moss/.test(brief)) return 'verdant'
  if (/余烬|工业|铸造|火|锈|ember|forge/.test(brief)) return 'ember'
  return 'harbor'
}
