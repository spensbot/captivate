/**
 * Generates src/renderer/redux/defaultSave.json with curated light + visual examples.
 * Light scenes emphasize beat/rhythm pulses, audio band + energy LFOs, nested LFO
 * directors (8/16 bar), and energy-matched epicness â€” not left-right sweeps.
 * Run: npm run generate:default-save
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '../src/renderer/redux/defaultSave.json')

const LfoShape = {
  Sin: 0,
  Ramp: 1,
  Square: 2,
  Saw: 3,
  Noise: 4,
  AudioBand: 5,
  AudioEnergy: 6,
}

const defaultRandomizer = {
  triggerPeriod: 1,
  triggerDensity: 0.3,
  envelopeRatio: 0.1,
  envelopeDuration: 1,
}

const defaultProjectionMapping = {
  enabled: false,
  showAlignmentGrid: true,
  showKeystoneGrid: true,
  showSelectedOutputGrid: false,
  activeOutputId: 'pm-out-default',
  outputs: [
    {
      id: 'pm-out-default',
      name: 'Output 1',
      enabled: true,
      sourceRect: { x: 0, y: 0, width: 1, height: 1 },
      corners: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    },
  ],
}

function mkIm(targetIndex, prop, amount) {
  return { [`intermod:lfo:${targetIndex}:${prop}`]: amount }
}

function mkLfo(shape, period, splitModulations, extra = {}) {
  const {
    lfoInterModulation,
    phaseShift,
    flip,
    rampCurve,
    squareDuty,
    sawFlatten,
    audioBandLowHz,
    audioBandHighHz,
    audioThreshold,
    audioMax,
    audioAttack,
    audioDecay,
    audioEnergySmoothing,
    audioBandSmoothing,
  } = extra
  const mod = {
    lfo: {
      shape,
      skew: 0.5,
      symmetricSkew: 0.5,
      phaseShift: phaseShift ?? 0,
      flip: flip ?? 0,
      period,
      sinePeakWidth: 0.5,
      rampCurve: rampCurve ?? 0.5,
      squareDuty: squareDuty ?? 0.5,
      sawFlatten: sawFlatten ?? 0,
      noiseSeed: 0.5,
      noiseSmoothing: 0,
      audioBandLowHz: audioBandLowHz ?? 120,
      audioBandHighHz: audioBandHighHz ?? 2000,
      audioThreshold: audioThreshold ?? 0.02,
      audioMax: audioMax ?? 0.55,
      audioAttack: audioAttack ?? 0.35,
      audioDecay: audioDecay ?? 0.55,
      audioEnergySmoothing: audioEnergySmoothing ?? 0.65,
      audioBandSmoothing: audioBandSmoothing ?? 0,
    },
    splitModulations,
  }
  if (lfoInterModulation && Object.keys(lfoInterModulation).length > 0) {
    mod.lfoInterModulation = lfoInterModulation
  }
  return mod
}

function mkSplit(baseParams, randomizer = defaultRandomizer, groups = {}, options = {}) {
  const split = { baseParams, randomizer, groups }
  if (options.modManualAnchors) {
    split.modManualAnchors = options.modManualAnchors
  }
  if (options.splitModShaping) {
    split.splitModShaping = options.splitModShaping
  }
  return split
}

/** Centered look â€” pulse width/brightness instead of sweeping X across stage. */
function centeredLook(hue, patch = {}) {
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

function mkScene(id, name, epicness, modulators, splitScenes) {
  return { id, name, epicness, modulators, splitScenes }
}

function mergeIm(...parts) {
  return Object.assign({}, ...parts)
}

function pulseSplit(hue, patch = {}, options = {}) {
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

/** Long-cycle LFO that only drives other LFOs â€” adds section variety within a scene. */
function directorLfo(shape, period, routes, extra = {}) {
  const lfoInterModulation = {}
  for (const [target, prop, amount] of routes) {
    Object.assign(lfoInterModulation, mkIm(target, prop, amount))
  }
  return mkLfo(shape, period, [{}], { lfoInterModulation, ...extra })
}

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
  bass: {
    audioBandLowHz: 28,
    audioBandHighHz: 140,
    audioThreshold: 0.02,
    audioMax: 0.45,
    audioAttack: 0.88,
    audioDecay: 0.22,
    audioBandSmoothing: 0.05,
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
}

const ENERGY = {
  soft: { audioThreshold: 0.06, audioMax: 0.6, audioEnergySmoothing: 0.58 },
  med: { audioThreshold: 0.05, audioMax: 0.72, audioEnergySmoothing: 0.42 },
  hot: { audioThreshold: 0.04, audioMax: 0.82, audioEnergySmoothing: 0.32 },
}

const RAND = {
  light: { triggerPeriod: 1.5, triggerDensity: 0.22, envelopeRatio: 0.12, envelopeDuration: 0.85 },
  spark: { triggerPeriod: 0.75, triggerDensity: 0.38, envelopeRatio: 0.07, envelopeDuration: 0.55 },
  rare: { triggerPeriod: 2.25, triggerDensity: 0.14, envelopeRatio: 0.14, envelopeDuration: 1.1 },
}

function mkAudioBand(splitMods, bandKey, patch = {}) {
  return mkLfo(LfoShape.AudioBand, 1, splitMods, { ...BAND[bandKey], ...patch })
}

function mkEnergyLfo(splitMods, level = 'med', patch = {}) {
  return mkLfo(LfoShape.AudioEnergy, 1, splitMods, { ...ENERGY[level], ...patch })
}

function beatSquare(splitMods, period = 1, extra = {}) {
  return mkLfo(LfoShape.Square, period, splitMods, {
    squareDuty: 0.2,
    ...extra,
  })
}

const MOVER_GROUPS = { Movers: true }

function moverBase(epicness, patch = {}) {
  const calm = epicness < 0.35
  const mid = epicness >= 0.35 && epicness < 0.7
  return {
    xAxis: 0.5,
    yAxis: calm ? 0.72 : mid ? 0.58 : 0.45,
    brightness: calm ? 0.38 : mid ? 0.5 : 0.62,
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

function moverSplit(epicness, patch = {}) {
  return mkSplit(moverBase(epicness, patch), defaultRandomizer, MOVER_GROUPS)
}

function padSplitMods(existingSplitCount, moverMod) {
  return [...Array(existingSplitCount).fill({}), moverMod]
}

function sceneHasMoverSplit(scene) {
  return scene.splitScenes.some((split) => split.groups?.Movers === true)
}

function moverMotionModulators(scene) {
  const e = scene.epicness
  const splitCount = scene.splitScenes.length
  const mods = [
    mkLfo(
      LfoShape.Sin,
      e < 0.25 ? 24 : e < 0.55 ? 12 : 6,
      padSplitMods(splitCount, {
        xAxis: e < 0.25 ? 0.18 : 0.32,
        yAxis: e < 0.25 ? 0.12 : 0.22,
      }),
      { phaseShift: (e * 0.37) % 1 }
    ),
  ]

  if (e >= 0.4) {
    mods.push(
      beatSquare(
        padSplitMods(splitCount, { xAxis: 0.28, brightness: 0.22 }),
        1,
        { squareDuty: e > 0.75 ? 0.14 : 0.22 }
      )
    )
  }

  if (e >= 0.65) {
    mods.push(
      mkAudioBand(
        padSplitMods(splitCount, { yAxis: 0.35, brightness: 0.2 }),
        'kick',
        { audioMax: 0.42 }
      )
    )
  }

  return mods
}

function attachMoverAwareness(scene) {
  if (sceneHasMoverSplit(scene)) {
    return scene
  }

  const splitCount = scene.splitScenes.length
  const moverSplitScene = moverSplit(scene.epicness)

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
      ...moverMotionModulators(scene),
    ],
    splitScenes: [...scene.splitScenes, moverSplitScene],
  }
}

/**
 * Light scenes ordered low â†’ high epicness (â‰ˆ perceived energy for auto audio match).
 * Epicness steps are ~0.03â€“0.04 apart; each scene uses at least one long-cycle /
 * noise / random / polyrhythm / director trick so loops do not feel identical.
 */
const lightSceneDefs = [
  // â”€â”€ Ultra calm (0.02â€“0.10) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mkScene(
    'ex_moonlight',
    'Moonlight',
    0.03,
    [
      mkLfo(LfoShape.Sin, 16, [{ brightness: 0.22 }]),
      mkLfo(LfoShape.Sin, 24, [{ hue: 0.18 }], { phaseShift: 0.12 }),
      directorLfo(LfoShape.Sin, 32, [[1, 'phaseShift', 1]]),
    ],
    [pulseSplit(0.58, { saturation: 0.55, brightness: 0.32, width: 1 })]
  ),
  mkScene(
    'ex_ambient_glow',
    'Ambient Glow',
    0.06,
    [
      mkLfo(LfoShape.Sin, 8, [{ brightness: 0.35 }]),
      mkLfo(LfoShape.Sin, 11, [{ saturation: 0.2 }], { phaseShift: 0.2 }),
    ],
    [pulseSplit(0.1, { saturation: 0.75, brightness: 0.38, width: 1 })]
  ),
  mkScene(
    'ex_candle_breathe',
    'Candle Breathe',
    0.09,
    [
      mkLfo(LfoShape.Sin, 12, [{ brightness: 0.4 }]),
      mkLfo(LfoShape.Noise, 7, [{ hue: 0.12 }], { noiseSmoothing: 0.55, noiseSeed: 0.31 }),
    ],
    [pulseSplit(0.07, { saturation: 0.7, brightness: 0.36, width: 0.95 })]
  ),
  mkScene(
    'ex_cool_mist',
    'Cool Mist',
    0.12,
    [
      mkLfo(LfoShape.Sin, 8, [{ saturation: 0.35 }]),
      mkLfo(LfoShape.Ramp, 16, [{ hue: 0.25 }], { rampCurve: 0.4 }),
    ],
    [pulseSplit(0.62, { saturation: 0.5, brightness: 0.4, width: 1 })]
  ),
  // â”€â”€ Gentle motion (0.14â€“0.22) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mkScene(
    'ex_soft_tap',
    'Soft Offbeat Tap',
    0.15,
    [
      beatSquare([{ brightness: 0.42 }], 2, { squareDuty: 0.28, phaseShift: 0.5 }),
      directorLfo(LfoShape.Ramp, 12, [[0, 'squareDuty', 0.85]], { rampCurve: 0.35 }),
    ],
    [pulseSplit(0.48, { brightness: 0.34, width: 0.7 })]
  ),
  mkScene(
    'ex_dusk_wash',
    'Dusk Wash',
    0.18,
    [
      mkLfo(LfoShape.Ramp, 12, [{ hue: 0.45 }], { rampCurve: 0.45 }),
      mkLfo(LfoShape.Sin, 6, [{ brightness: 0.3 }]),
      mkLfo(LfoShape.Noise, 9, [{ saturation: 0.15 }], { noiseSmoothing: 0.42 }),
    ],
    [pulseSplit(0.78, { saturation: 0.65, brightness: 0.42, width: 1 })]
  ),
  mkScene(
    'ex_breakdown_shimmer',
    'Breakdown Shimmer',
    0.21,
    [
      mkLfo(LfoShape.Noise, 5, [{ hue: 0.35, saturation: 0.25 }], {
        noiseSmoothing: 0.62,
        noiseSeed: 0.62,
      }),
      mkLfo(LfoShape.Sin, 16, [{ brightness: 0.18 }]),
      mkAudioBand([{ brightness: 0.35 }], 'hat', { audioMax: 0.38 }),
    ],
    [
      pulseSplit(0.68, { saturation: 0.4, brightness: 0.48, width: 0.85 }, {
        splitModShaping: { modulationStairSteps: 3 },
      }),
    ]
  ),
  // â”€â”€ Beat pulse (0.24â€“0.34) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mkScene(
    'ex_beat_pulse',
    'Beat Pulse',
    0.25,
    [
      beatSquare([{ brightness: 0.85, width: 0.45 }], 1),
      directorLfo(LfoShape.Sin, 8, [[0, 'squareDuty', 0.2]]),
    ],
    [pulseSplit(0.52, { brightness: 0.28, width: 0.55 })]
  ),
  mkScene(
    'ex_offbeat_pulse',
    'Offbeat Pulse',
    0.29,
    [
      beatSquare([{ brightness: 0.75, width: 0.4 }], 1, { phaseShift: 0.5 }),
      beatSquare([{ saturation: 0.35 }], 2, { squareDuty: 0.35, phaseShift: 0.25 }),
    ],
    [pulseSplit(0.38, { brightness: 0.3, width: 0.58 })]
  ),
  mkScene(
    'ex_half_time_gate',
    'Half-Time Gate',
    0.33,
    [
      beatSquare([{ brightness: 0.8, width: 0.5 }], 2, { squareDuty: 0.22 }),
      mkAudioBand([{ brightness: 0.55 }], 'kick'),
      directorLfo(LfoShape.Square, 8, [[0, 'period', 0.1], [1, 'audioMax', 0.88]]),
    ],
    [pulseSplit(0.15, { brightness: 0.26, width: 0.52 })]
  ),
  // â”€â”€ Audio band (0.36â€“0.46) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mkScene(
    'ex_kick_band',
    'Kick Band Pulse',
    0.37,
    [
      mkAudioBand([{ brightness: 0.9, width: 0.55, saturation: 0.25 }], 'kick'),
      mkLfo(LfoShape.Sin, 7, [{ hue: 0.2 }], { phaseShift: 0.15 }),
    ],
    [pulseSplit(0.08, { brightness: 0.3, width: 0.5 })]
  ),
  mkScene(
    'ex_snare_pop',
    'Snare Pop',
    0.41,
    [
      mkAudioBand([{ brightness: 0.75, saturation: 0.45 }], 'snare'),
      beatSquare([{ hue: 0.3 }], 2, { squareDuty: 0.3 }),
    ],
    [
      pulseSplit(0.44, { brightness: 0.35, width: 0.62 }, {
        splitModShaping: { modulationStairSteps: 4 },
      }),
    ]
  ),
  mkScene(
    'ex_hat_sparkle',
    'Hi-Hat Sparkle',
    0.45,
    [
      mkAudioBand([{ saturation: 0.85, brightness: 0.45 }], 'hat'),
      beatSquare([{ hue: 0.35 }], 2, { squareDuty: 0.35 }),
      mkLfo(LfoShape.Noise, 6, [{ hue: 0.1 }], { noiseSmoothing: 0.48 }),
    ],
    [pulseSplit(0.62, { saturation: 0.45, brightness: 0.52 })]
  ),
  mkScene(
    'ex_vocal_glow',
    'Vocal Glow',
    0.48,
    [
      mkAudioBand([{ saturation: 0.7, brightness: 0.4 }], 'vocal'),
      mkLfo(LfoShape.Sin, 6, [{ hue: 0.35 }]),
      directorLfo(LfoShape.Ramp, 16, [[0, 'audioThreshold', 0.2]], { rampCurve: 0.5 }),
    ],
    [pulseSplit(0.32, { saturation: 0.55, brightness: 0.4 })]
  ),
  // â”€â”€ Energy + rhythm (0.50â€“0.60) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mkScene(
    'ex_energy_swell',
    'Energy Swell',
    0.52,
    [
      mkEnergyLfo([{ brightness: 0.75, saturation: 0.55 }], 'med'),
      mkLfo(LfoShape.Sin, 4, [{ hue: 0.4 }]),
      directorLfo(LfoShape.Sin, 12, [[0, 'audioMax', 0.88]]),
    ],
    [pulseSplit(0.48, { brightness: 0.34 }, { modManualAnchors: { brightness: 'bottom' } })]
  ),
  mkScene(
    'ex_build_ramp',
    'Build Ramp',
    0.55,
    [
      mkLfo(LfoShape.Ramp, 8, [{ brightness: 0.65, width: 0.45 }], { rampCurve: 0.55 }),
      beatSquare([{ saturation: 0.35 }], 1, { squareDuty: 0.18 }),
      directorLfo(LfoShape.Square, 16, [[0, 'rampCurve', 1], [1, 'phaseShift', 1]]),
    ],
    [pulseSplit(0.25, { brightness: 0.28, width: 0.48 })]
  ),
  mkScene(
    'ex_rhythm_colors',
    'Rhythm Color Shift',
    0.58,
    [
      beatSquare([{ hue: 1 }], 2, { squareDuty: 0.5 }),
      beatSquare([{ brightness: 0.65, saturation: 0.4 }], 1, {
        squareDuty: 0.18,
        phaseShift: 0.25,
      }),
      mkLfo(LfoShape.Saw, 12, [{ hue: 0.2 }], { sawFlatten: 0.2 }),
    ],
    [
      pulseSplit(0.35, { brightness: 0.36 }, {
        splitModShaping: { modulationStairSteps: 4 },
      }),
    ]
  ),
  mkScene(
    'ex_polyrhythm',
    'Polyrhythm Mix',
    0.61,
    [
      beatSquare([{ brightness: 0.6 }], 3, { squareDuty: 0.22 }),
      mkLfo(LfoShape.Square, 5, [{ hue: 0.55, saturation: 0.3 }], {
        squareDuty: 0.28,
        phaseShift: 0.1,
      }),
      mkLfo(LfoShape.Sin, 7, [{ width: 0.35 }], { phaseShift: 0.33 }),
    ],
    [pulseSplit(0.5, { brightness: 0.32, width: 0.55 })]
  ),
  mkScene(
    'ex_bass_drop',
    'Bass Drop Flash',
    0.64,
    [
      mkAudioBand([{ brightness: 1, width: 0.7 }], 'bass'),
      mkLfo(LfoShape.Saw, 4, [{ hue: 0.55 }], { rampCurve: 0.62 }),
      directorLfo(LfoShape.Noise, 8, [[1, 'phaseShift', 0.9]], { noiseSmoothing: 0.35 }),
    ],
    [pulseSplit(0.92, { brightness: 0.22, width: 0.45 })]
  ),
  // â”€â”€ Section directors (0.66â€“0.76) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mkScene(
    'ex_section_director',
    '8-Bar Section Mix',
    0.67,
    [
      directorLfo(
        LfoShape.Ramp,
        8,
        [
          [1, 'period', 0.12],
          [2, 'phaseShift', 1],
          [3, 'audioMax', 0.88],
        ],
        { rampCurve: 0.55 }
      ),
      beatSquare([{ brightness: 0.8, width: 0.5 }], 1),
      mkLfo(LfoShape.Ramp, 4, [{ hue: 1 }]),
      mkEnergyLfo([{ saturation: 0.7 }], 'med', {
        audioThreshold: 0.06,
        audioMax: 0.68,
        audioEnergySmoothing: 0.5,
      }),
    ],
    [pulseSplit(0.2, { brightness: 0.32, width: 0.6 })]
  ),
  mkScene(
    'ex_noise_journey',
    'Noise Color Drift',
    0.7,
    [
      mkLfo(LfoShape.Noise, 6, [{ hue: 0.65, saturation: 0.35 }], {
        noiseSmoothing: 0.52,
        noiseSeed: 0.44,
      }),
      beatSquare([{ brightness: 0.55 }], 1),
      mkLfo(LfoShape.Ramp, 5, [{ hue: 0.4 }]),
      directorLfo(
        LfoShape.Ramp,
        12,
        [
          [0, 'noiseSeed', 1],
          [1, 'squareDuty', 0.85],
          [2, 'phaseShift', 1],
        ],
        { rampCurve: 0.48 }
      ),
    ],
    [
      pulseSplit(0.55, { brightness: 0.34, width: 0.58 }, {
        splitModShaping: { modulationStairSteps: 5 },
      }),
    ]
  ),
  mkScene(
    'ex_dual_pulse',
    'Dual Pulse Zones',
    0.73,
    [
      beatSquare([{ brightness: 0.75, width: 0.4 }, { brightness: 0.75, width: 0.4 }], 1),
      mkAudioBand([{ saturation: 0.5 }, { saturation: 0.5 }], 'mid'),
      directorLfo(LfoShape.Sin, 16, [[0, 'phaseShift', 1]]),
    ],
    [
      pulseSplit(0.02, { saturation: 1, brightness: 0.36, width: 0.42, x: 0.35 }),
      pulseSplit(0.58, { saturation: 1, brightness: 0.36, width: 0.42, x: 0.65 }, {
        splitModShaping: { phaseOffsetBeats: 0.5 },
        randomizer: RAND.light,
      }),
    ]
  ),
  mkScene(
    'ex_call_response',
    'Call & Response',
    0.76,
    [
      beatSquare([{ brightness: 0.8 }, {}], 1),
      beatSquare([{}, { brightness: 0.8 }], 1, { phaseShift: 0.5 }),
      mkLfo(LfoShape.Square, 4, [{ hue: 0.5 }, { hue: 0.5 }], { squareDuty: 0.4 }),
      mkLfo(LfoShape.Noise, 8, [{ saturation: 0.2 }, { saturation: 0.2 }], {
        noiseSmoothing: 0.4,
      }),
    ],
    [
      pulseSplit(0.05, { brightness: 0.3, width: 0.45, x: 0.33 }),
      pulseSplit(0.55, { brightness: 0.3, width: 0.45, x: 0.67 }, {
        splitModShaping: { phaseOffsetBeats: 1 },
      }),
    ]
  ),
  // â”€â”€ Complex / peak (0.78â€“1.0) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mkScene(
    'ex_16bar_journey',
    '16-Bar LFO Journey',
    0.79,
    [
      directorLfo(
        LfoShape.Square,
        16,
        [
          [1, 'period', 0.08],
          [1, 'flip', 1],
          [2, 'phaseShift', 1],
          [3, 'audioThreshold', 0.15],
          [4, 'squareDuty', 0.92],
        ],
        { squareDuty: 0.5 }
      ),
      beatSquare([{ brightness: 0.85, width: 0.55, saturation: 0.35 }], 1, {
        squareDuty: 0.18,
      }),
      mkLfo(LfoShape.Ramp, 4, [{ hue: 1 }], { rampCurve: 0.48 }),
      mkEnergyLfo([{ brightness: 0.45, saturation: 0.55 }], 'hot', {
        audioEnergySmoothing: 0.38,
      }),
      beatSquare([{ hue: 0.5 }], 2, { squareDuty: 0.12, phaseShift: 0.5 }),
    ],
    [
      pulseSplit(0.42, { brightness: 0.28, width: 0.5 }, {
        splitModShaping: { modulationStairSteps: 6 },
      }),
    ]
  ),
  mkScene(
    'ex_triple_stack',
    'Triple Stack',
    0.82,
    [
      directorLfo(
        LfoShape.Ramp,
        16,
        [
          [1, 'audioMax', 0.12],
          [2, 'audioMax', 0.88],
          [3, 'period', 0.08],
          [4, 'phaseShift', 1],
        ],
        { rampCurve: 0.52 }
      ),
      mkAudioBand([{ brightness: 0.85 }, {}, {}], 'kick'),
      mkAudioBand([{}, { hue: 0.8 }, {}], 'mid'),
      mkAudioBand([{}, {}, { saturation: 0.85 }], 'hat'),
      beatSquare([{ brightness: 0.3 }, { brightness: 0.3 }, { brightness: 0.3 }], 1, {
        squareDuty: 0.14,
      }),
    ],
    [
      pulseSplit(0.04, { brightness: 0.28, width: 0.52 }),
      pulseSplit(0.42, { brightness: 0.3, width: 0.5 }),
      pulseSplit(0.76, { brightness: 0.28, width: 0.48 }),
    ]
  ),
  mkScene(
    'ex_spectrum_zones',
    'Spectrum Zones',
    0.85,
    [
      mkAudioBand([{ brightness: 0.9 }, {}, {}], 'kick'),
      mkAudioBand([{}, { hue: 0.85 }, {}], 'mid'),
      mkAudioBand([{}, {}, { saturation: 0.9 }], 'hat'),
      beatSquare([{ brightness: 0.35 }, { brightness: 0.35 }, { brightness: 0.35 }], 1, {
        squareDuty: 0.15,
      }),
      directorLfo(LfoShape.Sin, 24, [[3, 'squareDuty', 0.85]]),
    ],
    [
      pulseSplit(0.05, { brightness: 0.26, width: 0.55 }, {
        modManualAnchors: { brightness: 'bottom' },
      }),
      pulseSplit(0.45, { brightness: 0.3, width: 0.5 }, {
        modManualAnchors: { brightness: 'bottom' },
      }),
      pulseSplit(0.78, { brightness: 0.28, width: 0.48 }, {
        modManualAnchors: { brightness: 'bottom' },
      }),
    ]
  ),
  mkScene(
    'ex_random_spark',
    'Random Spark Hits',
    0.88,
    [
      beatSquare([{ brightness: 0.7 }], 1, { squareDuty: 0.16 }),
      mkEnergyLfo([{ saturation: 0.6, brightness: 0.45 }], 'hot'),
      mkLfo(LfoShape.Noise, 4, [{ hue: 0.7 }], { noiseSmoothing: 0.35 }),
      directorLfo(LfoShape.Square, 8, [[0, 'squareDuty', 1], [2, 'noiseSeed', 1]]),
    ],
    [
      mkSplit(
        centeredLook(0.5, { brightness: 0.38, saturation: 0.95, randomize: 1 }),
        RAND.spark,
        {},
        {
          modManualAnchors: { brightness: 'bottom', width: 'bottom' },
          splitModShaping: { modulationStairSteps: 6 },
        }
      ),
    ]
  ),
  mkScene(
    'ex_strobe_color',
    'Strobe Color Gate',
    0.92,
    [
      beatSquare([{ brightness: 0.85, hue: 0.45 }], 1, { squareDuty: 0.12 }),
      mkEnergyLfo([{ brightness: 0.5, saturation: 0.7 }], 'hot'),
      mkLfo(LfoShape.Saw, 3, [{ hue: 1 }], { sawFlatten: 0.1 }),
      directorLfo(LfoShape.Ramp, 8, [[0, 'period', 0.05], [2, 'phaseShift', 1]]),
    ],
    [
      mkSplit(
        centeredLook(0.5, { brightness: 0.55, saturation: 1, strobe: 0.65 }),
        RAND.rare,
        {},
        {
          modManualAnchors: { brightness: 'bottom' },
          splitModShaping: { modulationStairSteps: 8 },
        }
      ),
    ]
  ),
  mkScene(
    'ex_peak_drive',
    'Peak Drive',
    0.96,
    [
      directorLfo(
        LfoShape.Ramp,
        16,
        [
          [1, 'period', 0.05],
          [2, 'phaseShift', 1],
          [3, 'audioMax', 0.1],
          [4, 'squareDuty', 1],
        ]
      ),
      beatSquare([{ brightness: 0.9, width: 0.65, saturation: 0.4 }], 1, {
        squareDuty: 0.16,
      }),
      mkLfo(LfoShape.Saw, 4, [{ hue: 1 }], { sawFlatten: 0.15 }),
      mkEnergyLfo([{ brightness: 0.55, saturation: 0.65 }], 'hot', {
        audioEnergySmoothing: 0.35,
      }),
      beatSquare([{ hue: 0.4 }], 0.5, { squareDuty: 0.1 }),
    ],
    [
      mkSplit(
        centeredLook(0.55, { brightness: 0.24, width: 0.42, saturation: 1 }),
        RAND.spark,
        {},
        {
          modManualAnchors: { brightness: 'bottom', width: 'bottom' },
          splitModShaping: { modulationStairSteps: 8 },
        }
      ),
    ]
  ),
  mkScene(
    'ex_main_peak',
    'Main Room Peak',
    1,
    [
      directorLfo(
        LfoShape.Square,
        16,
        [
          [1, 'period', 0.02],
          [2, 'flip', 1],
          [3, 'audioMax', 0.05],
          [4, 'squareDuty', 1],
          [5, 'phaseShift', 1],
        ],
        { squareDuty: 0.45 }
      ),
      beatSquare([{ brightness: 1, width: 0.7, saturation: 0.5 }], 1, { squareDuty: 0.14 }),
      mkAudioBand([{ brightness: 0.6 }], 'kick', { audioAttack: 0.9 }),
      mkEnergyLfo([{ brightness: 0.65, saturation: 0.8 }], 'hot', { audioMax: 0.85 }),
      beatSquare([{ hue: 0.55 }], 0.5, { squareDuty: 0.08 }),
      mkLfo(LfoShape.Noise, 3, [{ hue: 0.25 }], { noiseSmoothing: 0.28 }),
    ],
    [
      mkSplit(
        centeredLook(0.12, { brightness: 0.2, width: 0.38, saturation: 1, strobe: 0.45 }),
        RAND.spark,
        {},
        {
          modManualAnchors: { brightness: 'bottom', width: 'bottom' },
          splitModShaping: { modulationStairSteps: 10 },
        }
      ),
    ]
  ),
  // ── Mover showcases (dedicated splits; skipped by attachMoverAwareness) ──
  mkScene(
    'ex_mover_sweep',
    'Mover Sweep',
    0.38,
    [
      mkLfo(LfoShape.Sin, 4, [{}, { xAxis: 0.42, yAxis: 0.18 }], { phaseShift: 0.25 }),
      mkLfo(LfoShape.Sin, 6, [{}, { yAxis: 0.3 }], { phaseShift: 0.5 }),
      beatSquare([{ brightness: 0.35 }, { brightness: 0.25 }], 2, { squareDuty: 0.3 }),
    ],
    [
      pulseSplit(0.52, { brightness: 0.34, width: 0.75 }),
      moverSplit(0.38, { moverFloorLock: 1, hue: 0.62, saturation: 0.55 }),
    ]
  ),
  mkScene(
    'ex_mover_tandem',
    'Mover Tandem',
    0.58,
    [
      mkLfo(LfoShape.Ramp, 8, [{}, { xAxis: 0.38, yAxis: 0.22 }], { rampCurve: 0.48 }),
      beatSquare([{}, { brightness: 0.35, xAxis: 0.2 }], 1, { squareDuty: 0.24 }),
      mkAudioBand([{}, { yAxis: 0.28 }], 'snare', { audioMax: 0.44 }),
    ],
    [
      pulseSplit(0.48, { brightness: 0.36, width: 0.7 }),
      moverSplit(0.58, { moverMode: 1, moverSpread: 0.42, moverFloorLock: 1 }),
    ]
  ),
  mkScene(
    'ex_mover_mirror',
    'Mover Mirror',
    0.74,
    [
      mkLfo(LfoShape.Sin, 6, [{}, { xAxis: 0.35 }], { phaseShift: 0.33 }),
      mkLfo(LfoShape.Square, 3, [{}, { yAxis: 0.32 }], { squareDuty: 0.35 }),
      beatSquare([{ brightness: 0.4 }, { brightness: 0.32 }], 1, { squareDuty: 0.18 }),
    ],
    [
      pulseSplit(0.62, { brightness: 0.38, saturation: 0.8 }),
      moverSplit(0.74, {
        moverMode: 2,
        moverMirrorX: 1,
        moverMirrorY: 1,
        moverFloorLock: 1,
      }),
    ]
  ),
  mkScene(
    'ex_mover_peak',
    'Mover Peak Drive',
    0.9,
    [
      directorLfo(LfoShape.Ramp, 16, [[1, 'period', 0.06], [2, 'phaseShift', 1]]),
      beatSquare([{ brightness: 0.85 }, { brightness: 0.55, xAxis: 0.45 }], 1, {
        squareDuty: 0.14,
      }),
      mkEnergyLfo([{ brightness: 0.5 }, { brightness: 0.35, yAxis: 0.38 }], 'hot'),
      mkAudioBand([{}, { yAxis: 0.42 }], 'kick', { audioMax: 0.5 }),
    ],
    [
      mkSplit(
        centeredLook(0.55, { brightness: 0.28, width: 0.5, saturation: 1 }),
        RAND.spark,
        {},
        { modManualAnchors: { brightness: 'bottom', width: 'bottom' } }
      ),
      moverSplit(0.9, {
        moverMode: 1,
        moverSpread: 0.55,
        moverFloorLock: 1,
        brightness: 0.68,
        saturation: 0.85,
      }),
    ]
  ),
]
function mkLayer(id, generator, index, patch = {}) {
  return {
    id,
    generator,
    customModuleName: 'Custom Generator',
    customModuleCode: '',
    sourceType: 'procedural',
    source: '',
    text: 'Captivate',
    mediaFit: 'fill',
    enabled: true,
    density: 0.55,
    densityLinkSource: 'none',
    speed: 0.5,
    speedLinkSource: 'none',
    scale: 0.55,
    scaleLinkSource: 'none',
    quantity: 0.12,
    quantityLinkSource: 'none',
    variety: 0.25,
    varietyLinkSource: 'none',
    mix: 0.72,
    mixLinkSource: 'none',
    blend: index === 0 ? 'alpha' : 'add',
    hueShift: (index * 0.11) % 1,
    hueShiftLinkSource: 'none',
    depth: 0.5,
    depthLinkSource: 'none',
    positionX: 0,
    positionXLinkSource: 'none',
    positionY: 0,
    positionYLinkSource: 'none',
    rotateX: 0,
    rotateXLinkSource: 'none',
    rotateY: 0,
    rotateYLinkSource: 'none',
    ...patch,
  }
}

