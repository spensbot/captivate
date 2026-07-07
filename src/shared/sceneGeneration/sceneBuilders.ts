import { Modulator } from '../modulation'
import { Modulation, Params } from '../params'
import { RandomizerOptions } from '../randomizer'
import { LightScene_t, SplitScene_t } from '../Scenes'
import { LfoShape } from '../oscillator'
import {
  doubleLfoPeriod,
  halfLfoPeriod,
  LFO_UI_PERIOD_OPTIONS,
  snapLfoPeriodToUi,
} from '../lfoPeriod'
import { SeededRng } from './rng'
import type { RigProfile } from './rigProfile'

export const defaultRandomizer: RandomizerOptions = {
  triggerPeriod: 1,
  triggerDensity: 0.3,
  envelopeRatio: 0.1,
  envelopeDuration: 1,
}

export const RAND = {
  light: {
    triggerPeriod: 1.5,
    triggerDensity: 0.22,
    envelopeRatio: 0.12,
    envelopeDuration: 0.85,
  },
  spark: {
    triggerPeriod: 0.75,
    triggerDensity: 0.38,
    envelopeRatio: 0.07,
    envelopeDuration: 0.55,
  },
  rare: {
    triggerPeriod: 2.25,
    triggerDensity: 0.14,
    envelopeRatio: 0.14,
    envelopeDuration: 1.1,
  },
} satisfies Record<string, RandomizerOptions>

const BAND = {
  kick: {
    audioBandLowHz: 35,
    audioBandHighHz: 180,
    audioThreshold: 0.03,
    audioMax: 0.48,
    audioAttack: 0.72,
    audioDecay: 0.38,
    audioBandSmoothing: 0.12,
  },
  snare: {
    audioBandLowHz: 180,
    audioBandHighHz: 2800,
    audioThreshold: 0.04,
    audioMax: 0.5,
    audioAttack: 0.68,
    audioDecay: 0.32,
    audioBandSmoothing: 0.1,
  },
  hat: {
    audioBandLowHz: 2200,
    audioBandHighHz: 9000,
    audioThreshold: 0.04,
    audioMax: 0.52,
    audioAttack: 0.82,
    audioDecay: 0.28,
    audioBandSmoothing: 0.08,
  },
  vocal: {
    audioBandLowHz: 280,
    audioBandHighHz: 3400,
    audioThreshold: 0.04,
    audioMax: 0.5,
    audioAttack: 0.55,
    audioDecay: 0.45,
    audioBandSmoothing: 0.15,
  },
  mid: {
    audioBandLowHz: 250,
    audioBandHighHz: 2400,
    audioThreshold: 0.04,
    audioMax: 0.5,
    audioAttack: 0.7,
    audioDecay: 0.35,
    audioBandSmoothing: 0.1,
  },
  bass: {
    audioBandLowHz: 28,
    audioBandHighHz: 140,
    audioThreshold: 0.02,
    audioMax: 0.45,
    audioAttack: 0.88,
    audioDecay: 0.22,
    audioBandSmoothing: 0.05,
  },
} as const

const ENERGY = {
  soft: { audioThreshold: 0.06, audioMax: 0.6, audioEnergySmoothing: 0.58 },
  med: { audioThreshold: 0.05, audioMax: 0.72, audioEnergySmoothing: 0.42 },
  hot: { audioThreshold: 0.04, audioMax: 0.82, audioEnergySmoothing: 0.32 },
} as const

type BandKey = keyof typeof BAND
type EnergyKey = keyof typeof ENERGY

type LfoExtra = Partial<{
  lfoInterModulation: Modulation
  phaseShift: number
  flip: number
  rampCurve: number
  squareDuty: number
  sawFlatten: number
  sinePeakWidth: number
  noiseSeed: number
  noiseSmoothing: number
  audioBandLowHz: number
  audioBandHighHz: number
  audioThreshold: number
  audioMax: number
  audioAttack: number
  audioDecay: number
  audioEnergySmoothing: number
  audioBandSmoothing: number
}>

