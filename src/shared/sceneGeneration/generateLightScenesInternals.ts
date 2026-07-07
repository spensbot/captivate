import { LightScene_t } from '../Scenes'
import { LfoShape } from '../oscillator'
import { SeededRng } from './rng'
import {
  buildGroupZones,
  buildLeftRightZones,
  buildSpatialZonesFromRig,
  RigProfile,
} from './rigProfile'
import {
  attachMoverAwareness,
  beatSquare,
  buildMoverBeatTiltSweepMods,
  buildMoverPanCascadeMods,
  buildMoverPatternMods,
  buildMoverRowColumnSplits,
  defaultRowColumnZones,
  directorLfo,
  jitterHue,
  pickLfoPeriod,
  mkAudioBand,
  mkEnergyLfo,
  mkLfo,
  mkSplit,
  moverChoreoSplit,
  moverSplit,
  pickMoverPattern,
  pulseSplit,
  resolveMoverColumnCount,
  RAND,
  splitModsForCount,
  wigWagFlashMod,
  zoneSplit,
  centeredLook,
  type MoverChoreoStyle,
} from './sceneBuilders'

const ADJECTIVES = [
  'Neon',
  'Velvet',
  'Pulse',
  'Crystal',
  'Solar',
  'Lunar',
  'Electric',
  'Amber',
  'Cobalt',
  'Crimson',
  'Emerald',
  'Violet',
  'Radiant',
  'Shadow',
  'Prism',
  'Cosmic',
  'Deep',
  'Soft',
  'Sharp',
  'Liquid',
] as const

const NOUNS = [
  'Wash',
  'Grid',
  'Surge',
  'Bloom',
  'Drift',
  'Echo',
  'Wave',
  'Pulse',
  'Shimmer',
  'Gate',
  'Sweep',
  'Stack',
  'Field',
  'Mirror',
  'Orbit',
  'Flash',
  'Breath',
  'Journey',
  'Response',
  'Halves',
] as const

const EPICNESS_LADDER = [
  0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.25, 0.29, 0.33, 0.37, 0.41, 0.45,
  0.48, 0.52, 0.55, 0.58, 0.61, 0.64, 0.67, 0.7, 0.73, 0.76, 0.78, 0.79, 0.82,
  0.85, 0.88, 0.92, 0.96, 1,
] as const

type MoverShowcaseKind =
  | { kind: 'smooth'; mode: 'sweep' | 'tandem' | 'mirror' | 'peak' }
  | { kind: 'choreo'; style: MoverChoreoStyle }

const MOVER_SHOWCASES: Array<{ epicness: number } & MoverShowcaseKind> = [
  { epicness: 0.38, kind: 'smooth', mode: 'sweep' },
  { epicness: 0.58, kind: 'smooth', mode: 'tandem' },
  { epicness: 0.64, kind: 'choreo', style: 'tiltSweep' },
  { epicness: 0.71, kind: 'choreo', style: 'panCascade' },
  { epicness: 0.74, kind: 'smooth', mode: 'mirror' },
  { epicness: 0.9, kind: 'smooth', mode: 'peak' },
]

export const DEFAULT_SAVE_LIGHT_SEED = 'captivate-default-save-v1'

interface SceneBuildContext {
  rng: SeededRng
  profile: RigProfile
  epicness: number
  index: number
}

function uniqueSceneName(used: Set<string>, rng: SeededRng) {
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const name = `${rng.pick(ADJECTIVES)} ${rng.pick(NOUNS)}`
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  const fallback = `Generated Scene ${used.size + 1}`
  used.add(fallback)
  return fallback
}

function fullStageSplit(ctx: SceneBuildContext, hue: number) {
  return pulseSplit(jitterHue(ctx.rng, hue), {
    brightness: 0.32 + ctx.epicness * 0.12,
    width: 0.75 + ctx.rng.float(-0.08, 0.12),
    saturation: 0.55 + ctx.rng.float(0, 0.35),
  })
}

function dualZoneSplits(ctx: SceneBuildContext, hue: number) {
  if (ctx.profile.usableGroups.length >= 2) {
    const zones = buildGroupZones(ctx.profile, 2)
    return zones.map((zone, index) =>
      zoneSplit(
        zone,
        jitterHue(ctx.rng, hue + index * 0.08),
        { brightness: 0.3 + ctx.epicness * 0.08, width: 0.42 },
        zone.groupName
      )
    )
  }
  const [left, right] = buildLeftRightZones(ctx.profile)
  return [
    zoneSplit(left, jitterHue(ctx.rng, hue), {
      brightness: 0.3 + ctx.epicness * 0.08,
      width: left.width,
      height: left.height,
    }),
    zoneSplit(
      right,
      jitterHue(ctx.rng, hue + 0.12),
      { brightness: 0.3 + ctx.epicness * 0.08, width: right.width, height: right.height },
      undefined
    ),
  ]
}

