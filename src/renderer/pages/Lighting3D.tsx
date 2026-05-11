import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import StatusBar from '../menu/StatusBar'
import { useDmxSelector, useTypedSelector } from '../redux/store'
import { fromFeet, toFeet, METERS_PER_FOOT, StageDimensions } from '../../shared/stage'
import { setLighting3DSettings, setSelectedFixture } from '../redux/dmxSlice'
import { send_open_page_window } from '../ipcHandler'
import { mapRowsToPreviewFixtures } from './lightingPreviewFixtures'
import { selectLedPreviewFixtures, selectLightingPreviewRows } from './lightingPreviewSelectors'
import type { MoverPreviewFixture } from './lightingPreviewTypes'
import {
  clamp01,
  colorFromChannelDefinition,
} from '../lighting3d/previewCore'
import { MOVER_DEFAULT_PAN_RANGE_DEG, MOVER_DEFAULT_TILT_RANGE_DEG } from '../../shared/dmxFixtures'
import { realtimeStore } from '../redux/realtimeStore'

interface Lighting3DPageProps {
  standalonePreview?: boolean
  externalViewport?: boolean
}

type FixtureVisual = {
  fixtureId: string
  root: THREE.Group
  beamCones: THREE.Mesh[]
  hitDiscs: THREE.Mesh[]
}

const ROOM_MIN_FT = 6
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 2.8, 4.8)
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 1.3, 0)
const CAMERA_STORAGE_KEY = 'captivate.lighting3d.camera.simple.v1'
const TMP_UP = new THREE.Vector3(0, 1, 0)

