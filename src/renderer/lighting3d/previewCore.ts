/**
 * Lighting 3D preview core: DMX→preview targets, fixture mesh factory, WebGL renderer preset.
 */
import * as THREE from 'three'
import { Params, getParam } from '../../shared/params'
import { type BaseColors, hsv2rgb } from '../../shared/baseColors'
import {
  inferColorKind,
  type ColorChannel,
  type ColorKind,
} from '../../shared/dmxColors'
import { SplitScene_t } from '../../shared/Scenes'
import { fixtureGroupsMatchSceneGroups } from '../../shared/sceneGroups'
import { getLedValues } from '../../shared/ledFixtures'
import {
  type AtmosphereEffectType,
  type AtmosphereNozzleDirection,
  emitterDiameterMToVisualSizeScale,
  EMITTER_DIAMETER_MIN_M,
  EMITTER_DIAMETER_REFERENCE_M,
  fixtureEmitterFaceWidthScale,
  normalizeRectEmitterFaceDimensionsM,
  type FixtureBodyShape,
  type FixtureEmitterShape,
  type FixtureModelKind,
  type FixtureRotation,
  defaultMoverBeamAngleForModelKind,
  type MoverCalibration,
} from '../../shared/dmxFixtures'
import type {
  MoverPreviewColorChannel,
  MoverPreviewColorMapChannel,
  MoverPreviewFixture,
  MoverPreviewFocusChannel,
  MoverPreviewGoboMapChannel,
  MoverPreviewMasterChannel,
} from '../pages/lightingPreviewTypes'
import { METERS_PER_FOOT, type StageDimensions } from '../../shared/stage'
import { mapAxisPhysicalDmxToNormalized } from '../../shared/dmxUtil'
import type { LightingRendererCapabilities } from './webglFallback'
export type BeamConeGroupLayout = 'spot' | 'linear-x'

export interface BeamConeGroupVisual {
  mesh: THREE.Mesh
  emitterIndices: number[]
  layout: BeamConeGroupLayout
}

export interface FixtureVisual {
  signature: string
  modelKind: FixtureModelKind
  root: THREE.Group
  mountGroup?: THREE.Group
  ledWireSegments?: THREE.LineSegments
  emitters: THREE.Mesh[]
  beamMeshes: Array<THREE.Mesh | undefined>
  /** One shared beam cone per adjacent emitter cluster (PAR / wash bar / uplight). */
  beamConeGroups?: BeamConeGroupVisual[]
  emitterLights: Array<THREE.Light | undefined>
  emitterLightTargets: Array<THREE.Object3D | undefined>
  emitterFillRects: Array<THREE.RectAreaLight | undefined>
  atmosphereJets: Array<THREE.Points | undefined>
  surfaceSplats: Array<THREE.Mesh | undefined>
  ledAggregateLight?: THREE.SpotLight
  ledAggregateTarget?: THREE.Object3D
  goboLabel?: THREE.Mesh
  panPivot?: THREE.Group
  headPivot?: THREE.Group
  beamStartLocal?: THREE.Vector3
}

export type PreviewEmitterShape = 'disc' | 'rect-h' | 'rect-v'

export interface PreviewEmitterTarget {
  localX: number
  localY: number
  localZ: number
  color: THREE.Color
  intensity: number
  effectIntensity: number
  shape: PreviewEmitterShape | FixtureEmitterShape
  sizeScale: number
  /** When set with `rectHeightM`, overrides legacy `sizeScale` box sizing. */
  rectWidthM?: number
  rectHeightM?: number
  /** DMX channel grouping for live color updates without rebuilding layout. */
  liveChannelSet: BeamChannelSet
  liveEffectChannels: MoverPreviewMasterChannel[]
}

export interface PreviewTarget {
  fixtureId: string
  modelKind: FixtureModelKind
  modelWidth: number
  bodyShape: FixtureBodyShape
  bodyHeight: number
  bodyDepth: number
  bodyDiameter: number
  moverBeamAngleDeg: number
  atmosphereEffect: AtmosphereEffectType
  atmosphereNozzleDirection: AtmosphereNozzleDirection
  hasAtmosLighting: boolean
  isMoverModel: boolean
  isLedFixture: boolean
  ledFixtureIndex?: number
  ledWireEdges?: Array<[number, number]>
  rotation: FixtureRotation
  fixtureX: number
  fixtureY: number
  fixtureZ: number
  targetX: number
  targetY: number
  targetZ: number
  aimYawDeg?: number
  aimPitchDeg?: number
  focusNorm?: number
  hasFocusChannel: boolean
  goboIndex?: number
  mountInverted: boolean
  emitters: PreviewEmitterTarget[]
  /**
   * When false, the primary spot on this fixture does not cast real-time shadows
   * (preview performance: many 1024² shadow maps tank the GPU).
   */
  castPrimarySpotShadow?: boolean
}

export interface SurfaceSpec {
  floorY: number
  floorMinX: number
  floorMaxX: number
  floorMinZ: number
  floorMaxZ: number
  includeCurtain: boolean
  curtainZ: number
  curtainMinX: number
  curtainMaxX: number
  curtainMinY: number
  curtainMaxY: number
  includeRoom: boolean
  roomMinX: number
  roomMaxX: number
  roomMinY: number
  roomMaxY: number
  roomMinZ: number
  roomMaxZ: number
}

export interface SurfaceHit {
  point: THREE.Vector3
  normal: THREE.Vector3
  distance: number
  surface: 'floor' | 'curtain'
}

export interface LiveAxisValues {
  panRaw: number
  tiltRaw: number
  panNorm: number
  tiltNorm: number
}

export interface FloorSpec {
  width: number
  depth: number
  centerX: number
  centerZ: number
}

export const ROOM_HEIGHT = 5
export const DANCE_FLOOR_Y = 0.001
export const FLOOR_MIN_SIZE = 2
export const FLOOR_MAX_SIZE = 28
export const FALLBACK_TARGET_LENGTH = 10
export const FALLBACK_WORLD_FLOOR_SIZE = 220
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 6.9, 10.1]
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 1.8, 0.8]
export const CAMERA_STORAGE_KEY = 'captivate.lighting3d.camera.v1'
export const VOLUMETRIC_FOG_MAX_LIGHTS = 16
/**
 * Simplified preview: fixture housings, emitter lenses (DMX color/brightness),
 * stage, room, bounds, and curtain only — no beam cones, dynamic lights, splats,
 * atmosphere jets, or volumetric fog.
 */
export const PREVIEW_ESSENTIALS_MODE = true
export const ENABLE_BEAM_CONE_MESHES = !PREVIEW_ESSENTIALS_MODE
export const ENABLE_RECT_AREA_FILL_LIGHTS = !PREVIEW_ESSENTIALS_MODE
/** Emissive gain for DMX emitter lenses (toneMapped: false on material). */
export const EMITTER_EMISSIVE_GAIN = 2.1
export const ENABLE_LED_PIXEL_LIGHTS = false
export const ENABLE_LED_AGGREGATE_LIGHT = !PREVIEW_ESSENTIALS_MODE
export const ENABLE_SURFACE_SPLATS = false
export const MAX_DYNAMIC_LIGHTS_PER_FIXTURE = 8
export const LED_EMISSIVE_GAIN = 41
export const LED_EMITTER_BASE_EMISSIVE = 8.4
export const LED_AGGREGATE_LIGHT_GAIN = 11.2
export const LED_AGGREGATE_FOG_GAIN = 0.85
/** Default preview DMX sync interval; use `previewSyncIntervalMs` for adaptive rigs. */
export const PREVIEW_SYNC_MIN_INTERVAL_MS = 16

export type Lighting3dPerformanceProfile = {
  heavyScene: boolean
  previewSyncMinMs: number
  volumetricFogAllowed: boolean
  maxFogLights: number
}

export function estimatePreviewEmitterCount(fixtures: MoverPreviewFixture[]): number {
  let count = 0
  for (const fixture of fixtures) {
    if (fixture.isLedFixture) {
      count += fixture.ledPixels?.length ?? 1
      continue
    }
    if (fixture.customEmitters.length > 0) {
      count += fixture.customEmitters.length
      continue
    }
    for (const group of fixture.emitterGroups) {
      count += Math.max(1, Math.round(group.emitterCount))
    }
    if (fixture.emitterGroups.length === 0) {
      count += 1
    }
  }
  return count
}

export function lighting3dPerformanceProfile(
  fixtureCount: number,
  emitterCount: number,
  webgl1Fallback = false
): Lighting3dPerformanceProfile {
  const heavyScene = fixtureCount > 8 || emitterCount > 56
  const previewSyncMinMs = webgl1Fallback
    ? Math.max(50, fixtureCount <= 6 ? 50 : fixtureCount <= 14 ? 66 : 80)
    : fixtureCount <= 6
      ? 25
      : fixtureCount <= 14
        ? 50
        : fixtureCount <= 28
          ? 66
          : 80
  const volumetricFogAllowed =
    !PREVIEW_ESSENTIALS_MODE &&
    !webgl1Fallback &&
    !heavyScene &&
    emitterCount <= 48
  const maxFogLights = fixtureCount <= 10 ? VOLUMETRIC_FOG_MAX_LIGHTS : 8
  return {
    heavyScene: heavyScene || webgl1Fallback,
    previewSyncMinMs,
    volumetricFogAllowed,
    maxFogLights,
  }
}

export function previewSyncIntervalMs(fixtureCount: number, emitterCount: number): number {
  return lighting3dPerformanceProfile(fixtureCount, emitterCount).previewSyncMinMs
}

/** Stable key for fixture layout / model — when unchanged, only live DMX is applied. */
export function previewFixturesStructureKey(fixtures: MoverPreviewFixture[]): string {
  const parts: string[] = []
  for (const fixture of fixtures) {
    parts.push(
      fixture.fixtureId,
      String(fixture.universe),
      String(fixture.channelBase),
      String(fixture.customEmitters.length),
      String(fixture.emitterGroups.length),
      fixture.model.kind,
      String(fixture.isLedFixture),
      `${fixture.xPos.toFixed(4)},${fixture.yPos.toFixed(4)},${fixture.zPos.toFixed(4)}`
    )
  }
  return parts.join('|')
}

/** DMX/output level below this is treated as off (no beams, fog slots, or dynamic lights). */
/** ~2.5/255 — ignore residual DMX noise when deciding preview is "on". */
export const PREVIEW_EMITTER_OUTPUT_EPSILON = 0.01

export function isEmitterOutputActive(
  intensity: number,
  color?: THREE.Color
): boolean {
  if (!Number.isFinite(intensity) || intensity < PREVIEW_EMITTER_OUTPUT_EPSILON) {
    return false
  }
  if (color !== undefined) {
    const colorPeak = Math.max(color.r, color.g, color.b)
    if (!Number.isFinite(colorPeak) || colorPeak < PREVIEW_EMITTER_OUTPUT_EPSILON) {
      return false
    }
  }
  return true
}
export const MAX_VISUAL_CREATIONS_PER_SYNC = 12
export const LOCAL_AXIS_Y = new THREE.Vector3(0, 1, 0)
export const LOCAL_AXIS_Z = new THREE.Vector3(0, 0, 1)
export const LOCAL_AXIS_NEG_Z = new THREE.Vector3(0, 0, -1)

export function isRectPreviewEmitterShape(
  shape: PreviewEmitterShape | FixtureEmitterShape
): boolean {
  return shape === 'rect-h' || shape === 'rect-v'
}

/** Lens mesh local axis that should align with fixture beam / face normal (+Z). */
export function emitterLensForwardAxis(
  _shape: PreviewEmitterShape | FixtureEmitterShape
): THREE.Vector3 {
  return LOCAL_AXIS_Z
}

/** Shared body dimensions for emitter / face placement math. */
export type FixturePlacementContext = {
  modelKind: FixtureModelKind
  bodyShape: FixtureBodyShape
  modelWidth: number
  bodyHeight: number
  bodyDepth: number
  bodyDiameter: number
}

export function fixturePlacementContextFromTarget(
  target: Pick<
    PreviewTarget,
    'modelKind' | 'bodyShape' | 'modelWidth' | 'bodyHeight' | 'bodyDepth' | 'bodyDiameter'
  >
): FixturePlacementContext {
  return {
    modelKind: target.modelKind,
    bodyShape: target.bodyShape,
    modelWidth: target.modelWidth,
    bodyHeight: target.bodyHeight,
    bodyDepth: target.bodyDepth,
    bodyDiameter: target.bodyDiameter,
  }
}

/** Root-space center of the fixture housing mesh (matches createFixtureVisual body.position). */
export function fixtureBodyCenterInRoot(ctx: FixturePlacementContext): THREE.Vector3 {
  return fixtureHousingExtentsAlongBeam(ctx).center
}

/** Unit vector for default emitter output in root space. */
export function fixtureBeamAxisInRoot(ctx: FixturePlacementContext): THREE.Vector3 {
  return ctx.modelKind === 'uplight' ? LOCAL_AXIS_Y : LOCAL_AXIS_Z
}

/** Half of body extent along the beam axis (meters). */
export function fixtureBodyHalfExtentAlongBeam(ctx: FixturePlacementContext): number {
  return fixtureHousingExtentsAlongBeam(ctx).halfExtent
}

/**
 * Housing center and half-extent along the beam axis — kept in sync with createFixtureVisual meshes.
 */
export function fixtureHousingExtentsAlongBeam(ctx: FixturePlacementContext): {
  center: THREE.Vector3
  halfExtent: number
} {
  const baseY = nonMoverEmitterBaseY(ctx.modelKind)
  const depth = Math.max(0.04, ctx.bodyDepth)
  const height = Math.max(0.04, ctx.bodyHeight)

  if (ctx.modelKind === 'uplight') {
    const topCapCenterY = baseY + clamp(height * 0.44, 0.08, 1)
    const topCapHalfY = clamp(height * 0.36, 0.04, 0.8) * 0.5
    const bodyCenterY = baseY - 0.02
    const bodyHalfY = height * 0.5
    const frontY = topCapCenterY + topCapHalfY
    const backY = bodyCenterY - bodyHalfY
    return {
      center: new THREE.Vector3(0, (frontY + backY) * 0.5, 0),
      halfExtent: Math.max(0.02, (frontY - backY) * 0.5),
    }
  }

  const housingCenterY =
    ctx.modelKind === 'washBar' || ctx.modelKind === 'atmosphericFxtr'
      ? baseY
      : baseY + 0.08

  if (ctx.bodyShape === 'cylinder') {
    const axisHalf = Math.max(height, depth) * 0.5
    return {
      center: new THREE.Vector3(0, housingCenterY, 0),
      halfExtent: axisHalf,
    }
  }

  return {
    center: new THREE.Vector3(0, housingCenterY, 0),
    halfExtent: depth * 0.5,
  }
}

/** Offset along the beam axis from housing center (0 = midline, +half = front face). */
export function emitterBeamOffsetFromFaceZ01(
  ctx: FixturePlacementContext,
  faceZ01: number
): number {
  const { halfExtent } = fixtureHousingExtentsAlongBeam(ctx)
  return (clamp01(faceZ01) - 0.5) * 2 * halfExtent
}

export function fixtureFrontFaceBeamOffset(ctx: FixturePlacementContext): number {
  return emitterBeamOffsetFromFaceZ01(ctx, 1)
}

/**
 * Point along the housing depth (faceZ01: 0 = rear, 1 = front) where the emitter center sits.
 * At faceZ01 = 1 the emitter center is on the fixture front face (bisected by that plane).
 */
export function emitterFaceCenterAlongBeam(
  ctx: FixturePlacementContext,
  faceZ01: number
): THREE.Vector3 {
  const { center } = fixtureHousingExtentsAlongBeam(ctx)
  const beam = fixtureBeamAxisInRoot(ctx)
  return center.clone().add(beam.multiplyScalar(emitterBeamOffsetFromFaceZ01(ctx, faceZ01)))
}

export function fixtureFaceWidthM(ctx: FixturePlacementContext): number {
  if (ctx.bodyShape === 'cylinder') {
    return Math.max(0.05, ctx.bodyDiameter)
  }
  return Math.max(0.05, ctx.modelWidth * fixtureEmitterFaceWidthScale(ctx.modelKind))
}

export function fixtureFaceHeightM(ctx: FixturePlacementContext): number {
  return Math.max(0.05, ctx.bodyHeight)
}

/** Normalized face Z (0 rear, 1 front) → root Z of emitter center along +Z beam. */
export function emitterBackPlaneRootZ(
  ctx: FixturePlacementContext,
  faceZ01: number
): number {
  return emitterFaceCenterAlongBeam(ctx, faceZ01).z
}

/** Normalized face Z → root Y of emitter center for uplight (+Y beam). */
export function emitterBackPlaneRootY(
  ctx: FixturePlacementContext,
  faceZ01: number
): number {
  return emitterFaceCenterAlongBeam(ctx, faceZ01).y
}

/**
 * Normalized depth for 3D preview emitters (0 rear, 1 front).
 * Legacy data often stores 0.5 on the body midline — treat that as "use the front face".
 */
export function previewEmitterFaceZ01(
  fxtrDepthOn: boolean,
  storedZ: number
): number {
  const z = clamp01(storedZ)
  if (!fxtrDepthOn) {
    return 1
  }
  if (z >= 0.45 && z <= 0.55) {
    return 1
  }
  return z
}

/** Offset from body center to a point on the fixture face (X/Y in root; Z from faceZ01). */
export function emitterFaceOffsetFromNormalized(
  ctx: FixturePlacementContext,
  faceX01: number,
  faceY01: number
): { offsetX: number; offsetY: number } {
  return {
    offsetX: (clamp01(faceX01) - 0.5) * fixtureFaceWidthM(ctx) * 0.9,
    offsetY: (0.5 - clamp01(faceY01)) * fixtureFaceHeightM(ctx) * 0.9,
  }
}
export const LIGHTING3D_WARMUP_MIN_MS = 900
export const LIGHTING3D_WARMUP_SETTLE_MS = 500
export const LIGHTING3D_PERF_HUD_STORAGE_KEY = 'captivate.debug.lighting3dPerfHud'

export type LightingRendererInit = {
  renderer: THREE.WebGLRenderer
  capabilities: LightingRendererCapabilities
  /** @deprecated Use `capabilities.webgl1Fallback === false` */
  webgl2: boolean
}

