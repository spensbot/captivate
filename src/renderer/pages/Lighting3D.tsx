import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import StatusBar from '../menu/StatusBar'
import { useControlSelector, useDmxSelector } from '../redux/store'
import { fromFeet, toFeet, METERS_PER_FOOT, StageDimensions } from '../../shared/stage'
import { setLighting3DSettings } from '../redux/dmxSlice'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { Params, getParam } from '../../shared/params'
import { hsv2rgb } from '../../shared/baseColors'
import { inferColorKind, type ColorChannel } from '../../shared/dmxColors'
import {
  defaultMoverBeamAngleForModelKind,
  type FixtureModelConfig,
  type FixtureModelKind,
  type FixtureRotation,
  type MoverBounds,
  type MoverCalibration,
  type MoverMountOrientation,
} from '../../shared/dmxFixtures'
import {
  buildLightingPreviewRows,
  mapRowsToPreviewFixtures,
} from './lightingPreviewFixtures'

export default function Lighting3DPage() {
  const fixtureRows = useDmxSelector(buildLightingPreviewRows)
  const stage = useDmxSelector((state) => state.stage)
  const lighting3d = useDmxSelector((state) => state.lighting3d)
  const dispatch = useDispatch()

  const previewFixtures = useMemo(() => {
    return mapRowsToPreviewFixtures(fixtureRows)
  }, [fixtureRows])

  const roomConfig = useMemo(
    () => ({
      enabled: lighting3d.roomEnabled,
      widthFt: lighting3d.roomWidthFt,
      depthFt: lighting3d.roomDepthFt,
      heightFt: lighting3d.roomHeightFt,
    }),
    [
      lighting3d.roomEnabled,
      lighting3d.roomWidthFt,
      lighting3d.roomDepthFt,
      lighting3d.roomHeightFt,
    ]
  )

  const unitLabel = stage.unit === 'm' ? 'm' : 'ft'
  const dimensionStep = stage.unit === 'm' ? 0.1 : 0.5
  const minRoomDimensionDisplay = Number(fromFeet(5, stage.unit).toFixed(2))

  const toDisplayLength = (valueFt: number): number => {
    return Number(fromFeet(valueFt, stage.unit).toFixed(2))
  }

  const [roomWidthInput, setRoomWidthInput] = useState(() =>
    toDisplayLength(lighting3d.roomWidthFt).toString()
  )
  const [roomDepthInput, setRoomDepthInput] = useState(() =>
    toDisplayLength(lighting3d.roomDepthFt).toString()
  )
  const [roomHeightInput, setRoomHeightInput] = useState(() =>
    toDisplayLength(lighting3d.roomHeightFt).toString()
  )

  useEffect(() => {
    setRoomWidthInput(toDisplayLength(lighting3d.roomWidthFt).toString())
    setRoomDepthInput(toDisplayLength(lighting3d.roomDepthFt).toString())
    setRoomHeightInput(toDisplayLength(lighting3d.roomHeightFt).toString())
  }, [
    stage.unit,
    lighting3d.roomWidthFt,
    lighting3d.roomDepthFt,
    lighting3d.roomHeightFt,
  ])

  const commitDimensionInput = useCallback((
    key: 'roomWidthFt' | 'roomDepthFt' | 'roomHeightFt',
    rawValue: string
  ) => {
    const nextDisplay = Number(rawValue)
    const currentFeet =
      key === 'roomWidthFt'
        ? lighting3d.roomWidthFt
        : key === 'roomDepthFt'
        ? lighting3d.roomDepthFt
        : lighting3d.roomHeightFt

    if (!Number.isFinite(nextDisplay)) {
      const fallback = toDisplayLength(currentFeet).toString()
      if (key === 'roomWidthFt') setRoomWidthInput(fallback)
      if (key === 'roomDepthFt') setRoomDepthInput(fallback)
      if (key === 'roomHeightFt') setRoomHeightInput(fallback)
      return
    }

    const nextFeet = Math.max(5, toFeet(nextDisplay, stage.unit))
    if (key === 'roomWidthFt') {
      dispatch(setLighting3DSettings({ roomWidthFt: nextFeet }))
      setRoomWidthInput(toDisplayLength(nextFeet).toString())
      return
    }
    if (key === 'roomDepthFt') {
      dispatch(setLighting3DSettings({ roomDepthFt: nextFeet }))
      setRoomDepthInput(toDisplayLength(nextFeet).toString())
      return
    }
    dispatch(setLighting3DSettings({ roomHeightFt: nextFeet }))
    setRoomHeightInput(toDisplayLength(nextFeet).toString())
  }, [
    dispatch,
    stage.unit,
    lighting3d.roomWidthFt,
    lighting3d.roomDepthFt,
    lighting3d.roomHeightFt,
  ])

  return (
    <LightingPageRoot>
      <StatusBar />
      <Content>
        <PanelTitle>Lighting 3D Preview</PanelTitle>
        <PanelHint>
          Live 3D preview for all DMX fixtures using current scene output. Use this
          window to program lighting without a connected rig.
        </PanelHint>
        <Controls>
          <ControlItem>
            <ControlLabel>
              <input
                type="checkbox"
                checked={lighting3d.showCurtain}
                onChange={(event) =>
                  dispatch(
                    setLighting3DSettings({
                      showCurtain: event.target.checked,
                    })
                  )
                }
              />
              Curtain
            </ControlLabel>
          </ControlItem>
          <ControlItem>
            <ControlLabel>
              <input
                type="checkbox"
                checked={lighting3d.showBoundsOverlay}
                onChange={(event) =>
                  dispatch(
                    setLighting3DSettings({
                      showBoundsOverlay: event.target.checked,
                    })
                  )
                }
              />
              Bounds Overlay
            </ControlLabel>
          </ControlItem>
          <ControlItem>
            <ControlLabel>
              <input
                type="checkbox"
                checked={lighting3d.roomEnabled}
                onChange={(event) =>
                  dispatch(
                    setLighting3DSettings({
                      roomEnabled: event.target.checked,
                    })
                  )
                }
              />
              Room
            </ControlLabel>
          </ControlItem>
          <ControlItem>
            <ControlLabel>Fog</ControlLabel>
            <FogRow>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={lighting3d.environmentFog}
                onChange={(event) =>
                  dispatch(
                    setLighting3DSettings({
                      environmentFog: Math.min(
                        1,
                        Math.max(0, Number(event.target.value) || 0)
                      ),
                    })
                  )
                }
              />
              <FogValue>{Math.round(lighting3d.environmentFog * 100)}%</FogValue>
            </FogRow>
          </ControlItem>
          <ControlItem>
            <ControlLabel>Room Width ({unitLabel})</ControlLabel>
            <DimensionInput
              type="number"
              step={dimensionStep}
              min={minRoomDimensionDisplay}
              value={roomWidthInput}
              onChange={(event) => setRoomWidthInput(event.target.value)}
              onBlur={() => commitDimensionInput('roomWidthFt', roomWidthInput)}
              disabled={!lighting3d.roomEnabled}
            />
          </ControlItem>
          <ControlItem>
            <ControlLabel>Room Depth ({unitLabel})</ControlLabel>
            <DimensionInput
              type="number"
              step={dimensionStep}
              min={minRoomDimensionDisplay}
              value={roomDepthInput}
              onChange={(event) => setRoomDepthInput(event.target.value)}
              onBlur={() => commitDimensionInput('roomDepthFt', roomDepthInput)}
              disabled={!lighting3d.roomEnabled}
            />
          </ControlItem>
          <ControlItem>
            <ControlLabel>Room Height ({unitLabel})</ControlLabel>
            <DimensionInput
              type="number"
              step={dimensionStep}
              min={minRoomDimensionDisplay}
              value={roomHeightInput}
              onChange={(event) => setRoomHeightInput(event.target.value)}
              onBlur={() => commitDimensionInput('roomHeightFt', roomHeightInput)}
              disabled={!lighting3d.roomEnabled}
            />
          </ControlItem>
        </Controls>
        {previewFixtures.length > 0 ? (
          <Lighting3DViewport
            fixtures={previewFixtures}
            stage={stage}
            showCurtain={lighting3d.showCurtain}
            showBoundsOverlay={lighting3d.showBoundsOverlay}
            environmentFog={lighting3d.environmentFog}
            room={roomConfig}
          />
        ) : (
          <EmptyState>
            No fixtures found. Add fixtures in DMX Setup to populate the 3D preview.
          </EmptyState>
        )}
      </Content>
    </LightingPageRoot>
  )
}

const LightingPageRoot = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const Content = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.8rem;
`

const PanelTitle = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
`

const PanelHint = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem 0.48rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.42rem 0.56rem;
  background: ${(props) => props.theme.colors.bg.primary};
`

const ControlItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: 9.2rem;
`

const ControlLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const FogRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;

  input[type='range'] {
    width: 100%;
  }
`

const FogValue = styled.span`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
  min-width: 2.4rem;
  text-align: right;
`

const DimensionInput = styled.input`
  width: 100%;
  font-size: 0.78rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.28rem;
  padding: 0.24rem 0.35rem;
`

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 12rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.9rem;
  text-align: center;
  padding: 0.8rem;
`

export interface MoverPreviewColorChannel {
  channelIndex: number
  color: ColorChannel
}

export interface MoverPreviewColorMapChannel {
  channelIndex: number
  colors: Array<
    ColorChannel & {
      max: number
    }
  >
}

export interface MoverPreviewMasterChannel {
  channelIndex: number
  min: number
  max: number
  isOnOff: boolean
}

export interface MoverPreviewFocusChannel {
  channelIndex: number
  min: number
  max: number
}

export interface MoverPreviewGoboMapChannel {
  channelIndex: number
  gobos: Array<{
    name: string
    max: number
  }>
}

export interface MoverPreviewEmitterGroup {
  emitterCount: number
  relativeX: number
  relativeY: number
  relativeZ: number
  colorChannels: MoverPreviewColorChannel[]
  colorMapChannels: MoverPreviewColorMapChannel[]
  masterChannels: MoverPreviewMasterChannel[]
  goboMapChannels: MoverPreviewGoboMapChannel[]
}

export interface MoverPreviewFixture {
  fixtureId: string
  groupName: string
  xPos: number
  yPos: number
  zPos: number
  rotation: FixtureRotation
  universe: number
  panCoarseChannel?: number
  panFineChannel?: number
  tiltCoarseChannel?: number
  tiltFineChannel?: number
  panMin?: number
  panMax?: number
  tiltMin?: number
  tiltMax?: number
  moverCalibration?: MoverCalibration
  moverBounds?: MoverBounds
  moverMountOrientation?: MoverMountOrientation
  colorChannels: MoverPreviewColorChannel[]
  colorMapChannels: MoverPreviewColorMapChannel[]
  masterChannels: MoverPreviewMasterChannel[]
  focusChannels: MoverPreviewFocusChannel[]
  goboMapChannels: MoverPreviewGoboMapChannel[]
  model: FixtureModelConfig
  emitterGroups: MoverPreviewEmitterGroup[]
}

interface Lighting3DViewportProps {
  fixtures: MoverPreviewFixture[]
  stage: StageDimensions
  showCurtain?: boolean
  showBoundsOverlay?: boolean
  environmentFog?: number
  room?: {
    enabled: boolean
    widthFt: number
    depthFt: number
    heightFt: number
  }
}

interface FixtureVisual {
  signature: string
  modelKind: FixtureModelKind
  root: THREE.Group
  emitters: THREE.Mesh[]
  emitterVolumes: THREE.Object3D[]
  emitterSurfaceSplats: THREE.Mesh[][]
  goboLabel?: THREE.Mesh
  panPivot?: THREE.Group
  headPivot?: THREE.Group
  beamStartLocal?: THREE.Vector3
}