export default function Lighting3DPage({
  standalonePreview = false,
  externalViewport = false,
}: Lighting3DPageProps) {
  const dispatch = useDispatch()
  const openedExternalViewport = useRef(false)
  const stage = useDmxSelector((state) => state.stage)
  const lighting3d = useDmxSelector((state) => state.lighting3d)
  const fixtureRows = useTypedSelector(selectLightingPreviewRows)
  const ledPreviewFixtures = useTypedSelector(selectLedPreviewFixtures)
  const fxtrDepthOn = useTypedSelector(
    (state) => state.gui.fxtrDepthOn
  )

  const previewFixtures = useMemo(
    () => [
      ...mapRowsToPreviewFixtures(fixtureRows, { fxtrDepthOn }),
      ...ledPreviewFixtures,
    ],
    [fixtureRows, ledPreviewFixtures, fxtrDepthOn]
  )

  useEffect(() => {
    if (!lighting3d.roomEnabled) {
      dispatch(setLighting3DSettings({ roomEnabled: true }))
    }
  }, [dispatch, lighting3d.roomEnabled])

  useEffect(() => {
    if (standalonePreview || !externalViewport || openedExternalViewport.current) {
      return
    }
    openedExternalViewport.current = true
    send_open_page_window('Lighting3D')
  }, [standalonePreview, externalViewport])

  const unitLabel = stage.unit === 'm' ? 'm' : 'ft'
  const dimensionStep = stage.unit === 'm' ? 0.1 : 0.5
  const minRoomDimensionDisplay = Number(fromFeet(ROOM_MIN_FT, stage.unit).toFixed(2))
  const toDisplayLength = useCallback(
    (valueFt: number) => Number(fromFeet(valueFt, stage.unit).toFixed(2)),
    [stage.unit]
  )

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
    lighting3d.roomWidthFt,
    lighting3d.roomDepthFt,
    lighting3d.roomHeightFt,
    toDisplayLength,
  ])

  const commitDimensionInput = useCallback(
    (key: 'roomWidthFt' | 'roomDepthFt' | 'roomHeightFt', rawValue: string) => {
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
      const nextFeet = Math.max(ROOM_MIN_FT, toFeet(nextDisplay, stage.unit))
      dispatch(setLighting3DSettings({ [key]: nextFeet }))
    },
    [
      dispatch,
      lighting3d.roomDepthFt,
      lighting3d.roomHeightFt,
      lighting3d.roomWidthFt,
      stage.unit,
      toDisplayLength,
    ]
  )

  const viewport = externalViewport ? (
    <ExternalViewportCard>
      <ExternalViewportTitle>Lighting 3D Viewport Runs In A Detached Window</ExternalViewportTitle>
      <ExternalViewportBody>
        This page keeps controls while the live viewport runs in the dedicated Lighting 3D window.
      </ExternalViewportBody>
      <ExternalViewportButton type="button" onClick={() => send_open_page_window('Lighting3D')}>
        Open / Focus Lighting 3D Viewport
      </ExternalViewportButton>
    </ExternalViewportCard>
  ) : previewFixtures.length > 0 ? (
    <Lighting3DViewport fixtures={previewFixtures} stage={stage} room={lighting3d} />
  ) : (
    <EmptyState>No fixtures found. Add fixtures in DMX Setup to populate the 3D preview.</EmptyState>
  )

  const pageContent = (
    <Content>
      <PanelTitle>Lighting 3D Preview</PanelTitle>
      <PanelHint>
        Live DMX preview: beam placement follows fixture model width and subfixture anchors; each
        cell&apos;s color and master levels match its own channels (wash bars show one beam per cell).
      </PanelHint>
      <Controls>
        <ControlItem>
          <ControlLabel>
            <input
              type="checkbox"
              checked={lighting3d.roomEnabled}
              onChange={(event) =>
                dispatch(setLighting3DSettings({ roomEnabled: event.target.checked }))
              }
            />
            Room
          </ControlLabel>
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
          />
        </ControlItem>
      </Controls>
      {viewport}
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

function Lighting3DViewport({
  fixtures,
  stage,
  room,
}: {
  fixtures: MoverPreviewFixture[]
  stage: StageDimensions
  room: { roomEnabled: boolean; roomWidthFt: number; roomDepthFt: number; roomHeightFt: number }
}) {
  const dispatch = useDispatch()
  const mountRef = useRef<HTMLDivElement | null>(null)
  const visualsRef = useRef(new Map<string, FixtureVisual>())
  const roomMeshesRef = useRef<THREE.Mesh[]>([])
  const dmxOutRef = useRef<number[][]>(realtimeStore.getState().dmxOutByUniverse)

  const fixturesRef = useRef(fixtures)
  const stageRef = useRef(stage)
  const roomRef = useRef(room)
  fixturesRef.current = fixtures
  stageRef.current = stage
  roomRef.current = room

  useEffect(() => {
    const pull = () => {
      dmxOutRef.current = realtimeStore.getState().dmxOutByUniverse
    }
    pull()
    return realtimeStore.subscribe(pull)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x080a0e)
    scene.fog = null

    const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80)
    const persisted = readCameraState()
    camera.position.copy(persisted.position ?? DEFAULT_CAMERA_POSITION)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.copy(persisted.target ?? DEFAULT_CAMERA_TARGET)
    controls.update()
    controls.addEventListener('change', () => {
      writeCameraState(camera.position, controls.target)
    })

    const ambient = new THREE.AmbientLight(0xffffff, 0.15)
    scene.add(ambient)

    const fill = new THREE.DirectionalLight(0xffffff, 0.18)
    fill.position.set(2, 3, 2)
    scene.add(fill)

    const pointer = new THREE.Vector2()
    const raycaster = new THREE.Raycaster()
    const selectable = new Map<string, THREE.Object3D>()

    const syncFixtures = () => {
      const fixtures = fixturesRef.current
      const stage = stageRef.current
      const nextIds = new Set(fixtures.map((fixture) => fixture.fixtureId))
      for (const [fixtureId, visual] of visualsRef.current) {
        if (!nextIds.has(fixtureId)) {
          scene.remove(visual.root)
          disposeObject(visual.root)
          visualsRef.current.delete(fixtureId)
        }
      }

      fixtures.forEach((fixture) => {
        let visual = visualsRef.current.get(fixture.fixtureId)
        const neededBeams =
          fixture.emitterGroups.length > 0 ? fixture.emitterGroups.length : 1
        if (visual !== undefined && visual.beamCones.length !== neededBeams) {
          scene.remove(visual.root)
          disposeObject(visual.root)
          visualsRef.current.delete(fixture.fixtureId)
          selectable.delete(fixture.fixtureId)
          visual = undefined
        }
        if (!visual) {
          visual = createFixtureVisual(fixture)
          visualsRef.current.set(fixture.fixtureId, visual)
          selectable.set(fixture.fixtureId, visual.root)
          scene.add(visual.root)
        }
        const pos = fixtureWorldPosition(fixture, stage)
        visual.root.position.copy(pos)
      })
    }

    const syncRoom = () => {
      const room = roomRef.current
      for (const mesh of roomMeshesRef.current) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
      roomMeshesRef.current = []
      if (!room.roomEnabled) return
      roomMeshesRef.current = createRoomMeshes(room)
      roomMeshesRef.current.forEach((mesh) => scene.add(mesh))
    }

    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(Array.from(selectable.values()), true)
      const hitRoot = hits.find((entry) =>
        entry.object.parent?.name?.startsWith('fixture-root:') ||
        entry.object.name.startsWith('fixture-root:')
      )
      if (!hitRoot) return
      let candidate: THREE.Object3D | null = hitRoot.object
      while (candidate && !candidate.name.startsWith('fixture-root:')) {
        candidate = candidate.parent
      }
      if (!candidate) return
      const fixtureId = candidate.name.replace('fixture-root:', '')
      const fixture = fixturesRef.current.find((item) => item.fixtureId === fixtureId)
      if (fixture?.fixtureIndex !== undefined && fixture.fixtureIndex >= 0) {
        dispatch(setSelectedFixture(fixture.fixtureIndex))
      }
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    const resize = () => {
      const width = mount.clientWidth || 1
      const height = mount.clientHeight || 1
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    let raf = 0
    const tempDir = new THREE.Vector3()
    const tempQuat = new THREE.Quaternion()
    const surfaceRay = new THREE.Raycaster()
    const projectionPlaneNormal = new THREE.Vector3(0, 1, 0)
    const projectionPlaneQuat = new THREE.Quaternion()

    const animate = () => {
      raf = window.requestAnimationFrame(animate)
      controls.update()
      syncFixtures()
      syncRoom()
      for (const fixture of fixturesRef.current) {
        const visual = visualsRef.current.get(fixture.fixtureId)
        if (!visual) continue
        const groups =
          fixture.emitterGroups.length > 0
            ? fixture.emitterGroups
            : defaultEmitterGroupsForPreview(fixture)

        for (let gi = 0; gi < visual.beamCones.length; gi++) {
          const group = groups[gi] ?? groups[0]
          if (group === undefined) continue

          const state = resolveEmitterGroupLightState(fixture, group, dmxOutRef.current)
          tempDir.copy(state.direction)
          tempQuat.setFromUnitVectors(TMP_UP, tempDir)
          const beamCone = visual.beamCones[gi]
          const hitDisc = visual.hitDiscs[gi]
          if (!beamCone || !hitDisc) continue

          beamCone.quaternion.copy(tempQuat)
          const beamMaterial = beamCone.material as THREE.MeshBasicMaterial
          beamMaterial.color.copy(state.color)
          beamMaterial.opacity = 0.08 + state.intensity * 0.42
          beamCone.visible = state.intensity > 0.005

          const origin = new THREE.Vector3()
          beamCone.getWorldPosition(origin)
          surfaceRay.set(origin, state.direction)
          const surfaceHits = surfaceRay.intersectObjects(roomMeshesRef.current, false)
          if (surfaceHits.length > 0) {
            const hit = surfaceHits[0]
            hitDisc.visible = state.intensity > 0.005
            hitDisc.position.copy(hit.point)
            projectionPlaneNormal.copy(hit.face?.normal ?? new THREE.Vector3(0, 1, 0))
            projectionPlaneNormal.transformDirection(hit.object.matrixWorld)
            projectionPlaneQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), projectionPlaneNormal)
            hitDisc.quaternion.copy(projectionPlaneQuat)
            const radius = THREE.MathUtils.lerp(0.04, 0.24, state.focus)
            hitDisc.scale.setScalar(radius)
            ;(hitDisc.material as THREE.MeshBasicMaterial).color.copy(state.color)
            ;(hitDisc.material as THREE.MeshBasicMaterial).opacity = 0.15 + state.intensity * 0.8
          } else {
            hitDisc.visible = false
          }
        }
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.cancelAnimationFrame(raf)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      resizeObserver.disconnect()
      controls.dispose()
      visualsRef.current.forEach((visual) => disposeObject(visual.root))
      visualsRef.current.clear()
      roomMeshesRef.current.forEach((mesh) => {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      roomMeshesRef.current = []
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [dispatch])

  return <ViewportHost ref={mountRef} />
}

function fixtureWorldPosition(fixture: MoverPreviewFixture, stage: StageDimensions): THREE.Vector3 {
  const width = Math.max(1, Number(stage.widthFt) * METERS_PER_FOOT)
  const depth = Math.max(1, Number(stage.depthFt) * METERS_PER_FOOT)
  const height = Math.max(1, Number(stage.heightFt) * METERS_PER_FOOT)
  return new THREE.Vector3(
    (fixture.xPos - 0.5) * width,
    Math.max(0.05, fixture.yPos * height),
    (fixture.zPos - 0.5) * depth
  )
}

function createFixtureVisual(fixture: MoverPreviewFixture): FixtureVisual {
  const root = new THREE.Group()
  root.name = `fixture-root:${fixture.fixtureId}`

  const modelWidth = THREE.MathUtils.clamp(fixture.model.width ?? 0.5, 0.2, 8)
  const washSpan = modelWidth * 0.88

  const groups =
    fixture.emitterGroups.length > 0
      ? fixture.emitterGroups
      : defaultEmitterGroupsForPreview(fixture)

  const bodyW =
    groups.length > 1
      ? THREE.MathUtils.clamp(washSpan * 0.38, 0.14, 2.4)
      : 0.16

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW, 0.12, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.55, metalness: 0.08 })
  )
  root.add(body)

  const beamCones: THREE.Mesh[] = []
  const hitDiscs: THREE.Mesh[] = []

  const coneMat = () =>
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!
    const offsetX =
      groups.length > 1
        ? (THREE.MathUtils.clamp(g.relativeX, 0, 1) - 0.5) * washSpan
        : 0

    const beamCone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 5.8, 18, 1, true), coneMat())
    beamCone.position.set(offsetX, -2.9, 0)
    root.add(beamCone)
    beamCones.push(beamCone)

    const hitDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    hitDisc.visible = false
    root.add(hitDisc)
    hitDiscs.push(hitDisc)
  }

  return { fixtureId: fixture.fixtureId, root, beamCones, hitDiscs }
}