export function createLightingRenderer(heavyScene: boolean): LightingRendererInit {
  const canvas = document.createElement('canvas')
  const contextAttributes: WebGLContextAttributes = {
    antialias: !heavyScene,
    alpha: false,
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
  }

  const gl2Context = canvas.getContext('webgl2', contextAttributes)
  const webgl1Fallback = gl2Context === null
  const gl1Context =
    gl2Context ??
    canvas.getContext('webgl', contextAttributes) ??
    canvas.getContext('experimental-webgl', contextAttributes)

  if (gl1Context === null) {
    throw new Error(
      'Lighting 3D could not create a WebGL context. Check GPU drivers and hardware acceleration.'
    )
  }

  const effectiveHeavy = heavyScene || webgl1Fallback
  const antialias = !effectiveHeavy
  const maxPixelRatio = webgl1Fallback ? 1 : effectiveHeavy ? 1 : 1.35

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias,
    context: gl1Context as WebGL2RenderingContext | WebGLRenderingContext,
    powerPreference: 'high-performance',
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio))
  renderer.localClippingEnabled = false
  renderer.shadowMap.enabled = !webgl1Fallback && !effectiveHeavy
  renderer.shadowMap.type =
    webgl1Fallback || effectiveHeavy
      ? THREE.BasicShadowMap
      : THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const capabilities: LightingRendererCapabilities = {
    webglVersion: webgl1Fallback ? 1 : 2,
    webgl1Fallback,
    volumetricFog: !webgl1Fallback,
    antialias,
    softShadows: !webgl1Fallback && !effectiveHeavy,
    spotShadows: !webgl1Fallback,
    maxPixelRatio,
  }

  return { renderer, capabilities, webgl2: !webgl1Fallback }
}

export interface PersistedCameraState {
  position: [number, number, number]
  target: [number, number, number]
}

export function readPersistedCameraState():
  | PersistedCameraState
  | undefined {
  try {
    const raw = window.localStorage.getItem(CAMERA_STORAGE_KEY)
    if (raw === null) {
      return undefined
    }
    const parsed = JSON.parse(raw) as {
      position?: number[]
      target?: number[]
    }
    const position = parsed.position
    const target = parsed.target
    if (
      !Array.isArray(position) ||
      !Array.isArray(target) ||
      position.length !== 3 ||
      target.length !== 3
    ) {
      return undefined
    }
    const pos = [
      Number(position[0]),
      Number(position[1]),
      Number(position[2]),
    ] as [number, number, number]
    const tar = [Number(target[0]), Number(target[1]), Number(target[2])] as [
      number,
      number,
      number,
    ]
    if (!pos.every(Number.isFinite) || !tar.every(Number.isFinite)) {
      return undefined
    }
    return {
      position: pos,
      target: tar,
    }
  } catch {
    return undefined
  }
}

export function writePersistedCameraState(state: PersistedCameraState) {
  try {
    window.localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors.
  }
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function smoothToward(
  current: number | undefined,
  target: number,
  amount: number
): number {
  if (!Number.isFinite(target) || target <= PREVIEW_EMITTER_OUTPUT_EPSILON) {
    if (current === undefined || !Number.isFinite(current) || current <= PREVIEW_EMITTER_OUTPUT_EPSILON) {
      return 0
    }
    return lerp(current, 0, clamp01(amount * 2.5))
  }
  if (current === undefined || !Number.isFinite(current)) {
    return target
  }
  return lerp(current, target, clamp01(amount))
}

export function isFiniteVector3(value: THREE.Vector3): boolean {
  return (
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  )
}

export function isFiniteColor(value: THREE.Color): boolean {
  return (
    Number.isFinite(value.r) &&
    Number.isFinite(value.g) &&
    Number.isFinite(value.b)
  )
}

export function normalizeOrFallback(
  direction: THREE.Vector3,
  fallback: THREE.Vector3
): THREE.Vector3 {
  if (!isFiniteVector3(direction) || direction.lengthSq() <= 0.0000001) {
    return fallback.clone().normalize()
  }
  return direction.clone().normalize()
}

export function feetToWorld(feet: number): number {
  return feet * METERS_PER_FOOT
}

export function computeFloorSpecFromStage(stage: StageDimensions): FloorSpec {
  const width = clamp(feetToWorld(stage.widthFt), FLOOR_MIN_SIZE, FLOOR_MAX_SIZE)
  const depth = clamp(feetToWorld(stage.depthFt), FLOOR_MIN_SIZE, FLOOR_MAX_SIZE)
  return {
    width,
    depth,
    centerX: 0,
    centerZ: depth * 0.5,
  }
}

export function stageHeightFromStage(stage: StageDimensions): number {
  return clamp(feetToWorld(stage.heightFt), 1.2, ROOM_HEIGHT)
}

export function parseMoverMode(params: Params): number {
  const raw = Number(params.moverMode ?? 0)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(2, Math.round(raw)))
}

export function colorForGroup(groupName: string): THREE.Color {
  let hash = 0
  for (let i = 0; i < groupName.length; i++) {
    hash = (hash * 31 + groupName.charCodeAt(i)) | 0
  }

  const hue = ((hash % 360) + 360) % 360
  return new THREE.Color(`hsl(${hue}, 85%, 58%)`)
}

export function resolveModelKind(fixture: MoverPreviewFixture): FixtureModelKind {
  if (fixture.model.kind !== 'auto') {
    return fixture.model.kind
  }

  if (fixture.isMover) {
    return 'moverSpot'
  }

  if (
    fixture.panCoarseChannel !== undefined &&
    fixture.tiltCoarseChannel !== undefined
  ) {
    return 'moverSpot'
  }

  if (fixture.emitterGroups.length >= 3) {
    return 'washBar'
  }

  return 'parCan'
}

export function isMoverModelKind(kind: FixtureModelKind): boolean {
  return kind === 'moverSpot' || kind === 'moverWash'
}

export function isAtmosphericModelKind(kind: FixtureModelKind): boolean {
  return kind === 'atmosphericFxtr'
}

export function isCloudModelKind(kind: FixtureModelKind): boolean {
  return kind === 'washBar' || kind === 'uplight' || kind === 'moverWash'
}

export function stageTopEdgeZFromFloorSpec(floorSpec: FloorSpec): number {
  return floorSpec.centerZ - floorSpec.depth * 0.5
}

export function fixtureWorldFromUniversePosition(
  x: number,
  y: number,
  z: number,
  floorSpec: FloorSpec,
  stageHeight: number
): { worldX: number; worldY: number; worldZ: number } {
  const safeX = clamp01(x)
  const safeY = clamp01(y)
  const safeZ = clamp01(z)
  const stageTopEdgeZ = stageTopEdgeZFromFloorSpec(floorSpec)

  return {
    worldX: floorSpec.centerX + (safeX - 0.5) * floorSpec.width,
    worldY: lerp(0.25, stageHeight, safeY),
    worldZ: stageTopEdgeZ + (1 - safeZ) * floorSpec.depth,
  }
}

export function fixtureUniversePositionFromWorld(
  worldX: number,
  worldY: number,
  worldZ: number,
  floorSpec: FloorSpec,
  stageHeight: number
): { x: number; y: number; z: number } {
  const stageTopEdgeZ = stageTopEdgeZFromFloorSpec(floorSpec)
  const safeDepth = Math.max(0.0001, floorSpec.depth)
  const safeWidth = Math.max(0.0001, floorSpec.width)
  const safeHeightSpan = Math.max(0.0001, stageHeight - 0.25)

  return {
    x: clamp01((worldX - floorSpec.centerX) / safeWidth + 0.5),
    y: clamp01((worldY - 0.25) / safeHeightSpan),
    z: clamp01(1 - (worldZ - stageTopEdgeZ) / safeDepth),
  }
}

export function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return value
  }
  return Math.round(value / step) * step
}

export function normalizeRotationDeg(value: number): number {
  const wrapped = ((value + 180) % 360 + 360) % 360 - 180
  return wrapped === -180 ? 180 : wrapped
}

export function danceFloorWorldFromNormalized(
  x: number,
  y: number,
  floorSpec: FloorSpec
): { worldX: number; worldY: number; worldZ: number } {
  const safeX = clamp01(x)
  const safeY = clamp01(y)

  return {
    worldX: floorSpec.centerX + (safeX - 0.5) * floorSpec.width,
    worldY: DANCE_FLOOR_Y,
    worldZ: floorSpec.centerZ + (0.5 - safeY) * floorSpec.depth,
  }
}

export function normalizeAxisValue(value: number, min: number, max: number): number {
  const minValue = Number.isFinite(min) ? min : 0
  const maxValue = Number.isFinite(max) ? max : 255

  if (Math.abs(maxValue - minValue) < 0.0001) {
    return clamp01(value / 255)
  }

  if (maxValue > minValue) {
    return clamp01((value - minValue) / (maxValue - minValue))
  }

  return clamp01((minValue - value) / (minValue - maxValue))
}

export function readLiveAxisValues(
  fixture: MoverPreviewFixture,
  dmxOutByUniverse: number[][]
): LiveAxisValues | undefined {
  if (
    fixture.panCoarseChannel === undefined ||
    fixture.tiltCoarseChannel === undefined
  ) {
    return undefined
  }

  const universe = Math.max(1, Math.round(fixture.universe || 1))
  const universeData = dmxOutByUniverse[universe - 1]
  if (universeData === undefined) {
    return undefined
  }

  const panCoarse = universeData[fixture.panCoarseChannel]
  const tiltCoarse = universeData[fixture.tiltCoarseChannel]
  if (!Number.isFinite(panCoarse) || !Number.isFinite(tiltCoarse)) {
    return undefined
  }

  const panFine =
    fixture.panFineChannel !== undefined
      ? universeData[fixture.panFineChannel] ?? 0
      : 0
  const tiltFine =
    fixture.tiltFineChannel !== undefined
      ? universeData[fixture.tiltFineChannel] ?? 0
      : 0

  const panRaw = panCoarse + panFine / 256
  const tiltRaw = tiltCoarse + tiltFine / 256

  return {
    panRaw,
    tiltRaw,
    panNorm:
      fixture.moverCalibration?.pan !== undefined
        ? mapAxisPhysicalDmxToNormalized(panRaw, fixture.moverCalibration.pan)
        : normalizeAxisValue(panRaw, fixture.panMin ?? 0, fixture.panMax ?? 255),
    tiltNorm:
      fixture.moverCalibration?.tilt !== undefined
        ? mapAxisPhysicalDmxToNormalized(tiltRaw, fixture.moverCalibration.tilt)
        : normalizeAxisValue(tiltRaw, fixture.tiltMin ?? 0, fixture.tiltMax ?? 255),
  }
}

export interface LiveBeamValues {
  color: THREE.Color
  intensity: number
}

export interface BeamChannelSet {
  colorChannels: MoverPreviewColorChannel[]
  colorMapChannels: MoverPreviewColorMapChannel[]
  masterChannels: MoverPreviewMasterChannel[]
}

const EMPTY_BEAM_CHANNEL_SET: BeamChannelSet = {
  colorChannels: [],
  colorMapChannels: [],
  masterChannels: [],
}

export function normalizeDmxRange(value: number, min: number, max: number): number {
  if (Math.abs(max - min) < 0.0001) {
    return clamp01(value / 255)
  }

  if (max > min) {
    return clamp01((value - min) / (max - min))
  }

  return clamp01((min - value) / (min - max))
}

export function colorFromChannelDefinition(channel: ColorChannel): THREE.Color {
  const kind = inferColorKind(channel)

  if (kind === 'white') {
    return new THREE.Color(1, 1, 1)
  }

  if (kind === 'warmWhite') {
    return new THREE.Color(1, 0.84, 0.66)
  }

  if (kind === 'amber') {
    return new THREE.Color(1, 0.62, 0.1)
  }

  if (kind === 'uv') {
    return new THREE.Color(0.55, 0.28, 1)
  }

  const [r, g, b] = hsv2rgb(clamp01(channel.hue), clamp01(channel.saturation), 1)
  return new THREE.Color(r, g, b)
}

export function estimateColorMapIntensity(value: number, mappedMax: number): number {
  if (mappedMax <= 0.0001) {
    return clamp01(value / 255)
  }
  return clamp01(value / mappedMax)
}

/** Max RGB peak when overdriving additive channel mix (white + RGB, etc.). */
export const PREVIEW_ADDITIVE_COLOR_PEAK_CAP = 3

/**
 * Turn summed per-channel RGB contributions into a stable preview color + level.
 * Per-channel clamp01 on additive sums skews hue when white and RGB are both active.
 */
export function finalizeAdditivePreviewColor(
  combinedColor: THREE.Color,
  colorControlLevel: number
): { color: THREE.Color; colorControlLevel: number; hasCombinedColor: boolean } {
  const peak = Math.max(combinedColor.r, combinedColor.g, combinedColor.b, 0)
  if (peak <= 0.001) {
    return {
      color: new THREE.Color(0, 0, 0),
      colorControlLevel,
      hasCombinedColor: false,
    }
  }

  const divisor = Math.max(peak, 1)
  const color = new THREE.Color(
    combinedColor.r / divisor,
    combinedColor.g / divisor,
    combinedColor.b / divisor
  )

  const intensityBoost =
    peak > 1
      ? Math.min(peak, PREVIEW_ADDITIVE_COLOR_PEAK_CAP)
      : 1

  return {
    color,
    colorControlLevel: clamp01(colorControlLevel * intensityBoost),
    hasCombinedColor: true,
  }
}

export function readLiveBeamValuesForChannels(
  channelSet: BeamChannelSet,
  universeData: number[] | undefined,
  params: Params,
  fallbackColor: THREE.Color,
  masterScale = 1
): LiveBeamValues {
  const outputScale = clamp01(masterScale)
  const [hsvR, hsvG, hsvB] = hsv2rgb(
    clamp01(getParam(params, 'hue')),
    clamp01(getParam(params, 'saturation')),
    1
  )
  const hsvFallbackColor = new THREE.Color(hsvR, hsvG, hsvB)

  if (universeData === undefined) {
    return {
      color: hsvFallbackColor,
      intensity: clamp01(getParam(params, 'brightness') * outputScale),
    }
  }

  let masterLevel = 1
  if (channelSet.masterChannels.length > 0) {
    masterLevel = 0
    for (const masterChannel of channelSet.masterChannels) {
      const rawValue = universeData[masterChannel.channelIndex]
      if (!Number.isFinite(rawValue)) {
        continue
      }

      const normalized = masterChannel.isOnOff
        ? rawValue > (masterChannel.min + masterChannel.max) * 0.5
          ? 1
          : 0
        : normalizeDmxRange(rawValue, masterChannel.min, masterChannel.max)

      masterLevel = Math.max(masterLevel, normalized)
    }
  }

  const combinedColor = new THREE.Color(0, 0, 0)
  let colorControlLevel = 0

  for (const colorChannel of channelSet.colorChannels) {
    const rawValue = universeData[colorChannel.channelIndex]
    if (!Number.isFinite(rawValue)) {
      continue
    }

    const level = clamp01(rawValue / 255)
    const baseColor = colorFromChannelDefinition(colorChannel.color)
    combinedColor.r += baseColor.r * level
    combinedColor.g += baseColor.g * level
    combinedColor.b += baseColor.b * level
    colorControlLevel = Math.max(colorControlLevel, level)
  }

  for (const colorMapChannel of channelSet.colorMapChannels) {
    const rawValue = universeData[colorMapChannel.channelIndex]
    if (!Number.isFinite(rawValue) || colorMapChannel.colors.length === 0) {
      continue
    }

    let selected = colorMapChannel.colors[0]
    let minDiff = Math.abs(rawValue - selected.max)

    for (const candidate of colorMapChannel.colors) {
      const diff = Math.abs(rawValue - candidate.max)
      if (diff < minDiff) {
        minDiff = diff
        selected = candidate
      }
    }

    const mapLevel = estimateColorMapIntensity(rawValue, selected.max)
    const baseColor = colorFromChannelDefinition(selected)
    combinedColor.r += baseColor.r * mapLevel
    combinedColor.g += baseColor.g * mapLevel
    combinedColor.b += baseColor.b * mapLevel
    colorControlLevel = Math.max(colorControlLevel, mapLevel)
  }

  const hasColorDefinitions =
    channelSet.colorChannels.length > 0 || channelSet.colorMapChannels.length > 0
  const finalized = finalizeAdditivePreviewColor(
    combinedColor,
    colorControlLevel
  )

  const previewColor = finalized.hasCombinedColor
    ? finalized.color
    : hasColorDefinitions
      ? hsvFallbackColor
      : fallbackColor.clone()

  const hasMasterDimmer = channelSet.masterChannels.length > 0
  const intensity = hasColorDefinitions
    ? clamp01(finalized.colorControlLevel * masterLevel)
    : hasMasterDimmer
      ? clamp01(masterLevel)
      : 0

  return {
    color: previewColor,
    intensity: clamp01(intensity * outputScale),
  }
}

export function readLiveEffectLevelForChannels(
  effectChannels: MoverPreviewMasterChannel[],
  universeData: number[] | undefined
): number {
  if (universeData === undefined || effectChannels.length === 0) {
    return 0
  }

  let level = 0
  for (const channel of effectChannels) {
    const rawValue = universeData[channel.channelIndex]
    if (!Number.isFinite(rawValue)) {
      continue
    }
    const normalized = channel.isOnOff
      ? rawValue > (channel.min + channel.max) * 0.5
        ? 1
        : 0
      : normalizeDmxRange(rawValue, channel.min, channel.max)
    level = Math.max(level, normalized)
  }
  return clamp01(level)
}

export function readLiveGoboIndex(
  goboMapChannels: MoverPreviewGoboMapChannel[],
  universeData: number[] | undefined
): number | undefined {
  if (universeData === undefined || goboMapChannels.length === 0) {
    return undefined
  }

  for (const goboMap of goboMapChannels) {
    const rawValue = universeData[goboMap.channelIndex]
    if (!Number.isFinite(rawValue) || goboMap.gobos.length === 0) {
      continue
    }

    let selectedIndex = 0
    let minDiff = Math.abs(rawValue - goboMap.gobos[0].max)
    for (let index = 1; index < goboMap.gobos.length; index++) {
      const diff = Math.abs(rawValue - goboMap.gobos[index].max)
      if (diff < minDiff) {
        minDiff = diff
        selectedIndex = index
      }
    }

    return selectedIndex + 1
  }

  return undefined
}

