/**
 * Lighting 3D page (layout + viewport shell). DMX→preview targets, fixture mesh construction,
 * and WebGL renderer defaults live in `../lighting3d/previewCore.ts` so the preview can evolve
 * on a clean module boundary while this file keeps UI, gizmo, compass, and scene orchestration.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import StatusBar from '../menu/StatusBar'
import { useDmxSelector, useTypedSelector, store } from '../redux/store'
import { fromFeet, toFeet, METERS_PER_FOOT, StageDimensions } from '../../shared/stage'
import {
  setActiveLedFixture,
  setFixtureMoverMountOrientation,
  setLedFixturePosition,
  setLedFixtureRotation,
  setFixtureRotation,
  setFixtureWindow,
  setLighting3DSettings,
  setSelectedFixture,
} from '../redux/dmxSlice'
import { pushStatusMessage } from '../redux/guiSlice'
import {
  sendDiagnosticsEvent,
  sendTelemetryMark,
  send_open_page_window,
} from '../ipcHandler'
import { currentRendererTelemetrySource } from '../telemetry/RendererTelemetry'
import BusyModal from '../overlays/BusyModal'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib'
import { realtimeStore } from '../redux/realtimeStore'
import { type Params } from '../../shared/params'
import { type LightScene_t } from '../../shared/Scenes'
import {
  defaultMoverBeamAngleForModelKind,
  type MoverMountOrientation,
} from '../../shared/dmxFixtures'
import { mapRowsToPreviewFixtures } from './lightingPreviewFixtures'
import { selectLedPreviewFixtures, selectLightingPreviewRows } from './lightingPreviewSelectors'
import type { MoverPreviewFixture } from './lightingPreviewTypes'
import type {
  FixtureVisual,
  PreviewTarget,
  PersistedCameraState,
  SurfaceHit,
  SurfaceSpec,
  VolumetricFogLightSample,
} from '../lighting3d/previewCore'
import {
  buildTargets,
  clamp,
  clamp01,
  computeFloorSpecFromStage,
  createFixtureVisual,
  createLightingRenderer,
  createPleatedCurtainGeometry,
  createVolumetricFogMaterial,
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET,
  directionFromYawPitch,
  disposeVisual,
  DANCE_FLOOR_Y,
  FALLBACK_WORLD_FLOOR_SIZE,
  feetToWorld,
  fixtureUniversePositionFromWorld,
  fixtureVisualSignature,
  focusWidthScale,
  goboTextureForIndex,
  isCloudModelKind,
  isFiniteColor,
  isFiniteVector3,
  LED_AGGREGATE_FOG_GAIN,
  LED_AGGREGATE_LIGHT_GAIN,
  LED_EMISSIVE_GAIN,
  lerp,
  LIGHTING3D_PERF_HUD_STORAGE_KEY,
  LIGHTING3D_WARMUP_MIN_MS,
  LIGHTING3D_WARMUP_SETTLE_MS,
  LOCAL_AXIS_NEG_Z,
  LOCAL_AXIS_Y,
  LOCAL_AXIS_Z,
  MAX_VISUAL_CREATIONS_PER_SYNC,
  nearestSurfaceHit,
  nonMoverEmitterBaseY,
  normalizeOrFallback,
  normalizeRotationDeg,
  PREVIEW_SYNC_MIN_INTERVAL_MS,
  readPersistedCameraState,
  releaseLighting3DGlobalTextureCaches,
  ROOM_HEIGHT,
  roundToStep,
  setGoboLabelText,
  smoothToward,
  stageHeightFromStage,
  VOLUMETRIC_FOG_MAX_LIGHTS,
  writePersistedCameraState,
} from '../lighting3d/previewCore'

interface Lighting3DPageProps {
  standalonePreview?: boolean
  externalViewport?: boolean
}

export default function Lighting3DPage({
  standalonePreview = false,
  externalViewport = false,
}: Lighting3DPageProps) {
  const openedExternalViewport = useRef(false)
  const fixtureRows = useTypedSelector(selectLightingPreviewRows)
  const ledPreviewFixtures = useTypedSelector(selectLedPreviewFixtures)
  const ledFixtures = useDmxSelector((state) => state.led.ledFixtures)
  const activeLedFixture = useDmxSelector((state) => state.led.activeFixture)
  const activeFixture = useDmxSelector((state) => state.activeFixture)
  const stage = useDmxSelector((state) => state.stage)
  const lighting3d = useDmxSelector((state) => state.lighting3d)
  const fixturePlacementDepthEnabled = useTypedSelector(
    (state) => state.gui.fixturePlacementDepthEnabled
  )
  const dispatch = useDispatch()

  const previewFixtures = useMemo(() => {
    return [
      ...mapRowsToPreviewFixtures(fixtureRows, {
        fixturePlacementDepthEnabled,
      }),
      ...ledPreviewFixtures,
    ]
  }, [fixtureRows, ledPreviewFixtures, fixturePlacementDepthEnabled])
  const activeFixtureId = useMemo(() => {
    if (activeFixture === null) {
      if (activeLedFixture === null) {
        return null
      }
      const ledFixture = ledFixtures[activeLedFixture]
      return ledFixture ? `led:${ledFixture.id}` : null
    }
    return (
      fixtureRows.find((row) => row.fixtureIndex === activeFixture)?.fixtureId ??
      null
    )
  }, [fixtureRows, ledFixtures, activeFixture, activeLedFixture])

  const selectFixture = useCallback(
    (fixtureIndex: number) => {
      dispatch(setSelectedFixture(fixtureIndex))
    },
    [dispatch]
  )

  const selectLedFixture = useCallback(
    (ledFixtureIndex: number) => {
      dispatch(setActiveLedFixture(ledFixtureIndex))
    },
    [dispatch]
  )

  const updateFixtureWindow = useCallback(
    (
      fixtureIndex: number,
      payload: {
        x?: number
        y?: number
        z?: number
      }
    ) => {
      dispatch(
        setFixtureWindow({
          index: fixtureIndex,
          ...payload,
        })
      )
    },
    [dispatch]
  )

  const updateFixtureRotation = useCallback(
    (
      fixtureIndex: number,
      payload: {
        x?: number
        y?: number
        z?: number
      }
    ) => {
      dispatch(
        setFixtureRotation({
          index: fixtureIndex,
          ...payload,
        })
      )
    },
    [dispatch]
  )

  const updateLedFixturePosition = useCallback(
    (
      ledFixtureIndex: number,
      payload: {
        x?: number
        y?: number
        z?: number
      }
    ) => {
      dispatch(
        setLedFixturePosition({
          index: ledFixtureIndex,
          ...payload,
        })
      )
    },
    [dispatch]
  )

  const updateLedFixtureRotation = useCallback(
    (
      ledFixtureIndex: number,
      payload: {
        x?: number
        y?: number
        z?: number
      }
    ) => {
      dispatch(
        setLedFixtureRotation({
          index: ledFixtureIndex,
          ...payload,
        })
      )
    },
    [dispatch]
  )

  const setFixtureMountOrientation = useCallback(
    (fixtureId: string, orientation: MoverMountOrientation) => {
      dispatch(
        setFixtureMoverMountOrientation({
          fixtureId,
          orientation,
        })
      )
    },
    [dispatch]
  )

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

  useEffect(() => {
    if (standalonePreview || !externalViewport) {
      return
    }
    if (openedExternalViewport.current) {
      return
    }
    openedExternalViewport.current = true
    send_open_page_window('Lighting3D')
  }, [standalonePreview, externalViewport])

  const viewportContent =
    externalViewport ? (
      <ExternalViewportCard>
        <ExternalViewportTitle>Lighting 3D Viewport Runs In A Detached Window</ExternalViewportTitle>
        <ExternalViewportBody>
          This page keeps all Lighting 3D controls. The live viewport runs in a dedicated
          renderer window for smoother performance.
        </ExternalViewportBody>
        <ExternalViewportButton
          type="button"
          onClick={() => send_open_page_window('Lighting3D')}
        >
          Open / Focus Lighting 3D Viewport
        </ExternalViewportButton>
      </ExternalViewportCard>
    ) : previewFixtures.length > 0 ? (
      <Lighting3DViewport
        fixtures={previewFixtures}
        stage={stage}
        activeFixtureId={activeFixtureId}
        onSelectFixture={selectFixture}
        onSelectLedFixture={selectLedFixture}
        onUpdateFixtureWindow={updateFixtureWindow}
        onUpdateFixtureRotation={updateFixtureRotation}
        onUpdateLedFixturePosition={updateLedFixturePosition}
        onUpdateLedFixtureRotation={updateLedFixtureRotation}
        onSetFixtureMountOrientation={setFixtureMountOrientation}
        showCurtain={lighting3d.showCurtain}
        showBoundsOverlay={lighting3d.showBoundsOverlay}
        hazeAmount={lighting3d.environmentFog}
        room={roomConfig}
      />
    ) : (
      <EmptyState>
        No fixtures found. Add fixtures in DMX Setup to populate the 3D preview.
      </EmptyState>
    )

  const pageContent = (
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
          <ControlLabel>
            Haze {Math.round(lighting3d.environmentFog * 100)}%
          </ControlLabel>
          <FogSlider
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={lighting3d.environmentFog}
            onChange={(event) =>
              dispatch(
                setLighting3DSettings({
                  environmentFog: Number(event.target.value),
                })
              )
            }
          />
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
      {viewportContent}
    </Content>
  )

  if (standalonePreview) {
    return <StandalonePreviewRoot>{pageContent}</StandalonePreviewRoot>
  }

  return (
    <LightingPageRoot>
      <StatusBar />
      {pageContent}
    </LightingPageRoot>
  )
}

const LightingPageRoot = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const StandalonePreviewRoot = styled.div`
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
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

const DimensionInput = styled.input`
  width: 100%;
  font-size: 0.78rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.28rem;
  padding: 0.24rem 0.35rem;
`

const FogSlider = styled.input`
  width: 100%;
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

interface Lighting3DViewportProps {
  fixtures: MoverPreviewFixture[]
  stage: StageDimensions
  activeFixtureId: string | null
  onSelectFixture: (fixtureIndex: number) => void
  onSelectLedFixture: (ledFixtureIndex: number) => void
  onUpdateFixtureWindow: (
    fixtureIndex: number,
    payload: {
      x?: number
      y?: number
      z?: number
    }
  ) => void
  onUpdateLedFixturePosition: (
    ledFixtureIndex: number,
    payload: {
      x?: number
      y?: number
      z?: number
    }
  ) => void
  onUpdateFixtureRotation: (
    fixtureIndex: number,
    payload: {
      x?: number
      y?: number
      z?: number
    }
  ) => void
  onUpdateLedFixtureRotation: (
    ledFixtureIndex: number,
    payload: {
      x?: number
      y?: number
      z?: number
    }
  ) => void
  onSetFixtureMountOrientation: (
    fixtureId: string,
    orientation: MoverMountOrientation
  ) => void
  showCurtain?: boolean
  showBoundsOverlay?: boolean
  hazeAmount?: number
  room?: {
    enabled: boolean
    widthFt: number
    depthFt: number
    heightFt: number
  }
}

function Lighting3DViewport({
  fixtures,
  stage,
  activeFixtureId,
  onSelectFixture,
  onSelectLedFixture,
  onUpdateFixtureWindow,
  onUpdateLedFixturePosition,
  onUpdateFixtureRotation,
  onUpdateLedFixtureRotation,
  onSetFixtureMountOrientation,
  showCurtain = true,
  showBoundsOverlay = true,
  hazeAmount = 0,
  room = {
    enabled: false,
    widthFt: 36,
    depthFt: 28,
    heightFt: 12,
  },
}: Lighting3DViewportProps) {
  const telemetrySource = currentRendererTelemetrySource()
  const dispatch = useDispatch()
  const fixturePlacementDepthEnabled = useTypedSelector(
    (state) => state.gui.fixturePlacementDepthEnabled
  )
  const fixturesRef = useRef(fixtures)
  fixturesRef.current = fixtures
  const splitStatesRef = useRef(realtimeStore.getState().splitStates)
  const dmxOutByUniverseRef = useRef(realtimeStore.getState().dmxOutByUniverse)
  useEffect(() => {
    const pushRealtime = () => {
      const next = realtimeStore.getState()
      splitStatesRef.current = next.splitStates
      dmxOutByUniverseRef.current = next.dmxOutByUniverse
    }
    pushRealtime()
    return realtimeStore.subscribe(pushRealtime)
  }, [])
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const transformControlsRef = useRef<TransformControls | null>(null)
  const transformControlsHelperRef = useRef<THREE.Object3D | null>(null)
  const fixtureVisualsRef = useRef<Map<string, FixtureVisual>>(new Map())
  const raycasterRef = useRef(new THREE.Raycaster())
  const pointerNdcRef = useRef(new THREE.Vector2())
  const lastPointerDownRef = useRef<{
    x: number
    y: number
    button: number
  } | null>(null)
  const transformDraggingRef = useRef(false)
  const fixtureByIdRef = useRef<Map<string, MoverPreviewFixture>>(new Map())
  const heavySceneRef = useRef(fixtures.length > 45)
  const onSelectFixtureRef = useRef(onSelectFixture)
  const onSelectLedFixtureRef = useRef(onSelectLedFixture)
  const transformModeRef = useRef<'translate' | 'rotate'>('translate')
  const applyTransformRef = useRef<() => void>(() => {})
  const gizmoFixtureIdRef = useRef<string | null>(null)
  const [gizmoFixtureId, setGizmoFixtureId] = useState<string | null>(null)
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>(
    'translate'
  )
  const [hoverInfo, setHoverInfo] = useState<{
    clientX: number
    clientY: number
    fixtureLabel: string
    fixtureName: string
  } | null>(null)
  const [startupBusyVisible, setStartupBusyVisible] = useState(false)
  const [startupBusyProgress, setStartupBusyProgress] = useState(0)
  const [startupBusyPhase, setStartupBusyPhase] = useState<'loading' | 'settling'>('loading')
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
  const roomFogVolumeRef = useRef<THREE.Mesh | null>(null)
  const volumetricFogMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const volumetricFogEnabledRef = useRef(false)
  const volumetricFogMaxLightsRef = useRef(VOLUMETRIC_FOG_MAX_LIGHTS)
  const lastFrameAtRef = useRef(performance.now())
  const frameCountRef = useRef(0)
  const freezeReportedRef = useRef(false)
  const lastTelemetryAtRef = useRef(0)
  const renderSampleMsRef = useRef(0)
  const renderSampleCountRef = useRef(0)
  const [perfHudOpen, setPerfHudOpen] = useState(() => {
    try {
      return (
        typeof localStorage !== 'undefined' &&
        localStorage.getItem(LIGHTING3D_PERF_HUD_STORAGE_KEY) === '1'
      )
    } catch {
      return false
    }
  })
  const perfHudOpenRef = useRef(perfHudOpen)
  useEffect(() => {
    perfHudOpenRef.current = perfHudOpen
  }, [perfHudOpen])
  const perfHudTextRef = useRef<HTMLPreElement>(null)
  /** Frames rendered in the current 1s telemetry window (viewport visible). */
  const renderFramesInSecRef = useRef(0)
  const renderMaxFrameMsInSecRef = useRef(0)
  const hudLastFrameMsRef = useRef(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault()
        setPerfHudOpen((prev) => {
          const next = !prev
          try {
            if (next) {
              localStorage.setItem(LIGHTING3D_PERF_HUD_STORAGE_KEY, '1')
            } else {
              localStorage.removeItem(LIGHTING3D_PERF_HUD_STORAGE_KEY)
            }
          } catch {
            // ignore private mode / quota
          }
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  useEffect(() => {
    if (perfHudOpen && perfHudTextRef.current !== null) {
      perfHudTextRef.current.textContent =
        'Collecting metrics (updates every 1s while the viewport runs)…'
    }
  }, [perfHudOpen])
  const startupReadyRef = useRef(false)
  const startupProgressRef = useRef(0)
  const startupReadyAtRef = useRef<number | null>(null)
  const startupMinVisibleUntilRef = useRef(0)
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
  const hazeAmountRef = useRef(clamp01(hazeAmount))
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

  const floorSpec = useMemo(() => computeFloorSpecFromStage(stage), [stage])
  const stageHeight = useMemo(() => stageHeightFromStage(stage), [stage])

  const activeLightSceneRef = useRef<LightScene_t | null>(null)
  const masterRef = useRef(0)
  useLayoutEffect(() => {
    const syncControlRefs = () => {
      const state = store.getState()
      const light = state.control.present.light
      activeLightSceneRef.current = light.byId[light.active] ?? null
      masterRef.current = state.control.present.master
    }
    syncControlRefs()
    return store.subscribe(syncControlRefs)
  }, [])
  const floorSpecRef = useRef(floorSpec)
  floorSpecRef.current = floorSpec
  const stageHeightRef = useRef(stageHeight)
  stageHeightRef.current = stageHeight
  const fixturePlacementDepthEnabledRef = useRef(fixturePlacementDepthEnabled)
  fixturePlacementDepthEnabledRef.current = fixturePlacementDepthEnabled

  const previewTargetsRef = useRef<PreviewTarget[]>([])
  /** Preview sync runs from the rAF loop (not a separate timer) to avoid main-thread pileups. */
  const previewSyncPassRef = useRef<() => void>(() => {})
  const lastPreviewSyncAtRef = useRef(0)
  const fixtureById = useMemo(() => {
    const map = new Map<string, MoverPreviewFixture>()
    for (const fixture of fixtures) {
      map.set(fixture.fixtureId, fixture)
    }
    return map
  }, [fixtures])
  const gizmoFixture = useMemo(() => {
    if (gizmoFixtureId === null) {
      return null
    }
    return fixtureById.get(gizmoFixtureId) ?? null
  }, [gizmoFixtureId, fixtureById])

  useEffect(() => {
    if (fixtures.length <= 0) {
      startupReadyRef.current = true
      startupReadyAtRef.current = performance.now()
      startupMinVisibleUntilRef.current = performance.now()
      startupProgressRef.current = 1
      setStartupBusyProgress(1)
      setStartupBusyPhase('loading')
      setStartupBusyVisible(false)
      return
    }

    startupReadyRef.current = false
    startupReadyAtRef.current = null
    startupMinVisibleUntilRef.current =
      performance.now() + LIGHTING3D_WARMUP_MIN_MS
    startupProgressRef.current = 0
    setStartupBusyProgress(0)
    setStartupBusyPhase('loading')
    setStartupBusyVisible(true)
  }, [fixtures.length])

  useEffect(() => {
    if (!startupBusyVisible) {
      return
    }
    const interval = window.setInterval(() => {
      if (!startupReadyRef.current) {
        return
      }
      const now = performance.now()
      const readyAt = startupReadyAtRef.current ?? now
      const hideAt = Math.max(
        startupMinVisibleUntilRef.current,
        readyAt + LIGHTING3D_WARMUP_SETTLE_MS
      )
      if (now >= hideAt) {
        setStartupBusyVisible(false)
      }
    }, 60)
    return () => {
      window.clearInterval(interval)
    }
  }, [startupBusyVisible])

  useEffect(() => {
    roomEnabledRef.current = room.enabled
  }, [room.enabled])

  useEffect(() => {
    hazeAmountRef.current = clamp01(hazeAmount)
  }, [hazeAmount])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = performance.now()
      const deltaMs = now - lastFrameAtRef.current
      if (deltaMs > 2500 && !freezeReportedRef.current) {
        freezeReportedRef.current = true
        dispatch(
          pushStatusMessage({
            level: 'error',
            source: 'Lighting3D',
            message: `Render stall detected (${Math.round(deltaMs)} ms).`,
          })
        )
        sendTelemetryMark({
          source: telemetrySource,
          subsystem: 'lighting3d',
          metric: 'frame_stall_detected',
          type: 'counter',
          by: 1,
        })
        sendTelemetryMark({
          source: telemetrySource,
          subsystem: 'lighting3d',
          metric: 'frame_stall_ms',
          type: 'gauge',
          value: Math.round(deltaMs),
          unit: 'ms',
        })
        sendTelemetryMark({
          source: telemetrySource,
          subsystem: 'lighting3d',
          metric: 'health',
          type: 'health',
          status: 'error',
          message: 'Lighting 3D frame stall detected',
        })
        sendDiagnosticsEvent({
          source: telemetrySource,
          area: 'lighting3d',
          event: 'frame-stall-detected',
          level: 'error',
          message: 'Lighting 3D render frame stalled',
          data: {
            deltaMs: Math.round(deltaMs),
            frameCount: frameCountRef.current,
            volumetricFogEnabled: volumetricFogEnabledRef.current,
            roomEnabled: roomEnabledRef.current,
          },
        })
      } else if (deltaMs <= 1200 && freezeReportedRef.current) {
        freezeReportedRef.current = false
        dispatch(
          pushStatusMessage({
            level: 'info',
            source: 'Lighting3D',
            message: 'Render stall recovered.',
          })
        )
        sendTelemetryMark({
          source: telemetrySource,
          subsystem: 'lighting3d',
          metric: 'frame_stall_recovered',
          type: 'counter',
          by: 1,
        })
        sendTelemetryMark({
          source: telemetrySource,
          subsystem: 'lighting3d',
          metric: 'health',
          type: 'health',
          status: 'ok',
          message: 'Lighting 3D frame stall recovered',
        })
        sendDiagnosticsEvent({
          source: telemetrySource,
          area: 'lighting3d',
          event: 'frame-stall-recovered',
          level: 'info',
          data: {
            deltaMs: Math.round(deltaMs),
            frameCount: frameCountRef.current,
          },
        })
      }
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [dispatch])

  useEffect(() => {
    if (activeFixtureId === null) {
      setGizmoFixtureId(null)
    }
  }, [activeFixtureId])

  useEffect(() => {
    gizmoFixtureIdRef.current = gizmoFixtureId
  }, [gizmoFixtureId])

  useEffect(() => {
    fixtureByIdRef.current = fixtureById
  }, [fixtureById])

  useEffect(() => {
    onSelectFixtureRef.current = onSelectFixture
  }, [onSelectFixture])

  useEffect(() => {
    onSelectLedFixtureRef.current = onSelectLedFixture
  }, [onSelectLedFixture])

  useEffect(() => {
    transformModeRef.current = transformMode
  }, [transformMode])

  const fixtureIdFromObject = useCallback((object: THREE.Object3D | null): string | null => {
    let current: THREE.Object3D | null = object
    while (current !== null) {
      const fixtureId = (current.userData as { fixtureId?: unknown }).fixtureId
      if (typeof fixtureId === 'string' && fixtureId.length > 0) {
        return fixtureId
      }
      current = current.parent
    }
    return null
  }, [])

  const pickFixtureIdFromClientPoint = useCallback(
    (clientX: number, clientY: number): string | null => {
      const renderer = rendererRef.current
      const camera = cameraRef.current
      const scene = sceneRef.current
      if (renderer === null || camera === null || scene === null) {
        return null
      }

      const bounds = renderer.domElement.getBoundingClientRect()
      if (bounds.width <= 0 || bounds.height <= 0) {
        return null
      }

      pointerNdcRef.current.set(
        ((clientX - bounds.left) / bounds.width) * 2 - 1,
        -((clientY - bounds.top) / bounds.height) * 2 + 1
      )
      raycasterRef.current.setFromCamera(pointerNdcRef.current, camera)
      const hits = raycasterRef.current.intersectObjects(scene.children, true)
      for (const hit of hits) {
        const fixtureId = fixtureIdFromObject(hit.object)
        if (fixtureId !== null) {
          return fixtureId
        }
      }
      return null
    },
    [fixtureIdFromObject]
  )

  const applySelectedTransformToStore = useCallback(() => {
    const fixtureId = gizmoFixtureIdRef.current
    if (fixtureId === null) {
      return
    }
    const fixture = fixtureById.get(fixtureId)
    const visual = fixtureVisualsRef.current.get(fixtureId)
    if (fixture === undefined || visual === undefined) {
      return
    }

    const world = visual.root.position
    const normalized = fixtureUniversePositionFromWorld(
      world.x,
      world.y,
      world.z,
      floorSpec,
      stageHeight
    )

    const snapDisplayStep = stage.unit === 'm' ? 0.5 : 0.5
    const snapLengthInFeet =
      stage.unit === 'm' ? snapDisplayStep / METERS_PER_FOOT : snapDisplayStep

    const snapNormalized = (value: number, axisLengthFt: number) => {
      const normalizedStep = Math.min(
        1,
        Math.max(0.00001, snapLengthInFeet / Math.max(0.0001, axisLengthFt))
      )
      return clamp01(roundToStep(value, normalizedStep))
    }

    const nextX = snapNormalized(normalized.x, stage.widthFt)
    const nextY = snapNormalized(normalized.y, stage.heightFt)
    const nextZ = fixturePlacementDepthEnabled
      ? snapNormalized(normalized.z, stage.depthFt)
      : fixture.zPos

    const nextRotX = normalizeRotationDeg(
      THREE.MathUtils.radToDeg(visual.root.rotation.x)
    )
    const nextRotY = normalizeRotationDeg(
      THREE.MathUtils.radToDeg(visual.root.rotation.y)
    )
    const nextRotZ = normalizeRotationDeg(
      THREE.MathUtils.radToDeg(visual.root.rotation.z)
    )

    if (
      Math.abs(nextX - fixture.xPos) > 0.0001 ||
      Math.abs(nextY - fixture.yPos) > 0.0001 ||
      Math.abs(nextZ - fixture.zPos) > 0.0001
    ) {
      if (fixture.isLedFixture && fixture.ledFixtureIndex !== undefined) {
        onUpdateLedFixturePosition(fixture.ledFixtureIndex, {
          x: nextX,
          y: nextY,
          z: nextZ,
        })
      } else {
        onUpdateFixtureWindow(fixture.fixtureIndex, {
          x: nextX,
          y: nextY,
          z: nextZ,
        })
      }
    }

    if (!fixture.isMover) {
      const hasRotationChange =
        Math.abs(nextRotX - fixture.rotation.x) > 0.0001 ||
        Math.abs(nextRotY - fixture.rotation.y) > 0.0001 ||
        Math.abs(nextRotZ - fixture.rotation.z) > 0.0001
      if (hasRotationChange) {
        if (fixture.isLedFixture && fixture.ledFixtureIndex !== undefined) {
          onUpdateLedFixtureRotation(fixture.ledFixtureIndex, {
            x: nextRotX,
            y: nextRotY,
            z: nextRotZ,
          })
        } else {
          onUpdateFixtureRotation(fixture.fixtureIndex, {
            x: nextRotX,
            y: nextRotY,
            z: nextRotZ,
          })
        }
      }
    }
  }, [
    fixtureById,
    floorSpec,
    onUpdateLedFixturePosition,
    onUpdateLedFixtureRotation,
    onUpdateFixtureRotation,
    onUpdateFixtureWindow,
    stage.depthFt,
    stage.heightFt,
    stage.unit,
    stage.widthFt,
    stageHeight,
    fixturePlacementDepthEnabled,
  ])

  useEffect(() => {
    applyTransformRef.current = applySelectedTransformToStore
  }, [applySelectedTransformToStore])

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

    RectAreaLightUniformsLib.init()

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

    const heavyScene = heavySceneRef.current
    let renderer: THREE.WebGLRenderer
    try {
      renderer = createLightingRenderer(heavyScene)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Lighting 3D renderer failed to initialize.'
      dispatch(
        pushStatusMessage({
          level: 'error',
          source: 'Lighting3D',
          message,
        })
      )
      sendDiagnosticsEvent({
        source: telemetrySource,
        area: 'lighting3d',
        event: 'renderer-init-failed',
        level: 'error',
        message,
      })
      return
    }
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

    const transformControls = new TransformControls(camera, renderer.domElement)
    transformControls.size = 0.9
    transformControls.setSpace('world')
    const transformControlsHelper = transformControls.getHelper()
    transformControlsHelper.visible = false
    scene.add(transformControlsHelper)
    transformControlsRef.current = transformControls
    transformControlsHelperRef.current = transformControlsHelper
    transformControls.addEventListener('dragging-changed', (event) => {
      const isDragging = Boolean((event as { value?: unknown }).value)
      transformDraggingRef.current = isDragging
      controls.enabled = !isDragging
      if (!isDragging) {
        applyTransformRef.current()
      }
    })
    transformControls.addEventListener('objectChange', () => {
      applyTransformRef.current()
    })

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }
    renderer.domElement.addEventListener('contextmenu', blockContextMenu)
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      sendDiagnosticsEvent({
        source: telemetrySource,
        area: 'lighting3d',
        event: 'webgl-context-lost',
        level: 'error',
        message: 'WebGL context lost in Lighting 3D',
      })
    }
    const handleContextRestored = () => {
      sendDiagnosticsEvent({
        source: telemetrySource,
        area: 'lighting3d',
        event: 'webgl-context-restored',
        level: 'warn',
        message: 'WebGL context restored in Lighting 3D',
      })
    }
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost as EventListener)
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored as EventListener
    )

    const pointerDown = (event: PointerEvent) => {
      lastPointerDownRef.current = {
        x: event.clientX,
        y: event.clientY,
        button: event.button,
      }
    }

    const pointerMove = (event: PointerEvent) => {
      if (transformDraggingRef.current) {
        setHoverInfo(null)
        return
      }

      const fixtureId = pickFixtureIdFromClientPoint(event.clientX, event.clientY)
      if (fixtureId === null) {
        setHoverInfo(null)
        return
      }

      const fixture = fixtureByIdRef.current.get(fixtureId)
      if (fixture === undefined) {
        setHoverInfo(null)
        return
      }

      setHoverInfo({
        clientX: event.clientX,
        clientY: event.clientY,
        fixtureLabel: fixture.fixtureLabel,
        fixtureName: fixture.fixtureName,
      })
    }

    const pointerUp = (event: PointerEvent) => {
      const start = lastPointerDownRef.current
      lastPointerDownRef.current = null
      if (start === null) {
        return
      }
      const clickButton = start.button

      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      const moved = Math.hypot(dx, dy) > 5
      if (moved) {
        return
      }

      const fixtureId = pickFixtureIdFromClientPoint(event.clientX, event.clientY)
      if (fixtureId === null) {
        if (clickButton === 0 || clickButton === 2) {
          setGizmoFixtureId(null)
        }
        return
      }

      const fixture = fixtureByIdRef.current.get(fixtureId)
      if (fixture === undefined) {
        if (clickButton === 0 || clickButton === 2) {
          setGizmoFixtureId(null)
        }
        return
      }

      if (fixture.isLedFixture && fixture.ledFixtureIndex !== undefined) {
        onSelectLedFixtureRef.current(fixture.ledFixtureIndex)
      } else {
        onSelectFixtureRef.current(fixture.fixtureIndex)
      }

      if (clickButton === 2) {
        setGizmoFixtureId(fixtureId)
        if (fixture.isMover) {
          setTransformMode('translate')
          transformControls.setMode('translate')
          return
        }
        const nextMode =
          gizmoFixtureIdRef.current === fixtureId &&
          transformModeRef.current === 'translate'
            ? 'rotate'
            : 'translate'
        setTransformMode(nextMode)
        transformControls.setMode(nextMode)
        return
      }

      if (clickButton === 0) {
        setGizmoFixtureId(null)
      }
    }

    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)

    const keyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement | null)?.isContentEditable
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'q') {
        setTransformMode('translate')
        return
      }
      if (key === 'e') {
        setTransformMode('rotate')
        return
      }
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

    const ambient = new THREE.AmbientLight('#eef1f8', 0.32)
    scene.add(ambient)

    const hemi = new THREE.HemisphereLight('#c8d4f5', '#1e222c', 0.45)
    hemi.position.set(0, 12, 0)
    scene.add(hemi)

    const keyLight = new THREE.DirectionalLight('#ffffff', 0.48)
    keyLight.position.set(6, 10, 4)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight('#e2e9f7', 0.32)
    fillLight.position.set(-6, 5, -7)
    scene.add(fillLight)

    const worldFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        color: '#e8ecf5',
        emissive: '#2a3140',
        emissiveIntensity: 0.08,
        metalness: 0.02,
        roughness: 0.9,
        side: THREE.DoubleSide,
      })
    )
    worldFloor.rotation.x = -Math.PI / 2
    worldFloor.position.y = DANCE_FLOOR_Y
    worldFloor.receiveShadow = true
    scene.add(worldFloor)
    worldFloorRef.current = worldFloor

    const danceFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        color: '#e8ecf5',
        emissive: '#2a3140',
        emissiveIntensity: 0.08,
        metalness: 0.02,
        roughness: 0.9,
        side: THREE.DoubleSide,
      })
    )
    danceFloor.rotation.x = -Math.PI / 2
    danceFloor.receiveShadow = true
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
        emissive: '#1a080c',
        emissiveIntensity: 0.08,
        metalness: 0.02,
        roughness: 0.82,
        side: THREE.DoubleSide,
      })
    )
    scene.add(stageWall)
    stageWall.receiveShadow = true
    stageWallRef.current = stageWall

    const roomWallMaterial = new THREE.MeshStandardMaterial({
      color: '#e6eaf2',
      emissive: '#253044',
      emissiveIntensity: 0.08,
      metalness: 0.03,
      roughness: 0.86,
      side: THREE.DoubleSide,
    })
    const roomCeilingMaterial = roomWallMaterial.clone()
    roomCeilingMaterial.side = THREE.DoubleSide
    roomCeilingMaterial.opacity = 1

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
    const safeFogLightCount = clamp(VOLUMETRIC_FOG_MAX_LIGHTS, 2, 12)
    volumetricFogEnabledRef.current = true
    volumetricFogMaxLightsRef.current = safeFogLightCount
    const roomFogMaterial = createVolumetricFogMaterial(
      Math.max(2, safeFogLightCount)
    )
    const roomFogVolume = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      roomFogMaterial
    )
    roomFogVolume.renderOrder = 6
    scene.add(roomLeftWall)
    scene.add(roomRightWall)
    scene.add(roomBackWall)
    scene.add(roomFrontWall)
    scene.add(roomCeiling)
    scene.add(roomFogVolume)
    roomLeftWallRef.current = roomLeftWall
    roomRightWallRef.current = roomRightWall
    roomBackWallRef.current = roomBackWall
    roomFrontWallRef.current = roomFrontWall
    roomCeilingRef.current = roomCeiling
    roomFogVolumeRef.current = roomFogVolume
    volumetricFogMaterialRef.current = roomFogMaterial as THREE.ShaderMaterial
    roomFogVolume.visible = false
    roomLeftWall.receiveShadow = true
    roomRightWall.receiveShadow = true
    roomBackWall.receiveShadow = true
    roomFrontWall.receiveShadow = true
    roomCeiling.receiveShadow = true

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
    let frameErrorCount = 0
    let frameHandle: number | null = null
    const queueNextFrame = () => {
      if (cancelled || frameHandle !== null) {
        return
      }
      frameHandle = requestAnimationFrame(frame)
    }
    const frame = () => {
      frameHandle = null
      const frameStartedAt = performance.now()
      if (cancelled) return
      if (document.visibilityState !== 'visible') {
        // Keep timers stable while hidden/minimized without burning render CPU.
        clock.getDelta()
        queueNextFrame()
        return
      }
      try {
        const delta = Math.min(0.05, clock.getDelta())
        const nowMs = performance.now()
        const syncNow = performance.now()
        if (
          syncNow - lastPreviewSyncAtRef.current >=
          PREVIEW_SYNC_MIN_INTERVAL_MS
        ) {
          lastPreviewSyncAtRef.current = syncNow
          previewSyncPassRef.current()
        }

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
            // Keep ceiling visible so projected light remains readable from all camera angles.
            ceiling.visible = true

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
        frameCountRef.current += 1
        lastFrameAtRef.current = performance.now()
        const frameMs = performance.now() - frameStartedAt
        hudLastFrameMsRef.current = frameMs
        renderFramesInSecRef.current += 1
        renderMaxFrameMsInSecRef.current = Math.max(
          renderMaxFrameMsInSecRef.current,
          frameMs
        )
        renderSampleMsRef.current += frameMs
        renderSampleCountRef.current += 1
        if (nowMs - lastTelemetryAtRef.current >= 1000) {
          lastTelemetryAtRef.current = nowMs
          const avgFrameMs =
            renderSampleCountRef.current > 0
              ? renderSampleMsRef.current / renderSampleCountRef.current
              : 0
          renderSampleMsRef.current = 0
          renderSampleCountRef.current = 0
          const fps1s = renderFramesInSecRef.current
          const maxFrameMs1s = renderMaxFrameMsInSecRef.current
          renderFramesInSecRef.current = 0
          renderMaxFrameMsInSecRef.current = 0
          if (perfHudOpenRef.current) {
            const pre = perfHudTextRef.current
            const rendererHud = rendererRef.current
            if (pre !== null && rendererHud !== null) {
              const maxMs = maxFrameMs1s
              const mem = (performance as unknown as {
                memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
              }).memory
              const heapLine =
                mem !== undefined
                  ? `JS heap MB: ${(mem.usedJSHeapSize / (1024 * 1024)).toFixed(0)} / ${(mem.totalJSHeapSize / (1024 * 1024)).toFixed(0)}`
                  : 'JS heap MB: (n/a)'
              const info = rendererHud.info
              pre.textContent = [
                'Lighting 3D live (Alt+Shift+H to hide)',
                `Telemetry source: ${telemetrySource}`,
                `FPS (1s): ${fps1s}`,
                `Frame ms  avg: ${avgFrameMs.toFixed(2)}  max: ${maxMs.toFixed(1)}  last: ${hudLastFrameMsRef.current.toFixed(1)}`,
                `Fixtures (preview targets): ${previewTargetsRef.current.length}  visuals map: ${fixtureVisualsRef.current.size}`,
                `Draw calls: ${info.render.calls}  triangles: ${info.render.triangles}`,
                `Geometries: ${info.memory.geometries}  textures: ${info.memory.textures}`,
                heapLine,
                `Canvas: ${rendererHud.domElement.width}x${rendererHud.domElement.height}  DPR: ${rendererHud.getPixelRatio()}`,
                `Stall flag: ${freezeReportedRef.current ? 'yes' : 'no'}  volumetric fog: ${volumetricFogEnabledRef.current ? 'on' : 'off'}`,
              ].join('\n')
            }
          }
          sendTelemetryMark({
            source: telemetrySource,
            subsystem: 'lighting3d.render',
            metric: 'frame_ms_avg',
            type: 'gauge',
            value: avgFrameMs,
            unit: 'ms',
          })
          sendTelemetryMark({
            source: telemetrySource,
            subsystem: 'lighting3d.render',
            metric: 'fps',
            type: 'gauge',
            value: Math.max(1, Math.round(1 / Math.max(1e-3, delta))),
            unit: 'fps',
          })
          sendTelemetryMark({
            source: telemetrySource,
            subsystem: 'lighting3d.render',
            metric: 'fps_1s',
            type: 'gauge',
            value: fps1s,
            unit: 'fps',
          })
          sendTelemetryMark({
            source: telemetrySource,
            subsystem: 'lighting3d.render',
            metric: 'frame_ms_max_1s',
            type: 'gauge',
            value: maxFrameMs1s,
            unit: 'ms',
          })
          sendTelemetryMark({
            source: telemetrySource,
            subsystem: 'lighting3d.render',
            metric: 'active_fixture_count',
            type: 'gauge',
            value: previewTargetsRef.current.length,
          })
          sendTelemetryMark({
            source: telemetrySource,
            subsystem: 'lighting3d',
            metric: 'health',
            type: 'health',
            status: freezeReportedRef.current ? 'warn' : 'ok',
            message: freezeReportedRef.current
              ? 'Lighting3D recovering from stall'
              : 'Lighting3D render healthy',
          })
        }
      } catch (error) {
        frameErrorCount += 1
        if (frameErrorCount <= 3 || frameErrorCount % 120 === 0) {
          const errorMessage =
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error)
          sendDiagnosticsEvent({
            source: telemetrySource,
            area: 'lighting3d',
            event: 'frame-render-error',
            level: 'error',
            message: errorMessage,
            data: {
              frameErrorCount,
              stack: error instanceof Error ? error.stack : undefined,
            },
          })
          sendTelemetryMark({
            source: telemetrySource,
            subsystem: 'lighting3d.render',
            metric: 'frame_render_errors',
            type: 'counter',
            by: 1,
          })
          sendTelemetryMark({
            source: telemetrySource,
            subsystem: 'lighting3d',
            metric: 'health',
            type: 'health',
            status: 'error',
            message: errorMessage,
          })
          dispatch(
            pushStatusMessage({
              level: 'error',
              source: 'Lighting3D',
              message: `Render error: ${errorMessage}`,
            })
          )
          // eslint-disable-next-line no-console
          console.error('Lighting3D frame render error', error)
        }
      } finally {
        if (!cancelled) {
          queueNextFrame()
        }
      }
    }

    const handleVisibilityChange = () => {
      if (cancelled) {
        return
      }
      if (document.visibilityState === 'visible') {
        clock.getDelta()
        queueNextFrame()
      } else if (frameHandle !== null) {
        cancelAnimationFrame(frameHandle)
        frameHandle = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    handleVisibilityChange()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (frameHandle !== null) {
        cancelAnimationFrame(frameHandle)
        frameHandle = null
      }
      resizeObserver.disconnect()

      fixtureVisualsRef.current.forEach((visual) => {
        scene.remove(visual.root)
        disposeVisual(visual)
      })
      fixtureVisualsRef.current.clear()

      renderer.domElement.removeEventListener('contextmenu', blockContextMenu)
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost as EventListener
      )
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored as EventListener
      )
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      controls.dispose()
      transformControls.dispose()
      if (transformControlsHelperRef.current !== null) {
        scene.remove(transformControlsHelperRef.current)
      }

      // Free GPU-side renderer caches and force WebGL context teardown on close.
      renderer.renderLists.dispose()
      try {
        renderer.forceContextLoss()
      } catch (_error) {
        // no-op: context loss extension may be unavailable on some drivers
      }
      renderer.dispose()
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement)
      }
      persistCamera(camera, controls)

      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
      transformControlsRef.current = null
      transformControlsHelperRef.current = null
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
      const fogMaterial = volumetricFogMaterialRef.current
      if (roomFogVolume.geometry instanceof THREE.BufferGeometry) {
        roomFogVolume.geometry.dispose()
      }
      fogMaterial?.dispose()
      if (roomFogVolume.material instanceof THREE.Material) {
        roomFogVolume.material.dispose()
      }
      roomFogVolumeRef.current = null
      volumetricFogMaterialRef.current = null
      centerMarkerRef.current = null
      releaseLighting3DGlobalTextureCaches()
    }
  }, [dispatch, persistCamera, updateCompassHud])

  useEffect(() => {
    const transformControls = transformControlsRef.current
    if (transformControls === null) {
      return
    }

    transformControls.setMode(transformMode)
  }, [transformMode])

  useEffect(() => {
    if (gizmoFixture?.isMover !== true) {
      return
    }

    if (transformMode !== 'translate') {
      setTransformMode('translate')
    }
  }, [gizmoFixture, transformMode])

  useEffect(() => {
    const transformControls = transformControlsRef.current
    if (transformControls === null) {
      return
    }

    if (gizmoFixtureId === null) {
      transformControls.detach()
      if (transformControlsHelperRef.current !== null) {
        transformControlsHelperRef.current.visible = false
      }
      return
    }

    const visual = fixtureVisualsRef.current.get(gizmoFixtureId)
    if (visual === undefined) {
      transformControls.detach()
      if (transformControlsHelperRef.current !== null) {
        transformControlsHelperRef.current.visible = false
      }
      return
    }

    transformControls.attach(visual.root)
    if (transformControlsHelperRef.current !== null) {
      transformControlsHelperRef.current.visible = true
    }
  }, [gizmoFixtureId])

  useEffect(() => {
    const transformControls = transformControlsRef.current
    if (transformControls === null) {
      return
    }

    const snapWorld = stage.unit === 'm' ? 0.5 : 0.5 * METERS_PER_FOOT
    transformControls.setTranslationSnap(snapWorld)
    transformControls.setRotationSnap(THREE.MathUtils.degToRad(1))
  }, [stage.unit])

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
    const roomFogVolume = roomFogVolumeRef.current
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
      roomFogVolume === null ||
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
    const volumeWidth = room.enabled ? roomWidth : surfaceFloorWidth
    const volumeDepth = room.enabled ? roomDepth : surfaceFloorDepth
    const volumeHeight = room.enabled
      ? roomHeight
      : Math.max(feetToWorld(28), stageHeight * 1.9)
    const volumeMinY = DANCE_FLOOR_Y
    const volumeMaxY = volumeMinY + volumeHeight

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
    roomFogVolume.scale.set(
      volumeWidth * 0.985,
      volumeHeight * 0.985,
      volumeDepth * 0.985
    )
    roomFogVolume.position.set(roomCenterX, volumeMinY + volumeHeight * 0.5, roomCenterZ)
    roomFogVolume.rotation.set(0, 0, 0)
    const fogMaterial = volumetricFogMaterialRef.current
    if (fogMaterial !== null) {
      const roomMinUniform = fogMaterial.uniforms.uRoomMin as
        | { value: THREE.Vector3 }
        | undefined
      const roomMaxUniform = fogMaterial.uniforms.uRoomMax as
        | { value: THREE.Vector3 }
        | undefined
      if (roomMinUniform !== undefined) {
        roomMinUniform.value.set(
          roomCenterX - volumeWidth * 0.5,
          volumeMinY,
          roomCenterZ - volumeDepth * 0.5
        )
      }
      if (roomMaxUniform !== undefined) {
        roomMaxUniform.value.set(
          roomCenterX + volumeWidth * 0.5,
          volumeMaxY,
          roomCenterZ + volumeDepth * 0.5
        )
      }
    }

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
    const roomFogVolume = roomFogVolumeRef.current
    const fogMaterial = volumetricFogMaterialRef.current
    if (roomFogVolume === null || fogMaterial === null) {
      return
    }

    const haze = clamp01(hazeAmount)
    const densityUniform = fogMaterial.uniforms.uDensity as
      | { value: number }
      | undefined
    if (densityUniform !== undefined) {
      // Calibrated for in-volume ray marching: visible shafts without over-filling the room.
      densityUniform.value = haze <= 0.0005 ? 0 : 0.045 + 0.56 * Math.pow(haze, 1.1)
    }
    roomFogVolume.visible = haze > 0.0005
  }, [hazeAmount, room.enabled])

  useEffect(() => {
    let cancelled = false

    const runFixturePreviewSyncPass = () => {
      if (cancelled) {
        return
      }
      const scene = sceneRef.current
      if (scene === null) return
      const previewParams =
        splitStatesRef.current[0]?.outputParams ??
        activeLightSceneRef.current?.splitScenes[0]?.baseParams ??
        ({} as Params)
      const splitScenes = activeLightSceneRef.current?.splitScenes ?? []
      previewTargetsRef.current = buildTargets(
        fixturesRef.current,
        previewParams,
        splitStatesRef.current,
        splitScenes,
        dmxOutByUniverseRef.current,
        floorSpecRef.current,
        stageHeightRef.current,
        masterRef.current,
        fixturePlacementDepthEnabledRef.current
      )
      const previewTargets = previewTargetsRef.current

      const visuals = fixtureVisualsRef.current
    const targetIds = new Set(previewTargets.map((target) => target.fixtureId))
    const collectFogLights =
      volumetricFogEnabledRef.current &&
      hazeAmountRef.current > 0.0005 &&
      startupReadyRef.current
    const fogLightSamples: VolumetricFogLightSample[] = []
    const pushFogLightSample = (sample: VolumetricFogLightSample, fallbackDir: THREE.Vector3) => {
      if (!Number.isFinite(sample.intensity) || !Number.isFinite(sample.range)) {
        return
      }
      if (sample.intensity <= 0.0001 || sample.range <= 0.001) {
        return
      }
      if (!Number.isFinite(sample.coneCos)) {
        return
      }
      if (!isFiniteVector3(sample.position)) {
        return
      }
      if (!isFiniteColor(sample.color)) {
        return
      }
      const safeDirection = normalizeOrFallback(sample.direction, fallbackDir)
      fogLightSamples.push({
        ...sample,
        direction: safeDirection,
        intensity: clamp(sample.intensity, 0, 22),
        range: clamp(sample.range, feetToWorld(3), feetToWorld(520)),
        coneCos: clamp(sample.coneCos, -1, 1),
      })
    }
    let createdVisualsThisPass = 0

    for (const [fixtureId, visual] of visuals.entries()) {
      if (!targetIds.has(fixtureId)) {
        scene.remove(visual.root)
        disposeVisual(visual)
        visuals.delete(fixtureId)
      }
    }

    const fogOrdinalStride = 1 << 20
    const fogOrdinalBase = (fixtureOrderIndex: number) =>
      fixtureOrderIndex * fogOrdinalStride
    const fogOrdinalEmitterChannel = (
      fixtureOrderIndex: number,
      emitterIndex: number,
      channel: 0 | 1 | 2
    ) => fogOrdinalBase(fixtureOrderIndex) + emitterIndex * 8 + channel
    const fogOrdinalLedAggregate = (fixtureOrderIndex: number) =>
      fogOrdinalBase(fixtureOrderIndex) + fogOrdinalStride - 1

    for (let fixtureOrderIndex = 0; fixtureOrderIndex < previewTargets.length; fixtureOrderIndex++) {
      const target = previewTargets[fixtureOrderIndex]!
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
        if (createdVisualsThisPass >= MAX_VISUAL_CREATIONS_PER_SYNC) {
          continue
        }
        createdVisualsThisPass += 1
        visual = createFixtureVisual(target)
        const emitterMeshes = new Set(visual.emitters)
        visual.root.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = !emitterMeshes.has(object)
            object.receiveShadow = false
          }
        })
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
      if (fixtureVisual.mountGroup) {
        fixtureVisual.mountGroup.rotation.z = target.mountInverted ? Math.PI : 0
      }

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
      let ledWeightSum = 0
      let ledColorR = 0
      let ledColorG = 0
      let ledColorB = 0
      let ledPosX = 0
      let ledPosY = 0
      let ledPosZ = 0
      fixtureVisual.root.updateWorldMatrix(true, true)

      target.emitters.forEach((emitterTarget, emitterIndex) => {
        const emitterMesh = fixtureVisual.emitters[emitterIndex]
        if (emitterMesh === undefined) {
          return
        }
        const beamMesh = fixtureVisual.beamMeshes[emitterIndex]
        const surfaceSplat = fixtureVisual.surfaceSplats[emitterIndex]

        const material = emitterMesh.material as THREE.MeshStandardMaterial
        const emitterIntensity = clamp01(emitterTarget.intensity)
        const emitterEffectIntensity = clamp01(emitterTarget.effectIntensity)
        const visualIntensity = target.isLedFixture
          ? Math.pow(emitterIntensity, 0.62)
          : Math.pow(emitterIntensity, 0.86)
        material.color.copy(emitterTarget.color)
        const colorFloor = target.isLedFixture ? 0.1 : 0
        material.color.multiplyScalar(
          colorFloor + visualIntensity * (1 - colorFloor)
        )
        material.emissive.copy(emitterTarget.color)
        const hazeBoost = 1 + hazeAmountRef.current * 0.9
        material.emissiveIntensity = target.isLedFixture
          ? visualIntensity * LED_EMISSIVE_GAIN
          : visualIntensity * 9.2 * hazeBoost
        if (target.modelKind === 'atmosphericFx') {
          emitterMesh.visible = emitterIntensity > 0.0005
        } else {
          emitterMesh.visible = true
        }

        if (target.isLedFixture) {
          if (beamMesh !== undefined) {
            beamMesh.visible = false
          }
          if (surfaceSplat !== undefined) {
            surfaceSplat.visible = false
          }
          emitterMesh.position.set(
            emitterTarget.localX,
            emitterTarget.localY,
            emitterTarget.localZ
          )
          emitterMesh.rotation.set(0, 0, 0)
          const glowShell = emitterMesh.children.find(
            (child) =>
              child instanceof THREE.Mesh &&
              (child.userData as { ledGlow?: boolean }).ledGlow === true
          ) as THREE.Mesh | undefined
          if (
            glowShell !== undefined &&
            glowShell.material instanceof THREE.MeshBasicMaterial
          ) {
            glowShell.material.color.copy(emitterTarget.color)
            glowShell.material.opacity = clamp(
              Math.pow(visualIntensity, 0.68) * (0.22 + hazeAmountRef.current * 0.18),
              0,
              0.75
            )
          }
          const ledWeight = emitterIntensity
          if (ledWeight > 0.0001) {
            ledWeightSum += ledWeight
            ledColorR += emitterTarget.color.r * ledWeight
            ledColorG += emitterTarget.color.g * ledWeight
            ledColorB += emitterTarget.color.b * ledWeight
            ledPosX += emitterTarget.localX * ledWeight
            ledPosY += emitterTarget.localY * ledWeight
            ledPosZ += emitterTarget.localZ * ledWeight
          }
          const light = fixtureVisual.emitterLights[emitterIndex]
          if (light instanceof THREE.RectAreaLight) {
            light.position.copy(emitterMesh.position)
            light.rotation.x = -Math.PI / 2
            light.color.copy(emitterTarget.color)
            light.intensity = clamp(emitterIntensity * 10, 0, 18)
            light.width = 0.06 + emitterIntensity * 0.28
            light.height = 0.06 + emitterIntensity * 0.28
            light.visible = emitterIntensity > 0.0005
            if (collectFogLights && light.visible) {
              const worldPos = light.getWorldPosition(new THREE.Vector3())
              const worldDir = new THREE.Vector3(0, 0, 1).applyQuaternion(
                light.getWorldQuaternion(new THREE.Quaternion())
              )
              pushFogLightSample({
                stableOrdinal: fogOrdinalEmitterChannel(
                  fixtureOrderIndex,
                  emitterIndex,
                  0
                ),
                position: worldPos,
                direction: worldDir,
                color: light.color.clone(),
                intensity: clamp(light.intensity * 0.22, 0, 5.6),
                range: feetToWorld(26),
                coneCos: -1,
                kind: 1,
              }, new THREE.Vector3(0, 0, 1))
            }
          }
          return
        }

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

        const atmosphericUp =
          target.modelKind === 'atmosphericFx' &&
          target.atmosphereNozzleDirection === 'up'
        emitterMesh.position.set(
          emitterX,
          target.modelKind === 'uplight' ? emitterY + emitterAttachOffset : emitterY,
          emitterZ
        )
        const localBeamDirection =
          target.modelKind === 'uplight' || atmosphericUp
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(0, 0, 1)
        emitterMesh.quaternion.setFromUnitVectors(
          LOCAL_AXIS_Y,
          localBeamDirection
        )
        const emitterParent = emitterMesh.parent
        let beamDirection = localBeamDirection.clone()
        if (emitterParent !== null) {
          const parentWorldQuat = emitterParent.getWorldQuaternion(new THREE.Quaternion())
          beamDirection = localBeamDirection
            .clone()
            .applyQuaternion(parentWorldQuat)
            .normalize()
        }
        const emitterWorld = emitterMesh.getWorldPosition(new THREE.Vector3())
        const emitterLight = fixtureVisual.emitterLights[emitterIndex]
        const emitterLightTarget = fixtureVisual.emitterLightTargets[emitterIndex]
        const emitterFillRect = fixtureVisual.emitterFillRects[emitterIndex]
        const atmosphereJet = fixtureVisual.atmosphereJets[emitterIndex]
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
            ? clamp((moverWashBaseAngle * focusScale) * 0.5, 4, 35)
            : target.modelKind === 'washBar'
            ? clamp((staticBeamAngle * focusScale) * 0.5, 6, 50)
            : target.modelKind === 'uplight'
            ? clamp((staticBeamAngle * focusScale) * 0.5, 10, 65)
            : target.modelKind === 'atmosphericFx'
            ? clamp((target.atmosphereNozzleDirection === 'up' ? 18 : 14) * focusScale, 4, 35)
            : 16
        if (isCloudModelKind(target.modelKind)) {
          halfAngleDeg = Math.min(25, halfAngleDeg)
        }
        const halfAngleRad = THREE.MathUtils.degToRad(halfAngleDeg)
        const defaultReach = feetToWorld(
          target.modelKind === 'washBar' || target.modelKind === 'moverWash'
            ? 160
            : target.modelKind === 'atmosphericFx'
            ? 40
            : 120
        )
        const surfaceHit =
          emitterIntensity > 0.0005
            ? nearestSurfaceHit(
                emitterWorld.clone().addScaledVector(beamDirection, 0.01),
                beamDirection,
                surfaceSpecRef.current
              )
            : undefined
        // Clip beam visuals/light reach to scene surfaces (floor, curtain, room bounds),
        // never to other fixture meshes.
        const coneLength = clamp(
          surfaceHit !== undefined
            ? surfaceHit.distance - 0.01
            : defaultReach,
          0.08,
          defaultReach
        )

        if (beamMesh !== undefined) {
          const beamMaterial = beamMesh.material as THREE.MeshBasicMaterial
          const haze = hazeAmountRef.current
          const beamRadius = Math.max(0.02, Math.tan(halfAngleRad) * coneLength)
          beamMesh.position.copy(emitterMesh.position)
          beamMesh.quaternion.setFromUnitVectors(
            LOCAL_AXIS_Z,
            localBeamDirection
          )
          beamMesh.scale.set(beamRadius, beamRadius, coneLength)
          beamMaterial.color.copy(emitterTarget.color)
          if (haze <= 0.0005 || emitterIntensity <= 0.0005) {
            beamMaterial.opacity = 0
            beamMesh.visible = false
          } else {
            const beamStrength =
              Math.pow(emitterIntensity, target.modelKind === 'moverSpot' ? 1.2 : 1.05) *
              Math.pow(haze, 1.08)
            beamMaterial.opacity = clamp(
              beamStrength *
                (target.modelKind === 'moverSpot' ? 1.05 : 0.84),
              0,
              0.9
            )
            beamMesh.visible = beamMaterial.opacity > 0.0025
          }
        }
        if (surfaceSplat !== undefined) {
          const splatMaterial = surfaceSplat.material as THREE.MeshBasicMaterial
          if (surfaceHit === undefined || emitterIntensity <= 0.0005) {
            splatMaterial.opacity = 0
            surfaceSplat.visible = false
          } else {
            const localPoint = fixtureVisual.root.worldToLocal(
              surfaceHit.point
                .clone()
                .addScaledVector(surfaceHit.normal, 0.0055)
            )
            const localNormal = surfaceHit.normal
              .clone()
              .applyQuaternion(rootInverseQuat)
              .normalize()
            surfaceSplat.position.copy(localPoint)
            surfaceSplat.quaternion.setFromUnitVectors(LOCAL_AXIS_Z, localNormal)
            const radius = clamp(
              Math.tan(halfAngleRad) * Math.max(0.08, surfaceHit.distance) * 1.05,
              0.07,
              feetToWorld(20)
            )
            surfaceSplat.scale.set(radius * 2, radius * 2, 1)
            splatMaterial.color.copy(emitterTarget.color)
            splatMaterial.opacity = clamp(
              Math.pow(emitterIntensity, 1.08) * 0.76,
              0,
              0.86
            )
            surfaceSplat.visible = splatMaterial.opacity > 0.003
          }
        }

        if (emitterLight instanceof THREE.SpotLight) {
          const horizontalSurfaceBoost = 1
          emitterLight.position.copy(emitterMesh.position)
          emitterLight.color.copy(emitterTarget.color)
          const baseSpotIntensity =
            target.modelKind === 'moverSpot'
              ? 98
              : target.modelKind === 'parCan'
              ? 82
              : target.modelKind === 'moverWash'
              ? 92
              : target.modelKind === 'washBar'
              ? 102
              : target.modelKind === 'uplight'
              ? 64
              : target.modelKind === 'atmosphericFx'
              ? 42
              : 78
          const targetSpotIntensity = clamp(
            Math.pow(emitterIntensity, target.modelKind === 'moverSpot' ? 1.16 : 1.0) *
              baseSpotIntensity *
              horizontalSurfaceBoost,
            0,
            130
          )
          const smoothedSpotIntensity = smoothToward(
            (emitterLight.userData as { smoothIntensity?: number }).smoothIntensity,
            targetSpotIntensity,
            0.28
          )
          ;(emitterLight.userData as { smoothIntensity?: number }).smoothIntensity =
            smoothedSpotIntensity
          emitterLight.intensity = smoothedSpotIntensity
          const throwDistance = Math.max(defaultReach * 1.25, coneLength * 1.15)
          const targetDistance = clamp(throwDistance, feetToWorld(6), feetToWorld(520))
          const smoothedDistance = smoothToward(
            (emitterLight.userData as { smoothDistance?: number }).smoothDistance,
            targetDistance,
            0.24
          )
          ;(emitterLight.userData as { smoothDistance?: number }).smoothDistance =
            smoothedDistance
          emitterLight.distance = smoothedDistance
          const targetAngle = clamp(
            halfAngleRad,
            THREE.MathUtils.degToRad(2),
            THREE.MathUtils.degToRad(70)
          )
          const smoothedAngle = smoothToward(
            (emitterLight.userData as { smoothAngle?: number }).smoothAngle,
            targetAngle,
            0.25
          )
          ;(emitterLight.userData as { smoothAngle?: number }).smoothAngle =
            smoothedAngle
          emitterLight.angle = smoothedAngle
          emitterLight.penumbra =
            target.modelKind === 'moverSpot' || target.modelKind === 'parCan'
              ? 0.18
              : 0.74
          emitterLight.decay = 0.9
          emitterLight.visible = emitterIntensity > 0.0005

          if (emitterLightTarget !== undefined) {
            const localTarget = emitterMesh.position
              .clone()
              .addScaledVector(localBeamDirection, coneLength)
            emitterLightTarget.position.copy(localTarget)
          }

          const spotWithMap = emitterLight as THREE.SpotLight & {
            map?: THREE.Texture | null
          }
          if (
            (target.modelKind === 'moverSpot' || target.modelKind === 'parCan') &&
            target.goboIndex !== undefined
          ) {
            spotWithMap.map =
              goboTextureForIndex(target.goboIndex)
          } else {
            spotWithMap.map = null
          }
          if (collectFogLights && emitterLight.visible) {
            pushFogLightSample({
              stableOrdinal: fogOrdinalEmitterChannel(
                fixtureOrderIndex,
                emitterIndex,
                1
              ),
              position: emitterWorld.clone(),
              direction: beamDirection.clone(),
              color: emitterLight.color.clone(),
              intensity: clamp(emitterLight.intensity * 0.7, 0, 28),
              range: Math.max(feetToWorld(24), emitterLight.distance * 1.2),
              coneCos: Math.cos(emitterLight.angle),
              kind: 0,
            }, beamDirection)
          }
        }

        if (atmosphereJet instanceof THREE.Points) {
          const pointsMaterial = atmosphereJet.material as THREE.PointsMaterial
          const geometry = atmosphereJet.geometry
          const positions = geometry.getAttribute('position') as THREE.BufferAttribute
          const seeds = geometry.getAttribute('seed') as THREE.BufferAttribute | undefined
          const effect = target.atmosphereEffect
          const particleCount = positions.count
          const now = performance.now() * 0.001
          const jetLength =
            effect === 'co2' ? 2.4 : effect === 'flame' ? 1.6 : effect === 'haze' ? 1.4 : 1.9
          const spread =
            effect === 'confetti'
              ? 0.32
              : effect === 'bubble'
              ? 0.24
              : effect === 'flame'
              ? 0.12
              : 0.18
          for (let particleIndex = 0; particleIndex < particleCount; particleIndex++) {
            const seed = seeds ? seeds.getX(particleIndex) : 0.5
            const phase = (now * (0.8 + seed * 1.6) + particleIndex * 0.13) % 1
            const distance = phase * jetLength
            const angle = seed * Math.PI * 2 + now * (effect === 'confetti' ? 2.2 : 0.45)
            const radial = spread * (0.1 + seed * 0.9) * (effect === 'haze' ? 0.55 : 1)
            const localX = Math.cos(angle) * radial * phase
            const localY =
              localBeamDirection.y > 0.5
                ? distance
                : Math.sin(angle * 1.5) * radial * 0.3
            const localZ =
              localBeamDirection.z > 0.5
                ? distance
                : Math.sin(angle) * radial
            positions.setXYZ(particleIndex, localX, localY, localZ)
          }
          positions.needsUpdate = true
          atmosphereJet.position.copy(emitterMesh.position)
          atmosphereJet.quaternion.setFromUnitVectors(LOCAL_AXIS_Y, localBeamDirection)
          pointsMaterial.color.copy(emitterTarget.color)
          pointsMaterial.opacity = clamp(
            Math.pow(emitterEffectIntensity, 0.9) * (effect === 'haze' ? 0.28 : 0.58),
            0,
            0.85
          )
          if (effect === 'flame') {
            pointsMaterial.color.lerp(new THREE.Color('#ff7a1a'), 0.55)
          } else if (effect === 'bubble') {
            pointsMaterial.color.lerp(new THREE.Color('#d5efff'), 0.7)
          } else if (effect === 'confetti') {
            const hueShift = (emitterIndex * 0.13 + now * 0.2) % 1
            pointsMaterial.color.offsetHSL(hueShift * 0.2, 0.05, 0.05)
          }
          atmosphereJet.visible =
            emitterEffectIntensity > 0.0005 && pointsMaterial.opacity > 0.003
        }

        if (emitterFillRect instanceof THREE.RectAreaLight) {
          const horizontalSurfaceBoost = 1
          emitterFillRect.position.copy(emitterMesh.position)
          emitterFillRect.quaternion.setFromUnitVectors(
            // RectAreaLight emits along its local -Z axis. Map that axis to beam
            // direction so radiant fill is emitted forward from the fixture face.
            LOCAL_AXIS_NEG_Z,
            localBeamDirection
          )
          emitterFillRect.color.copy(emitterTarget.color)
          const targetFillIntensity = clamp(
            emitterIntensity *
              (target.modelKind === 'washBar'
                ? 64
                : target.modelKind === 'moverWash'
                ? 56
                : 46) *
              horizontalSurfaceBoost,
            0,
            52
          )
          const smoothedFillIntensity = smoothToward(
            (emitterFillRect.userData as { smoothIntensity?: number }).smoothIntensity,
            targetFillIntensity,
            0.22
          )
          ;(emitterFillRect.userData as { smoothIntensity?: number }).smoothIntensity =
            smoothedFillIntensity
          emitterFillRect.intensity = smoothedFillIntensity
          emitterFillRect.width = target.modelKind === 'washBar' ? 0.38 : 0.24
          emitterFillRect.height = target.modelKind === 'washBar' ? 0.24 : 0.16
          emitterFillRect.visible = emitterIntensity > 0.0005
          if (collectFogLights && emitterFillRect.visible) {
            const fillWorldPos = emitterFillRect.getWorldPosition(new THREE.Vector3())
            const fillWorldDir = LOCAL_AXIS_NEG_Z.clone().applyQuaternion(
              emitterFillRect.getWorldQuaternion(new THREE.Quaternion())
            ).normalize()
            pushFogLightSample({
              stableOrdinal: fogOrdinalEmitterChannel(
                fixtureOrderIndex,
                emitterIndex,
                2
              ),
              position: fillWorldPos,
              direction: fillWorldDir,
              color: emitterFillRect.color.clone(),
              intensity: clamp(emitterFillRect.intensity * 0.34, 0, 8),
              range: feetToWorld(target.modelKind === 'moverWash' ? 130 : 110),
              coneCos: -1,
              kind: 1,
            }, fillWorldDir)
          }
        }
        if (target.modelKind === 'moverSpot' && emitterIndex === 0) {
          primaryMoverSpot.intensity = emitterIntensity
          primaryMoverSpot.radius = Math.tan(halfAngleRad) * coneLength
          primaryMoverSpot.hit = surfaceHit
        }
        return
      })

      if (target.isLedFixture && fixtureVisual.ledAggregateLight !== undefined) {
        const aggregateLight = fixtureVisual.ledAggregateLight
        const aggregateTarget = fixtureVisual.ledAggregateTarget
        if (ledWeightSum > 0.0001) {
          const centroid = new THREE.Vector3(
            ledPosX / ledWeightSum,
            ledPosY / ledWeightSum,
            ledPosZ / ledWeightSum
          )
          aggregateLight.position.set(
            centroid.x,
            centroid.y,
            centroid.z
          )
          aggregateLight.color.setRGB(
            ledColorR / ledWeightSum,
            ledColorG / ledWeightSum,
            ledColorB / ledWeightSum
          )
          const normalizedEnergy = clamp(
            ledWeightSum / Math.max(1, target.emitters.length),
            0,
            1
          )
          const targetAggregateIntensity = clamp(
            Math.pow(normalizedEnergy, 0.9) * LED_AGGREGATE_LIGHT_GAIN,
            0,
            12.5
          )
          const smoothedAggregateIntensity = smoothToward(
            (aggregateLight.userData as { smoothIntensity?: number }).smoothIntensity,
            targetAggregateIntensity,
            0.2
          )
          ;(aggregateLight.userData as { smoothIntensity?: number }).smoothIntensity =
            smoothedAggregateIntensity
          aggregateLight.intensity = smoothedAggregateIntensity
          aggregateLight.distance = feetToWorld(16)
          aggregateLight.angle = THREE.MathUtils.degToRad(28)
          aggregateLight.penumbra = 0.56
          if (aggregateTarget !== undefined) {
            aggregateTarget.position.set(
              centroid.x,
              centroid.y,
              centroid.z + Math.max(0.4, target.modelWidth * 1.1)
            )
          }
          aggregateLight.visible = aggregateLight.intensity > 0.0005
          if (collectFogLights && aggregateLight.visible) {
            const aggregateDirection =
              aggregateTarget !== undefined
                ? aggregateTarget
                    .getWorldPosition(new THREE.Vector3())
                    .sub(aggregateLight.getWorldPosition(new THREE.Vector3()))
                    .normalize()
                : new THREE.Vector3(0, 0, 1).applyQuaternion(
                    fixtureVisual.root.getWorldQuaternion(new THREE.Quaternion())
                  )
            pushFogLightSample({
              stableOrdinal: fogOrdinalLedAggregate(fixtureOrderIndex),
              position: aggregateLight.getWorldPosition(new THREE.Vector3()),
              direction: aggregateDirection,
              color: aggregateLight.color.clone(),
              intensity: clamp(aggregateLight.intensity * LED_AGGREGATE_FOG_GAIN, 0, 16),
              range: aggregateLight.distance,
              coneCos: Math.cos(aggregateLight.angle),
              kind: 0,
            }, new THREE.Vector3(0, 0, 1))
          }
        } else {
          aggregateLight.visible = false
        }
      }

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
    const totalVisualTargets = previewTargets.length
    const warmupProgress =
      totalVisualTargets <= 0
        ? 1
        : clamp(visuals.size / totalVisualTargets, 0, 1)
    if (
      Math.abs(warmupProgress - startupProgressRef.current) >= 0.02 ||
      warmupProgress <= 0.001 ||
      warmupProgress >= 0.999
    ) {
      startupProgressRef.current = warmupProgress
      setStartupBusyProgress(warmupProgress)
    }
    if (warmupProgress >= 0.999) {
      startupReadyRef.current = true
      if (startupReadyAtRef.current === null) {
        startupReadyAtRef.current = performance.now()
      }
      setStartupBusyPhase('settling')
    }

    const fogMaterial = volumetricFogMaterialRef.current
    if (fogMaterial !== null) {
      const lightCountUniform = fogMaterial.uniforms.uLightCount as
        | { value: number }
        | undefined
      const posUniform = fogMaterial.uniforms.uLightPos as
        | { value: THREE.Vector3[] }
        | undefined
      const dirUniform = fogMaterial.uniforms.uLightDir as
        | { value: THREE.Vector3[] }
        | undefined
      const colorUniform = fogMaterial.uniforms.uLightColor as
        | { value: THREE.Vector3[] }
        | undefined
      const paramsUniform = fogMaterial.uniforms.uLightParams as
        | { value: THREE.Vector4[] }
        | undefined

      if (
        lightCountUniform !== undefined &&
        posUniform !== undefined &&
        dirUniform !== undefined &&
        colorUniform !== undefined &&
        paramsUniform !== undefined
      ) {
        const sorted = fogLightSamples
          .filter((sample) => sample.intensity > 0.0001 && sample.range > 0.001)
          .sort((left, right) => left.stableOrdinal - right.stableOrdinal)
        const maxLights = Math.min(
          volumetricFogMaxLightsRef.current,
          posUniform.value.length,
          dirUniform.value.length,
          colorUniform.value.length,
          paramsUniform.value.length
        )
        const count = Math.min(sorted.length, maxLights)
        for (let index = 0; index < count; index++) {
          const sample = sorted[index]
          const prevPos = posUniform.value[index]
          const prevDir = dirUniform.value[index]
          const prevColor = colorUniform.value[index]
          const prevParams = paramsUniform.value[index]
          prevPos.lerp(sample.position, 0.34)

          const blendedDir = prevDir.clone().lerp(sample.direction, 0.42)
          prevDir.copy(normalizeOrFallback(blendedDir, sample.direction))
          prevColor.lerp(
            new THREE.Vector3(sample.color.r, sample.color.g, sample.color.b),
            0.42
          )
          prevParams.set(
            lerp(prevParams.x, sample.intensity, 0.3),
            lerp(prevParams.y, sample.range, 0.3),
            lerp(prevParams.z, sample.coneCos, 0.4),
            sample.kind
          )
        }
        for (let index = count; index < maxLights; index++) {
          const prevPos = posUniform.value[index]
          const prevDir = dirUniform.value[index]
          const prevColor = colorUniform.value[index]
          const prevParams = paramsUniform.value[index]
          prevPos.multiplyScalar(0.98)
          prevDir.copy(normalizeOrFallback(prevDir, new THREE.Vector3(0, -1, 0)))
          prevColor.multiplyScalar(0.9)
          prevParams.set(
            lerp(prevParams.x, 0, 0.2),
            lerp(prevParams.y, feetToWorld(3), 0.2),
            lerp(prevParams.z, -1, 0.2),
            0
          )
        }
        lightCountUniform.value = count
      }
    }

      const gizmoId = gizmoFixtureIdRef.current
      const transformControls = transformControlsRef.current
      if (gizmoId !== null && transformControls !== null) {
        const visual = fixtureVisualsRef.current.get(gizmoId)
        if (visual !== undefined && transformControls.object !== visual.root) {
          transformControls.attach(visual.root)
        }
      }
    }

    previewSyncPassRef.current = runFixturePreviewSyncPass
    runFixturePreviewSyncPass()
    lastPreviewSyncAtRef.current = performance.now()
    return () => {
      cancelled = true
      previewSyncPassRef.current = () => {}
    }
  }, [])

  return (
    <Root>
      <Hint>
        Left click selects fixtures. Right click a fixture to show and toggle
        Move/Rotate gizmo mode (movers are move-only). Left or right click away
        from fixtures hides the gizmo. Keyboard: `W/A/S/D` walk, `Shift` speed,
        `Q` move gizmo, `E` rotate gizmo. Alt+Shift+H toggles a live performance HUD
        (FPS, frame ms, draw calls, heap).
      </Hint>
      <CanvasShell>
        <ModeBadge>
          Gizmo:{' '}
          {gizmoFixture === null
            ? 'Hidden'
            : gizmoFixture.isMover
            ? 'Move (Mover Rotation Locked)'
            : transformMode === 'translate'
            ? 'Move'
            : 'Rotate'}
        </ModeBadge>
        {gizmoFixture?.isMover && gizmoFixtureId !== null && (
          <MountToggleButton
            type="button"
            onClick={() =>
              onSetFixtureMountOrientation(
                gizmoFixtureId,
                gizmoFixture.moverMountOrientation === 'inverted'
                  ? 'upright'
                  : 'inverted'
              )
            }
            title="Toggle mover mount orientation"
          >
            Mount: {gizmoFixture.moverMountOrientation === 'inverted' ? 'Hung' : 'Upright'}
          </MountToggleButton>
        )}
        <HomeButton
          type="button"
          title="Reset camera to default view"
          onClick={resetView}
        >
          Home
        </HomeButton>
        {perfHudOpen ? (
          <PerfHud ref={perfHudTextRef} aria-live="polite" />
        ) : null}
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
        {hoverInfo && (
          <FixtureTooltip
            style={{
              left: `${hoverInfo.clientX + 12}px`,
              top: `${hoverInfo.clientY + 12}px`,
            }}
          >
            <div>{hoverInfo.fixtureName}</div>
            <TooltipSub>{hoverInfo.fixtureLabel}</TooltipSub>
          </FixtureTooltip>
      )}
        <CanvasHost ref={mountRef} />
      </CanvasShell>
      <BusyModal
        open={startupBusyVisible}
        title="Preparing Lighting 3D Preview"
        message={
          startupBusyPhase === 'settling'
            ? 'Finalizing renderer and stabilizing lighting...'
            : 'Building fixture visuals and lighting...'
        }
        progress={startupBusyProgress}
      />
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
`

const ExternalViewportCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  flex: 1 1 auto;
  min-height: 12rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.85rem;
  box-sizing: border-box;
`

const ExternalViewportTitle = styled.div`
  font-size: 0.88rem;
  font-weight: 700;
`

const ExternalViewportBody = styled.div`
  font-size: 0.78rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ExternalViewportButton = styled.button`
  width: fit-content;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.darker};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.3rem;
  padding: 0.35rem 0.55rem;
  cursor: pointer;
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