interface PreviewEmitterTarget {
  localX: number
  localY: number
  localZ: number
  color: THREE.Color
  intensity: number
}

interface PreviewTarget {
  fixtureId: string
  modelKind: FixtureModelKind
  modelWidth: number
  moverBeamAngleDeg: number
  isMoverModel: boolean
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
}

interface SurfaceSpec {
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

interface SurfaceHit {
  point: THREE.Vector3
  normal: THREE.Vector3
  distance: number
  surface: 'floor' | 'curtain'
}

interface BeamBoundarySample {
  hit: SurfaceHit | undefined
  point: THREE.Vector3
  distance: number
}

interface SurfaceSplatProjection {
  hit: SurfaceHit
  center: THREE.Vector3
  normal: THREE.Vector3
  tangent: THREE.Vector3
  majorRadius: number
  minorRadius: number
}

interface LiveAxisValues {
  panRaw: number
  tiltRaw: number
  panNorm: number
  tiltNorm: number
}

interface FloorSpec {
  width: number
  depth: number
  centerX: number
  centerZ: number
}

const ROOM_HEIGHT = 5
const DANCE_FLOOR_Y = 0.001
const FLOOR_MIN_SIZE = 2
const FLOOR_MAX_SIZE = 28
const FALLBACK_TARGET_LENGTH = 10
const FALLBACK_WORLD_FLOOR_SIZE = 220
const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 6.9, 10.1]
const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 1.8, 0.8]
const CAMERA_STORAGE_KEY = 'captivate.lighting3d.camera.v1'
const FALLBACK_BEAM_REACH_FT = 120
const EMITTER_DISK_RADIUS = 0.0225
const BOUNDARY_RAY_BIAS = 0.01
const SHARP_CONE_SEGMENTS = 24
const MAX_SURFACE_SPLATS_PER_EMITTER = 4
const SHARP_CONE_SAMPLE_ANGLES = Array.from(
  { length: SHARP_CONE_SEGMENTS },
  (_, segment) => (segment / SHARP_CONE_SEGMENTS) * Math.PI * 2
)

interface PersistedCameraState {
  position: [number, number, number]
  target: [number, number, number]
}

function readPersistedCameraState():
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