export function readLiveFocusNormalized(
  focusChannels: MoverPreviewFocusChannel[],
  universeData: number[] | undefined
): number | undefined {
  if (universeData === undefined || focusChannels.length === 0) {
    return undefined
  }

  for (const focusChannel of focusChannels) {
    const rawValue = universeData[focusChannel.channelIndex]
    if (!Number.isFinite(rawValue)) {
      continue
    }
    return normalizeDmxRange(rawValue, focusChannel.min, focusChannel.max)
  }

  return undefined
}

export function focusWidthScale(focusNorm: number | undefined): number {
  if (focusNorm === undefined || !Number.isFinite(focusNorm)) {
    return 1
  }
  return lerp(0.55, 1.65, clamp01(focusNorm))
}

export function nearestSurfaceHit(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  spec: SurfaceSpec
): SurfaceHit | undefined {
  const EPS = 0.0001
  let best: SurfaceHit | undefined
  const consider = (hit: SurfaceHit | undefined) => {
    if (hit === undefined) return
    if (best === undefined || hit.distance < best.distance) {
      best = hit
    }
  }

  if (direction.y < -EPS) {
    const t = (spec.floorY - origin.y) / direction.y
    if (t > EPS) {
      const point = origin.clone().addScaledVector(direction, t)
      if (
        point.x >= spec.floorMinX - EPS &&
        point.x <= spec.floorMaxX + EPS &&
        point.z >= spec.floorMinZ - EPS &&
        point.z <= spec.floorMaxZ + EPS
      ) {
        consider({
          point,
          normal: new THREE.Vector3(0, 1, 0),
          distance: t,
          surface: 'floor',
        })
      }
    }
  }

  if (spec.includeCurtain && Math.abs(direction.z) > EPS) {
    const t = (spec.curtainZ - origin.z) / direction.z
    if (t > EPS) {
      const point = origin.clone().addScaledVector(direction, t)
      if (
        point.x >= spec.curtainMinX - EPS &&
        point.x <= spec.curtainMaxX + EPS &&
        point.y >= spec.curtainMinY - EPS &&
        point.y <= spec.curtainMaxY + EPS
      ) {
        consider({
          point,
          normal: new THREE.Vector3(0, 0, direction.z > 0 ? -1 : 1),
          distance: t,
          surface: 'curtain',
        })
      }
    }
  }

  if (spec.includeRoom) {
    if (Math.abs(direction.x) > EPS) {
      const txLeft = (spec.roomMinX - origin.x) / direction.x
      if (txLeft > EPS) {
        const point = origin.clone().addScaledVector(direction, txLeft)
        if (
          point.y >= spec.roomMinY - EPS &&
          point.y <= spec.roomMaxY + EPS &&
          point.z >= spec.roomMinZ - EPS &&
          point.z <= spec.roomMaxZ + EPS
        ) {
          consider({
            point,
            normal: new THREE.Vector3(1, 0, 0),
            distance: txLeft,
            surface: 'curtain',
          })
        }
      }

      const txRight = (spec.roomMaxX - origin.x) / direction.x
      if (txRight > EPS) {
        const point = origin.clone().addScaledVector(direction, txRight)
        if (
          point.y >= spec.roomMinY - EPS &&
          point.y <= spec.roomMaxY + EPS &&
          point.z >= spec.roomMinZ - EPS &&
          point.z <= spec.roomMaxZ + EPS
        ) {
          consider({
            point,
            normal: new THREE.Vector3(-1, 0, 0),
            distance: txRight,
            surface: 'curtain',
          })
        }
      }
    }

    if (Math.abs(direction.z) > EPS) {
      const tzBack = (spec.roomMinZ - origin.z) / direction.z
      if (tzBack > EPS) {
        const point = origin.clone().addScaledVector(direction, tzBack)
        if (
          point.x >= spec.roomMinX - EPS &&
          point.x <= spec.roomMaxX + EPS &&
          point.y >= spec.roomMinY - EPS &&
          point.y <= spec.roomMaxY + EPS
        ) {
          consider({
            point,
            normal: new THREE.Vector3(0, 0, 1),
            distance: tzBack,
            surface: 'curtain',
          })
        }
      }

      const tzFront = (spec.roomMaxZ - origin.z) / direction.z
      if (tzFront > EPS) {
        const point = origin.clone().addScaledVector(direction, tzFront)
        if (
          point.x >= spec.roomMinX - EPS &&
          point.x <= spec.roomMaxX + EPS &&
          point.y >= spec.roomMinY - EPS &&
          point.y <= spec.roomMaxY + EPS
        ) {
          consider({
            point,
            normal: new THREE.Vector3(0, 0, -1),
            distance: tzFront,
            surface: 'curtain',
          })
        }
      }
    }

    if (direction.y > EPS) {
      const tyTop = (spec.roomMaxY - origin.y) / direction.y
      if (tyTop > EPS) {
        const point = origin.clone().addScaledVector(direction, tyTop)
        if (
          point.x >= spec.roomMinX - EPS &&
          point.x <= spec.roomMaxX + EPS &&
          point.z >= spec.roomMinZ - EPS &&
          point.z <= spec.roomMaxZ + EPS
        ) {
          consider({
            point,
            normal: new THREE.Vector3(0, -1, 0),
            distance: tyTop,
            surface: 'curtain',
          })
        }
      }
    }
  }

  return best
}

export function orientDmxValue(
  value: number,
  min: number,
  max: number,
  invert: boolean
): number {
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) ? max : 255
  if (!invert) return value
  return safeMin + safeMax - value
}

export function clampDmxFloat(value: number, fallback: number = 0): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(255, Math.max(0, value))
}

export function unorientDmxValue(
  value: number,
  min: number,
  max: number,
  invert: boolean
): number {
  if (!invert) return value
  return min + max - value
}

export function mapPanNormalizedToDmxPreview(
  normalized: number,
  calibration: MoverCalibration['pan'] | undefined
): number {
  const safeNormalized = clamp01(normalized)
  if (calibration === undefined) {
    return clampDmxFloat(safeNormalized * 255, 128)
  }

  const min = clampDmxFloat(calibration.min, 0)
  const max = clampDmxFloat(calibration.max, 255)
  const span = Math.max(1, Math.abs(max - min))
  const calibrationRangeDeg = Number.isFinite(calibration.rangeDeg)
    ? Math.max(45, Math.min(1440, Number(calibration.rangeDeg)))
    : 540

  const orientedMin = orientDmxValue(min, min, max, calibration.invert)
  const orientedMax = orientDmxValue(max, min, max, calibration.invert)
  const orientedFront = orientDmxValue(
    clampDmxFloat(calibration.front, min),
    min,
    max,
    calibration.invert
  )
  const orientedBack = orientDmxValue(
    clampDmxFloat(calibration.back, min),
    min,
    max,
    calibration.invert
  )

  const direction =
    Math.abs(orientedBack - orientedFront) > 0.0001
      ? Math.sign(orientedBack - orientedFront)
      : Math.sign(orientedMax - orientedMin) || 1

  const canonicalYawDeg = (safeNormalized - 0.5) * 360
  const yawRatio = canonicalYawDeg / Math.max(0.0001, calibrationRangeDeg)
  const orientedDeterministic = orientedFront + direction * yawRatio * span
  const orientedClamped = clamp(
    orientedDeterministic,
    Math.min(orientedMin, orientedMax),
    Math.max(orientedMin, orientedMax)
  )

  return clampDmxFloat(
    unorientDmxValue(orientedClamped, min, max, calibration.invert),
    min
  )
}

export function mapTiltNormalizedToDmxPreview(
  normalized: number,
  mountInverted: boolean,
  calibration: MoverCalibration['tilt'] | undefined
): number {
  const safeNormalized = clamp01(normalized)
  if (calibration === undefined) {
    return clampDmxFloat(safeNormalized * 255, 128)
  }

  const min = clampDmxFloat(calibration.min, 0)
  const max = clampDmxFloat(calibration.max, 255)
  const orientedLow = Math.min(
    orientDmxValue(min, min, max, calibration.invert),
    orientDmxValue(max, min, max, calibration.invert)
  )
  const orientedHigh = Math.max(
    orientDmxValue(min, min, max, calibration.invert),
    orientDmxValue(max, min, max, calibration.invert)
  )
  const orientedMin = orientDmxValue(min, min, max, calibration.invert)
  const orientedMax = orientDmxValue(max, min, max, calibration.invert)
  const orientedForward = orientDmxValue(
    clampDmxFloat(calibration.forward, min),
    min,
    max,
    calibration.invert
  )
  const orientedUp = orientDmxValue(
    clampDmxFloat(calibration.up, min),
    min,
    max,
    calibration.invert
  )
  const orientedDown = orientDmxValue(
    clampDmxFloat(calibration.down, min),
    min,
    max,
    calibration.invert
  )
  const preferredCenterAnchor = mountInverted ? orientedDown : orientedUp
  const fallbackCenterAnchor = mountInverted ? orientedUp : orientedDown
  const clampedForward = clamp(orientedForward, orientedLow, orientedHigh)
  let clampedCenterAnchor = clamp(preferredCenterAnchor, orientedLow, orientedHigh)
  if (Math.abs(clampedCenterAnchor - clampedForward) <= 0.0001) {
    clampedCenterAnchor = clamp(fallbackCenterAnchor, orientedLow, orientedHigh)
  }

  let forwardDirection = Math.sign(clampedForward - clampedCenterAnchor)
  if (forwardDirection === 0) {
    forwardDirection = Math.sign(orientedMax - orientedMin) || 1
  }
  const forwardLimit = forwardDirection >= 0 ? orientedHigh : orientedLow
  const behindLimit = forwardDirection >= 0 ? orientedLow : orientedHigh
  const signedRatio = safeNormalized * 2 - 1
  const oriented =
    signedRatio >= 0
      ? lerp(clampedCenterAnchor, behindLimit, signedRatio)
      : lerp(clampedCenterAnchor, forwardLimit, -signedRatio)
  const orientedClamped = clamp(
    oriented,
    Math.min(orientedMin, orientedMax),
    Math.max(orientedMin, orientedMax)
  )
  return clampDmxFloat(
    unorientDmxValue(orientedClamped, min, max, calibration.invert),
    min
  )
}

export function solveNormalizedFromDmx(
  targetDmx: number,
  mapper: (normalized: number) => number,
  fallback: number
): number {
  const target = clampDmxFloat(targetDmx, 128)
  let bestN = clamp01(fallback)
  let bestErr = Math.abs(mapper(bestN) - target)

  const samples = 256
  for (let i = 0; i <= samples; i++) {
    const n = i / samples
    const err = Math.abs(mapper(n) - target)
    if (err < bestErr) {
      bestErr = err
      bestN = n
    }
  }

  let step = 1 / 16
  while (step >= 1 / 4096) {
    const left = clamp01(bestN - step)
    const right = clamp01(bestN + step)
    const leftErr = Math.abs(mapper(left) - target)
    const rightErr = Math.abs(mapper(right) - target)
    if (leftErr + 0.0001 < bestErr) {
      bestN = left
      bestErr = leftErr
    } else if (rightErr + 0.0001 < bestErr) {
      bestN = right
      bestErr = rightErr
    } else {
      step *= 0.5
    }
  }

  return clamp01(bestN)
}

const previewPanYawByFixtureId = new Map<string, number>()