function buildWigWagScene(ctx: SceneBuildContext): Omit<LightScene_t, 'autoEnabled'> {
  const cols = ctx.profile.fixtureCount >= 12 ? 4 : ctx.profile.fixtureCount >= 6 ? 3 : 2
  const rows = 2
  const zones = buildSpatialZonesFromRig(ctx.profile, cols, rows)
  const splitCount = zones.length
  const period = pickLfoPeriod(ctx.rng, 4)
  const peakWidth = ctx.rng.float(0.08, 0.14)

  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      wigWagFlashMod(splitCount, 0.82 + ctx.rng.float(0, 0.12), {
        period,
        parity: 0,
        sinePeakWidth: peakWidth,
      }),
      wigWagFlashMod(splitCount, 0.82 + ctx.rng.float(0, 0.12), {
        period,
        parity: 1,
        phaseShift: 0.5,
        sinePeakWidth: peakWidth,
      }),
      mkLfo(
        LfoShape.Sin,
        pickLfoPeriod(ctx.rng, 16),
        splitModsForCount(splitCount, (index) => ({
          hue: (index % cols) * (0.05 + ctx.rng.float(0, 0.04)),
          saturation: index % 2 === 0 ? 0.12 : 0.08,
        })),
        { phaseShift: ctx.rng.float(0, 0.35) }
      ),
      directorLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 32), [
        [0, 'sinePeakWidth', 0.06],
      ], { sinePeakWidth: peakWidth }),
    ],
    splitScenes: zones.map((zone, index) =>
      zoneSplit(
        zone,
        jitterHue(ctx.rng, 0.45 + (index % cols) * 0.08),
        {},
        zone.groupName
      )
    ),
  }
}

type SceneRecipe = (ctx: SceneBuildContext) => Omit<LightScene_t, 'autoEnabled'>

function recipeCalmWash(ctx: SceneBuildContext) {
  const hue = jitterHue(ctx.rng, 0.55)
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      mkLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 16), [{ brightness: 0.22 }]),
      mkLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 16), [{ hue: 0.18 }], {
        phaseShift: ctx.rng.float(0, 0.25),
      }),
      directorLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 32), [[1, 'phaseShift', 1]]),
    ],
    splitScenes: [fullStageSplit(ctx, hue)],
  }
}

function recipeAmbientGlow(ctx: SceneBuildContext) {
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      mkLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 8), [{ brightness: 0.35 }]),
      mkLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 8), [{ saturation: 0.2 }], {
        phaseShift: ctx.rng.float(0, 0.35),
      }),
    ],
    splitScenes: [fullStageSplit(ctx, jitterHue(ctx.rng, 0.1))],
  }
}

function recipeBeatPulse(ctx: SceneBuildContext) {
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      beatSquare([{ brightness: 0.75 + ctx.epicness * 0.12, width: 0.45 }], 1, {
        squareDuty: ctx.rng.float(0.14, 0.24),
      }),
      directorLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 8), [[0, 'squareDuty', 0.2]]),
    ],
    splitScenes: [fullStageSplit(ctx, jitterHue(ctx.rng, 0.5))],
  }
}

function recipeOffbeatPulse(ctx: SceneBuildContext) {
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      beatSquare([{ brightness: 0.7, width: 0.4 }], 1, {
        phaseShift: 0.5,
        squareDuty: ctx.rng.float(0.16, 0.26),
      }),
      mkLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 8), [{ saturation: 0.25 }]),
    ],
    splitScenes: [fullStageSplit(ctx, jitterHue(ctx.rng, 0.62))],
  }
}

function recipeAudioBand(ctx: SceneBuildContext, band: 'kick' | 'snare' | 'hat' | 'vocal' | 'mid' | 'bass') {
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      mkAudioBand([{ brightness: 0.45 + ctx.epicness * 0.25 }], band, {
        audioMax: 0.38 + ctx.epicness * 0.18,
      }),
      mkLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 12), [{ hue: 0.15 }], {
        phaseShift: ctx.rng.float(0, 0.5),
      }),
    ],
    splitScenes: [fullStageSplit(ctx, jitterHue(ctx.rng, 0.35))],
  }
}