export function mkIm(targetIndex: number, prop: string, amount: number): Modulation {
  return { [`intermod:lfo:${targetIndex}:${prop}`]: amount }
}

export function mkLfo(
  shape: LfoShape,
  period: number,
  splitModulations: Modulation[],
  extra: LfoExtra = {}
): Modulator {
  const mod: Modulator = {
    lfo: {
      shape,
      skew: 0.5,
      symmetricSkew: 0.5,
      phaseShift: extra.phaseShift ?? 0,
      flip: extra.flip ?? 0,
      period: snapLfoPeriodToUi(period),
      sinePeakWidth: extra.sinePeakWidth ?? 0.5,
      rampCurve: extra.rampCurve ?? 0.5,
      squareDuty: extra.squareDuty ?? 0.5,
      sawFlatten: extra.sawFlatten ?? 0,
      noiseSeed: extra.noiseSeed ?? 0.5,
      noiseSmoothing: extra.noiseSmoothing ?? 0,
      audioBandLowHz: extra.audioBandLowHz ?? 120,
      audioBandHighHz: extra.audioBandHighHz ?? 2000,
      audioThreshold: extra.audioThreshold ?? 0.02,
      audioMax: extra.audioMax ?? 0.55,
      audioAttack: extra.audioAttack ?? 0.35,
      audioDecay: extra.audioDecay ?? 0.55,
      audioEnergySmoothing: extra.audioEnergySmoothing ?? 0.65,
      audioBandSmoothing: extra.audioBandSmoothing ?? 0,
    },
    splitModulations,
  }
  if (extra.lfoInterModulation && Object.keys(extra.lfoInterModulation).length > 0) {
    mod.lfoInterModulation = extra.lfoInterModulation
  }
  return mod
}

export function mkSplit(
  baseParams: Params,
  randomizer: RandomizerOptions = defaultRandomizer,
  groups: SplitScene_t['groups'] = {},
  options: {
    modManualAnchors?: SplitScene_t['modManualAnchors']
    splitModShaping?: SplitScene_t['splitModShaping']
  } = {}
): SplitScene_t {
  const split: SplitScene_t = {
    baseParams,
    randomizer,
    groups,
  }
  if (options.modManualAnchors) {
    split.modManualAnchors = options.modManualAnchors
  }
  if (options.splitModShaping) {
    split.splitModShaping = options.splitModShaping
  }
  return split
}

export function centeredLook(hue: number, patch: Params = {}): Params {
  return {
    hue,
    saturation: 0.9,
    brightness: 0.45,
    x: 0.5,
    y: 0.5,
    width: 0.75,
    height: 1,
    ...patch,
  }
}

export function pulseSplit(
  hue: number,
  patch: Params = {},
  options: {
    randomizer?: RandomizerOptions
    modManualAnchors?: SplitScene_t['modManualAnchors']
    splitModShaping?: SplitScene_t['splitModShaping']
  } = {}
): SplitScene_t {
  return mkSplit(
    centeredLook(hue, patch),
    options.randomizer ?? defaultRandomizer,
    {},
    {
      modManualAnchors: {
        brightness: 'bottom',
        width: 'bottom',
        ...options.modManualAnchors,
      },
      splitModShaping: options.splitModShaping,
    }
  )
}

export function mkAudioBand(
  splitMods: Modulation[],
  bandKey: BandKey,
  patch: LfoExtra = {}
) {
  return mkLfo(LfoShape.AudioBand, 1, splitMods, { ...BAND[bandKey], ...patch })
}

export function mkEnergyLfo(
  splitMods: Modulation[],
  level: EnergyKey = 'med',
  patch: LfoExtra = {}
) {
  return mkLfo(LfoShape.AudioEnergy, 1, splitMods, { ...ENERGY[level], ...patch })
}

export function beatSquare(
  splitMods: Modulation[],
  period = 1,
  extra: LfoExtra = {}
) {
  return mkLfo(LfoShape.Square, period, splitMods, {
    squareDuty: 0.2,
    ...extra,
  })
}

