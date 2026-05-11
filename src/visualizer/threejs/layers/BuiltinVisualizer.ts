import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import LayerBase from './LayerBase'
import UpdateResource from '../UpdateResource'
import { loadImage, loadVideo, releaseVideo, visVideoReady } from '../util/loaders'
import { fallbackFont, fonts } from '../fonts/fonts'
import {
  initProjectMBridgeSession,
  pushProjectMBridgeAudio,
  renderProjectMBridgeFrame,
  sendDiagnosticsEvent,
  shutdownProjectMBridgeSession,
} from '../../ipcHandler'
import {
  initVisualizerRelayRequest,
  VisualizerRelayRequest,
  VisualizerRelayStartResult,
} from '../../../shared/visualizerStreaming'

export type BuiltinGeneratorType =
  | 'spheres'
  | 'cubes'
  | 'triangles'
  | 'beatGrid'
  | 'waves'
  | 'stars'
  | 'particles'
  | 'nebula'
  | 'spikeBall'
  | 'geodesic'
  | 'spectrograph'
  | 'audioRing'
  | 'audioTunnel'
  | 'oscilloscope3D'
  | 'torusKnot'
  | 'fftRibbon'
  | 'voxelPulse'
  | 'importedModel'
  | 'legacyTextParticles'
  | 'legacyTextSpin'
  | 'legacySpaceTunnel'
  | 'customModule'

export type BuiltinEffectType =
  | 'bloom'
  | 'blur'
  | 'filmGrain'
  | 'glitch'
  | 'afterImage'
  | 'scanlines'
  | 'strobe'
  | 'vignette'
  | 'chromaShift'
  | 'invert'
  | 'posterize'
  | 'hueShift'
  | 'mirror'
  | 'bpmSync'
  | 'colorSync'
  | 'positionSync'
  | 'audioReact'
  | 'anaglyph'
  | 'parallaxBarrier'
  | 'ascii'
  | 'rimLight'
  | 'stageLightMap'
  | 'customModule'

export type BuiltinEffectLinkSource =
  | 'none'
  | 'visSlider1'
  | 'visSlider2'
  | 'visSlider3'
  | 'visSlider4'
  | 'visSlider5'
  | 'visSlider6'
  | 'visSlider7'
  | 'visSlider8'

export type BuiltinCameraEffectType =
  | 'zoom'
  | 'orbit'
  | 'pan'
  | 'tilt'
  | 'flyAround'
  | 'shake'

export type BuiltinBlendMode =
  | 'alpha'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'dodge'
  | 'dissolve'

export type BuiltinLayerSourceType =
  | 'procedural'
  | 'imageFile'
  | 'videoFile'
  | 'rtspStream'
  | 'ndiStream'
  | 'projectM'

export interface BuiltinLayerItem {
  id: string
  generator: BuiltinGeneratorType
  customModuleName: string
  customModuleCode: string
  sourceType: BuiltinLayerSourceType
  source: string
  text: string
  mediaFit: 'cover' | 'contain'
  enabled: boolean
  density: number
  densityLinkSource: BuiltinEffectLinkSource
  speed: number
  speedLinkSource: BuiltinEffectLinkSource
  scale: number
  scaleLinkSource: BuiltinEffectLinkSource
  quantity: number
  quantityLinkSource: BuiltinEffectLinkSource
  variety: number
  varietyLinkSource: BuiltinEffectLinkSource
  mix: number
  mixLinkSource: BuiltinEffectLinkSource
  blend: BuiltinBlendMode
  hueShift: number
  hueShiftLinkSource: BuiltinEffectLinkSource
  depth: number
  depthLinkSource: BuiltinEffectLinkSource
  positionX: number
  positionXLinkSource: BuiltinEffectLinkSource
  positionY: number
  positionYLinkSource: BuiltinEffectLinkSource
  rotateX: number
  rotateXLinkSource: BuiltinEffectLinkSource
  rotateY: number
  rotateYLinkSource: BuiltinEffectLinkSource
}

export interface BuiltinEffectItem {
  id: string
  type: BuiltinEffectType
  customModuleName: string
  customModuleCode: string
  enabled: boolean
  amount: number
  linkSource: BuiltinEffectLinkSource
  /** 0–1, arc behind camera (0.5 = straight behind). Used when `type === 'rimLight'`. */
  lightAzimuth: number
  lightAzimuthLinkSource: BuiltinEffectLinkSource
}

export interface BuiltinCameraEffectItem {
  id: string
  type: BuiltinCameraEffectType
  enabled: boolean
  durationBeats: number
}

export interface BuiltinVisualizerConfig {
  type: 'Builtin'
  preset: string
  shuffleCameraEffects: boolean
  layers: BuiltinLayerItem[]
  effects: BuiltinEffectItem[]
  cameraEffects: BuiltinCameraEffectItem[]
}

export const builtinGeneratorTypeList: BuiltinGeneratorType[] = [
  'spheres',
  'cubes',
  'triangles',
  'beatGrid',
  'waves',
  'stars',
  'particles',
  'nebula',
  'spikeBall',
  'geodesic',
  'spectrograph',
  'audioRing',
  'audioTunnel',
  'oscilloscope3D',
  'torusKnot',
  'fftRibbon',
  'voxelPulse',
  'importedModel',
  'legacyTextParticles',
  'legacyTextSpin',
  'legacySpaceTunnel',
  'customModule',
]

/** Which procedural layer sliders actually affect that generator (creation + runtime). */
export const proceduralLayerControlSupport: Record<
  BuiltinGeneratorType,
  { density: boolean; speed: boolean; scale: boolean }
> = {
  spheres: { density: true, speed: false, scale: true },
  cubes: { density: true, speed: false, scale: true },
  triangles: { density: true, speed: false, scale: true },
  beatGrid: { density: true, speed: false, scale: true },
  waves: { density: true, speed: true, scale: true },
  stars: { density: true, speed: true, scale: true },
  particles: { density: true, speed: true, scale: true },
  nebula: { density: true, speed: true, scale: true },
  spikeBall: { density: true, speed: true, scale: true },
  geodesic: { density: false, speed: false, scale: true },
  spectrograph: { density: true, speed: false, scale: true },
  audioRing: { density: true, speed: true, scale: true },
  audioTunnel: { density: true, speed: true, scale: true },
  oscilloscope3D: { density: true, speed: true, scale: true },
  torusKnot: { density: true, speed: false, scale: true },
  fftRibbon: { density: true, speed: true, scale: true },
  voxelPulse: { density: true, speed: false, scale: true },
  importedModel: { density: false, speed: false, scale: true },
  legacyTextParticles: { density: true, speed: true, scale: true },
  legacyTextSpin: { density: true, speed: true, scale: true },
  legacySpaceTunnel: { density: true, speed: true, scale: true },
  customModule: { density: true, speed: true, scale: true },
}

export const builtinGeneratorDisplayName: Record<BuiltinGeneratorType, string> = {
  spheres: 'Spheres',
  cubes: 'Cubes',
  triangles: 'Triangles',
  beatGrid: 'Beat Grid',
  waves: 'Waves',
  stars: 'Stars',
  particles: 'Particles',
  nebula: 'Nebula',
  spikeBall: 'Spike Ball',
  geodesic: 'Geodesic Sphere',
  spectrograph: 'Spectrograph',
  audioRing: 'Audio Ring',
  audioTunnel: 'Audio Tunnel',
  oscilloscope3D: 'Oscilloscope 3D',
  torusKnot: 'Torus Knot',
  fftRibbon: 'FFT Ribbon',
  voxelPulse: 'Voxel Pulse Grid',
  importedModel: 'Imported OBJ/STL',
  legacyTextParticles: 'Classic 1.03: Particle Text',
  legacyTextSpin: 'Classic 1.03: Text Spin',
  legacySpaceTunnel: 'Classic 1.03: Space Tunnel',
  customModule: 'Custom Module',
}

export const builtinEffectTypeList: BuiltinEffectType[] = [
  'bloom',
  'blur',
  'filmGrain',
  'glitch',
  'afterImage',
  'scanlines',
  'strobe',
  'vignette',
  'chromaShift',
  'invert',
  'posterize',
  'hueShift',
  'mirror',
  'bpmSync',
  'colorSync',
  'positionSync',
  'audioReact',
  'anaglyph',
  'parallaxBarrier',
  'ascii',
  'rimLight',
  'stageLightMap',
  'customModule',
]

export const builtinEffectDisplayName: Record<BuiltinEffectType, string> = {
  bloom: 'Bloom',
  blur: 'Blur',
  filmGrain: 'Film Grain',
  glitch: 'Glitch',
  afterImage: 'After Image',
  scanlines: 'Scanlines',
  strobe: 'Strobe',
  vignette: 'Vignette',
  chromaShift: 'Chroma Shift',
  invert: 'Invert',
  posterize: 'Posterize',
  hueShift: 'Hue Shift',
  mirror: 'Mirror',
  bpmSync: 'BPM Sync',
  colorSync: 'Color Sync',
  positionSync: 'Position Sync',
  audioReact: 'Audio React',
  anaglyph: 'Anaglyph',
  parallaxBarrier: 'Parallax Barrier',
  ascii: 'ASCII',
  rimLight: 'Rim Light (behind camera)',
  stageLightMap: 'Stage light map (DMX)',
  customModule: 'Custom Module',
}

const builtinResolvedEffectTypeList = builtinEffectTypeList.filter(
  (type): type is BuiltinResolvedEffectType => type !== 'customModule'
)

export const builtinEffectLinkSourceList: BuiltinEffectLinkSource[] = [
  'none',
  'visSlider1',
  'visSlider2',
  'visSlider3',
  'visSlider4',
  'visSlider5',
  'visSlider6',
  'visSlider7',
  'visSlider8',
]

export const builtinEffectLinkSourceDisplayName: Record<
  BuiltinEffectLinkSource,
  string
> = {
  none: 'Manual',
  visSlider1: 'Visual Slider 1',
  visSlider2: 'Visual Slider 2',
  visSlider3: 'Visual Slider 3',
  visSlider4: 'Visual Slider 4',
  visSlider5: 'Visual Slider 5',
  visSlider6: 'Visual Slider 6',
  visSlider7: 'Visual Slider 7',
  visSlider8: 'Visual Slider 8',
}

export const builtinCameraEffectTypeList: BuiltinCameraEffectType[] = [
  'zoom',
  'orbit',
  'pan',
  'tilt',
  'flyAround',
  'shake',
]

export const builtinCameraEffectDisplayName: Record<BuiltinCameraEffectType, string> = {
  zoom: 'Zoom',
  orbit: 'Orbit',
  pan: 'Pan',
  tilt: 'Tilt',
  flyAround: 'Fly Around',
  shake: 'Shake',
}

export const builtinBlendModeList: BuiltinBlendMode[] = [
  'alpha',
  'add',
  'multiply',
  'screen',
  'overlay',
  'dodge',
  'dissolve',
]

export const builtinLayerSourceTypeList: BuiltinLayerSourceType[] = [
  'procedural',
  'imageFile',
  'videoFile',
  'rtspStream',
  'ndiStream',
  'projectM',
]

export const builtinLayerSourceDisplayName: Record<BuiltinLayerSourceType, string> = {
  procedural: 'Procedural',
  imageFile: 'Image File',
  videoFile: 'Video File',
  rtspStream: 'RTSP URL',
  ndiStream: 'NDI Source',
  projectM: 'projectM Preset',
}

export const builtinBlendDisplayName: Record<BuiltinBlendMode, string> = {
  alpha: 'Alpha',
  add: 'Add',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  dodge: 'Dodge',
  dissolve: 'Dissolve',
}

export function createBuiltinLayer(
  generator: BuiltinGeneratorType,
  index: number
): BuiltinLayerItem {
  return {
    id: makeId('layer'),
    generator,
    customModuleName: 'Custom Generator',
    customModuleCode: '',
    sourceType: 'procedural',
    source: '',
    text: 'Captivate',
    mediaFit: 'cover',
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
  }
}

export function createBuiltinEffect(type: BuiltinEffectType): BuiltinEffectItem {
  return {
    id: makeId('effect'),
    type,
    customModuleName: 'Custom Effect',
    customModuleCode: '',
    enabled: true,
    linkSource: 'none',
    lightAzimuth: 0.5,
    lightAzimuthLinkSource: 'none',
    amount:
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
        : type === 'colorSync' || type === 'positionSync' || type === 'stageLightMap'
        ? 1
        : type === 'bpmSync' || type === 'audioReact'
        ? 0.7
        : type === 'ascii' || type === 'anaglyph' || type === 'parallaxBarrier'
        ? 0.45
        : type === 'rimLight'
        ? 0
        : 0.3,
  }
}

export function createBuiltinCameraEffect(
  type: BuiltinCameraEffectType
): BuiltinCameraEffectItem {
  return {
    id: makeId('camera'),
    type,
    enabled: true,
    durationBeats: 4,
  }
}

export function initBuiltinVisualizerConfig(): BuiltinVisualizerConfig {
  return {
    type: 'Builtin',
    preset: 'Pulse Grid',
    shuffleCameraEffects: true,
    layers: [
      createBuiltinLayer('beatGrid', 0),
      createBuiltinLayer('spikeBall', 1),
      createBuiltinLayer('legacyTextParticles', 2),
    ],
    effects: [
      createBuiltinEffect('bloom'),
      createBuiltinEffect('filmGrain'),
      createBuiltinEffect('vignette'),
    ],
    cameraEffects: [],
  }
}

/** Normalize saved or partial JSON into a full builtin visualizer config. */
export function normBuiltinVisCfg(
  source: unknown
): BuiltinVisualizerConfig {
  const defaults = initBuiltinVisualizerConfig()
  const input = (source ?? {}) as Partial<BuiltinVisualizerConfig>

  const layers = Array.isArray(input.layers)
    ? input.layers.map((layer, index) => normalizeLayerItem(layer, index))
    : defaults.layers

  const effects = Array.isArray(input.effects)
    ? input.effects.map((effect, index) => normalizeEffectItem(effect, index))
    : defaults.effects
  const cameraEffects = Array.isArray(input.cameraEffects)
    ? input.cameraEffects.map((effect, index) =>
        normalizeCameraEffectItem(effect, index)
      )
    : defaults.cameraEffects

  return {
    type: 'Builtin',
    preset:
      typeof input.preset === 'string' && input.preset.trim().length > 0
        ? input.preset.trim()
        : defaults.preset,
    shuffleCameraEffects:
      input.shuffleCameraEffects !== false,
    layers,
    effects,
    cameraEffects,
  }
}

interface RuntimeLayer {
  layer: BuiltinLayerItem
  generator: BuiltinGeneratorType
  group: THREE.Group
  nodes: RuntimeNode[]
  materials: THREE.Material[]
  baseHue: number
  media: RuntimeMediaBinding | null
  customGenerator: CompiledCustomGeneratorModule | null
  scratch: Record<string, unknown>
}

interface RuntimeNode {
  object: THREE.Object3D
  basePosition: THREE.Vector3
  baseRotation: THREE.Euler
  amplitude: number
}

interface RuntimeMediaBinding {
  texture: THREE.Texture | null
  video: HTMLVideoElement | null
  image: HTMLImageElement | null
  imageBitmap: ImageBitmap | null
  relayId: string | null
  projectM: RuntimeProjectMMediaBinding | null
  plane: THREE.Mesh
}

interface RuntimeProjectMMediaBinding {
  sessionId: string
  presetPath: string
  presetPathKey: string
  sessionReady: boolean
  sessionInitPromise: Promise<void> | null
  renderInFlight: boolean
  /** Wall time when `renderInFlight` was set true; 0 if idle. */
  renderInFlightStartedMs: number
  audioPushInFlight: boolean
  lastAudioPushMs: number
  lastRenderDispatchMs: number
  lastBridgeFrameTimeMs: number
  targetWidth: number
  targetHeight: number
  hasRenderedFrame: boolean
  consecutiveRenderMisses: number
  lastSuccessfulFrameMs: number
}

/** If the main-process bridge stalls, release `renderInFlight` so frames can resume. */
const PROJECTM_LAYER_RENDER_IPC_TIMEOUT_MS = 7000
/** Failsafe when a render promise never settles (should not happen if timeout works). */
const PROJECTM_LAYER_RENDER_STALE_IN_FLIGHT_MS = 12000

function withProjectMRenderTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const t = globalThis.setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('projectM render IPC timeout'))
      }
    }, ms)
    promise.then(
      (value) => {
        if (!settled) {
          settled = true
          globalThis.clearTimeout(t)
          resolve(value)
        }
      },
      (err: unknown) => {
        if (!settled) {
          settled = true
          globalThis.clearTimeout(t)
          reject(err)
        }
      }
    )
  })
}

const PROJECTM_LAYER_TARGET_FPS = 30
const PROJECTM_LAYER_RENDER_FPS = 24
const PROJECTM_LAYER_MIN_WIDTH = 256
const PROJECTM_LAYER_MAX_WIDTH = 960
const PROJECTM_LAYER_MIN_HEIGHT = 144
const PROJECTM_LAYER_MAX_HEIGHT = 540
const PROJECTM_LAYER_RESET_MISS_COUNT = 180
const PROJECTM_LAYER_RESET_MIN_STABLE_MS = 15000
const PROJECTM_LAYER_RESET_STALE_FAILSAFE_MS = 45000

type BuiltinResolvedEffectType = Exclude<BuiltinEffectType, 'customModule'>

interface CustomGeneratorBuildContext {
  THREE: typeof THREE
  layer: BuiltinLayerItem
  group: THREE.Group
  scratch: Record<string, unknown>
  addObject: (object: THREE.Object3D, amplitude?: number) => void
}

interface CustomGeneratorFrameContext {
  THREE: typeof THREE
  layer: BuiltinLayerItem
  group: THREE.Group
  scratch: Record<string, unknown>
  nodes: RuntimeNode[]
  materials: THREE.Material[]
  dtSec: number
  clockSec: number
  beats: number
  beatPulse: number
  speed: number
  audio: UpdateResource['audio']
  params: UpdateResource['params']
}

interface CompiledCustomGeneratorModule {
  name: string
  build?: (context: CustomGeneratorBuildContext) => void
  update?: (context: CustomGeneratorFrameContext) => void
  supportsReactiveInput: boolean
}

interface CustomEffectFrameContext {
  THREE: typeof THREE
  scene: THREE.Scene
  root: THREE.Group
  camera: THREE.PerspectiveCamera
  amount: number
  dtSec: number
  clockSec: number
  beats: number
  beatPulse: number
  audio: UpdateResource['audio']
  params: UpdateResource['params']
  getEffectAmount: (type: BuiltinResolvedEffectType) => number
  setEffectAmount: (type: BuiltinResolvedEffectType, amount: number) => void
}

interface CompiledCustomEffectModule {
  id: string
  name: string
  errored?: boolean
  apply?: (context: CustomEffectFrameContext) => unknown
}

export default class BuiltinVisualizer extends LayerBase {
  private config: BuiltinVisualizerConfig
  private root: THREE.Group
  private layers: RuntimeLayer[] = []
  private customEffects: CompiledCustomEffectModule[] = []
  private overlay: THREE.Points | null = null
  private overlayMaterial: THREE.PointsMaterial | null = null
  private scanlineOverlay: THREE.Mesh | null = null
  private scanlineOverlayMaterial: THREE.ShaderMaterial | null = null
  private emptyStateLabel: THREE.Sprite | null = null
  private emptyStateTexture: THREE.CanvasTexture | null = null
  private cameraEffectIndex = 0
  private cameraEffectAnchorBeat = 0
  private clockSec = 0
  private disposed = false
  private readonly tmpPositionTarget = new THREE.Vector3()
  private readonly tmpProjectMForward = new THREE.Vector3()
  private readonly tmpProjectMTarget = new THREE.Vector3()
  private readonly tmpScanlineForward = new THREE.Vector3()
  private readonly tmpScanlineTarget = new THREE.Vector3()
  private readonly tmpEmptyStateForward = new THREE.Vector3()
  private readonly tmpEmptyStateTarget = new THREE.Vector3()
  private readonly tmpColorFxA = new THREE.Color()
  private readonly tmpColorFxB = new THREE.Color()
  private readonly tmpRimFwd = new THREE.Vector3()
  private readonly tmpRimRight = new THREE.Vector3()
  private readonly tmpRimBack = new THREE.Vector3()
  private readonly ambientLight: THREE.AmbientLight
  private readonly rimPointLight: THREE.PointLight
  private readonly rng = createSeededRandom(90210)

  constructor(config: BuiltinVisualizerConfig) {
    super()
    this.config = normBuiltinVisCfg(config)
    this.scene.background = new THREE.Color('#0c1224')
    this.root = new THREE.Group()
    this.scene.add(this.root)
    this.buildLayers()
    this.customEffects = this.compileCustomEffects(this.config.effects)
    this.buildOverlay()
    this.buildScanlineOverlay()
    this.buildEmptyStateLabel()

    // Omnidirectional fill; directional accents come from the optional Rim Light effect.
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    this.scene.add(this.ambientLight)

    this.rimPointLight = new THREE.PointLight(0xfff4ec, 0, 48, 1.8)
    this.rimPointLight.castShadow = false
    this.scene.add(this.rimPointLight)
  }

  applyConfig(nextConfig: unknown): boolean {
    const input = (nextConfig as { builtin?: unknown } | null | undefined)?.builtin
    if (input === undefined) {
      return false
    }
    const normalized = normBuiltinVisCfg(input)
    if (this.requiresLayerRebuild(normalized.layers)) {
      this.rebuildLayers(normalized.layers, true)
    }

    this.config = normalized
    this.customEffects = this.compileCustomEffects(normalized.effects)
    for (let i = 0; i < this.layers.length; i++) {
      const runtime = this.layers[i]
      const nextLayer = normalized.layers[i]
      if (!runtime || !nextLayer) continue
      runtime.layer = nextLayer
    }
    return true
  }

  /**
   * False until each enabled layer that loads async media can present a real frame
   * (projectM bridge, video files, streams, MJPEG relay, images). Scene cross-fades wait on this.
   */
  isFrameReady(): boolean {
    if (this.disposed) {
      return true
    }
    const showEmptyState =
      this.config.layers.length === 0 &&
      this.config.effects.length === 0 &&
      this.config.cameraEffects.length === 0
    if (showEmptyState) {
      return true
    }
    for (const runtimeLayer of this.layers) {
      if (!runtimeLayer.layer.enabled) {
        continue
      }
      if (!layerMediaReady(runtimeLayer)) {
        return false
      }
    }
    return true
  }