function recipeDualPulse(ctx: SceneBuildContext) {
  const splits = dualZoneSplits(ctx, jitterHue(ctx.rng, 0.05))
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      beatSquare(
        splits.map(() => ({ brightness: 0.75, width: 0.4 })),
        1,
        { squareDuty: ctx.rng.float(0.16, 0.24) }
      ),
      mkAudioBand(
        splits.map(() => ({ saturation: 0.5 })),
        ctx.rng.pick(['mid', 'snare', 'vocal'] as const)
      ),
      directorLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 16), [[0, 'phaseShift', 1]]),
    ],
    splitScenes: splits.map((split, index) => ({
      ...split,
      splitModShaping:
        index === 1 ? { phaseOffsetBeats: ctx.rng.float(0.35, 0.65) } : split.splitModShaping,
      randomizer: index === 1 ? RAND.light : split.randomizer,
    })),
  }
}

function recipeCallResponse(ctx: SceneBuildContext) {
  const splits = dualZoneSplits(ctx, jitterHue(ctx.rng, 0.05))
  const splitMods = splits.map((_, index) =>
    index === 0 ? { brightness: 0.8 } : {}
  )
  const splitModsB = splits.map((_, index) =>
    index === 1 ? { brightness: 0.8 } : {}
  )
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      beatSquare(splitMods, 1),
      beatSquare(splitModsB, 1, { phaseShift: 0.5 }),
      mkLfo(LfoShape.Square, pickLfoPeriod(ctx.rng, 4), splits.map(() => ({ hue: 0.5 })), {
        squareDuty: ctx.rng.float(0.32, 0.48),
      }),
      mkLfo(LfoShape.Noise, pickLfoPeriod(ctx.rng, 8), splits.map(() => ({ saturation: 0.2 })), {
        noiseSmoothing: ctx.rng.float(0.3, 0.48),
        noiseSeed: ctx.rng.next(),
      }),
    ],
    splitScenes: splits.map((split, index) => ({
      ...split,
      splitModShaping:
        index === 1 ? { phaseOffsetBeats: ctx.rng.float(0.75, 1.25) } : split.splitModShaping,
    })),
  }
}

function recipeEnergySwell(ctx: SceneBuildContext) {
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      mkEnergyLfo(
        [{ brightness: 0.35 + ctx.epicness * 0.2, saturation: 0.45 }],
        ctx.epicness > 0.7 ? 'hot' : 'med'
      ),
      mkLfo(LfoShape.Ramp, pickLfoPeriod(ctx.rng, 8), [{ hue: 0.35 }], {
        rampCurve: ctx.rng.float(0.35, 0.55),
      }),
    ],
    splitScenes: [fullStageSplit(ctx, jitterHue(ctx.rng, 0.2))],
  }
}

function recipeNoiseJourney(ctx: SceneBuildContext) {
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      mkLfo(
        LfoShape.Noise,
        pickLfoPeriod(ctx.rng, 6),
        [{ hue: 0.65, saturation: 0.35 }],
        {
          noiseSmoothing: ctx.rng.float(0.42, 0.58),
          noiseSeed: ctx.rng.next(),
        }
      ),
      beatSquare([{ brightness: 0.55 }], 1),
      mkLfo(LfoShape.Ramp, pickLfoPeriod(ctx.rng, 4), [{ hue: 0.4 }]),
      directorLfo(
        LfoShape.Ramp,
        pickLfoPeriod(ctx.rng, 12),
        [
          [0, 'noiseSeed', 1],
          [1, 'squareDuty', 0.85],
          [2, 'phaseShift', 1],
        ],
        { rampCurve: ctx.rng.float(0.4, 0.55) }
      ),
    ],
    splitScenes: [
      pulseSplit(jitterHue(ctx.rng, 0.55), { brightness: 0.34, width: 0.58 }, {
        splitModShaping: { modulationStairSteps: ctx.rng.int(4) + 3 },
      }),
    ],
  }
}

function recipeSpectrumZones(ctx: SceneBuildContext) {
  const zoneCount = Math.min(
    4,
    Math.max(2, ctx.profile.usableGroups.length || (ctx.profile.fixtureCount >= 8 ? 4 : 2))
  )
  const zones = buildSpatialZonesFromRig(ctx.profile, zoneCount, 1)
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      mkAudioBand(
        splitModsForCount(zoneCount, (index) => ({
          brightness: 0.35 + (index % 2) * 0.12,
        })),
        ctx.rng.pick(['mid', 'snare', 'vocal'] as const)
      ),
      mkLfo(
        LfoShape.Sin,
        pickLfoPeriod(ctx.rng, 8),
        splitModsForCount(zoneCount, (index) => ({ hue: index * 0.14 })),
        { phaseShift: ctx.rng.float(0, 0.4) }
      ),
    ],
    splitScenes: zones.map((zone, index) =>
      zoneSplit(
        zone,
        jitterHue(ctx.rng, index * 0.12),
        { brightness: 0.28 + ctx.epicness * 0.08 },
        zone.groupName
      )
    ),
  }
}