function writePersistedCameraState(state: PersistedCameraState) {
  try {
    window.localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors.
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function feetToWorld(feet: number): number {
  return feet * METERS_PER_FOOT
}

function computeFloorSpecFromStage(stage: StageDimensions): FloorSpec {
  const width = clamp(feetToWorld(stage.widthFt), FLOOR_MIN_SIZE, FLOOR_MAX_SIZE)
  const depth = clamp(feetToWorld(stage.depthFt), FLOOR_MIN_SIZE, FLOOR_MAX_SIZE)
  return {
    width,
    depth,
    centerX: 0,
    centerZ: depth * 0.5,
  }
}

function stageHeightFromStage(stage: StageDimensions): number {
  return clamp(feetToWorld(stage.heightFt), 1.2, ROOM_HEIGHT)
}

function parseMoverMode(params: Params): number {
  const raw = Number(params.moverMode ?? 0)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(2, Math.round(raw)))
}

function colorForGroup(groupName: string): THREE.Color {
  let hash = 0
  for (let i = 0; i < groupName.length; i++) {
    hash = (hash * 31 + groupName.charCodeAt(i)) | 0
  }

  const hue = ((hash % 360) + 360) % 360
  return new THREE.Color(`hsl(${hue}, 85%, 58%)`)
}

function resolveModelKind(fixture: MoverPreviewFixture): FixtureModelKind {
  if (fixture.model.kind !== 'auto') {
    return fixture.model.kind
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

function isMoverModelKind(kind: FixtureModelKind): boolean {
  return kind === 'moverSpot' || kind === 'moverWash'
}

function isCloudModelKind(kind: FixtureModelKind): boolean {
  return kind === 'washBar' || kind === 'uplight' || kind === 'moverWash'
}

function stageTopEdgeZFromFloorSpec(floorSpec: FloorSpec): number {
  return floorSpec.centerZ - floorSpec.depth * 0.5
}

function fixtureWorldFromUniversePosition(
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

function danceFloorWorldFromNormalized(
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

function normalizeAxisValue(value: number, min: number, max: number): number {
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

function readLiveAxisValues(
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
    panNorm: normalizeAxisValue(panRaw, fixture.panMin ?? 0, fixture.panMax ?? 255),
    tiltNorm: normalizeAxisValue(tiltRaw, fixture.tiltMin ?? 0, fixture.tiltMax ?? 255),
  }
}

interface LiveBeamValues {
  color: THREE.Color
  intensity: number
}

interface BeamChannelSet {
  colorChannels: MoverPreviewColorChannel[]
  colorMapChannels: MoverPreviewColorMapChannel[]
  masterChannels: MoverPreviewMasterChannel[]
}

function normalizeDmxRange(value: number, min: number, max: number): number {
  if (Math.abs(max - min) < 0.0001) {
    return clamp01(value / 255)
  }

  if (max > min) {
    return clamp01((value - min) / (max - min))
  }

  return clamp01((min - value) / (min - max))
}

function colorFromChannelDefinition(channel: ColorChannel): THREE.Color {
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

function estimateColorMapIntensity(value: number, mappedMax: number): number {
  if (mappedMax <= 0.0001) {
    return clamp01(value / 255)
  }
  return clamp01(value / mappedMax)
}

function readLiveBeamValuesForChannels(
  channelSet: BeamChannelSet,
  universeData: number[] | undefined,
  params: Params,
  fallbackColor: THREE.Color
): LiveBeamValues {
  const [hsvR, hsvG, hsvB] = hsv2rgb(
    clamp01(getParam(params, 'hue')),
    clamp01(getParam(params, 'saturation')),
    1
  )
  const hsvFallbackColor = new THREE.Color(hsvR, hsvG, hsvB)

  if (universeData === undefined) {
    return {
      color: hsvFallbackColor,
      intensity: clamp01(getParam(params, 'brightness')),
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

    const baseColor = colorFromChannelDefinition(selected)
    combinedColor.r += baseColor.r
    combinedColor.g += baseColor.g
    combinedColor.b += baseColor.b
    colorControlLevel = Math.max(
      colorControlLevel,
      estimateColorMapIntensity(rawValue, selected.max)
    )
  }

  const hasColorDefinitions =
    channelSet.colorChannels.length > 0 || channelSet.colorMapChannels.length > 0
  const hasCombinedColor =
    combinedColor.r + combinedColor.g + combinedColor.b > 0.001

  const previewColor = hasCombinedColor
    ? new THREE.Color(
        clamp01(combinedColor.r),
        clamp01(combinedColor.g),
        clamp01(combinedColor.b)
      )
    : hasColorDefinitions
      ? hsvFallbackColor
      : fallbackColor.clone()

  const fallbackLevel = hasColorDefinitions
    ? colorControlLevel
    : clamp01(getParam(params, 'brightness'))

  return {
    color: previewColor,
    intensity: clamp01(fallbackLevel * masterLevel),
  }
}

function readLiveGoboIndex(
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

function readLiveFocusNormalized(
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

function focusWidthScale(focusNorm: number | undefined): number {
  if (focusNorm === undefined || !Number.isFinite(focusNorm)) {
    return 1
  }
  return lerp(0.55, 1.65, clamp01(focusNorm))
}

function nearestSurfaceHit(
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

function orientDmxValue(
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

function wrapDegrees(value: number): number {
  let wrapped = ((value + 180) % 360 + 360) % 360 - 180
  if (wrapped === -180) wrapped = 180
  return wrapped
}

function derivePanSlopeDegPerDmx(calibration: MoverCalibration): number {
  const pan = calibration.pan
  const min = Number.isFinite(pan.min) ? pan.min : 0
  const max = Number.isFinite(pan.max) ? pan.max : 255
  const turns = Number.isFinite(pan.turns) ? Math.max(0.25, pan.turns) : 1
  const span = Math.max(1, Math.abs(max - min))
  const baseSlopeMagnitude = (turns * 360) / span

  const front = orientDmxValue(pan.front, min, max, pan.invert)
  const back = orientDmxValue(pan.back, min, max, pan.invert)
  const delta = back - front

  const signFallback = delta >= 0 ? 1 : -1
  let bestSlope = signFallback * baseSlopeMagnitude

  if (Math.abs(delta) < 0.0001) {
    return bestSlope
  }

  let bestScore = Number.POSITIVE_INFINITY
  const maxK = Math.max(3, Math.ceil(turns) + 2)

  for (let k = -maxK; k <= maxK; k++) {
    const targetBackAngle = 180 + 360 * k
    const candidateSlope = targetBackAngle / delta

    if (!Number.isFinite(candidateSlope)) {
      continue
    }

    const spanAngle = Math.abs(candidateSlope * (max - min))
    const targetSpanAngle = turns * 360
    const score =
      Math.abs(Math.abs(candidateSlope) - baseSlopeMagnitude) * 4 +
      Math.abs(spanAngle - targetSpanAngle) * 0.04

    if (score < bestScore) {
      bestScore = score
      bestSlope = candidateSlope
    }
  }

  return bestSlope
}

function mapPanDmxToYawDeg(
  value: number,
  calibration: MoverCalibration | undefined,
  fallbackNorm: number
): number {
  if (calibration === undefined) {
    return (fallbackNorm - 0.5) * 180
  }

  const pan = calibration.pan
  const min = Number.isFinite(pan.min) ? pan.min : 0
  const max = Number.isFinite(pan.max) ? pan.max : 255
  const orientedValue = orientDmxValue(value, min, max, pan.invert)
  const orientedFront = orientDmxValue(pan.front, min, max, pan.invert)
  const slope = derivePanSlopeDegPerDmx(calibration)
  const yawRaw = (orientedValue - orientedFront) * slope

  return wrapDegrees(yawRaw)
}

function mapTiltDmxToPitchDeg(
  value: number,
  calibration: MoverCalibration | undefined,
  fallbackNorm: number,
  mountInverted: boolean
): number {
  if (calibration === undefined) {
    return lerp(-90, 90, fallbackNorm)
  }

  const tilt = calibration.tilt
  const min = Number.isFinite(tilt.min) ? tilt.min : 0
  const max = Number.isFinite(tilt.max) ? tilt.max : 255

  const orientedMin = orientDmxValue(tilt.min, min, max, tilt.invert)
  const orientedMax = orientDmxValue(tilt.max, min, max, tilt.invert)
  const orientedForward = orientDmxValue(tilt.forward, min, max, tilt.invert)
  const orientedSecondary = orientDmxValue(
    mountInverted ? tilt.down : tilt.up,
    min,
    max,
    tilt.invert
  )
  const orientedValue = orientDmxValue(value, min, max, tilt.invert)

  const secondaryPitch = mountInverted ? -90 : 90
  const anchorSpan = orientedSecondary - orientedForward
  const fallbackSpan = orientedMax - orientedMin
  const span = Math.abs(anchorSpan) > 0.0001 ? anchorSpan : fallbackSpan

  if (Math.abs(span) <= 0.0001) {
    return lerp(-90, 90, fallbackNorm)
  }

  const slope = secondaryPitch / span
  let pitch = (orientedValue - orientedForward) * slope

  const minPitch = (orientedMin - orientedForward) * slope
  const maxPitch = (orientedMax - orientedForward) * slope
  pitch = clamp(pitch, Math.min(minPitch, maxPitch), Math.max(minPitch, maxPitch))

  return clamp(pitch, -180, 180)
}

function directionFromYawPitch(yawDeg: number, pitchDeg: number): THREE.Vector3 {
  const yaw = THREE.MathUtils.degToRad(yawDeg)
  const pitch = THREE.MathUtils.degToRad(pitchDeg)
  const cosPitch = Math.cos(pitch)

  return new THREE.Vector3(
    Math.sin(yaw) * cosPitch,
    Math.sin(pitch),
    Math.cos(yaw) * cosPitch
  ).normalize()
}

function projectAimToFloor(
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

function targetFromLiveAxis(
  fixture: MoverPreviewFixture,
  liveAxis: LiveAxisValues,
  fixtureWorld: { worldX: number; worldY: number; worldZ: number }
): { worldX: number; worldY: number; worldZ: number } {
  const yawDeg = mapPanDmxToYawDeg(
    liveAxis.panRaw,
    fixture.moverCalibration,
    liveAxis.panNorm
  )
  const pitchDeg = mapTiltDmxToPitchDeg(
    liveAxis.tiltRaw,
    fixture.moverCalibration,
    liveAxis.tiltNorm,
    fixture.moverMountOrientation === 'inverted'
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

function findClosestReferenceIndex<T>(
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

function buildTargets(
  fixtures: MoverPreviewFixture[],
  params: Params,
  dmxOutByUniverse: number[][],
  floorSpec: FloorSpec,
  stageHeight: number
): PreviewTarget[] {
  const baseX = clamp01(getParam(params, 'xAxis'))
  const baseY = clamp01(getParam(params, 'yAxis'))
  const spread = clamp01(getParam(params, 'moverSpread'))
  const mirrorLeftRight = getParam(params, 'moverMirrorX') > 0.5
  const mirrorTopBottom = getParam(params, 'moverMirrorY') > 0.5
  const moverMode = parseMoverMode(params)

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
      let targetWorld = danceFloorWorldFromNormalized(
        targetNormX,
        targetNormY,
        floorSpec
      )

      const modelKind = resolveModelKind(fixture)
      const isMoverModel = isMoverModelKind(modelKind)
      const modelWidth = clamp(fixture.model.width, 0.2, 8)
      const moverModelScale = clamp(modelWidth, 0.4, 1.6)
      const moverSpotEmitterFaceZ = moverModelScale * 0.17
      const moverWashEmitterFaceZ = moverModelScale * 0.18
      let aimYawDeg: number | undefined = undefined
      let aimPitchDeg: number | undefined = undefined

      const liveAxis =
        isMoverModel ? readLiveAxisValues(fixture, dmxOutByUniverse) : undefined
      if (isMoverModel && liveAxis !== undefined) {
        aimYawDeg = mapPanDmxToYawDeg(
          liveAxis.panRaw,
          fixture.moverCalibration,
          liveAxis.panNorm
        )
        aimPitchDeg = mapTiltDmxToPitchDeg(
          liveAxis.tiltRaw,
          fixture.moverCalibration,
          liveAxis.tiltNorm,
          fixture.moverMountOrientation === 'inverted'
        )
        // Primary mode: use real DMX output and mover calibration directly.
        targetWorld = targetFromLiveAxis(fixture, liveAxis, fixtureWorld)
      }

      const universe = Math.max(1, Math.round(fixture.universe || 1))
      const universeData = dmxOutByUniverse[universe - 1]
      const focusNorm = readLiveFocusNormalized(fixture.focusChannels, universeData)
      const hasFocusChannel = fixture.focusChannels.length > 0

      const emitterGroups =
        fixture.emitterGroups.length > 0
          ? fixture.emitterGroups
          : [
              {
                emitterCount: 1,
                relativeX: 0.5,
                relativeY: 0.5,
                relativeZ: 0.5,
                colorChannels: fixture.colorChannels,
                colorMapChannels: fixture.colorMapChannels,
                masterChannels: fixture.masterChannels,
                goboMapChannels: fixture.goboMapChannels,
              },
            ]

      const goboIndex = readLiveGoboIndex(fixture.goboMapChannels, universeData)

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

      const emitters: PreviewEmitterTarget[] = []
      for (const [groupIndex, emitterGroup] of emitterGroups.entries()) {
        const beamValues = readLiveBeamValuesForChannels(
          {
            colorChannels: emitterGroup.colorChannels,
            colorMapChannels: emitterGroup.colorMapChannels,
            masterChannels: emitterGroup.masterChannels,
          },
          universeData,
          params,
          groupColor
        )

        const count = Math.max(1, Math.min(64, Math.round(emitterGroup.emitterCount)))
        if (modelKind === 'washBar') {
          const centerX =
            -washBarUsableWidth / 2 + washBarSectionWidth * (groupIndex + 0.5)
          const centerY = 0
          const centerZ = 0

          for (let emitterIndex = 0; emitterIndex < count; emitterIndex++) {
            const slot =
              count <= 1 ? 0 : emitterIndex / Math.max(1, count - 1) - 0.5
            emitters.push({
              localX: centerX + slot * washBarClusterWidth,
              localY: centerY,
              localZ: 0.029 + centerZ,
              color: beamValues.color.clone(),
              intensity: beamValues.intensity,
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
                localZ: moverWashEmitterFaceZ + centerZ * 0.2,
                color: beamValues.color.clone(),
                intensity: beamValues.intensity,
              })
              continue
            }

            const ringIndex = emitterIndex - 1
            const ringCount = Math.max(1, count - 1)
            const angle = (ringIndex / ringCount) * Math.PI * 2
            emitters.push({
              localX: centerX + Math.cos(angle) * radius,
              localY: centerY + Math.sin(angle) * radius,
              localZ: moverWashEmitterFaceZ + centerZ * 0.2,
              color: beamValues.color.clone(),
              intensity: beamValues.intensity,
            })
          }
        } else {
          const centerX =
            (clamp01(emitterGroup.relativeX) - 0.5) *
            modelWidth *
            (isMoverModel ? 0.18 : 0.85)
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
          const baseZ =
            modelKind === 'uplight'
              ? 0.02 + centerZ
              : modelKind === 'moverSpot'
              ? moverSpotEmitterFaceZ + centerZ * 0.2
              : 0.17 + centerZ

          for (let emitterIndex = 0; emitterIndex < count; emitterIndex++) {
            const slot =
              count <= 1 ? 0 : emitterIndex / Math.max(1, count - 1) - 0.5
            emitters.push({
              localX:
                modelKind === 'uplight'
                  ? centerX + slot * spread * 0.45
                  : centerX + slot * spread,
              localY: modelKind === 'uplight' ? centerY + 0.04 : centerY,
              localZ: baseZ,
              color: beamValues.color.clone(),
              intensity: beamValues.intensity,
            })
          }
        }
      }

      targets.push({
        fixtureId: fixture.fixtureId,
        modelKind,
        modelWidth,
        moverBeamAngleDeg: fixture.model.moverBeamAngleDeg,
        isMoverModel,
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

  return targets
}

function fixtureVisualSignature(target: PreviewTarget): string {
  return `${target.modelKind}:${target.modelWidth.toFixed(3)}:${target.emitters.length}`
}

function createPleatedCurtainGeometry(): THREE.PlaneGeometry {
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

function nonMoverEmitterBaseY(modelKind: FixtureModelKind): number {
  if (modelKind === 'washBar') return 0.12
  if (modelKind === 'parCan') return 0.2
  if (modelKind === 'uplight') return 0.26
  return 0.23
}

function createEmitterMesh(color: THREE.Color): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.0225, 0.0225, 0.005, 24)

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.1,
      metalness: 0.05,
      roughness: 0.2,
      toneMapped: false,
    })
  )
}

function createEmitterSurfaceSplatMesh(
  color: THREE.Color,
  segments: number
): THREE.Mesh {
  const splat = new THREE.Mesh(
    new THREE.CircleGeometry(1, segments),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  )
  splat.visible = false
  return splat
}

function createEmitterVolumeMesh(
  modelKind: FixtureModelKind,
  color: THREE.Color
): THREE.Object3D {
  const isCloud = isCloudModelKind(modelKind)
  if (isCloud) {
    const group = new THREE.Group()
    const layers = [
      { radiusScale: 1, opacity: 0.36 },
      { radiusScale: 1.24, opacity: 0.23 },
      { radiusScale: 1.52, opacity: 0.14 },
      { radiusScale: 1.9, opacity: 0.08 },
    ]
    for (const layer of layers) {
      const geometry = createSharpConeGeometry(SHARP_CONE_SEGMENTS)
      const shell = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        })
      )
      shell.userData.baseOpacity = layer.opacity
      shell.userData.radiusScale = layer.radiusScale
      group.add(shell)
    }
    group.userData.volumeKind = 'softCone'
    return group
  }

  const geometry = createSharpConeGeometry(SHARP_CONE_SEGMENTS)
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  )
  mesh.userData.volumeKind = 'sharpCone'
  return mesh
}

function createSharpConeGeometry(radialSegments: number): THREE.BufferGeometry {
  const segments = Math.max(3, Math.round(radialSegments))
  const geometry = new THREE.BufferGeometry()
  const vertexCount = (segments + 1) * 2
  const positions = new Float32Array(vertexCount * 3)
  const indices: number[] = []

  for (let segment = 0; segment <= segments; segment++) {
    const angle = (segment / segments) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const nearIndex = segment * 2
    const farIndex = nearIndex + 1

    positions[nearIndex * 3 + 0] = cos * EMITTER_DISK_RADIUS
    positions[nearIndex * 3 + 1] = sin * EMITTER_DISK_RADIUS
    positions[nearIndex * 3 + 2] = 0

    positions[farIndex * 3 + 0] = cos * EMITTER_DISK_RADIUS
    positions[farIndex * 3 + 1] = sin * EMITTER_DISK_RADIUS
    positions[farIndex * 3 + 2] = 1

    if (segment < segments) {
      const nextNearIndex = nearIndex + 2
      const nextFarIndex = farIndex + 2
      indices.push(nearIndex, farIndex, nextFarIndex)
      indices.push(nearIndex, nextFarIndex, nextNearIndex)
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.userData.radialSegments = segments
  return geometry
}

function setSharpConeGeometryFromPoints(
  geometry: THREE.BufferGeometry,
  nearRadius: number,
  farRingLocal: THREE.Vector3[]
) {
  if (farRingLocal.length === 0) {
    return
  }

  const position = geometry.getAttribute('position')
  if (!(position instanceof THREE.BufferAttribute)) {
    return
  }

  const segments = Math.max(
    3,
    Math.round(Number(geometry.userData.radialSegments ?? SHARP_CONE_SEGMENTS))
  )

  for (let segment = 0; segment <= segments; segment++) {
    const angle = (segment / segments) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const nearIndex = segment * 2
    const farIndex = nearIndex + 1
    const farPoint =
      segment === segments
        ? farRingLocal[0]
        : farRingLocal[Math.min(segment, farRingLocal.length - 1)]
    const farZ = Math.max(0.02, farPoint.z)

    position.setXYZ(nearIndex, cos * nearRadius, sin * nearRadius, 0)
    position.setXYZ(farIndex, farPoint.x, farPoint.y, farZ)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}

function buildBeamBasis(beamDirection: THREE.Vector3): {
  tangent: THREE.Vector3
  bitangent: THREE.Vector3
} {
  const fallbackAxis =
    Math.abs(beamDirection.y) < 0.98
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0)
  const tangent = new THREE.Vector3()
    .crossVectors(fallbackAxis, beamDirection)
    .normalize()
  const bitangent = new THREE.Vector3()
    .crossVectors(beamDirection, tangent)
    .normalize()

  return {
    tangent,
    bitangent,
  }
}

function sampleBeamBoundary(
  origin: THREE.Vector3,
  beamDirection: THREE.Vector3,
  halfAngleRad: number,
  sampleAngles: number[],
  surfaceSpec: SurfaceSpec,
  axisDistance: number,
  nearRadius: number
): BeamBoundarySample[] {
  const radialGrowth = Math.tan(halfAngleRad) * Math.max(0.02, axisDistance)
  const farRadius = nearRadius + radialGrowth
  const safeAxisDistance = Math.max(0.02, axisDistance)
  const { tangent, bitangent } = buildBeamBasis(beamDirection)
  const centerPoint = origin
    .clone()
    .addScaledVector(beamDirection, safeAxisDistance)

  return sampleAngles.map((angle) => {
    const radialCos = Math.cos(angle)
    const radialSin = Math.sin(angle)
    const nearPoint = origin
      .clone()
      .add(tangent.clone().multiplyScalar(radialCos * nearRadius))
      .add(bitangent.clone().multiplyScalar(radialSin * nearRadius))
    const farGuide = centerPoint
      .clone()
      .add(tangent.clone().multiplyScalar(radialCos * farRadius))
      .add(bitangent.clone().multiplyScalar(radialSin * farRadius))
    const direction = farGuide
      .clone()
      .sub(nearPoint)
      .normalize()
    const rayOrigin = nearPoint.clone().addScaledVector(direction, BOUNDARY_RAY_BIAS)
    const hit = nearestSurfaceHit(rayOrigin, direction, surfaceSpec)
    const distance =
      hit !== undefined
        ? Math.max(0.02, hit.distance + BOUNDARY_RAY_BIAS)
        : feetToWorld(FALLBACK_BEAM_REACH_FT)

    return {
      hit,
      point: nearPoint.clone().addScaledVector(direction, distance),
      distance,
    }
  })
}

function isSameSurface(first: SurfaceHit, second: SurfaceHit): boolean {
  if (first.surface !== second.surface) {
    return false
  }
  return first.normal.dot(second.normal) > 0.92
}

function surfaceHitKey(hit: SurfaceHit, spec: SurfaceSpec): string {
  const normal = hit.normal
  if (Math.abs(normal.y) > 0.9) {
    return normal.y > 0 ? 'floor' : 'room:ceiling'
  }

  if (
    spec.includeCurtain &&
    Math.abs(normal.z) > 0.9 &&
    Math.abs(hit.point.z - spec.curtainZ) < 0.05
  ) {
    return 'curtain'
  }

  if (Math.abs(normal.x) > 0.9) {
    return normal.x > 0 ? 'room:left' : 'room:right'
  }
  if (Math.abs(normal.z) > 0.9) {
    return normal.z > 0 ? 'room:back' : 'room:front'
  }

  return `surface:${normal.x.toFixed(3)}:${normal.y.toFixed(3)}:${normal.z.toFixed(3)}`
}

function surfaceRectBounds(
  hit: SurfaceHit,
  spec: SurfaceSpec
):
  | {
      axisA: 'x' | 'y' | 'z'
      minA: number
      maxA: number
      axisB: 'x' | 'y' | 'z'
      minB: number
      maxB: number
    }
  | undefined {
  const normal = hit.normal

  if (Math.abs(normal.y) > 0.9) {
    if (normal.y > 0) {
      return {
        axisA: 'x',
        minA: spec.floorMinX,
        maxA: spec.floorMaxX,
        axisB: 'z',
        minB: spec.floorMinZ,
        maxB: spec.floorMaxZ,
      }
    }

    if (!spec.includeRoom) {
      return undefined
    }
    return {
      axisA: 'x',
      minA: spec.roomMinX,
      maxA: spec.roomMaxX,
      axisB: 'z',
      minB: spec.roomMinZ,
      maxB: spec.roomMaxZ,
    }
  }

  if (Math.abs(normal.x) > 0.9) {
    if (!spec.includeRoom) {
      return undefined
    }
    return {
      axisA: 'z',
      minA: spec.roomMinZ,
      maxA: spec.roomMaxZ,
      axisB: 'y',
      minB: spec.roomMinY,
      maxB: spec.roomMaxY,
    }
  }

  const isCurtainPlane =
    spec.includeCurtain && Math.abs(hit.point.z - spec.curtainZ) < 0.02
  if (isCurtainPlane) {
    return {
      axisA: 'x',
      minA: spec.curtainMinX,
      maxA: spec.curtainMaxX,
      axisB: 'y',
      minB: spec.curtainMinY,
      maxB: spec.curtainMaxY,
    }
  }

  if (!spec.includeRoom) {
    return undefined
  }
  return {
    axisA: 'x',
    minA: spec.roomMinX,
    maxA: spec.roomMaxX,
    axisB: 'y',
    minB: spec.roomMinY,
    maxB: spec.roomMaxY,
  }
}

function axisPlane(axis: 'x' | 'y' | 'z', normalSign: 1 | -1, offset: number): THREE.Plane {
  if (axis === 'x') {
    return new THREE.Plane(new THREE.Vector3(normalSign, 0, 0), -normalSign * offset)
  }
  if (axis === 'y') {
    return new THREE.Plane(new THREE.Vector3(0, normalSign, 0), -normalSign * offset)
  }
  return new THREE.Plane(new THREE.Vector3(0, 0, normalSign), -normalSign * offset)
}

function clippingPlanesForSurface(hit: SurfaceHit, spec: SurfaceSpec): THREE.Plane[] {
  const bounds = surfaceRectBounds(hit, spec)
  if (bounds === undefined) {
    return []
  }

  return [
    axisPlane(bounds.axisA, 1, bounds.minA),
    axisPlane(bounds.axisA, -1, bounds.maxA),
    axisPlane(bounds.axisB, 1, bounds.minB),
    axisPlane(bounds.axisB, -1, bounds.maxB),
  ]
}

function clippingPlanesForCone(spec: SurfaceSpec): THREE.Plane[] {
  const planes: THREE.Plane[] = [
    axisPlane('y', 1, spec.floorY),
  ]

  if (spec.includeRoom) {
    planes.push(axisPlane('x', 1, spec.roomMinX))
    planes.push(axisPlane('x', -1, spec.roomMaxX))
    planes.push(axisPlane('z', 1, spec.roomMinZ))
    planes.push(axisPlane('z', -1, spec.roomMaxZ))
    planes.push(axisPlane('y', -1, spec.roomMaxY))
  }

  return planes
}

function buildSurfaceSplatProjections(
  origin: THREE.Vector3,
  centerHit: SurfaceHit | undefined,
  boundarySamples: BeamBoundarySample[] | undefined,
  beamDirection: THREE.Vector3,
  halfAngleRad: number,
  nearRadius: number,
  allowMultiSurface: boolean,
  surfaceSpec: SurfaceSpec
): SurfaceSplatProjection[] {
  const groupedHits = new Map<
    string,
    {
      hit: SurfaceHit
      points: THREE.Vector3[]
      distances: number[]
      includesCenter: boolean
    }
  >()

  const pushHitPoint = (
    hit: SurfaceHit | undefined,
    point: THREE.Vector3,
    distance: number,
    includeCenter: boolean
  ) => {
    if (hit === undefined) {
      return
    }
    const key = surfaceHitKey(hit, surfaceSpec)
    const existing = groupedHits.get(key)
    if (existing === undefined) {
      groupedHits.set(key, {
        hit,
        points: [point.clone()],
        distances: [distance],
        includesCenter: includeCenter,
      })
      return
    }
    existing.points.push(point.clone())
    existing.distances.push(distance)
    existing.includesCenter = existing.includesCenter || includeCenter
  }

  if (centerHit !== undefined) {
    pushHitPoint(centerHit, centerHit.point, centerHit.distance, true)
  }
  boundarySamples?.forEach((sample) => {
    if (sample.hit !== undefined) {
      pushHitPoint(sample.hit, sample.hit.point, sample.distance, false)
    }
  })

  const projections: SurfaceSplatProjection[] = []

  for (const [, group] of groupedHits) {
    if (group.points.length === 0) {
      continue
    }
    if (!allowMultiSurface && !group.includesCenter) {
      continue
    }

    const normal = group.hit.normal.clone().normalize()
    let tangent = beamDirection
      .clone()
      .sub(normal.clone().multiplyScalar(beamDirection.dot(normal)))

    if (tangent.lengthSq() <= 0.000001) {
      const fallbackAxis =
        Math.abs(normal.y) < 0.95
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0)
      tangent = new THREE.Vector3().crossVectors(fallbackAxis, normal)
    }
    tangent.normalize()
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize()

    const centroid = group.points
      .reduce((sum, point) => sum.add(point), new THREE.Vector3())
      .multiplyScalar(1 / group.points.length)

    const denominator = beamDirection.dot(normal)
    let center = centroid
    let axisDistance = 0
    if (Math.abs(denominator) > 0.000001) {
      // Always project the beam axis onto the hit plane so splats preserve
      // world size near edges and rely on clipping planes for edge masking.
      const t = normal.dot(group.hit.point.clone().sub(origin)) / denominator
      if (Number.isFinite(t) && t > 0) {
        center = origin.clone().addScaledVector(beamDirection, t)
        axisDistance = t
      }
    }

    if (axisDistance <= 0 && group.distances.length > 0) {
      axisDistance =
        group.distances.reduce((sum, value) => sum + value, 0) / group.distances.length
    }
    if (axisDistance <= 0) {
      axisDistance = Math.max(0.02, beamDirection.dot(centroid.clone().sub(origin)))
    }
    axisDistance = Math.max(0.02, axisDistance)

    const minorRadius = clamp(
      nearRadius + Math.tan(halfAngleRad) * axisDistance,
      nearRadius,
      feetToWorld(24)
    )
    const incidence = Math.abs(beamDirection.dot(normal))
    const majorRadius = clamp(
      minorRadius / Math.pow(Math.max(0.28, incidence), 0.72),
      minorRadius,
      minorRadius * 3
    )

    let projectionTangent = tangent
    if (majorRadius < minorRadius) {
      projectionTangent = bitangent
    }

    projections.push({
      hit: group.hit,
      center,
      normal,
      tangent: projectionTangent.clone().normalize(),
      majorRadius,
      minorRadius,
    })
  }

  return projections.sort((left, right) => {
    const leftArea = left.majorRadius * left.minorRadius
    const rightArea = right.majorRadius * right.minorRadius
    return rightArea - leftArea
  })
}

function createFixtureVisual(target: PreviewTarget): FixtureVisual {
  const signature = fixtureVisualSignature(target)
  const root = new THREE.Group()
  const emitters: THREE.Mesh[] = []
  const emitterVolumes: THREE.Object3D[] = []
  const emitterSurfaceSplats: THREE.Mesh[][] = []

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: '#111318',
    metalness: 0.22,
    roughness: 0.8,
  })
  const lensMaterial = new THREE.MeshStandardMaterial({
    color: '#222834',
    emissive: '#10141d',
    emissiveIntensity: 0.1,
    metalness: 0.18,
    roughness: 0.62,
  })

  if (target.isMoverModel) {
    const moverScale = clamp(target.modelWidth, 0.4, 1.6)
    const isWashMover = target.modelKind === 'moverWash'
    const mountGroup = new THREE.Group()
    if (target.mountInverted) {
      mountGroup.rotation.z = Math.PI
    }
    root.add(mountGroup)

    const baseRadius = 0.34 * moverScale
    const baseHeight = 0.28 * moverScale
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(baseRadius * 0.68, baseRadius, baseHeight, 24),
      bodyMaterial
    )
    base.position.y = baseHeight * 0.5
    mountGroup.add(base)

    const panPivot = new THREE.Group()
    panPivot.position.y = baseHeight
    mountGroup.add(panPivot)
    const yokeGroup = new THREE.Group()
    panPivot.add(yokeGroup)

    const yokeInnerWidth = 0.32 * moverScale
    const yokeArmThickness = 0.056 * moverScale
    const yokeArmHeight = 0.32 * moverScale
    const yokeDepth = 0.12 * moverScale
    const yokeOuterWidth = yokeInnerWidth + yokeArmThickness * 2

    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(yokeArmThickness, yokeArmHeight, yokeDepth),
      bodyMaterial
    )
    leftArm.position.set(
      -yokeInnerWidth * 0.5 - yokeArmThickness * 0.5,
      yokeArmHeight * 0.5,
      0
    )
    yokeGroup.add(leftArm)

    const rightArm = leftArm.clone()
    rightArm.position.x = yokeInnerWidth * 0.5 + yokeArmThickness * 0.5
    yokeGroup.add(rightArm)

    const bottomBridge = new THREE.Mesh(
      new THREE.BoxGeometry(yokeOuterWidth, yokeArmThickness, yokeDepth),
      bodyMaterial
    )
    bottomBridge.position.y = yokeArmThickness * 0.5
    yokeGroup.add(bottomBridge)

    const headPivot = new THREE.Group()
    headPivot.position.set(0, yokeArmHeight * 0.56, 0)
    yokeGroup.add(headPivot)

    const headWidth = yokeInnerWidth * 0.9
    const headHeight = 0.18 * moverScale
    const headDepth = 0.24 * moverScale
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(headWidth, headHeight, headDepth),
      bodyMaterial
    )
    head.position.z = headDepth * 0.18
    headPivot.add(head)

    let emitterFaceZ = head.position.z + headDepth * 0.5 + 0.008 * moverScale
    if (isWashMover) {
      const capRadius = clamp(Math.min(headWidth, headHeight) * 0.44, 0.03, 0.14)
      const capDepth = 0.03 * moverScale
      const frontCap = new THREE.Mesh(
        new THREE.CylinderGeometry(capRadius, capRadius, capDepth, 20),
        lensMaterial
      )
      frontCap.rotation.x = Math.PI / 2
      frontCap.position.z = head.position.z + headDepth * 0.5 + capDepth * 0.52
      headPivot.add(frontCap)
      emitterFaceZ = frontCap.position.z + capDepth * 0.52
    }

    const beamStartProbe = new THREE.Object3D()
    beamStartProbe.position.set(0, 0, emitterFaceZ)
    headPivot.add(beamStartProbe)
    root.updateMatrixWorld(true)
    const beamStartLocal = root.worldToLocal(
      beamStartProbe.getWorldPosition(new THREE.Vector3())
    )
    headPivot.remove(beamStartProbe)

    for (const emitter of target.emitters) {
      const emitterMesh = createEmitterMesh(emitter.color)
      const emitterVolume = createEmitterVolumeMesh(target.modelKind, emitter.color)
      const splats = Array.from({ length: MAX_SURFACE_SPLATS_PER_EMITTER }, () =>
        createEmitterSurfaceSplatMesh(emitter.color, 28)
      )
      emitterMesh.position.set(emitter.localX, emitter.localY, emitter.localZ)
      emitterVolume.position.copy(emitterMesh.position)
      headPivot.add(emitterVolume)
      headPivot.add(emitterMesh)
      splats.forEach((splat) => root.add(splat))
      emitters.push(emitterMesh)
      emitterVolumes.push(emitterVolume)
      emitterSurfaceSplats.push(splats)
    }

    const goboLabel = createGoboLabelMesh()
    root.add(goboLabel)

    return {
      signature,
      modelKind: target.modelKind,
      root,
      emitters,
      emitterVolumes,
      emitterSurfaceSplats,
      goboLabel,
      panPivot,
      headPivot,
      beamStartLocal,
    }
  }

  if (target.modelKind === 'washBar') {
    const width = clamp(target.modelWidth, 0.45, 8)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.074, 0.061),
      bodyMaterial
    )
    body.position.y = 0.12
    root.add(body)
  } else if (target.modelKind === 'uplight') {
    const size = clamp(target.modelWidth, 0.2, 1.2)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.55, 0.22, 0.3),
      bodyMaterial
    )
    body.position.y = 0.11
    root.add(body)

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.4, 0.08, 0.24),
      bodyMaterial
    )
    top.position.y = 0.26
    root.add(top)
  } else {
    const size = clamp(target.modelWidth, 0.2, 1.4)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.22, size * 0.24, 0.34, 20),
      bodyMaterial
    )
    body.position.y = 0.2
    body.rotation.x = Math.PI / 2
    root.add(body)
  }

  for (const emitter of target.emitters) {
    const emitterMesh = createEmitterMesh(emitter.color)
    const emitterVolume = createEmitterVolumeMesh(target.modelKind, emitter.color)
    const splats = Array.from({ length: MAX_SURFACE_SPLATS_PER_EMITTER }, () =>
      createEmitterSurfaceSplatMesh(emitter.color, 24)
    )
    emitterMesh.position.set(
      emitter.localX,
      nonMoverEmitterBaseY(target.modelKind) + emitter.localY,
      emitter.localZ
    )
    root.add(emitterMesh)
    root.add(emitterVolume)
    splats.forEach((splat) => root.add(splat))
    emitters.push(emitterMesh)
    emitterVolumes.push(emitterVolume)
    emitterSurfaceSplats.push(splats)
  }

  return {
    signature,
    modelKind: target.modelKind,
    root,
    emitters,
    emitterVolumes,
    emitterSurfaceSplats,
  }
}