export function directorLfo(
  shape: LfoShape,
  period: number,
  routes: Array<[number, string, number]>,
  extra: LfoExtra = {}
) {
  const lfoInterModulation: Modulation = {}
  for (const [target, prop, amount] of routes) {
    Object.assign(lfoInterModulation, mkIm(target, prop, amount))
  }
  return mkLfo(shape, period, [{}], { lfoInterModulation, ...extra })
}

export function splitModsForCount(
  splitCount: number,
  fn: (index: number) => Modulation | undefined
): Modulation[] {
  return Array.from({ length: splitCount }, (_, index) => fn(index) ?? {})
}

export function padSplitMods(
  existingSplitCount: number,
  moverMod: Modulation
): Modulation[] {
  return [...Array(existingSplitCount).fill({}), moverMod]
}

const MOVER_GROUPS = { Movers: true }

/** Pad Y: 0 = audience (FOH), 1 = upstage/back — defaults keep beams crowd-side. */
export const MOVER_CROWD_Y = {
  calm: 0.26,
  mid: 0.32,
  energetic: 0.38,
} as const

export function moverCrowdYAxis(epicness: number): number {
  if (epicness < 0.35) return MOVER_CROWD_Y.calm
  if (epicness < 0.7) return MOVER_CROWD_Y.mid
  return MOVER_CROWD_Y.energetic
}

export function moverBase(epicness: number, patch: Params = {}): Params {
  const calm = epicness < 0.35
  const mid = epicness >= 0.35 && epicness < 0.7
  return {
    xAxis: 0.5,
    yAxis: moverCrowdYAxis(epicness),
    brightness: calm ? 0.18 : mid ? 0.24 : 0.3,
    saturation: 0.65,
    hue: 0.55,
    width: 0.8,
    height: 1,
    moverFloorLock: epicness > 0.75 ? 1 : 0,
    moverSpread: 0,
    moverMirrorX: 0,
    moverMirrorY: 0,
    moverMode: 0,
    ...patch,
  }
}

export function moverSplit(
  epicness: number,
  patch: Params = {},
  options: {
    modManualAnchors?: SplitScene_t['modManualAnchors']
    phaseOffsetBeats?: number
    splitModShaping?: SplitScene_t['splitModShaping']
  } = {}
): SplitScene_t {
  return mkSplit(moverBase(epicness, patch), defaultRandomizer, MOVER_GROUPS, {
    modManualAnchors: {
      brightness: 'bottom',
      xAxis: 'center',
      yAxis: 'top',
      ...options.modManualAnchors,
    },
    splitModShaping: {
      phaseOffsetBeats: options.phaseOffsetBeats,
      ...options.splitModShaping,
    },
  })
}

function moverTiming(epicness: number) {
  if (epicness < 0.22) {
    return { motionPeriod: 32, gatePeriod: 32, audio: false }
  }
  if (epicness < 0.38) {
    return { motionPeriod: 16, gatePeriod: 16, audio: false }
  }
  if (epicness < 0.55) {
    return { motionPeriod: 16, gatePeriod: 8, audio: false }
  }
  if (epicness < 0.72) {
    return { motionPeriod: 8, gatePeriod: 8, audio: false }
  }
  return { motionPeriod: 8, gatePeriod: 4, audio: true }
}

function moverBeamGate(
  splitCount: number,
  period: number,
  amount: number,
  phaseShift = 0.125,
  extra: LfoExtra = {}
) {
  return mkLfo(
    LfoShape.Sin,
    period,
    padSplitMods(splitCount, { brightness: amount }),
    { phaseShift, sinePeakWidth: 0.2, ...extra }
  )
}

export type MoverChoreoStyle = 'tiltSweep' | 'panCascade'

function padMoverColumnMods(
  totalSplitCount: number,
  moverColumnStartIndex: number,
  moverColumnCount: number,
  mod: Modulation
): Modulation[] {
  return Array.from({ length: totalSplitCount }, (_, index) =>
    index >= moverColumnStartIndex && index < moverColumnStartIndex + moverColumnCount
      ? mod
      : {}
  )
}