/** Mirrors createBuiltinEffect defaults from BuiltinVisualizer.ts */
function mkEffect(id, type, amount) {
  const defaults =
    type === 'bloom'
      ? 0.45
      : type === 'vignette'
        ? 0.25
        : type === 'filmGrain'
          ? 0.2
          : type === 'afterImage'
            ? 0.5
            : type === 'scanlines'
              ? 0.35
              : type === 'strobe'
                ? 0.42
                : type === 'colorSync' ||
                    type === 'positionSync' ||
                    type === 'stageLightMap'
                  ? 1
                  : type === 'bpmSync' || type === 'audioReact'
                    ? 0.7
                    : type === 'ascii' ||
                        type === 'anaglyph' ||
                        type === 'parallaxBarrier'
                      ? 0.45
                      : type === 'rimLight'
                        ? 0
                        : 0.3
  return {
    id,
    type,
    customModuleName: 'Custom Effect',
    customModuleCode: '',
    enabled: true,
    linkSource: 'none',
    lightAzimuth: 0.5,
    lightAzimuthLinkSource: 'none',
    amount: amount ?? defaults,
  }
}

function mkCamera(id, type, durationBeats = 4) {
  return { id, type, enabled: true, durationBeats }
}

function mkBuiltin(preset, layers, effects, cameraEffects = [], shuffleCameraEffects = false) {
  return {
    type: 'Builtin',
    preset,
    shuffleCameraEffects,
    layers,
    effects,
    cameraEffects,
  }
}