  blocksTransitionReadinessTimeout(): boolean {
    if (this.disposed) {
      return false
    }
    const showEmptyState =
      this.config.layers.length === 0 &&
      this.config.effects.length === 0 &&
      this.config.cameraEffects.length === 0
    if (showEmptyState) {
      return false
    }
    for (const runtimeLayer of this.layers) {
      if (!runtimeLayer.layer.enabled) {
        continue
      }
      if (runtimeLayer.layer.sourceType !== 'projectM') {
        continue
      }
      if (!layerMediaReady(runtimeLayer)) {
        return true
      }
    }
    return false
  }

  update(res: UpdateResource): void {
    this.clockSec += Math.max(0, res.dt) / 1000
    const showEmptyState =
      this.config.layers.length === 0 &&
      this.config.effects.length === 0 &&
      this.config.cameraEffects.length === 0

    const dtSec = Math.max(0, res.dt) / 1000
    const beatPulse = clamp01(res.audio.beatPulse, 0)
    const energy = clamp01(res.audio.energyLevel, 0)
    const inputLevel = clamp01(res.audio.inputLevel, 0)
    const effectValues = this.resolveEffectAmounts(res, dtSec, beatPulse)
    const bpmSync = effectValues.bpmSync
    const colorSync = effectValues.colorSync
    const positionSync = effectValues.positionSync
    const audioReact = effectValues.audioReact
    if (this.emptyStateLabel !== null) {
      this.emptyStateLabel.visible = showEmptyState
    }

    if (showEmptyState) {
      this.root.position.set(0, 0, 0)
      this.root.scale.set(1, 1, 1)
      if (this.overlayMaterial !== null) {
        this.overlayMaterial.opacity = 0
      }
      if (this.scanlineOverlayMaterial !== null && this.scanlineOverlay !== null) {
        this.scanlineOverlayMaterial.uniforms.uAmount.value = 0
        this.scanlineOverlay.visible = false
      }
      this.camera.position.set(0, 0, 4.6)
      this.camera.fov = 62
      this.camera.updateProjectionMatrix()
      this.camera.lookAt(0, 0, 0)
      this.anchorEmptyStateLabelToCamera()
      const background = this.scene.background
      if (background instanceof THREE.Color) {
        background.setRGB(0, 0, 0)
      } else {
        this.scene.background = new THREE.Color('#000000')
      }
      return
    }
    const syncHue = clamp01(res.params.hue, 0.5)
    const syncSat = clamp01(res.params.saturation, 0.75)
    const syncLight = clamp01(res.params.brightness, 0.65)

    const cameraEffect = this.getActiveCameraEffect(res)
    const cameraEffectPhase = this.getCameraEffectPhase(
      res.time.beats,
      cameraEffect?.durationBeats ?? 1
    )

    const widthNorm = clamp01(res.params.width, 1)
    const heightNorm = clamp01(res.params.height, 1)
    const syncedWidthScale = mix(1, 0.45 + widthNorm * 1.8, positionSync)
    const syncedHeightScale = mix(1, 0.45 + heightNorm * 1.8, positionSync)

    if (positionSync > 0.001) {
      const xNorm = getPrimaryPositionAxis(res.params, 'x')
      const yNorm = getPrimaryPositionAxis(res.params, 'y')
      const zNorm = getPrimaryPositionAxis(res.params, 'z')
      const x = (xNorm - 0.5) * 1.6 * positionSync
      const y = (yNorm - 0.5) * 1.2 * positionSync
      const z = (zNorm - 0.5) * 1.1 * positionSync
      this.root.position.set(x, y, z)
    } else {
      this.root.position.set(0, 0, 0)
    }

    const tempoFactor = 1

    const bloom = effectValues.bloom
    const vignette = effectValues.vignette
    const scanlines = effectValues.scanlines
    const strobe = effectValues.strobe
    const chroma = effectValues.chromaShift
    // Invert is applied as a full-frame compositor pass in VisualizerManager.
    const invert = 0
    const posterize = effectValues.posterize
    const hueFx = effectValues.hueShift
    const mirror = effectValues.mirror
    const filmGrain = effectValues.filmGrain

    // Mirror amount should be continuous instead of switching at 50%.
    this.root.scale.x = mix(1, -1, mirror) * syncedWidthScale
    this.root.scale.y = syncedHeightScale
    this.root.scale.z = syncedWidthScale

    if (this.overlayMaterial !== null) {
      this.overlayMaterial.opacity = filmGrain * 0.38
    }
    if (this.scanlineOverlayMaterial !== null && this.scanlineOverlay !== null) {
      this.scanlineOverlayMaterial.uniforms.uAmount.value = scanlines
      this.scanlineOverlayMaterial.uniforms.uTime.value = this.clockSec
      this.scanlineOverlay.visible = scanlines > 0.001
    }

    const strobeGate = mix(1, clamp01(beatPulse * 1.3 + energy * 0.7, 0.08), strobe)

    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex++) {
      const runtimeLayer = this.layers[layerIndex]
      const manualLayer = runtimeLayer.layer
      const layer = {
        ...manualLayer,
        density: resolveLayerUnitLink(
          manualLayer.density,
          manualLayer.densityLinkSource,
          res.params
        ),
        speed: resolveLayerUnitLink(
          manualLayer.speed,
          manualLayer.speedLinkSource,
          res.params
        ),
        scale: resolveLayerUnitLink(
          manualLayer.scale,
          manualLayer.scaleLinkSource,
          res.params
        ),
        quantity: resolveLayerUnitLink(
          manualLayer.quantity,
          manualLayer.quantityLinkSource,
          res.params
        ),
        variety: resolveLayerUnitLink(
          manualLayer.variety,
          manualLayer.varietyLinkSource,
          res.params
        ),
        mix: resolveLayerUnitLink(
          manualLayer.mix,
          manualLayer.mixLinkSource,
          res.params
        ),
        hueShift: resolveLayerUnitLink(
          manualLayer.hueShift,
          manualLayer.hueShiftLinkSource,
          res.params
        ),
      }
      runtimeLayer.layer = layer
      runtimeLayer.group.visible = layer.enabled
      if (!layer.enabled) {
        runtimeLayer.layer = manualLayer
        continue
      }
      const visBackdrop = isVisBackdropSrc(layer.sourceType)

      if (runtimeLayer.generator === 'importedModel') {
        void this.ensureImportedModelLoaded(runtimeLayer)
      }

      if (runtimeLayer.media?.texture instanceof THREE.VideoTexture) {
        runtimeLayer.media.texture.needsUpdate = true
      }
      if (runtimeLayer.media?.image && runtimeLayer.media.texture) {
        runtimeLayer.media.texture.needsUpdate = true
      }
      if (runtimeLayer.media?.projectM) {
        this.updateProjectMMediaBinding(runtimeLayer, res.audio)
      }

      const supportsReactiveInput = generatorSupportsReactiveInput(runtimeLayer)
      const layerBpmSync = supportsReactiveInput ? bpmSync : 0
      const layerAudioReact = supportsReactiveInput ? audioReact : 0
      const layerEnergy = (energy * 0.8 + inputLevel * 0.2) * layerAudioReact
      const reactivePulse = clamp01(beatPulse * layerBpmSync + layerEnergy, 0)
      const speed = layer.speed * 2.4 * tempoFactor
      const layerOpacity = clamp01(layer.mix, 0.7)
      const layerPositionX = resolveLayerAxisLink(
        layer.positionX,
        layer.positionXLinkSource,
        res.params
      )
      const layerPositionY = resolveLayerAxisLink(
        layer.positionY,
        layer.positionYLinkSource,
        res.params
      )
      const layerDepth = resolveLayerDepthLink(
        layer.depth,
        layer.depthLinkSource,
        res.params
      )
      const layerRotateXNorm = resolveLayerAxisLink(
        layer.rotateX,
        layer.rotateXLinkSource,
        res.params
      )
      const layerRotateYNorm = resolveLayerAxisLink(
        layer.rotateY,
        layer.rotateYLinkSource,
        res.params
      )

      const baseHue =
        (layer.hueShift + hueFx * 0.5 + chroma * layerIndex * 0.04 + 1) % 1
      const hue = mix(baseHue, syncHue, colorSync)
      const sat = mix(0.75, syncSat, colorSync)
      const light = mix(0.72, syncLight, colorSync)
      const color = new THREE.Color().setHSL(hue, sat, light)
      const emissive = new THREE.Color().setHSL(hue, sat, Math.max(0, light * 0.78))

      if (visBackdrop) {
        runtimeLayer.group.position.set(0, 0, 0)
        runtimeLayer.group.rotation.set(0, 0, 0)
        runtimeLayer.group.scale.set(1, 1, 1)
      } else {
        runtimeLayer.group.position.x = layerPositionX * 2.8
        runtimeLayer.group.position.y = layerPositionY * 1.8
        runtimeLayer.group.position.z = -layerIndex * 0.12 + (layerDepth - 0.5) * 4
        runtimeLayer.group.rotation.x = layerRotateXNorm * Math.PI
        runtimeLayer.group.rotation.y = layerRotateYNorm * Math.PI
        runtimeLayer.group.rotation.z = 0
      }

      if (runtimeLayer.generator === 'nebula') {
        const hueOffsets = runtimeLayer.scratch.nebulaHueOffsets as
          | Float32Array
          | undefined
        const scales = runtimeLayer.scratch.nebulaScales as Float32Array | undefined
        for (let i = 0; i < runtimeLayer.nodes.length; i++) {
          const node = runtimeLayer.nodes[i]
          if (!(node.object instanceof THREE.Sprite)) {
            continue
          }
          const material = node.object.material as THREE.SpriteMaterial
          const hueOffset = hueOffsets?.[i] ?? 0.5
          const hueSpread = 0.08 + layer.variety * 0.28
          const localHue = ((hue + (hueOffset - 0.5) * hueSpread) % 1 + 1) % 1
          material.color.setHSL(
            localHue,
            Math.min(1, sat * 0.88 + 0.1),
            Math.min(1, light * 0.82 + 0.18)
          )
          material.opacity = Math.max(0.06, layer.mix * (0.2 + reactivePulse * 0.7))
          const baseScale = scales?.[i] ?? (1.8 + layer.scale * 2.6)
          const pulseScale = 1 + reactivePulse * 0.22
          node.object.scale.set(baseScale * pulseScale, baseScale * pulseScale, 1)
        }
      }

      if (runtimeLayer.generator === 'particles') {
        const pointsNode = runtimeLayer.nodes.find(
          (node) => node.object instanceof THREE.Points
        )
        const pointsMat = runtimeLayer.materials.find(
          (material) => material instanceof THREE.PointsMaterial
        ) as THREE.PointsMaterial | undefined
        const linksMat = runtimeLayer.materials.find(
          (material) => material instanceof THREE.LineBasicMaterial
        ) as THREE.LineBasicMaterial | undefined
        if (pointsMat) {
          pointsMat.color.setRGB(1, 1, 1)
          pointsMat.size = 0.018 + layer.scale * 0.055 + reactivePulse * 0.02
        }
        if (pointsNode?.object instanceof THREE.Points) {
          const geometry = pointsNode.object.geometry as THREE.BufferGeometry
          const colorAttr = geometry.getAttribute('color') as
            | THREE.BufferAttribute
            | undefined
          const hueOffsets = runtimeLayer.scratch.particleHueOffsets as
            | Float32Array
            | undefined
          if (
            colorAttr !== undefined &&
            hueOffsets !== undefined &&
            hueOffsets.length >= colorAttr.count
          ) {
            const colorBuffer = colorAttr.array as Float32Array
            const tone = new THREE.Color()
            const hueSpread = 0.12 + layer.variety * 0.34
            for (let i = 0; i < colorAttr.count; i++) {
              const localHue =
                ((hue + (hueOffsets[i] - 0.5) * hueSpread) % 1 + 1) % 1
              tone.setHSL(
                localHue,
                Math.min(1, sat * 0.9 + 0.06),
                Math.min(1, light * 0.92 + 0.06)
              )
              const base = i * 3
              colorBuffer[base] = tone.r
              colorBuffer[base + 1] = tone.g
              colorBuffer[base + 2] = tone.b
            }
            colorAttr.needsUpdate = true
          }
        }
        if (linksMat) {
          linksMat.color.setHSL(hue, Math.min(1, sat * 0.8), Math.min(1, light + 0.05))
          linksMat.opacity = layer.mix * (0.2 + reactivePulse * 0.65)
        }
      }

      if (
        layer.sourceType === 'procedural' &&
        runtimeLayer.generator === 'spectrograph'
      ) {
        updateSpectrographPoints(
          runtimeLayer,
          layerAudioReact > 0.001
            ? res.audio
            : { ...res.audio, enabled: false, beatPulse: 0, spectrum: [] },
          dtSec,
          layer.scale
        )
      }

      for (const node of runtimeLayer.nodes) {
        if (visBackdrop) {
          node.object.position.copy(node.basePosition)
          node.object.rotation.copy(node.baseRotation)
          continue
        }
        // Keep layers stationary by default. Motion comes from explicit
        // generator behavior, camera effects, or linked modulation only.
        this.tmpPositionTarget.copy(node.basePosition)
        node.object.rotation.copy(node.baseRotation)
        node.object.position.copy(this.tmpPositionTarget)
      }

      const runtimeAudioInput =
        layerAudioReact > 0.001
          ? res.audio
          : { ...res.audio, enabled: false, beatPulse: 0, spectrum: [] }

      if (layer.sourceType === 'procedural') {
        updateLayerGeneratorBehavior(runtimeLayer, {
          dtSec,
          clockSec: this.clockSec,
          beats: res.time.beats,
          beatPulse: reactivePulse,
          speed,
          audio: runtimeAudioInput,
        })

        this.runCustomGeneratorModule(runtimeLayer, {
          dtSec,
          clockSec: this.clockSec,
          beats: res.time.beats,
          beatPulse: reactivePulse,
          speed,
          audio: runtimeAudioInput,
          params: res.params,
        })

        syncProceduralLayerGroupScale(runtimeLayer, layer)
      }

      for (const material of runtimeLayer.materials) {
        const isMediaMaterial =
          layer.sourceType !== 'procedural' &&
          material instanceof THREE.MeshBasicMaterial &&
          material.map !== null

        if (isColorMaterial(material) && !isMediaMaterial) {
          const next = applyColorFx(
            color,
            invert,
            posterize,
            this.tmpColorFxA
          )
          const bloomBoost = 1 + bloom * 0.5
          next.r = clamp01(next.r * bloomBoost, next.r)
          next.g = clamp01(next.g * bloomBoost, next.g)
          next.b = clamp01(next.b * bloomBoost, next.b)
          material.color.copy(next)

          if (material instanceof THREE.MeshStandardMaterial) {
            material.emissive.copy(
              applyColorFx(
                emissive,
                invert,
                posterize,
                this.tmpColorFxB
              )
            )
            material.emissiveIntensity = 0.48 + bloom * 1.05 + layerEnergy * 0.62
          }
        }

        if ('opacity' in material) {
          material.opacity =
            strobeGate *
            (layer.blend === 'dissolve'
              ? clamp01(layerOpacity * (0.7 + this.rng() * 0.6), layerOpacity)
              : layerOpacity)
          material.transparent = material.opacity < 0.995 || layer.blend !== 'alpha'
        }

        if ('blending' in material) {
          material.blending = mapBlendMode(layer.blend)
        }
      }

      runtimeLayer.layer = manualLayer

    }

    const cameraFx =
      cameraEffect === null
        ? {
            x: 0,
            y: 0,
            z: 0,
            fov: 0,
            lookAtX: 0,
            lookAtY: 0,
          }
        : evaluateCameraEffect(cameraEffect.type, cameraEffectPhase)
    this.camera.position.x = cameraFx.x
    this.camera.position.y = cameraFx.y
    this.camera.position.z = 4.6 + cameraFx.z
    this.camera.fov = 62 + cameraFx.fov
    this.camera.updateProjectionMatrix()
    this.camera.lookAt(cameraFx.lookAtX, cameraFx.lookAtY, 0)
    this.updateRimLight(res, effectValues.rimLight)
    this.syncVisBackdropLayers()
    this.anchorScanlineOverlayToCamera()