/** Sin-only: one-beat tilt dip toward crowd then rise — beams flash on the same beat. */
export function buildMoverBeatTiltSweepMods(
  epicness: number,
  splitCount: number,
  phaseSeed = 0
): Modulator[] {
  const pad = (mod: Modulation) => padSplitMods(splitCount, mod)
  const phase = (phaseSeed * 0.17) % 1
  const tilt = epicness > 0.7 ? 0.32 : 0.26
  return [
    mkLfo(LfoShape.Sin, 1, pad({ yAxis: tilt }), {
      sinePeakWidth: 0.11,
      phaseShift: phase,
    }),
    mkLfo(LfoShape.Sin, 1, pad({ brightness: 0.72 }), {
      sinePeakWidth: 0.09,
      phaseShift: phase,
    }),
  ]
}

/**
 * Sin-only pan: L→R over 4 bars with tilt arc, beams on outbound; dark sequential return.
 * Use one spatial Movers split per column with staggered phaseOffsetBeats on splits.
 */
export function buildMoverPanCascadeMods(
  totalSplitCount: number,
  moverColumnStartIndex: number,
  columnCount: number,
  phaseSeed = 0
): Modulator[] {
  const pad = (mod: Modulation) =>
    padMoverColumnMods(totalSplitCount, moverColumnStartIndex, columnCount, mod)
  const phase = (phaseSeed * 0.17) % 1
  return [
    mkLfo(LfoShape.Sin, 32, pad({ xAxis: 0.42 }), {
      phaseShift: (phase + 0.125) % 1,
    }),
    mkLfo(LfoShape.Sin, 4, pad({ yAxis: 0.28 }), {
      sinePeakWidth: 0.2,
      phaseShift: phase,
    }),
    mkLfo(LfoShape.Sin, 32, pad({ brightness: 0.76 }), {
      sinePeakWidth: 0.46,
      phaseShift: phase,
    }),
  ]
}

export function buildMoverRowColumnSplits(
  epicness: number,
  columns: Array<{ x: number; y: number; width: number; height: number }>,
  options: { returnStaggerBeats?: number } = {}
): SplitScene_t[] {
  const returnSpan = options.returnStaggerBeats ?? 16
  return columns.map((zone, columnIndex) =>
    mkSplit(
      moverBase(epicness, {
        brightness: 0.1,
        saturation: 0.9,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        xAxis: zone.x,
        yAxis: moverCrowdYAxis(epicness),
        moverFloorLock: 1,
      }),
      defaultRandomizer,
      MOVER_GROUPS,
      {
        modManualAnchors: {
          brightness: 'bottom',
          xAxis: 'center',
          yAxis: 'center',
        },
        splitModShaping: {
          phaseOffsetBeats:
            (columnIndex * returnSpan) / Math.max(1, columns.length),
        },
      }
    )
  )
}

export function resolveMoverColumnCount(profile: RigProfile): number {
  const movers = profile.fixtureAnchors.filter((anchor) => anchor.isMover)
  return Math.min(8, Math.max(2, movers.length > 0 ? movers.length : 4))
}

export function defaultRowColumnZones(columnCount: number) {
  return Array.from({ length: columnCount }, (_, columnIndex) => ({
    x: (columnIndex + 0.5) / columnCount,
    y: 0.5,
    width: 0.9 / columnCount,
    height: 0.85,
  }))
}

export function moverChoreoSplit(
  epicness: number,
  patch: Params = {},
  options: {
    phaseOffsetBeats?: number
    splitModShaping?: SplitScene_t['splitModShaping']
  } = {}
): SplitScene_t {
  return moverSplit(
    epicness,
    { brightness: 0.1, saturation: 0.88, moverFloorLock: 1, ...patch },
    {
      modManualAnchors: {
        brightness: 'bottom',
        xAxis: 'center',
        yAxis: 'center',
      },
      ...options,
    }
  )
}

const MOVER_PATTERNS = [
  'upwardSweep',
  'figureEight',
  'horizontalArch',
  'verticalWave',
  'wideOrbit',
  'crossScan',
  'slowDrift',
  'beatTiltSweep',
] as const

