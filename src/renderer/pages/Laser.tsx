import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BoltIcon from '@mui/icons-material/Bolt'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useTypedSelector } from '../redux/store'
import { useOutputParam, useRealtimeSelector } from '../redux/realtimeStore'
import { setBaseParams } from '../redux/controlSlice'
import {
  laserDacConnectRequest,
  laserDacDisconnectRequest,
  laserDacGetStatus,
  sendLaserDacPushFrame,
  send_open_page_window,
} from '../ipcHandler'
import {
  buildLaserOutputPushes,
  buildSplitPinFromParams,
  type LaserFixtureSceneContext,
} from '../laser/laserMultiFixtureOutput'
import { findLaserGroupSplitIndex } from '../laser/laserSplitLink'
import { resolveRoutesForGroup } from '../laser/laserGroupState'
import { useActiveLightScene } from '../redux/store'
import LaserZoningModal from '../laser/LaserZoningModal'
import {
  createUnassignedRoute,
  dacSessionId,
  nodeSessionId,
  type LaserDacProfile,
  type LaserFixtureOutputRoute,
  type LaserNetworkNode,
} from '../../shared/laserFixtureRouting'
import LaserEditorCanvas from '../laser/LaserEditorCanvas'
import LaserSceneStrip, { createEmptyLaserScene } from '../laser/LaserSceneStrip'
import LaserSvgImportDialog from '../laser/LaserSvgImportDialog'
import LaserGradientModal from '../laser/LaserGradientModal'
import LaserEditorParametersPanel from '../laser/LaserEditorParametersPanel'
import LaserArmHoldButton from '../laser/LaserArmHoldButton'
import ToggleSwitch from '../base/ToggleSwitch'
import type {
  BeamGradientStop,
  LaserPresetLayerOverride,
  LaserScene,
  LaserTool,
  LaserShapeLayer,
} from '../laser/laserEditorTypes'
import type { LaserSceneGridLayout } from '../laser/laserSceneGridLayout'
import {
  LASER_CANVAS_MIN_HEIGHT_REM,
  LASER_CANVAS_MIN_WIDTH_REM,
  LASER_CENTER_COLUMN_MIN_WIDTH_REM,
  LASER_SCENE_STRIP_MIN_HEIGHT_PX,
  LASER_SIDE_PANEL_MAX_WIDTH_REM,
  LASER_SIDE_PANEL_MIN_WIDTH_REM,
  LASER_WORKSPACE_MIN_HEIGHT_PX,
  LASER_WORKSPACE_MIN_WIDTH_PX,
} from '../laser/laserLayoutConstants'
import { sceneHasAnimatedContent } from '../laser/laserEditorSceneUtils'
import { DEFAULT_LASER_RGB_CAPABILITIES } from '../laser/laserBeamColor'
import { clamp01, motionPathDisplacement01, pathHueOffset01 } from '../laser/laserAnimationPath'
import { splitPadRectToCanvasMask } from '../laser/laserViewportMask'
import { isNewPeriod } from '../../shared/TimeState'
import { randomElementExcludeCurrent } from '../../shared/util'
import LaserSkyModePanel from '../laser/LaserSkyModePanel'
import { getLaserSceneDisplayLayers } from '../laser/laserSceneDisplay'
import { useLaserGroupController } from '../laser/useLaserGroupController'
import type { LaserParamBindingId } from '../laser/laserSplitLink'
import type { LaserParamRouteMode } from '../laser/laserGroupState'
import { useLaserPageStore } from '../laser/useLaserPageStore'
import LaserZoneCanvasOverlay from '../laser/LaserZoneCanvasOverlay'
import LaserConnectionPanel from '../laser/LaserConnectionPanel'
import { collectRequiredLaserSessions } from '../laser/laserSessionConnect'
import type { LaserFixtureUnitState } from '../laser/laserProjectState'

/** Fixed DAC stream defaults (no longer exposed in the Laser UI footer). */
const LASER_DAC_DEFAULT_SCAN_RATE_PPS = 30000
const LASER_DAC_DEFAULT_OUTPUT_POWER = 75

interface LaserAlphaPageProps {
  standalone?: boolean
}

type LaserUnit = LaserFixtureUnitState