    const hasFullscreenBackdropLayer = this.layers.some(
      (runtimeLayer) =>
        runtimeLayer.layer.enabled &&
        isVisBackdropSrc(runtimeLayer.layer.sourceType) &&
        runtimeLayer.media?.texture !== null
    )
    if (hasFullscreenBackdropLayer) {
      this.scene.background = null
    } else {
      const bgHue = mix(0.58, syncHue, colorSync)
      const bgLum = 0.09 - vignette * 0.035
      const safeLum = clamp01(bgLum, 0.08)
      const background = this.scene.background
      if (background instanceof THREE.Color) {
        background.setHSL(bgHue, 0.35, safeLum)
      } else {
        this.scene.background = new THREE.Color().setHSL(bgHue, 0.35, safeLum)
      }
    }
  }

  dispose(): void {
    this.disposed = true
    for (const runtimeLayer of this.layers) {
      this.disposeRuntimeLayer(runtimeLayer)
    }
    this.layers = []

    if (this.overlay !== null) {
      this.overlay.geometry.dispose()
      this.overlayMaterial?.dispose()
      this.scene.remove(this.overlay)
      this.overlay = null
      this.overlayMaterial = null
    }
    if (this.scanlineOverlay !== null) {
      ;(this.scanlineOverlay.geometry as THREE.BufferGeometry).dispose()
      this.scanlineOverlayMaterial?.dispose()
      this.scene.remove(this.scanlineOverlay)
      this.scanlineOverlay = null
      this.scanlineOverlayMaterial = null
    }
    if (this.emptyStateLabel !== null) {
      const material = this.emptyStateLabel.material
      if (material instanceof THREE.SpriteMaterial) {
        material.dispose()
      }
      this.scene.remove(this.emptyStateLabel)
      this.emptyStateLabel = null
    }
    if (this.emptyStateTexture !== null) {
      this.emptyStateTexture.dispose()
      this.emptyStateTexture = null
    }

    this.scene.remove(this.ambientLight)
    this.scene.remove(this.rimPointLight)

    this.scene.remove(this.root)
  }

  private buildLayers() {
    this.rebuildLayers(this.config.layers, false)
  }

  private rebuildLayers(
    nextLayers: BuiltinLayerItem[],
    preserveProjectMSessions: boolean
  ) {
    const previousLayers = this.layers
    this.layers = []

    const reusableProjectMMedia = new Map<string, RuntimeMediaBinding>()
    if (preserveProjectMSessions) {
      for (const runtime of previousLayers) {
        if (
          runtime.layer.sourceType !== 'projectM' ||
          runtime.media === null ||
          runtime.media.projectM === null
        ) {
          continue
        }
        const key = this.getProjectMReuseKey(runtime.layer.source)
        if (!reusableProjectMMedia.has(key)) {
          reusableProjectMMedia.set(key, runtime.media)
        }
      }
    }

    const reusedMediaRefs = new Set<RuntimeMediaBinding>()
    this.layers = nextLayers.map((layer, index) => {
      const built = buildLayerGeometry(layer, index)
      if (layer.generator === 'customModule') {
        built.customGenerator = this.compileCustomGeneratorModule(built)
      }
      if (isVisBackdropSrc(layer.sourceType)) {
        // Fullscreen stream layers (projectM / NDI / RTSP) stay out of `root` so they
        // remain fixed to the view like a background plate.
        this.scene.add(built.group)
      } else {
        this.root.add(built.group)
      }

      if (layer.sourceType !== 'procedural') {
        const reusedMedia =
          preserveProjectMSessions && layer.sourceType === 'projectM'
            ? reusableProjectMMedia.get(this.getProjectMReuseKey(layer.source)) ?? null
            : null
        if (reusedMedia !== null) {
          const plane = built.nodes.find((node) => node.object instanceof THREE.Mesh)
          if (plane && plane.object instanceof THREE.Mesh) {
            reusedMedia.plane = plane.object
            built.media = reusedMedia
            if (reusedMedia.texture) {
              this.applyLayerTexture(built, reusedMedia.texture)
            }
          } else {
            void this.bindLayerMedia(built)
          }
          reusedMediaRefs.add(reusedMedia)
        } else {
          void this.bindLayerMedia(built)
        }
      }
      return built
    })

    for (const runtime of previousLayers) {
      const media = runtime.media
      if (media && reusedMediaRefs.has(media)) {
        runtime.media = null
      }
      this.disposeRuntimeLayer(runtime)
    }
  }

  private disposeRuntimeLayer(runtimeLayer: RuntimeLayer) {
    this.disposeLayerMedia(runtimeLayer)
    for (const node of runtimeLayer.nodes) {
      const mesh = node.object as THREE.Mesh
      if (mesh.geometry) {
        mesh.geometry.dispose()
      }
    }
    for (const material of runtimeLayer.materials) {
      material.dispose()
    }
    runtimeLayer.group.parent?.remove(runtimeLayer.group)
  }

  private getProjectMReuseKey(source: string) {
    const trimmed = source.trim()
    const isWindows =
      typeof navigator !== 'undefined' && /win/i.test(navigator.platform)
    if (isWindows) {
      return trimmed.toLowerCase()
    }
    return trimmed
  }

  private requiresLayerRebuild(nextLayers: BuiltinLayerItem[]) {
    if (nextLayers.length !== this.layers.length) {
      return true
    }
    for (let i = 0; i < nextLayers.length; i++) {
      const runtime = this.layers[i]
      const next = nextLayers[i]
      if (!runtime || !next) {
        return true
      }
      const current = runtime.layer
      const nonProceduralMediaChanged =
        current.sourceType !== 'procedural' &&
        (current.source !== next.source || current.mediaFit !== next.mediaFit)
      // Preset-only changes for projectM are handled in updateProjectMMediaBinding via
      // bridge loadPreset (same sessionId). Rebuilding layers would destroy the texture,
      // spin a new session, and cause a long blank while createSession runs.
      const projectMPresetOnlyChange =
        nonProceduralMediaChanged &&
        current.sourceType === 'projectM' &&
        next.sourceType === 'projectM' &&
        current.mediaFit === next.mediaFit
      if (
        runtime.generator !== next.generator ||
        current.sourceType !== next.sourceType ||
        current.text !== next.text ||
        (isQuantitySensitiveGenerator(next.generator) &&
          (Math.abs(current.quantity - next.quantity) > 0.0001 ||
            Math.abs(current.variety - next.variety) > 0.0001 ||
            Math.abs(current.density - next.density) > 0.0001)) ||
        (next.generator === 'customModule' &&
          (current.customModuleCode !== next.customModuleCode ||
            current.customModuleName !== next.customModuleName)) ||
        (nonProceduralMediaChanged && !projectMPresetOnlyChange)
      ) {
        return true
      }
    }
    return false
  }

  private async bindLayerMedia(runtimeLayer: RuntimeLayer) {
    const { layer } = runtimeLayer
    if (layer.sourceType === 'procedural') {
      return
    }

    const plane = runtimeLayer.nodes.find((node) => node.object instanceof THREE.Mesh)
    if (!plane) {
      return
    }

    const media: RuntimeMediaBinding = {
      texture: null,
      video: null,
      image: null,
      imageBitmap: null,
      relayId: null,
      projectM: null,
      plane: plane.object as THREE.Mesh,
    }
    runtimeLayer.media = media

    const source = layer.source.trim()
    if (layer.sourceType !== 'projectM' && source.length === 0) {
      return
    }

    if (layer.sourceType === 'projectM') {
      this.bindProjectMMedia(runtimeLayer, source)
      return
    }

    let target = source
    if (layer.sourceType === 'rtspStream') {
      try {
        const relay = await startRelay(initVisualizerRelayRequest(source))
        if (this.disposed) {
          if (relay.relayId) {
            void stopRelay(relay.relayId)
          }
          return
        }
        media.relayId = relay.relayId
        target = relay.url
      } catch (err) {
        console.error(`RTSP relay failed`, err)
        return
      }
    } else if (layer.sourceType === 'ndiStream') {
      try {
        const relay = await startRelay(
          initVisualizerRelayRequest(`ndi://${source}`)
        )
        if (this.disposed) {
          if (relay.relayId) {
            void stopRelay(relay.relayId)
          }
          return
        }
        media.relayId = relay.relayId
        target = relay.url
      } catch (err) {
        console.error(`NDI relay failed`, err)
        return
      }
    }

    try {
      if (isMjpegRelayUrl(target)) {
        await this.loadMjpegTexture(media, target)
        if (media.texture) {
          this.applyLayerTexture(runtimeLayer, media.texture)
        }
      } else if (layer.sourceType === 'imageFile') {
        const image = await loadImage(normalizeMediaUrl(target))
        if (this.disposed) return
        media.texture = image.texture
        media.imageBitmap = image.bitmap
        this.applyLayerTexture(runtimeLayer, media.texture)
      } else {
        const video = await loadVideo(normalizeMediaUrl(target))
        if (this.disposed) {
          releaseVideo(video)
          return
        }
        const texture = new THREE.VideoTexture(video)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = false
        media.video = video
        media.texture = texture
        this.applyLayerTexture(runtimeLayer, texture)
      }
    } catch (err) {
      console.error(`Failed to load media layer source`, err)
    }
  }

  private bindProjectMMedia(runtimeLayer: RuntimeLayer, presetPath: string) {
    const media = runtimeLayer.media
    if (!media) {
      return
    }
    const normalizedPresetPath =
      typeof presetPath === 'string' ? presetPath.trim() : ''
    media.projectM = {
      sessionId: makeProjectMLayerSessionId(),
      presetPath: normalizedPresetPath,
      presetPathKey: this.getProjectMReuseKey(normalizedPresetPath),
      sessionReady: false,
      sessionInitPromise: null,
      renderInFlight: false,
      renderInFlightStartedMs: 0,
      audioPushInFlight: false,
      lastAudioPushMs: 0,
      lastRenderDispatchMs: 0,
      lastBridgeFrameTimeMs: 0,
      targetWidth: 640,
      targetHeight: 360,
      hasRenderedFrame: false,
      consecutiveRenderMisses: 0,
      lastSuccessfulFrameMs: 0,
    }
    void this.initProjectMMediaSession(runtimeLayer, normalizedPresetPath)
  }

  private async initProjectMMediaSession(
    runtimeLayer: RuntimeLayer,
    presetPath: string
  ) {
    const media = runtimeLayer.media
    const projectM = media?.projectM
    if (!media || !projectM || projectM.sessionInitPromise !== null) {
      return
    }
    const sessionId = projectM.sessionId
    projectM.renderInFlight = false
    projectM.renderInFlightStartedMs = 0
    projectM.sessionInitPromise = (async () => {
      const normalizedPresetPath =
        typeof presetPath === 'string' ? presetPath.trim() : ''
      const requestedPresetKey = this.getProjectMReuseKey(normalizedPresetPath)
      const bridgePresetPath = toProjectMBridgePresetPath(normalizedPresetPath)
      try {
        const result = await initProjectMBridgeSession({
          sessionId,
          width: projectM.targetWidth,
          height: projectM.targetHeight,
          fps: PROJECTM_LAYER_TARGET_FPS,
          transport: 'bgra-buffer',
          presetPath: bridgePresetPath,
          texturePath: buildTextureSearchPathHint(normalizedPresetPath),
        })
        const currentProjectM = runtimeLayer.media?.projectM
        if (!currentProjectM || currentProjectM.sessionId !== sessionId) {
          return
        }
        currentProjectM.sessionReady =
          result.ok && currentProjectM.presetPathKey === requestedPresetKey
        if (!currentProjectM.sessionReady) {
          currentProjectM.hasRenderedFrame = false
        }
        sendDiagnosticsEvent({
          source: 'visualizer-renderer',
          area: 'projectm-layer',
          event: 'session-init',
          level: result.ok ? 'info' : 'warn',
          message: result.message,
          data: {
            sessionId,
            mode: result.mode,
            presetPath: normalizedPresetPath,
            bridgePresetPath,
          },
        })
      } catch (_error) {
        const currentProjectM = runtimeLayer.media?.projectM
        if (!currentProjectM || currentProjectM.sessionId !== sessionId) {
          return
        }
        currentProjectM.sessionReady = false
        currentProjectM.hasRenderedFrame = false
        sendDiagnosticsEvent({
          source: 'visualizer-renderer',
          area: 'projectm-layer',
          event: 'session-init-error',
          level: 'error',
          message: 'projectM layer session init failed.',
          data: {
            sessionId,
            presetPath: normalizedPresetPath,
            bridgePresetPath,
          },
        })
      } finally {
        const currentProjectM = runtimeLayer.media?.projectM
        if (!currentProjectM || currentProjectM.sessionId !== sessionId) {
          return
        }
        currentProjectM.sessionInitPromise = null
        if (
          currentProjectM.presetPathKey !== requestedPresetKey &&
          !this.disposed
        ) {
          currentProjectM.sessionReady = false
          currentProjectM.hasRenderedFrame = false
          void this.initProjectMMediaSession(runtimeLayer, currentProjectM.presetPath)
        }
      }
    })()
  }

  private updateProjectMMediaBinding(
    runtimeLayer: RuntimeLayer,
    audio: UpdateResource['audio']
  ) {
    const media = runtimeLayer.media
    const projectM = media?.projectM
    if (!media || !projectM) {
      return
    }

    const now = Date.now()
    if (
      projectM.renderInFlight &&
      projectM.renderInFlightStartedMs > 0 &&
      now - projectM.renderInFlightStartedMs > PROJECTM_LAYER_RENDER_STALE_IN_FLIGHT_MS
    ) {
      projectM.renderInFlight = false
      projectM.renderInFlightStartedMs = 0
      this.noteProjectMRenderMiss(runtimeLayer, projectM.sessionId)
    }

    const requestedPresetPath = runtimeLayer.layer.source.trim()
    const requestedPresetKey = this.getProjectMReuseKey(requestedPresetPath)
    if (requestedPresetKey !== projectM.presetPathKey) {
      projectM.renderInFlight = false
      projectM.renderInFlightStartedMs = 0
      projectM.presetPath = requestedPresetPath
      projectM.presetPathKey = requestedPresetKey
      projectM.sessionReady = false
      // `layerMediaReady` used to only check hasRenderedFrame; stale frames from the prior
      // preset/session must not satisfy scene transitions or cross-fades.
      projectM.hasRenderedFrame = false
      projectM.lastRenderDispatchMs = 0
      projectM.lastBridgeFrameTimeMs = 0
      projectM.consecutiveRenderMisses = 0
      projectM.lastSuccessfulFrameMs = 0
      if (projectM.sessionInitPromise === null) {
        void this.initProjectMMediaSession(runtimeLayer, requestedPresetPath)
      }
      return
    }

    if (!projectM.sessionReady && projectM.sessionInitPromise === null) {
      void this.initProjectMMediaSession(runtimeLayer, projectM.presetPath)
    }

    const sessionId = projectM.sessionId

    if (
      projectM.sessionReady &&
      !projectM.audioPushInFlight &&
      now - projectM.lastAudioPushMs >= 33
    ) {
      projectM.lastAudioPushMs = now
      projectM.audioPushInFlight = true
      const audioChunk = buildProjectMLayerAudioChunk(audio)
      void pushProjectMBridgeAudio({
        sessionId,
        channels: audioChunk.channels,
        samples: audioChunk.samples,
      })
        .catch(() => undefined)
        .finally(() => {
          const currentProjectM = runtimeLayer.media?.projectM
          if (!currentProjectM || currentProjectM.sessionId !== sessionId) {
            return
          }
          currentProjectM.audioPushInFlight = false
        })
    }

    if (
      projectM.sessionReady &&
      !projectM.renderInFlight &&
      now - projectM.lastRenderDispatchMs >= 1000 / PROJECTM_LAYER_RENDER_FPS
    ) {
      projectM.renderInFlight = true
      const elapsedSinceLastFrame =
        projectM.lastBridgeFrameTimeMs > 0
          ? Math.max(1, now - projectM.lastBridgeFrameTimeMs)
          : Math.round(1000 / PROJECTM_LAYER_RENDER_FPS)
      projectM.lastBridgeFrameTimeMs = now
      projectM.lastRenderDispatchMs = now
      projectM.renderInFlightStartedMs = now

      void withProjectMRenderTimeout(
        renderProjectMBridgeFrame({
          sessionId,
          frameTimeMs: Math.min(250, Math.max(1, Math.round(elapsedSinceLastFrame))),
        }),
        PROJECTM_LAYER_RENDER_IPC_TIMEOUT_MS
      )
        .then((result) => {
          const currentProjectM = runtimeLayer.media?.projectM
          if (!currentProjectM || currentProjectM.sessionId !== sessionId) {
            return
          }
          if (!result.ok) {
            this.noteProjectMRenderMiss(runtimeLayer, sessionId)
            return
          }
          const frameBytes = coerceProjectMFrameBytes(
            result.bufferBinary,
            result.bufferBase64,
            result.width,
            result.height
          )
          if (frameBytes === null) {
            this.noteProjectMRenderMiss(runtimeLayer, sessionId)
            return
          }
          this.applyProjectMMediaFrame(runtimeLayer, sessionId, frameBytes, result.width, result.height)
        })
        .catch(() => {
          this.noteProjectMRenderMiss(runtimeLayer, sessionId)
        })
        .finally(() => {
          const currentProjectM = runtimeLayer.media?.projectM
          if (!currentProjectM || currentProjectM.sessionId !== sessionId) {
            return
          }
          currentProjectM.renderInFlight = false
          currentProjectM.renderInFlightStartedMs = 0
        })
    }
  }

  private applyProjectMMediaFrame(
    runtimeLayer: RuntimeLayer,
    sessionId: string,
    frameBytes: Uint8Array,
    width: number,
    height: number
  ) {
    const media = runtimeLayer.media
    const projectM = media?.projectM
    if (!media || !projectM || projectM.sessionId !== sessionId) {
      return
    }

    const safeWidth = clampProjectMInt(width, PROJECTM_LAYER_MIN_WIDTH, PROJECTM_LAYER_MAX_WIDTH)
    const safeHeight = clampProjectMInt(height, PROJECTM_LAYER_MIN_HEIGHT, PROJECTM_LAYER_MAX_HEIGHT)
    const expectedLength = safeWidth * safeHeight * 4
    if (frameBytes.length < expectedLength) {
      this.noteProjectMRenderMiss(runtimeLayer, sessionId)
      return
    }

    let texture: THREE.DataTexture
    if (
      media.texture instanceof THREE.DataTexture &&
      media.texture.image &&
      (media.texture.image as { width?: number }).width === safeWidth &&
      (media.texture.image as { height?: number }).height === safeHeight &&
      media.texture.image.data instanceof Uint8Array
    ) {
      texture = media.texture
    } else {
      if (media.texture) {
        media.texture.dispose()
      }
      const data = new Uint8Array(expectedLength)
      texture = new THREE.DataTexture(data, safeWidth, safeHeight, THREE.RGBAFormat)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = false
      media.texture = texture
      this.applyLayerTexture(runtimeLayer, texture)
    }

    const imageData = (
      texture.image as { data?: Uint8Array | Uint8ClampedArray }
    ).data
    if (!(imageData instanceof Uint8Array || imageData instanceof Uint8ClampedArray)) {
      this.noteProjectMRenderMiss(runtimeLayer, sessionId)
      return
    }
    imageData.set(frameBytes.subarray(0, expectedLength))
    texture.needsUpdate = true

    projectM.hasRenderedFrame = true
    projectM.consecutiveRenderMisses = 0
    projectM.lastSuccessfulFrameMs = Date.now()
  }

  private noteProjectMRenderMiss(runtimeLayer: RuntimeLayer, sessionId: string) {
    const projectM = runtimeLayer.media?.projectM
    if (!projectM || projectM.sessionId !== sessionId) {
      return
    }
    projectM.consecutiveRenderMisses += 1
    const now = Date.now()
    if (projectM.hasRenderedFrame) {
      if (
        projectM.lastSuccessfulFrameMs > 0 &&
        now - projectM.lastSuccessfulFrameMs < PROJECTM_LAYER_RESET_MIN_STABLE_MS
      ) {
        return
      }
      if (
        projectM.lastSuccessfulFrameMs > 0 &&
        now - projectM.lastSuccessfulFrameMs < PROJECTM_LAYER_RESET_STALE_FAILSAFE_MS
      ) {
        return
      }
      if (projectM.consecutiveRenderMisses < PROJECTM_LAYER_RESET_MISS_COUNT * 2) {
        return
      }
    } else if (projectM.consecutiveRenderMisses < PROJECTM_LAYER_RESET_MISS_COUNT) {
      return
    }
    if (
      projectM.lastSuccessfulFrameMs > 0 &&
      now - projectM.lastSuccessfulFrameMs < PROJECTM_LAYER_RESET_MIN_STABLE_MS
    ) {
      return
    }
    this.resetProjectMMediaSession(runtimeLayer)
  }

  private resetProjectMMediaSession(runtimeLayer: RuntimeLayer) {
    const projectM = runtimeLayer.media?.projectM
    if (!projectM) {
      return
    }
    const nextPresetPath = projectM.presetPath
    const previousSessionId = projectM.sessionId
    projectM.sessionId = makeProjectMLayerSessionId()
    projectM.sessionReady = false
    projectM.sessionInitPromise = null
    projectM.renderInFlight = false
    projectM.renderInFlightStartedMs = 0
    projectM.audioPushInFlight = false
    projectM.lastAudioPushMs = 0
    projectM.lastRenderDispatchMs = 0
    projectM.lastBridgeFrameTimeMs = 0
    projectM.hasRenderedFrame = false
    projectM.consecutiveRenderMisses = 0
    projectM.lastSuccessfulFrameMs = 0
    void shutdownProjectMBridgeSession(previousSessionId).catch(() => undefined)
    void this.initProjectMMediaSession(runtimeLayer, nextPresetPath)
  }

  private applyLayerTexture(runtimeLayer: RuntimeLayer, texture: THREE.Texture) {
    for (const material of runtimeLayer.materials) {
      if (material instanceof THREE.MeshBasicMaterial) {
        material.map = texture
        material.color.set('#ffffff')
        material.needsUpdate = true
      }
    }

    const media = runtimeLayer.media
    if (!media) return
    if (runtimeLayer.layer.sourceType === 'projectM') {
      return
    }
    const image = texture.image as { width?: number; height?: number } | undefined
    const width = Number(image?.width)
    const height = Number(image?.height)
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return
    }
    applyPlaneFit(media.plane, width / height, runtimeLayer.layer.mediaFit)
  }

  private async loadMjpegTexture(media: RuntimeMediaBinding, url: string) {
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      const cleanup = () => {
        img.removeEventListener('load', onLoad)
        img.removeEventListener('error', onError)
      }

      const onLoad = () => {
        cleanup()
        if (this.disposed) {
          resolve()
          return
        }
        const texture = new THREE.Texture(img)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = false
        texture.needsUpdate = true
        media.image = img
        media.texture = texture
        resolve()
      }

      const onError = () => {
        cleanup()
        reject(new Error(`Failed to load MJPEG stream texture`))
      }

      img.addEventListener('load', onLoad)
      img.addEventListener('error', onError)
      img.src = url
    })
  }

  private disposeLayerMedia(runtimeLayer: RuntimeLayer) {
    const media = runtimeLayer.media
    if (!media) return

    if (media.projectM) {
      void shutdownProjectMBridgeSession(media.projectM.sessionId).catch(() => undefined)
      media.projectM = null
    }

    if (media.texture) {
      media.texture.dispose()
      media.texture = null
    }
    if (media.video) {
      releaseVideo(media.video)
      media.video = null
    }
    if (media.image) {
      media.image.src = ''
      media.image = null
    }
    if (media.imageBitmap) {
      try {
        media.imageBitmap.close()
      } catch (_err) {}
      media.imageBitmap = null
    }
    if (media.relayId) {
      void stopRelay(media.relayId)
      media.relayId = null
    }

    runtimeLayer.media = null
  }

  /** Fit fullscreen plate to the camera frustum; crop texture UVs to cover. */
  private layoutVisBackdropPlane(runtimeLayer: RuntimeLayer) {
    const media = runtimeLayer.media
    if (!media) {
      return
    }

    const plane = media.plane
    plane.frustumCulled = false
    const material = plane.material
    if (material instanceof THREE.MeshBasicMaterial) {
      material.depthWrite = false
      material.depthTest = false
      material.toneMapped = false
      material.side = THREE.DoubleSide
    }
    plane.renderOrder = -1000

    const distance = 1.25
    this.tmpProjectMForward
      .set(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
    this.tmpProjectMTarget
      .copy(this.camera.position)
      .addScaledVector(this.tmpProjectMForward, distance)

    plane.position.copy(this.tmpProjectMTarget)
    plane.quaternion.copy(this.camera.quaternion)

    const viewportAspect =
      Number.isFinite(this.camera.aspect) && this.camera.aspect > 0
        ? this.camera.aspect
        : 16 / 9
    let textureAspect = viewportAspect
    const image = (media.texture?.image ?? null) as
      | { width?: number; height?: number }
      | null
    const textureWidth = Number(image?.width)
    const textureHeight = Number(image?.height)
    if (
      Number.isFinite(textureWidth) &&
      Number.isFinite(textureHeight) &&
      textureWidth > 0 &&
      textureHeight > 0
    ) {
      textureAspect = textureWidth / textureHeight
    }

    const fovRad = THREE.MathUtils.degToRad(this.camera.fov)
    const visibleHeight = 2 * Math.tan(fovRad * 0.5) * distance
    const visibleWidth = visibleHeight * viewportAspect
    // Keep the fullscreen quad exactly matched to the current viewport.
    // Aspect fit is handled by UV crop on the texture map.
    plane.scale.set(visibleWidth, visibleHeight, 1)

    const map = material instanceof THREE.MeshBasicMaterial ? material.map : null
    if (map) {
      map.wrapS = THREE.ClampToEdgeWrapping
      map.wrapT = THREE.ClampToEdgeWrapping
      const safeTextureAspect = Math.max(textureAspect, 0.0001)
      const safeTextureWidth =
        Number.isFinite(textureWidth) && textureWidth > 0 ? textureWidth : 1
      const safeTextureHeight =
        Number.isFinite(textureHeight) && textureHeight > 0 ? textureHeight : 1
      // Cover fit via centered UV crop.
      if (safeTextureAspect > viewportAspect) {
        const epsilonX = 1 / safeTextureWidth
        const repeatX = clamp01(viewportAspect / safeTextureAspect + epsilonX, 1)
        map.repeat.set(repeatX, 1)
        map.offset.set((1 - repeatX) * 0.5, 0)
      } else {
        const epsilonY = 1 / safeTextureHeight
        const repeatY = clamp01(safeTextureAspect / viewportAspect + epsilonY, 1)
        map.repeat.set(1, repeatY)
        map.offset.set(0, (1 - repeatY) * 0.5)
      }
    }
  }

  /** Update all backdrop plates (projectM / stream) each frame. */
  private syncVisBackdropLayers() {
    for (const runtimeLayer of this.layers) {
      if (
        runtimeLayer.layer.enabled &&
        isVisBackdropSrc(runtimeLayer.layer.sourceType) &&
        runtimeLayer.media !== null
      ) {
        this.layoutVisBackdropPlane(runtimeLayer)
      }
    }
  }

  private async ensureImportedModelLoaded(runtimeLayer: RuntimeLayer) {
    if (runtimeLayer.layer.generator !== 'importedModel') {
      return
    }
    const source = runtimeLayer.layer.source.trim()
    if (source.length === 0) {
      return
    }
    if (runtimeLayer.scratch.modelLoading === true) {
      return
    }
    if ((runtimeLayer.scratch.modelSourceLoaded as string | undefined) === source) {
      return
    }

    runtimeLayer.scratch.modelLoading = true
    runtimeLayer.scratch.modelError = ''
    try {
      const object = await loadImportedModelObject(normalizeMediaUrl(source))
      if (this.disposed) {
        disposeObjectResources(object)
        return
      }
      if (
        runtimeLayer.layer.generator !== 'importedModel' ||
        runtimeLayer.layer.source.trim() !== source
      ) {
        disposeObjectResources(object)
        return
      }

      const previousObject = runtimeLayer.scratch.modelObject as THREE.Object3D | undefined
      const previousMaterials = runtimeLayer.scratch.modelMaterials as
        | THREE.Material[]
        | undefined
      if (previousObject) {
        runtimeLayer.group.remove(previousObject)
        runtimeLayer.nodes = runtimeLayer.nodes.filter(
          (node) => node.object !== previousObject
        )
      }
      if (Array.isArray(previousMaterials)) {
        for (const material of previousMaterials) {
          const index = runtimeLayer.materials.indexOf(material)
          if (index >= 0) {
            runtimeLayer.materials.splice(index, 1)
          }
          material.dispose()
        }
      }

      fitObjectToTargetSize(object, 1.35 + runtimeLayer.layer.scale * 3.35)
      runtimeLayer.group.add(object)
      runtimeLayer.nodes.push({
        object,
        basePosition: object.position.clone(),
        baseRotation: object.rotation.clone(),
        amplitude: 0.12,
      })
      const modelMaterials: THREE.Material[] = []
      collectObjectMaterials(object, modelMaterials)
      for (const material of modelMaterials) {
        if (!runtimeLayer.materials.includes(material)) {
          runtimeLayer.materials.push(material)
        }
      }
      runtimeLayer.scratch.modelMaterials = modelMaterials
      runtimeLayer.scratch.modelObject = object
      runtimeLayer.scratch.modelSourceLoaded = source
      const placeholder = runtimeLayer.scratch.modelPlaceholder as
        | THREE.Object3D
        | undefined
      if (placeholder) {
        placeholder.visible = false
      }
    } catch (err) {
      runtimeLayer.scratch.modelError = String(err)
      // Prevent per-frame reload spam for a bad source until user changes it.
      runtimeLayer.scratch.modelSourceLoaded = source
      console.error(`[BuiltinVisualizer] Failed to load imported model`, err)
    } finally {
      runtimeLayer.scratch.modelLoading = false
    }
  }

  private buildOverlay() {
    const count = 900
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.overlayMaterial = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.018,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.overlay = new THREE.Points(geometry, this.overlayMaterial)
    this.scene.add(this.overlay)
  }

  private buildScanlineOverlay() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmount: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uAmount;

        void main() {
          float lines = step(0.5, fract(vUv.y * 220.0 + sin(uTime * 2.7) * 0.5));
          float flicker = 0.9 + 0.1 * sin(uTime * 58.0 + vUv.y * 10.0);
          float alpha = clamp(uAmount, 0.0, 1.0) * (0.04 + lines * 0.09) * flicker;
          gl_FragColor = vec4(vec3(0.08, 0.11, 0.16), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
    mesh.renderOrder = 1000
    this.scanlineOverlay = mesh
    this.scanlineOverlayMaterial = material
    this.scene.add(mesh)
  }

  private buildEmptyStateLabel() {
    if (typeof document === 'undefined') {
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (ctx === null) {
      return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '600 50px "Segoe UI", sans-serif'
    ctx.fillText('Add a layer below to get started', canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 1,
    })
    const sprite = new THREE.Sprite(material)
    sprite.visible = false
    sprite.renderOrder = 1200
    this.emptyStateTexture = texture
    this.emptyStateLabel = sprite
    this.scene.add(sprite)
  }

  private anchorScanlineOverlayToCamera() {
    if (this.scanlineOverlay === null) {
      return
    }
    const forward = this.tmpScanlineForward
      .set(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
    const distance = 1.2
    const fovRad = (this.camera.fov * Math.PI) / 180
    const frustumHeight = 2 * Math.tan(fovRad / 2) * distance
    const frustumWidth = frustumHeight * this.camera.aspect
    this.tmpScanlineTarget
      .copy(this.camera.position)
      .addScaledVector(forward, distance)
    this.scanlineOverlay.position.copy(this.tmpScanlineTarget)
    this.scanlineOverlay.quaternion.copy(this.camera.quaternion)
    this.scanlineOverlay.scale.set(frustumWidth, frustumHeight, 1)
  }

  private anchorEmptyStateLabelToCamera() {
    if (this.emptyStateLabel === null) {
      return
    }
    const forward = this.tmpEmptyStateForward
      .set(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
    const distance = 2.4
    const fovRad = (this.camera.fov * Math.PI) / 180
    const frustumHeight = 2 * Math.tan(fovRad / 2) * distance
    const frustumWidth = frustumHeight * this.camera.aspect
    this.tmpEmptyStateTarget
      .copy(this.camera.position)
      .addScaledVector(forward, distance)
    this.emptyStateLabel.position.copy(this.tmpEmptyStateTarget)
    this.emptyStateLabel.scale.set(
      Math.max(1.4, frustumWidth * 0.66),
      Math.max(0.36, frustumHeight * 0.115),
      1
    )
  }

  private compileCustomGeneratorModule(
    runtimeLayer: RuntimeLayer
  ): CompiledCustomGeneratorModule | null {
    const { layer } = runtimeLayer
    if (layer.generator !== 'customModule') {
      return null
    }
    const parsed = evaluateCustomModuleCode(layer.customModuleCode)
    if (parsed === null || typeof parsed !== 'object') {
      return null
    }
    const source = parsed as {
      name?: unknown
      supportsReactiveInput?: unknown
      reactiveInput?: unknown
      build?: unknown
      onBuild?: unknown
      create?: unknown
      update?: unknown
      onUpdate?: unknown
      frame?: unknown
    }
    const moduleName =
      typeof source.name === 'string' && source.name.trim().length > 0
        ? source.name.trim()
        : layer.customModuleName
    const build =
      resolveFunction(source.build) ??
      resolveFunction(source.onBuild) ??
      resolveFunction(source.create)
    const update =
      resolveFunction(source.update) ??
      resolveFunction(source.onUpdate) ??
      resolveFunction(source.frame)
    const supportsReactiveInput =
      source.supportsReactiveInput === true || source.reactiveInput === true

    if (build) {
      try {
        build({
          THREE,
          layer,
          group: runtimeLayer.group,
          scratch: runtimeLayer.scratch,
          addObject: (object: THREE.Object3D, amplitude = 0.1) => {
            runtimeLayer.group.add(object)
            runtimeLayer.nodes.push({
              object,
              basePosition: object.position.clone(),
              baseRotation: object.rotation.clone(),
              amplitude: Number.isFinite(amplitude) ? amplitude : 0.1,
            })
            collectObjectMaterials(object, runtimeLayer.materials)
          },
        })
      } catch (err) {
        console.error(
          `[BuiltinVisualizer] Custom generator build failed (${moduleName})`,
          err
        )
      }
    }

    return {
      name: moduleName,
      build,
      update,
      supportsReactiveInput,
    }
  }

  private runCustomGeneratorModule(
    runtimeLayer: RuntimeLayer,
    input: {
      dtSec: number
      clockSec: number
      beats: number
      beatPulse: number
      speed: number
      audio: UpdateResource['audio']
      params: UpdateResource['params']
    }
  ) {
    const custom = runtimeLayer.customGenerator
    if (!custom?.update) {
      return
    }
    try {
      custom.update({
        THREE,
        layer: runtimeLayer.layer,
        group: runtimeLayer.group,
        scratch: runtimeLayer.scratch,
        nodes: runtimeLayer.nodes,
        materials: runtimeLayer.materials,
        dtSec: input.dtSec,
        clockSec: input.clockSec,
        beats: input.beats,
        beatPulse: input.beatPulse,
        speed: input.speed,
        audio: input.audio,
        params: input.params,
      })
    } catch (err) {
      if (runtimeLayer.scratch.__customGeneratorUpdateError !== true) {
        runtimeLayer.scratch.__customGeneratorUpdateError = true
        console.error(
          `[BuiltinVisualizer] Custom generator update failed (${custom.name})`,
          err
        )
      }
    }
  }

  private compileCustomEffects(effects: BuiltinEffectItem[]): CompiledCustomEffectModule[] {
    const result: CompiledCustomEffectModule[] = []
    for (const effect of effects) {
      if (effect.type !== 'customModule') {
        continue
      }
      const parsed = evaluateCustomModuleCode(effect.customModuleCode)
      if (parsed === null || typeof parsed !== 'object') {
        continue
      }
      const source = parsed as {
        name?: unknown
        apply?: unknown
        onFrame?: unknown
        update?: unknown
      }
      const apply =
        resolveFunction(source.apply) ??
        resolveFunction(source.onFrame) ??
        resolveFunction(source.update)
      if (!apply) {
        continue
      }
      result.push({
        id: effect.id,
        name:
          typeof source.name === 'string' && source.name.trim().length > 0
            ? source.name.trim()
            : effect.customModuleName,
        apply,
      })
    }
    return result
  }

  private resolveEffectAmounts(
    res: UpdateResource,
    dtSec: number,
    beatPulse: number
  ): Record<BuiltinResolvedEffectType, number> {
    const amounts = createEmptyEffectAmountMap()
    for (const effect of this.config.effects) {
      if (!effect.enabled || effect.type === 'customModule') {
        continue
      }
      const key = effect.type as BuiltinResolvedEffectType
      const linkValue = effectLinkValue(effect.linkSource, res.params)
      const resolvedAmount =
        effect.linkSource === 'none' ? effect.amount : linkValue
      const next = amounts[key] + resolvedAmount
      amounts[key] = clampUnit(next)
    }

    for (const effect of this.config.effects) {
      if (!effect.enabled || effect.type !== 'customModule') {
        continue
      }
      const custom = this.customEffects.find((item) => item.id === effect.id)
      if (!custom?.apply) {
        continue
      }
      const linkValue = effectLinkValue(effect.linkSource, res.params)
      const moduleAmount = clampUnit(
        effect.linkSource === 'none' ? effect.amount : linkValue
      )
      if (moduleAmount <= 0) {
        continue
      }
      try {
        const returned = custom.apply({
          THREE,
          scene: this.scene,
          root: this.root,
          camera: this.camera,
          amount: moduleAmount,
          dtSec,
          clockSec: this.clockSec,
          beats: res.time.beats,
          beatPulse,
          audio: res.audio,
          params: res.params,
          getEffectAmount: (type) => amounts[type],
          setEffectAmount: (type, amount) => {
            amounts[type] = clampUnit(amount)
          },
        })
        if (returned !== null && typeof returned === 'object') {
          const effectPatch = returned as Partial<Record<BuiltinResolvedEffectType, unknown>>
          for (const key of builtinResolvedEffectTypeList) {
            if (effectPatch[key] === undefined) {
              continue
            }
            const next = Number(effectPatch[key])
            if (!Number.isFinite(next)) {
              continue
            }
            amounts[key] = clampUnit(amounts[key] + next * moduleAmount)
          }
        }
      } catch (err) {
        if (!custom.errored && effect.customModuleCode.length > 0) {
          custom.errored = true
          console.error(
            `[BuiltinVisualizer] Custom effect execution failed (${custom.name})`,
            err
          )
        }
      }
    }
    return amounts
  }

  private getActiveCameraEffect(
    res: UpdateResource
  ): BuiltinCameraEffectItem | null {
    const enabled = this.config.cameraEffects.filter((effect) => effect.enabled)
    if (enabled.length === 0) {
      return null
    }

    const current =
      enabled[
        Math.max(0, Math.min(this.cameraEffectIndex, enabled.length - 1))
      ]
    const safeDuration = Math.max(1, current.durationBeats)
    if (res.time.beats - this.cameraEffectAnchorBeat >= safeDuration) {
      this.cameraEffectAnchorBeat = res.time.beats
      if (this.config.shuffleCameraEffects) {
        this.cameraEffectIndex = Math.floor(this.rng() * enabled.length)
      } else {
        this.cameraEffectIndex = (this.cameraEffectIndex + 1) % enabled.length
      }
    }

    return enabled[this.cameraEffectIndex] ?? enabled[0] ?? null
  }

  private resolveRimLightAzimuth(res: UpdateResource): number {
    let acc = 0
    let weight = 0
    for (const effect of this.config.effects) {
      if (!effect.enabled || effect.type !== 'rimLight') {
        continue
      }
      const linkValue = effectLinkValue(effect.linkSource, res.params)
      const resolvedAmount =
        effect.linkSource === 'none' ? effect.amount : linkValue
      const w = clampUnit(resolvedAmount)
      if (w <= 0.0005) {
        continue
      }
      const az = resolveLayerUnitLink(
        effect.lightAzimuth,
        effect.lightAzimuthLinkSource,
        res.params
      )
      acc += az * w
      weight += w
    }
    if (weight <= 0.0005) {
      return 0.5
    }
    return acc / weight
  }

  private updateRimLight(res: UpdateResource, rimAmount: number): void {
    if (rimAmount <= 0.001) {
      this.rimPointLight.intensity = 0
      this.rimPointLight.visible = false
      return
    }
    this.rimPointLight.visible = true
    const azimuth01 = this.resolveRimLightAzimuth(res)
    const theta = (azimuth01 - 0.5) * Math.PI
    this.camera.getWorldDirection(this.tmpRimFwd)
    this.tmpRimBack.copy(this.tmpRimFwd).multiplyScalar(-1)
    this.tmpRimRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion)
    const dist = 3.6
    const lateral = 2.35
    this.rimPointLight.position.copy(this.camera.position)
    this.rimPointLight.position.addScaledVector(this.tmpRimBack, dist)
    this.rimPointLight.position.addScaledVector(
      this.tmpRimRight,
      Math.sin(theta) * lateral
    )
    this.rimPointLight.intensity = rimAmount * 4.8
  }

  private getCameraEffectPhase(beats: number, durationBeats: number) {
    const duration = Math.max(1, durationBeats)
    const elapsed = Math.max(0, beats - this.cameraEffectAnchorBeat)
    return (elapsed % duration) / duration
  }
}

/** Layer uses a camera-locked fullscreen plate (projectM / NDI / RTSP). */
function isVisBackdropSrc(sourceType: BuiltinLayerSourceType) {
  return (
    sourceType === 'projectM' ||
    sourceType === 'ndiStream' ||
    sourceType === 'rtspStream'
  )
}

function normalizeLayerItem(source: unknown, index: number): BuiltinLayerItem {
  const fallback = createBuiltinLayer('spheres', index)
  const input = (source ?? {}) as Partial<BuiltinLayerItem>
  return {
    id: typeof input.id === 'string' && input.id.length > 0 ? input.id : fallback.id,
    generator: builtinGeneratorTypeList.includes(input.generator as BuiltinGeneratorType)
      ? (input.generator as BuiltinGeneratorType)
      : fallback.generator,
    customModuleName:
      typeof input.customModuleName === 'string' && input.customModuleName.trim().length > 0
        ? input.customModuleName.trim()
        : fallback.customModuleName,
    customModuleCode:
      typeof input.customModuleCode === 'string'
        ? input.customModuleCode
        : fallback.customModuleCode,
    sourceType: builtinLayerSourceTypeList.includes(
      input.sourceType as BuiltinLayerSourceType
    )
      ? (input.sourceType as BuiltinLayerSourceType)
      : fallback.sourceType,
    source:
      typeof input.source === 'string'
        ? input.source.trim()
        : fallback.source,
    text:
      typeof input.text === 'string' && input.text.trim().length > 0
        ? input.text
        : fallback.text,
    mediaFit:
      input.mediaFit === 'contain' || input.mediaFit === 'cover'
        ? input.mediaFit
        : fallback.mediaFit,
    enabled: input.enabled !== false,
    density: clamp01(input.density, fallback.density),
    densityLinkSource: builtinEffectLinkSourceList.includes(
      input.densityLinkSource as BuiltinEffectLinkSource
    )
      ? (input.densityLinkSource as BuiltinEffectLinkSource)
      : fallback.densityLinkSource,
    speed: clamp01(input.speed, fallback.speed),
    speedLinkSource: builtinEffectLinkSourceList.includes(
      input.speedLinkSource as BuiltinEffectLinkSource
    )
      ? (input.speedLinkSource as BuiltinEffectLinkSource)
      : fallback.speedLinkSource,
    scale: clamp01(input.scale, fallback.scale),
    scaleLinkSource: builtinEffectLinkSourceList.includes(
      input.scaleLinkSource as BuiltinEffectLinkSource
    )
      ? (input.scaleLinkSource as BuiltinEffectLinkSource)
      : fallback.scaleLinkSource,
    quantity: clamp01(input.quantity, fallback.quantity),
    quantityLinkSource: builtinEffectLinkSourceList.includes(
      input.quantityLinkSource as BuiltinEffectLinkSource
    )
      ? (input.quantityLinkSource as BuiltinEffectLinkSource)
      : fallback.quantityLinkSource,
    variety: clamp01(input.variety, fallback.variety),
    varietyLinkSource: builtinEffectLinkSourceList.includes(
      input.varietyLinkSource as BuiltinEffectLinkSource
    )
      ? (input.varietyLinkSource as BuiltinEffectLinkSource)
      : fallback.varietyLinkSource,
    mix: clamp01(input.mix, fallback.mix),
    mixLinkSource: builtinEffectLinkSourceList.includes(
      input.mixLinkSource as BuiltinEffectLinkSource
    )
      ? (input.mixLinkSource as BuiltinEffectLinkSource)
      : fallback.mixLinkSource,
    blend: builtinBlendModeList.includes(input.blend as BuiltinBlendMode)
      ? (input.blend as BuiltinBlendMode)
      : fallback.blend,
    hueShift: clamp01(input.hueShift, fallback.hueShift),
    hueShiftLinkSource: builtinEffectLinkSourceList.includes(
      input.hueShiftLinkSource as BuiltinEffectLinkSource
    )
      ? (input.hueShiftLinkSource as BuiltinEffectLinkSource)
      : fallback.hueShiftLinkSource,
    depth: clamp01(input.depth, fallback.depth),
    depthLinkSource: builtinEffectLinkSourceList.includes(
      input.depthLinkSource as BuiltinEffectLinkSource
    )
      ? (input.depthLinkSource as BuiltinEffectLinkSource)
      : fallback.depthLinkSource,
    positionX: clampSigned(input.positionX, fallback.positionX),
    positionXLinkSource: builtinEffectLinkSourceList.includes(
      input.positionXLinkSource as BuiltinEffectLinkSource
    )
      ? (input.positionXLinkSource as BuiltinEffectLinkSource)
      : fallback.positionXLinkSource,
    positionY: clampSigned(input.positionY, fallback.positionY),
    positionYLinkSource: builtinEffectLinkSourceList.includes(
      input.positionYLinkSource as BuiltinEffectLinkSource
    )
      ? (input.positionYLinkSource as BuiltinEffectLinkSource)
      : fallback.positionYLinkSource,
    rotateX: clampSigned(input.rotateX, fallback.rotateX),
    rotateXLinkSource: builtinEffectLinkSourceList.includes(
      input.rotateXLinkSource as BuiltinEffectLinkSource
    )
      ? (input.rotateXLinkSource as BuiltinEffectLinkSource)
      : fallback.rotateXLinkSource,
    rotateY: clampSigned(input.rotateY, fallback.rotateY),
    rotateYLinkSource: builtinEffectLinkSourceList.includes(
      input.rotateYLinkSource as BuiltinEffectLinkSource
    )
      ? (input.rotateYLinkSource as BuiltinEffectLinkSource)
      : fallback.rotateYLinkSource,
  }
}

function normalizeEffectItem(source: unknown, index: number): BuiltinEffectItem {
  const fallback = createBuiltinEffect(
    builtinEffectTypeList[index % builtinEffectTypeList.length]
  )
  const input = (source ?? {}) as Partial<BuiltinEffectItem>
  return {
    id: typeof input.id === 'string' && input.id.length > 0 ? input.id : fallback.id,
    type: builtinEffectTypeList.includes(input.type as BuiltinEffectType)
      ? (input.type as BuiltinEffectType)
      : fallback.type,
    customModuleName:
      typeof input.customModuleName === 'string' && input.customModuleName.trim().length > 0
        ? input.customModuleName.trim()
        : fallback.customModuleName,
    customModuleCode:
      typeof input.customModuleCode === 'string'
        ? input.customModuleCode
        : fallback.customModuleCode,
    enabled: input.enabled !== false,
    amount: clamp01(input.amount, fallback.amount),
    linkSource: builtinEffectLinkSourceList.includes(
      input.linkSource as BuiltinEffectLinkSource
    )
      ? (input.linkSource as BuiltinEffectLinkSource)
      : fallback.linkSource,
    lightAzimuth: clamp01(input.lightAzimuth, fallback.lightAzimuth),
    lightAzimuthLinkSource: builtinEffectLinkSourceList.includes(
      input.lightAzimuthLinkSource as BuiltinEffectLinkSource
    )
      ? (input.lightAzimuthLinkSource as BuiltinEffectLinkSource)
      : fallback.lightAzimuthLinkSource,
  }
}

function normalizeCameraEffectItem(
  source: unknown,
  index: number
): BuiltinCameraEffectItem {
  const fallback = createBuiltinCameraEffect(
    builtinCameraEffectTypeList[index % builtinCameraEffectTypeList.length]
  )
  const input = (source ?? {}) as Partial<BuiltinCameraEffectItem>
  const duration = Number(input.durationBeats)
  return {
    id: typeof input.id === 'string' && input.id.length > 0 ? input.id : fallback.id,
    type: builtinCameraEffectTypeList.includes(input.type as BuiltinCameraEffectType)
      ? (input.type as BuiltinCameraEffectType)
      : fallback.type,
    enabled: input.enabled !== false,
    durationBeats:
      Number.isFinite(duration) && duration > 0
        ? Math.min(32, Math.max(1, Math.round(duration)))
        : fallback.durationBeats,
  }
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function buildLayerGeometry(layer: BuiltinLayerItem, index: number): RuntimeLayer {
  const group = new THREE.Group()
  const nodes: RuntimeNode[] = []
  const materials: THREE.Material[] = []
  const scratch: Record<string, unknown> = {}

  const size = 0.22 + layer.scale * 0.95
  scratch.proceduralSizeAtBuild = size

  const addMesh = (
    mesh:
      | THREE.Mesh
      | THREE.LineSegments
      | THREE.Line
      | THREE.Points
      | THREE.Sprite,
    amp: number
  ) => {
    group.add(mesh)
    nodes.push({
      object: mesh,
      basePosition: mesh.position.clone(),
      baseRotation: mesh.rotation.clone(),
      amplitude: amp,
    })
  }

  const createStdMat = () =>
    new THREE.MeshStandardMaterial({
      color: '#7eb6ff',
      emissive: '#2e4b6f',
      emissiveIntensity: 0.45,
      metalness: 0.08,
      roughness: 0.3,
      transparent: true,
      opacity: layer.mix,
    })

  const createLineMat = () =>
    new THREE.LineBasicMaterial({
      color: '#84c2ff',
      transparent: true,
      opacity: layer.mix,
    })

  if (layer.sourceType !== 'procedural') {
    const visBackdropLayer = isVisBackdropSrc(layer.sourceType)
    const planeWidth = visBackdropLayer ? 1 : 2 + layer.scale * 4
    const planeHeight = visBackdropLayer ? 1 : 1.2 + layer.scale * 2.4
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
    const material = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: layer.mix,
      side: THREE.DoubleSide,
      depthWrite: !visBackdropLayer,
      depthTest: !visBackdropLayer,
      toneMapped: !visBackdropLayer,
    })
    materials.push(material)
    const mesh = new THREE.Mesh(geometry, material)
    if (!visBackdropLayer) {
      mesh.position.z = -layer.depth * 1.8
    }
    mesh.frustumCulled = !visBackdropLayer
    addMesh(mesh, 0.15)
    group.position.z = -index * 0.14
    return {
      layer,
      generator: layer.generator,
      group,
      nodes,
      materials,
      baseHue: layer.hueShift,
      media: null,
      customGenerator: null,
      scratch,
    }
  }

  switch (layer.generator) {
    case 'spheres': {
      const segments = Math.max(12, Math.round(14 + layer.density * 28))
      const geometry = new THREE.SphereGeometry(size * 0.65, segments, segments)
      const material = createStdMat()
      materials.push(material)
      const count = 1 + Math.round(layer.quantity * 31)
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      const dummy = new THREE.Object3D()
      const spread = 0.18 + layer.density * 3.9
      const scaleJitter = layer.variety * 0.85
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.9
        const radius =
          count <= 1
            ? 0
            : Math.sqrt(i / Math.max(1, count - 1)) * spread * (0.55 + layer.variety * 0.85)
        dummy.position.set(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * spread * 0.65,
          Math.sin(angle) * radius
        )
        const s = 0.65 + (Math.random() - 0.5) * scaleJitter
        dummy.scale.setScalar(Math.max(0.2, s))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      addMesh(mesh, 0.14 + layer.density * 0.28)
      break
    }
    case 'cubes': {
      const geometry = new THREE.BoxGeometry(size * 1.1, size * 1.1, size * 1.1)
      const material = createStdMat()
      materials.push(material)
      const count = 1 + Math.round(layer.quantity * 31)
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      const dummy = new THREE.Object3D()
      const spread = 0.18 + layer.density * 3.9
      const scaleJitter = layer.variety * 0.8
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 1.2
        const radius =
          count <= 1
            ? 0
            : Math.sqrt(i / Math.max(1, count - 1)) * spread * (0.55 + layer.variety * 0.85)
        dummy.position.set(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * spread * 0.7,
          Math.sin(angle) * radius
        )
        dummy.rotation.set(
          Math.random() * Math.PI * layer.variety,
          Math.random() * Math.PI * layer.variety,
          Math.random() * Math.PI * layer.variety
        )
        const s = 0.62 + (Math.random() - 0.5) * scaleJitter
        dummy.scale.setScalar(Math.max(0.2, s))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      addMesh(mesh, 0.12 + layer.density * 0.28)
      break
    }
    case 'triangles': {
      const geometry = new THREE.ConeGeometry(size * 0.8, size * 1.35, 4, 1)
      const material = createStdMat()
      materials.push(material)
      const count = 1 + Math.round(layer.quantity * 31)
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      const dummy = new THREE.Object3D()
      const spread = 0.18 + layer.density * 3.9
      const scaleJitter = layer.variety * 0.8
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 1.1
        const radius =
          count <= 1
            ? 0
            : Math.sqrt(i / Math.max(1, count - 1)) * spread * (0.55 + layer.variety * 0.85)
        dummy.position.set(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * spread * 0.6,
          Math.sin(angle) * radius
        )
        dummy.rotation.set(
          Math.PI + (Math.random() - 0.5) * Math.PI * layer.variety,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * Math.PI * layer.variety
        )
        const s = 0.64 + (Math.random() - 0.5) * scaleJitter
        dummy.scale.setScalar(Math.max(0.2, s))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      addMesh(mesh, 0.12 + layer.density * 0.25)
      break
    }
    case 'beatGrid': {
      // Density controls square size: low density = larger squares.
      const segments = Math.max(10, Math.round(18 + layer.scale * 42))
      const squareSize = 1.24 - layer.density * 1.08
      const gridSize = segments * Math.max(0.09, squareSize)
      const grid = new THREE.GridHelper(gridSize, segments, '#78c3ff', '#345f8d')
      const material = createLineMat()
      materials.push(material)
      ;(grid.material as THREE.Material).dispose()
      grid.material = material
      grid.position.y = -1
      addMesh(grid, 0.1)
      const intersectionCount = (segments + 1) * (segments + 1)
      const dotGeometry = new THREE.SphereGeometry(0.026 + layer.scale * 0.024, 8, 8)
      const dotMaterial = new THREE.MeshStandardMaterial({
        color: '#8fd3ff',
        emissive: '#346a8e',
        emissiveIntensity: 0.7,
        metalness: 0.05,
        roughness: 0.44,
        transparent: true,
        opacity: Math.max(0.2, layer.mix),
      })
      materials.push(dotMaterial)
      const dots = new THREE.InstancedMesh(dotGeometry, dotMaterial, intersectionCount)
      const dummy = new THREE.Object3D()
      let dotIndex = 0
      for (let row = 0; row <= segments; row++) {
        const z = (row / Math.max(1, segments) - 0.5) * gridSize
        for (let col = 0; col <= segments; col++) {
          const x = (col / Math.max(1, segments) - 0.5) * gridSize
          dummy.position.set(x, -1, z)
          dummy.scale.setScalar(1)
          dummy.updateMatrix()
          dots.setMatrixAt(dotIndex++, dummy.matrix)
        }
      }
      dots.instanceMatrix.needsUpdate = true
      addMesh(dots, 0.14)
      scratch.beatGridSegments = segments
      scratch.beatGridSize = gridSize
      scratch.beatGridLevels = new Float32Array(intersectionCount)
      break
    }
    case 'waves': {
      const columns = Math.max(42, Math.round(72 + layer.density * 180))
      const rows = Math.max(12, Math.round(18 + layer.density * 54))
      const width = 8 + layer.scale * 8
      const depth = 5 + layer.scale * 6.5
      const segmentPairs = rows * Math.max(1, columns - 1)
      const positions = new Float32Array(segmentPairs * 2 * 3)
      const basePositions = new Float32Array(positions.length)
      let cursor = 0
      for (let row = 0; row < rows; row++) {
        const rowT = rows <= 1 ? 0 : row / (rows - 1)
        const z = (rowT - 0.5) * depth
        for (let col = 0; col < columns - 1; col++) {
          const c0 = col / Math.max(1, columns - 1)
          const c1 = (col + 1) / Math.max(1, columns - 1)
          const x0 = (c0 - 0.5) * width
          const x1 = (c1 - 0.5) * width
          positions[cursor] = x0
          positions[cursor + 1] = -1
          positions[cursor + 2] = z
          basePositions[cursor] = x0
          basePositions[cursor + 1] = -1
          basePositions[cursor + 2] = z
          cursor += 3
          positions[cursor] = x1
          positions[cursor + 1] = -1
          positions[cursor + 2] = z
          basePositions[cursor] = x1
          basePositions[cursor + 1] = -1
          basePositions[cursor + 2] = z
          cursor += 3
        }
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = new THREE.LineBasicMaterial({
        color: '#73b6ff',
        transparent: true,
        opacity: layer.mix,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      materials.push(material)
      const lines = new THREE.LineSegments(geometry, material)
      addMesh(lines, 0.2)
      scratch.wavesBasePositions = basePositions
      scratch.wavesRows = rows
      scratch.wavesColumns = columns
      scratch.wavesWidth = width
      scratch.wavesDepth = depth
      break
    }
    case 'stars': {
      const count = Math.max(450, Math.round(880 + layer.density * 3600))
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 24
        positions[i * 3 + 1] = (Math.random() - 0.5) * 14
        positions[i * 3 + 2] = -Math.random() * 120
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = new THREE.PointsMaterial({
        color: '#b7e4ff',
        size: 0.03 + layer.scale * 0.05,
        transparent: true,
        opacity: layer.mix,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      materials.push(material)
      const points = new THREE.Points(geometry, material)
      scratch.starFieldDepth = 120
      addMesh(points, 0.18)
      break
    }
    case 'particles': {
      const count = Math.max(280, Math.round(520 + layer.density * 2400))
      const emitterCount = Math.max(1, Math.min(6, 1 + Math.round(layer.quantity * 5)))
      const emitters = new Float32Array(emitterCount * 3)
      const emitterRadius = 0.45 + layer.variety * 2.4
      for (let i = 0; i < emitterCount; i++) {
        const a = (i / emitterCount) * Math.PI * 2
        emitters[i * 3] = Math.cos(a) * emitterRadius
        emitters[i * 3 + 1] = (Math.random() - 0.5) * (0.6 + layer.variety)
        emitters[i * 3 + 2] = Math.sin(a) * emitterRadius
      }

      const positions = new Float32Array(count * 3)
      const velocities = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const hueOffsets = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        const e = (i % emitterCount) * 3
        positions[i * 3] = emitters[e] + (Math.random() - 0.5) * 2.2
        positions[i * 3 + 1] = emitters[e + 1] + (Math.random() - 0.5) * 2.2
        positions[i * 3 + 2] = emitters[e + 2] + (Math.random() - 0.5) * 2.2
        velocities[i * 3] = (Math.random() - 0.5) * 0.08
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.08
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08
        hueOffsets[i] = Math.random()
        const seedColor = new THREE.Color().setHSL(hueOffsets[i], 0.85, 0.58)
        colors[i * 3] = seedColor.r
        colors[i * 3 + 1] = seedColor.g
        colors[i * 3 + 2] = seedColor.b
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      const pointsMaterial = new THREE.PointsMaterial({
        color: '#ffffff',
        size: 0.02 + layer.scale * 0.055,
        transparent: true,
        opacity: layer.mix,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
      })
      materials.push(pointsMaterial)
      const points = new THREE.Points(geometry, pointsMaterial)
      addMesh(points, 0.22)

      const maxSegments = Math.max(128, Math.round(count * 1.9))
      const linkPositions = new Float32Array(maxSegments * 6)
      const linksGeometry = new THREE.BufferGeometry()
      linksGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3))
      linksGeometry.setDrawRange(0, 0)
      const linksMaterial = new THREE.LineBasicMaterial({
        color: '#8fd9ff',
        transparent: true,
        opacity: layer.mix * 0.35,
        blending: THREE.AdditiveBlending,
      })
      materials.push(linksMaterial)
      const links = new THREE.LineSegments(linksGeometry, linksMaterial)
      addMesh(links, 0)

      scratch.particleEmitters = emitters
      scratch.particleVelocities = velocities
      scratch.particleLinkMaxSegments = maxSegments
      scratch.particleHueOffsets = hueOffsets
      break
    }
    case 'nebula': {
      const cloudCount = Math.max(24, Math.round(30 + layer.density * 84))
      const clusterCount = Math.max(4, Math.round(5 + layer.density * 8))
      const basePositions = new Float32Array(cloudCount * 3)
      const drift = new Float32Array(cloudCount * 3)
      const scales = new Float32Array(cloudCount)
      const hueOffsets = new Float32Array(cloudCount)
      const centers: THREE.Vector3[] = []
      for (let i = 0; i < clusterCount; i++) {
        centers.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * (8 + layer.scale * 10),
            (Math.random() - 0.5) * (4 + layer.scale * 4.5),
            (Math.random() - 0.5) * (12 + layer.scale * 12)
          )
        )
      }
      const cloudTexture = createNebulaCloudTexture()
      for (let i = 0; i < cloudCount; i++) {
        const center = centers[i % centers.length]
        const spread = 0.9 + Math.random() * (1.4 + layer.scale * 2.6)
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(Math.min(1, Math.max(-1, Math.random() * 2 - 1)))
        const r = spread * Math.cbrt(Math.random()) * 2.3
        const x = center.x + Math.sin(phi) * Math.cos(theta) * r
        const y = center.y + Math.sin(phi) * Math.sin(theta) * r * 0.68
        const z = center.z + Math.cos(phi) * r
        basePositions[i * 3] = x
        basePositions[i * 3 + 1] = y
        basePositions[i * 3 + 2] = z
        drift[i * 3] = (Math.random() - 0.5) * 0.6
        drift[i * 3 + 1] = (Math.random() - 0.5) * 0.42
        drift[i * 3 + 2] = (Math.random() - 0.5) * 0.56
        scales[i] = (1.8 + Math.random() * 4.8) * (0.7 + layer.scale * 1.15)
        hueOffsets[i] = Math.random()
        const color = createNebulaPaletteColor()
        const material = new THREE.SpriteMaterial({
          map: cloudTexture,
          color,
          transparent: true,
          opacity: Math.max(0.08, layer.mix * (0.22 + Math.random() * 0.2)),
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
        })
        materials.push(material)
        const sprite = new THREE.Sprite(material)
        const cloudScale = scales[i]
        sprite.position.set(x, y, z)
        sprite.scale.set(cloudScale, cloudScale, 1)
        sprite.frustumCulled = false
        addMesh(sprite, 0.05)
      }
      scratch.nebulaBasePositions = basePositions
      scratch.nebulaDrift = drift
      scratch.nebulaScales = scales
      scratch.nebulaHueOffsets = hueOffsets
      break
    }
    case 'spectrograph': {
      const barCount = Math.max(48, Math.round(56 + layer.density * 136))
      const barWidth = 0.04 + layer.scale * 0.07
      const geometry = new THREE.BoxGeometry(barWidth, 1, barWidth)
      const material = new THREE.MeshStandardMaterial({
        color: '#7ce7ff',
        emissive: '#226678',
        emissiveIntensity: 0.72,
        metalness: 0.02,
        roughness: 0.35,
        transparent: true,
        opacity: layer.mix,
      })
      materials.push(material)
      const mesh = new THREE.InstancedMesh(geometry, material, barCount)
      const dummy = new THREE.Object3D()
      const spread = 3 + layer.scale * 2.4
      for (let i = 0; i < barCount; i++) {
        const t = barCount <= 1 ? 0 : i / (barCount - 1)
        const h = 0.04
        dummy.position.set((t - 0.5) * spread, -1 + h * 0.5, 0)
        dummy.scale.set(1, h, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      addMesh(mesh, 0.04)
      scratch.spectrographLevels = new Float32Array(barCount)
      break
    }
    case 'audioRing': {
      const barCount = Math.max(48, Math.round(72 + layer.density * 180))
      const barWidth = 0.03 + layer.scale * 0.055
      const geometry = new THREE.BoxGeometry(barWidth, 1, barWidth)
      const material = new THREE.MeshStandardMaterial({
        color: '#8fd9ff',
        emissive: '#275d82',
        emissiveIntensity: 0.72,
        metalness: 0.05,
        roughness: 0.36,
        transparent: true,
        opacity: layer.mix,
      })
      materials.push(material)
      const mesh = new THREE.InstancedMesh(geometry, material, barCount)
      const angles = new Float32Array(barCount)
      const levels = new Float32Array(barCount)
      const radius = 0.85 + layer.scale * 2.1
      const dummy = new THREE.Object3D()
      for (let i = 0; i < barCount; i++) {
        const t = barCount <= 1 ? 0 : i / barCount
        const angle = t * Math.PI * 2
        angles[i] = angle
        const h = 0.05
        dummy.position.set(Math.cos(angle) * radius, -0.9 + h * 0.5, Math.sin(angle) * radius)
        dummy.rotation.y = -angle
        dummy.scale.set(1, h, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      addMesh(mesh, 0.08)
      scratch.audioRingLevels = levels
      scratch.audioRingAngles = angles
      scratch.audioRingRadius = radius
      break
    }
    case 'audioTunnel': {
      const slices = Math.max(10, Math.round(14 + layer.density * 18))
      const segments = Math.max(18, Math.round(24 + layer.density * 34))
      const count = slices * segments
      const geometry = new THREE.SphereGeometry(0.04 + layer.scale * 0.05, 6, 6)
      const material = new THREE.MeshStandardMaterial({
        color: '#7bd2ff',
        emissive: '#215778',
        emissiveIntensity: 0.56,
        metalness: 0.06,
        roughness: 0.42,
        transparent: true,
        opacity: layer.mix,
      })
      materials.push(material)
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      const depths = new Float32Array(slices)
      const nearZ = 2.4
      const farZ = -36
      for (let i = 0; i < slices; i++) {
        depths[i] = farZ + (i / Math.max(1, slices - 1)) * (nearZ - farZ)
      }
      const dummy = new THREE.Object3D()
      for (let i = 0; i < count; i++) {
        const slice = Math.floor(i / segments)
        const segment = i % segments
        const angle = (segment / segments) * Math.PI * 2
        const baseRadius = 1 + layer.scale * 1.8
        dummy.position.set(
          Math.cos(angle) * baseRadius,
          Math.sin(angle) * baseRadius * 0.68,
          depths[slice]
        )
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      addMesh(mesh, 0.1)
      scratch.audioTunnelSlices = slices
      scratch.audioTunnelSegments = segments
      scratch.audioTunnelDepths = depths
      scratch.audioTunnelNearZ = nearZ
      scratch.audioTunnelFarZ = farZ
      scratch.audioTunnelRadius = 1 + layer.scale * 1.8
      scratch.audioTunnelLevels = new Float32Array(segments)
      break
    }
    case 'oscilloscope3D': {
      const pointCount = Math.max(96, Math.round(128 + layer.density * 320))
      const positions = new Float32Array(pointCount * 3)
      for (let i = 0; i < pointCount; i++) {
        const t = pointCount <= 1 ? 0 : i / (pointCount - 1)
        positions[i * 3] = (t - 0.5) * (4 + layer.scale * 4.5)
        positions[i * 3 + 1] = -0.4
        positions[i * 3 + 2] = 0
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = new THREE.LineBasicMaterial({
        color: '#8ef5ff',
        transparent: true,
        opacity: layer.mix,
      })
      materials.push(material)
      const line = new THREE.Line(geometry, material)
      addMesh(line, 0.08)
      scratch.oscilloscopeLevels = new Float32Array(pointCount)
      break
    }
    case 'torusKnot': {
      const tubeSegments = Math.max(120, Math.round(180 + layer.density * 520))
      const radialSegments = Math.max(8, Math.round(12 + layer.density * 26))
      const geometry = new THREE.TorusKnotGeometry(
        0.72 + layer.scale * 0.65,
        0.16 + layer.scale * 0.22,
        tubeSegments,
        radialSegments,
        2,
        5
      )
      const material = createStdMat()
      materials.push(material)
      const mesh = new THREE.Mesh(geometry, material)
      addMesh(mesh, 0.12 + layer.density * 0.22)
      scratch.torusKnotBaseScale = 1
      break
    }
    case 'fftRibbon': {
      const cols = Math.max(48, Math.round(72 + layer.density * 188))
      const rows = Math.max(10, Math.round(16 + layer.density * 44))
      const width = 6 + layer.scale * 5.2
      const depth = 2 + layer.scale * 3.5
      const geometry = new THREE.PlaneGeometry(width, depth, cols - 1, rows - 1)
      geometry.rotateX(-Math.PI / 2)
      const attr = geometry.getAttribute('position') as THREE.BufferAttribute
      const base = new Float32Array(attr.array.length)
      for (let i = 0; i < attr.array.length; i++) {
        base[i] = Number(attr.array[i]) || 0
      }
      const material = new THREE.MeshStandardMaterial({
        color: '#7fe4ff',
        emissive: '#295f7a',
        emissiveIntensity: 0.48,
        metalness: 0.03,
        roughness: 0.42,
        transparent: true,
        opacity: layer.mix,
        wireframe: true,
      })
      materials.push(material)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.y = -1.1
      addMesh(mesh, 0.12)
      scratch.fftRibbonCols = cols
      scratch.fftRibbonRows = rows
      scratch.fftRibbonBase = base
      scratch.fftRibbonLevels = new Float32Array(cols)
      break
    }
    case 'voxelPulse': {
      const grid = Math.max(10, Math.round(12 + layer.density * 18))
      const count = grid * grid
      const cell = 0.05 + layer.scale * 0.08
      const geometry = new THREE.BoxGeometry(cell, 1, cell)
      const material = new THREE.MeshStandardMaterial({
        color: '#8bdcff',
        emissive: '#265d7c',
        emissiveIntensity: 0.65,
        metalness: 0.04,
        roughness: 0.38,
        transparent: true,
        opacity: layer.mix,
      })
      materials.push(material)
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      const dummy = new THREE.Object3D()
      const span = 2.4 + layer.scale * 3.2
      for (let i = 0; i < count; i++) {
        const gx = i % grid
        const gz = Math.floor(i / grid)
        const x = ((gx / Math.max(1, grid - 1)) - 0.5) * span
        const z = ((gz / Math.max(1, grid - 1)) - 0.5) * span
        const h = 0.03
        dummy.position.set(x, -1 + h * 0.5, z)
        dummy.scale.set(1, h, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      addMesh(mesh, 0.08)
      scratch.voxelGrid = grid
      scratch.voxelSpan = span
      scratch.voxelLevels = new Float32Array(count)
      break
    }
    case 'importedModel': {
      const placeholderMaterial = new THREE.MeshStandardMaterial({
        color: '#7fbce7',
        emissive: '#204864',
        emissiveIntensity: 0.42,
        metalness: 0.09,
        roughness: 0.36,
        transparent: true,
        opacity: Math.max(0.22, layer.mix * 0.75),
        wireframe: true,
      })
      materials.push(placeholderMaterial)
      const placeholder = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.65 + layer.scale * 0.9, 1),
        placeholderMaterial
      )
      addMesh(placeholder, 0.08)
      scratch.modelPlaceholder = placeholder
      scratch.modelSourceLoaded = ''
      scratch.modelLoading = false
      scratch.modelError = ''
      break
    }
    case 'spikeBall': {
      const geometry = new THREE.IcosahedronGeometry(size * 0.78, 4)
      const base = geometry.attributes.position.array as Float32Array
      const basePositions = new Float32Array(base.length)
      const vertexCount = base.length / 3
      const anchorCount = Math.max(18, Math.round(22 + layer.density * 44))
      const anchorDirections = new Float32Array(anchorCount * 3)
      const anchorVariety = new Float32Array(anchorCount)
      const influence = new Float32Array(vertexCount * anchorCount)
      const normal = new THREE.Vector3()
      for (let i = 0; i < base.length; i++) {
        basePositions[i] = base[i]
      }
      for (let i = 0; i < anchorCount; i++) {
        const dir = fibonacciSphereDirection(i, anchorCount)
        anchorDirections[i * 3] = dir.x
        anchorDirections[i * 3 + 1] = dir.y
        anchorDirections[i * 3 + 2] = dir.z
        anchorVariety[i] = 0.45 + Math.random() * 0.55
      }
      for (let i = 0; i < vertexCount; i++) {
        normal.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]).normalize()
        let strongest = 0
        let strongestIndex = 0
        for (let j = 0; j < anchorCount; j++) {
          const dot =
            normal.x * anchorDirections[j * 3] +
            normal.y * anchorDirections[j * 3 + 1] +
            normal.z * anchorDirections[j * 3 + 2]
          const lifted = Math.max(0, (dot - 0.89) / 0.11)
          const weight = lifted > 0 ? Math.pow(lifted, 3.8) : 0
          influence[i * anchorCount + j] = weight
          if (weight > strongest) {
            strongest = weight
            strongestIndex = j
          }
        }
        if (strongest < 1e-6) {
          influence[i * anchorCount + strongestIndex] = 1
        }
      }
      const material = createStdMat()
      materials.push(material)
      const mesh = new THREE.Mesh(geometry, material)
      addMesh(mesh, 0.2)
      scratch.spikeBallBase = basePositions
      scratch.spikeBallAnchorDirections = anchorDirections
      scratch.spikeBallInfluence = influence
      scratch.spikeBallAnchorVariety = anchorVariety
      scratch.spikeBallAnchorLevels = new Float32Array(anchorCount)
      break
    }
    case 'geodesic': {
      const geometry = new THREE.IcosahedronGeometry(size * 0.9, 2)
      const wire = new THREE.WireframeGeometry(geometry)
      const material = createLineMat()
      materials.push(material)
      const mesh = new THREE.LineSegments(wire, material)
      addMesh(mesh, 0.15)
      break
    }
    case 'legacyTextParticles': {
      const count = Math.max(540, Math.round(800 + layer.density * 3400))
      const words = parseLegacyTextWords(layer.text)
      const textSize = 0.58 + layer.scale * 0.95
      const targets = buildTextPointTargets(words[0], textSize, count)
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 9.5
        positions[i * 3 + 1] = (Math.random() - 0.5) * 4.6
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1.8
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = new THREE.PointsMaterial({
        color: '#ffd37f',
        size: 0.02 + layer.scale * 0.06,
        transparent: true,
        opacity: layer.mix,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      materials.push(material)
      const points = new THREE.Points(geometry, material)
      addMesh(points, 0.12 + layer.density * 0.23)
      scratch.textMorphWords = words
      scratch.textMorphWordIndex = 0
      scratch.textMorphTargets = targets
      scratch.textMorphLastSwitchBeat = -999
      scratch.textMorphSize = textSize
      break
    }
    case 'legacyTextSpin': {
      const text = sanitizeLegacyText(layer.text)
      const textSize = 0.45 + layer.scale * 0.9
      const font = fonts.helvetiker_bold ?? fallbackFont
      const shapes = font.generateShapes(text, textSize)
      const geometry = new THREE.ShapeGeometry(shapes, 6)
      geometry.computeBoundingBox()
      const bb = geometry.boundingBox
      if (bb) {
        const centerX = (bb.min.x + bb.max.x) * 0.5
        const centerY = (bb.min.y + bb.max.y) * 0.5
        geometry.translate(-centerX, -centerY, 0)
      }
      const material = createStdMat()
      materials.push(material)
      const mesh = new THREE.Mesh(geometry, material)
      addMesh(mesh, 0.14 + layer.density * 0.2)

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: '#aee0ff',
        transparent: true,
        opacity: layer.mix * 0.9,
      })
      materials.push(edgeMaterial)
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial)
      edges.position.z = 0.01
      addMesh(edges, 0.11)
      scratch.textSpinBaseY = mesh.position.y
      break
    }
    case 'legacySpaceTunnel': {
      const count = Math.max(220, Math.round(540 + layer.density * 2500))
      const width = 5 + layer.scale * 9
      const height = 3.4 + layer.scale * 5.4
      const nearZ = 2
      const farZ = -84
      const geometry = new THREE.CylinderGeometry(0.032, 0.032, 0.34, 8)
      geometry.rotateX(Math.PI / 2)
      const material = new THREE.MeshStandardMaterial({
        color: '#a4ccff',
        emissive: '#416e99',
        emissiveIntensity: 0.5,
        metalness: 0.08,
        roughness: 0.28,
        transparent: true,
        opacity: layer.mix,
      })
      materials.push(material)
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      const positions = new Float32Array(count * 3)
      const dummy = new THREE.Object3D()
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * width
        const y = (Math.random() - 0.5) * height
        const z = farZ + Math.random() * (nearZ - farZ)
        positions[i * 3] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z
        dummy.position.set(x, y, z)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      addMesh(mesh, 0.08 + layer.density * 0.18)
      scratch.spaceTunnelPositions = positions
      scratch.spaceTunnelBounds = {
        width,
        height,
        nearZ,
        farZ,
      }
      break
    }
    case 'customModule': {
      // The custom module may populate geometry during runtime build hook.
      break
    }
  }

  group.position.z = -index * 0.12
  return {
    layer,
    generator: layer.generator,
    group,
    nodes,
    materials,
    baseHue: layer.hueShift,
    media: null,
    customGenerator: null,
    scratch,
  }
}

let nebulaCloudTexture: THREE.Texture | null | undefined

function createNebulaCloudTexture() {
  if (nebulaCloudTexture !== undefined) {
    return nebulaCloudTexture
  }
  if (typeof document === 'undefined') {
    nebulaCloudTexture = null
    return nebulaCloudTexture
  }
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    nebulaCloudTexture = null
    return nebulaCloudTexture
  }
  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(0.75, 'rgba(255,255,255,0.15)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  nebulaCloudTexture = texture
  return texture
}

function createNebulaPaletteColor() {
  const palette = ['#7da8ff', '#9a7dff', '#e17cff', '#7ce7ff', '#ff9bc4']
  const choice = palette[Math.floor(Math.random() * palette.length)] ?? '#9a7dff'
  return new THREE.Color(choice)
}

function fibonacciSphereDirection(index: number, total: number) {
  const count = Math.max(1, total)
  const i = Math.max(0, Math.min(count - 1, index))
  const phi = Math.acos(1 - (2 * (i + 0.5)) / count)
  const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)
  const x = Math.cos(theta) * Math.sin(phi)
  const y = Math.sin(theta) * Math.sin(phi)
  const z = Math.cos(phi)
  return new THREE.Vector3(x, y, z).normalize()
}

function sanitizeLegacyText(text: string) {
  const trimmed = text.trim()
  return trimmed.length > 0 ? trimmed : 'Captivate'
}

function parseLegacyTextWords(text: string): string[] {
  const source = sanitizeLegacyText(text)
  const parsed = source
    .split(/\r?\n|\|/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
  return parsed.length > 0 ? parsed : ['Captivate']
}

function buildTextPointTargets(text: string, size: number, count: number): Float32Array {
  const safeText = sanitizeLegacyText(text)
  const font = fonts.helvetiker_bold ?? fallbackFont
  const shapes = font.generateShapes(safeText, size)

  const paths: Array<THREE.Shape | THREE.Path> = []
  for (const shape of shapes) {
    paths.push(shape)
    for (const hole of shape.holes ?? []) {
      paths.push(hole)
    }
  }
  if (paths.length === 0) {
    return new Float32Array(count * 3)
  }

  const geometry = new THREE.ShapeGeometry(shapes)
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  geometry.dispose()
  const width = bb ? bb.max.x - bb.min.x : 0
  const height = bb ? bb.max.y - bb.min.y : 0
  const offsetX = -width / 2
  const offsetY = -height / 2

  const totalLength = paths.reduce((sum, path) => sum + path.getLength(), 0.0001)
  const counts: number[] = []
  let assigned = 0
  for (let i = 0; i < paths.length; i++) {
    if (i === paths.length - 1) {
      counts.push(Math.max(1, count - assigned))
      break
    }
    const proportional = Math.max(
      1,
      Math.floor((paths[i].getLength() / totalLength) * count)
    )
    counts.push(proportional)
    assigned += proportional
  }

  const points: THREE.Vector3[] = []
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    const sampleCount = Math.max(1, counts[i])
    const sampled = path.getSpacedPoints(sampleCount)
    for (const point of sampled) {
      points.push(new THREE.Vector3(point.x + offsetX, point.y + offsetY, 0))
    }
  }
  if (points.length === 0) {
    return new Float32Array(count * 3)
  }

  const result = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const p = points[i % points.length]
    result[i * 3] = p.x
    result[i * 3 + 1] = p.y
    result[i * 3 + 2] = 0
  }
  return result
}

function getPrimaryPositionAxis(
  params: UpdateResource['params'],
  axis: 'x' | 'y' | 'z'
) {
  if (axis === 'x') {
    // Prefer pan/position sync controls when available.
    if (Number.isFinite(params.xAxis)) {
      return clamp01(params.xAxis, 0.5)
    }
    return clamp01(params.x, 0.5)
  }
  if (axis === 'y') {
    if (Number.isFinite(params.yAxis)) {
      return clamp01(params.yAxis, 0.5)
    }
    return clamp01(params.y, 0.5)
  }
  // Favor depth window if present, then z, then keep centered.
  if (Number.isFinite(params.depth)) {
    return clamp01(params.depth, 0.5)
  }
  return clamp01(params.z, 0.5)
}

function clamp01(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(1, Math.max(0, numeric))
}

function clampSigned(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(1, Math.max(-1, numeric))
}

function mapBlendMode(mode: BuiltinBlendMode) {
  if (mode === 'add' || mode === 'screen' || mode === 'dodge') {
    return THREE.AdditiveBlending
  }
  if (mode === 'multiply' || mode === 'overlay') {
    return THREE.MultiplyBlending
  }
  return THREE.NormalBlending
}

function isQuantitySensitiveGenerator(generator: BuiltinGeneratorType) {
  return (
    generator === 'spheres' ||
    generator === 'cubes' ||
    generator === 'triangles' ||
    generator === 'stars' ||
    generator === 'particles' ||
    generator === 'nebula'
  )
}

function isColorMaterial(
  material: THREE.Material
): material is
  | THREE.MeshStandardMaterial
  | THREE.MeshBasicMaterial
  | THREE.LineBasicMaterial
  | THREE.PointsMaterial {
  return 'color' in material
}

function applyColorFx(
  color: THREE.Color,
  invert: number,
  posterize: number,
  target: THREE.Color
) {
  const c = target.copy(color)
  if (invert > 0.001) {
    c.r = mix(c.r, 1 - c.r, invert)
    c.g = mix(c.g, 1 - c.g, invert)
    c.b = mix(c.b, 1 - c.b, invert)
  }
  if (posterize > 0.001) {
    const levels = Math.max(2, Math.round(mix(8, 3, posterize)))
    c.r = Math.round(c.r * levels) / levels
    c.g = Math.round(c.g * levels) / levels
    c.b = Math.round(c.b * levels) / levels
  }
  return c
}

function evaluateCameraEffect(
  type: BuiltinCameraEffectType,
  phase: number
) {
  const angle = phase * Math.PI * 2
  const result = {
    x: 0,
    y: 0,
    z: 0,
    fov: 0,
    lookAtX: 0,
    lookAtY: 0,
  }

  if (type === 'zoom') {
    const cycle = Math.sin(angle)
    result.z = -0.65 - cycle * 0.75
    result.fov = cycle * 6.4
    return result
  }
  if (type === 'orbit') {
    // Single 360° loop on a tilted plane (phase 0 and 1 match for a seamless cycle).
    const nx = 0.28
    const ny = 0.82
    const nz = 0.5
    const invLen = 1 / Math.hypot(nx, ny, nz)
    const nxu = nx * invLen
    const nyu = ny * invLen
    const nzu = nz * invLen
    // Orthonormal tangents: e = normalize(up × n), f = n × e
    let ex = nzu
    let ey = 0
    let ez = -nxu
    let eLen = Math.hypot(ex, ey, ez)
    if (eLen < 1e-4) {
      ex = 0
      ey = nzu
      ez = -nyu
      eLen = Math.hypot(ex, ey, ez)
    }
    const invELen = 1 / eLen
    ex *= invELen
    ey *= invELen
    ez *= invELen
    const fx = nyu * ez - nzu * ey
    const fy = nzu * ex - nxu * ez
    const fz = nxu * ey - nyu * ex
    const radius = 1.12
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    result.x = (ex * c + fx * s) * radius
    result.y = (ey * c + fy * s) * radius
    result.z = (ez * c + fz * s) * radius
    result.lookAtX = 0
    result.lookAtY = 0
    return result
  }
  if (type === 'pan') {
    result.x = Math.sin(angle) * 1.5
    result.z = Math.cos(angle) * 0.3
    result.lookAtX = -Math.sin(angle) * 0.3
    return result
  }
  if (type === 'tilt') {
    result.y = Math.sin(angle) * 1.15
    result.z = Math.cos(angle) * 0.18
    result.lookAtY = Math.sin(angle) * 0.34
    return result
  }
  if (type === 'flyAround') {
    result.x = Math.cos(angle) * 1.35
    result.y = Math.sin(angle * 3) * 0.6
    result.z = Math.sin(angle * 2) * 0.72
    result.lookAtX = Math.sin(angle) * 0.3
    result.lookAtY = Math.sin(angle * 2) * 0.24
    return result
  }
  // Deterministic looped shake to avoid visual seams.
  result.x =
    Math.sin(angle * 5.0) * 0.09 +
    Math.sin(angle * 9.0 + Math.PI / 4) * 0.03
  result.y =
    Math.cos(angle * 6.0 + Math.PI / 7) * 0.08 +
    Math.sin(angle * 10.0 + Math.PI / 5) * 0.025
  result.z = Math.sin(angle * 4.0 + Math.PI / 9) * 0.06
  result.fov = Math.sin(angle * 8.0) * 1.6
  return result
}

type SpectrumSampler = {
  hasSpectrum: boolean
  average: number
  sampleAt: (t: number) => number
}

function createSpectrumSampler(audio: UpdateResource['audio']): SpectrumSampler {
  const bins = audio.spectrum
  const hasSpectrum = audio.enabled && bins.length > 0
  if (!hasSpectrum) {
    return {
      hasSpectrum: false,
      average: 0,
      sampleAt: () => 0,
    }
  }

  let total = 0
  let peak = 0
  for (let i = 0; i < bins.length; i++) {
    const value = clamp01(bins[i] ?? 0, 0)
    total += value
    peak = Math.max(peak, value)
  }
  const mean = total / Math.max(1, bins.length)
  const noiseFloor = Math.max(0.004, mean * 0.18, peak * 0.03)

  let effectiveMaxIndex = bins.length - 1
  while (
    effectiveMaxIndex > 8 &&
    clamp01(bins[effectiveMaxIndex] ?? 0, 0) <= noiseFloor
  ) {
    effectiveMaxIndex--
  }
  const minCoverageIndex = Math.max(10, Math.floor((bins.length - 1) * 0.18))
  effectiveMaxIndex = Math.max(minCoverageIndex, effectiveMaxIndex)

  let effectiveSum = 0
  for (let i = 0; i <= effectiveMaxIndex; i++) {
    effectiveSum += clamp01(bins[i] ?? 0, 0)
  }
  const average = effectiveSum / Math.max(1, effectiveMaxIndex + 1)

  const readSmoothed = (index: number) => {
    const clamped = Math.min(effectiveMaxIndex, Math.max(0, index))
    const left = Math.max(0, clamped - 1)
    const right = Math.min(effectiveMaxIndex, clamped + 1)
    const a = clamp01(bins[left] ?? 0, 0)
    const b = clamp01(bins[clamped] ?? 0, 0)
    const c = clamp01(bins[right] ?? 0, 0)
    return a * 0.2 + b * 0.6 + c * 0.2
  }

  return {
    hasSpectrum: true,
    average,
    sampleAt: (t: number) => {
      const clampedT = clamp01(t, 0)
      const cursor = clampedT * effectiveMaxIndex
      const i0 = Math.floor(cursor)
      const i1 = Math.min(effectiveMaxIndex, i0 + 1)
      const blend = cursor - i0
      const v0 = readSmoothed(i0)
      const v1 = readSmoothed(i1)
      return v0 + (v1 - v0) * blend
    },
  }
}

function getScratchObject3D(
  runtimeLayer: RuntimeLayer,
  key: string
): THREE.Object3D {
  const cached = runtimeLayer.scratch[key]
  if (cached instanceof THREE.Object3D) {
    return cached
  }
  const next = new THREE.Object3D()
  runtimeLayer.scratch[key] = next
  return next
}

function getScratchVector3(
  runtimeLayer: RuntimeLayer,
  key: string
): THREE.Vector3 {
  const cached = runtimeLayer.scratch[key]
  if (cached instanceof THREE.Vector3) {
    return cached
  }
  const next = new THREE.Vector3()
  runtimeLayer.scratch[key] = next
  return next
}

/** Mesh footprint baked at build from `size`; runtime scale slider rescales `group`. */
const LAYER_SCALE_GROUP_FACTOR_GENERATORS = new Set<BuiltinGeneratorType>([
  'spheres',
  'cubes',
  'triangles',
  'stars',
  'geodesic',
  'torusKnot',
  'importedModel',
  'legacyTextParticles',
  'legacySpaceTunnel',
])

function proceduralBuiltSizeScaleFactor(
  runtimeLayer: RuntimeLayer,
  layer: BuiltinLayerItem
): number {
  const build = Number(runtimeLayer.scratch.proceduralSizeAtBuild)
  const sizeNow = 0.22 + layer.scale * 0.95
  if (!Number.isFinite(build) || build <= 1e-8) {
    return 1
  }
  return sizeNow / build
}

function syncProceduralLayerGroupScale(
  runtimeLayer: RuntimeLayer,
  layer: BuiltinLayerItem
) {
  if (layer.sourceType !== 'procedural') {
    return
  }
  const gen = runtimeLayer.generator
  if (!proceduralLayerControlSupport[gen].scale) {
    runtimeLayer.group.scale.set(1, 1, 1)
    return
  }
  if (gen === 'beatGrid' || gen === 'legacyTextSpin') {
    return
  }
  const factor = proceduralBuiltSizeScaleFactor(runtimeLayer, layer)
  if (LAYER_SCALE_GROUP_FACTOR_GENERATORS.has(gen)) {
    runtimeLayer.group.scale.setScalar(factor)
  } else {
    runtimeLayer.group.scale.set(1, 1, 1)
  }
}

function updateLayerGeneratorBehavior(
  runtimeLayer: RuntimeLayer,
  input: {
    dtSec: number
    clockSec: number
    beats: number
    beatPulse: number
    speed: number
    audio: UpdateResource['audio']
  }
) {
  const { generator } = runtimeLayer
  if (runtimeLayer.nodes.length === 0) {
    return
  }
  const spectrum = createSpectrumSampler(input.audio)

  if (generator === 'spikeBall') {
    const meshNode = runtimeLayer.nodes[0]
    if (!(meshNode?.object instanceof THREE.Mesh)) {
      return
    }
    const mesh = meshNode.object as THREE.Mesh
    const geometry = mesh.geometry as THREE.BufferGeometry
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const base = runtimeLayer.scratch.spikeBallBase as Float32Array | undefined
    const influence = runtimeLayer.scratch.spikeBallInfluence as
      | Float32Array
      | undefined
    const anchorVariety = runtimeLayer.scratch.spikeBallAnchorVariety as
      | Float32Array
      | undefined
    const anchorLevels = runtimeLayer.scratch.spikeBallAnchorLevels as
      | Float32Array
      | undefined
    if (
      !attr ||
      !base ||
      !influence ||
      !anchorVariety ||
      !anchorLevels ||
      base.length !== attr.count * 3
    ) {
      return
    }
    const anchorCount = anchorLevels.length
    if (influence.length !== attr.count * anchorCount || anchorVariety.length !== anchorCount) {
      return
    }
    const rise = clamp01(input.dtSec * 12, 1)
    const fall = clamp01(input.dtSec * 4.8, 1)
    const cachedSpikeLengths = runtimeLayer.scratch.spikeBallSpikeLengths as
      | Float32Array
      | undefined
    const spikeLengths =
      cachedSpikeLengths && cachedSpikeLengths.length === anchorCount
        ? cachedSpikeLengths
        : new Float32Array(anchorCount)
    runtimeLayer.scratch.spikeBallSpikeLengths = spikeLengths
    for (let i = 0; i < anchorCount; i++) {
      const t = anchorCount <= 1 ? 0 : i / (anchorCount - 1)
      const sampled = spectrum.hasSpectrum
        ? spectrum.sampleAt(t)
        : input.beatPulse * (0.26 + t * 0.2)
      const target = Math.pow(clamp01(sampled, 0), 0.68)
      const current = anchorLevels[i] ?? 0
      anchorLevels[i] =
        target >= current
          ? current + (target - current) * rise
          : current + (target - current) * fall
      spikeLengths[i] =
        (0.03 + anchorVariety[i] * (0.09 + runtimeLayer.layer.variety * 0.52)) +
        anchorLevels[i] * (0.95 + runtimeLayer.layer.scale * 2.85) +
        input.beatPulse * 0.24
    }

    const breathe = 0.012 + Math.sin(input.clockSec * (0.5 + input.speed)) * 0.01
    const normal = getScratchVector3(runtimeLayer, '__tmpSpikeBallNormal')
    for (let i = 0; i < attr.count; i++) {
      const x = base[i * 3]
      const y = base[i * 3 + 1]
      const z = base[i * 3 + 2]
      normal.set(x, y, z).normalize()
      let displacement = breathe
      const offset = i * anchorCount
      for (let j = 0; j < anchorCount; j++) {
        const weight = influence[offset + j]
        if (weight <= 0) continue
        displacement += weight * spikeLengths[j]
      }
      attr.setXYZ(
        i,
        x + normal.x * displacement,
        y + normal.y * displacement,
        z + normal.z * displacement
      )
    }
    attr.needsUpdate = true
    geometry.computeVertexNormals()
    return
  }

  if (generator === 'beatGrid') {
    const densityScale = 0.6 + (1 - runtimeLayer.layer.density) * 1.35
    const sizeFactor = proceduralBuiltSizeScaleFactor(runtimeLayer, runtimeLayer.layer)
    runtimeLayer.group.scale.setScalar(densityScale * sizeFactor)
    runtimeLayer.group.position.y = runtimeLayer.layer.positionY * 1.8
    const dotsNode = runtimeLayer.nodes.find(
      (node) => node.object instanceof THREE.InstancedMesh
    )
    if (dotsNode?.object instanceof THREE.InstancedMesh) {
      const mesh = dotsNode.object
      const levels =
        (runtimeLayer.scratch.beatGridLevels as Float32Array | undefined) ??
        new Float32Array(mesh.count)
      runtimeLayer.scratch.beatGridLevels = levels
      const segments = Math.max(1, Number(runtimeLayer.scratch.beatGridSegments ?? 1))
      const gridSize = Math.max(0.001, Number(runtimeLayer.scratch.beatGridSize ?? 1))
      const rise = clamp01(input.dtSec * 13, 1)
      const fall = clamp01(input.dtSec * 5.5, 1)
      const dummy = getScratchObject3D(runtimeLayer, '__tmpBeatGridDummy')
      for (let i = 0; i < mesh.count; i++) {
        const row = Math.floor(i / (segments + 1))
        const col = i % (segments + 1)
        const xT = segments <= 0 ? 0 : col / segments
        const zT = segments <= 0 ? 0 : row / segments
        const spectral = spectrum.hasSpectrum
          ? spectrum.sampleAt(xT)
          : input.beatPulse * (0.22 + (1 - zT) * 0.2)
        const target = Math.pow(clamp01(spectral, 0), 0.72)
        const current = levels[i] ?? 0
        levels[i] =
          target >= current
            ? current + (target - current) * rise
            : current + (target - current) * fall
        const beatLift = input.beatPulse * 0.18
        const y = -1 + levels[i] * (0.18 + runtimeLayer.layer.scale * 0.95) + beatLift
        const x = (xT - 0.5) * gridSize
        const z = (zT - 0.5) * gridSize
        const scale = 0.72 + levels[i] * 1.8 + input.beatPulse * 0.35
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    return
  }

  if (generator === 'waves') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.LineSegments)) {
      return
    }
    const object3d = node.object as THREE.LineSegments
    const geometry = object3d.geometry as THREE.BufferGeometry
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const base = runtimeLayer.scratch.wavesBasePositions as Float32Array | undefined
    const width = Number(runtimeLayer.scratch.wavesWidth ?? 8)
    const depth = Number(runtimeLayer.scratch.wavesDepth ?? 6)
    if (!attr) {
      return
    }
    if (!base || base.length !== attr.array.length) {
      return
    }
    const pulse =
      input.beatPulse * 0.9 + Math.pow(clamp01(spectrum.average, 0), 0.8) * 0.75
    const speed = 0.42 + input.speed * 0.82
    const amp = 0.08 + pulse * (0.58 + runtimeLayer.layer.scale * 0.8)
    for (let i = 0; i < attr.count; i++) {
      const idx = i * 3
      const x = base[idx]
      const z = base[idx + 2]
      const xT = clamp01((x / Math.max(0.001, width)) + 0.5, 0.5)
      const zT = clamp01((z / Math.max(0.001, depth)) + 0.5, 0.5)
      const spectrumBand = spectrum.hasSpectrum ? spectrum.sampleAt(xT) : input.beatPulse * 0.25
      const seq = input.clockSec * (0.95 + speed * 1.6) - zT * 8.2
      const crest = Math.sin(seq)
      const localAmp = amp * (0.35 + Math.pow(clamp01(spectrumBand, 0), 0.72) * 0.9)
      const y = -1 + crest * localAmp + input.beatPulse * 0.12
      attr.setXYZ(i, x, y, z)
    }
    attr.needsUpdate = true
    return
  }

  if (generator === 'stars') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.Points)) {
      return
    }
    const points = node.object as THREE.Points
    const geometry = points.geometry as THREE.BufferGeometry
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    if (!attr) {
      return
    }
    const depth = Number(runtimeLayer.scratch.starFieldDepth ?? 120)
    for (let i = 0; i < attr.count; i++) {
      let x = attr.getX(i)
      let y = attr.getY(i)
      let z = attr.getZ(i)
      z += input.speed * 22 * input.dtSec
      if (z > 2) {
        z = -depth
        x = (Math.random() - 0.5) * 24
        y = (Math.random() - 0.5) * 14
      }
      attr.setXYZ(i, x, y, z)
    }
    attr.needsUpdate = true
    return
  }

  if (generator === 'particles') {
    const pointsNode = runtimeLayer.nodes.find(
      (node) => node.object instanceof THREE.Points
    )
    const linksNode = runtimeLayer.nodes.find(
      (node) => node.object instanceof THREE.LineSegments
    )
    if (!pointsNode || !linksNode) {
      return
    }
    const points = pointsNode.object as THREE.Points
    const links = linksNode.object as THREE.LineSegments
    const attr = (points.geometry as THREE.BufferGeometry).getAttribute(
      'position'
    ) as THREE.BufferAttribute
    const linkAttr = (links.geometry as THREE.BufferGeometry).getAttribute(
      'position'
    ) as THREE.BufferAttribute
    if (!attr || !linkAttr) {
      return
    }
    const velocities = runtimeLayer.scratch.particleVelocities as Float32Array | undefined
    const emitters = runtimeLayer.scratch.particleEmitters as Float32Array | undefined
    const maxSegments = Number(runtimeLayer.scratch.particleLinkMaxSegments ?? 0)
    if (!velocities || !emitters || velocities.length !== attr.count * 3 || maxSegments <= 0) {
      return
    }
    const audioDrive = Math.pow(clamp01(spectrum.average, 0), 0.62)
    const sensitivity = clamp01(input.speed * 0.58, 0)
    const burst = clamp01((input.beatPulse * 1.18 + audioDrive * 1.25) * sensitivity, 0)
    const speedDrive = 0.18 + input.speed * 1.9
    const separation = burst * speedDrive
    const emitterCount = Math.max(1, Math.floor(emitters.length / 3))
    const roamRadius = 4.8 + runtimeLayer.layer.scale * 8.2 + separation * 10.5
    const attraction =
      0.34 + runtimeLayer.layer.variety * 1.3 + (1 - burst) * 0.7
    const drift = 0.002 + input.speed * 0.06
    const burstForce = (0.12 + separation * 4.8) * input.dtSec
    for (let i = 0; i < attr.count; i++) {
      const e = (i % emitterCount) * 3
      const tx = emitters[e] * (1 + separation * (1.2 + runtimeLayer.layer.variety * 0.8))
      const ty = emitters[e + 1] * (1 + separation * 0.65)
      const tz = emitters[e + 2] * (1 + separation * (1 + runtimeLayer.layer.variety * 0.75))
      let vx = velocities[i * 3]
      let vy = velocities[i * 3 + 1]
      let vz = velocities[i * 3 + 2]
      let x = attr.getX(i)
      let y = attr.getY(i)
      let z = attr.getZ(i)

      vx += (tx - x) * input.dtSec * attraction
      vy += (ty - y) * input.dtSec * attraction
      vz += (tz - z) * input.dtSec * attraction
      const rx = x - tx
      const ry = y - ty
      const rz = z - tz
      const radius = Math.max(0.0001, Math.hypot(rx, ry, rz))
      vx += (rx / radius) * burstForce
      vy += (ry / radius) * burstForce
      vz += (rz / radius) * burstForce
      vx += Math.sin(input.clockSec * 0.43 + i * 0.31) * drift * input.dtSec
      vy += Math.cos(input.clockSec * 0.36 + i * 0.17) * drift * input.dtSec
      vz += Math.sin(input.clockSec * 0.27 + i * 0.23) * drift * input.dtSec
      const damping = 0.95 - burst * 0.16
      vx *= damping
      vy *= damping
      vz *= damping

      x += vx
      y += vy
      z += vz
      if (x > roamRadius) x = -roamRadius
      if (x < -roamRadius) x = roamRadius
      if (y > roamRadius * 0.62) y = -roamRadius * 0.62
      if (y < -roamRadius * 0.62) y = roamRadius * 0.62
      if (z > roamRadius) z = -roamRadius
      if (z < -roamRadius) z = roamRadius

      velocities[i * 3] = vx
      velocities[i * 3 + 1] = vy
      velocities[i * 3 + 2] = vz
      attr.setXYZ(i, x, y, z)
    }
    attr.needsUpdate = true

    const threshold = 0.34 + runtimeLayer.layer.density * 0.92 + burst * 0.2
    const thresholdSq = threshold * threshold
    const linkArray = linkAttr.array as Float32Array
    let segCount = 0
    for (let i = 0; i < attr.count && segCount < maxSegments; i++) {
      const ix = attr.getX(i)
      const iy = attr.getY(i)
      const iz = attr.getZ(i)
      for (
        let j = i + 1;
        j < Math.min(attr.count, i + 8) && segCount < maxSegments;
        j++
      ) {
        const dx = ix - attr.getX(j)
        const dy = iy - attr.getY(j)
        const dz = iz - attr.getZ(j)
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq > thresholdSq) continue
        const base = segCount * 6
        linkArray[base] = ix
        linkArray[base + 1] = iy
        linkArray[base + 2] = iz
        linkArray[base + 3] = attr.getX(j)
        linkArray[base + 4] = attr.getY(j)
        linkArray[base + 5] = attr.getZ(j)
        segCount++
      }
    }
    linkAttr.needsUpdate = true
    ;(links.geometry as THREE.BufferGeometry).setDrawRange(0, segCount * 2)
    return
  }

  if (generator === 'nebula') {
    const base = runtimeLayer.scratch.nebulaBasePositions as Float32Array | undefined
    const drift = runtimeLayer.scratch.nebulaDrift as Float32Array | undefined
    const scales = runtimeLayer.scratch.nebulaScales as Float32Array | undefined
    if (!base || !drift || !scales) {
      return
    }
    const amplitude = 0.16 + runtimeLayer.layer.scale * 0.95 + input.beatPulse * 0.62
    const flow = 0.045 + input.speed * 0.24
    const count = Math.min(runtimeLayer.nodes.length, Math.floor(base.length / 3))
    for (let i = 0; i < count; i++) {
      const node = runtimeLayer.nodes[i]
      if (!(node.object instanceof THREE.Sprite)) {
        continue
      }
      const idx = i * 3
      const phase = input.clockSec * flow + i * 0.14
      const breathe = 1 + input.beatPulse * 0.2 * Math.sin(phase * 0.7)
      node.object.position.set(
        base[idx] * breathe + Math.sin(phase) * drift[idx] * amplitude,
        base[idx + 1] * breathe +
          Math.cos(phase * 0.87) * drift[idx + 1] * amplitude,
        base[idx + 2] * breathe +
          Math.sin(phase * 0.72) * drift[idx + 2] * amplitude
      )
      const scale = (scales[i] ?? 1.8) * (1 + input.beatPulse * 0.18)
      node.object.scale.set(scale, scale, 1)
    }
    return
  }

  if (generator === 'audioRing') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.InstancedMesh)) {
      return
    }
    const mesh = node.object
    const count = mesh.count
    const levels =
      (runtimeLayer.scratch.audioRingLevels as Float32Array | undefined) ??
      new Float32Array(count)
    const angles =
      (runtimeLayer.scratch.audioRingAngles as Float32Array | undefined) ??
      new Float32Array(count)
    const baseRadius = Number(runtimeLayer.scratch.audioRingRadius ?? 1.4)
    runtimeLayer.scratch.audioRingLevels = levels
    const hasSpectrum = spectrum.hasSpectrum
    const rise = clamp01(input.dtSec * 12, 1)
    const fall = clamp01(input.dtSec * 5.2, 1)
    const dummy = getScratchObject3D(runtimeLayer, '__tmpAudioRingDummy')
    for (let i = 0; i < count; i++) {
      const t = count <= 1 ? 0 : i / count
      const raw = hasSpectrum ? spectrum.sampleAt(t) : input.beatPulse * 0.25
      const target = Math.pow(clamp01(raw, 0), 0.72)
      const current = levels[i] ?? 0
      levels[i] = target >= current ? current + (target - current) * rise : current + (target - current) * fall
      const height = 0.05 + levels[i] * (0.8 + runtimeLayer.layer.scale * 2.8)
      const pulseRadius = baseRadius + levels[i] * 0.55 + input.beatPulse * 0.14
      const angle = angles[i] + input.clockSec * input.speed * 0.08
      dummy.position.set(
        Math.cos(angle) * pulseRadius,
        -0.9 + height * 0.5,
        Math.sin(angle) * pulseRadius
      )
      dummy.rotation.y = -angle
      dummy.scale.set(1, height, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    return
  }

  if (generator === 'audioTunnel') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.InstancedMesh)) {
      return
    }
    const mesh = node.object
    const slices = Number(runtimeLayer.scratch.audioTunnelSlices ?? 0)
    const segments = Number(runtimeLayer.scratch.audioTunnelSegments ?? 0)
    const depths = runtimeLayer.scratch.audioTunnelDepths as Float32Array | undefined
    const nearZ = Number(runtimeLayer.scratch.audioTunnelNearZ ?? 2.4)
    const farZ = Number(runtimeLayer.scratch.audioTunnelFarZ ?? -36)
    const baseRadius = Number(runtimeLayer.scratch.audioTunnelRadius ?? 1.4)
    const levels =
      (runtimeLayer.scratch.audioTunnelLevels as Float32Array | undefined) ??
      new Float32Array(Math.max(1, segments))
    runtimeLayer.scratch.audioTunnelLevels = levels
    if (!Number.isFinite(slices) || !Number.isFinite(segments) || !depths || slices <= 0 || segments <= 0) {
      return
    }
    const hasSpectrum = spectrum.hasSpectrum
    const rise = clamp01(input.dtSec * 10, 1)
    const fall = clamp01(input.dtSec * 4.8, 1)
    for (let s = 0; s < segments; s++) {
      const t = segments <= 1 ? 0 : s / segments
      const raw = hasSpectrum ? spectrum.sampleAt(t) : input.beatPulse * 0.2
      const target = Math.pow(clamp01(raw, 0), 0.74)
      const current = levels[s] ?? 0
      levels[s] = target >= current ? current + (target - current) * rise : current + (target - current) * fall
    }
    const travel = input.dtSec * (8 + input.speed * 30)
    for (let i = 0; i < slices; i++) {
      depths[i] += travel
      if (depths[i] > nearZ) {
        depths[i] = farZ
      }
    }
    const dummy = getScratchObject3D(runtimeLayer, '__tmpAudioTunnelDummy')
    for (let i = 0; i < mesh.count; i++) {
      const slice = Math.floor(i / segments)
      const segment = i % segments
      const angle = (segment / segments) * Math.PI * 2 + input.clockSec * 0.32
      const amp = levels[segment] ?? 0
      const radius = baseRadius + amp * 1.2
      dummy.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.68,
        depths[slice]
      )
      dummy.scale.setScalar(0.62 + amp * 1.8)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    return
  }

  if (generator === 'oscilloscope3D') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.Line)) {
      return
    }
    const line = node.object
    const geometry = line.geometry as THREE.BufferGeometry
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    if (!attr) {
      return
    }
    const count = attr.count
    const levels =
      (runtimeLayer.scratch.oscilloscopeLevels as Float32Array | undefined) ??
      new Float32Array(count)
    runtimeLayer.scratch.oscilloscopeLevels = levels
    const hasSpectrum = spectrum.hasSpectrum
    const width = 4 + runtimeLayer.layer.scale * 4.5
    const amp = 0.6 + runtimeLayer.layer.scale * 1.8
    const rise = clamp01(input.dtSec * 11, 1)
    const fall = clamp01(input.dtSec * 5.5, 1)
    for (let i = 0; i < count; i++) {
      const t = count <= 1 ? 0 : i / (count - 1)
      const raw = hasSpectrum ? spectrum.sampleAt(t) : input.beatPulse * 0.2
      const target = Math.pow(clamp01(raw, 0), 0.7)
      const current = levels[i] ?? 0
      levels[i] = target >= current ? current + (target - current) * rise : current + (target - current) * fall
      const y = (levels[i] - 0.35) * amp
      const z = Math.sin(t * Math.PI * 10 + input.clockSec * (1.2 + input.speed * 1.1)) * (0.2 + levels[i] * 0.7)
      attr.setXYZ(i, (t - 0.5) * width, y, z)
    }
    attr.needsUpdate = true
    return
  }

  if (generator === 'torusKnot') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.Mesh)) {
      return
    }
    const mesh = node.object
    const hasSpectrum = spectrum.hasSpectrum
    let avg = 0
    if (hasSpectrum) {
      avg = spectrum.average
    } else {
      avg = input.beatPulse * 0.22
    }
    const pulse = Math.pow(clamp01(avg, 0), 0.7)
    mesh.rotation.set(0, 0, 0)
    const scale = 0.85 + pulse * 0.75 + input.beatPulse * 0.18
    mesh.scale.setScalar(scale)
    return
  }

  if (generator === 'fftRibbon') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.Mesh)) {
      return
    }
    const mesh = node.object
    const geometry = mesh.geometry as THREE.BufferGeometry
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const cols = Number(runtimeLayer.scratch.fftRibbonCols ?? 0)
    const rows = Number(runtimeLayer.scratch.fftRibbonRows ?? 0)
    const base = runtimeLayer.scratch.fftRibbonBase as Float32Array | undefined
    const levels =
      (runtimeLayer.scratch.fftRibbonLevels as Float32Array | undefined) ??
      new Float32Array(Math.max(1, cols))
    runtimeLayer.scratch.fftRibbonLevels = levels
    if (!attr || !base || cols <= 1 || rows <= 1 || base.length !== attr.array.length) {
      return
    }
    const hasSpectrum = spectrum.hasSpectrum
    const rise = clamp01(input.dtSec * 11, 1)
    const fall = clamp01(input.dtSec * 5.4, 1)
    for (let c = 0; c < cols; c++) {
      const t = cols <= 1 ? 0 : c / (cols - 1)
      const raw = hasSpectrum ? spectrum.sampleAt(t) : input.beatPulse * 0.2
      const target = Math.pow(clamp01(raw, 0), 0.76)
      const current = levels[c] ?? 0
      levels[c] = target >= current ? current + (target - current) * rise : current + (target - current) * fall
    }
    const amp = 0.6 + runtimeLayer.layer.scale * 2.2
    for (let r = 0; r < rows; r++) {
      const rowT = rows <= 1 ? 0 : r / (rows - 1)
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) * 3
        const baseX = base[idx]
        const baseY = base[idx + 1]
        const wave = Math.sin(input.clockSec * (1.2 + input.speed) - rowT * 3.2 + c * 0.11) * 0.06
        const y = baseY + levels[c] * amp * (1 - rowT * 0.82) + wave + input.beatPulse * 0.1
        const z = base[idx + 2] - rowT * (1.2 + runtimeLayer.layer.scale * 1.7)
        attr.setXYZ(r * cols + c, baseX, y, z)
      }
    }
    attr.needsUpdate = true
    geometry.computeVertexNormals()
    return
  }

  if (generator === 'voxelPulse') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.InstancedMesh)) {
      return
    }
    const mesh = node.object
    const grid = Number(runtimeLayer.scratch.voxelGrid ?? 0)
    const span = Number(runtimeLayer.scratch.voxelSpan ?? 3)
    const levels =
      (runtimeLayer.scratch.voxelLevels as Float32Array | undefined) ??
      new Float32Array(mesh.count)
    runtimeLayer.scratch.voxelLevels = levels
    if (!Number.isFinite(grid) || grid <= 1) {
      return
    }
    const hasSpectrum = spectrum.hasSpectrum
    const rise = clamp01(input.dtSec * 13, 1)
    const fall = clamp01(input.dtSec * 4.5, 1)
    const dummy = getScratchObject3D(runtimeLayer, '__tmpVoxelPulseDummy')
    for (let i = 0; i < mesh.count; i++) {
      const gx = i % grid
      const gz = Math.floor(i / grid)
      const x = ((gx / Math.max(1, grid - 1)) - 0.5) * span
      const z = ((gz / Math.max(1, grid - 1)) - 0.5) * span
      const radial = Math.hypot(x, z)
      const radialT = clamp01(radial / (span * 0.75), 1)
      const raw = hasSpectrum
        ? spectrum.sampleAt(1 - radialT)
        : input.beatPulse * (0.2 + (1 - radialT) * 0.4)
      const target = Math.pow(clamp01(raw, 0), 0.8)
      const current = levels[i] ?? 0
      levels[i] = target >= current ? current + (target - current) * rise : current + (target - current) * fall
      const height = 0.03 + levels[i] * (0.85 + runtimeLayer.layer.scale * 2.6)
      dummy.position.set(x, -1 + height * 0.5, z)
      dummy.scale.set(1, height, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    return
  }

  if (generator === 'legacyTextParticles') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.Points)) {
      return
    }
    const words = Array.isArray(runtimeLayer.scratch.textMorphWords)
      ? (runtimeLayer.scratch.textMorphWords as string[])
      : ['CAPTIVATE']
    if (words.length === 0) {
      return
    }
    const points = node.object
    const geometry = points.geometry as THREE.BufferGeometry
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    if (!attr) {
      return
    }

    let wordIndex = Number(runtimeLayer.scratch.textMorphWordIndex ?? 0)
    let lastSwitchBeat = Number(runtimeLayer.scratch.textMorphLastSwitchBeat ?? -999)
    let targets = runtimeLayer.scratch.textMorphTargets as Float32Array | undefined
    const textSize = Number(runtimeLayer.scratch.textMorphSize ?? 1)

    if (
      !Number.isFinite(lastSwitchBeat) ||
      input.beats - lastSwitchBeat >= 8 ||
      targets === undefined ||
      targets.length !== attr.count * 3
    ) {
      wordIndex = (wordIndex + 1) % words.length
      targets = buildTextPointTargets(words[wordIndex], textSize, attr.count)
      runtimeLayer.scratch.textMorphWordIndex = wordIndex
      runtimeLayer.scratch.textMorphTargets = targets
      runtimeLayer.scratch.textMorphLastSwitchBeat = input.beats
    }

    if (targets === undefined) {
      return
    }
    const converge = clamp01(input.dtSec * (1.8 + input.speed * 0.35), 0.1)
    const jitterScale = input.beatPulse * 0.18
    for (let i = 0; i < attr.count; i++) {
      const tx = targets[i * 3]
      const ty = targets[i * 3 + 1]
      const tz = targets[i * 3 + 2]
      const x = attr.getX(i)
      const y = attr.getY(i)
      const z = attr.getZ(i)
      const nx = x + (tx - x) * converge + Math.sin(input.clockSec * 3 + i * 0.19) * jitterScale
      const ny = y + (ty - y) * converge + Math.cos(input.clockSec * 2.3 + i * 0.11) * jitterScale
      const nz = z + (tz - z) * converge + Math.sin(input.clockSec * 1.7 + i * 0.07) * jitterScale * 0.5
      attr.setXYZ(i, nx, ny, nz)
    }
    attr.needsUpdate = true
    return
  }

  if (generator === 'legacyTextSpin') {
    const spinSpeed = 0.5 + input.speed * 1.7
    for (const node of runtimeLayer.nodes) {
      node.object.rotation.set(
        node.baseRotation.x,
        node.baseRotation.y + input.clockSec * spinSpeed,
        node.baseRotation.z
      )
    }
    runtimeLayer.group.scale.setScalar(
      proceduralBuiltSizeScaleFactor(runtimeLayer, runtimeLayer.layer)
    )
    return
  }

  if (generator === 'legacySpaceTunnel') {
    const node = runtimeLayer.nodes[0]
    if (!(node.object instanceof THREE.InstancedMesh)) {
      return
    }
    const instanced = node.object
    const positions = runtimeLayer.scratch.spaceTunnelPositions as Float32Array | undefined
    const bounds = runtimeLayer.scratch.spaceTunnelBounds as
      | { width: number; height: number; nearZ: number; farZ: number }
      | undefined
    if (positions === undefined || bounds === undefined) {
      return
    }
    const { width, height, nearZ, farZ } = bounds
    const dummy = getScratchObject3D(runtimeLayer, '__tmpLegacySpaceTunnelDummy')
    const travel = input.dtSec * (18 + input.speed * 26)
    for (let i = 0; i < instanced.count; i++) {
      const idx = i * 3
      let x = positions[idx]
      let y = positions[idx + 1]
      let z = positions[idx + 2] + travel
      if (z > nearZ) {
        z = farZ
        x = (Math.random() - 0.5) * width
        y = (Math.random() - 0.5) * height
      }
      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z
      dummy.position.set(x, y, z)
      dummy.rotation.z = (i % 7) * 0.31
      dummy.updateMatrix()
      instanced.setMatrixAt(i, dummy.matrix)
    }
    instanced.instanceMatrix.needsUpdate = true
    return
  }
}