type MoverPattern = (typeof MOVER_PATTERNS)[number]

export function buildMoverPatternMods(
  pattern: MoverPattern,
  epicness: number,
  splitCount: number,
  phaseSeed = 0
): Modulator[] {
  if (pattern === 'beatTiltSweep') {
    return buildMoverBeatTiltSweepMods(epicness, splitCount, phaseSeed)
  }

  const t = moverTiming(epicness)
  const pad = (mod: Modulation) => padSplitMods(splitCount, mod)
  const phase = (phaseSeed * 0.17) % 1
  const mods: Modulator[] = []

  switch (pattern) {
    case 'upwardSweep':
      mods.push(
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ yAxis: 0.36 }), { phaseShift: phase }),
        mkLfo(LfoShape.Sin, doubleLfoPeriod(t.motionPeriod), pad({ xAxis: 0.06 }), {
          phaseShift: (phase + 0.125) % 1,
        }),
        mkLfo(LfoShape.Ramp, t.motionPeriod, pad({ brightness: 0.52 }), {
          rampCurve: 0.4,
          phaseShift: (phase + 0.04) % 1,
        })
      )
      break
    case 'figureEight':
      mods.push(
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ xAxis: 0.42 }), { phaseShift: phase }),
        mkLfo(LfoShape.Sin, halfLfoPeriod(t.motionPeriod), pad({ yAxis: 0.34 }), {
          phaseShift: (phase + 0.25) % 1,
        }),
        moverBeamGate(splitCount, t.gatePeriod, 0.5, (phase + 0.125) % 1)
      )
      break
    case 'horizontalArch':
      mods.push(
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ xAxis: 0.5 }), { phaseShift: phase }),
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ yAxis: 0.28 }), {
          phaseShift: (phase + 0.25) % 1,
        }),
        moverBeamGate(splitCount, t.gatePeriod, 0.46, (phase + 0.125) % 1)
      )
      break
    case 'verticalWave':
      mods.push(
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ yAxis: 0.38 }), { phaseShift: phase }),
        mkLfo(LfoShape.Sin, doubleLfoPeriod(t.motionPeriod), pad({ xAxis: 0.14 }), {
          phaseShift: (phase + 0.5) % 1,
        }),
        moverBeamGate(splitCount, t.gatePeriod, 0.44, (phase + 0.375) % 1)
      )
      break
    case 'wideOrbit':
      mods.push(
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ xAxis: 0.36 }), { phaseShift: phase }),
        mkLfo(LfoShape.Sin, halfLfoPeriod(t.motionPeriod), pad({ yAxis: 0.32 }), {
          phaseShift: (phase + 0.33) % 1,
        }),
        moverBeamGate(splitCount, t.gatePeriod, 0.48, (phase + 0.2) % 1)
      )
      break
    case 'crossScan':
      mods.push(
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ xAxis: 0.46 }), { phaseShift: phase }),
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ yAxis: 0.46 }), {
          phaseShift: (phase + 0.5) % 1,
        }),
        moverBeamGate(splitCount, t.gatePeriod, 0.42, (phase + 0.125) % 1)
      )
      break
    default:
      mods.push(
        mkLfo(LfoShape.Sin, doubleLfoPeriod(t.motionPeriod), pad({ xAxis: 0.18 }), {
          phaseShift: phase,
        }),
        mkLfo(LfoShape.Sin, t.motionPeriod, pad({ yAxis: 0.22 }), {
          phaseShift: (phase + 0.5) % 1,
        })
      )
      break
  }

  if (t.audio) {
    mods.push(
      mkAudioBand(pad({ brightness: 0.22 }), 'kick', {
        audioMax: epicness > 0.85 ? 0.48 : 0.38,
        audioAttack: 0.82,
        audioDecay: 0.28,
      })
    )
  }

  return mods
}

function sceneHasMoverSplit(scene: Pick<LightScene_t, 'splitScenes'>) {
  return scene.splitScenes.some((split) => split.groups?.Movers === true)
}

