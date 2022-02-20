export interface Glitch {
  type: 'glitch'
}

export type EffectConfig = Glitch

export type EffectType = EffectConfig['type']

export type EffectsConfig = EffectConfig[]

export function initEffectsConfig(): EffectsConfig {
  return []
}

export const effectTypes: EffectType[] = ['glitch']