function generatorSupportsReactiveInput(runtimeLayer: RuntimeLayer) {
  const { generator, customGenerator } = runtimeLayer
  if (generator === 'customModule') {
    return customGenerator?.supportsReactiveInput === true
  }
  return (
    generator === 'beatGrid' ||
    generator === 'waves' ||
    generator === 'stars' ||
    generator === 'particles' ||
    generator === 'nebula' ||
    generator === 'spectrograph' ||
    generator === 'audioRing' ||
    generator === 'audioTunnel' ||
    generator === 'oscilloscope3D' ||
    generator === 'torusKnot' ||
    generator === 'fftRibbon' ||
    generator === 'voxelPulse' ||
    generator === 'legacyTextParticles' ||
    generator === 'legacyTextSpin' ||
    generator === 'legacySpaceTunnel' ||
    generator === 'spikeBall'
  )
}

function mix(a: number, b: number, t: number) {
  return a * (1 - t) + b * t
}

function effectLinkValue(
  source: BuiltinEffectLinkSource,
  params: UpdateResource['params']
) {
  const match = /^visSlider([1-8])$/.exec(source)
  if (match !== null) {
    const key = `visSlider${match[1]}`
    return clamp01(params[key], 0.5)
  }
  return 1
}

function resolveLayerDepthLink(
  manual: number,
  source: BuiltinEffectLinkSource,
  params: UpdateResource['params']
) {
  if (source === 'none') {
    return clamp01(manual, 0.5)
  }
  return clamp01(effectLinkValue(source, params), 0.5)
}