const PerfHud = styled.pre`
  position: absolute;
  left: 0.35rem;
  top: 2.35rem;
  z-index: 5;
  margin: 0;
  padding: 0.35rem 0.45rem;
  font-size: 0.58rem;
  line-height: 1.38;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    monospace;
  color: #e8f0ff;
  background: #0a1020d8;
  border: 1px solid #ffffff55;
  border-radius: 0.25rem;
  max-width: min(24rem, 94vw);
  pointer-events: none;
  white-space: pre;
  text-align: left;
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

const ModeBadge = styled.div`
  position: absolute;
  top: 0.45rem;
  left: 0.55rem;
  z-index: 2;
  border: 1px solid #ffffff4d;
  background: #101521d0;
  color: #dfe9ff;
  border-radius: 0.3rem;
  font-size: 0.66rem;
  padding: 0.18rem 0.42rem;
  pointer-events: none;
`

const MountToggleButton = styled.button`
  position: absolute;
  top: 2.05rem;
  left: 0.55rem;
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

const FixtureTooltip = styled.div`
  position: fixed;
  z-index: 4;
  pointer-events: none;
  border: 1px solid #ffffff40;
  background: #111826eb;
  color: #e9f1ff;
  border-radius: 0.3rem;
  padding: 0.26rem 0.36rem;
  font-size: 0.7rem;
  max-width: 18rem;
`

const TooltipSub = styled.div`
  color: #b7c4df;
  font-size: 0.65rem;
`























