/** Persisted when the user dismisses the in-viewport WebGL 1 fallback notice. */
export const LIGHTING3D_WEBGL1_BANNER_DISMISSED_KEY =
  'captivate.lighting3d.webgl1BannerDismissed'

export type LightingRendererCapabilities = {
  webglVersion: 1 | 2
  /** True when WebGL 2 could not be created and WebGL 1 is used instead. */
  webgl1Fallback: boolean
  volumetricFog: boolean
  antialias: boolean
  softShadows: boolean
  spotShadows: boolean
  maxPixelRatio: number
}

export const WEBGL1_FALLBACK_STATUS_MESSAGE =
  'Lighting 3D is using reduced graphics (WebGL 1). Fixture shadows are off. Update GPU drivers for full quality.'

export const WEBGL1_FALLBACK_BANNER_TITLE = 'Reduced graphics mode (WebGL 1)'

/** Short bullets for the viewport banner. */
export const WEBGL1_FALLBACK_DIFFERENCES: ReadonlyArray<{
  label: string
  detail: string
}> = [
  {
    label: 'No fixture shadows',
    detail:
      'Real-time spot shadows are turned off to keep the preview responsive on older graphics paths.',
  },
  {
    label: 'Softer picture',
    detail:
      'Anti-aliasing is off and resolution is capped — edges may look jagged compared to WebGL 2.',
  },
  {
    label: 'DMX preview still works',
    detail:
      'Fixture colors, emitters, movers, and placement still follow live DMX and your patch.',
  },
]

export const WEBGL1_FALLBACK_RECOVERY_HINT =
  'For full quality, update your GPU drivers, turn on hardware acceleration in Windows, and (on laptops) set Captivate to use the dedicated GPU.'

export function readWebgl1BannerDismissed(): boolean {
  try {
    return (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(LIGHTING3D_WEBGL1_BANNER_DISMISSED_KEY) === '1'
    )
  } catch {
    return false
  }
}

export function persistWebgl1BannerDismissed(): void {
  try {
    localStorage.setItem(LIGHTING3D_WEBGL1_BANNER_DISMISSED_KEY, '1')
  } catch {
    // ignore private mode / quota
  }
}