export function resolveNearestEquivalentPreviewYaw(
  canonicalYawDeg: number,
  preferredYawDeg: number
): number {
  let best = canonicalYawDeg
  let bestDistance = Math.abs(best - preferredYawDeg)
  for (let k = -3; k <= 3; k++) {
    const candidate = canonicalYawDeg + k * 360
    const distance = Math.abs(candidate - preferredYawDeg)
    if (distance < bestDistance - 0.0001) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

export function mapPanDmxToYawDeg(
  value: number,
  calibration: MoverCalibration | undefined,
  fallbackNorm: number,
  fixtureId?: string,
  usePhysicalLinearDecode = false
): number {
  if (calibration === undefined) {
    // Renderer preview uses opposite handedness on Y yaw vs DMX pan intent.
    // Flip only the preview yaw so model pan matches real fixtures.
    const fallbackYaw = -((fallbackNorm - 0.5) * 360)
    if (fixtureId !== undefined) {
      const preferred = previewPanYawByFixtureId.get(fixtureId) ?? fallbackYaw
      const resolved = resolveNearestEquivalentPreviewYaw(fallbackYaw, preferred)
      previewPanYawByFixtureId.set(fixtureId, resolved)
      return resolved
    }
    return fallbackYaw
  }

  const normalized = usePhysicalLinearDecode
    ? mapAxisPhysicalDmxToNormalized(value, calibration.pan)
    : solveNormalizedFromDmx(
        value,
        (n) => mapPanNormalizedToDmxPreview(n, calibration.pan),
        fallbackNorm
      )
  const rangeDeg = Number.isFinite(calibration.pan.rangeDeg)
    ? Math.max(45, Math.min(1440, Number(calibration.pan.rangeDeg)))
    : 540
  const anchorNorm = usePhysicalLinearDecode
    ? 0.5
    : mapAxisPhysicalDmxToNormalized(calibration.pan.front, calibration.pan)
  const canonicalYaw = -((normalized - anchorNorm) * rangeDeg)
  if (fixtureId === undefined) {
    return canonicalYaw
  }
  const preferred = previewPanYawByFixtureId.get(fixtureId) ?? canonicalYaw
  const resolved = resolveNearestEquivalentPreviewYaw(canonicalYaw, preferred)
  previewPanYawByFixtureId.set(fixtureId, resolved)
  return resolved
}

export function mapTiltDmxToPitchDeg(
  value: number,
  calibration: MoverCalibration | undefined,
  fallbackNorm: number,
  mountInverted: boolean,
  usePhysicalLinearDecode = false
): number {
  if (calibration === undefined) {
    return lerp(-90, 90, fallbackNorm)
  }
  const normalized = usePhysicalLinearDecode
    ? mapAxisPhysicalDmxToNormalized(value, calibration.tilt)
    : solveNormalizedFromDmx(
        value,
        (n) => mapTiltNormalizedToDmxPreview(n, mountInverted, calibration.tilt),
        fallbackNorm
      )
  const rangeDeg = Number.isFinite(calibration.tilt.rangeDeg)
    ? Math.max(30, Math.min(720, calibration.tilt.rangeDeg))
    : 270
  const halfRangeDeg = rangeDeg * 0.5
  const signedRatio = normalized * 2 - 1

  // Model-space tilt is center-focused:
  // midpoint of calibrated tilt range = vertical (up for upright, down for hung).
  // Keep this preview-only; DMX output remains unchanged.
  const centerPitchDeg = mountInverted ? -90 : 90
  const orientationSign = mountInverted ? -1 : 1
  const pitchDeg = centerPitchDeg + orientationSign * signedRatio * halfRangeDeg
  const wrapped = ((pitchDeg + 180) % 360 + 360) % 360 - 180
  return wrapped === -180 ? 180 : wrapped
}

export function directionFromYawPitch(yawDeg: number, pitchDeg: number): THREE.Vector3 {
  const yaw = THREE.MathUtils.degToRad(yawDeg)
  const pitch = THREE.MathUtils.degToRad(pitchDeg)
  const cosPitch = Math.cos(pitch)

  return new THREE.Vector3(
    Math.sin(yaw) * cosPitch,
    Math.sin(pitch),
    Math.cos(yaw) * cosPitch
  ).normalize()
}

export function projectAimToFloor(
  fixtureWorld: { worldX: number; worldY: number; worldZ: number },
  yawDeg: number,
  pitchDeg: number
): { x: number; z: number } | undefined {
  const direction = directionFromYawPitch(yawDeg, pitchDeg)
  if (direction.y >= -0.0001) {
    return undefined
  }

  const t = (DANCE_FLOOR_Y - fixtureWorld.worldY) / direction.y
  if (!Number.isFinite(t) || t <= 0) {
    return undefined
  }

  return {
    x: fixtureWorld.worldX + direction.x * t,
    z: fixtureWorld.worldZ + direction.z * t,
  }
}

export function targetFromLiveAxis(
  fixture: MoverPreviewFixture,
  liveAxis: LiveAxisValues,
  fixtureWorld: { worldX: number; worldY: number; worldZ: number },
  usePhysicalLinearDecode = false
): { worldX: number; worldY: number; worldZ: number } {
  const yawDeg = mapPanDmxToYawDeg(
    liveAxis.panRaw,
    fixture.moverCalibration,
    liveAxis.panNorm,
    fixture.fixtureId,
    usePhysicalLinearDecode
  )
  const pitchDeg = mapTiltDmxToPitchDeg(
    liveAxis.tiltRaw,
    fixture.moverCalibration,
    liveAxis.tiltNorm,
    fixture.moverMountOrientation === 'inverted',
    usePhysicalLinearDecode
  )

  const floorHit = projectAimToFloor(fixtureWorld, yawDeg, pitchDeg)
  if (floorHit !== undefined) {
    return {
      worldX: floorHit.x,
      worldY: DANCE_FLOOR_Y,
      worldZ: floorHit.z,
    }
  }

  const direction = directionFromYawPitch(yawDeg, pitchDeg)
  return {
    worldX: fixtureWorld.worldX + direction.x * FALLBACK_TARGET_LENGTH,
    worldY: fixtureWorld.worldY + direction.y * FALLBACK_TARGET_LENGTH,
    worldZ: fixtureWorld.worldZ + direction.z * FALLBACK_TARGET_LENGTH,
  }
}

export function findClosestReferenceIndex<T>(
  items: T[],
  isReference: (item: T, index: number) => boolean,
  targetIndex: number,
  primaryDistance: (left: T, right: T) => number,
  secondaryDistance: (left: T, right: T) => number
): number | undefined {
  const target = items[targetIndex]
  if (target === undefined) {
    return undefined
  }

  let bestIndex: number | undefined
  let bestPrimary = Number.POSITIVE_INFINITY
  let bestSecondary = Number.POSITIVE_INFINITY

  items.forEach((candidate, candidateIndex) => {
    if (!isReference(candidate, candidateIndex)) {
      return
    }

    const primary = primaryDistance(target, candidate)
    const secondary = secondaryDistance(target, candidate)
    const candidateId = candidateIndex
    const bestId = bestIndex ?? Number.POSITIVE_INFINITY
    const isBetter =
      primary < bestPrimary - 0.000001 ||
      (Math.abs(primary - bestPrimary) <= 0.000001 &&
        (secondary < bestSecondary - 0.000001 ||
          (Math.abs(secondary - bestSecondary) <= 0.000001 && candidateId < bestId)))

    if (isBetter) {
      bestIndex = candidateIndex
      bestPrimary = primary
      bestSecondary = secondary
    }
  })

  return bestIndex
}

export function resolveSplitParamsForFixture(
  fixtureGroups: string[],
  splitScenes: SplitScene_t[],
  splitStates: Array<{ outputParams: Params } | undefined>,
  fallbackParams: Params
): Params[] {
  if (splitScenes.length === 0 || splitStates.length === 0) {
    return [fallbackParams]
  }

  const matched: Params[] = []
  for (let i = 0; i < splitScenes.length; i++) {
    if (!fixtureGroupsMatchSceneGroups(fixtureGroups, splitScenes[i].groups)) {
      continue
    }
    const params = splitStates[i]?.outputParams
    if (params !== undefined) {
      matched.push(params)
    }
  }

  if (matched.length > 0) {
    return matched
  }

  const fallback = splitStates[0]?.outputParams ?? fallbackParams
  return [fallback]
}

export function combineLedLayers(layers: BaseColors[][]): BaseColors[] {
  if (layers.length === 0) {
    return []
  }

  const pixelCount = layers.reduce((maxCount, layer) => {
    return Math.max(maxCount, layer.length)
  }, 0)

  const merged: BaseColors[] = Array.from({ length: pixelCount }, () => ({
    red: 0,
    green: 0,
    blue: 0,
  }))

  for (const layer of layers) {
    for (let pixelIndex = 0; pixelIndex < layer.length; pixelIndex++) {
      const source = layer[pixelIndex]
      const current = merged[pixelIndex]
      if (source === undefined || current === undefined) continue
      current.red = Math.max(current.red, source.red)
      current.green = Math.max(current.green, source.green)
      current.blue = Math.max(current.blue, source.blue)
    }
  }

  return merged
}

function previewGroupHasColorKind(
  colorChannels: MoverPreviewColorChannel[],
  kind: ColorKind | 'rgb'
): boolean {
  return colorChannels.some((channel) => {
    const inferred = inferColorKind(channel.color)
    if (kind === 'rgb') {
      return inferred === 'color'
    }
    return inferred === kind
  })
}

export function buildTargets(
  fixtures: MoverPreviewFixture[],
  fallbackParams: Params,
  splitStates: Array<{ outputParams: Params } | undefined>,
  splitScenes: SplitScene_t[],
  dmxOutByUniverse: number[][],
  floorSpec: FloorSpec,
  stageHeight: number,
  master: number,
  fxtrDepthOn: boolean
): PreviewTarget[] {
  const placementDepth2DOnly = !fxtrDepthOn
  const baseX = clamp01(getParam(fallbackParams, 'xAxis'))
  const baseY = clamp01(getParam(fallbackParams, 'yAxis'))
  const spread = clamp01(getParam(fallbackParams, 'moverSpread'))
  const mirrorLeftRight = getParam(fallbackParams, 'moverMirrorX') > 0.5
  const mirrorTopBottom = getParam(fallbackParams, 'moverMirrorY') > 0.5
  const moverMode = parseMoverMode(fallbackParams)

  const grouped: Record<string, MoverPreviewFixture[]> = {}
  for (const fixture of fixtures) {
    const groupName =
      fixture.groupName.trim().length > 0
        ? fixture.groupName.trim()
        : 'Mover Group'
    const items = grouped[groupName] ?? []
    items.push(fixture)
    grouped[groupName] = items
  }

  const targets: PreviewTarget[] = []
  const activeFixtureIds = new Set<string>()

  for (const [groupName, rawGroupFixtures] of Object.entries(grouped)) {
    const groupFixtures = [...rawGroupFixtures].sort((left, right) => {
      if (left.xPos !== right.xPos) return left.xPos - right.xPos
      if (left.yPos !== right.yPos) return left.yPos - right.yPos
      return left.fixtureId.localeCompare(right.fixtureId)
    })

    let minX = 1
    let maxX = 0
    let minY = 1
    let maxY = 0

    for (const fixture of groupFixtures) {
      minX = Math.min(minX, fixture.xPos)
      maxX = Math.max(maxX, fixture.xPos)
      minY = Math.min(minY, fixture.yPos)
      maxY = Math.max(maxY, fixture.yPos)
    }

    const spanX = maxX - minX
    const spanY = maxY - minY
    const hasHorizontalSpread = spanX > 0.0001
    const hasVerticalSpread = spanY > 0.0001
    const centerX = (minX + maxX) * 0.5
    const centerY = (minY + maxY) * 0.5
    const sideEpsilon = 0.0001
    const isRightFlags = groupFixtures.map((fixture, fixtureIndex) =>
      hasHorizontalSpread
        ? fixture.xPos > centerX + sideEpsilon
        : fixtureIndex >= Math.ceil(groupFixtures.length / 2)
    )
    // `yPos` uses top=1, bottom=0 in this view model.
    const isBottomFlags = groupFixtures.map((fixture) =>
      hasVerticalSpread ? fixture.yPos < centerY - sideEpsilon : false
    )

    const groupColor = colorForGroup(groupName)

    groupFixtures.forEach((fixture, fixtureIndex) => {
      activeFixtureIds.add(fixture.fixtureId)
      const relX = hasHorizontalSpread
        ? clamp01((fixture.xPos - minX) / spanX)
        : groupFixtures.length <= 1
          ? 0.5
          : fixtureIndex / (groupFixtures.length - 1)
      const relY = hasVerticalSpread
        ? clamp01((fixture.yPos - minY) / spanY)
        : 0.5

      let targetNormX = baseX
      let targetNormY = baseY

      if (moverMode === 1) {
        targetNormX = baseX + (relX - 0.5) * spread
        targetNormY = baseY + (relY - 0.5) * spread
      } else if (moverMode === 2) {
        const isRight = isRightFlags[fixtureIndex] === true
        const isBottom = isBottomFlags[fixtureIndex] === true

        if (mirrorLeftRight && isRight) {
          const refIndex = findClosestReferenceIndex(
            groupFixtures,
            (_candidate, candidateIndex) => isRightFlags[candidateIndex] !== true,
            fixtureIndex,
            (left, right) => Math.abs(left.yPos - right.yPos),
            (left, right) => Math.abs(left.xPos - right.xPos)
          )
          if (refIndex !== undefined) {
            const ref = groupFixtures[refIndex]
            // Keep forward alignment while mirroring left/right turn direction.
            targetNormX = fixture.xPos + ref.xPos - targetNormX
          } else {
            targetNormX = centerX * 2 - baseX
          }
        }
        if (mirrorTopBottom && isBottom) {
          const refIndex = findClosestReferenceIndex(
            groupFixtures,
            (_candidate, candidateIndex) => isBottomFlags[candidateIndex] !== true,
            fixtureIndex,
            (left, right) => Math.abs(left.xPos - right.xPos),
            (left, right) => Math.abs(left.yPos - right.yPos)
          )
          if (refIndex !== undefined) {
            const ref = groupFixtures[refIndex]
            // Keep forward alignment while mirroring up/down tilt direction.
            targetNormY = fixture.yPos + ref.yPos - targetNormY
          } else {
            targetNormY = centerY * 2 - baseY
          }
        }
      }

      const fixtureWorld = fixtureWorldFromUniversePosition(
        fixture.xPos,
        fixture.yPos,
        fixture.zPos,
        floorSpec,
        stageHeight
      )
      const modelKind = resolveModelKind(fixture)
      const isMoverModel = isMoverModelKind(modelKind)
      const modelWidth = clamp(fixture.model.width, 0.2, 8)
      const universe = Math.max(1, Math.round(fixture.universe || 1))
      const universeData = dmxOutByUniverse[universe - 1]

      if (fixture.isLedFixture) {
        const ledParams = resolveSplitParamsForFixture(
          fixture.groups,
          splitScenes,
          splitStates,
          fallbackParams
        )
        const ledFixture = fixture.ledFixture
        const ledLayers =
          ledFixture !== undefined
            ? ledParams.map((params) =>
                getLedValues(params, ledFixture, master, placementDepth2DOnly)
              )
            : []
        const combinedLedValues = combineLedLayers(ledLayers)
        const emitters: PreviewEmitterTarget[] = (fixture.ledPixels ?? []).map(
          (pixel, pixelIndex) => {
            const pixelColor = combinedLedValues[pixelIndex]
            const color =
              pixelColor !== undefined
                ? new THREE.Color(pixelColor.red, pixelColor.green, pixelColor.blue)
                : new THREE.Color(0, 0, 0)
            const intensity =
              pixelColor !== undefined
                ? clamp01(Math.max(pixelColor.red, pixelColor.green, pixelColor.blue))
                : 0
            return {
              localX: pixel.x,
              localY: pixel.y,
              localZ: pixel.z,
              color,
              intensity,
              effectIntensity: 0,
              shape: 'disc',
              sizeScale: 1,
              liveChannelSet: EMPTY_BEAM_CHANNEL_SET,
              liveEffectChannels: [],
            }
          }
        )
        if (emitters.length === 0) {
          return
        }

        targets.push({
          fixtureId: fixture.fixtureId,
          modelKind,
          modelWidth,
          bodyShape: fixture.model.bodyShape,
          bodyHeight: fixture.model.bodyHeight,
          bodyDepth: fixture.model.bodyDepth,
          bodyDiameter: fixture.model.bodyDiameter,
          moverBeamAngleDeg: fixture.model.moverBeamAngleDeg,
          atmosphereEffect: fixture.model.atmosphereEffect,
          atmosphereNozzleDirection: fixture.model.atmosphereNozzleDirection,
          hasAtmosLighting: false,
          isMoverModel: false,
          isLedFixture: true,
          ledFixtureIndex: fixture.ledFixtureIndex,
          ledWireEdges: fixture.ledWireEdges,
          rotation: fixture.rotation,
          fixtureX: fixtureWorld.worldX,
          fixtureY: fixtureWorld.worldY,
          fixtureZ: fixtureWorld.worldZ,
          targetX: fixtureWorld.worldX,
          targetY: fixtureWorld.worldY,
          targetZ: fixtureWorld.worldZ,
          focusNorm: 0,
          hasFocusChannel: false,
          mountInverted: false,
          emitters,
        })
        return
      }

      let targetWorld = danceFloorWorldFromNormalized(
        targetNormX,
        targetNormY,
        floorSpec
      )
      const bodyDepthForFace = clamp(fixture.model.bodyDepth, 0.04, 3)
      const bodyHeightForFace = clamp(fixture.model.bodyHeight, 0.04, 3)
      const bodyShapeForFace = fixture.model.bodyShape
      const moverHeadFaceZ = moverHeadEmitterBackPlaneLocalZ(
        modelWidth,
        bodyDepthForFace,
        bodyHeightForFace,
        fixture.model.bodyDiameter,
        modelKind === 'moverWash'
      )
      let aimYawDeg: number | undefined = undefined
      let aimPitchDeg: number | undefined = undefined

      const liveAxis =
        isMoverModel ? readLiveAxisValues(fixture, dmxOutByUniverse) : undefined
      if (isMoverModel && liveAxis !== undefined) {
        aimYawDeg = mapPanDmxToYawDeg(
          liveAxis.panRaw,
          fixture.moverCalibration,
          liveAxis.panNorm,
          fixture.fixtureId,
          true
        )
        aimPitchDeg = mapTiltDmxToPitchDeg(
          liveAxis.tiltRaw,
          fixture.moverCalibration,
          liveAxis.tiltNorm,
          fixture.moverMountOrientation === 'inverted',
          true
        )
        // Match engine: linear pan/tilt decode across calibrated min/max.
        targetWorld = targetFromLiveAxis(
          fixture,
          liveAxis,
          fixtureWorld,
          true
        )
      }

      const focusNorm = readLiveFocusNormalized(fixture.focusChannels, universeData)
      const hasFocusChannel = fixture.focusChannels.length > 0

      const goboIndex = readLiveGoboIndex(fixture.goboMapChannels, universeData)
      const emitters: PreviewEmitterTarget[] = []
      let hasAtmosLighting = false

      const hasPerEmitterLayout = fixture.customEmitters.length > 0
      if (hasPerEmitterLayout) {
        const bodyWidth = modelWidth
        const bodyHeight = clamp(fixture.model.bodyHeight, 0.04, 3)
        const bodyDepth = clamp(fixture.model.bodyDepth, 0.04, 3)
        const moverFaceZ = moverHeadFaceZ

        for (const customEmitter of fixture.customEmitters) {
          const absoluteChannelSet = new Set<number>(
            customEmitter.channelIndexes.map(
              (channelIndex) => fixture.channelBase + channelIndex - 1
            )
          )
          const emitterChannels = {
            colorChannels: fixture.colorChannels.filter((channel) =>
              absoluteChannelSet.has(channel.channelIndex)
            ),
            colorMapChannels: fixture.colorMapChannels.filter((channel) =>
              absoluteChannelSet.has(channel.channelIndex)
            ),
            masterChannels: fixture.masterChannels.filter((channel) =>
              absoluteChannelSet.has(channel.channelIndex)
            ),
            effectChannels: fixture.effectChannels.filter((channel) =>
              absoluteChannelSet.has(channel.channelIndex)
            ),
          }
          const hasLightingChannels =
            emitterChannels.colorChannels.length > 0 ||
            emitterChannels.colorMapChannels.length > 0 ||
            emitterChannels.masterChannels.length > 0

          const beamValues = readLiveBeamValuesForChannels(
            {
              colorChannels: emitterChannels.colorChannels,
              colorMapChannels: emitterChannels.colorMapChannels,
              masterChannels: emitterChannels.masterChannels,
            },
            universeData,
            fallbackParams,
            groupColor,
            master
          )
          const effectLevel = readLiveEffectLevelForChannels(
            emitterChannels.effectChannels,
            universeData
          )
          if (modelKind === 'atmosphericFxtr' && hasLightingChannels) {
            hasAtmosLighting = true
          }

          const placementCtx: FixturePlacementContext = {
            modelKind,
            bodyShape: bodyShapeForFace,
            modelWidth: bodyWidth,
            bodyHeight,
            bodyDepth,
            bodyDiameter: fixture.model.bodyDiameter,
          }
          const { offsetX, offsetY } = emitterFaceOffsetFromNormalized(
            placementCtx,
            customEmitter.x,
            customEmitter.y
          )
          const layoutFaceZ01 = previewEmitterFaceZ01(fxtrDepthOn, customEmitter.z)
          const beamOffset = emitterBeamOffsetFromFaceZ01(
            placementCtx,
            layoutFaceZ01
          )
          const localX = offsetX
          const localY =
            modelKind === 'uplight' ? beamOffset : offsetY
          const localZ =
            modelKind === 'uplight'
              ? offsetY
              : isMoverModel
                ? moverFaceZ +
                  (layoutFaceZ01 - 0.5) *
                    2 *
                    fixtureBodyHalfExtentAlongBeam(placementCtx) *
                    0.15
                : beamOffset

          const face = normalizeRectEmitterFaceDimensionsM(customEmitter)
          const equivD = Math.sqrt(
            Math.max(
              EMITTER_DIAMETER_MIN_M * EMITTER_DIAMETER_MIN_M,
              face.widthM * face.heightM
            )
          )
          emitters.push({
            localX,
            localY,
            localZ,
            color: beamValues.color.clone(),
            intensity:
              modelKind === 'atmosphericFxtr' && !hasLightingChannels
                ? 0
                : beamValues.intensity,
            effectIntensity: effectLevel,
            shape: customEmitter.shape,
            sizeScale:
              customEmitter.shape === 'disc'
                ? emitterDiameterMToVisualSizeScale(customEmitter.size)
                : emitterDiameterMToVisualSizeScale(equivD),
            rectWidthM:
              customEmitter.shape === 'disc' ? undefined : face.widthM,
            rectHeightM:
              customEmitter.shape === 'disc' ? undefined : face.heightM,
            liveChannelSet: {
              colorChannels: emitterChannels.colorChannels,
              colorMapChannels: emitterChannels.colorMapChannels,
              masterChannels: emitterChannels.masterChannels,
            },
            liveEffectChannels: emitterChannels.effectChannels,
          })
        }
      } else {
        const emitterGroups =
          fixture.emitterGroups.length > 0
            ? fixture.emitterGroups
            : [
                {
                  emitterCount: 1,
                  relativeX: 0.5,
                  relativeY: 0.5,
                  relativeZ: 1,
                  colorChannels: fixture.colorChannels,
                  colorMapChannels: fixture.colorMapChannels,
                  masterChannels: fixture.masterChannels,
                  effectChannels: fixture.effectChannels,
                  goboMapChannels: fixture.goboMapChannels,
                },
              ]

        const washBarGroupCount = emitterGroups.length
        const washBarUsableWidth = modelWidth * 0.88
        const washBarSectionWidth =
          washBarGroupCount > 0
            ? washBarUsableWidth / washBarGroupCount
            : washBarUsableWidth
        const washBarClusterWidth = Math.max(
          0.01,
          Math.min(
            washBarSectionWidth * 0.72,
            Math.min(modelWidth * 0.22, washBarSectionWidth * 0.92)
          )
        )

        const groupSamples = emitterGroups.map((emitterGroup) => {
          const beamValues = readLiveBeamValuesForChannels(
            {
              colorChannels: emitterGroup.colorChannels,
              colorMapChannels: emitterGroup.colorMapChannels,
              masterChannels: emitterGroup.masterChannels,
            },
            universeData,
            fallbackParams,
            groupColor,
            master
          )
          const effectLevel = readLiveEffectLevelForChannels(
            emitterGroup.effectChannels,
            universeData
          )
          const hasLightingChannels =
            emitterGroup.colorChannels.length > 0 ||
            emitterGroup.colorMapChannels.length > 0 ||
            emitterGroup.masterChannels.length > 0
          return {
            emitterGroup,
            beamValues,
            effectLevel,
            hasLightingChannels,
          }
        })
        if (modelKind === 'atmosphericFxtr') {
          hasAtmosLighting = groupSamples.some((sample) => sample.hasLightingChannels)
        }

        if (modelKind === 'washBar' && fixture.model.washBarLayoutMode === 'multiStrip') {
          const rgbCount = Math.max(1, Math.min(64, Math.round(fixture.model.washBarRgbCount)))
          const coolWhiteCount = Math.max(
            1,
            Math.min(64, Math.round(fixture.model.washBarCoolWhiteCount))
          )
          const warmWhiteCount = Math.max(
            1,
            Math.min(64, Math.round(fixture.model.washBarWarmWhiteCount))
          )
          const laneWidth = modelWidth * 0.88
          const stripPlacementCtx: FixturePlacementContext = {
            modelKind,
            bodyShape: bodyShapeForFace,
            modelWidth,
            bodyHeight: clamp(fixture.model.bodyHeight, 0.04, 2),
            bodyDepth: clamp(fixture.model.bodyDepth, 0.04, 2.4),
            bodyDiameter: fixture.model.bodyDiameter,
          }
          const stripFaceBeamOffset = fixtureFrontFaceBeamOffset(stripPlacementCtx)
          const rgbGroupSamples = groupSamples.filter((sample) =>
            previewGroupHasColorKind(sample.emitterGroup.colorChannels, 'rgb')
          )
          const warmWhiteSample = groupSamples.find((sample) =>
            previewGroupHasColorKind(
              sample.emitterGroup.colorChannels,
              'warmWhite'
            )
          )
          const coolWhiteSample = groupSamples.find((sample) =>
            previewGroupHasColorKind(sample.emitterGroup.colorChannels, 'white')
          )
          const fallbackSample = groupSamples[0]
          const pushStripEmitter = (
            count: number,
            laneY: number,
            sample: (typeof groupSamples)[number] | undefined,
            shape: PreviewEmitterShape,
            sizeScale: number
          ) => {
            if (sample === undefined) {
              return
            }
            for (let emitterIndex = 0; emitterIndex < count; emitterIndex++) {
              const normalizedPosition =
                count <= 1 ? 0.5 : emitterIndex / Math.max(1, count - 1)
              const slot = normalizedPosition - 0.5
              emitters.push({
                localX: slot * laneWidth,
                localY: laneY,
                localZ: stripFaceBeamOffset,
                color: sample.beamValues.color.clone(),
                intensity: sample.beamValues.intensity,
                effectIntensity: 0,
                shape,
                sizeScale,
                liveChannelSet: {
                  colorChannels: sample.emitterGroup.colorChannels,
                  colorMapChannels: sample.emitterGroup.colorMapChannels,
                  masterChannels: sample.emitterGroup.masterChannels,
                },
                liveEffectChannels: sample.emitterGroup.effectChannels,
              })
            }
          }
          pushStripEmitter(
            rgbCount,
            0.09,
            rgbGroupSamples[0] ?? fallbackSample,
            'rect-h',
            0.82
          )
          pushStripEmitter(
            rgbCount,
            -0.09,
            rgbGroupSamples[1] ?? rgbGroupSamples[0] ?? fallbackSample,
            'rect-h',
            0.82
          )
          pushStripEmitter(
            warmWhiteCount,
            0,
            warmWhiteSample ?? fallbackSample,
            'disc',
            1.12
          )
          pushStripEmitter(
            coolWhiteCount,
            0,
            coolWhiteSample ?? warmWhiteSample ?? fallbackSample,
            'rect-v',
            0.9
          )
        } else {
        for (const [, groupSample] of groupSamples.entries()) {
          const { emitterGroup, beamValues, effectLevel, hasLightingChannels } = groupSample
          const count = Math.max(
            1,
            Math.min(64, Math.round(emitterGroup.emitterCount))
          )
          if (modelKind === 'washBar') {
            // Align cluster centers with subfixture anchors (same semantics as DMX spatial
            // windows), not only equal spacing by sub-index.
            const centerX =
              (clamp01(emitterGroup.relativeX) - 0.5) * washBarUsableWidth
            const centerY = 0

            for (let emitterIndex = 0; emitterIndex < count; emitterIndex++) {
              const slot =
                count <= 1 ? 0 : emitterIndex / Math.max(1, count - 1) - 0.5
              emitters.push({
                localX: centerX + slot * washBarClusterWidth,
                localY: centerY,
                localZ: fixtureFrontFaceBeamOffset({
                  modelKind,
                  bodyShape: bodyShapeForFace,
                  modelWidth,
                  bodyHeight: clamp(fixture.model.bodyHeight, 0.04, 2),
                  bodyDepth: clamp(fixture.model.bodyDepth, 0.04, 2.4),
                  bodyDiameter: fixture.model.bodyDiameter,
                }),
                color: beamValues.color.clone(),
                intensity: beamValues.intensity,
                effectIntensity: 0,
                shape: 'disc',
                sizeScale: 1,
                liveChannelSet: {
                  colorChannels: emitterGroup.colorChannels,
                  colorMapChannels: emitterGroup.colorMapChannels,
                  masterChannels: emitterGroup.masterChannels,
                },
                liveEffectChannels: emitterGroup.effectChannels,
              })
            }
          } else if (modelKind === 'moverWash') {
            const centerX = (clamp01(emitterGroup.relativeX) - 0.5) * modelWidth * 0.18
            const centerY = (0.5 - clamp01(emitterGroup.relativeY)) * 0.08
            const centerZ = (clamp01(emitterGroup.relativeZ) - 0.5) * 0.04
            const radius = clamp(modelWidth * 0.11, 0.03, 0.18)
            for (let emitterIndex = 0; emitterIndex < count; emitterIndex++) {
              if (emitterIndex === 0 || count === 1) {
                emitters.push({
                  localX: centerX,
                  localY: centerY,
                  localZ: moverHeadFaceZ + centerZ * 0.06,
                  color: beamValues.color.clone(),
                  intensity: beamValues.intensity,
                  effectIntensity: 0,
                  shape: 'disc',
                  sizeScale: 1,
                  liveChannelSet: {
                    colorChannels: emitterGroup.colorChannels,
                    colorMapChannels: emitterGroup.colorMapChannels,
                    masterChannels: emitterGroup.masterChannels,
                  },
                  liveEffectChannels: emitterGroup.effectChannels,
                })
                continue
              }

              const ringIndex = emitterIndex - 1
              const ringCount = Math.max(1, count - 1)
              const angle = (ringIndex / ringCount) * Math.PI * 2
              emitters.push({
                localX: centerX + Math.cos(angle) * radius,
                localY: centerY + Math.sin(angle) * radius,
                localZ: moverHeadFaceZ + centerZ * 0.06,
                color: beamValues.color.clone(),
                intensity: beamValues.intensity,
                effectIntensity: 0,
                shape: 'disc',
                sizeScale: 1,
                liveChannelSet: {
                  colorChannels: emitterGroup.colorChannels,
                  colorMapChannels: emitterGroup.colorMapChannels,
                  masterChannels: emitterGroup.masterChannels,
                },
                liveEffectChannels: emitterGroup.effectChannels,
              })
            }
          } else if (modelKind === 'atmosphericFxtr') {
            const centerX = (clamp01(emitterGroup.relativeX) - 0.5) * modelWidth * 0.7
            const centerY = (0.5 - clamp01(emitterGroup.relativeY)) * 0.12
            const centerZ = (clamp01(emitterGroup.relativeZ) - 0.5) * 0.25
            const nozzleY =
              fixture.model.atmosphereNozzleDirection === 'up' ? 0.27 + centerY : 0.16 + centerY
            const nozzleZ =
              fixture.model.atmosphereNozzleDirection === 'forward'
                ? 0.19 + centerZ
                : 0.02 + centerZ
            const ringRadius = clamp(
              modelWidth *
                (count <= 1 ? 0 : 0.09 + Math.min(0.16, count * 0.006)),
              0.03,
              0.24
            )
            for (let emitterIndex = 0; emitterIndex < count; emitterIndex++) {
              const angle =
                count <= 1 ? 0 : (emitterIndex / Math.max(1, count)) * Math.PI * 2
              const ringX = Math.cos(angle) * ringRadius
              const ringY = Math.sin(angle) * ringRadius
              emitters.push({
                // Atmosphere fixture emitters surround the nozzle in a circular layout.
                // Keep this ring on the plane perpendicular to nozzle direction.
                localX: centerX + ringX,
                localY:
                  fixture.model.atmosphereNozzleDirection === 'forward'
                    ? nozzleY + ringY
                    : nozzleY,
                localZ:
                  fixture.model.atmosphereNozzleDirection === 'forward'
                    ? nozzleZ
                    : nozzleZ + ringY,
                color: beamValues.color.clone(),
                intensity: hasLightingChannels ? beamValues.intensity : 0,
                effectIntensity: effectLevel,
                shape: 'disc',
                sizeScale: 1,
                liveChannelSet: {
                  colorChannels: emitterGroup.colorChannels,
                  colorMapChannels: emitterGroup.colorMapChannels,
                  masterChannels: emitterGroup.masterChannels,
                },
                liveEffectChannels: emitterGroup.effectChannels,
              })
            }
          } else {
            const faceWidthScale = fixtureEmitterFaceWidthScale(modelKind)
            const centerX = isMoverModel
              ? (clamp01(emitterGroup.relativeX) - 0.5) * modelWidth * 0.18
              : (clamp01(emitterGroup.relativeX) - 0.5) * modelWidth * faceWidthScale
            const centerY =
              (0.5 - clamp01(emitterGroup.relativeY)) * (isMoverModel ? 0.08 : 0.2)
            const centerZ =
              (clamp01(emitterGroup.relativeZ) - 0.5) * (isMoverModel ? 0.04 : 0.12)
            const spread =
              modelKind === 'uplight'
                ? modelWidth * 0.16
                : modelKind === 'moverSpot'
                ? 0.04
                : 0.14
            const placementCtx: FixturePlacementContext = {
              modelKind,
              bodyShape: bodyShapeForFace,
              modelWidth,
              bodyHeight: bodyHeightForFace,
              bodyDepth: bodyDepthForFace,
              bodyDiameter: fixture.model.bodyDiameter,
            }
            const emitterFaceZ01 = previewEmitterFaceZ01(
              fxtrDepthOn,
              emitterGroup.relativeZ
            )
            const faceBeamOffset = emitterBeamOffsetFromFaceZ01(
              placementCtx,
              emitterFaceZ01
            )

            for (let emitterIndex = 0; emitterIndex < count; emitterIndex++) {
              const slot =
                count <= 1 ? 0 : emitterIndex / Math.max(1, count - 1) - 0.5
              emitters.push({
                localX:
                  modelKind === 'uplight'
                    ? centerX + slot * spread * 0.45
                    : centerX + slot * spread,
                localY: modelKind === 'uplight' ? faceBeamOffset : centerY,
                localZ:
                  modelKind === 'uplight'
                    ? 0.02 + centerZ
                    : modelKind === 'moverSpot'
                      ? moverHeadFaceZ + centerZ * 0.06
                      : faceBeamOffset,
                color: beamValues.color.clone(),
                intensity: beamValues.intensity,
                effectIntensity: 0,
                shape: 'disc',
                sizeScale: 1,
                liveChannelSet: {
                  colorChannels: emitterGroup.colorChannels,
                  colorMapChannels: emitterGroup.colorMapChannels,
                  masterChannels: emitterGroup.masterChannels,
                },
                liveEffectChannels: emitterGroup.effectChannels,
              })
            }
          }
        }
        }
      }

      targets.push({
        fixtureId: fixture.fixtureId,
        modelKind,
        modelWidth,
        bodyShape: fixture.model.bodyShape,
        bodyHeight: fixture.model.bodyHeight,
        bodyDepth: fixture.model.bodyDepth,
        bodyDiameter: fixture.model.bodyDiameter,
        moverBeamAngleDeg: fixture.model.moverBeamAngleDeg,
        atmosphereEffect: fixture.model.atmosphereEffect,
        atmosphereNozzleDirection: fixture.model.atmosphereNozzleDirection,
        hasAtmosLighting,
        isMoverModel,
        isLedFixture: false,
        rotation: fixture.rotation,
        fixtureX: fixtureWorld.worldX,
        fixtureY: fixtureWorld.worldY,
        fixtureZ: fixtureWorld.worldZ,
        targetX: targetWorld.worldX,
        targetY: targetWorld.worldY,
        targetZ: targetWorld.worldZ,
        aimYawDeg,
        aimPitchDeg,
        focusNorm,
        hasFocusChannel,
        goboIndex,
        mountInverted: fixture.moverMountOrientation === 'inverted',
        emitters,
      })
    })
  }

  for (const fixtureId of Array.from(previewPanYawByFixtureId.keys())) {
    if (!activeFixtureIds.has(fixtureId)) {
      previewPanYawByFixtureId.delete(fixtureId)
    }
  }

  const shadowCastingKinds = new Set<FixtureModelKind>([
    'moverSpot',
    'parCan',
    'moverWash',
    'washBar',
  ])
  const shadowCandidates = targets.filter(
    (t) => shadowCastingKinds.has(t.modelKind) && t.emitters.length > 0
  )
  const shadowBudget =
    targets.length > 52 ? 1 : targets.length > 32 ? 2 : targets.length > 18 ? 3 : 5
  shadowCandidates.forEach((t, index) => {
    t.castPrimarySpotShadow = index < shadowBudget
  })

  return targets
}

/**
 * Updates colors, mover aim, and LED pixels from live DMX without rebuilding emitter layout.
 */
export function applyLiveValuesToPreviewTargets(
  targets: PreviewTarget[],
  fixturesById: Map<string, MoverPreviewFixture>,
  fallbackParams: Params,
  splitStates: Array<{ outputParams: Params } | undefined>,
  splitScenes: SplitScene_t[],
  dmxOutByUniverse: number[][],
  floorSpec: FloorSpec,
  stageHeight: number,
  master: number,
  fxtrDepthOn: boolean,
  groupColorByFixtureId: Map<string, THREE.Color>
): void {
  const placementDepth2DOnly = !fxtrDepthOn

  for (const target of targets) {
    const fixture = fixturesById.get(target.fixtureId)
    if (fixture === undefined) {
      continue
    }

    const groupColor =
      groupColorByFixtureId.get(target.fixtureId) ??
      colorForGroup(fixture.groupName)

    if (target.isLedFixture) {
      const ledParams = resolveSplitParamsForFixture(
        fixture.groups,
        splitScenes,
        splitStates,
        fallbackParams
      )
      const ledFixture = fixture.ledFixture
      const ledLayers =
        ledFixture !== undefined
          ? ledParams.map((params) =>
              getLedValues(params, ledFixture, master, placementDepth2DOnly)
            )
          : []
      const combinedLedValues = combineLedLayers(ledLayers)
      for (let pixelIndex = 0; pixelIndex < target.emitters.length; pixelIndex++) {
        const emitter = target.emitters[pixelIndex]
        const pixelColor = combinedLedValues[pixelIndex]
        if (pixelColor !== undefined) {
          emitter.color.setRGB(pixelColor.red, pixelColor.green, pixelColor.blue)
          emitter.intensity = clamp01(
            Math.max(pixelColor.red, pixelColor.green, pixelColor.blue)
          )
        } else {
          emitter.color.setRGB(0, 0, 0)
          emitter.intensity = 0
        }
      }
      continue
    }

    const universe = Math.max(1, Math.round(fixture.universe || 1))
    const universeData = dmxOutByUniverse[universe - 1]
    const splitParamsList = resolveSplitParamsForFixture(
      fixture.groups,
      splitScenes,
      splitStates,
      fallbackParams
    )
    const splitParams = splitParamsList[0] ?? fallbackParams
    const fixtureWorld = fixtureWorldFromUniversePosition(
      fixture.xPos,
      fixture.yPos,
      fixture.zPos,
      floorSpec,
      stageHeight
    )

    if (target.isMoverModel) {
      const liveAxis = readLiveAxisValues(fixture, dmxOutByUniverse)
      if (liveAxis !== undefined) {
        target.aimYawDeg = mapPanDmxToYawDeg(
          liveAxis.panRaw,
          fixture.moverCalibration,
          liveAxis.panNorm,
          fixture.fixtureId,
          true
        )
        target.aimPitchDeg = mapTiltDmxToPitchDeg(
          liveAxis.tiltRaw,
          fixture.moverCalibration,
          liveAxis.tiltNorm,
          fixture.moverMountOrientation === 'inverted',
          true
        )
        const targetWorld = targetFromLiveAxis(
          fixture,
          liveAxis,
          fixtureWorld,
          true
        )
        target.targetX = targetWorld.worldX
        target.targetY = targetWorld.worldY
        target.targetZ = targetWorld.worldZ
      }
    }

    target.focusNorm = readLiveFocusNormalized(fixture.focusChannels, universeData)
    target.goboIndex = readLiveGoboIndex(fixture.goboMapChannels, universeData)

    for (const emitter of target.emitters) {
      const beamValues = readLiveBeamValuesForChannels(
        emitter.liveChannelSet,
        universeData,
        splitParams,
        groupColor,
        master
      )
      emitter.color.copy(beamValues.color)
      emitter.intensity = beamValues.intensity
      emitter.effectIntensity = readLiveEffectLevelForChannels(
        emitter.liveEffectChannels,
        universeData
      )
    }
  }
}

export function buildPreviewGroupColorMap(
  fixtures: MoverPreviewFixture[]
): Map<string, THREE.Color> {
  const grouped: Record<string, MoverPreviewFixture[]> = {}
  for (const fixture of fixtures) {
    const groupName =
      fixture.groupName.trim().length > 0
        ? fixture.groupName.trim()
        : 'Mover Group'
    const items = grouped[groupName] ?? []
    items.push(fixture)
    grouped[groupName] = items
  }

  const map = new Map<string, THREE.Color>()
  for (const [groupName, groupFixtures] of Object.entries(grouped)) {
    const groupColor = colorForGroup(groupName)
    for (const fixture of groupFixtures) {
      map.set(fixture.fixtureId, groupColor)
    }
  }
  return map
}

export function fixtureVisualSignature(target: PreviewTarget): string {
  const wireCount = target.ledWireEdges?.length ?? 0
  let emitterLayoutHash = 0
  for (const emitter of target.emitters) {
    const shapeCode =
      emitter.shape === 'rect-h' ? 2 : emitter.shape === 'rect-v' ? 3 : 1
    const packedScale = Math.round((emitter.sizeScale ?? 1) * 100)
    const packedRw = Math.round((emitter.rectWidthM ?? 0) * 4000)
    const packedRh = Math.round((emitter.rectHeightM ?? 0) * 4000)
    if (target.isLedFixture) {
      const packedPosition =
        Math.round(emitter.localX * 1000) * 3 +
        Math.round(emitter.localY * 1000) * 5 +
        Math.round(emitter.localZ * 1000) * 7
      emitterLayoutHash =
        (emitterLayoutHash * 131 +
          shapeCode * 17 +
          packedScale +
          packedPosition +
          packedRw * 11 +
          packedRh * 13) |
        0
    } else {
      // DMX / PAR / mover emitters: positions and colors update every frame in the
      // sync loop — only structural layout (shape, sizes) should force mesh rebuild.
      emitterLayoutHash =
        (emitterLayoutHash * 131 + shapeCode * 17 + packedScale + packedRw * 11 + packedRh * 13) |
        0
    }
  }
  if (target.isLedFixture) {
    let positionHash = 0
    for (const emitter of target.emitters) {
      positionHash +=
        Math.round(emitter.localX * 1000) * 3 +
        Math.round(emitter.localY * 1000) * 5 +
        Math.round(emitter.localZ * 1000) * 7
    }
    return `${target.modelKind}:${target.emitters.length}:led:${wireCount}:${positionHash}:layout:${emitterLayoutHash}:beam${ENABLE_BEAM_CONE_MESHES ? 1 : 0}:fill${ENABLE_RECT_AREA_FILL_LIGHTS ? 1 : 0}:splat${ENABLE_SURFACE_SPLATS ? 1 : 0}`
  }
  const shadowFlag = target.castPrimarySpotShadow === true ? 1 : 0
  const beamGrouped = shouldGroupBeamConesForTarget(target) ? 1 : 0
  return `${target.modelKind}:${target.modelWidth.toFixed(3)}:${target.bodyShape}:${target.bodyHeight.toFixed(3)}:${target.bodyDepth.toFixed(3)}:${target.bodyDiameter.toFixed(3)}:${target.emitters.length}:dmx:${target.atmosphereEffect}:${target.atmosphereNozzleDirection}:layout:${emitterLayoutHash}:beam${ENABLE_BEAM_CONE_MESHES ? 1 : 0}:beamgrp${beamGrouped}:fill${ENABLE_RECT_AREA_FILL_LIGHTS ? 1 : 0}:splat${ENABLE_SURFACE_SPLATS ? 1 : 0}:ess${PREVIEW_ESSENTIALS_MODE ? 1 : 0}:sh${shadowFlag}`
}

export function shouldGroupBeamConesForTarget(target: PreviewTarget): boolean {
  if (!ENABLE_BEAM_CONE_MESHES || target.isLedFixture || target.isMoverModel) {
    return false
  }
  return (
    target.modelKind === 'parCan' ||
    target.modelKind === 'washBar' ||
    target.modelKind === 'uplight'
  )
}

export function computeBeamConeGroups(
  target: PreviewTarget
): Array<{ emitterIndices: number[]; layout: BeamConeGroupLayout }> {
  const candidates: Array<{
    index: number
    x: number
    y: number
    z: number
  }> = []
  for (let index = 0; index < target.emitters.length; index++) {
    if (!shouldCreateDynamicEmitterLight(target, index)) {
      continue
    }
    const emitter = target.emitters[index]
    if (emitter === undefined) {
      continue
    }
    candidates.push({
      index,
      x: emitter.localX,
      y: emitter.localY,
      z: emitter.localZ,
    })
  }
  if (candidates.length === 0) {
    return []
  }
  if (candidates.length === 1) {
    return [{ emitterIndices: [candidates[0]!.index], layout: 'spot' }]
  }

  const layout: BeamConeGroupLayout =
    target.modelKind === 'washBar' || target.modelKind === 'uplight'
      ? 'linear-x'
      : 'spot'
  candidates.sort((a, b) => a.x - b.x)

  const axisGaps: number[] = []
  for (let i = 1; i < candidates.length; i++) {
    axisGaps.push(Math.abs(candidates[i]!.x - candidates[i - 1]!.x))
  }
  const sortedGaps = [...axisGaps].sort((a, b) => a - b)
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] ?? 0.08
  const maxNeighborGap = Math.max(medianGap * 1.85, 0.045)
  const maxLateralGap =
    target.modelKind === 'washBar' ? 0.06 : target.modelKind === 'uplight' ? 0.08 : 0.12

  const groups: Array<{ emitterIndices: number[]; layout: BeamConeGroupLayout }> =
    []
  let current: number[] = [candidates[0]!.index]
  for (let i = 1; i < candidates.length; i++) {
    const prev = candidates[i - 1]!
    const curr = candidates[i]!
    const axisGap = Math.abs(curr.x - prev.x)
    const lateralGap = Math.hypot(curr.y - prev.y, curr.z - prev.z)
    if (axisGap <= maxNeighborGap && lateralGap <= maxLateralGap) {
      current.push(curr.index)
      continue
    }
    groups.push({
      emitterIndices: current,
      layout: current.length === 1 ? 'spot' : layout,
    })
    current = [curr.index]
  }
  groups.push({
    emitterIndices: current,
    layout: current.length === 1 ? 'spot' : layout,
  })
  return groups
}

export function previewBeamHalfAngleDeg(target: PreviewTarget): number {
  const focusScale = focusWidthScale(target.focusNorm)
  const moverSpotBaseAngle = target.hasFocusChannel
    ? defaultMoverBeamAngleForModelKind('moverSpot')
    : target.moverBeamAngleDeg
  const moverWashBaseAngle = target.hasFocusChannel
    ? defaultMoverBeamAngleForModelKind('moverWash')
    : target.moverBeamAngleDeg
  const staticBeamAngle = Number.isFinite(target.moverBeamAngleDeg)
    ? target.moverBeamAngleDeg
    : 26
  let halfAngleDeg =
    target.modelKind === 'moverSpot'
      ? clamp(moverSpotBaseAngle * focusScale, 2.5, 20)
      : target.modelKind === 'parCan'
        ? clamp(10 * focusScale, 2.5, 20)
        : target.modelKind === 'moverWash'
          ? clamp(moverWashBaseAngle * focusScale * 0.5, 4, 35)
          : target.modelKind === 'washBar'
            ? clamp(staticBeamAngle * focusScale * 0.38, 5, 22)
            : target.modelKind === 'uplight'
              ? clamp(staticBeamAngle * focusScale * 0.5, 10, 65)
              : target.modelKind === 'atmosphericFxtr'
                ? clamp(
                    (target.atmosphereNozzleDirection === 'up' ? 18 : 14) *
                      focusScale,
                    4,
                    35
                  )
                : 16
  if (isCloudModelKind(target.modelKind)) {
    halfAngleDeg = Math.min(25, halfAngleDeg)
  }
  return halfAngleDeg
}

export function previewBeamDefaultReachFt(target: PreviewTarget): number {
  return target.modelKind === 'washBar'
    ? 64
    : target.modelKind === 'moverWash'
      ? 120
      : target.modelKind === 'atmosphericFxtr'
        ? 40
        : 100
}

const _groupedBeamScratch = {
  localBeamDir: new THREE.Vector3(),
  beamDirWorld: new THREE.Vector3(),
  center: new THREE.Vector3(),
  emitterWorld: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
  color: new THREE.Color(),
}

export function syncGroupedBeamCones(options: {
  groups: BeamConeGroupVisual[]
  target: PreviewTarget
  emitters: THREE.Mesh[]
  surfaceSpec: SurfaceSpec
  hazeAmount: number
  previewLightingSuppressed: boolean
  resolveEmitterIntensity: (rawIntensity: number) => number
}): void {
  const {
    groups,
    target,
    emitters,
    surfaceSpec,
    hazeAmount,
    previewLightingSuppressed,
    resolveEmitterIntensity,
  } = options
  if (groups.length === 0) {
    return
  }

  const halfAngleRad = THREE.MathUtils.degToRad(previewBeamHalfAngleDeg(target))
  const defaultReach = feetToWorld(previewBeamDefaultReachFt(target))
  const atmosphericUp =
    target.modelKind === 'atmosphericFxtr' &&
    target.atmosphereNozzleDirection === 'up'
  const localBeamDirection =
    target.modelKind === 'uplight' || atmosphericUp
      ? LOCAL_AXIS_Y
      : LOCAL_AXIS_Z

  for (const group of groups) {
    const beamMesh = group.mesh
    const beamMaterial = beamMesh.material as THREE.MeshBasicMaterial
    const scratch = _groupedBeamScratch
    scratch.color.setRGB(0, 0, 0)
    let blendWeight = 0
    let maxIntensity = 0
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    let activeCount = 0

    scratch.center.set(0, 0, 0)

    for (const emitterIndex of group.emitterIndices) {
      const emitterTarget = target.emitters[emitterIndex]
      const emitterMesh = emitters[emitterIndex]
      if (emitterTarget === undefined || emitterMesh === undefined) {
        continue
      }
      minX = Math.min(minX, emitterMesh.position.x)
      maxX = Math.max(maxX, emitterMesh.position.x)
      minY = Math.min(minY, emitterMesh.position.y)
      maxY = Math.max(maxY, emitterMesh.position.y)
      minZ = Math.min(minZ, emitterMesh.position.z)
      maxZ = Math.max(maxZ, emitterMesh.position.z)

      const emitterIntensity = resolveEmitterIntensity(emitterTarget.intensity)
      const outputActive = isEmitterOutputActive(
        emitterIntensity,
        emitterTarget.color
      )
      if (!outputActive) {
        continue
      }
      activeCount += 1
      maxIntensity = Math.max(maxIntensity, emitterIntensity)
      blendWeight += emitterIntensity
      scratch.color.r += emitterTarget.color.r * emitterIntensity
      scratch.color.g += emitterTarget.color.g * emitterIntensity
      scratch.color.b += emitterTarget.color.b * emitterIntensity
      scratch.center.addScaledVector(emitterMesh.position, emitterIntensity)
    }

    if (
      previewLightingSuppressed ||
      activeCount === 0 ||
      blendWeight <= PREVIEW_EMITTER_OUTPUT_EPSILON
    ) {
      beamMaterial.opacity = 0
      beamMesh.visible = false
      beamMesh.scale.set(0, 0, 0)
      continue
    }

    scratch.color.multiplyScalar(1 / blendWeight)
    scratch.center.multiplyScalar(1 / blendWeight)

    const anchorMesh = emitters[group.emitterIndices[0]!]
    const emitterParent = anchorMesh?.parent ?? null
    scratch.beamDirWorld.copy(localBeamDirection)
    if (emitterParent !== null) {
      emitterParent.getWorldQuaternion(scratch.quat)
      scratch.beamDirWorld.applyQuaternion(scratch.quat).normalize()
    }

    beamMesh.position.copy(scratch.center)

    scratch.emitterWorld.copy(scratch.center)
    if (emitterParent !== null) {
      emitterParent.localToWorld(scratch.emitterWorld)
    }

    const surfaceHit = nearestSurfaceHit(
      scratch.emitterWorld.clone().addScaledVector(scratch.beamDirWorld, 0.01),
      scratch.beamDirWorld,
      surfaceSpec
    )
    const coneLength = clamp(
      surfaceHit !== undefined ? surfaceHit.distance - 0.01 : defaultReach,
      0.08,
      defaultReach
    )

    const hazeMix = clamp(hazeAmount, 0, 1)
    if (hazeMix <= 0.0005) {
      beamMaterial.opacity = 0
      beamMesh.visible = false
      beamMesh.scale.set(0, 0, 0)
      continue
    }

    const baseRadius = Math.max(0.02, Math.tan(halfAngleRad) * coneLength)
    const spanX = Math.max(0.02, maxX - minX + 0.035)
    const spanY = Math.max(0.02, maxY - minY + 0.035)
    const spanZ = Math.max(0.02, maxZ - minZ + 0.035)

    let scaleX = baseRadius
    let scaleY = baseRadius
    if (group.layout === 'linear-x' && group.emitterIndices.length > 1) {
      scaleX = Math.max(baseRadius, spanX * 0.55 + baseRadius * 0.45)
      scaleY = Math.max(
        baseRadius * 0.82,
        Math.max(spanY, spanZ) * 0.42 + baseRadius * 0.35
      )
    } else if (group.emitterIndices.length > 1) {
      const cover = Math.max(spanX, spanY, spanZ) * 0.58 + baseRadius * 0.35
      scaleX = Math.max(baseRadius, cover)
      scaleY = scaleX
    }

    beamMesh.quaternion.setFromUnitVectors(LOCAL_AXIS_Z, localBeamDirection)
    beamMesh.scale.set(scaleX, scaleY, coneLength)
    beamMaterial.color.copy(scratch.color)
    const beamStrength =
      Math.pow(maxIntensity, target.modelKind === 'moverSpot' ? 1.1 : 0.95) *
      hazeMix
    beamMaterial.opacity = clamp(
      beamStrength * (target.modelKind === 'moverSpot' ? 0.72 : 0.58),
      0,
      0.62
    )
    beamMesh.visible = beamMaterial.opacity > 0.012
  }
}

export function shouldCreateDynamicEmitterLight(
  target: PreviewTarget,
  emitterIndex: number
): boolean {
  if (PREVIEW_ESSENTIALS_MODE) {
    return false
  }
  if (target.isLedFixture) {
    return ENABLE_LED_PIXEL_LIGHTS
  }
  if (target.modelKind === 'atmosphericFxtr' && !target.hasAtmosLighting) {
    return false
  }
  // One steerable beam per mover head; ring/secondary emitters are lens markers only.
  if (target.modelKind === 'moverSpot' || target.modelKind === 'moverWash') {
    return emitterIndex === 0
  }
  if (
    target.modelKind === 'washBar' ||
    target.modelKind === 'parCan' ||
    target.modelKind === 'uplight'
  ) {
    return emitterIndex < 6
  }
  return emitterIndex < MAX_DYNAMIC_LIGHTS_PER_FIXTURE
}

/** Narrow spots for PARs and movers; broad fixtures use rect fill instead. */
export function shouldCreateSpotEmitterLight(
  target: PreviewTarget,
  emitterIndex: number
): boolean {
  if (!shouldCreateDynamicEmitterLight(target, emitterIndex)) {
    return false
  }
  const emitter = target.emitters[emitterIndex]
  if (
    emitter !== undefined &&
    isRectPreviewEmitterShape(emitter.shape)
  ) {
    return true
  }
  return (
    target.modelKind === 'parCan' ||
    target.modelKind === 'moverSpot' ||
    target.modelKind === 'washBar' ||
    (target.modelKind === 'atmosphericFxtr' && target.hasAtmosLighting)
  )
}

export function shouldCreateFillRectLight(
  target: PreviewTarget,
  emitterIndex: number
): boolean {
  if (!ENABLE_RECT_AREA_FILL_LIGHTS) {
    return false
  }
  if (!shouldCreateDynamicEmitterLight(target, emitterIndex)) {
    return false
  }
  return (
    target.modelKind === 'moverWash' ||
    target.modelKind === 'uplight' ||
    (target.modelKind === 'atmosphericFxtr' && target.hasAtmosLighting)
  )
}

export function createPleatedCurtainGeometry(): THREE.PlaneGeometry {
  const widthSegments = 96
  const heightSegments = 18
  const geometry = new THREE.PlaneGeometry(1, 1, widthSegments, heightSegments)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute

  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const pleatPhase = (x + 0.5) * Math.PI * 30
    const pleatOffset = Math.sin(pleatPhase) * 0.038
    const verticalWeight = 0.72 + (0.5 - y) * 0.28
    positions.setZ(index, pleatOffset * verticalWeight)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

export function nonMoverEmitterBaseY(modelKind: FixtureModelKind): number {
  if (modelKind === 'washBar') return 0.12
  if (modelKind === 'parCan') return 0.2
  if (modelKind === 'uplight') return 0.26
  if (modelKind === 'atmosphericFxtr') return 0.18
  return 0.23
}

/** Authoring reference width/depth for horizontal mover proportions (meters). */
const MOVER_REF_WIDTH = 0.42
const MOVER_REF_DEPTH = 0.34

/** Locked mover mesh dimensions; pan/tilt pivots match attachment points in createFixtureVisual. */
export interface MoverRigDimensions {
  totalHeight: number
  baseWidth: number
  baseHeight: number
  baseDepth: number
  panAxisY: number
  yokeInnerWidth: number
  yokeArmThickness: number
  yokeArmHeight: number
  yokeDepth: number
  tiltAxisY: number
  headRadius: number
  headLen: number
  bezelDepth: number
  lensDepth: number
  washCapDepth: number
  emitterFaceZ: number
}

export function computeMoverRigDimensions(
  modelWidth: number,
  bodyHeight: number,
  bodyDepth: number,
  bodyDiameter: number,
  options?: { isWashMover?: boolean }
): MoverRigDimensions {
  const totalHeight = clamp(bodyHeight, 0.12, 2.5)
  const width = clamp(Math.max(modelWidth, bodyDiameter), 0.2, 3)
  const depth = clamp(bodyDepth, 0.12, 1.2)

  const widthScale = width / MOVER_REF_WIDTH
  const depthScale = depth / MOVER_REF_DEPTH

  const baseHeight = totalHeight * 0.28
  const yokeArmHeight = totalHeight * 0.72
  const panAxisY = baseHeight
  const yokeArmThickness = 0.055 * widthScale
  const tiltAxisY = yokeArmHeight - yokeArmThickness * 0.5

  const baseWidth = 1.05 * MOVER_REF_WIDTH * widthScale
  const baseDepth = 0.86 * MOVER_REF_WIDTH * widthScale
  const yokeInnerWidth = 0.81 * MOVER_REF_WIDTH * widthScale
  const yokeDepth = 0.26 * MOVER_REF_WIDTH * widthScale

  const headRadius = 0.34 * MOVER_REF_WIDTH * widthScale
  const headLen = 0.88 * MOVER_REF_DEPTH * depthScale
  const bezelDepth = 0.08 * MOVER_REF_DEPTH * depthScale
  const lensDepth = 0.04 * MOVER_REF_DEPTH * depthScale
  const isWashMover = options?.isWashMover === true
  const washCapDepth = isWashMover ? 0.065 * MOVER_REF_DEPTH * depthScale : 0
  const headFrontZ = headLen * 0.5
  const emitterFaceZ =
    headFrontZ + bezelDepth + lensDepth + (isWashMover ? washCapDepth : 0)

  return {
    totalHeight,
    baseWidth,
    baseHeight,
    baseDepth,
    panAxisY,
    yokeInnerWidth,
    yokeArmThickness,
    yokeArmHeight,
    yokeDepth,
    tiltAxisY,
    headRadius,
    headLen,
    bezelDepth,
    lensDepth,
    washCapDepth,
    emitterFaceZ,
  }
}

/** Mover head front face in head-local +Z (emitter center on lens plane; tilt pivot at z = 0). */
export function moverHeadEmitterBackPlaneLocalZ(
  modelWidth: number,
  bodyDepth: number,
  bodyHeight: number,
  bodyDiameter: number,
  isWashMover = false
): number {
  return computeMoverRigDimensions(
    modelWidth,
    bodyHeight,
    bodyDepth,
    bodyDiameter,
    { isWashMover }
  ).emitterFaceZ
}

/**
 * Maps fixture-face Z (0 = rear, 1 = front) to root Z of the emitter center (+Z beam).
 */
export function emitterBackPlaneLocalZ(
  modelKind: FixtureModelKind,
  bodyDepth: number,
  bodyHeight: number,
  bodyShape: FixtureBodyShape,
  faceZ01: number,
  options?: {
    isMover?: boolean
    moverHeadFaceZ?: number
    modelWidth?: number
    bodyDiameter?: number
  }
): number {
  if (options?.isMover === true && options.moverHeadFaceZ !== undefined) {
    return options.moverHeadFaceZ
  }
  const ctx: FixturePlacementContext = {
    modelKind,
    bodyShape,
    modelWidth: options?.modelWidth ?? 0.6,
    bodyHeight,
    bodyDepth,
    bodyDiameter: options?.bodyDiameter ?? bodyDepth,
  }
  if (modelKind === 'uplight') {
    return emitterBackPlaneRootY(ctx, faceZ01)
  }
  return emitterBackPlaneRootZ(ctx, faceZ01)
}

/** Half-thickness of emitter mesh along the beam (support function of oriented bbox). */
export function emitterHalfExtentAlongBeam(mesh: THREE.Mesh): number {
  const beam = LOCAL_AXIS_Z.clone().applyQuaternion(mesh.quaternion).normalize()
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  if (box === null) {
    return 0.002
  }
  const hx = ((box.max.x - box.min.x) * 0.5) * Math.abs(mesh.scale.x)
  const hy = ((box.max.y - box.min.y) * 0.5) * Math.abs(mesh.scale.y)
  const hz = ((box.max.z - box.min.z) * 0.5) * Math.abs(mesh.scale.z)
  const ex = new THREE.Vector3(hx, 0, 0).applyQuaternion(mesh.quaternion)
  const ey = new THREE.Vector3(0, hy, 0).applyQuaternion(mesh.quaternion)
  const ez = new THREE.Vector3(0, 0, hz).applyQuaternion(mesh.quaternion)
  return Math.max(
    0.0006,
    Math.abs(beam.dot(ex)) + Math.abs(beam.dot(ey)) + Math.abs(beam.dot(ez))
  )
}

export function placeEmitterMeshOnFixtureFace(
  mesh: THREE.Mesh,
  faceCenter: THREE.Vector3,
  beamDirection: THREE.Vector3,
  shape: PreviewEmitterShape | FixtureEmitterShape
): void {
  mesh.quaternion.setFromUnitVectors(emitterLensForwardAxis(shape), beamDirection)
  mesh.position.copy(faceCenter)
}

/**
 * Positions an emitter mesh with its center on the fixture face plane.
 * PreviewEmitterTarget: localX/localY = offset from body center; localZ = face depth on beam axis.
 */
export function applyEmitterRootPlacement(
  mesh: THREE.Mesh,
  target: PreviewTarget,
  emitter: PreviewEmitterTarget
): THREE.Vector3 {
  if (target.isMoverModel) {
    const beam = LOCAL_AXIS_Z
    placeEmitterMeshOnFixtureFace(
      mesh,
      new THREE.Vector3(emitter.localX, emitter.localY, emitter.localZ),
      beam,
      emitter.shape
    )
    return mesh.position.clone()
  }

  if (target.modelKind === 'atmosphericFxtr') {
    const beam =
      target.atmosphereNozzleDirection === 'up' ? LOCAL_AXIS_Y : LOCAL_AXIS_Z
    placeEmitterMeshOnFixtureFace(
      mesh,
      new THREE.Vector3(emitter.localX, emitter.localY, emitter.localZ),
      beam,
      emitter.shape
    )
    return mesh.position.clone()
  }

  const ctx = fixturePlacementContextFromTarget(target)
  const center = fixtureBodyCenterInRoot(ctx)
  const beam = fixtureBeamAxisInRoot(ctx)

  const faceCenter = new THREE.Vector3(
    center.x + emitter.localX,
    center.y + emitter.localY,
    center.z + emitter.localZ
  )
  placeEmitterMeshOnFixtureFace(mesh, faceCenter, beam, emitter.shape)
  return mesh.position.clone()
}

export function createEmitterMesh(
  color: THREE.Color,
  sizeScale = 1,
  shape: PreviewEmitterShape = 'disc',
  rectFaceM?: { widthM: number; heightM: number }
): THREE.Mesh {
  const geometry =
    shape === 'disc'
      ? (() => {
          const disc = new THREE.CylinderGeometry(
            Math.max(0.0025, 0.0225 * sizeScale),
            Math.max(0.0025, 0.0225 * sizeScale),
            Math.max(0.0012, 0.005 * sizeScale),
            24
          )
          disc.rotateX(-Math.PI / 2)
          return disc
        })()
      : (() => {
          const wx =
            rectFaceM !== undefined
              ? Math.max(0.004, rectFaceM.widthM)
              : Math.max(0.004, (shape === 'rect-h' ? 0.05 : 0.016) * sizeScale)
          const hy =
            rectFaceM !== undefined
              ? Math.max(0.004, rectFaceM.heightM)
              : Math.max(0.004, (shape === 'rect-v' ? 0.05 : 0.016) * sizeScale)
          const depthRef =
            rectFaceM !== undefined
              ? Math.sqrt(
                  Math.max(
                    EMITTER_DIAMETER_MIN_M * EMITTER_DIAMETER_MIN_M,
                    rectFaceM.widthM * rectFaceM.heightM
                  )
                )
              : sizeScale * EMITTER_DIAMETER_REFERENCE_M
          const depth = Math.max(
            0.0014,
            0.004 * emitterDiameterMToVisualSizeScale(depthRef)
          )
          return new THREE.BoxGeometry(wx, hy, depth)
        })()

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.4,
      metalness: 0,
      roughness: 0.62,
      toneMapped: false,
    })
  )
}