function scenePatternIndex(seed: number) {
  return seed >>> 0
}

export function attachMoverAwareness(
  scene: LightScene_t,
  options: { enabled: boolean; patternSeed: number }
): LightScene_t {
  if (!options.enabled || sceneHasMoverSplit(scene)) {
    return scene
  }

  const splitCount = scene.splitScenes.length
  const pattern =
    MOVER_PATTERNS[
      scenePatternIndex(options.patternSeed) % MOVER_PATTERNS.length
    ]!
  const phaseSeed = (scenePatternIndex(options.patternSeed) % 97) / 97
  const isBeatPattern = pattern === 'beatTiltSweep'
  const moverSplitScene = moverSplit(
    scene.epicness,
    isBeatPattern ? { brightness: 0.1, saturation: 0.88 } : {},
    {
      phaseOffsetBeats: (scenePatternIndex(options.patternSeed) % 16) * 0.5,
      modManualAnchors: isBeatPattern
        ? { brightness: 'bottom', xAxis: 'center', yAxis: 'center' }
        : undefined,
    }
  )

  if (scene.epicness >= 0.55 && scene.epicness < 0.72) {
    moverSplitScene.baseParams.moverMode = 1
    moverSplitScene.baseParams.moverSpread = 0.35
  } else if (scene.epicness >= 0.72) {
    moverSplitScene.baseParams.moverMode = 2
    moverSplitScene.baseParams.moverMirrorX = 1
  }

  return {
    ...scene,
    modulators: [
      ...scene.modulators.map((modulator) => ({
        ...modulator,
        splitModulations: [...modulator.splitModulations, {}],
      })),
      ...buildMoverPatternMods(pattern, scene.epicness, splitCount, phaseSeed),
    ],
    splitScenes: [...scene.splitScenes, moverSplitScene],
  }
}

export function wigWagFlashMod(
  splitCount: number,
  amount: number,
  options: {
    period?: number
    phaseShift?: number
    parity?: number
    sinePeakWidth?: number
  } = {}
) {
  const {
    period = 4,
    phaseShift = 0,
    parity = 0,
    sinePeakWidth = 0.1,
  } = options
  return mkLfo(
    LfoShape.Sin,
    period,
    splitModsForCount(splitCount, (index) =>
      index % 2 === parity ? { brightness: amount } : {}
    ),
    { sinePeakWidth, phaseShift }
  )
}

export function zoneSplit(
  zone: { x: number; y: number; width: number; height: number },
  hue: number,
  patch: Params = {},
  groupName?: string
): SplitScene_t {
  const groups = groupName ? { [groupName]: true } : {}
  return mkSplit(
    centeredLook(hue, {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      brightness: 0.06,
      saturation: 0.9,
      positionFeather: 0.08,
      ...patch,
    }),
    defaultRandomizer,
    groups,
    { modManualAnchors: { brightness: 'bottom' } }
  )
}

export function pickLfoPeriod(rng: SeededRng, preferred: number) {
  const snapped = snapLfoPeriodToUi(preferred)
  const index = LFO_UI_PERIOD_OPTIONS.indexOf(snapped)
  if (index < 0) {
    return snapped
  }
  const offset = rng.pick([-1, 0, 0, 0, 1] as const)
  const nextIndex = Math.max(
    0,
    Math.min(LFO_UI_PERIOD_OPTIONS.length - 1, index + offset)
  )
  return LFO_UI_PERIOD_OPTIONS[nextIndex]!
}

/** @deprecated Use {@link pickLfoPeriod}. */
export function jitterPeriod(rng: SeededRng, base: number, _spread = 0.35) {
  return pickLfoPeriod(rng, base)
}

export function jitterHue(rng: SeededRng, base = 0.5) {
  return (base + rng.float(-0.22, 0.22) + 1) % 1
}

export function pickMoverPattern(rng: SeededRng): MoverPattern {
  return rng.pick(MOVER_PATTERNS)
}

export type { MoverPattern, BandKey, EnergyKey }