function resolveLayerUnitLink(
  manual: number,
  source: BuiltinEffectLinkSource,
  params: UpdateResource['params']
) {
  if (source === 'none') {
    return clamp01(manual, 0)
  }
  return clamp01(effectLinkValue(source, params), 0)
}

function resolveLayerAxisLink(
  manual: number,
  source: BuiltinEffectLinkSource,
  params: UpdateResource['params']
) {
  if (source === 'none') {
    return clampSigned(manual, 0)
  }
  return clampSigned(effectLinkValue(source, params) * 2 - 1, 0)
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isMjpegRelayUrl(url: string) {
  return url.toLowerCase().endsWith('.mjpg')
}

/** Texture `image` has finite width/height > 0 (decoded bitmap / canvas). */
function texHasDims(texture: THREE.Texture): boolean {
  const image = texture.image as { width?: number; height?: number } | undefined
  const width = Number(image?.width)
  const height = Number(image?.height)
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  )
}

/** Drawable media for an enabled layer (gates scene cross-fades until not black). */
function layerMediaReady(runtimeLayer: RuntimeLayer): boolean {
  const layer = runtimeLayer.layer
  if (layer.sourceType === 'procedural') {
    return true
  }

  const source = layer.source.trim()
  if (layer.sourceType !== 'projectM' && source.length === 0) {
    return true
  }

  const media = runtimeLayer.media
  if (!media) {
    return false
  }

  if (layer.sourceType === 'projectM') {
    const pm = media.projectM
    return Boolean(pm?.sessionReady && pm?.hasRenderedFrame)
  }

  if (!media.texture) {
    return false
  }

  if (media.video !== null) {
    return visVideoReady(media.video)
  }

  if (media.image !== null) {
    const img = media.image
    return (
      img.complete && img.naturalWidth > 0 && img.naturalHeight > 0
    )
  }

  return texHasDims(media.texture)
}