export function LaserAlphaPage({ standalone = false }: LaserAlphaPageProps) {
  const dispatch = useDispatch()
  const {
    laser,
    setDacProfiles,
    setActiveDacProfileId,
    setNetworkNodes,
    patchUnit,
    setSelectedUnitId,
    setLaserScenes,
    setLaserScenePage,
    setSceneStripHeightPx,
    setEnableProjectionMask,
    setAudienceScanGate,
    setShowZonePreview,
    addUnit,
    removeUnit,
    addDacProfile,
    addNetworkNode,
  } = useLaserPageStore()

  const {
    dacProfiles,
    activeDacProfileId,
    networkNodes,
    units,
    selectedUnitId,
    laserScenes,
    laserScenePage,
    sceneStripHeightPx,
    enableProjectionMask,
    audienceScanGate,
    showZonePreview,
  } = laser

  const [isConnected, setIsConnected] = useState(false)
  const [dacConnectionNote, setDacConnectionNote] = useState('')
  const [safetyArmed, setSafetyArmed] = useState(false)
  const [selectedTool, setSelectedTool] = useState<LaserTool>('line')
  const laserToolMidiRequest = useTypedSelector((s) => s.gui.laserToolMidiRequest)

  useEffect(() => {
    if (!laserToolMidiRequest) return
    setSelectedTool(laserToolMidiRequest.tool)
  }, [laserToolMidiRequest?.nonce, laserToolMidiRequest?.tool])
  const [laserSceneGridLayout, setLaserSceneGridLayout] =
    useState<LaserSceneGridLayout>({ cols: 4, rows: 2, perPage: 8 })
  const [ildaSelectedLayerId, setIldaSelectedLayerId] = useState<string | null>(null)
  const [svgImportOpen, setSvgImportOpen] = useState(false)
  const [animPlaying, setAnimPlaying] = useState(false)
  const [textFontDefault, setTextFontDefault] = useState('system-ui, sans-serif')
  const [textDraft, setTextDraft] = useState('')
  const [lineColor, setLineColor] = useState('#00ff88')
  const [beamStrokeMode, setBeamStrokeMode] = useState<
    'solid' | 'gradient' | 'rainbow'
  >('solid')
  const [beamGradientStops, setBeamGradientStops] = useState<BeamGradientStop[]>(
    [
      { offset: 0, color: '#ff3030' },
      { offset: 1, color: '#30ff90' },
    ]
  )
  const [rainbowCycles, setRainbowCycles] = useState(1.25)
  const prevBeamStrokeMode = useRef(beamStrokeMode)
  const [gradientModalOpen, setGradientModalOpen] = useState(false)
  const [zoningModalOpen, setZoningModalOpen] = useState(false)
  const [connectedSessionIds, setConnectedSessionIds] = useState<string[]>([])

  const groupNames = useMemo(() => {
    const names = new Set<string>()
    for (const unit of units) {
      if (unit.group.trim().length > 0) {
        names.add(unit.group.trim())
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [units])

  const groupCtrl = useLaserGroupController(groupNames)
  const {
    activeLaserGroup,
    setActiveLaserGroup,
    laserSplitIndex,
    activeSceneId: activeLaserSceneId,
    setActiveSceneId: setActiveLaserSceneId,
    groupSlots,
    setGroupLatchedScene,
    routes,
    setRoutes,
    setRouteMode,
  } = groupCtrl

  const {
    dotDensityRoute,
    scanMotionRoute,
    beamColorRoute,
    playbackSpeedRoute,
    animationProgressRoute,
    manualDotSamples,
    scanPathPhase01,
    animSpeed,
    animationProgress01,
  } = routes

  const activeDacProfile = useMemo(
    () =>
      dacProfiles.find((p) => p.id === activeDacProfileId) ?? dacProfiles[0]!,
    [dacProfiles, activeDacProfileId]
  )

  const lightScene = useActiveLightScene((s) => s)

  const setManualDotSamples = (v: number) =>
    setRoutes((p) => ({ ...p, manualDotSamples: v }))
  const setScanPathPhase01 = (v: number) =>
    setRoutes((p) => ({ ...p, scanPathPhase01: v }))
  const setAnimSpeed = (v: number) => setRoutes((p) => ({ ...p, animSpeed: v }))
  const setAnimationProgress01 = (
    v: number | ((prev: number) => number)
  ) =>
    setRoutes((p) => ({
      ...p,
      animationProgress01:
        typeof v === 'function' ? v(p.animationProgress01) : v,
    }))

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) ?? null,
    [selectedUnitId, units]
  )
  const activeLaserScene = useMemo(
    () => laserScenes.find((s) => s.id === activeLaserSceneId) ?? null,
    [laserScenes, activeLaserSceneId]
  )
  const laserScenesPerPage = laserSceneGridLayout.perPage

  const linkSplitIx = laserSplitIndex >= 0 ? laserSplitIndex : 0

  const refreshDacSessions = useCallback(async () => {
    const st = await laserDacGetStatus()
    if (st === null) {
      setConnectedSessionIds([])
      setIsConnected(false)
      return
    }
    const ids = (st.sessions ?? [])
      .filter((s) => s.connected)
      .map((s) => s.sessionId)
    setConnectedSessionIds(ids)
    setIsConnected(ids.length > 0)
  }, [])

  useEffect(() => {
    void refreshDacSessions()
  }, [refreshDacSessions])

  const connectDacProfile = useCallback(
    async (profile: LaserDacProfile) => {
      const sid = dacSessionId(profile.id)
      const res = await laserDacConnectRequest({
        protocol: profile.outputProtocol,
        backend: profile.backend,
        target: profile.connectionTarget,
        sessionId: sid,
      })
      setDacConnectionNote(
        res.message ?? (res.ok ? `Connected ${profile.name}.` : 'Connect failed.')
      )
      await refreshDacSessions()
    },
    [refreshDacSessions]
  )

  const connectNetworkNode = useCallback(
    async (node: LaserNetworkNode) => {
      const sid = nodeSessionId(node.id)
      const res = await laserDacConnectRequest({
        protocol: node.outputProtocol,
        backend: node.backend,
        target: node.connectionTarget,
        sessionId: sid,
      })
      setDacConnectionNote(
        res.message ?? (res.ok ? `Connected ${node.name}.` : 'Connect failed.')
      )
      await refreshDacSessions()
    },
    [refreshDacSessions]
  )

  const disconnectSession = useCallback(
    async (sessionId?: string) => {
      await laserDacDisconnectRequest(sessionId)
      setDacConnectionNote(
        sessionId ? `Disconnected ${sessionId}.` : 'All sessions disconnected.'
      )
      await refreshDacSessions()
    },
    [refreshDacSessions]
  )

  const highlightZoneId = useMemo(() => {
    const route = selectedUnit?.outputRoute
    return route?.kind === 'dac_zone' ? route.zoneId : null
  }, [selectedUnit?.outputRoute])

  useEffect(() => {
    if (!safetyArmed) return
    void (async () => {
      const required = collectRequiredLaserSessions(units, dacProfiles)
      for (const req of required) {
        if (connectedSessionIds.includes(req.sessionId)) continue
        if (req.kind === 'dac' && req.dacProfile) {
          await connectDacProfile(req.dacProfile)
        } else if (req.kind === 'node' && req.nodeId) {
          const node = networkNodes.find((n) => n.id === req.nodeId)
          if (node) await connectNetworkNode(node)
        }
      }
    })()
  }, [safetyArmed])

  const zoneFixtureLabels = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const u of units) {
      if (u.outputRoute.kind !== 'dac_zone') continue
      const list = map[u.outputRoute.zoneId] ?? []
      list.push(u.name)
      map[u.outputRoute.zoneId] = list
    }
    return map
  }, [units])

  const editorLaserCaps = useMemo(
    () => selectedUnit?.laserChannels ?? DEFAULT_LASER_RGB_CAPABILITIES,
    [selectedUnit]
  )

  const splitDotDensity = useOutputParam('laserDotDensity', linkSplitIx)
  const splitScanPath = useOutputParam('laserScanPath', linkSplitIx)
  const splitPlaybackSpeed = useOutputParam('laserPlaybackSpeed', linkSplitIx)
  const splitAnimProgress = useOutputParam('laserAnimProgress', linkSplitIx)
  const splitBeamHue = useOutputParam('laserBeamHue', linkSplitIx)
  const splitXOut = useOutputParam('x', linkSplitIx)
  const splitYOut = useOutputParam('y', linkSplitIx)
  const splitWOut = useOutputParam('width', linkSplitIx)
  const splitHOut = useOutputParam('height', linkSplitIx)

  const samplesLinked = useMemo(() => {
    if (dotDensityRoute === 'manual') return manualDotSamples
    return Math.round(32 + clamp01(splitDotDensity) * (520 - 32))
  }, [dotDensityRoute, manualDotSamples, splitDotDensity])

  const scanPhaseEffective = useMemo(() => {
    if (scanMotionRoute === 'manual') return scanPathPhase01
    return clamp01(splitScanPath)
  }, [scanMotionRoute, scanPathPhase01, splitScanPath])

  const effectiveAnimationProgress = useMemo(() => {
    if (animationProgressRoute === 'split') return clamp01(splitAnimProgress)
    return clamp01(animationProgress01)
  }, [animationProgressRoute, animationProgress01, splitAnimProgress])

  const effectiveAnimSpeed = useMemo(() => {
    if (playbackSpeedRoute === 'manual') return animSpeed
    return 0.2 + clamp01(splitPlaybackSpeed) * 2.8
  }, [playbackSpeedRoute, animSpeed, splitPlaybackSpeed])

  const effectiveLineColor = useMemo(() => {
    if (beamColorRoute !== 'split' || beamStrokeMode !== 'solid') {
      return lineColor
    }
    const h = clamp01(splitBeamHue) * 360
    return `hsl(${h}, 88%, 52%)`
  }, [beamColorRoute, beamStrokeMode, lineColor, splitBeamHue])

  const sceneHasBeamAnimatedLayers = useMemo(
    () => (activeLaserScene ? sceneHasAnimatedContent(activeLaserScene) : false),
    [activeLaserScene]
  )

  useEffect(() => {
    const prev = prevBeamStrokeMode.current
    if (prev === 'solid' && beamStrokeMode !== 'solid') {
      setAnimPlaying(true)
    }
    prevBeamStrokeMode.current = beamStrokeMode
  }, [beamStrokeMode])

  const animSpeedRef = useRef(effectiveAnimSpeed)
  animSpeedRef.current = effectiveAnimSpeed

  useEffect(() => {
    if (!animPlaying) return
    if (animationProgressRoute === 'split') return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setAnimationProgress01((p) => {
        const next = (p + dt * animSpeedRef.current * 0.52) % 1
        return next < 0.0015 ? 0 : next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animPlaying, animationProgressRoute])

  const pathHue = useMemo(
    () => pathHueOffset01(activeLaserScene?.animationPath, effectiveAnimationProgress),
    [activeLaserScene?.animationPath, effectiveAnimationProgress]
  )

  const strokeRenderOpts = useMemo(
    () => ({
      samplesAlong: samplesLinked,
      huePhase01: effectiveAnimationProgress + scanPhaseEffective * 0.25 + pathHue,
    }),
    [samplesLinked, effectiveAnimationProgress, scanPhaseEffective, pathHue]
  )

  const shapeMotionDelta = useMemo(
    () =>
      motionPathDisplacement01(
        activeLaserScene?.animationPath,
        effectiveAnimationProgress
      ),
    [activeLaserScene?.animationPath, effectiveAnimationProgress]
  )

  const laserSplitPin = useMemo(
    () => ({
      x: clamp01(splitXOut),
      y: clamp01(splitYOut),
      width: clamp01(splitWOut),
      height: clamp01(splitHOut),
    }),
    [splitXOut, splitYOut, splitWOut, splitHOut]
  )

  const editorLayers = useMemo(() => {
    if (!activeLaserScene) return []
    return getLaserSceneDisplayLayers(
      activeLaserScene,
      laserSplitPin,
      effectiveAnimationProgress,
      shapeMotionDelta
    )
  }, [
    activeLaserScene,
    laserSplitPin,
    effectiveAnimationProgress,
    shapeMotionDelta,
  ])

  const selectedLayer = useMemo(() => {
    if (!ildaSelectedLayerId) return null
    if ((activeLaserScene?.contentMode ?? 'draw') === 'preset') {
      return editorLayers.find((l) => l.id === ildaSelectedLayerId) ?? null
    }
    return (
      activeLaserScene?.layers.find((l) => l.id === ildaSelectedLayerId) ?? null
    )
  }, [activeLaserScene, ildaSelectedLayerId, editorLayers])

  useEffect(() => {
    if (!ildaSelectedLayerId) return
    if (!editorLayers.some((l) => l.id === ildaSelectedLayerId)) {
      setIldaSelectedLayerId(null)
    }
  }, [ildaSelectedLayerId, editorLayers, activeLaserScene?.presetId])

  useEffect(() => {
    if (!selectedLayer) return
    if (selectedLayer.beam?.kind === 'gradient') {
      setBeamStrokeMode('gradient')
      setBeamGradientStops(selectedLayer.beam.stops)
    } else if (selectedLayer.beam?.kind === 'rainbow') {
      setBeamStrokeMode('rainbow')
      setRainbowCycles(selectedLayer.beam.cycles)
    } else {
      setBeamStrokeMode('solid')
      if (selectedLayer.color) {
        setLineColor(selectedLayer.color)
      }
    }
  }, [
    selectedLayer?.id,
    selectedLayer?.beam,
    selectedLayer?.color,
  ])

  useEffect(() => {
    if (selectedLayer?.kind === 'text') {
      setTextDraft(selectedLayer.text ?? '')
      setTextFontDefault(selectedLayer.fontFamily ?? 'system-ui, sans-serif')
    }
  }, [selectedLayer?.id, selectedLayer?.kind, selectedLayer?.text, selectedLayer?.fontFamily])

  const sceneContextByGroup = useMemo(() => {
    const out: Record<string, LaserFixtureSceneContext> = {}
    const maxPts = Math.min(
      4095,
      Math.max(200, Math.round(LASER_DAC_DEFAULT_SCAN_RATE_PPS / 8))
    )
    for (const g of groupNames) {
      const slot = groupSlots[g]
      if (!slot?.activeSceneId) continue
      const scene = laserScenes.find((s) => s.id === slot.activeSceneId) ?? null
      if (!scene) continue
      const ix = findLaserGroupSplitIndex(lightScene, g)
      const bp =
        ix >= 0 ? (lightScene?.splitScenes[ix]?.baseParams ?? {}) : {}
      const splitPin = buildSplitPinFromParams(
        Number(bp.x ?? 0.5),
        Number(bp.y ?? 0.5),
        Number(bp.width ?? 1),
        Number(bp.height ?? 1)
      )
      const routesForGroup = resolveRoutesForGroup(
        g,
        activeLaserGroup,
        routes,
        groupSlots
      )
      const animProgress =
        routesForGroup.animationProgressRoute === 'split' && ix >= 0
          ? clamp01(
              Number(bp.laserAnimProgress ?? routesForGroup.animationProgress01)
            )
          : clamp01(routesForGroup.animationProgress01)
      const motion = motionPathDisplacement01(scene.animationPath, animProgress)
      const pathHue = pathHueOffset01(scene.animationPath, animProgress)
      const scanPhase =
        routesForGroup.scanMotionRoute === 'split' && ix >= 0
          ? clamp01(
              Number(bp.laserScanPath ?? routesForGroup.scanPathPhase01)
            )
          : routesForGroup.scanPathPhase01
      out[g] = {
        scene,
        splitPin,
        animProgress,
        shapeMotionDelta: motion,
        huePhase01: animProgress + scanPhase * 0.25 + pathHue,
        maxPoints: maxPts,
        powerScale: 1,
      }
    }
    return out
  }, [
    groupNames,
    groupSlots,
    laserScenes,
    lightScene,
    activeLaserGroup,
    routes,
  ])

  useEffect(() => {
    if (!isConnected || !safetyArmed) return
    const power = Math.max(
      0,
      Math.min(1, LASER_DAC_DEFAULT_OUTPUT_POWER / 100)
    )
    let raf = 0
    let lastSent = 0
    const minIntervalMs = 1000 / 30

    const tick = (now: number) => {
      if (now - lastSent >= minIntervalMs) {
        lastSent = now
        const { dacComposites, nodePushes } = buildLaserOutputPushes({
          fixtures: units.map((u) => ({
            id: u.id,
            group: u.group.trim(),
            enabled: u.enabled,
            outputRoute: u.outputRoute,
            laserChannels: u.laserChannels,
          })),
          dacProfiles,
          sceneContextByGroup,
          pointRatePps: LASER_DAC_DEFAULT_SCAN_RATE_PPS,
          outputPower01: power,
        })
        for (const push of dacComposites) {
          if (!connectedSessionIds.includes(push.sessionId)) continue
          sendLaserDacPushFrame(push)
        }
        for (const push of nodePushes) {
          if (!connectedSessionIds.includes(push.sessionId)) continue
          sendLaserDacPushFrame(push)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [
    isConnected,
    safetyArmed,
    units,
    groupSlots,
    dacProfiles,
    sceneContextByGroup,
    connectedSessionIds,
  ])

  const viewportMaskResolved = useMemo(() => {
    const m = activeLaserScene?.viewportMask
    if (!m?.enabled) return null
    if (activeLaserScene?.viewportMaskLinkSplit) {
      const rect = splitPadRectToCanvasMask(
        splitXOut,
        splitYOut,
        splitWOut,
        splitHOut
      )
      return { enabled: true as const, ...rect }
    }
    return {
      enabled: true as const,
      x: clamp01(m.x),
      y: clamp01(m.y),
      w: Math.max(0.02, clamp01(m.w)),
      h: Math.max(0.02, clamp01(m.h)),
    }
  }, [activeLaserScene, splitXOut, splitYOut, splitWOut, splitHOut])

  useEffect(() => {
    if (activeLaserScene?.contentMode === 'preset') {
      setSelectedTool('select')
    }
  }, [activeLaserScene?.contentMode, activeLaserSceneId])

  useEffect(() => {
    if ((activeLaserScene?.contentMode ?? 'draw') === 'preset') {
      setAnimPlaying(true)
    }
  }, [activeLaserSceneId])

  const patchActiveLaserScene = useCallback(
    (patch: Partial<LaserScene>) => {
      if (activeLaserSceneId === null) return
      setLaserScenes((prev) =>
        prev.map((s) => (s.id === activeLaserSceneId ? { ...s, ...patch } : s))
      )
    },
    [activeLaserSceneId]
  )

  const handleCanvasLayersChange = useCallback(
    (next: LaserShapeLayer[]) => {
      if (activeLaserSceneId === null) return
      setLaserScenes((prev) =>
        prev.map((s) => {
          if (s.id !== activeLaserSceneId) return s
          if (s.contentMode === 'preset') {
            return { ...s, contentMode: 'draw', layers: next }
          }
          return { ...s, layers: next }
        })
      )
    },
    [activeLaserSceneId]
  )

  const beats = useRealtimeSelector((s) => s.time.beats)
  const beatsLastRef = useRef(beats)
  useEffect(() => {
    const scene = activeLaserScene
    if (
      !scene?.autoScene?.enabled ||
      laserScenes.length < 2 ||
      activeLaserSceneId === null
    ) {
      beatsLastRef.current = beats
      return
    }
    const period = Math.max(2, scene.autoScene.periodBeats ?? 16)
    const prev = beatsLastRef.current
    if (isNewPeriod(prev, beats, period)) {
      const ids = laserScenes.map((s) => s.id)
      const nextId = randomElementExcludeCurrent(ids, activeLaserSceneId)
      if (nextId !== activeLaserSceneId) {
        setActiveLaserSceneId(nextId)
        setIldaSelectedLayerId(null)
      }
    }
    beatsLastRef.current = beats
  }, [beats, activeLaserScene, laserScenes, activeLaserSceneId])

  const splitLinkSeed = (bindingId: LaserParamBindingId): number => {
    switch (bindingId) {
      case 'dotDensity':
        return (manualDotSamples - 32) / (520 - 32)
      case 'scanPath':
        return scanPathPhase01
      case 'beamHue':
        return clamp01(splitBeamHue)
      case 'playbackSpeed':
        return (animSpeed - 0.2) / 2.8
      case 'animProgress':
        return animationProgress01
      default:
        return 0.5
    }
  }

  const onParamRouteChange = (
    bindingId: LaserParamBindingId,
    mode: LaserParamRouteMode
  ) => {
    setRouteMode(
      bindingId,
      mode,
      mode === 'split' ? splitLinkSeed(bindingId) : undefined
    )
  }

  const setSplitParam = (param: string, value: number) => {
    dispatch(
      setBaseParams({
        splitIndex: linkSplitIx,
        params: { [param]: value },
      })
    )
  }

  const splitLinkTitle =
    laserSplitIndex >= 0
      ? `Laser split · ${activeLaserGroup}`
      : `Laser split · ${activeLaserGroup} (pending)`

  const sceneResizeRef = useRef<{
    startY: number
    startH: number
  } | null>(null)

  const reorderLaserScenes = (fromGlobal: number, toGlobal: number) => {
    if (fromGlobal === toGlobal) return
    setLaserScenes((prev) => {
      const next = [...prev]
      const [it] = next.splice(fromGlobal, 1)
      next.splice(toGlobal, 0, it)
      return next
    })
  }

  const onSceneResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    sceneResizeRef.current = {
      startY: e.clientY,
      startH: sceneStripHeightPx,
    }
    const move = (ev: PointerEvent) => {
      const r = sceneResizeRef.current
      if (!r) return
      const dy = ev.clientY - r.startY
      const next = Math.round(r.startH - dy)
      const max = Math.min(Math.round(window.innerHeight * 0.55), 560)
      setSceneStripHeightPx(
        Math.max(LASER_SCENE_STRIP_MIN_HEIGHT_PX, Math.min(max, next))
      )
    }
    const up = () => {
      sceneResizeRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const patchSelectedLayer = (patch: Partial<LaserShapeLayer>) => {
    if (activeLaserScene === null || ildaSelectedLayerId === null) return
    if ((activeLaserScene.contentMode ?? 'draw') === 'preset') {
      const sub: LaserPresetLayerOverride = {}
      if (patch.color !== undefined) sub.color = patch.color
      if ('beam' in patch) {
        sub.beam =
          patch.beam === undefined ? null : (patch.beam as LaserShapeLayer['beam'])
      }
      if (Object.keys(sub).length === 0) return
      setLaserScenes((prev) =>
        prev.map((s) => {
          if (s.id !== activeLaserSceneId) return s
          const prevOv = s.presetLayerOverrides?.[ildaSelectedLayerId] ?? {}
          return {
            ...s,
            presetLayerOverrides: {
              ...s.presetLayerOverrides,
              [ildaSelectedLayerId]: { ...prevOv, ...sub },
            },
          }
        })
      )
      return
    }
    setLaserScenes((prev) =>
      prev.map((s) => {
        if (s.id !== activeLaserSceneId) return s
        return {
          ...s,
          layers: s.layers.map((l) =>
            l.id === ildaSelectedLayerId ? { ...l, ...patch } : l
          ),
        }
      })
    )
  }

  const applyToolbarLayerStyle = useCallback(
    (patch: LaserPresetLayerOverride) => {
      if (ildaSelectedLayerId === null) return
      if (patch.color !== undefined) {
        patchSelectedLayer({ color: patch.color })
      }
      if ('beam' in patch) {
        patchSelectedLayer({
          beam:
            patch.beam === null
              ? undefined
              : (patch.beam as LaserShapeLayer['beam']),
        })
      }
    },
    // patchSelectedLayer is recreated each render; keep toolbar in sync with scene + selection.
    [ildaSelectedLayerId, activeLaserScene, activeLaserSceneId, laserScenes]
  )

  const addLaserUnit = () => addUnit()

  const removeSelectedLaserUnit = () => {
    if (selectedUnit === null) return
    removeUnit(selectedUnit.id)
  }

  const updateSelectedUnit = (patch: Partial<LaserUnit>) => {
    if (selectedUnit === null) return
    patchUnit(selectedUnit.id, patch)
  }

  return (
    <WorkspaceRoot>
      <WorkspaceInner>
      <Header>
        <BoltIcon fontSize="small" />
        <HeaderTitle>Laser Engine (Alpha)</HeaderTitle>
        <HeaderTag>Laser · ILDA and IDN</HeaderTag>
        {!standalone && (
          <HeaderOpenButton
            type="button"
            onClick={() => send_open_page_window('Laser')}
          >
            <OpenInNewIcon fontSize="small" />
            Open / Focus Laser Window
          </HeaderOpenButton>
        )}
      </Header>

      <MainStack>
      <MainGrid>
        <SetupPanel>
          <PanelTitle>Laser Setup</PanelTitle>
          <PanelBody>
            <SectionBlock>
              <SectionBlockTitle>Laser Units</SectionBlockTitle>
              <ActionRow>
                <TinyButton type="button" onClick={addLaserUnit}>
                  <AddIcon fontSize="inherit" />
                  Add Laser
                </TinyButton>
                <TinyButton
                  type="button"
                  onClick={removeSelectedLaserUnit}
                  disabled={selectedUnit === null}
                >
                  <DeleteOutlineIcon fontSize="inherit" />
                  Remove
                </TinyButton>
              </ActionRow>
              <UnitList>
                {units.map((unit) => (
                  <UnitRow
                    key={unit.id}
                    $selected={unit.id === selectedUnitId}
                    onClick={() => {
                      setSelectedUnitId(unit.id)
                      const g = unit.group.trim()
                      if (g.length > 0) {
                        setActiveLaserGroup(g)
                      }
                    }}
                  >
                    <UnitName>{unit.name}</UnitName>
                    <UnitMeta>{fixtureRouteLabel(unit, dacProfiles, networkNodes)}</UnitMeta>
                  </UnitRow>
                ))}
                {units.length <= 0 && (
                  <MutedLine>No laser units configured yet.</MutedLine>
                )}
              </UnitList>
            </SectionBlock>

            <SectionBlock>
              <SectionBlockTitle>Selected Unit</SectionBlockTitle>
              {selectedUnit === null ? (
                <MutedLine>Select a laser unit to edit settings.</MutedLine>
              ) : (
                <>
                  <MiniFieldLabel>Name</MiniFieldLabel>
                  <TextField
                    value={selectedUnit.name}
                    onChange={(event) => updateSelectedUnit({ name: event.target.value })}
                  />
                  <MiniFieldLabel>Group</MiniFieldLabel>
                  <TextField
                    value={selectedUnit.group}
                    onChange={(event) => updateSelectedUnit({ group: event.target.value })}
                    placeholder="Main Lasers"
                  />
                  <MiniFieldLabel>Output routing</MiniFieldLabel>
                  <SelectLike
                    value={selectedUnit.outputRoute.kind}
                    onChange={(event) => {
                      const kind = event.target.value as LaserFixtureOutputRoute['kind']
                      if (kind === 'unassigned') {
                        updateSelectedUnit({ outputRoute: createUnassignedRoute() })
                      } else if (kind === 'dac_zone') {
                        const z = activeDacProfile.zones[0]?.id ?? ''
                        updateSelectedUnit({
                          outputRoute: {
                            kind: 'dac_zone',
                            dacProfileId: activeDacProfile.id,
                            zoneId: z,
                          },
                        })
                      } else if (kind === 'network_node') {
                        const n = networkNodes[0]
                        updateSelectedUnit({
                          outputRoute: n
                            ? { kind: 'network_node', nodeId: n.id }
                            : createUnassignedRoute(),
                        })
                      }
                    }}
                  >
                    <option value="unassigned">Unassigned</option>
                    <option value="dac_zone">DAC projection zone</option>
                    <option value="network_node">Network node</option>
                  </SelectLike>
                  {selectedUnit.outputRoute.kind === 'dac_zone' ? (
                    <>
                      <MiniFieldLabel>DAC profile</MiniFieldLabel>
                      <SelectLike
                        value={selectedUnit.outputRoute.dacProfileId}
                        onChange={(event) => {
                          const pid = event.target.value
                          const prof = dacProfiles.find((p) => p.id === pid)
                          const zoneId = prof?.zones[0]?.id ?? ''
                          updateSelectedUnit({
                            outputRoute: {
                              kind: 'dac_zone',
                              dacProfileId: pid,
                              zoneId,
                            },
                          })
                        }}
                      >
                        {dacProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </SelectLike>
                      <MiniFieldLabel>Projection zone</MiniFieldLabel>
                      <SelectLike
                        value={selectedUnit.outputRoute.zoneId}
                        onChange={(event) => {
                          const route = selectedUnit.outputRoute
                          if (route.kind !== 'dac_zone') return
                          updateSelectedUnit({
                            outputRoute: {
                              kind: 'dac_zone',
                              dacProfileId: route.dacProfileId,
                              zoneId: event.target.value,
                            },
                          })
                        }}
                      >
                        {(selectedUnit.outputRoute.kind === 'dac_zone'
                          ? dacProfiles.find((p) => {
                              const route = selectedUnit.outputRoute
                              return route.kind === 'dac_zone'
                                ? p.id === route.dacProfileId
                                : false
                            })?.zones ?? []
                          : []
                        ).map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </SelectLike>
                    </>
                  ) : null}
                  {selectedUnit.outputRoute.kind === 'network_node' ? (
                    <>
                      <MiniFieldLabel>Network node</MiniFieldLabel>
                      <SelectLike
                        value={
                          selectedUnit.outputRoute.kind === 'network_node'
                            ? selectedUnit.outputRoute.nodeId
                            : ''
                        }
                        onChange={(event) =>
                          updateSelectedUnit({
                            outputRoute: {
                              kind: 'network_node',
                              nodeId: event.target.value,
                            },
                          })
                        }
                      >
                        {networkNodes.length <= 0 ? (
                          <option value="">Add a node in Connection</option>
                        ) : null}
                        {networkNodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}
                          </option>
                        ))}
                      </SelectLike>
                    </>
                  ) : null}
                  <SafetyToggleRow>
                    <SafetyToggleLabel style={{ fontSize: '0.72rem' }}>
                      Enabled
                    </SafetyToggleLabel>
                    <ToggleSwitch
                      checked={selectedUnit.enabled}
                      onChange={(next) => updateSelectedUnit({ enabled: next })}
                      aria-label="Laser unit enabled"
                    />
                  </SafetyToggleRow>
                  <MiniFieldLabel>Output channels (RGBY+)</MiniFieldLabel>
                  <ChannelGrid>
                    {(
                      [
                        ['red', 'Red'],
                        ['green', 'Green'],
                        ['blue', 'Blue'],
                        ['yellow', 'Yellow'],
                        ['white', 'White'],
                      ] as const
                    ).map(([key, label]) => (
                      <SafetyToggleRow key={key}>
                        <SafetyToggleLabel style={{ fontSize: '0.72rem' }}>
                          {label}
                        </SafetyToggleLabel>
                        <ToggleSwitch
                          checked={selectedUnit.laserChannels[key]}
                          onChange={(next) =>
                            updateSelectedUnit({
                              laserChannels: {
                                ...selectedUnit.laserChannels,
                                [key]: next,
                              },
                            })
                          }
                          aria-label={`${label} channel`}
                        />
                      </SafetyToggleRow>
                    ))}
                  </ChannelGrid>
                </>
              )}
            </SectionBlock>

            <SectionBlock>
              <SectionBlockTitle>Group routing</SectionBlockTitle>
              <MutedLine>
                Each fixture group keeps its own latched scene and split links. Output
                hardware is assigned per fixture (DAC zone or network node).
              </MutedLine>
              {groupNames.length <= 0 ? (
                <MutedLine style={{ marginTop: '0.35rem' }}>
                  Create a group name on a laser unit to enable routing.
                </MutedLine>
              ) : (
                <GroupRouteList>
                  {groupNames.map((groupName) => {
                    const slotSceneId =
                      groupSlots[groupName]?.activeSceneId ?? null
                    const latchedScene =
                      slotSceneId !== null
                        ? laserScenes.find((s) => s.id === slotSceneId)
                        : null
                    return (
                      <GroupRouteRow key={groupName}>
                        <GroupRouteMain>
                          <GroupPickButton
                            type="button"
                            $active={groupName === activeLaserGroup}
                            onClick={() => setActiveLaserGroup(groupName)}
                          >
                            {groupName}
                          </GroupPickButton>
                          <SelectLike
                            value={slotSceneId ?? ''}
                            onChange={(event) => {
                              const id = event.target.value
                              setGroupLatchedScene(
                                groupName,
                                id.length > 0 ? id : null
                              )
                              if (groupName === activeLaserGroup) {
                                setIldaSelectedLayerId(null)
                              }
                            }}
                            title="Scene sent to DAC when this group is active and armed"
                          >
                            <option value="">No scene</option>
                            {laserScenes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </SelectLike>
                        </GroupRouteMain>
                        <GroupRouteMeta>
                          {latchedScene
                            ? `Output: ${latchedScene.name}`
                            : 'No latched scene'}
                          {groupName === activeLaserGroup ? ' · Active' : ''}
                        </GroupRouteMeta>
                      </GroupRouteRow>
                    )
                  })}
                </GroupRouteList>
              )}
            </SectionBlock>

            <SectionBlock>
              <SectionBlockTitle>{splitLinkTitle}</SectionBlockTitle>
              <MutedLine>
                Split mode adds named sliders on this group&apos;s lighting split (e.g. Dot
                density, Scan path). Use the split scene in the lighting workspace to drive
                live ILDA/IDN output.
              </MutedLine>
              <ParamMapGrid style={{ marginTop: '0.35rem' }}>
                <ParamMapItem>
                  <ParamMapHeader>
                    <ParamName>Playback speed</ParamName>
                    <ParamSelect
                      value={playbackSpeedRoute}
                      onChange={(event) =>
                        onParamRouteChange(
                          'playbackSpeed',
                          event.target.value as LaserParamRouteMode
                        )
                      }
                    >
                      <option value="manual">Manual</option>
                      <option value="split">Split</option>
                    </ParamSelect>
                  </ParamMapHeader>
                  {playbackSpeedRoute === 'split' ? (
                    <LinkSliderRow>
                      <LinkSliderLabel>Split · Playback speed</LinkSliderLabel>
                      <LinkSliderRange
                        type="range"
                        min={0}
                        max={1}
                        step={0.002}
                        value={clamp01(splitPlaybackSpeed)}
                        onChange={(ev) =>
                          setSplitParam(
                            'laserPlaybackSpeed',
                            Number(ev.target.value)
                          )
                        }
                      />
                    </LinkSliderRow>
                  ) : null}
                </ParamMapItem>
                <ParamMapItem>
                  <ParamMapHeader>
                    <ParamName>Dot density</ParamName>
                    <ParamSelect
                      value={dotDensityRoute}
                      onChange={(event) =>
                        onParamRouteChange(
                          'dotDensity',
                          event.target.value as LaserParamRouteMode
                        )
                      }
                    >
                      <option value="manual">Manual</option>
                      <option value="split">Split</option>
                    </ParamSelect>
                  </ParamMapHeader>
                  {dotDensityRoute === 'split' ? (
                    <LinkSliderRow>
                      <LinkSliderLabel>Split · Dot density</LinkSliderLabel>
                      <LinkSliderRange
                        type="range"
                        min={0}
                        max={1}
                        step={0.002}
                        value={clamp01(splitDotDensity)}
                        onChange={(ev) =>
                          setSplitParam(
                            'laserDotDensity',
                            Number(ev.target.value)
                          )
                        }
                      />
                    </LinkSliderRow>
                  ) : null}
                </ParamMapItem>
                <ParamMapItem>
                  <ParamMapHeader>
                    <ParamName>Scan path</ParamName>
                    <ParamSelect
                      value={scanMotionRoute}
                      onChange={(event) =>
                        onParamRouteChange(
                          'scanPath',
                          event.target.value as LaserParamRouteMode
                        )
                      }
                    >
                      <option value="manual">Manual</option>
                      <option value="split">Split</option>
                    </ParamSelect>
                  </ParamMapHeader>
                  {scanMotionRoute === 'split' ? (
                    <LinkSliderRow>
                      <LinkSliderLabel>Split · Scan path</LinkSliderLabel>
                      <LinkSliderRange
                        type="range"
                        min={0}
                        max={1}
                        step={0.002}
                        value={clamp01(splitScanPath)}
                        onChange={(ev) =>
                          setSplitParam('laserScanPath', Number(ev.target.value))
                        }
                      />
                    </LinkSliderRow>
                  ) : null}
                </ParamMapItem>
                <ParamMapItem>
                  <ParamMapHeader>
                    <ParamName>Beam color (solid)</ParamName>
                    <ParamSelect
                      value={beamColorRoute}
                      onChange={(event) =>
                        onParamRouteChange(
                          'beamHue',
                          event.target.value as LaserParamRouteMode
                        )
                      }
                    >
                      <option value="manual">Manual</option>
                      <option value="split">Split</option>
                    </ParamSelect>
                  </ParamMapHeader>
                  {beamColorRoute === 'split' ? (
                    <LinkSliderRow>
                      <LinkSliderLabel>Split · Beam hue</LinkSliderLabel>
                      <LinkSliderRange
                        type="range"
                        min={0}
                        max={1}
                        step={0.002}
                        value={clamp01(splitBeamHue)}
                        onChange={(ev) =>
                          setSplitParam('laserBeamHue', Number(ev.target.value))
                        }
                      />
                    </LinkSliderRow>
                  ) : null}
                </ParamMapItem>
                <ParamMapItem>
                  <ParamMapHeader>
                    <ParamName>Animation progress</ParamName>
                    <ParamSelect
                      value={animationProgressRoute}
                      onChange={(event) =>
                        onParamRouteChange(
                          'animProgress',
                          event.target.value as LaserParamRouteMode
                        )
                      }
                    >
                      <option value="manual">Manual</option>
                      <option value="split">Split</option>
                    </ParamSelect>
                  </ParamMapHeader>
                  {animationProgressRoute === 'split' ? (
                    <LinkSliderRow>
                      <LinkSliderLabel>Split · Animation progress</LinkSliderLabel>
                      <LinkSliderRange
                        type="range"
                        min={0}
                        max={1}
                        step={0.002}
                        value={clamp01(splitAnimProgress)}
                        onChange={(ev) =>
                          setSplitParam(
                            'laserAnimProgress',
                            Number(ev.target.value)
                          )
                        }
                      />
                    </LinkSliderRow>
                  ) : null}
                </ParamMapItem>
              </ParamMapGrid>
            </SectionBlock>
          </PanelBody>
        </SetupPanel>

        <DrawPanel>
          <PanelTitle>Main Laser Control</PanelTitle>
          <DrawPanelBody>
            <GraphicMetaRow>
              <MetaField>
                <MiniFieldLabel>Graphic Name</MiniFieldLabel>
                <TextField
                  value={activeLaserScene?.name ?? ''}
                  onChange={(event) => {
                    const v = event.target.value
                    setLaserScenes((prev) =>
                      prev.map((s) =>
                        s.id === activeLaserSceneId ? { ...s, name: v } : s
                      )
                    )
                  }}
                  disabled={activeLaserScene === null}
                />
              </MetaField>
            </GraphicMetaRow>
            <EditorImportRow>
              <TinyButton
                type="button"
                onClick={() => setSvgImportOpen(true)}
                disabled={activeLaserScene === null}
              >
                <UploadFileIcon fontSize="inherit" />
                Import Vector
              </TinyButton>
              <TinyButton type="button">Save Graphic</TinyButton>
            </EditorImportRow>
            <LaserSkyModePanel scene={activeLaserScene} onPatchScene={patchActiveLaserScene} />
            <EditorMainRow>
            <EditorCanvasSlot>
              {showZonePreview ? (
                <LaserZoneCanvasOverlay
                  zones={activeDacProfile.zones}
                  fixtureNamesByZone={zoneFixtureLabels}
                  highlightZoneId={highlightZoneId}
                />
              ) : null}
              {activeLaserScene ? (
                <LaserEditorCanvas
                  layers={editorLayers}
                  onLayersChange={handleCanvasLayersChange}
                  selectedLayerId={ildaSelectedLayerId}
                  onSelectLayer={setIldaSelectedLayerId}
                  tool={selectedTool}
                  onToolChange={setSelectedTool}
                  lineColor={effectiveLineColor}
                  onLineColorChange={setLineColor}
                  laserCapabilities={editorLaserCaps}
                  beamStrokeMode={beamStrokeMode}
                  onBeamStrokeModeChange={setBeamStrokeMode}
                  beamGradientStops={beamGradientStops}
                  rainbowCycles={rainbowCycles}
                  onRainbowCyclesChange={setRainbowCycles}
                  onOpenBeamGradientModal={() => setGradientModalOpen(true)}
                  strokeRenderOpts={strokeRenderOpts}
                  shapeMotionDelta={{ x: 0, y: 0 }}
                  projectionMaskEnabled={enableProjectionMask}
                  audienceScanGateEnabled={audienceScanGate}
                  viewportMask={viewportMaskResolved}
                  textFontFamily={textFontDefault}
                  presetGeometryLocked={activeLaserScene.contentMode === 'preset'}
                  toolbarTargetSelection={applyToolbarLayerStyle}
                />
              ) : (
                <EditorFallback>
                  <MutedLine>Select or create a scene below.</MutedLine>
                </EditorFallback>
              )}
            </EditorCanvasSlot>
            {activeLaserScene ? (
              <LaserEditorParametersPanel
                laserDotSamples={samplesLinked}
                dotDensityLocked={dotDensityRoute !== 'manual'}
                onManualDotSamples={setManualDotSamples}
                laserScanPhase01={scanPhaseEffective}
                scanPathLocked={scanMotionRoute !== 'manual'}
                onScanPathPhase01={setScanPathPhase01}
                animPlaying={animPlaying}
                onAnimPlayingToggle={() => setAnimPlaying((p) => !p)}
                animSpeed={animSpeed}
                onAnimSpeed={setAnimSpeed}
                effectiveAnimSpeed={effectiveAnimSpeed}
                playbackSpeedLocked={playbackSpeedRoute !== 'manual'}
                hasBeamAnimatedLayers={sceneHasBeamAnimatedLayers}
                animationProgressEffective={effectiveAnimationProgress}
                animationProgressSliderLocked={
                  animationProgressRoute !== 'manual' || animPlaying
                }
                onAnimationProgress={(v) =>
                  setAnimationProgress01(Math.max(0, Math.min(1, v)))
                }
                selectedLayer={selectedLayer}
                textDraft={textDraft}
                onTextDraft={(v) => {
                  setTextDraft(v)
                  if (selectedLayer?.kind === 'text') {
                    patchSelectedLayer({ text: v })
                  }
                }}
                textFontFamily={textFontDefault}
                onTextFontFamily={(v) => {
                  setTextFontDefault(v)
                  if (selectedLayer?.kind === 'text') {
                    patchSelectedLayer({ fontFamily: v })
                  }
                }}
              />
            ) : null}
            </EditorMainRow>
          </DrawPanelBody>
        </DrawPanel>

        <ControlPanel>
          <PanelTitle>Control + Safety</PanelTitle>
          <PanelBody>
            <LaserConnectionPanel
              dacProfiles={dacProfiles}
              activeDacProfileId={activeDacProfileId}
              onActiveDacProfileId={setActiveDacProfileId}
              onDacProfilesChange={setDacProfiles}
              networkNodes={networkNodes}
              onNetworkNodesChange={setNetworkNodes}
              connectedSessionIds={connectedSessionIds}
              isConnected={isConnected}
              connectionNote={dacConnectionNote}
              onAddDacProfile={addDacProfile}
              onAddNetworkNode={addNetworkNode}
              onOpenZones={() => setZoningModalOpen(true)}
              onConnectDac={(profile) => void connectDacProfile(profile)}
              onConnectNode={(node) => void connectNetworkNode(node)}
              onDisconnectSession={(sid) => void disconnectSession(sid)}
              onDisconnectAll={() => void disconnectSession()}
            />

            <SectionBlock>
              <SectionBlockTitle>Safety</SectionBlockTitle>
              <LaserArmHoldButton armed={safetyArmed} onSetArmed={setSafetyArmed} />
              <SafetyToggleRow>
                <SafetyToggleLabel>Show zone layout on canvas</SafetyToggleLabel>
                <ToggleSwitch
                  checked={showZonePreview}
                  onChange={setShowZonePreview}
                  aria-label="Show DAC zone layout on laser canvas"
                />
              </SafetyToggleRow>
              <SafetyToggleRow>
                <SafetyToggleLabel>Projection mask</SafetyToggleLabel>
                <ToggleSwitch
                  checked={enableProjectionMask}
                  onChange={setEnableProjectionMask}
                  aria-label="Projection mask enabled"
                />
              </SafetyToggleRow>
              <SafetyToggleRow>
                <SafetyToggleLabel>Audience scan gate</SafetyToggleLabel>
                <ToggleSwitch
                  checked={audienceScanGate}
                  onChange={setAudienceScanGate}
                  aria-label="Audience scan gate"
                />
              </SafetyToggleRow>
            </SectionBlock>
          </PanelBody>
        </ControlPanel>
      </MainGrid>

      <SceneSection>
        <SceneResizeHandle onPointerDown={onSceneResizePointerDown} />
        <SceneDock $h={sceneStripHeightPx}>
      <LaserSceneStrip
        scenes={laserScenes}
        activeSceneId={activeLaserSceneId}
        activeScene={activeLaserScene}
        onPatchActiveScene={patchActiveLaserScene}
        onGridLayout={setLaserSceneGridLayout}
        onSelectScene={(id) => {
          setActiveLaserSceneId(id)
          setIldaSelectedLayerId(null)
        }}
        onAddScene={() => {
          const idx = laserScenes.length
          const s = createEmptyLaserScene(`Scene ${idx + 1}`)
          setLaserScenes((prev) => [...prev, s])
          setActiveLaserSceneId(s.id)
          setIldaSelectedLayerId(null)
          setLaserScenePage(Math.floor(idx / laserScenesPerPage))
        }}
        page={laserScenePage}
        onPageChange={setLaserScenePage}
        onReorderScenes={reorderLaserScenes}
      />
        </SceneDock>
      </SceneSection>
      </MainStack>

      <LaserSvgImportDialog
        open={svgImportOpen}
        onClose={() => setSvgImportOpen(false)}
        beamColor={effectiveLineColor}
        onAccept={(newLayers) => {
          if (activeLaserSceneId === null) return
          setLaserScenes((prev) =>
            prev.map((s) =>
              s.id === activeLaserSceneId
                ? {
                    ...s,
                    contentMode: 'draw',
                    layers: [...s.layers, ...newLayers],
                  }
                : s
            )
          )
          const top = newLayers[newLayers.length - 1]
          if (top) {
            setIldaSelectedLayerId(top.id)
          }
        }}
      />
      <LaserZoningModal
        open={zoningModalOpen}
        onClose={() => setZoningModalOpen(false)}
        profile={activeDacProfile}
        zoneFixtureLabels={zoneFixtureLabels}
        onSave={(next) => {
          setDacProfiles((prev) =>
            prev.map((p) => (p.id === next.id ? next : p))
          )
        }}
      />
      <LaserGradientModal
        open={gradientModalOpen}
        onClose={() => setGradientModalOpen(false)}
        stops={beamGradientStops}
        onApply={(stops) => {
          setBeamGradientStops(stops)
          setBeamStrokeMode('gradient')
          if (ildaSelectedLayerId) {
            patchSelectedLayer({ beam: { kind: 'gradient', stops } })
          }
        }}
        laserCaps={editorLaserCaps}
      />
      </WorkspaceInner>
    </WorkspaceRoot>
  )
}

function fixtureRouteLabel(
  unit: LaserUnit,
  profiles: LaserDacProfile[],
  nodes: LaserNetworkNode[]
): string {
  const route = unit.outputRoute
  if (route.kind === 'dac_zone') {
    const p = profiles.find((x) => x.id === route.dacProfileId)
    const z = p?.zones.find((x) => x.id === route.zoneId)
    return `${unit.group} · ${z?.name ?? 'Zone'}`
  }
  if (route.kind === 'network_node') {
    const n = nodes.find((x) => x.id === route.nodeId)
    return `${unit.group} · ${n?.name ?? 'Node'}`
  }
  return `${unit.group} · Unassigned`
}

export default function LaserProxy() {
  const openedRef = useRef(false)

  useEffect(() => {
    if (openedRef.current) {
      return
    }
    openedRef.current = true
    send_open_page_window('Laser')
  }, [])

  return (
    <Root>
      <Card>
        <TitleRow>
          <BoltIcon fontSize="small" />
          <Title>Laser Runs In Its Own Window</Title>
        </TitleRow>
        <Body>
          Laser is process-isolated in alpha mode. Open or focus the dedicated laser
          window to continue.
        </Body>
        <OpenButton onClick={() => send_open_page_window('Laser')}>
          <OpenInNewIcon fontSize="small" />
          Open / Focus Laser Window
        </OpenButton>
      </Card>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
`

const Card = styled.div`
  width: min(44rem, 100%);
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.5rem;
  background: ${(props) => props.theme.colors.bg.darker};
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`

const TitleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`

const Title = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.primary};
`

const Body = styled.div`
  font-size: 0.84rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const OpenButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.33rem;
  padding: 0.4rem 0.55rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: fit-content;
  cursor: pointer;
`

const WorkspaceRoot = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: auto;
  scrollbar-width: thin;
`

const WorkspaceInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.7rem;
  box-sizing: border-box;
  width: 100%;
  min-width: ${LASER_WORKSPACE_MIN_WIDTH_PX}px;
  min-height: max(100%, ${LASER_WORKSPACE_MIN_HEIGHT_PX}px);
`

const Header = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.darker};
  border-radius: 0.38rem;
  padding: 0.32rem 0.75rem;
  min-width: 0;
`

const HeaderTitle = styled.div`
  font-size: 0.88rem;
  font-weight: 700;
  text-align: center;
`

const HeaderTag = styled.div`
  font-size: 0.65rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 999px;
  padding: 0.1rem 0.38rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const HeaderOpenButton = styled.button`
  margin-left: auto;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.33rem;
  padding: 0.28rem 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  cursor: pointer;
`

const MainGrid = styled.div`
  flex: 1 1 0;
  min-height: 14rem;
  min-width: 0;
  display: grid;
  /* Center column grows first; side panels cap width and scroll internally. */
  grid-template-columns:
    minmax(${LASER_SIDE_PANEL_MIN_WIDTH_REM}rem, min(${LASER_SIDE_PANEL_MAX_WIDTH_REM}rem, 24vw))
    minmax(${LASER_CENTER_COLUMN_MIN_WIDTH_REM}rem, 1fr)
    minmax(${LASER_SIDE_PANEL_MIN_WIDTH_REM}rem, min(${LASER_SIDE_PANEL_MAX_WIDTH_REM}rem, 24vw));
  gap: 0.55rem;
  align-items: stretch;
  overflow: hidden;
`

const SetupPanel = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.45rem;
  background: ${(props) => props.theme.colors.bg.darker};
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: ${LASER_SIDE_PANEL_MAX_WIDTH_REM}rem;
  justify-self: stretch;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const DrawPanel = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.45rem;
  background: ${(props) => props.theme.colors.bg.darker};
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const DrawPanelBody = styled.div`
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const EditorMainRow = styled.div`
  flex: 1 1 0;
  min-height: ${LASER_CANVAS_MIN_HEIGHT_REM}rem;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.45rem;
  overflow: hidden;
`

const EditorCanvasSlot = styled.div`
  position: relative;
  flex: 1 0 auto;
  min-height: ${LASER_CANVAS_MIN_HEIGHT_REM}rem;
  min-width: ${LASER_CANVAS_MIN_WIDTH_REM}rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  & > *:not(svg) {
    flex: 1 1 0;
    min-height: 0;
    min-width: 0;
  }
`

const ControlPanel = styled(SetupPanel)`
  justify-self: stretch;
`

const PanelTitle = styled.div`
  padding: 0.48rem 0.58rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  font-size: 0.78rem;
  font-weight: 700;
`

const PanelBody = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
  padding: 0.55rem;
  scrollbar-width: thin;
`

const SectionBlock = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(props) => props.theme.colors.bg.primary};
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`

const SectionBlockTitle = styled.div`
  font-size: 0.73rem;
  font-weight: 700;
`

const ActionRow = styled.div`
  display: flex;
  gap: 0.35rem;
`

const TinyButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.3rem;
  padding: 0.24rem 0.42rem;
  font-size: 0.67rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;

  :disabled {
    opacity: 0.45;
    cursor: default;
  }
`

const UnitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  max-height: 12rem;
  overflow: auto;
`

const UnitRow = styled.button<{ $selected: boolean }>`
  border: 1px solid
    ${(props) => (props.$selected ? '#6cb8ff' : props.theme.colors.divider)};
  background: ${(props) =>
    props.$selected ? 'rgba(46, 112, 166, 0.34)' : props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.28rem;
  padding: 0.25rem 0.36rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.08rem;
  cursor: pointer;
  text-align: left;
`

const UnitName = styled.div`
  font-size: 0.71rem;
`

const UnitMeta = styled.div`
  font-size: 0.62rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const MiniFieldLabel = styled.label`
  font-size: 0.66rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const TextField = styled.input`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.24rem 0.34rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  width: 100%;
  box-sizing: border-box;
`

const SelectLike = styled.select`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.22rem 0.3rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  width: 100%;
  box-sizing: border-box;
`

const ChannelGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
`

const GraphicMetaRow = styled.div`
  flex-shrink: 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  padding: 0.44rem 0.56rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.44rem;
`

const MetaField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
`

const EditorImportRow = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  padding: 0.38rem 0.56rem 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
`

const EditorFallback = styled.div`
  flex: 1 1 0;
  min-height: 10rem;
  margin: 0.52rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
`

const MainStack = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
`

const SceneSection = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  min-width: 0;
`

const SceneResizeHandle = styled.div`
  flex-shrink: 0;
  height: 5px;
  margin: 0 0.35rem;
  border-radius: 4px;
  background: ${(p) => p.theme.colors.bg.primary};
  border: 1px solid ${(p) => p.theme.colors.divider};
  cursor: row-resize;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    width: 2.2rem;
    height: 3px;
    border-radius: 2px;
    background: ${(p) => p.theme.colors.text.secondary};
    opacity: 0.45;
  }

  &:hover {
    border-color: #8ac4f0;
  }
`

const SceneDock = styled.div<{ $h: number }>`
  flex: 0 0 auto;
  height: ${(p) => p.$h}px;
  min-height: ${LASER_SCENE_STRIP_MIN_HEIGHT_PX}px;
  max-height: min(560px, 55vh);
  min-width: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
`

const SafetyToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.28rem 0;
`

const SafetyToggleLabel = styled.span`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.primary};
`

const ParamMapGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.24rem;
`

const ParamMapItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.24rem 0.34rem;
  font-size: 0.66rem;
`

const ParamMapHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.35rem 0.5rem;
`

const LinkSliderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`

const LinkSliderLabel = styled.div`
  font-size: 0.62rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const LinkSliderRange = styled.input`
  width: 100%;
`

const ParamName = styled.div`
  color: ${(props) => props.theme.colors.text.primary};
`

const ParamSelect = styled.select`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.14rem 0.24rem;
  font-size: 0.64rem;
  max-width: min(8.6rem, 42vw);
  min-width: 0;
`

const MutedLine = styled.div`
  font-size: 0.66rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const GroupRouteList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.35rem;
`

const GroupRouteRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.28rem 0.34rem;
  font-size: 0.66rem;
`

const GroupRouteMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
`

const GroupPickButton = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${(props) =>
      props.$active
        ? props.theme.colors.text.primary
        : props.theme.colors.divider};
  border-radius: 0.25rem;
  background: ${(props) =>
    props.$active
      ? props.theme.colors.bg.lighter
      : props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.12rem 0.38rem;
  font-size: 0.66rem;
  cursor: pointer;
  font-weight: ${(props) => (props.$active ? 600 : 400)};
`

const GroupRouteMeta = styled.div`
  font-size: 0.61rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