/** Ensures preview builds at least one beam when emitterGroups is empty (legacy rows). */
function defaultEmitterGroupsForPreview(fixture: MoverPreviewFixture) {
  return [
    {
      emitterCount: 1,
      relativeX: 0.5,
      relativeY: 0.5,
      relativeZ: 0.5,
      colorChannels: fixture.colorChannels,
      colorMapChannels: fixture.colorMapChannels,
      masterChannels: fixture.masterChannels,
      effectChannels: fixture.effectChannels,
      goboMapChannels: fixture.goboMapChannels,
    },
  ]
}

function createRoomMeshes(room: {
  roomWidthFt: number
  roomDepthFt: number
  roomHeightFt: number
}): THREE.Mesh[] {
  const width = Math.max(1.2, room.roomWidthFt * METERS_PER_FOOT)
  const depth = Math.max(1.2, room.roomDepthFt * METERS_PER_FOOT)
  const height = Math.max(1.2, room.roomHeightFt * METERS_PER_FOOT)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x161920, side: THREE.DoubleSide })
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0e1117, side: THREE.DoubleSide })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat)
  floor.rotation.x = -Math.PI * 0.5
  floor.position.y = 0

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat)
  backWall.position.set(0, height * 0.5, -depth * 0.5)
  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat)
  frontWall.rotation.y = Math.PI
  frontWall.position.set(0, height * 0.5, depth * 0.5)
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat)
  leftWall.rotation.y = Math.PI * 0.5
  leftWall.position.set(-width * 0.5, height * 0.5, 0)
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat)
  rightWall.rotation.y = -Math.PI * 0.5
  rightWall.position.set(width * 0.5, height * 0.5, 0)
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), wallMat)
  ceiling.rotation.x = Math.PI * 0.5
  ceiling.position.y = height

  return [floor, backWall, frontWall, leftWall, rightWall, ceiling]
}