function normalizeMediaUrl(input: string) {
  const value = input.trim()
  if (value.length === 0) return value
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
    return value
  }

  const normalized = value.replace(/\\/g, '/')
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`
  }
  if (normalized.startsWith('/')) {
    return `file://${encodeURI(normalized)}`
  }

  return value
}

async function startRelay(req: VisualizerRelayRequest) {
  const invoke = getIpcInvoke()
  if (invoke === null) {
    throw new Error('Visualizer relay IPC is unavailable.')
  }
  return (await invoke(
    'visualizer_stream_relay_start',
    req
  )) as VisualizerRelayStartResult
}

async function stopRelay(relayId: string) {
  const invoke = getIpcInvoke()
  if (invoke === null) return
  await invoke('visualizer_stream_relay_stop', relayId)
}

function getIpcInvoke():
  | ((channel: string, ...args: any[]) => Promise<any>)
  | null {
  if (typeof window === 'undefined') {
    return null
  }
  const electron = (window as any).electron
  if (!electron || !electron.ipcRenderer) {
    return null
  }
  const invoke = electron.ipcRenderer.invoke
  return typeof invoke === 'function' ? invoke : null
}

function applyPlaneFit(
  plane: THREE.Mesh,
  mediaAspect: number,
  fit: 'cover' | 'contain'
) {
  const geometry = plane.geometry as THREE.PlaneGeometry
  const params = geometry.parameters as { width?: number; height?: number }
  const planeWidth = Number(params.width) || 1
  const planeHeight = Number(params.height) || 1
  const planeAspect = planeWidth / planeHeight

  let scaleX = 1
  let scaleY = 1

  if (fit === 'contain') {
    if (mediaAspect > planeAspect) {
      scaleY = planeAspect / mediaAspect
    } else {
      scaleX = mediaAspect / planeAspect
    }
  } else {
    if (mediaAspect > planeAspect) {
      scaleX = mediaAspect / planeAspect
    } else {
      scaleY = planeAspect / mediaAspect
    }
  }

  plane.scale.set(scaleX, scaleY, 1)
}