export function createAtmosphereJetMesh(
  color: THREE.Color,
  effect: AtmosphereEffectType
): THREE.Points {
  const particleCount =
    effect === 'confetti' ? 64 : effect === 'bubble' ? 42 : effect === 'flame' ? 56 : 48
  const positions = new Float32Array(particleCount * 3)
  const seeds = new Float32Array(particleCount)
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 0] = 0
    positions[i * 3 + 1] = 0
    positions[i * 3 + 2] = 0
    seeds[i] = Math.random()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1))
  const material = new THREE.PointsMaterial({
    color,
    size:
      effect === 'bubble'
        ? 0.055
        : effect === 'confetti'
        ? 0.04
        : effect === 'flame'
        ? 0.05
        : 0.03,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const points = new THREE.Points(geometry, material)
  points.visible = false
  points.userData.atmosEffect = effect
  points.renderOrder = 5
  return points
}

export function createBeamMesh(color: THREE.Color): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(1, 0, 1, 12, 1, true)
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, 0, 0.5)

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = 4
  mesh.visible = false
  return mesh
}

let _surfaceSplatTexture: THREE.CanvasTexture | undefined

export function getSurfaceSplatTexture(): THREE.CanvasTexture {
  if (_surfaceSplatTexture !== undefined) {
    return _surfaceSplatTexture
  }
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    const fallback = new THREE.CanvasTexture(document.createElement('canvas'))
    _surfaceSplatTexture = fallback
    return fallback
  }
  const cx = canvas.width * 0.5
  const cy = canvas.height * 0.5
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.5)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.86)')
  gradient.addColorStop(0.72, 'rgba(255,255,255,0.22)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  _surfaceSplatTexture = texture
  return texture
}