function resolveEmitterGroupLightState(
  fixture: MoverPreviewFixture,
  group: MoverPreviewFixture['emitterGroups'][number],
  dmxOutByUniverse: number[][]
): {
  intensity: number
  color: THREE.Color
  direction: THREE.Vector3
  focus: number
} {
  const colorChannels =
    group.colorChannels.length > 0 ? group.colorChannels : fixture.colorChannels

  const color = new THREE.Color(0, 0, 0)
  colorChannels.forEach((channel) => {
    const value = readDmxChannel(dmxOutByUniverse, fixture.universe, channel.channelIndex) / 255
    const level = clamp01(value)
    const base = colorFromChannelDefinition(channel.color)
    color.r += base.r * level
    color.g += base.g * level
    color.b += base.b * level
  })
  if (color.r + color.g + color.b < 0.01) {
    color.setRGB(1, 1, 1)
  } else {
    color.setRGB(clamp01(color.r), clamp01(color.g), clamp01(color.b))
  }

  const masterChannels =
    group.masterChannels.length > 0 ? group.masterChannels : fixture.masterChannels

  let intensity = masterChannels.length > 0 ? 1 : 0.75
  if (masterChannels.length > 0) {
    const samples = masterChannels.map((channel) => {
      const raw = readDmxChannel(dmxOutByUniverse, fixture.universe, channel.channelIndex)
      const span = Math.max(1, channel.max - channel.min)
      return THREE.MathUtils.clamp((raw - channel.min) / span, 0, 1)
    })
    intensity = samples.reduce((sum, value) => sum + value, 0) / samples.length
  }

  const pan = readAxisNorm(fixture.panCoarseChannel, fixture.panFineChannel, dmxOutByUniverse, fixture.universe)
  const tilt = readAxisNorm(
    fixture.tiltCoarseChannel,
    fixture.tiltFineChannel,
    dmxOutByUniverse,
    fixture.universe
  )
  const panDeg =
    fixture.moverCalibration?.pan.rangeDeg ?? MOVER_DEFAULT_PAN_RANGE_DEG
  const tiltDeg =
    fixture.moverCalibration?.tilt.rangeDeg ?? MOVER_DEFAULT_TILT_RANGE_DEG
  const panRad = (pan - 0.5) * THREE.MathUtils.degToRad(panDeg)
  const tiltRad = (tilt - 0.5) * THREE.MathUtils.degToRad(tiltDeg)
  const direction = new THREE.Vector3(0, -1, 0)
  direction.applyEuler(new THREE.Euler(-tiltRad, panRad, 0, 'YXZ'))
  direction.applyEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(fixture.rotation.x || 0),
      THREE.MathUtils.degToRad(fixture.rotation.y || 0),
      THREE.MathUtils.degToRad(fixture.rotation.z || 0),
      'XYZ'
    )
  )
  direction.normalize()

  let focus = 0.45
  if (fixture.focusChannels.length > 0) {
    const focusChannel = fixture.focusChannels[0]
    const raw = readDmxChannel(dmxOutByUniverse, fixture.universe, focusChannel.channelIndex)
    const span = Math.max(1, focusChannel.max - focusChannel.min)
    focus = THREE.MathUtils.clamp((raw - focusChannel.min) / span, 0, 1)
  }

  return { intensity, color, direction, focus }
}