function updateSpectrographPoints(
  runtimeLayer: RuntimeLayer,
  audio: UpdateResource['audio'],
  dtSec: number,
  scale: number
) {
  const node = runtimeLayer.nodes.find(
    (item) => item.object instanceof THREE.InstancedMesh
  )
  if (!node) return

  const bars = node.object as THREE.InstancedMesh
  const count = bars.count
  const spectrum = createSpectrumSampler(audio)
  const hasSpectrum = spectrum.hasSpectrum
  const dummy = getScratchObject3D(runtimeLayer, '__tmpSpectrographDummy')
  const levels =
    (runtimeLayer.scratch.spectrographLevels as Float32Array | undefined) ??
    new Float32Array(count)
  runtimeLayer.scratch.spectrographLevels = levels

  const spread = 3 + scale * 2.4
  const floorY = -1
  const rise = clamp01(dtSec * 10, 1)
  const fall = clamp01(dtSec * 4.2, 1)

  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0 : i / (count - 1)
    const sample = hasSpectrum ? spectrum.sampleAt(t) : 0
    const target = hasSpectrum ? Math.pow(Math.min(1, Math.max(0, sample)), 0.78) : 0
    const prev = levels[i] ?? 0
    const smooth = target >= prev ? prev + (target - prev) * rise : prev + (target - prev) * fall
    levels[i] = smooth

    const height = 0.03 + smooth * (0.75 + scale * 2.8)
    dummy.position.set((t - 0.5) * spread, floorY + height * 0.5, 0)
    dummy.scale.set(1, height, 1)
    dummy.updateMatrix()
    bars.setMatrixAt(i, dummy.matrix)
  }
  bars.instanceMatrix.needsUpdate = true
}