function recipePeakDrive(ctx: SceneBuildContext) {
  const strobe = ctx.profile.hasStrobe ? { strobe: ctx.rng.float(0.28, 0.52) } : {}
  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      directorLfo(
        LfoShape.Square,
        pickLfoPeriod(ctx.rng, 16),
        [
          [1, 'period', 0.02],
          [2, 'flip', 1],
          [3, 'audioMax', 0.05],
          [4, 'squareDuty', 1],
          [5, 'phaseShift', 1],
        ],
        { squareDuty: ctx.rng.float(0.38, 0.5) }
      ),
      beatSquare([{ brightness: 1, width: 0.7, saturation: 0.5 }], 1, {
        squareDuty: ctx.rng.float(0.1, 0.18),
      }),
      mkAudioBand([{ brightness: 0.6 }], 'kick', { audioAttack: 0.9 }),
      mkEnergyLfo([{ brightness: 0.65, saturation: 0.8 }], 'hot', { audioMax: 0.85 }),
      mkLfo(LfoShape.Noise, pickLfoPeriod(ctx.rng, 4), [{ hue: 0.25 }], {
        noiseSmoothing: ctx.rng.float(0.22, 0.34),
        noiseSeed: ctx.rng.next(),
      }),
    ],
    splitScenes: [
      mkSplit(
        centeredLook(jitterHue(ctx.rng, 0.12), {
          brightness: 0.2,
          width: 0.38,
          saturation: 1,
          ...strobe,
        }),
        RAND.spark,
        {},
        {
          modManualAnchors: { brightness: 'bottom', width: 'bottom' },
          splitModShaping: { modulationStairSteps: ctx.rng.int(6) + 6 },
        }
      ),
    ],
  }
}

function recipeMoverShowcase(ctx: SceneBuildContext, mode: 'sweep' | 'tandem' | 'mirror' | 'peak') {
  const pattern = pickMoverPattern(ctx.rng)
  const hue = jitterHue(ctx.rng, 0.52)
  const moverPatch =
    mode === 'tandem'
      ? { moverMode: 1, moverSpread: 0.42, moverFloorLock: 1 }
      : mode === 'mirror'
        ? { moverMode: 2, moverMirrorX: 1, moverMirrorY: 1, moverFloorLock: 1 }
        : mode === 'peak'
          ? {
              moverMode: 1,
              moverSpread: 0.55,
              moverFloorLock: 1,
              brightness: 0.32,
              saturation: 0.85,
            }
          : { moverFloorLock: 1, hue: 0.62, saturation: 0.55 }

  const mods = [
    ...buildMoverPatternMods(pattern, ctx.epicness, 2, ctx.rng.next()),
    mkLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 16), [{ brightness: 0.2 }], {
      phaseShift: ctx.rng.float(0, 0.25),
    }),
  ]
  if (mode === 'tandem') {
    mods.push(
      mkAudioBand([{ brightness: 0.25 }], 'snare', { audioMax: 0.36 })
    )
  }
  if (mode === 'mirror') {
    mods.push(
      beatSquare([{ brightness: 0.28 }, { brightness: 0.22 }], 1, {
        squareDuty: ctx.rng.float(0.12, 0.2),
      })
    )
  }
  if (mode === 'peak') {
    mods.push(
      mkEnergyLfo([{ brightness: 0.35 }, { brightness: 0.28 }], 'hot')
    )
  }

  return {
    name: '',
    epicness: ctx.epicness,
    modulators: mods,
    splitScenes: [
      pulseSplit(hue, { brightness: 0.34, width: 0.75 }),
      moverSplit(ctx.epicness, moverPatch),
    ],
  }
}