export function createSurfaceSplatMesh(color: THREE.Color): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    color,
    map: getSurfaceSplatTexture(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  ;(material.userData as { keepMap?: boolean }).keepMap = true
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  mesh.renderOrder = 5
  mesh.visible = false
  return mesh
}

export function createLedEmitterMesh(color: THREE.Color, sizeScale = 1): THREE.Mesh {
  // Keep LED emitters visibly larger and readable from a distance.
  const radius = Math.max(0.0048, 0.0245 * sizeScale)
  const geometry = new THREE.SphereGeometry(radius, 16, 12)
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: LED_EMITTER_BASE_EMISSIVE,
      metalness: 0.02,
      roughness: 0.16,
      toneMapped: false,
    })
  )
  const glowShell = createLedGlowShellMesh(color, radius)
  mesh.add(glowShell)
  return mesh
}

export function createLedGlowShellMesh(color: THREE.Color, emitterRadius: number): THREE.Mesh {
  const shellRadius = Math.max(emitterRadius * 2.2, 0.012)
  const geometry = new THREE.SphereGeometry(shellRadius, 16, 12)
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  })
  const glowMesh = new THREE.Mesh(geometry, material)
  glowMesh.userData.ledGlow = true
  glowMesh.renderOrder = 5
  return glowMesh
}