function readAxisNorm(
  coarseChannel: number | undefined,
  fineChannel: number | undefined,
  dmxOutByUniverse: number[][],
  universe: number
): number {
  if (coarseChannel === undefined) return 0.5
  const coarse = readDmxChannel(dmxOutByUniverse, universe, coarseChannel)
  if (fineChannel === undefined) return coarse / 255
  const fine = readDmxChannel(dmxOutByUniverse, universe, fineChannel)
  return (coarse * 256 + fine) / 65535
}

function readDmxChannel(dmxOutByUniverse: number[][], universe: number, channelIndex: number): number {
  const frame = dmxOutByUniverse[Math.max(0, universe - 1)]
  if (!frame) return 0
  const value = frame[channelIndex]
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 255) : 0
}

function writeCameraState(position: THREE.Vector3, target: THREE.Vector3) {
  try {
    localStorage.setItem(
      CAMERA_STORAGE_KEY,
      JSON.stringify({ position: position.toArray(), target: target.toArray() })
    )
  } catch {
    // ignore storage failures
  }
}

function readCameraState():
  | { position: THREE.Vector3; target: THREE.Vector3 }
  | { position?: undefined; target?: undefined } {
  try {
    const raw = localStorage.getItem(CAMERA_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as {
      position?: [number, number, number]
      target?: [number, number, number]
    }
    if (!parsed.position || !parsed.target) return {}
    const [px, py, pz] = parsed.position
    const [tx, ty, tz] = parsed.target
    if (![px, py, pz, tx, ty, tz].every((v) => Number.isFinite(v))) return {}
    return {
      position: new THREE.Vector3(px, py, pz),
      target: new THREE.Vector3(tx, ty, tz),
    }
  } catch {
    return {}
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    node.geometry.dispose()
    const mat = node.material
    if (Array.isArray(mat)) {
      mat.forEach((item) => item.dispose())
    } else {
      mat.dispose()
    }
  })
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

const DimensionInput = styled.input`
  width: 100%;
  font-size: 0.78rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.28rem;
  padding: 0.24rem 0.35rem;
`

const ViewportHost = styled.div`
  flex: 1 1 auto;
  min-height: 20rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  overflow: hidden;
`

const ExternalViewportCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.4rem;
  padding: 0.8rem;
  background: ${(props) => props.theme.colors.bg.primary};
`

const ExternalViewportTitle = styled.h3`
  margin: 0;
  font-size: 0.92rem;
  color: ${(props) => props.theme.colors.text.primary};
`

const ExternalViewportBody = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ExternalViewportButton = styled.button`
  align-self: flex-start;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.3rem;
  background: ${(props) => props.theme.colors.bg.darker};
  color: ${(props) => props.theme.colors.text.primary};
  font-size: 0.78rem;
  padding: 0.32rem 0.6rem;
  cursor: pointer;
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