function mkVisualConfig(preset, builtin, previewAspectRatio = '16:9') {
  return {
    container: 'builtin',
    previewAspectRatio,
    projectionMapping: defaultProjectionMapping,
    builtin,
  }
}

const visualSceneDefs = [
  {
    id: 'ex_vis_beat_grid',
    name: 'Beat Grid + Bloom',
    epicness: 0.1,
    transition: { type: 'fade', durationMs: 420 },
    config: mkVisualConfig(
      'Beat Grid + Bloom',
      mkBuiltin(
        'Beat Grid + Bloom',
        [mkLayer('vis-bg-grid', 'beatGrid', 0, { density: 0.72, scale: 0.62, mix: 0.85, hueShift: 0.55 })],
        [
          mkEffect('vis-fx-bloom', 'bloom', 0.42),
          mkEffect('vis-fx-grain', 'filmGrain', 0.18),
          mkEffect('vis-fx-vig', 'vignette', 0.22),
        ]
      )
    ),
  },
  {
    id: 'ex_vis_particle_nebula',
    name: 'Particle Nebula',
    epicness: 0.22,
    transition: { type: 'dissolve', durationMs: 520 },
    config: mkVisualConfig(
      'Particle Nebula',
      mkBuiltin(
        'Particle Nebula',
        [
          mkLayer('vis-bg-nebula', 'nebula', 0, { density: 0.58, speed: 0.35, mix: 0.55, blend: 'add', hueShift: 0.72 }),
          mkLayer('vis-bg-particles', 'particles', 1, { density: 0.68, speed: 0.62, variety: 0.45, mix: 0.78, blend: 'add', hueShift: 0.15 }),
        ],
        [mkEffect('vis-fx-after', 'afterImage', 0.55), mkEffect('vis-fx-bloom2', 'bloom', 0.38)]
      )
    ),
  },
  {
    id: 'ex_vis_audio_ring',
    name: 'Audio Ring',
    epicness: 0.34,
    transition: { type: 'fade', durationMs: 380 },
    config: mkVisualConfig(
      'Audio Ring',
      mkBuiltin(
        'Audio Ring',
        [mkLayer('vis-bg-audio-ring', 'audioRing', 0, { density: 0.65, speed: 0.55, scale: 0.58, mix: 0.9, hueShift: 0.48 })],
        [mkEffect('vis-fx-audio', 'audioReact', 0.85), mkEffect('vis-fx-bloom3', 'bloom', 0.35)]
      )
    ),
  },
  {
    id: 'ex_vis_fft_spectrum',
    name: 'FFT Ribbon + Spectrogram',
    epicness: 0.44,
    transition: { type: 'cut', durationMs: 120 },
    config: mkVisualConfig(
      'FFT Ribbon + Spectrogram',
      mkBuiltin(
        'FFT Ribbon + Spectrogram',
        [
          mkLayer('vis-bg-spectro', 'spectrograph', 0, { density: 0.62, scale: 0.52, mix: 0.7, blend: 'add', hueShift: 0.62 }),
          mkLayer('vis-bg-ribbon', 'fftRibbon', 1, { density: 0.55, speed: 0.48, mix: 0.82, blend: 'screen', hueShift: 0.28 }),
        ],
        [mkEffect('vis-fx-hue', 'hueShift', 0.35), mkEffect('vis-fx-grain2', 'filmGrain', 0.12)]
      )
    ),
  },
  {
    id: 'ex_vis_text_particles',
    name: 'Classic Text Particles',
    epicness: 0.52,
    transition: { type: 'fade', durationMs: 460 },
    config: mkVisualConfig(
      'Classic Text Particles',
      mkBuiltin(
        'Classic Text Particles',
        [mkLayer('vis-bg-text', 'legacyTextParticles', 0, { text: 'CAPTIVATE', density: 0.62, speed: 0.45, scale: 0.58, mix: 0.88, hueShift: 0.08 })],
        [mkEffect('vis-fx-after2', 'afterImage', 0.48), mkEffect('vis-fx-bloom4', 'bloom', 0.28)]
      )
    ),
  },
  {
    id: 'ex_vis_space_tunnel',
    name: 'Space Tunnel',
    epicness: 0.58,
    transition: { type: 'dissolve', durationMs: 640 },
    config: mkVisualConfig(
      'Space Tunnel',
      mkBuiltin(
        'Space Tunnel',
        [mkLayer('vis-bg-tunnel', 'legacySpaceTunnel', 0, { density: 0.58, speed: 0.52, scale: 0.65, mix: 0.92, hueShift: 0.78 })],
        [mkEffect('vis-fx-scan', 'scanlines', 0.32), mkEffect('vis-fx-vig2', 'vignette', 0.35)]
      ),
      '4:3'
    ),
  },
  {
    id: 'ex_vis_geodesic',
    name: 'Geodesic Orbs',
    epicness: 0.66,
    transition: { type: 'fade', durationMs: 400 },
    config: mkVisualConfig(
      'Geodesic Orbs',
      mkBuiltin(
        'Geodesic Orbs',
        [
          mkLayer('vis-bg-geo', 'geodesic', 0, { scale: 0.72, mix: 0.75, hueShift: 0.35, blend: 'alpha' }),
          mkLayer('vis-bg-spheres', 'spheres', 1, { density: 0.48, scale: 0.42, mix: 0.55, blend: 'add', hueShift: 0.82 }),
        ],
        [mkEffect('vis-fx-chroma', 'chromaShift', 0.28), mkEffect('vis-fx-bloom5', 'bloom', 0.4)]
      )
    ),
  },
  {
    id: 'ex_vis_strobe_glitch',
    name: 'Strobe + Glitch',
    epicness: 0.74,
    transition: { type: 'flash', durationMs: 180 },
    config: mkVisualConfig(
      'Strobe + Glitch',
      mkBuiltin(
        'Strobe + Glitch',
        [
          mkLayer('vis-bg-cubes', 'cubes', 0, { density: 0.55, scale: 0.48, mix: 0.8, hueShift: 0.92 }),
          mkLayer('vis-bg-grid2', 'beatGrid', 1, { density: 0.45, scale: 0.55, mix: 0.45, blend: 'add', hueShift: 0.12 }),
        ],
        [
          mkEffect('vis-fx-strobe', 'strobe', 0.55),
          mkEffect('vis-fx-glitch', 'glitch', 0.38),
          mkEffect('vis-fx-grain3', 'filmGrain', 0.22),
        ]
      )
    ),
  },
  {
    id: 'ex_vis_light_sync',
    name: 'Light Sync Demo',
    epicness: 0.82,
    transition: { type: 'fade', durationMs: 500 },
    config: mkVisualConfig(
      'Light Sync Demo',
      mkBuiltin(
        'Light Sync Demo',
        [
          mkLayer('vis-bg-sync-grid', 'beatGrid', 0, { density: 0.68, scale: 0.58, mix: 0.88, hueShift: 0.5 }),
          mkLayer('vis-bg-sync-ball', 'spikeBall', 1, { density: 0.42, speed: 0.38, scale: 0.62, mix: 0.65, blend: 'add', hueShift: 0.18 }),
        ],
        [
          mkEffect('vis-fx-color-sync', 'colorSync', 1),
          mkEffect('vis-fx-pos-sync', 'positionSync', 1),
          mkEffect('vis-fx-stage', 'stageLightMap', 0.85),
          mkEffect('vis-fx-bloom6', 'bloom', 0.32),
        ]
      )
    ),
  },
  {
    id: 'ex_vis_camera_orbit',
    name: 'Camera Orbit',
    epicness: 0.88,
    transition: { type: 'dissolve', durationMs: 560 },
    config: mkVisualConfig(
      'Camera Orbit',
      mkBuiltin(
        'Camera Orbit',
        [
          mkLayer('vis-bg-knot', 'torusKnot', 0, { density: 0.38, scale: 0.68, mix: 0.82, hueShift: 0.42 }),
          mkLayer('vis-bg-waves', 'waves', 1, { density: 0.52, speed: 0.42, scale: 0.55, mix: 0.5, blend: 'add', hueShift: 0.68 }),
        ],
        [mkEffect('vis-fx-after3', 'afterImage', 0.42), mkEffect('vis-fx-bloom7', 'bloom', 0.36)],
        [mkCamera('vis-cam-orbit', 'orbit', 8)],
        true
      )
    ),
  },
  {
    id: 'ex_vis_multi_blend',
    name: 'Multi-Layer Blends',
    epicness: 0.93,
    transition: { type: 'fade', durationMs: 440 },
    config: mkVisualConfig(
      'Multi-Layer Blends',
      mkBuiltin(
        'Multi-Layer Blends',
        [
          mkLayer('vis-bg-stars', 'stars', 0, { density: 0.62, speed: 0.35, mix: 0.7, blend: 'add', hueShift: 0.08 }),
          mkLayer('vis-bg-tri', 'triangles', 1, { density: 0.48, scale: 0.52, mix: 0.62, blend: 'screen', hueShift: 0.55 }),
          mkLayer('vis-bg-cubes2', 'cubes', 2, { density: 0.42, scale: 0.45, mix: 0.55, blend: 'multiply', hueShift: 0.88 }),
        ],
        [mkEffect('vis-fx-mirror', 'mirror', 0.25), mkEffect('vis-fx-poster', 'posterize', 0.22)]
      )
    ),
  },
  {
    id: 'ex_vis_energy_stack',
    name: 'Energy Stack',
    epicness: 1,
    transition: { type: 'flash', durationMs: 220 },
    config: mkVisualConfig(
      'Energy Stack',
      mkBuiltin(
        'Energy Stack',
        [
          mkLayer('vis-bg-voxel', 'voxelPulse', 0, { density: 0.7, scale: 0.58, mix: 0.85, hueShift: 0.22 }),
          mkLayer('vis-bg-tunnel2', 'audioTunnel', 1, { density: 0.55, speed: 0.58, mix: 0.72, blend: 'add', hueShift: 0.62 }),
          mkLayer('vis-bg-spike', 'spikeBall', 2, { density: 0.4, speed: 0.45, scale: 0.55, mix: 0.6, blend: 'add', hueShift: 0.95 }),
        ],
        [
          mkEffect('vis-fx-bpm', 'bpmSync', 0.8),
          mkEffect('vis-fx-audio2', 'audioReact', 0.75),
          mkEffect('vis-fx-after4', 'afterImage', 0.52),
        ]
      )
    ),
  },
]