const goboTextureCache = new Map<number, THREE.CanvasTexture>()

export function releaseLighting3DGlobalTextureCaches() {
  if (_surfaceSplatTexture !== undefined) {
    _surfaceSplatTexture.dispose()
    _surfaceSplatTexture = undefined
  }
  for (const texture of goboTextureCache.values()) {
    texture.dispose()
  }
  goboTextureCache.clear()
}

export function goboTextureForIndex(index: number): THREE.Texture | null {
  if (!Number.isFinite(index) || index < 0) {
    return null
  }
  const key = Math.round(index)
  const existing = goboTextureCache.get(key)
  if (existing) {
    return existing
  }
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    return null
  }
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.translate(canvas.width * 0.5, canvas.height * 0.5)
  ctx.fillStyle = '#fff'
  const pattern = key % 6
  if (pattern === 0) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      ctx.save()
      ctx.rotate(a)
      ctx.fillRect(0, -8, 120, 16)
      ctx.restore()
    }
  } else if (pattern === 1) {
    for (let i = 0; i < 10; i++) {
      const r = 18 + i * 12
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.lineWidth = 4
      ctx.strokeStyle = '#fff'
      ctx.stroke()
    }
  } else if (pattern === 2) {
    for (let y = -120; y <= 120; y += 20) {
      ctx.fillRect(-140, y, 280, 10)
    }
  } else if (pattern === 3) {
    for (let x = -120; x <= 120; x += 20) {
      ctx.fillRect(x, -140, 10, 280)
    }
  } else if (pattern === 4) {
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2
      const r = 18 + (i % 5) * 22
      ctx.beginPath()
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 8 + (i % 3) * 4, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.beginPath()
    ctx.arc(0, 0, 92, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(0, 0, 40, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  goboTextureCache.set(key, texture)
  return texture
}

export function createSpotEmitterLight(
  color: THREE.Color,
  castShadow: boolean
): { light: THREE.SpotLight; target: THREE.Object3D } {
  const light = new THREE.SpotLight(color, 0, feetToWorld(180), THREE.MathUtils.degToRad(18), 0.35, 1.2)
  light.castShadow = castShadow
  if (castShadow) {
    light.shadow.mapSize.set(1024, 1024)
    light.shadow.radius = 2.4
  } else {
    light.shadow.mapSize.set(256, 256)
  }
  light.shadow.bias = -0.00012
  light.shadow.normalBias = 0.015
  light.shadow.camera.near = 0.08
  light.shadow.camera.far = feetToWorld(200)
  const target = new THREE.Object3D()
  light.target = target
  return { light, target }
}

export function createRectEmitterLight(
  color: THREE.Color,
  width: number,
  height: number
): THREE.RectAreaLight {
  return new THREE.RectAreaLight(color, 0, width, height)
}

export interface VolumetricFogLightSample {
  /** Stable across frames so GPU fog slots map to the same emitter (not intensity order). */
  stableOrdinal: number
  position: THREE.Vector3
  direction: THREE.Vector3
  color: THREE.Color
  intensity: number
  range: number
  coneCos: number
  kind: 0 | 1
}

export function createVolumetricFogMaterial(
  maxLights: number
): THREE.ShaderMaterial {
  const uniforms = {
    uDensity: { value: 0 },
    uRoomMin: { value: new THREE.Vector3(-1, 0, -1) },
    uRoomMax: { value: new THREE.Vector3(1, ROOM_HEIGHT, 1) },
    uLightCount: { value: 0 },
    uLightPos: {
      value: Array.from({ length: maxLights }, () => new THREE.Vector3()),
    },
    uLightDir: {
      value: Array.from({ length: maxLights }, () => new THREE.Vector3(0, -1, 0)),
    },
    uLightColor: {
      value: Array.from({ length: maxLights }, () => new THREE.Vector3()),
    },
    uLightParams: {
      value: Array.from({ length: maxLights }, () => new THREE.Vector4()),
    },
  }

  const vertexShader = `
    varying vec3 vWorldPos;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `

  const fragmentShader = `
    #define MAX_LIGHTS ${Math.max(1, Math.floor(maxLights))}
    #define FOG_STEPS 28
    varying vec3 vWorldPos;

    uniform float uDensity;
    uniform vec3 uRoomMin;
    uniform vec3 uRoomMax;
    uniform int uLightCount;
    uniform vec3 uLightPos[MAX_LIGHTS];
    uniform vec3 uLightDir[MAX_LIGHTS];
    uniform vec3 uLightColor[MAX_LIGHTS];
    uniform vec4 uLightParams[MAX_LIGHTS];

    float hash31(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    float noise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      vec3 u = f * f * (3.0 - 2.0 * f);

      float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
      float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

      float nx00 = mix(n000, n100, u.x);
      float nx10 = mix(n010, n110, u.x);
      float nx01 = mix(n001, n101, u.x);
      float nx11 = mix(n011, n111, u.x);
      float nxy0 = mix(nx00, nx10, u.y);
      float nxy1 = mix(nx01, nx11, u.y);
      return mix(nxy0, nxy1, u.z);
    }

    float phaseG(float cosTheta, float g) {
      float gg = g * g;
      float denom = pow(max(0.0005, 1.0 + gg - 2.0 * g * cosTheta), 1.5);
      return (1.0 - gg) / (4.0 * 3.14159265 * denom);
    }

    float sampleDensity(vec3 point) {
      float roomHeight = max(0.001, uRoomMax.y - uRoomMin.y);
      float floorFade = smoothstep(uRoomMin.y, uRoomMin.y + roomHeight * 0.06, point.y);
      float ceilFade = 1.0 - smoothstep(uRoomMax.y - roomHeight * 0.08, uRoomMax.y, point.y);
      float verticalMask = clamp(floorFade * ceilFade, 0.0, 1.0);
      vec3 noisePos = point * 0.45;
      float cloud = noise3(noisePos);
      float cloudMask = mix(0.72, 1.25, cloud);
      return max(0.0, uDensity * verticalMask * cloudMask);
    }

    void main() {
      vec3 rayDir = normalize(vWorldPos - cameraPosition);
      vec3 dirSign = vec3(
        rayDir.x < 0.0 ? -1.0 : 1.0,
        rayDir.y < 0.0 ? -1.0 : 1.0,
        rayDir.z < 0.0 ? -1.0 : 1.0
      );
      vec3 safeDir = dirSign * max(abs(rayDir), vec3(0.0005));

      vec3 tA = (uRoomMin - cameraPosition) / safeDir;
      vec3 tB = (uRoomMax - cameraPosition) / safeDir;
      vec3 tMin = min(tA, tB);
      vec3 tMax = max(tA, tB);
      float nearT = max(max(tMin.x, tMin.y), tMin.z);
      float farT = min(min(tMax.x, tMax.y), tMax.z);
      float startT = max(nearT, 0.0);
      float endT = farT;

      if (endT <= startT) {
        discard;
      }

      float travel = endT - startT;
      float stepLen = travel / float(FOG_STEPS);
      vec3 accumColor = vec3(0.0);

      for (int s = 0; s < FOG_STEPS; s++) {
        float t = startT + (float(s) + 0.5) * stepLen;
        vec3 point = cameraPosition + rayDir * t;

        float density = sampleDensity(point);
        if (density <= 0.00001) {
          continue;
        }

        vec3 scatter = vec3(0.0);
        for (int i = 0; i < MAX_LIGHTS; i++) {
          if (i >= MAX_LIGHTS || i >= uLightCount) {
            break;
          }
          vec3 toPoint = point - uLightPos[i];
          float distanceToLight = length(toPoint);
          float range = max(0.001, uLightParams[i].y);
          if (distanceToLight >= range) {
            continue;
          }

          vec3 lightToPointDir = toPoint / max(distanceToLight, 0.0001);
          float attenuation = pow(max(0.0, 1.0 - distanceToLight / range), 1.45);
          float coneFactor = 1.0;
          if (uLightParams[i].w < 0.5) {
            float coneCos = clamp(uLightParams[i].z, -1.0, 0.9999);
            float angleCos = dot(normalize(uLightDir[i]), lightToPointDir);
            coneFactor = smoothstep(coneCos, mix(coneCos, 1.0, 0.4), angleCos);
          } else {
            float forward = max(dot(normalize(uLightDir[i]), lightToPointDir), 0.0);
            coneFactor = pow(smoothstep(0.03, 0.985, forward), 2.0);
          }

          float phase = phaseG(dot(-rayDir, -lightToPointDir), 0.38);
          float scatterStrength = uLightParams[i].x * attenuation * coneFactor * phase;
          scatter += uLightColor[i] * scatterStrength * density;
        }

        accumColor += scatter * stepLen * 0.72;
      }

      float alpha = clamp(max(max(accumColor.r, accumColor.g), accumColor.b) * 0.52, 0.0, 0.62);
      if (alpha < 0.001) {
        discard;
      }
      gl_FragColor = vec4(accumColor, alpha);
    }
  `

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}

/** Hide cones, splats, jets, and dynamic lights — essentials preview uses emitters only. */
export function suppressFixtureSecondaryVisuals(visual: FixtureVisual): void {
  for (const mesh of visual.beamMeshes) {
    if (mesh !== undefined) {
      mesh.visible = false
    }
  }
  if (visual.beamConeGroups !== undefined) {
    for (const group of visual.beamConeGroups) {
      group.mesh.visible = false
    }
  }
  for (const splat of visual.surfaceSplats) {
    if (splat !== undefined) {
      splat.visible = false
    }
  }
  for (const jet of visual.atmosphereJets) {
    if (jet !== undefined) {
      jet.visible = false
    }
  }
  for (const light of visual.emitterLights) {
    if (light !== undefined) {
      light.intensity = 0
      light.visible = false
    }
  }
  for (const fill of visual.emitterFillRects) {
    if (fill !== undefined) {
      fill.intensity = 0
      fill.visible = false
    }
  }
  if (visual.ledAggregateLight !== undefined) {
    visual.ledAggregateLight.intensity = 0
    visual.ledAggregateLight.visible = false
  }
}

export function createFixtureVisual(target: PreviewTarget): FixtureVisual {
  const signature = fixtureVisualSignature(target)
  const root = new THREE.Group()
  root.userData.fixtureId = target.fixtureId
  const emitters: THREE.Mesh[] = []
  const beamMeshes: Array<THREE.Mesh | undefined> = []
  const emitterLights: Array<THREE.Light | undefined> = []
  const emitterLightTargets: Array<THREE.Object3D | undefined> = []
  const emitterFillRects: Array<THREE.RectAreaLight | undefined> = []
  const atmosphereJets: Array<THREE.Points | undefined> = []
  const surfaceSplats: Array<THREE.Mesh | undefined> = []
  let ledAggregateLight: THREE.SpotLight | undefined
  let ledAggregateTarget: THREE.Object3D | undefined

  // Lambert (not PBR standard): dark housings stay visible under scene lights + tone mapping;
  // MeshStandard + dark albedo can read as empty next to emissive emitters / line helpers.
  const bodyMaterial = new THREE.MeshLambertMaterial({
    color: '#1c222b',
    emissive: '#12161d',
    emissiveIntensity: 0.28,
  })
  const lensMaterial = new THREE.MeshLambertMaterial({
    color: '#2a3344',
    emissive: '#151a24',
    emissiveIntensity: 0.22,
  })

  if (target.isLedFixture) {
    const wireEdges = target.ledWireEdges ?? []
    for (const emitter of target.emitters) {
      const emitterMesh = createLedEmitterMesh(emitter.color, 0.25)
      emitterMesh.position.set(emitter.localX, emitter.localY, emitter.localZ)
      root.add(emitterMesh)
      emitters.push(emitterMesh)
      beamMeshes.push(undefined)
      emitterLights.push(undefined)
      emitterLightTargets.push(undefined)
      emitterFillRects.push(undefined)
      atmosphereJets.push(undefined)
      surfaceSplats.push(undefined)
    }
    if (ENABLE_LED_AGGREGATE_LIGHT) {
      const aggregate = new THREE.SpotLight(
        new THREE.Color('#ffffff'),
        0,
        feetToWorld(16),
        THREE.MathUtils.degToRad(34),
        0.48,
        1.55
      )
      aggregate.castShadow = false
      aggregate.visible = false
      const aggregateTarget = new THREE.Object3D()
      aggregate.target = aggregateTarget
      ledAggregateLight = aggregate
      ledAggregateTarget = aggregateTarget
      root.add(aggregate)
      root.add(aggregateTarget)
    }

    let ledWireSegments: THREE.LineSegments | undefined
    if (wireEdges.length > 0) {
      const positions: number[] = []
      for (const [start, end] of wireEdges) {
        const a = target.emitters[start]
        const b = target.emitters[end]
        if (a === undefined || b === undefined) {
          continue
        }
        positions.push(a.localX, a.localY, a.localZ, b.localX, b.localY, b.localZ)
      }
      if (positions.length >= 6) {
        const wireGeometry = new THREE.BufferGeometry()
        wireGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3)
        )
        const wireMaterial = new THREE.LineBasicMaterial({
          color: '#060708',
          transparent: true,
          opacity: 0.96,
          toneMapped: false,
        })
        ledWireSegments = new THREE.LineSegments(wireGeometry, wireMaterial)
        root.add(ledWireSegments)
      }
    }

    return {
      signature,
      modelKind: target.modelKind,
      root,
      ledWireSegments,
      emitters,
      beamMeshes,
      emitterLights,
      emitterLightTargets,
      emitterFillRects,
      atmosphereJets,
      surfaceSplats,
      ledAggregateLight,
      ledAggregateTarget,
    }
  }

  if (target.isMoverModel) {
    const isWashMover = target.modelKind === 'moverWash'
    const rig = computeMoverRigDimensions(
      target.modelWidth,
      target.bodyHeight,
      target.bodyDepth,
      target.bodyDiameter,
      { isWashMover }
    )
    const mountGroup = new THREE.Group()
    if (target.mountInverted) {
      mountGroup.rotation.z = Math.PI
    }
    root.add(mountGroup)

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(rig.baseWidth, rig.baseHeight, rig.baseDepth),
      bodyMaterial
    )
    base.position.y = rig.baseHeight * 0.5
    mountGroup.add(base)

    const panPivot = new THREE.Group()
    panPivot.position.y = rig.panAxisY
    mountGroup.add(panPivot)
    const yokeGroup = new THREE.Group()
    panPivot.add(yokeGroup)

    const yokeOuterWidth = rig.yokeInnerWidth + rig.yokeArmThickness * 2

    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(
        rig.yokeArmThickness,
        rig.yokeArmHeight,
        rig.yokeDepth
      ),
      bodyMaterial
    )
    leftArm.position.set(
      -rig.yokeInnerWidth * 0.5 - rig.yokeArmThickness * 0.5,
      rig.yokeArmHeight * 0.5,
      0
    )
    yokeGroup.add(leftArm)

    const rightArm = leftArm.clone()
    rightArm.position.x = rig.yokeInnerWidth * 0.5 + rig.yokeArmThickness * 0.5
    yokeGroup.add(rightArm)

    const bottomBridge = new THREE.Mesh(
      new THREE.BoxGeometry(yokeOuterWidth, rig.yokeArmThickness, rig.yokeDepth),
      bodyMaterial
    )
    bottomBridge.position.y = rig.yokeArmThickness * 0.5
    yokeGroup.add(bottomBridge)

    const headPivot = new THREE.Group()
    headPivot.position.set(0, rig.tiltAxisY, 0)
    yokeGroup.add(headPivot)

    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(
        rig.headRadius,
        rig.headRadius * 0.97,
        rig.headLen,
        28
      ),
      bodyMaterial
    )
    head.rotation.x = Math.PI / 2
    head.position.set(0, 0, 0)
    headPivot.add(head)

    const headFrontZ = rig.headLen * 0.5

    const bezel = new THREE.Mesh(
      new THREE.CylinderGeometry(
        rig.headRadius * 1.06,
        rig.headRadius * 1.06,
        rig.bezelDepth,
        24
      ),
      bodyMaterial
    )
    bezel.rotation.x = Math.PI / 2
    bezel.position.z = headFrontZ + rig.bezelDepth * 0.5
    headPivot.add(bezel)

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(
        rig.headRadius * 0.9,
        rig.headRadius * 0.9,
        rig.lensDepth,
        22
      ),
      lensMaterial
    )
    lens.rotation.x = Math.PI / 2
    lens.position.z = headFrontZ + rig.bezelDepth + rig.lensDepth * 0.5
    headPivot.add(lens)

    if (isWashMover && rig.washCapDepth > 0) {
      const washCap = new THREE.Mesh(
        new THREE.CylinderGeometry(
          rig.headRadius * 1.12,
          rig.headRadius * 1.12,
          rig.washCapDepth,
          22
        ),
        lensMaterial
      )
      washCap.rotation.x = Math.PI / 2
      washCap.position.z =
        headFrontZ + rig.bezelDepth + rig.lensDepth + rig.washCapDepth * 0.5
      headPivot.add(washCap)
    }

    const emitterFaceZ = rig.emitterFaceZ

    const beamStartProbe = new THREE.Object3D()
    beamStartProbe.position.set(0, 0, emitterFaceZ)
    headPivot.add(beamStartProbe)
    root.updateMatrixWorld(true)
    const beamStartLocal = root.worldToLocal(
      beamStartProbe.getWorldPosition(new THREE.Vector3())
    )
    headPivot.remove(beamStartProbe)

    for (const [emitterIndex, emitter] of target.emitters.entries()) {
      const rectFace =
        emitter.shape !== 'disc' &&
        emitter.rectWidthM !== undefined &&
        emitter.rectHeightM !== undefined
          ? { widthM: emitter.rectWidthM, heightM: emitter.rectHeightM }
          : undefined
      const emitterMesh = createEmitterMesh(
        emitter.color,
        emitter.sizeScale,
        emitter.shape,
        rectFace
      )
      const shouldCreateLight = shouldCreateDynamicEmitterLight(target, emitterIndex)
      const shouldCreateSpot = shouldCreateSpotEmitterLight(target, emitterIndex)
      const shadowedSpot =
        target.modelKind === 'moverSpot' &&
        emitterIndex === 0 &&
        target.castPrimarySpotShadow !== false
      const lightBundle = shouldCreateSpot
        ? createSpotEmitterLight(emitter.color, shadowedSpot)
        : null
      const beamMesh =
        ENABLE_BEAM_CONE_MESHES && shouldCreateLight
          ? createBeamMesh(emitter.color)
          : undefined
      const fillRect = shouldCreateFillRectLight(target, emitterIndex)
        ? createRectEmitterLight(emitter.color, 0.2, 0.12)
        : undefined
      const surfaceSplat = ENABLE_SURFACE_SPLATS && shouldCreateLight
        ? createSurfaceSplatMesh(emitter.color)
        : undefined
      headPivot.add(emitterMesh)
      placeEmitterMeshOnFixtureFace(
        emitterMesh,
        new THREE.Vector3(emitter.localX, emitter.localY, emitter.localZ),
        LOCAL_AXIS_Z,
        emitter.shape
      )
      if (lightBundle !== null) {
        headPivot.add(lightBundle.light)
        headPivot.add(lightBundle.target)
      }
      if (beamMesh !== undefined) {
        headPivot.add(beamMesh)
      }
      if (fillRect !== undefined) {
        headPivot.add(fillRect)
      }
      if (surfaceSplat !== undefined) {
        headPivot.add(surfaceSplat)
      }
      emitters.push(emitterMesh)
      beamMeshes.push(beamMesh)
      emitterLights.push(lightBundle?.light)
      emitterLightTargets.push(lightBundle?.target)
      emitterFillRects.push(fillRect)
      atmosphereJets.push(undefined)
      surfaceSplats.push(surfaceSplat)
    }

    const goboLabel = createGoboLabelMesh()
    root.add(goboLabel)

    return {
      signature,
      modelKind: target.modelKind,
      root,
      mountGroup,
      emitters,
      beamMeshes,
      emitterLights,
      emitterLightTargets,
      emitterFillRects,
      atmosphereJets,
      surfaceSplats,
      goboLabel,
      panPivot,
      headPivot,
      beamStartLocal,
    }
  }

  if (target.modelKind === 'washBar') {
    const width = clamp(target.modelWidth, 0.2, 8)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, clamp(target.bodyHeight, 0.04, 2), clamp(target.bodyDepth, 0.04, 2.4)),
      bodyMaterial
    )
    body.position.y = nonMoverEmitterBaseY(target.modelKind)
    root.add(body)
  } else if (target.modelKind === 'uplight') {
    const size = clamp(target.modelWidth, 0.2, 2.2)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.55, clamp(target.bodyHeight, 0.06, 1.4), clamp(target.bodyDepth, 0.06, 1.8)),
      bodyMaterial
    )
    body.position.y = nonMoverEmitterBaseY(target.modelKind) - 0.02
    root.add(body)

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.4, clamp(target.bodyHeight * 0.36, 0.04, 0.8), clamp(target.bodyDepth * 0.8, 0.05, 1.4)),
      bodyMaterial
    )
    top.position.y = nonMoverEmitterBaseY(target.modelKind) + clamp(target.bodyHeight * 0.44, 0.08, 1)
    root.add(top)
  } else if (target.modelKind === 'atmosphericFxtr') {
    const width = clamp(target.modelWidth, 0.2, 4)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, clamp(target.bodyHeight, 0.06, 2), clamp(target.bodyDepth, 0.08, 2.8)),
      bodyMaterial
    )
    body.position.y = nonMoverEmitterBaseY(target.modelKind)
    root.add(body)

    const nozzleLength = clamp(target.bodyDepth * 0.28, 0.08, 0.24)
    const nozzleRadius = clamp(width * 0.08, 0.018, 0.06)
    for (const emitter of target.emitters) {
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(nozzleRadius, nozzleRadius * 0.92, nozzleLength, 14),
        lensMaterial
      )
      nozzle.position.set(emitter.localX, emitter.localY, emitter.localZ)
      if (target.atmosphereNozzleDirection === 'forward') {
        nozzle.rotation.x = Math.PI / 2
      }
      root.add(nozzle)
    }
  } else {
    const width = clamp(target.modelWidth, 0.2, 2.2)
    const height = clamp(target.bodyHeight, 0.06, 1.8)
    const depth = clamp(target.bodyDepth, 0.06, 1.8)
    const diameter = clamp(target.bodyDiameter, 0.08, 2.2)
    const faceWidthScale = fixtureEmitterFaceWidthScale(target.modelKind)
    const body =
      target.bodyShape === 'box'
        ? new THREE.Mesh(
            new THREE.BoxGeometry(width * faceWidthScale, height, depth),
            bodyMaterial
          )
        : new THREE.Mesh(
            new THREE.CylinderGeometry(diameter * 0.5, diameter * 0.55, Math.max(height, depth), 22),
            bodyMaterial
          )
    body.position.y = nonMoverEmitterBaseY(target.modelKind) + 0.08
    if (target.bodyShape !== 'box') {
      body.rotation.x = Math.PI / 2
    }
    root.add(body)
  }

  const groupedBeamSpecs = shouldGroupBeamConesForTarget(target)
    ? computeBeamConeGroups(target)
    : null

  for (const [emitterIndex, emitter] of target.emitters.entries()) {
    const rectFaceNonMover =
      emitter.shape !== 'disc' &&
      emitter.rectWidthM !== undefined &&
      emitter.rectHeightM !== undefined
        ? { widthM: emitter.rectWidthM, heightM: emitter.rectHeightM }
        : undefined
    const emitterMesh = createEmitterMesh(
      emitter.color,
      emitter.sizeScale,
      emitter.shape,
      rectFaceNonMover
    )
    const shouldCreateLight = shouldCreateDynamicEmitterLight(target, emitterIndex)
    const shouldCreateSpot = shouldCreateSpotEmitterLight(target, emitterIndex)
    /** Primary emitter on beam fixtures casts shadows for readable gobo / PAR on surfaces. */
    const shadowedSpot =
      shouldCreateSpot &&
      emitterIndex === 0 &&
      (target.modelKind === 'moverSpot' || target.modelKind === 'parCan') &&
      target.castPrimarySpotShadow !== false
    const lightBundle = shouldCreateSpot
      ? createSpotEmitterLight(emitter.color, shadowedSpot)
      : null
    const beamMesh =
      ENABLE_BEAM_CONE_MESHES && shouldCreateLight && groupedBeamSpecs === null
        ? createBeamMesh(emitter.color)
        : undefined
    const fillRect = shouldCreateFillRectLight(target, emitterIndex)
      ? createRectEmitterLight(emitter.color, 0.22, 0.14)
      : undefined
    const surfaceSplat = ENABLE_SURFACE_SPLATS && shouldCreateLight
      ? createSurfaceSplatMesh(emitter.color)
      : undefined
    root.add(emitterMesh)
    applyEmitterRootPlacement(emitterMesh, target, emitter)
    if (lightBundle !== null) {
      root.add(lightBundle.light)
      root.add(lightBundle.target)
    }
    if (beamMesh !== undefined) {
      root.add(beamMesh)
    }
    if (fillRect !== undefined) {
      root.add(fillRect)
    }
    if (surfaceSplat !== undefined) {
      root.add(surfaceSplat)
    }
    emitters.push(emitterMesh)
    beamMeshes.push(beamMesh)
    emitterLights.push(lightBundle?.light)
    emitterLightTargets.push(lightBundle?.target)
    emitterFillRects.push(fillRect)
    const atmosphereJet =
      !PREVIEW_ESSENTIALS_MODE &&
      isAtmosphericModelKind(target.modelKind)
        ? createAtmosphereJetMesh(emitter.color, target.atmosphereEffect)
        : undefined
    if (atmosphereJet !== undefined) {
      atmosphereJet.position.copy(emitterMesh.position)
      root.add(atmosphereJet)
    }
    atmosphereJets.push(atmosphereJet)
    surfaceSplats.push(surfaceSplat)
  }

  const beamConeGroups: BeamConeGroupVisual[] | undefined =
    groupedBeamSpecs !== null && ENABLE_BEAM_CONE_MESHES
      ? groupedBeamSpecs.map((spec) => {
          const mesh = createBeamMesh(new THREE.Color(1, 1, 1))
          root.add(mesh)
          return {
            mesh,
            emitterIndices: spec.emitterIndices,
            layout: spec.layout,
          }
        })
      : undefined

  return {
    signature,
    modelKind: target.modelKind,
    root,
    emitters,
    beamMeshes,
    beamConeGroups,
    emitterLights,
    emitterLightTargets,
    emitterFillRects,
    atmosphereJets,
    surfaceSplats,
  }
}