function disposeVisual(visual: FixtureVisual) {
  visual.root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => {
          const maybeWithMap = material as THREE.Material & {
            map?: THREE.Texture | null
          }
          maybeWithMap.map?.dispose()
          material.dispose()
        })
      } else {
        const maybeWithMap = object.material as THREE.Material & {
          map?: THREE.Texture | null
        }
        maybeWithMap.map?.dispose()
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
  })
}

function createGoboLabelMesh(): THREE.Mesh {
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

function setGoboLabelText(mesh: THREE.Mesh, text: string, color: string) {
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

function Lighting3DViewport({
  fixtures,
  stage,
  showCurtain = true,
  showBoundsOverlay = true,
  environmentFog = 0.65,
  room = {
    enabled: false,
    widthFt: 36,
    depthFt: 28,
    heightFt: 12,
  },
}: Lighting3DViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const fixtureVisualsRef = useRef<Map<string, FixtureVisual>>(new Map())
  const worldFloorRef = useRef<THREE.Mesh | null>(null)
  const danceFloorRef = useRef<THREE.Mesh | null>(null)
  const danceGridRef = useRef<THREE.GridHelper | null>(null)
  const boundsOverlayRef = useRef<THREE.LineSegments | null>(null)
  const stageWallRef = useRef<THREE.Mesh | null>(null)
  const roomLeftWallRef = useRef<THREE.Mesh | null>(null)
  const roomRightWallRef = useRef<THREE.Mesh | null>(null)
  const roomBackWallRef = useRef<THREE.Mesh | null>(null)
  const roomFrontWallRef = useRef<THREE.Mesh | null>(null)
  const roomCeilingRef = useRef<THREE.Mesh | null>(null)
  const roomBoundsRef = useRef<{
    minX: number
    maxX: number
    minY: number
    maxY: number
    minZ: number
    maxZ: number
  }>({
    minX: -1,
    maxX: 1,
    minY: 0,
    maxY: 2,
    minZ: -1,
    maxZ: 1,
  })
  const keyStateRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
  })
  const roomEnabledRef = useRef(room.enabled)
  const centerMarkerRef = useRef<THREE.Mesh | null>(null)
  const cameraPersistElapsedRef = useRef(0)
  const cameraPersistCacheRef = useRef<string>('')
  const compassXLineRef = useRef<SVGLineElement | null>(null)
  const compassYLineRef = useRef<SVGLineElement | null>(null)
  const compassZLineRef = useRef<SVGLineElement | null>(null)
  const compassXLabelRef = useRef<SVGTextElement | null>(null)
  const compassYLabelRef = useRef<SVGTextElement | null>(null)
  const compassZLabelRef = useRef<SVGTextElement | null>(null)
  const surfaceSpecRef = useRef<SurfaceSpec>({
    floorY: DANCE_FLOOR_Y,
    floorMinX: -1,
    floorMaxX: 1,
    floorMinZ: -1,
    floorMaxZ: 1,
    includeCurtain: true,
    curtainZ: -1,
    curtainMinX: -1,
    curtainMaxX: 1,
    curtainMinY: 0,
    curtainMaxY: ROOM_HEIGHT,
    includeRoom: false,
    roomMinX: -1,
    roomMaxX: 1,
    roomMinY: 0,
    roomMaxY: ROOM_HEIGHT,
    roomMinZ: -1,
    roomMaxZ: 1,
  })

  const activeLightScene = useControlSelector(
    (control) => control.light.byId[control.light.active]
  )
  const splitOutputParams = useRealtimeSelector(
    (state) => state.splitStates[0]?.outputParams
  )
  const dmxOutByUniverse = useRealtimeSelector((state) => state.dmxOutByUniverse)

  const previewParams =
    splitOutputParams ?? activeLightScene?.splitScenes[0]?.baseParams ?? ({} as Params)

  const floorSpec = useMemo(() => computeFloorSpecFromStage(stage), [stage])
  const stageHeight = useMemo(() => stageHeightFromStage(stage), [stage])

  const previewTargets = useMemo(() => {
    return buildTargets(
      fixtures,
      previewParams,
      dmxOutByUniverse,
      floorSpec,
      stageHeight
    )
  }, [fixtures, previewParams, dmxOutByUniverse, floorSpec, stageHeight])

  useEffect(() => {
    roomEnabledRef.current = room.enabled
  }, [room.enabled])

  const persistCamera = useCallback(
    (camera: THREE.PerspectiveCamera, controls: OrbitControls) => {
      const state: PersistedCameraState = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      }
      const serialized = JSON.stringify(state)
      if (cameraPersistCacheRef.current !== serialized) {
        cameraPersistCacheRef.current = serialized
        writePersistedCameraState(state)
      }
    },
    []
  )

  const updateCompassHud = useCallback((camera: THREE.PerspectiveCamera) => {
    const xLine = compassXLineRef.current
    const yLine = compassYLineRef.current
    const zLine = compassZLineRef.current
    const xLabel = compassXLabelRef.current
    const yLabel = compassYLabelRef.current
    const zLabel = compassZLabelRef.current
    if (
      xLine === null ||
      yLine === null ||
      zLine === null ||
      xLabel === null ||
      yLabel === null ||
      zLabel === null
    ) {
      return
    }

    const center = 36
    const axisLength = 21
    const invCameraQuat = camera.quaternion.clone().invert()

    const setAxis = (
      axis: THREE.Vector3,
      line: SVGLineElement,
      label: SVGTextElement,
      labelX: string
    ) => {
      const viewVector = axis.applyQuaternion(invCameraQuat).normalize()
      const endX = center + viewVector.x * axisLength
      const endY = center - viewVector.y * axisLength
      const opacity = clamp(0.35 + (viewVector.z + 1) * 0.325, 0.35, 1)
      line.setAttribute('x1', center.toFixed(2))
      line.setAttribute('y1', center.toFixed(2))
      line.setAttribute('x2', endX.toFixed(2))
      line.setAttribute('y2', endY.toFixed(2))
      line.setAttribute('opacity', opacity.toFixed(3))

      const labelOffset = 4.2
      const labelXPos = endX + viewVector.x * labelOffset
      const labelYPos = endY - viewVector.y * labelOffset
      label.setAttribute('x', labelXPos.toFixed(2))
      label.setAttribute('y', labelYPos.toFixed(2))
      label.setAttribute('opacity', opacity.toFixed(3))
      label.textContent = labelX
    }

    setAxis(new THREE.Vector3(1, 0, 0), xLine, xLabel, 'X')
    setAxis(new THREE.Vector3(0, 1, 0), yLine, yLabel, 'Y')
    setAxis(new THREE.Vector3(0, 0, 1), zLine, zLabel, 'Z')
  }, [])

  const resetView = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (camera === null || controls === null) {
      return
    }

    camera.position.set(
      DEFAULT_CAMERA_POSITION[0],
      DEFAULT_CAMERA_POSITION[1],
      DEFAULT_CAMERA_POSITION[2]
    )
    controls.target.set(
      DEFAULT_CAMERA_TARGET[0],
      DEFAULT_CAMERA_TARGET[1],
      DEFAULT_CAMERA_TARGET[2]
    )
    controls.update()
    persistCamera(camera, controls)
  }, [persistCamera])

  useEffect(() => {
    const mount = mountRef.current
    if (mount === null) return

    const persistedCamera = readPersistedCameraState()
    const initialCameraPosition = persistedCamera?.position ?? DEFAULT_CAMERA_POSITION
    const initialCameraTarget = persistedCamera?.target ?? DEFAULT_CAMERA_TARGET

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f1014')
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.set(
      initialCameraPosition[0],
      initialCameraPosition[1],
      initialCameraPosition[2]
    )
    camera.lookAt(
      initialCameraTarget[0],
      initialCameraTarget[1],
      initialCameraTarget[2]
    )
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.localClippingEnabled = true
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableRotate = true
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    }
    controls.target.set(
      initialCameraTarget[0],
      initialCameraTarget[1],
      initialCameraTarget[2]
    )
    controls.update()
    controlsRef.current = controls

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }
    renderer.domElement.addEventListener('contextmenu', blockContextMenu)

    const keyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement | null)?.isContentEditable
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'w') keyStateRef.current.w = true
      if (key === 'a') keyStateRef.current.a = true
      if (key === 's') keyStateRef.current.s = true
      if (key === 'd') keyStateRef.current.d = true
      if (key === 'shift') keyStateRef.current.shift = true
    }
    const keyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'w') keyStateRef.current.w = false
      if (key === 'a') keyStateRef.current.a = false
      if (key === 's') keyStateRef.current.s = false
      if (key === 'd') keyStateRef.current.d = false
      if (key === 'shift') keyStateRef.current.shift = false
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)

    const ambient = new THREE.AmbientLight('#ffffff', 0.55)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight('#d7e2ff', 0.9)
    keyLight.position.set(6, 10, 4)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight('#95b5ff', 0.35)
    fillLight.position.set(-6, 5, -7)
    scene.add(fillLight)

    const worldFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        color: '#7a7f86',
        roughness: 0.93,
        metalness: 0.01,
        side: THREE.DoubleSide,
      })
    )
    worldFloor.rotation.x = -Math.PI / 2
    worldFloor.position.y = DANCE_FLOOR_Y
    scene.add(worldFloor)
    worldFloorRef.current = worldFloor

    const danceFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        color: '#1f2634',
        roughness: 0.85,
        metalness: 0.07,
      })
    )
    danceFloor.rotation.x = -Math.PI / 2
    scene.add(danceFloor)
    danceFloorRef.current = danceFloor

    const danceGrid = new THREE.GridHelper(1, 12, '#4d5e80', '#34415a')
    scene.add(danceGrid)
    danceGridRef.current = danceGrid

    const boundsOverlay = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)),
      new THREE.LineBasicMaterial({
        color: '#7f95bd',
        transparent: true,
        opacity: 0.8,
      })
    )
    boundsOverlay.rotation.x = -Math.PI / 2
    boundsOverlay.position.y = DANCE_FLOOR_Y + 0.003
    scene.add(boundsOverlay)
    boundsOverlayRef.current = boundsOverlay

    const stageWall = new THREE.Mesh(
      createPleatedCurtainGeometry(),
      new THREE.MeshStandardMaterial({
        color: '#6f2032',
        roughness: 0.96,
        metalness: 0.01,
        side: THREE.DoubleSide,
      })
    )
    scene.add(stageWall)
    stageWallRef.current = stageWall

    const roomWallMaterial = new THREE.MeshStandardMaterial({
      color: '#7a7f86',
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.38,
    })
    const roomCeilingMaterial = roomWallMaterial.clone()
    roomCeilingMaterial.opacity = 0.32

    const roomLeftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      roomWallMaterial.clone()
    )
    const roomRightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      roomWallMaterial.clone()
    )
    const roomBackWall = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      roomWallMaterial.clone()
    )
    const roomFrontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      roomWallMaterial.clone()
    )
    const roomCeiling = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      roomCeilingMaterial
    )
    scene.add(roomLeftWall)
    scene.add(roomRightWall)
    scene.add(roomBackWall)
    scene.add(roomFrontWall)
    scene.add(roomCeiling)
    roomLeftWallRef.current = roomLeftWall
    roomRightWallRef.current = roomRightWall
    roomBackWallRef.current = roomBackWall
    roomFrontWallRef.current = roomFrontWall
    roomCeilingRef.current = roomCeiling

    const centerMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.24, 24),
      new THREE.MeshBasicMaterial({ color: '#9ba7c7', side: THREE.DoubleSide })
    )
    centerMarker.rotation.x = -Math.PI / 2
    scene.add(centerMarker)
    centerMarkerRef.current = centerMarker

    const resize = () => {
      if (mount.clientWidth <= 0 || mount.clientHeight <= 0) {
        return
      }

      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    const clock = new THREE.Clock()
    let cancelled = false
    const frame = () => {
      if (cancelled) return
      const delta = Math.min(0.05, clock.getDelta())

      const cameraToTarget = new THREE.Vector3().subVectors(
        controls.target,
        camera.position
      )
      cameraToTarget.y = 0
      if (cameraToTarget.lengthSq() < 0.000001) {
        cameraToTarget.set(0, 0, -1)
      } else {
        cameraToTarget.normalize()
      }
      const right = new THREE.Vector3()
        .crossVectors(cameraToTarget, new THREE.Vector3(0, 1, 0))
        .normalize()

      const keys = keyStateRef.current
      const moveSpeed = (keys.shift ? 5.6 : 3.2) * delta
      const forwardFactor = (keys.w ? 1 : 0) - (keys.s ? 1 : 0)
      const strafeFactor = (keys.d ? 1 : 0) - (keys.a ? 1 : 0)
      if (forwardFactor !== 0 || strafeFactor !== 0) {
        const move = new THREE.Vector3()
          .addScaledVector(cameraToTarget, forwardFactor * moveSpeed)
          .addScaledVector(right, strafeFactor * moveSpeed)
        camera.position.add(move)
        controls.target.add(move)
      }

      const leftWall = roomLeftWallRef.current
      const rightWall = roomRightWallRef.current
      const backWall = roomBackWallRef.current
      const frontWall = roomFrontWallRef.current
      const ceiling = roomCeilingRef.current
      if (leftWall && rightWall && backWall && frontWall && ceiling) {
        if (!roomEnabledRef.current) {
          leftWall.visible = false
          rightWall.visible = false
          backWall.visible = false
          frontWall.visible = false
          ceiling.visible = false
        } else {
          const bounds = roomBoundsRef.current
          const cameraPosition = camera.position
          const eps = 0.03
          const outsideLeft = cameraPosition.x < bounds.minX - eps
          const outsideRight = cameraPosition.x > bounds.maxX + eps
          const outsideBack = cameraPosition.z < bounds.minZ - eps
          const outsideFront = cameraPosition.z > bounds.maxZ + eps
          const outsideAbove = cameraPosition.y > bounds.maxY + eps
          const outside =
            outsideLeft || outsideRight || outsideBack || outsideFront || outsideAbove

          leftWall.visible = !outsideLeft
          rightWall.visible = !outsideRight
          backWall.visible = !outsideBack
          frontWall.visible = !outsideFront
          ceiling.visible = !outsideAbove

          if (!outside) {
            leftWall.visible = true
            rightWall.visible = true
            backWall.visible = true
            frontWall.visible = true
            ceiling.visible = true
          }
        }
      }

      controls.update()
      updateCompassHud(camera)
      cameraPersistElapsedRef.current += delta
      if (cameraPersistElapsedRef.current >= 0.35) {
        cameraPersistElapsedRef.current = 0
        persistCamera(camera, controls)
      }
      renderer.render(scene, camera)
      requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelled = true
      resizeObserver.disconnect()

      fixtureVisualsRef.current.forEach((visual) => {
        scene.remove(visual.root)
        disposeVisual(visual)
      })
      fixtureVisualsRef.current.clear()

      renderer.domElement.removeEventListener('contextmenu', blockContextMenu)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      controls.dispose()

      renderer.dispose()
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement)
      }
      persistCamera(camera, controls)

      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
      worldFloorRef.current = null
      danceFloorRef.current = null
      danceGridRef.current = null
      boundsOverlayRef.current = null
      stageWallRef.current = null
      roomLeftWallRef.current = null
      roomRightWallRef.current = null
      roomBackWallRef.current = null
      roomFrontWallRef.current = null
      roomCeilingRef.current = null
      centerMarkerRef.current = null
    }
  }, [persistCamera, updateCompassHud])

  useEffect(() => {
    const worldFloor = worldFloorRef.current
    const danceFloor = danceFloorRef.current
    const danceGrid = danceGridRef.current
    const boundsOverlay = boundsOverlayRef.current
    const stageWall = stageWallRef.current
    const roomLeftWall = roomLeftWallRef.current
    const roomRightWall = roomRightWallRef.current
    const roomBackWall = roomBackWallRef.current
    const roomFrontWall = roomFrontWallRef.current
    const roomCeiling = roomCeilingRef.current
    const centerMarker = centerMarkerRef.current

    if (
      worldFloor === null ||
      danceFloor === null ||
      danceGrid === null ||
      boundsOverlay === null ||
      stageWall === null ||
      roomLeftWall === null ||
      roomRightWall === null ||
      roomBackWall === null ||
      roomFrontWall === null ||
      roomCeiling === null ||
      centerMarker === null
    ) {
      return
    }

    const stageWidth = floorSpec.width
    const floorTopEdgeZ = floorSpec.centerZ - floorSpec.depth / 2

    const roomWidth = Math.max(2, feetToWorld(Math.max(5, room.widthFt)))
    const roomDepth = Math.max(2, feetToWorld(Math.max(5, room.depthFt)))
    const roomHeight = Math.max(1.2, feetToWorld(Math.max(5, room.heightFt)))
    const roomCenterX = floorSpec.centerX
    const roomCenterZ = floorSpec.centerZ
    const roomMinX = roomCenterX - roomWidth * 0.5
    const roomMaxX = roomCenterX + roomWidth * 0.5
    const roomMinZ = roomCenterZ - roomDepth * 0.5
    const roomMaxZ = roomCenterZ + roomDepth * 0.5
    const roomMinY = DANCE_FLOOR_Y
    const roomMaxY = roomHeight + DANCE_FLOOR_Y

    const fallbackFloorWidth = Math.max(
      floorSpec.width * 2.9,
      feetToWorld(FALLBACK_WORLD_FLOOR_SIZE)
    )
    const fallbackFloorDepth = Math.max(
      floorSpec.depth * 2.9,
      feetToWorld(FALLBACK_WORLD_FLOOR_SIZE)
    )
    const surfaceFloorWidth = room.enabled ? roomWidth : fallbackFloorWidth
    const surfaceFloorDepth = room.enabled ? roomDepth : fallbackFloorDepth
    const surfaceFloorMinX = floorSpec.centerX - surfaceFloorWidth * 0.5
    const surfaceFloorMaxX = floorSpec.centerX + surfaceFloorWidth * 0.5
    const surfaceFloorMinZ = floorSpec.centerZ - surfaceFloorDepth * 0.5
    const surfaceFloorMaxZ = floorSpec.centerZ + surfaceFloorDepth * 0.5

    worldFloor.scale.set(surfaceFloorWidth, surfaceFloorDepth, 1)
    worldFloor.position.set(floorSpec.centerX, DANCE_FLOOR_Y, floorSpec.centerZ)

    danceFloor.scale.set(floorSpec.width, floorSpec.depth, 1)
    danceFloor.position.set(floorSpec.centerX, DANCE_FLOOR_Y + 0.0016, floorSpec.centerZ)
    danceFloor.visible = !room.enabled

    danceGrid.scale.set(floorSpec.width, 1, floorSpec.depth)
    danceGrid.position.set(floorSpec.centerX, DANCE_FLOOR_Y + 0.0021, floorSpec.centerZ)
    danceGrid.visible = showBoundsOverlay
    centerMarker.visible = showBoundsOverlay

    boundsOverlay.scale.set(floorSpec.width, floorSpec.depth, 1)
    boundsOverlay.position.set(
      floorSpec.centerX,
      DANCE_FLOOR_Y + 0.003,
      floorSpec.centerZ
    )
    boundsOverlay.visible = showBoundsOverlay

    const curtainZ = floorTopEdgeZ - feetToWorld(1)
    stageWall.scale.set(stageWidth * 1.08, stageHeight * 1.02, 1)
    stageWall.position.set(floorSpec.centerX, stageHeight * 0.5, curtainZ)
    stageWall.visible = showCurtain

    roomLeftWall.scale.set(roomDepth, roomHeight, 1)
    roomLeftWall.position.set(roomMinX, DANCE_FLOOR_Y + roomHeight * 0.5, roomCenterZ)
    roomLeftWall.rotation.set(0, Math.PI / 2, 0)
    roomRightWall.scale.set(roomDepth, roomHeight, 1)
    roomRightWall.position.set(roomMaxX, DANCE_FLOOR_Y + roomHeight * 0.5, roomCenterZ)
    roomRightWall.rotation.set(0, -Math.PI / 2, 0)
    roomBackWall.scale.set(roomWidth, roomHeight, 1)
    roomBackWall.position.set(roomCenterX, DANCE_FLOOR_Y + roomHeight * 0.5, roomMinZ)
    roomBackWall.rotation.set(0, 0, 0)
    roomFrontWall.scale.set(roomWidth, roomHeight, 1)
    roomFrontWall.position.set(roomCenterX, DANCE_FLOOR_Y + roomHeight * 0.5, roomMaxZ)
    roomFrontWall.rotation.set(0, Math.PI, 0)
    roomCeiling.scale.set(roomWidth, roomDepth, 1)
    roomCeiling.position.set(roomCenterX, roomMaxY, roomCenterZ)
    roomCeiling.rotation.set(Math.PI / 2, 0, 0)

    roomBoundsRef.current = {
      minX: roomMinX,
      maxX: roomMaxX,
      minY: roomMinY,
      maxY: roomMaxY,
      minZ: roomMinZ,
      maxZ: roomMaxZ,
    }

    centerMarker.position.set(floorSpec.centerX, 0.003, floorSpec.centerZ)

    surfaceSpecRef.current = {
      floorY: DANCE_FLOOR_Y,
      floorMinX: surfaceFloorMinX,
      floorMaxX: surfaceFloorMaxX,
      floorMinZ: surfaceFloorMinZ,
      floorMaxZ: surfaceFloorMaxZ,
      includeCurtain: showCurtain,
      curtainZ,
      curtainMinX: floorSpec.centerX - (stageWidth * 1.08) * 0.5,
      curtainMaxX: floorSpec.centerX + (stageWidth * 1.08) * 0.5,
      curtainMinY: 0,
      curtainMaxY: stageHeight * 1.02,
      includeRoom: room.enabled,
      roomMinX,
      roomMaxX,
      roomMinY,
      roomMaxY,
      roomMinZ,
      roomMaxZ,
    }
  }, [floorSpec, stageHeight, showCurtain, showBoundsOverlay, room])

  useEffect(() => {
    const scene = sceneRef.current
    if (scene === null) return

    const visuals = fixtureVisualsRef.current
    const fogFactor = clamp01(environmentFog)
    const targetIds = new Set(previewTargets.map((target) => target.fixtureId))

    for (const [fixtureId, visual] of visuals.entries()) {
      if (!targetIds.has(fixtureId)) {
        scene.remove(visual.root)
        disposeVisual(visual)
        visuals.delete(fixtureId)
      }
    }

    for (const target of previewTargets) {
      let visual = visuals.get(target.fixtureId)
      const needsRecreate =
        visual === undefined || visual.signature !== fixtureVisualSignature(target)

      if (needsRecreate && visual !== undefined) {
        scene.remove(visual.root)
        disposeVisual(visual)
        visuals.delete(target.fixtureId)
        visual = undefined
      }

      if (visual === undefined) {
        visual = createFixtureVisual(target)
        visuals.set(target.fixtureId, visual)
        scene.add(visual.root)
      }
      if (visual === undefined) {
        continue
      }
      const fixtureVisual = visual

      fixtureVisual.root.position.set(target.fixtureX, target.fixtureY, target.fixtureZ)
      fixtureVisual.root.rotation.set(
        THREE.MathUtils.degToRad(target.rotation.x),
        THREE.MathUtils.degToRad(target.rotation.y),
        THREE.MathUtils.degToRad(target.rotation.z)
      )

      if (
        fixtureVisual.panPivot &&
        fixtureVisual.headPivot &&
        fixtureVisual.beamStartLocal
      ) {
        const targetWorldPosition = new THREE.Vector3(
          target.targetX,
          target.targetY,
          target.targetZ
        )

        let normalizedGuide = new THREE.Vector3(0, -1, 0)
        if (
          target.aimYawDeg !== undefined &&
          target.aimPitchDeg !== undefined &&
          Number.isFinite(target.aimYawDeg) &&
          Number.isFinite(target.aimPitchDeg)
        ) {
          const worldDirection = directionFromYawPitch(
            target.aimYawDeg,
            target.aimPitchDeg
          )
          const panParent = fixtureVisual.panPivot.parent
          if (panParent !== null) {
            const parentWorldQuat = panParent.getWorldQuaternion(new THREE.Quaternion())
            normalizedGuide = worldDirection
              .clone()
              .applyQuaternion(parentWorldQuat.clone().invert())
              .normalize()
          } else {
            const rootInverse = fixtureVisual.root.quaternion.clone().invert()
            normalizedGuide = worldDirection.applyQuaternion(rootInverse).normalize()
          }
        } else {
          const localTarget = fixtureVisual.root.worldToLocal(targetWorldPosition.clone())
          const guideBeamVector = localTarget.clone().sub(fixtureVisual.beamStartLocal)
          const guideLength = guideBeamVector.length()
          normalizedGuide =
            guideLength > 0.0001
              ? guideBeamVector.clone().divideScalar(guideLength)
              : new THREE.Vector3(0, -1, 0)
        }

        const yaw = Math.atan2(normalizedGuide.x, normalizedGuide.z)
        const planarLength = Math.hypot(normalizedGuide.x, normalizedGuide.z)
        const pitch = Math.atan2(
          normalizedGuide.y,
          Math.max(0.0001, planarLength)
        )
        fixtureVisual.panPivot.rotation.y = yaw
        fixtureVisual.headPivot.rotation.x = -pitch
      }

      const rootWorldQuat = fixtureVisual.root.getWorldQuaternion(new THREE.Quaternion())
      const rootInverseQuat = rootWorldQuat.clone().invert()
      const primaryMoverSpot = {
        hit: undefined as SurfaceHit | undefined,
        intensity: 0,
        radius: 0,
      }
      fixtureVisual.root.updateWorldMatrix(true, true)

      target.emitters.forEach((emitterTarget, emitterIndex) => {
        const emitterMesh = fixtureVisual.emitters[emitterIndex]
        const emitterVolume = fixtureVisual.emitterVolumes[emitterIndex]
        const emitterSplats = fixtureVisual.emitterSurfaceSplats[emitterIndex] ?? []
        if (emitterMesh === undefined || emitterVolume === undefined) {
          return
        }
        emitterSplats.forEach((splat) => {
          splat.visible = false
          const splatMaterial = splat.material as THREE.MeshBasicMaterial
          splatMaterial.clippingPlanes = []
        })

        const isMoverEmitter = target.isMoverModel
        const emitterX = emitterTarget.localX
        const emitterY = isMoverEmitter
          ? emitterTarget.localY
          : nonMoverEmitterBaseY(target.modelKind) + emitterTarget.localY
        const emitterAttachOffset = 0.0025
        const emitterZ =
          target.modelKind === 'uplight'
            ? emitterTarget.localZ
            : emitterTarget.localZ + emitterAttachOffset

        emitterMesh.position.set(
          emitterX,
          target.modelKind === 'uplight' ? emitterY + emitterAttachOffset : emitterY,
          emitterZ
        )

        const material = emitterMesh.material as THREE.MeshStandardMaterial
        material.color.copy(emitterTarget.color)
        material.emissive.copy(emitterTarget.color)
        const emitterIntensity = clamp01(emitterTarget.intensity)
        material.emissiveIntensity = 1.3 + emitterIntensity * 6.4

        emitterVolume.position.copy(emitterMesh.position)
        emitterVolume.rotation.set(target.modelKind === 'uplight' ? -Math.PI / 2 : 0, 0, 0)

        const emitterVolumeQuat = emitterVolume.getWorldQuaternion(new THREE.Quaternion())
        const defaultBeamDirection = new THREE.Vector3(0, 0, 1)
          .applyQuaternion(emitterVolumeQuat)
          .normalize()
        // Use the emitter's resolved world orientation so beam output matches
        // the rendered mover model for both upright and inverted mounts.
        const beamDirection = defaultBeamDirection.clone()

        const emitterParent = emitterVolume.parent
        if (emitterParent !== null && beamDirection.lengthSq() > 0.000001) {
          const parentWorldQuat = emitterParent.getWorldQuaternion(new THREE.Quaternion())
          const localBeamDirection = beamDirection
            .clone()
            .applyQuaternion(parentWorldQuat.clone().invert())
            .normalize()

          emitterVolume.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            localBeamDirection
          )
          emitterMesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            localBeamDirection
          )
        } else {
          emitterMesh.rotation.set(target.modelKind === 'uplight' ? 0 : Math.PI / 2, 0, 0)
        }

        const emitterWorld = emitterMesh.getWorldPosition(new THREE.Vector3())
        const hit = nearestSurfaceHit(emitterWorld, beamDirection, surfaceSpecRef.current)
        const focusScale = focusWidthScale(target.focusNorm)
        const hitDistance =
          hit !== undefined
            ? Math.max(0.02, hit.distance)
            : feetToWorld(FALLBACK_BEAM_REACH_FT)
        // Keep volumetric cones extended and rely on clipping planes to mask
        // anything outside room/wall bounds. This keeps cone/splat alignment
        // stable when crossing edges.
        const coneLength = Math.max(hitDistance, feetToWorld(FALLBACK_BEAM_REACH_FT))
        const moverSpotBaseAngle = target.hasFocusChannel
          ? defaultMoverBeamAngleForModelKind('moverSpot')
          : target.moverBeamAngleDeg
        const moverWashBaseAngle = target.hasFocusChannel
          ? defaultMoverBeamAngleForModelKind('moverWash')
          : target.moverBeamAngleDeg
        let halfAngleDeg =
          target.modelKind === 'moverSpot'
            ? clamp(moverSpotBaseAngle * focusScale, 2.5, 20)
            : target.modelKind === 'parCan'
            ? clamp(10 * focusScale, 2.5, 20)
            : target.modelKind === 'moverWash'
            ? moverWashBaseAngle * focusScale
            : target.modelKind === 'washBar'
            ? 26
            : target.modelKind === 'uplight'
            ? 24
            : 16
        if (isCloudModelKind(target.modelKind)) {
          halfAngleDeg = Math.min(25, halfAngleDeg)
        }
        const halfAngleRad = THREE.MathUtils.degToRad(halfAngleDeg)
        const divergence = Math.tan(halfAngleRad)
        const projectedRadius = clamp(
          EMITTER_DISK_RADIUS + divergence * coneLength,
          EMITTER_DISK_RADIUS,
          feetToWorld(24)
        )

        let boundarySamples: BeamBoundarySample[] | undefined

        if (
          emitterVolume instanceof THREE.Group &&
          emitterVolume.userData.volumeKind === 'softCone'
        ) {
          emitterVolume.updateWorldMatrix(true, false)
          boundarySamples = sampleBeamBoundary(
            emitterWorld,
            beamDirection,
            halfAngleRad,
            SHARP_CONE_SAMPLE_ANGLES,
            surfaceSpecRef.current,
            coneLength,
            EMITTER_DISK_RADIUS
          )
          const farRingLocalBase = SHARP_CONE_SAMPLE_ANGLES.map((angle) => {
            return new THREE.Vector3(
              Math.cos(angle) * projectedRadius,
              Math.sin(angle) * projectedRadius,
              coneLength
            )
          })
          const washAlpha = clamp(Math.pow(emitterIntensity, 2.35), 0, 1) * fogFactor
          emitterVolume.children.forEach((child) => {
            if (!(child instanceof THREE.Mesh)) {
              return
            }
            const childMaterial = child.material as THREE.MeshBasicMaterial
            childMaterial.color.copy(emitterTarget.color)
            const baseOpacity = Number(child.userData.baseOpacity ?? 0.1)
            childMaterial.opacity = baseOpacity * washAlpha
            childMaterial.clippingPlanes = clippingPlanesForCone(surfaceSpecRef.current)
            const radiusScale = Number(child.userData.radiusScale ?? 1)
            const scaledFarRing = farRingLocalBase.map((point) => {
              return new THREE.Vector3(
                point.x * radiusScale,
                point.y * radiusScale,
                point.z
              )
            })
            setSharpConeGeometryFromPoints(
              child.geometry,
              EMITTER_DISK_RADIUS * radiusScale,
              scaledFarRing
            )
          })
          emitterVolume.scale.set(1, 1, 1)
        } else if (
          emitterVolume instanceof THREE.Mesh &&
          emitterVolume.userData.volumeKind === 'sharpCone'
        ) {
          const coneMaterial = emitterVolume.material as THREE.MeshBasicMaterial
          coneMaterial.color.copy(emitterTarget.color)
          coneMaterial.opacity =
            clamp(Math.pow(emitterIntensity, 1.7), 0, 0.92) * fogFactor
          coneMaterial.clippingPlanes = clippingPlanesForCone(surfaceSpecRef.current)

          boundarySamples = sampleBeamBoundary(
            emitterWorld,
            beamDirection,
            halfAngleRad,
            SHARP_CONE_SAMPLE_ANGLES,
            surfaceSpecRef.current,
            coneLength,
            EMITTER_DISK_RADIUS
          )
          const farRingLocal = SHARP_CONE_SAMPLE_ANGLES.map((angle) => {
            return new THREE.Vector3(
              Math.cos(angle) * projectedRadius,
              Math.sin(angle) * projectedRadius,
              coneLength
            )
          })
          setSharpConeGeometryFromPoints(
            emitterVolume.geometry,
            EMITTER_DISK_RADIUS,
            farRingLocal
          )
          emitterVolume.scale.set(1, 1, 1)
        } else if (emitterVolume instanceof THREE.Mesh) {
          const coneMaterial = emitterVolume.material as THREE.MeshBasicMaterial
          coneMaterial.color.copy(emitterTarget.color)
          coneMaterial.opacity =
            clamp(Math.pow(emitterIntensity, 1.7), 0, 0.92) * fogFactor
          const coneScale = projectedRadius / 0.16
          emitterVolume.scale.set(coneScale, coneScale, coneLength)
        }

        const splatProjections = buildSurfaceSplatProjections(
          emitterWorld,
          hit,
          boundarySamples,
          beamDirection,
          halfAngleRad,
          EMITTER_DISK_RADIUS,
          !isCloudModelKind(target.modelKind),
          surfaceSpecRef.current
        )

        if (
          target.modelKind === 'moverSpot' &&
          emitterIndex === 0 &&
          splatProjections.length > 0 &&
          emitterIntensity > primaryMoverSpot.intensity
        ) {
          const centerSurfaceProjection =
            hit !== undefined
              ? splatProjections.find((projection) => isSameSurface(hit, projection.hit))
              : undefined
          const primaryProjection = centerSurfaceProjection ?? splatProjections[0]
          primaryMoverSpot.intensity = emitterIntensity
          primaryMoverSpot.hit = primaryProjection.hit
          primaryMoverSpot.radius = Math.max(
            primaryProjection.majorRadius,
            primaryProjection.minorRadius
          )
        }

        if (emitterSplats.length === 0 || emitterIntensity <= 0.001) {
          return
        }

        const visibleProjectionCount = Math.min(
          emitterSplats.length,
          splatProjections.length
        )
        if (visibleProjectionCount <= 0) {
          return
        }

        for (
          let projectionIndex = 0;
          projectionIndex < visibleProjectionCount;
          projectionIndex++
        ) {
          const emitterSplat = emitterSplats[projectionIndex]
          const projection = splatProjections[projectionIndex]
          if (emitterSplat === undefined || projection === undefined) {
            continue
          }

          const splatMaterial = emitterSplat.material as THREE.MeshBasicMaterial
          splatMaterial.color.copy(emitterTarget.color)
          splatMaterial.clippingPlanes = clippingPlanesForSurface(
            projection.hit,
            surfaceSpecRef.current
          )
          const localCenter = fixtureVisual.root.worldToLocal(
            projection.center.clone().addScaledVector(projection.normal, 0.006)
          )
          emitterSplat.position.copy(localCenter)
          const localNormal = projection.normal
            .clone()
            .applyQuaternion(rootInverseQuat)
            .normalize()
          const localTangent = projection.tangent
            .clone()
            .applyQuaternion(rootInverseQuat)
            .normalize()
          const localBitangent = new THREE.Vector3()
            .crossVectors(localNormal, localTangent)
            .normalize()
          const correctedLocalTangent = new THREE.Vector3()
            .crossVectors(localBitangent, localNormal)
            .normalize()
          const splatBasis = new THREE.Matrix4().makeBasis(
            correctedLocalTangent,
            localBitangent,
            localNormal
          )
          emitterSplat.quaternion.setFromRotationMatrix(splatBasis)
          emitterSplat.scale.set(projection.majorRadius, projection.minorRadius, 1)
          splatMaterial.opacity =
            target.modelKind === 'moverSpot'
              ? 0.2 + emitterIntensity * 0.35
              : 0.08 + emitterIntensity * 0.2
          emitterSplat.visible = true
        }

      })

      if (fixtureVisual.goboLabel) {
          if (
            target.modelKind === 'moverSpot' &&
            primaryMoverSpot.hit !== undefined &&
            target.goboIndex !== undefined &&
            primaryMoverSpot.intensity > 0.001
          ) {
            const label = `${target.goboIndex}`
            if (fixtureVisual.goboLabel.userData.label !== label) {
              setGoboLabelText(fixtureVisual.goboLabel, label, '#f7fbff')
              fixtureVisual.goboLabel.userData.label = label
            }
          const localPoint = fixtureVisual.root.worldToLocal(
            primaryMoverSpot.hit.point
              .clone()
              .addScaledVector(primaryMoverSpot.hit.normal, 0.006)
          )
          fixtureVisual.goboLabel.position.copy(localPoint)
          const localNormal = primaryMoverSpot.hit.normal
            .clone()
            .applyQuaternion(rootInverseQuat)
            .normalize()
          fixtureVisual.goboLabel.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            localNormal
          )
          const labelSize = clamp(primaryMoverSpot.radius * 0.85, 0.12, 1.6)
          fixtureVisual.goboLabel.scale.set(labelSize, labelSize, 1)
          fixtureVisual.goboLabel.visible = true
        } else {
          fixtureVisual.goboLabel.visible = false
        }
      }
    }
  }, [previewTargets, environmentFog])

  return (
    <Root>
      <Hint>
        Mouse: left pan, right orbit, wheel zoom. Keyboard: `W/A/S/D` to walk and
        hold `Shift` for faster movement.
      </Hint>
      <CanvasShell>
        <HomeButton
          type="button"
          title="Reset camera to default view"
          onClick={resetView}
        >
          Home
        </HomeButton>
        <CompassHud aria-hidden>
          <svg viewBox="0 0 72 72">
            <line
              ref={compassXLineRef}
              x1="36"
              y1="36"
              x2="56"
              y2="36"
              stroke="#ff6363"
              strokeWidth="3.5"
            />
            <line
              ref={compassYLineRef}
              x1="36"
              y1="36"
              x2="36"
              y2="16"
              stroke="#73ed95"
              strokeWidth="3.5"
            />
            <line
              ref={compassZLineRef}
              x1="36"
              y1="36"
              x2="50"
              y2="22"
              stroke="#6aaeff"
              strokeWidth="3.5"
            />
            <text
              ref={compassXLabelRef}
              x="58"
              y="38"
              fill="#ff8f8f"
              fontSize="11"
              fontWeight="700"
            >
              X
            </text>
            <text
              ref={compassYLabelRef}
              x="34"
              y="14"
              fill="#8ff7af"
              fontSize="11"
              fontWeight="700"
            >
              Y
            </text>
            <text
              ref={compassZLabelRef}
              x="52"
              y="22"
              fill="#8ec8ff"
              fontSize="11"
              fontWeight="700"
            >
              Z
            </text>
          </svg>
        </CompassHud>
        <CanvasHost ref={mountRef} />
      </CanvasShell>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
`

const Hint = styled.div`
  font-size: 0.78rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.5rem;
`

const CanvasShell = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-height: 16rem;
`

const CanvasHost = styled.div`
  height: 100%;
  min-height: 16rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  overflow: hidden;
`

const HomeButton = styled.button`
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  z-index: 2;
  border: 1px solid #ffffff66;
  background: #101521d0;
  color: #dfe9ff;
  border-radius: 0.3rem;
  font-size: 0.66rem;
  cursor: pointer;
  padding: 0.18rem 0.42rem;
`

const CompassHud = styled.div`
  position: absolute;
  left: 0.55rem;
  bottom: 0.55rem;
  z-index: 2;
  border: 1px solid #ffffff38;
  background: #0f141ed8;
  border-radius: 0.35rem;
  width: 5.05rem;
  height: 5.05rem;
  padding: 0.28rem;
  pointer-events: none;

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`