const moverAwareLightSceneDefs = lightSceneDefs.map(attachMoverAwareness)

const lightIds = moverAwareLightSceneDefs.map((s) => s.id)
const lightById = Object.fromEntries(
  moverAwareLightSceneDefs.map((s) => [
    s.id,
    { name: s.name, epicness: s.epicness, autoEnabled: true, modulators: s.modulators, splitScenes: s.splitScenes },
  ])
)

const visualIds = visualSceneDefs.map((s) => s.id)
const visualById = Object.fromEntries(
  visualSceneDefs.map((s) => [
    s.id,
    {
      name: s.name,
      epicness: s.epicness,
      autoEnabled: true,
      config: s.config,
      transition: s.transition,
    },
  ])
)

const autoDefaults = {
  enabled: false,
  epicness: 0.5,
  period: 8,
  energyMatchEnabled: true,
  matchAudioEnergy: true,
}

const save = {
  light: { ids: lightIds, byId: lightById, active: lightIds[0], auto: autoDefaults },
  visual: { ids: visualIds, byId: visualById, active: visualIds[0], auto: autoDefaults },
}

fs.writeFileSync(outPath, JSON.stringify(save))
const epicnessSpread = lightSceneDefs.map((s) => s.epicness.toFixed(2)).join(', ')
console.log(
  `Wrote ${lightSceneDefs.length} light + ${visualSceneDefs.length} visual example scenes to ${outPath}`
)
console.log(`Light epicness spread: ${epicnessSpread}`)