export function disposeVisual(visual: FixtureVisual) {
  visual.root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => {
          const maybeWithMap = material as THREE.Material & {
            map?: THREE.Texture | null
          }
          if ((material.userData as { keepMap?: boolean }).keepMap !== true) {
            maybeWithMap.map?.dispose()
          }
          material.dispose()
        })
      } else {
        const maybeWithMap = object.material as THREE.Material & {
          map?: THREE.Texture | null
        }
        if (
          (object.material.userData as { keepMap?: boolean }).keepMap !== true
        ) {
          maybeWithMap.map?.dispose()
        }
        object.material.dispose()
      }
    }
    if (object instanceof THREE.Points) {
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    }
    if (object instanceof THREE.Line) {
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    }
  })
}

export function createGoboLabelMesh(): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 192
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  mesh.scale.set(0.3, 0.3, 1)
  mesh.visible = false
  return mesh
}

export function setGoboLabelText(mesh: THREE.Mesh, text: string, color: string) {
  const material = mesh.material as THREE.MeshBasicMaterial
  const texture = material.map as THREE.CanvasTexture | null
  if (texture === null || texture === undefined) {
    return
  }
  const canvas = texture.image as HTMLCanvasElement
  const context = canvas.getContext('2d')
  if (context === null) {
    return
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(0,0,0,0.42)'
  context.beginPath()
  context.arc(canvas.width / 2, canvas.height / 2, 56, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = color
  context.font = 'bold 96px Arial'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  texture.needsUpdate = true
}