function recipeMoverChoreoShowcase(ctx: SceneBuildContext, style: MoverChoreoStyle) {
  const hue = jitterHue(ctx.rng, 0.5)
  if (style === 'tiltSweep') {
    return {
      name: '',
      epicness: ctx.epicness,
      modulators: [
        ...buildMoverBeatTiltSweepMods(ctx.epicness, 2, ctx.rng.next()),
        mkAudioBand([{ brightness: 0.18 }, {}], 'kick', { audioMax: 0.34 }),
      ],
      splitScenes: [
        pulseSplit(hue, { brightness: 0.3, width: 0.72 }),
        moverChoreoSplit(ctx.epicness, { hue }),
      ],
    }
  }

  const columnCount = resolveMoverColumnCount(ctx.profile)
  const columns =
    ctx.profile.fixtureCount > 0
      ? buildSpatialZonesFromRig(ctx.profile, columnCount, 1).map((zone) => ({
          x: zone.x,
          y: zone.y,
          width: zone.width,
          height: 0.85,
        }))
      : defaultRowColumnZones(columnCount)
  const columnStartIndex = 1
  const totalSplits = 1 + columnCount

  return {
    name: '',
    epicness: ctx.epicness,
    modulators: [
      ...buildMoverPanCascadeMods(
        totalSplits,
        columnStartIndex,
        columnCount,
        ctx.rng.next()
      ),
      mkLfo(LfoShape.Sin, pickLfoPeriod(ctx.rng, 8), [{ hue: 0.22 }], {
        phaseShift: ctx.rng.float(0, 0.25),
      }),
    ],
    splitScenes: [
      pulseSplit(hue, {
        brightness: 0.34,
        saturation: 0.75,
        width: 0.68,
      }),
      ...buildMoverRowColumnSplits(ctx.epicness, columns, {
        returnStaggerBeats: 16,
      }),
    ],
  }
}

function pickRecipeForTier(tier: number, rng: SeededRng): SceneRecipe {
  if (tier <= 2) return rng.pick([recipeCalmWash, recipeAmbientGlow])
  if (tier <= 5) {
    return rng.pick([
      recipeCalmWash,
      recipeAmbientGlow,
      recipeOffbeatPulse,
      (ctx) => ({
        ...recipeAmbientGlow(ctx),
        modulators: [
          mkLfo(LfoShape.Noise, pickLfoPeriod(ctx.rng, 8), [{ hue: 0.12 }], {
            noiseSmoothing: ctx.rng.float(0.45, 0.6),
            noiseSeed: ctx.rng.next(),
          }),
          ...recipeAmbientGlow(ctx).modulators,
        ],
      }),
    ])
  }
  if (tier <= 8) return rng.pick([recipeBeatPulse, recipeOffbeatPulse])
  if (tier <= 12) {
    const bands = ['kick', 'snare', 'hat', 'vocal', 'mid'] as const
    return (ctx) => recipeAudioBand(ctx, rng.pick(bands))
  }
  if (tier <= 18) {
    return rng.pick([
      recipeDualPulse,
      recipeSpectrumZones,
      recipeEnergySwell,
      recipeNoiseJourney,
    ])
  }
  if (tier <= 22) {
    return rng.pick([recipeCallResponse, recipeDualPulse, buildWigWagScene])
  }
  if (tier <= 26) {
    return rng.pick([buildWigWagScene, recipeNoiseJourney, recipeSpectrumZones])
  }
  return recipePeakDrive
}

export function buildCoreScenes(
  rng: SeededRng,
  profile: RigProfile
): LightScene_t[] {
  const usedNames = new Set<string>()
  const scenes: LightScene_t[] = []

  EPICNESS_LADDER.forEach((epicness, index) => {
    const ctx: SceneBuildContext = { rng, profile, epicness, index }
    const recipe = pickRecipeForTier(index, rng)
    const built = recipe(ctx)
    const scene: LightScene_t = {
      ...built,
      name: uniqueSceneName(usedNames, rng),
      autoEnabled: true,
    }
    scenes.push(
      attachMoverAwareness(scene, {
        enabled: profile.hasMovers,
        patternSeed: rng.int(1_000_000) + index,
      })
    )
  })

  return scenes
}

export function buildMoverScenes(rng: SeededRng, profile: RigProfile): LightScene_t[] {
  if (!profile.hasMovers) {
    return []
  }
  const usedNames = new Set<string>()
  return MOVER_SHOWCASES.map((showcase, index) => {
    const ctx: SceneBuildContext = {
      rng,
      profile,
      epicness: showcase.epicness,
      index: EPICNESS_LADDER.length + index,
    }
    const built =
      showcase.kind === 'choreo'
        ? recipeMoverChoreoShowcase(ctx, showcase.style)
        : recipeMoverShowcase(ctx, showcase.mode)
    return {
      ...built,
      name: uniqueSceneName(usedNames, rng),
      autoEnabled: true,
    }
  })
}

export function buildLightScenesList(rng: SeededRng, profile: RigProfile): LightScene_t[] {
  return [...buildCoreScenes(rng, profile), ...buildMoverScenes(rng, profile)].sort(
    (a, b) => a.epicness - b.epicness
  )
}
