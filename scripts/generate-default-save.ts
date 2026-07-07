// @ts-nocheck
/**
 * Generates src/renderer/redux/defaultSave.json.
 * Light scenes come from src/shared/sceneGeneration (same module as Extras → Generate Scenes).
 * Visual scenes are curated examples defined below.
 * Run: npm run generate:default-save
 */
import fs from 'fs'
import path from 'path'
import { generateDefaultLightScenes } from '../src/shared/sceneGeneration/generateDefaultLightScenes'

const outPath = path.join(__dirname, '../src/renderer/redux/defaultSave.json')

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

const lightScenes = generateDefaultLightScenes()

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

const save = {
  light: lightScenes,
  visual: {
    ids: visualIds,
    byId: visualById,
    active: visualIds[0],
    auto: lightScenes.auto,
  },
}

fs.writeFileSync(outPath, JSON.stringify(save))
const epicnessSpread = lightScenes.ids
  .map((id) => lightScenes.byId[id]?.epicness ?? 0)
  .map((v) => v.toFixed(2))
  .join(', ')
console.log(
  `Wrote ${lightScenes.ids.length} light + ${visualSceneDefs.length} visual example scenes to ${outPath}`
)
console.log(`Light epicness spread: ${epicnessSpread}`)