function createEmptyEffectAmountMap(): Record<BuiltinResolvedEffectType, number> {
  return {
    bloom: 0,
    blur: 0,
    filmGrain: 0,
    glitch: 0,
    afterImage: 0,
    scanlines: 0,
    strobe: 0,
    vignette: 0,
    chromaShift: 0,
    invert: 0,
    posterize: 0,
    hueShift: 0,
    mirror: 0,
    bpmSync: 0,
    colorSync: 0,
    positionSync: 0,
    audioReact: 0,
    anaglyph: 0,
    parallaxBarrier: 0,
    ascii: 0,
    rimLight: 0,
    stageLightMap: 0,
  }
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(1, Math.max(0, value))
}

function resolveFunction(
  value: unknown
): ((context: any) => unknown) | undefined {
  return typeof value === 'function' ? (value as (context: any) => unknown) : undefined
}

function evaluateCustomModuleCode(code: string): unknown {
  if (typeof code !== 'string' || code.trim().length === 0) {
    return undefined
  }
  try {
    return Function(
      'THREE',
      `"use strict"; return (${code});`
    )(THREE)
  } catch {
    return undefined
  }
}

function collectObjectMaterials(
  object: THREE.Object3D,
  target: THREE.Material[]
) {
  const append = (material: THREE.Material | THREE.Material[]) => {
    if (Array.isArray(material)) {
      for (const item of material) {
        if (item && !target.includes(item)) {
          target.push(item)
        }
      }
      return
    }
    if (material && !target.includes(material)) {
      target.push(material)
    }
  }
  object.traverse((node) => {
    const mesh = node as THREE.Mesh
    if ('material' in mesh && mesh.material) {
      append(mesh.material as THREE.Material | THREE.Material[])
    }
  })
}

async function loadImportedModelObject(sourceUrl: string): Promise<THREE.Object3D> {
  const lowered = sourceUrl.toLowerCase()
  if (lowered.endsWith('.stl')) {
    const loader = new STLLoader()
    const geometry = await loader.loadAsync(sourceUrl)
    geometry.computeVertexNormals()
    const material = new THREE.MeshStandardMaterial({
      color: '#87cdf6',
      emissive: '#2b5f7b',
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.34,
      transparent: true,
      opacity: 1,
    })
    return new THREE.Mesh(geometry, material)
  }

  const loader = new OBJLoader()
  const object = await loader.loadAsync(sourceUrl)
  object.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!('isMesh' in mesh) || !(mesh as any).isMesh) {
      return
    }
    const sourceMat = mesh.material
    if (sourceMat instanceof THREE.MeshStandardMaterial) {
      sourceMat.transparent = true
      sourceMat.opacity = 1
      return
    }
    mesh.material = new THREE.MeshStandardMaterial({
      color: '#87cdf6',
      emissive: '#2b5f7b',
      emissiveIntensity: 0.5,
      metalness: 0.1,
      roughness: 0.34,
      transparent: true,
      opacity: 1,
    })
  })
  return object
}

function fitObjectToTargetSize(object: THREE.Object3D, targetSize: number) {
  object.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(object)
  if (box.isEmpty()) {
    object.position.set(0, 0, 0)
    object.scale.setScalar(Math.max(0.0001, targetSize))
    return
  }
  const size = box.getSize(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z, 0.0001)
  const scale = Math.max(0.0001, targetSize / maxAxis)
  object.position.set(0, 0, 0)
  object.scale.setScalar(scale)
  object.updateMatrixWorld(true)
  const centered = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
  object.position.sub(centered)
  object.updateMatrixWorld(true)
}

function disposeObjectResources(object: THREE.Object3D) {
  object.traverse((node) => {
    const mesh = node as THREE.Mesh
    if ('geometry' in mesh && mesh.geometry instanceof THREE.BufferGeometry) {
      mesh.geometry.dispose()
    }
    if ('material' in mesh && mesh.material) {
      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) {
          material.dispose()
        }
      } else {
        mesh.material.dispose()
      }
    }
  })
}

function buildProjectMLayerAudioChunk(audio: UpdateResource['audio']) {
  const sampleCount = 256
  const channels: 1 | 2 = 2
  const out = new Array<number>(sampleCount * channels)
  const level = clamp01(audio.inputLevel, 0) * (audio.enabled ? 1 : 0)
  const beat = clamp01(audio.beatPulse, 0) * (audio.enabled ? 1 : 0)
  const energy = clamp01(audio.energyLevel, 0) * (audio.enabled ? 1 : 0)
  const spectrum = Array.isArray(audio.spectrum) ? audio.spectrum : []
  for (let i = 0; i < sampleCount; i++) {
    const t = i / Math.max(1, sampleCount - 1)
    const lowSpectrum =
      spectrum.length > 0
        ? spectrum[Math.floor(t * Math.max(1, spectrum.length * 0.5 - 1))] ?? 0
        : 0
    const highSpectrum =
      spectrum.length > 0 ? spectrum[Math.floor(t * (spectrum.length - 1))] ?? 0 : 0
    const drive = Math.max(0, Math.min(1, 0.18 + level * 0.82))
    const harmonicBase = Math.sin(t * Math.PI * (4 + energy * 18))
    const harmonicPulse = Math.sin(t * Math.PI * (8 + beat * 32))
    out[i * 2] = clampSigned(
      drive * (harmonicBase * (0.35 + lowSpectrum * 0.65) + harmonicPulse * 0.38),
      0
    )
    out[i * 2 + 1] = clampSigned(
      drive * (harmonicBase * (0.3 + highSpectrum * 0.7) - harmonicPulse * 0.36),
      0
    )
  }
  return {
    channels,
    samples: out,
  }
}

function makeProjectMLayerSessionId() {
  return `projectm-layer-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function clampProjectMInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }
  const rounded = Math.round(value)
  return Math.min(max, Math.max(min, rounded))
}

function coerceProjectMFrameBytes(
  binary: unknown,
  base64: unknown,
  width: number,
  height: number
) {
  const expectedLength =
    clampProjectMInt(width, PROJECTM_LAYER_MIN_WIDTH, PROJECTM_LAYER_MAX_WIDTH) *
    clampProjectMInt(height, PROJECTM_LAYER_MIN_HEIGHT, PROJECTM_LAYER_MAX_HEIGHT) *
    4
  if (binary instanceof Uint8Array) {
    return binary.length >= expectedLength ? binary : null
  }
  if (
    binary !== null &&
    typeof binary === 'object' &&
    'buffer' in (binary as Record<string, unknown>) &&
    'byteLength' in (binary as Record<string, unknown>)
  ) {
    try {
      const view = binary as ArrayBufferView
      const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
      return bytes.length >= expectedLength ? bytes : null
    } catch (_error) {}
  }
  if (
    binary !== null &&
    typeof binary === 'object' &&
    (binary as { type?: unknown }).type === 'Buffer' &&
    Array.isArray((binary as { data?: unknown }).data)
  ) {
    const values = (binary as { data: unknown[] }).data
      .map((value) => Number(value))
      .map((value) => (Number.isFinite(value) ? value : 0))
      .map((value) => Math.max(0, Math.min(255, value | 0)))
    const bytes = Uint8Array.from(values)
    return bytes.length >= expectedLength ? bytes : null
  }
  if (typeof base64 === 'string' && base64.length > 0) {
    return decodeProjectMBase64(base64, expectedLength)
  }
  return null
}

function decodeProjectMBase64(base64: string, expectedLength: number) {
  if (typeof globalThis.atob === 'function') {
    try {
      const binary = globalThis.atob(base64)
      const bytes = new Uint8Array(expectedLength)
      const length = Math.min(expectedLength, binary.length)
      for (let i = 0; i < length; i++) {
        bytes[i] = binary.charCodeAt(i) & 0xff
      }
      return bytes
    } catch (_error) {
      return null
    }
  }

  try {
    const maybeBuffer = (globalThis as { Buffer?: any }).Buffer
    if (typeof maybeBuffer?.from === 'function') {
      const decoded = maybeBuffer.from(base64, 'base64')
      const bytes = new Uint8Array(expectedLength)
      bytes.set(decoded.subarray(0, expectedLength))
      return bytes
    }
  } catch (_error) {
    return null
  }

  return null
}

function buildTextureSearchPathHint(presetPath: string) {
  const presetDir = dirnameFromPath(normalizeProjectMBridgePath(presetPath))
  if (presetDir.length <= 0) {
    return ''
  }
  const candidates = new Set<string>()
  const sep = presetDir.includes('\\') ? '\\' : '/'
  const add = (base: string, child: string) =>
    base.endsWith(sep) ? `${base}${child}` : `${base}${sep}${child}`
  candidates.add(presetDir)
  candidates.add(add(presetDir, 'textures'))
  candidates.add(add(presetDir, 'Textures'))

  const parent = dirnameFromPath(presetDir)
  const currentName = basenameFromPath(presetDir).toLowerCase()
  if (parent.length > 0 && (currentName === 'presets' || currentName === 'preset')) {
    const parentSep = parent.includes('\\') ? '\\' : '/'
    const addParent = (base: string, child: string) =>
      base.endsWith(parentSep) ? `${base}${child}` : `${base}${parentSep}${child}`
    candidates.add(parent)
    candidates.add(addParent(parent, 'textures'))
    candidates.add(addParent(parent, 'Textures'))
  }
  return Array.from(candidates).join(';')
}

function dirnameFromPath(input: string) {
  const value = normalizeProjectMBridgePath(
    typeof input === 'string' ? input.trim() : ''
  )
  if (value.length <= 0 || /^[a-z]+:\/\//i.test(value)) {
    return ''
  }
  const normalized = value.replace(/[\\\/]+$/, '')
  const separatorIndex = Math.max(
    normalized.lastIndexOf('/'),
    normalized.lastIndexOf('\\')
  )
  if (separatorIndex <= 0) {
    return ''
  }
  return normalized.slice(0, separatorIndex)
}

function basenameFromPath(input: string) {
  const value = normalizeProjectMBridgePath(
    typeof input === 'string' ? input.trim() : ''
  )
  if (value.length <= 0 || /^[a-z]+:\/\//i.test(value)) {
    return ''
  }
  const normalized = value.replace(/[\\\/]+$/, '')
  const separatorIndex = Math.max(
    normalized.lastIndexOf('/'),
    normalized.lastIndexOf('\\')
  )
  if (separatorIndex < 0) {
    return normalized
  }
  return normalized.slice(separatorIndex + 1)
}

function toProjectMBridgePresetPath(presetPath: string) {
  return normalizeProjectMBridgePath(presetPath)
}

function normalizeProjectMBridgePath(input: string) {
  const value = typeof input === 'string' ? input.trim() : ''
  if (value.length <= 0) {
    return value
  }
  if (!/^file:\/\//i.test(value)) {
    return value
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'file:') {
      return value
    }
    const host = decodeURIComponent(parsed.hostname ?? '')
    let pathname = decodeURIComponent(parsed.pathname ?? '')
    if (host.length > 0) {
      pathname = pathname.replace(/^\/+/, '')
      const uncTail = pathname.replace(/\//g, '\\')
      return `\\\\${host}\\${uncTail}`
    }
    if (/^\/[a-zA-Z]:\//.test(pathname)) {
      pathname = pathname.slice(1)
    }
    if (/^[a-zA-Z]:\//.test(pathname)) {
      return pathname.replace(/\//g, '\\')
    }
    return pathname
  } catch (_error) {
    return value
  }
}
