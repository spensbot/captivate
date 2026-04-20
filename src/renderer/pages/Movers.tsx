import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import StatusBar from '../menu/StatusBar'
import Input from '../base/Input'
import NumberField from '../base/NumberField'
import Checkbox from '../base/LabelledCheckbox'
import { ButtonMidiOverlay, SliderMidiOverlay } from '../base/MidiOverlay'
import {
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  MOVER_MIN_PAN_RANGE_DEG,
  MOVER_MAX_PAN_RANGE_DEG,
  MOVER_MIN_TILT_RANGE_DEG,
  MOVER_MAX_TILT_RANGE_DEG,
  FixtureType,
  MoverBounds,
  MoverCalibration,
  initMoverBounds,
  initMoverCalibration,
  MoverMountOrientation,
} from '../../shared/dmxFixtures'
import { useDmxSelector, useTypedSelector } from '../redux/store'
import { useRealtimeSelector } from '../redux/realtimeStore'
import {
  setFixtureMoverBounds,
  setMoverGroupForFixture,
  setFixtureMoverMountOrientation,
  updateFixtureType,
} from '../redux/dmxSlice'
import {
  clearMoverCalibrationOverride,
  setMoverCalibrationOverride,
  setMoverFollowOverrideGroups,
  setMoverFollowOverridePan,
  setMoverFollowOverrideTilt,
  setMoverFollowOverrideUseAllGroups,
  toggleMoverFollowOverrideGroup,
  toggleMoverFollowOverrideEnabled,
} from '../redux/guiSlice'
import {
  buildMoverPreviewRows,
  type LightingPreviewFixtureRow,
} from './lightingPreviewFixtures'

type MoverFixtureRow = LightingPreviewFixtureRow

interface CalibrationPreview {
  axis: 'pan' | 'tilt'
  dmx: number
}

interface BoundsPreview {
  panDmx: number
  tiltDmx: number
}

interface LiveAxisReadout {
  panRaw: number
  tiltRaw: number
  panNorm: number
  tiltNorm: number
}

interface MoverLiveView {
  row: MoverFixtureRow
  fixtureNormX: number
  fixtureNormY: number
  axis: LiveAxisReadout | null
  spotNormX: number | null
  spotNormY: number | null
  spotConfidence: number
  hasCustomBounds: boolean
  color: string
}

function clampDmxValue(value: number): number {
  if (!Number.isFinite(value)) return DMX_MIN_VALUE
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function fixtureColor(fixtureId: string): string {
  let hash = 0
  for (let i = 0; i < fixtureId.length; i++) {
    hash = (hash * 31 + fixtureId.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return `hsl(${hue}, 78%, 64%)`
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

function readLiveAxis(
  row: MoverFixtureRow,
  dmxOutByUniverse: number[][]
): LiveAxisReadout | null {
  const universeIndex = Math.max(1, Math.round(row.fixture.universe ?? 1)) - 1
  const universeData = dmxOutByUniverse[universeIndex]
  if (universeData === undefined) {
    return null
  }

  let panCoarseChannel: number | null = null
  let panFineChannel: number | null = null
  let tiltCoarseChannel: number | null = null
  let tiltFineChannel: number | null = null
  let panMin = DMX_MIN_VALUE
  let panMax = DMX_MAX_VALUE
  let tiltMin = DMX_MIN_VALUE
  let tiltMax = DMX_MAX_VALUE

  row.fixtureType.channels.forEach((channel, channelIndex) => {
    if (channel.type !== 'axis') return
    const absoluteChannel = row.fixture.ch + channelIndex - 1

    if (channel.dir === 'x') {
      if (channel.isFine) {
        panFineChannel = absoluteChannel
      } else {
        panCoarseChannel = absoluteChannel
        panMin = channel.min
        panMax = channel.max
      }
      return
    }

    if (channel.isFine) {
      tiltFineChannel = absoluteChannel
    } else {
      tiltCoarseChannel = absoluteChannel
      tiltMin = channel.min
      tiltMax = channel.max
    }
  })

  if (panCoarseChannel === null || tiltCoarseChannel === null) {
    return null
  }

  const panCoarse = universeData[panCoarseChannel]
  const tiltCoarse = universeData[tiltCoarseChannel]
  if (!Number.isFinite(panCoarse) || !Number.isFinite(tiltCoarse)) {
    return null
  }

  const panFine = panFineChannel !== null ? universeData[panFineChannel] ?? 0 : 0
  const tiltFine =
    tiltFineChannel !== null ? universeData[tiltFineChannel] ?? 0 : 0

  const panRaw = Number(panCoarse) + Number(panFine) / 256
  const tiltRaw = Number(tiltCoarse) + Number(tiltFine) / 256

  return {
    panRaw,
    tiltRaw,
    panNorm: normalizeAxisValue(panRaw, panMin, panMax),
    tiltNorm: normalizeAxisValue(tiltRaw, tiltMin, tiltMax),
  }
}

function getMoverBoundValue(
  bounds: MoverBounds,
  corner: keyof MoverBounds,
  axis: 'pan' | 'tilt',
  fallback: number
) {
  const rawValue = Number(bounds[corner][axis])
  return clampDmxValue(Number.isFinite(rawValue) ? rawValue : fallback)
}

function interpolateBounds(bounds: MoverBounds, x: number, y: number) {
  const clampedX = clamp01(x)
  const clampedY = clamp01(y)

  const topPan =
    getMoverBoundValue(bounds, 'topLeft', 'pan', DMX_MIN_VALUE) +
    (getMoverBoundValue(bounds, 'topRight', 'pan', DMX_MAX_VALUE) -
      getMoverBoundValue(bounds, 'topLeft', 'pan', DMX_MIN_VALUE)) *
      clampedX
  const bottomPan =
    getMoverBoundValue(bounds, 'bottomLeft', 'pan', DMX_MIN_VALUE) +
    (getMoverBoundValue(bounds, 'bottomRight', 'pan', DMX_MAX_VALUE) -
      getMoverBoundValue(bounds, 'bottomLeft', 'pan', DMX_MIN_VALUE)) *
      clampedX
  const pan = topPan + (bottomPan - topPan) * clampedY

  const topTilt =
    getMoverBoundValue(bounds, 'topLeft', 'tilt', DMX_MAX_VALUE) +
    (getMoverBoundValue(bounds, 'topRight', 'tilt', DMX_MAX_VALUE) -
      getMoverBoundValue(bounds, 'topLeft', 'tilt', DMX_MAX_VALUE)) *
      clampedX
  const bottomTilt =
    getMoverBoundValue(bounds, 'bottomLeft', 'tilt', DMX_MIN_VALUE) +
    (getMoverBoundValue(bounds, 'bottomRight', 'tilt', DMX_MIN_VALUE) -
      getMoverBoundValue(bounds, 'bottomLeft', 'tilt', DMX_MIN_VALUE)) *
      clampedX
  const tilt = topTilt + (bottomTilt - topTilt) * clampedY

  return { pan, tilt }
}

function estimateSpotFromBounds(
  bounds: MoverBounds,
  panDmx: number,
  tiltDmx: number
): { x: number; y: number; confidence: number } {
  let centerX = 0.5
  let centerY = 0.5
  let span = 1
  let bestX = 0.5
  let bestY = 0.5
  let bestError = Number.POSITIVE_INFINITY

  for (let pass = 0; pass < 4; pass++) {
    const samples = pass === 0 ? 13 : 9
    for (let yi = 0; yi < samples; yi++) {
      for (let xi = 0; xi < samples; xi++) {
        const relX = samples <= 1 ? 0.5 : xi / (samples - 1)
        const relY = samples <= 1 ? 0.5 : yi / (samples - 1)
        const x = clamp01(centerX + (relX - 0.5) * span)
        const y = clamp01(centerY + (relY - 0.5) * span)
        const estimate = interpolateBounds(bounds, x, y)
        const panError = estimate.pan - panDmx
        const tiltError = estimate.tilt - tiltDmx
        const score = panError * panError + tiltError * tiltError
        if (score < bestError) {
          bestError = score
          bestX = x
          bestY = y
        }
      }
    }
    centerX = bestX
    centerY = bestY
    span *= 0.38
  }

  const normalizedError = Math.sqrt(bestError) / 255
  return {
    x: bestX,
    y: bestY,
    confidence: clamp01(1 - normalizedError),
  }
}

export default function MoversPage() {
  const dispatch = useDispatch()

  const moverFixtures = useDmxSelector(buildMoverPreviewRows)
  const stage = useDmxSelector((state) => state.stage)
  const dmxOutByUniverse = useRealtimeSelector((state) => state.dmxOutByUniverse)
  const moverFollowOverrideEnabled = useTypedSelector(
    (state) => state.gui.moverFollowOverrideEnabled
  )
  const moverFollowOverridePan = useTypedSelector(
    (state) => state.gui.moverFollowOverridePan
  )
  const moverFollowOverrideTilt = useTypedSelector(
    (state) => state.gui.moverFollowOverrideTilt
  )
  const moverFollowOverrideUseAllGroups = useTypedSelector(
    (state) => state.gui.moverFollowOverrideUseAllGroups
  )
  const moverFollowOverrideGroups = useTypedSelector(
    (state) => state.gui.moverFollowOverrideGroups
  )

  const moverGroupNames = useMemo(() => {
    const names = moverFixtures
      .map((row) => row.groupName.trim())
      .filter((name) => name.length > 0)
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [moverFixtures])

  const [calibrationFixtureId, setCalibrationFixtureId] = useState<string | null>(
    null
  )
  const [calibrationFixtureLabel, setCalibrationFixtureLabel] = useState('')

  useEffect(() => {
    if (
      calibrationFixtureId !== null &&
      !moverFixtures.some((fixture) => fixture.fixtureId === calibrationFixtureId)
    ) {
      setCalibrationFixtureId(null)
      setCalibrationFixtureLabel('')
      dispatch(clearMoverCalibrationOverride())
    }
  }, [calibrationFixtureId, dispatch, moverFixtures])

  useEffect(() => {
    return () => {
      dispatch(clearMoverCalibrationOverride())
    }
  }, [dispatch])

  useEffect(() => {
    if (moverFollowOverrideUseAllGroups) {
      return
    }
    const allowed = new Set(moverGroupNames)
    const pruned = moverFollowOverrideGroups.filter((group) => allowed.has(group))
    if (pruned.length !== moverFollowOverrideGroups.length) {
      dispatch(setMoverFollowOverrideGroups(pruned))
    }
  }, [
    dispatch,
    moverFollowOverrideGroups,
    moverFollowOverrideUseAllGroups,
    moverGroupNames,
  ])

  const calibrationFixtureRow = useMemo(() => {
    if (calibrationFixtureId === null) {
      return null
    }

    return (
      moverFixtures.find((fixture) => fixture.fixtureId === calibrationFixtureId) ??
      null
    )
  }, [calibrationFixtureId, moverFixtures])

  const calibrationFixtureType = calibrationFixtureRow?.fixtureType ?? null
  const liveMovers = useMemo<MoverLiveView[]>(() => {
    return moverFixtures.map((row) => {
      const axis = readLiveAxis(row, dmxOutByUniverse)
      const hasCustomBounds = row.fixture.moverBounds !== undefined
      const bounds = row.fixture.moverBounds ?? initMoverBounds()
      const fixtureNormX = clamp01(row.fixture.window?.x?.pos ?? 0.5)
      const fixtureNormY = clamp01(row.fixture.window?.y?.pos ?? 0.5)
      const color = fixtureColor(row.fixtureId)

      if (axis === null) {
        return {
          row,
          fixtureNormX,
          fixtureNormY,
          axis,
          spotNormX: null,
          spotNormY: null,
          spotConfidence: 0,
          hasCustomBounds,
          color,
        }
      }

      const estimate = hasCustomBounds
        ? estimateSpotFromBounds(bounds, axis.panRaw, axis.tiltRaw)
        : {
            x: axis.panNorm,
            y: axis.tiltNorm,
            confidence: 0.45,
          }
      return {
        row,
        fixtureNormX,
        fixtureNormY,
        axis,
        spotNormX: estimate.x,
        spotNormY: estimate.y,
        spotConfidence: estimate.confidence,
        hasCustomBounds,
        color,
      }
    })
  }, [dmxOutByUniverse, moverFixtures])
  const moversWithBoundsTargets = useMemo(
    () =>
      liveMovers.filter(
        (entry) => entry.spotNormX !== null && entry.spotNormY !== null
      ),
    [liveMovers]
  )

  function setMoverGroup(fixtureId: string, groupName: string) {
    dispatch(
      setMoverGroupForFixture({
        fixtureId,
        groupName,
      })
    )
  }

  function setMoverMountOrientation(
    fixtureId: string,
    orientation: MoverMountOrientation
  ) {
    dispatch(
      setFixtureMoverMountOrientation({
        fixtureId,
        orientation,
      })
    )
  }

  function setCalibrationOverridePreview(
    fixtureId: string,
    panDmx: number,
    tiltDmx: number
  ) {
    dispatch(
      setMoverCalibrationOverride({
        fixtureId,
        panDmx: clampDmxValue(panDmx),
        tiltDmx: clampDmxValue(tiltDmx),
      })
    )
  }

  function updateCalibration(
    fixtureType: FixtureType,
    updater: (current: MoverCalibration) => MoverCalibration,
    preview?: CalibrationPreview
  ) {
    const current = fixtureType.moverCalibration ?? initMoverCalibration()
    const nextCalibration = updater(current)

    dispatch(
      updateFixtureType({
        ...fixtureType,
        moverCalibration: nextCalibration,
      })
    )

    if (calibrationFixtureRow?.fixtureType.id === fixtureType.id) {
      const panDmx =
        preview?.axis === 'pan' ? preview.dmx : nextCalibration.pan.home
      const tiltDmx =
        preview?.axis === 'tilt' ? preview.dmx : nextCalibration.tilt.home

      if (calibrationFixtureRow !== null) {
        setCalibrationOverridePreview(calibrationFixtureRow.fixtureId, panDmx, tiltDmx)
      }
    }
  }

  function updateMoverBounds(
    row: MoverFixtureRow,
    updater: (current: MoverBounds) => MoverBounds,
    preview?: BoundsPreview
  ) {
    const currentBounds = row.fixture.moverBounds ?? initMoverBounds()
    const nextBounds = updater(currentBounds)

    dispatch(
      setFixtureMoverBounds({
        fixtureId: row.fixtureId,
        moverBounds: nextBounds,
      })
    )

    if (preview !== undefined) {
      setCalibrationOverridePreview(row.fixtureId, preview.panDmx, preview.tiltDmx)
    }
  }

  function openCalibration(row: MoverFixtureRow) {
    const calibration = row.fixtureType.moverCalibration ?? initMoverCalibration()
    setCalibrationFixtureId(row.fixtureId)
    setCalibrationFixtureLabel(row.fixtureLabel)
    setCalibrationOverridePreview(
      row.fixtureId,
      calibration.pan.home,
      calibration.tilt.home
    )
  }

  function closeCalibration() {
    setCalibrationFixtureId(null)
    setCalibrationFixtureLabel('')
    dispatch(clearMoverCalibrationOverride())
  }

  const floorAspectRatio = useMemo(() => {
    const width = Math.max(2, Number(stage.widthFt))
    const depth = Math.max(2, Number(stage.depthFt))
    return width / depth
  }, [stage.depthFt, stage.widthFt])

  return (
    <Root>
      <StatusBar />
      <Content>
        <Panel>
          <PanelTitle>Mover Groups</PanelTitle>
          <PanelHint>
            Movers are auto-grouped by fixture groups/type name. Click a fixture row
            to open calibration, and rename groups to split or merge fixtures.
            Orientation is appended automatically (`Upright`/`Hung`) so movement
            patterns stay separated by mount type.
          </PanelHint>

          <PanelScroll>
            {moverFixtures.length === 0 && (
              <Empty>No mover fixtures found. Add fixtures with Pan + Tilt axis channels.</Empty>
            )}

            {moverFixtures.map((row) => (
              <FixtureRow
                key={row.fixtureId}
                onClick={() => openCalibration(row)}
                title="Open mover calibration"
              >
                <FixtureMeta>
                  <FixtureName>{row.fixtureLabel}</FixtureName>
                  <FixtureTypeText>
                    {row.fixtureType.manufacturer || 'Custom fixture'}
                  </FixtureTypeText>
                </FixtureMeta>

                <GroupEditor
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <Input
                    value={row.groupName}
                    onChange={(newName) => setMoverGroup(row.fixtureId, newName)}
                    placeholder="Mover group"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setMoverGroup(row.fixtureId, '')}
                    title="Reset to automatic mover group"
                  >
                    Auto
                  </Button>
                  <Button
                    size="small"
                    variant={
                      row.moverMountOrientation === 'inverted'
                        ? 'contained'
                        : 'outlined'
                    }
                    onClick={() =>
                      setMoverMountOrientation(
                        row.fixtureId,
                        row.moverMountOrientation === 'inverted'
                          ? 'upright'
                          : 'inverted'
                      )
                    }
                    title="Toggle fixture mount orientation"
                  >
                    {row.moverMountOrientation === 'inverted' ? 'Hung' : 'Upright'}
                  </Button>
                </GroupEditor>
              </FixtureRow>
            ))}
          </PanelScroll>
        </Panel>

        <RightColumn>
          <Panel>
            <PanelTitle>Follow Override</PanelTitle>
            <PanelHint>
              Midi assignable pan and tilt follow spot override. All selected mover groups follow a single target point.
            </PanelHint>
            <PanelScroll>
              <OverrideRow>
                <OverrideControls>
                  <ButtonMidiOverlay
                    action={{ type: 'toggleMoverFollowOverride' }}
                    style={{ flex: '0 0 auto' }}
                  >
                    <OverrideToggleButton
                      type="button"
                      $active={moverFollowOverrideEnabled}
                      onClick={() => dispatch(toggleMoverFollowOverrideEnabled())}
                      title="Enable or disable follow override"
                    >
                      {moverFollowOverrideEnabled ? 'Override On' : 'Override Off'}
                    </OverrideToggleButton>
                  </ButtonMidiOverlay>
                </OverrideControls>
                <KnobColumn>
                  <SliderMidiOverlay action={{ type: 'setMoverFollowOverridePan' }}>
                    <KnobControl>
                      <KnobLabel>X</KnobLabel>
                      <KnobDial
                        style={{
                          background: `conic-gradient(from -135deg, #7ec8ff ${
                            clamp01(moverFollowOverridePan) * 270
                          }deg, #1a1f28 ${clamp01(moverFollowOverridePan) * 270}deg 270deg, #1a1f28 270deg)`,
                        }}
                      >
                        <KnobPointer
                          style={{
                            transform: `translate(-50%, -100%) rotate(${
                              -135 + clamp01(moverFollowOverridePan) * 270
                            }deg)`,
                          }}
                        />
                        <KnobInput
                          type="range"
                          min={0}
                          max={1}
                          step={0.001}
                          value={moverFollowOverridePan}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            dispatch(
                              setMoverFollowOverridePan(
                                clamp01(Number(event.target.value) || 0)
                              )
                            )
                          }
                          title="Follow override X"
                        />
                      </KnobDial>
                    </KnobControl>
                  </SliderMidiOverlay>
                  <SliderMidiOverlay action={{ type: 'setMoverFollowOverrideTilt' }}>
                    <KnobControl>
                      <KnobLabel>Y</KnobLabel>
                      <KnobDial
                        style={{
                          background: `conic-gradient(from -135deg, #ffb887 ${
                            clamp01(moverFollowOverrideTilt) * 270
                          }deg, #1a1f28 ${clamp01(moverFollowOverrideTilt) * 270}deg 270deg, #1a1f28 270deg)`,
                        }}
                      >
                        <KnobPointer
                          style={{
                            transform: `translate(-50%, -100%) rotate(${
                              -135 + clamp01(moverFollowOverrideTilt) * 270
                            }deg)`,
                          }}
                        />
                        <KnobInput
                          type="range"
                          min={0}
                          max={1}
                          step={0.001}
                          value={moverFollowOverrideTilt}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            dispatch(
                              setMoverFollowOverrideTilt(
                                clamp01(Number(event.target.value) || 0)
                              )
                            )
                          }
                          title="Follow override Y"
                        />
                      </KnobDial>
                    </KnobControl>
                  </SliderMidiOverlay>
                </KnobColumn>
                <FollowGroupsSection>
                  <FollowGroupsHeader>
                    <FollowGroupsLabel>Follow Groups</FollowGroupsLabel>
                    <GroupScopeToggle
                      type="button"
                      $active={moverFollowOverrideUseAllGroups}
                      onClick={() => dispatch(setMoverFollowOverrideUseAllGroups(true))}
                      title="Apply follow override to all mover groups"
                    >
                      All Groups
                    </GroupScopeToggle>
                    <GroupScopeToggle
                      type="button"
                      $active={!moverFollowOverrideUseAllGroups}
                      onClick={() => {
                        dispatch(setMoverFollowOverrideUseAllGroups(false))
                        if (moverFollowOverrideGroups.length <= 0) {
                          dispatch(setMoverFollowOverrideGroups(moverGroupNames))
                        }
                      }}
                      title="Apply follow override only to selected groups"
                    >
                      Selected
                    </GroupScopeToggle>
                  </FollowGroupsHeader>
                  <FollowGroupsBody>
                    {moverFollowOverrideUseAllGroups ? (
                      <FollowGroupsHint>
                        Override targets all mover groups.
                      </FollowGroupsHint>
                    ) : moverGroupNames.length <= 0 ? (
                      <FollowGroupsHint>No mover groups available.</FollowGroupsHint>
                    ) : (
                      <FollowGroupsList>
                        {moverGroupNames.map((groupName) => {
                          const active = moverFollowOverrideGroups.includes(groupName)
                          return (
                            <FollowGroupChip
                              key={groupName}
                              type="button"
                              $active={active}
                              onClick={() => dispatch(toggleMoverFollowOverrideGroup(groupName))}
                              title={`Toggle follow override for ${groupName}`}
                            >
                              {groupName}
                            </FollowGroupChip>
                          )
                        })}
                      </FollowGroupsList>
                    )}
                  </FollowGroupsBody>
                </FollowGroupsSection>
              </OverrideRow>
            </PanelScroll>
          </Panel>

          <Panel>
            <PanelTitle>Live Pan/Tilt Grid</PanelTitle>
            <PanelHint>
              Each mover tile shows live pan/tilt position from DMX output. Layout is
              left-to-right, top-to-bottom.
            </PanelHint>
            <PanelScroll>
              <MoverPadGrid>
                {liveMovers.map((entry) => (
                  <MoverPadCard
                    key={`pad-${entry.row.fixtureId}`}
                    onClick={() => openCalibration(entry.row)}
                    title="Open mover calibration"
                    $selected={calibrationFixtureId === entry.row.fixtureId}
                  >
                    <MoverPadLabel>{entry.row.fixtureName}</MoverPadLabel>
                    <MoverPadSubLabel>
                      {entry.axis === null
                        ? 'No live pan/tilt channels'
                        : `Pan ${entry.axis.panRaw.toFixed(1)} | Tilt ${entry.axis.tiltRaw.toFixed(1)}`}
                    </MoverPadSubLabel>
                    <MoverPadCanvas>
                      <MoverPadCenterV />
                      <MoverPadCenterH />
                      {entry.axis !== null && (
                        <MoverPadCursor
                          style={{
                            left: `${entry.axis.panNorm * 100}%`,
                            top: `${(1 - entry.axis.tiltNorm) * 100}%`,
                          }}
                        />
                      )}
                    </MoverPadCanvas>
                  </MoverPadCard>
                ))}
              </MoverPadGrid>
            </PanelScroll>
          </Panel>

          <Panel>
            <PanelTitle>Dance Floor Target Map</PanelTitle>
            <PanelHint>
              Shows mover locations and target points. Bounds-calibrated mapping is
              preferred; fixture-placement fallback is used when bounds are unavailable.
            </PanelHint>
            <PanelScroll>
              <FloorMapWrap>
                <FloorMap style={{ aspectRatio: `${Math.max(0.2, floorAspectRatio)} / 1` }}>
                  <OrientationLabel style={{ top: '0.3rem', left: '50%' }}>
                    Stage / Back
                  </OrientationLabel>
                  <OrientationLabel style={{ bottom: '0.3rem', left: '50%' }}>
                    Audience / Front
                  </OrientationLabel>
                  <CornerLabel style={{ left: '0.35rem', top: '0.3rem' }}>TL</CornerLabel>
                  <CornerLabel style={{ right: '0.35rem', top: '0.3rem' }}>TR</CornerLabel>
                  <CornerLabel style={{ left: '0.35rem', bottom: '0.3rem' }}>BL</CornerLabel>
                  <CornerLabel style={{ right: '0.35rem', bottom: '0.3rem' }}>BR</CornerLabel>
                  {moversWithBoundsTargets.map((entry) => {
                      const fixtureX = entry.fixtureNormX * 100
                      const fixtureY = (1 - entry.fixtureNormY) * 100
                      const spotX = (entry.spotNormX ?? 0.5) * 100
                      const spotY = (1 - (entry.spotNormY ?? 0.5)) * 100

                      return (
                        <MapLayer key={`map-${entry.row.fixtureId}`}>
                          <MapLineSvg viewBox="0 0 100 100" preserveAspectRatio="none">
                            <MapLineElement
                              x1={fixtureX}
                              y1={fixtureY}
                              x2={spotX}
                              y2={spotY}
                              stroke={entry.color}
                              strokeOpacity={0.35 + entry.spotConfidence * 0.5}
                            />
                          </MapLineSvg>
                          <MoverPoint
                            style={{
                              left: `${fixtureX}%`,
                              top: `${fixtureY}%`,
                              background: entry.color,
                            }}
                            title={`${entry.row.fixtureName} mover position`}
                          />
                          <SpotPoint
                            style={{
                              left: `${spotX}%`,
                              top: `${spotY}%`,
                              background: entry.color,
                            }}
                            title={`${entry.row.fixtureName} floor spot`}
                          />
                        </MapLayer>
                      )
                    })}
                  {moversWithBoundsTargets.length === 0 && (
                    <FloorMapEmpty>
                      Move movers to generate targets. Bounds calibration improves
                      targeting accuracy.
                    </FloorMapEmpty>
                  )}
                </FloorMap>
                <MapLegend>
                  {moversWithBoundsTargets.map((entry) => (
                    <LegendItem key={`legend-${entry.row.fixtureId}`}>
                      <LegendSwatch style={{ background: entry.color }} />
                      {entry.row.fixtureName}
                    </LegendItem>
                  ))}
                </MapLegend>
              </FloorMapWrap>
            </PanelScroll>
          </Panel>
        </RightColumn>
      </Content>

      <Dialog
        open={calibrationFixtureType !== null}
        onClose={closeCalibration}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Mover Calibration: {calibrationFixtureType?.name ?? ''}
        </DialogTitle>
        <DialogContent dividers>
          <DialogHint>
            Fixture: {calibrationFixtureLabel || 'Selected mover fixture'}
            <br />
            Anchor calibration values are DMX units (`0-255`). Pan/Tilt range is
            physical degrees and drives aiming math.
            Bounds below apply only to this selected fixture.
          </DialogHint>

          {calibrationFixtureRow !== null && (
            <MountRow>
              <MountLabel>Mount Orientation</MountLabel>
              <Button
                size="small"
                variant={
                  calibrationFixtureRow.moverMountOrientation === 'inverted'
                    ? 'contained'
                    : 'outlined'
                }
                onClick={() =>
                  setMoverMountOrientation(
                    calibrationFixtureRow.fixtureId,
                    calibrationFixtureRow.moverMountOrientation === 'inverted'
                      ? 'upright'
                      : 'inverted'
                  )
                }
                title="Set whether this fixture is hung upside-down or right-side up"
              >
                {calibrationFixtureRow.moverMountOrientation === 'inverted'
                  ? 'Hung / Inverted'
                  : 'Upright'}
              </Button>
            </MountRow>
          )}

          {calibrationFixtureType !== null && (
            <CalibrationEditor
              fixtureType={calibrationFixtureType}
              isFixtureInverted={calibrationFixtureRow?.moverMountOrientation === 'inverted'}
              onUpdate={(updater, preview) =>
                updateCalibration(calibrationFixtureType, updater, preview)
              }
              onPreview={(preview) => {
                if (calibrationFixtureRow === null) {
                  return
                }

                const calibration =
                  calibrationFixtureType.moverCalibration ?? initMoverCalibration()
                const panDmx =
                  preview.axis === 'pan' ? preview.dmx : calibration.pan.home
                const tiltDmx =
                  preview.axis === 'tilt' ? preview.dmx : calibration.tilt.home

                setCalibrationOverridePreview(
                  calibrationFixtureRow.fixtureId,
                  panDmx,
                  tiltDmx
                )
              }}
            />
          )}

          {calibrationFixtureRow !== null && (
            <BoundsEditor
              bounds={calibrationFixtureRow.fixture.moverBounds ?? initMoverBounds()}
              onUpdate={(updater, preview) =>
                updateMoverBounds(calibrationFixtureRow, updater, preview)
              }
              onPreview={(preview) =>
                setCalibrationOverridePreview(
                  calibrationFixtureRow.fixtureId,
                  preview.panDmx,
                  preview.tiltDmx
                )
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCalibration} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Root>
  )
}

function CalibrationEditor({
  fixtureType,
  isFixtureInverted,
  onUpdate,
  onPreview,
}: {
  fixtureType: FixtureType
  isFixtureInverted: boolean
  onUpdate: (
    updater: (current: MoverCalibration) => MoverCalibration,
    preview?: CalibrationPreview
  ) => void
  onPreview: (preview: CalibrationPreview) => void
}) {
  const calibration = fixtureType.moverCalibration ?? initMoverCalibration()
  const tiltForwardLabel = 'Tilt Forward'
  const tiltSecondaryField: 'down' | 'up' = isFixtureInverted ? 'down' : 'up'
  const tiltSecondaryLabel = isFixtureInverted ? 'Tilt Toward Floor' : 'Tilt Toward Ceiling'
  const tiltSecondaryValue = isFixtureInverted ? calibration.tilt.down : calibration.tilt.up

  function previewPan(dmx: number) {
    onPreview({
      axis: 'pan',
      dmx: clampDmxValue(dmx),
    })
  }

  function previewTilt(dmx: number) {
    onPreview({
      axis: 'tilt',
      dmx: clampDmxValue(dmx),
    })
  }

  function setPanField(field: keyof MoverCalibration['pan'], value: number | boolean) {
    const preview: CalibrationPreview | undefined =
      typeof value === 'number' && field !== 'rangeDeg'
        ? { axis: 'pan', dmx: clampDmxValue(value) }
        : undefined

    onUpdate(
      (current) => ({
        ...current,
        pan: {
          ...current.pan,
          [field]: value,
        },
      }),
      preview
    )
  }

  function setTiltField(field: keyof MoverCalibration['tilt'], value: number | boolean) {
    const preview: CalibrationPreview | undefined =
      typeof value === 'number'
        ? { axis: 'tilt', dmx: clampDmxValue(value) }
        : undefined

    onUpdate(
      (current) => ({
        ...current,
        tilt: {
          ...current.tilt,
          [field]: value,
        },
      }),
      preview
    )
  }

  return (
    <>
      <CalibrationSection>
        <SectionTitle>Pan Calibration</SectionTitle>
        <FieldGrid>
          <NumberField
            val={calibration.pan.min}
            label="Pan Min"
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewPan(calibration.pan.min)}
            onMouseDown={() => previewPan(calibration.pan.min)}
            onChange={(value) => setPanField('min', clampDmxValue(value))}
          />
          <NumberField
            val={calibration.pan.max}
            label="Pan Max"
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewPan(calibration.pan.max)}
            onMouseDown={() => previewPan(calibration.pan.max)}
            onChange={(value) => setPanField('max', clampDmxValue(value))}
          />
          <NumberField
            val={calibration.pan.front}
            label="Pan Front"
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewPan(calibration.pan.front)}
            onMouseDown={() => previewPan(calibration.pan.front)}
            onChange={(value) => setPanField('front', clampDmxValue(value))}
          />
          <NumberField
            val={calibration.pan.back}
            label="Pan Back"
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewPan(calibration.pan.back)}
            onMouseDown={() => previewPan(calibration.pan.back)}
            onChange={(value) => setPanField('back', clampDmxValue(value))}
          />
          <NumberField
            val={calibration.pan.home}
            label="Pan Home"
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewPan(calibration.pan.home)}
            onMouseDown={() => previewPan(calibration.pan.home)}
            onChange={(value) => setPanField('home', clampDmxValue(value))}
          />
          <NumberField
            val={calibration.pan.rangeDeg}
            label="Pan Range (deg)"
            min={MOVER_MIN_PAN_RANGE_DEG}
            max={MOVER_MAX_PAN_RANGE_DEG}
            numberType="float"
            step={1}
            variant="outlined"
            onChange={(value) =>
              setPanField(
                'rangeDeg',
                Math.max(
                  MOVER_MIN_PAN_RANGE_DEG,
                  Math.min(MOVER_MAX_PAN_RANGE_DEG, value)
                )
              )
            }
          />
        </FieldGrid>
        <Checkbox
          label="Reverse Pan DMX"
          checked={calibration.pan.invert}
          onChange={(checked) => setPanField('invert', checked)}
        />
      </CalibrationSection>

      <CalibrationSection>
        <SectionTitle>Tilt Calibration</SectionTitle>
        <DialogHint>
          Use two tilt anchors: Forward plus one vertical anchor. Upright uses Toward
          Ceiling, and Hung/Inverted uses Toward Floor.
        </DialogHint>
        <FieldGrid>
          <NumberField
            val={calibration.tilt.min}
            label="Tilt Min"
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewTilt(calibration.tilt.min)}
            onMouseDown={() => previewTilt(calibration.tilt.min)}
            onChange={(value) => setTiltField('min', clampDmxValue(value))}
          />
          <NumberField
            val={calibration.tilt.max}
            label="Tilt Max"
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewTilt(calibration.tilt.max)}
            onMouseDown={() => previewTilt(calibration.tilt.max)}
            onChange={(value) => setTiltField('max', clampDmxValue(value))}
          />
          <NumberField
            val={calibration.tilt.forward}
            label={tiltForwardLabel}
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewTilt(calibration.tilt.forward)}
            onMouseDown={() => previewTilt(calibration.tilt.forward)}
            onChange={(value) => setTiltField('forward', clampDmxValue(value))}
          />
          <NumberField
            val={tiltSecondaryValue}
            label={tiltSecondaryLabel}
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewTilt(tiltSecondaryValue)}
            onMouseDown={() => previewTilt(tiltSecondaryValue)}
            onChange={(value) => setTiltField(tiltSecondaryField, clampDmxValue(value))}
          />
          <NumberField
            val={calibration.tilt.home}
            label="Tilt Home"
            min={DMX_MIN_VALUE}
            max={DMX_MAX_VALUE}
            variant="outlined"
            highlightOnFocus
            onFocus={() => previewTilt(calibration.tilt.home)}
            onMouseDown={() => previewTilt(calibration.tilt.home)}
            onChange={(value) => setTiltField('home', clampDmxValue(value))}
          />
          <NumberField
            val={calibration.tilt.rangeDeg}
            label="Tilt Range (deg)"
            min={MOVER_MIN_TILT_RANGE_DEG}
            max={MOVER_MAX_TILT_RANGE_DEG}
            numberType="float"
            step={1}
            variant="outlined"
            onChange={(value) =>
              setTiltField(
                'rangeDeg',
                Math.max(
                  MOVER_MIN_TILT_RANGE_DEG,
                  Math.min(MOVER_MAX_TILT_RANGE_DEG, value)
                )
              )
            }
          />
        </FieldGrid>
        <Checkbox
          label="Reverse Tilt DMX"
          checked={calibration.tilt.invert}
          onChange={(checked) => setTiltField('invert', checked)}
        />
      </CalibrationSection>
    </>
  )
}

function BoundsEditor({
  bounds,
  onUpdate,
  onPreview,
}: {
  bounds: MoverBounds
  onUpdate: (
    updater: (current: MoverBounds) => MoverBounds,
    preview?: BoundsPreview
  ) => void
  onPreview: (preview: BoundsPreview) => void
}) {
  function previewCorner(corner: keyof MoverBounds) {
    onPreview({
      panDmx: clampDmxValue(bounds[corner].pan),
      tiltDmx: clampDmxValue(bounds[corner].tilt),
    })
  }

  function setCornerField(
    corner: keyof MoverBounds,
    axis: 'pan' | 'tilt',
    value: number
  ) {
    const dmxValue = clampDmxValue(value)
    const nextCorner = {
      ...bounds[corner],
      [axis]: dmxValue,
    }

    onUpdate(
      (current) => ({
        ...current,
        [corner]: {
          ...current[corner],
          [axis]: dmxValue,
        },
      }),
      {
        panDmx: nextCorner.pan,
        tiltDmx: nextCorner.tilt,
      }
    )
  }

  return (
    <CalibrationSection>
      <SectionHeader>
        <SectionTitle>Bound Area Corners</SectionTitle>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onUpdate(() => initMoverBounds())}
          title="Reset corners to full pan/tilt range"
        >
          Reset Bounds
        </Button>
      </SectionHeader>

      <DialogHint>
        Corner values map split Pan/Tilt (`0-1`) to this fixture as DMX values
        (`0-255`).
      </DialogHint>

      <BoundsGrid>
        {([
          ['topLeft', 'Top Left'],
          ['topRight', 'Top Right'],
          ['bottomLeft', 'Bottom Left'],
          ['bottomRight', 'Bottom Right'],
        ] as const).map(([cornerKey, label]) => {
          const corner = bounds[cornerKey]

          return (
            <CornerCard key={cornerKey}>
              <CornerTitle>{label}</CornerTitle>
              <CornerFields>
                <NumberField
                  val={corner.pan}
                  label="Pan"
                  min={DMX_MIN_VALUE}
                  max={DMX_MAX_VALUE}
                  variant="outlined"
                  highlightOnFocus
                  onFocus={() => previewCorner(cornerKey)}
                  onMouseDown={() => previewCorner(cornerKey)}
                  onChange={(value) => setCornerField(cornerKey, 'pan', value)}
                />
                <NumberField
                  val={corner.tilt}
                  label="Tilt"
                  min={DMX_MIN_VALUE}
                  max={DMX_MAX_VALUE}
                  variant="outlined"
                  highlightOnFocus
                  onFocus={() => previewCorner(cornerKey)}
                  onMouseDown={() => previewCorner(cornerKey)}
                  onChange={(value) => setCornerField(cornerKey, 'tilt', value)}
                />
              </CornerFields>
            </CornerCard>
          )
        })}
      </BoundsGrid>
    </CalibrationSection>
  )
}
const MountRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
`

const MountLabel = styled.div`
  font-size: 0.85rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Root = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`

const Content = styled.div`
  display: grid;
  grid-template-columns: minmax(22rem, 34rem) minmax(0, 1fr);
  gap: 0.9rem;
  padding: 1rem;
  min-height: 0;
  overflow: auto;

  @media (max-width: 1280px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Panel = styled.div`
  background: ${(props) => props.theme.colors.bg.darker};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.4rem;
  padding: 0.9rem;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const PanelScroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const PanelTitle = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
  margin-bottom: 0.4rem;
`

const PanelHint = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.8rem;
`

const Empty = styled.div`
  font-size: 0.9rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const FixtureRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.6rem;
  border-top: 1px solid ${(props) => props.theme.colors.divider};
  gap: 0.7rem;
  cursor: pointer;

  &:hover {
    background: ${(props) => props.theme.colors.bg.lighter};
  }
`

const FixtureMeta = styled.div`
  min-width: 10rem;
`

const FixtureName = styled.div`
  font-size: 0.9rem;
`

const FixtureTypeText = styled.div`
  font-size: 0.75rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const GroupEditor = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: min(22rem, 100%);
`

const RightColumn = styled.div`
  display: grid;
  grid-template-rows: auto minmax(14rem, 1fr) minmax(14rem, 0.95fr);
  gap: 0.9rem;
  min-width: 0;
  min-height: 0;
`

const OverrideRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  gap: 0.95rem;
`

const OverrideControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  flex-wrap: wrap;
`

const OverrideToggleButton = styled.button<{ $active: boolean }>`
  min-height: 2.7rem;
  padding: 0 1.15rem;
  border-radius: 0.35rem;
  border: 1px solid
    ${(props) => (props.$active ? '#2cab66' : props.theme.colors.divider)};
  background: ${(props) => (props.$active ? '#175f2f' : props.theme.colors.bg.lighter)};
  color: ${(props) => props.theme.colors.text.primary};
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
`

const KnobColumn = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.35rem;
  flex-wrap: wrap;
`

const KnobControl = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  min-width: 8.7rem;
`

const KnobLabel = styled.div`
  font-size: 0.85rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const KnobDial = styled.div`
  position: relative;
  width: 7.6rem;
  height: 7.6rem;
  border-radius: 999px;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: #1a1f28;
  box-shadow: inset 0 0 0 6px #090c11;
`

const KnobPointer = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.24rem;
  height: 2.45rem;
  border-radius: 0.25rem;
  background: #f4f7ff;
  transform-origin: 50% 100%;
  pointer-events: none;
`

const KnobInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  opacity: 0;
`

const FollowGroupsSection = styled.div`
  width: 100%;
  max-width: 44rem;
  min-width: 0;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.38rem;
  background: ${(props) => props.theme.colors.bg.primary};
  padding: 0.55rem 0.6rem;
  overflow: hidden;
  box-sizing: border-box;
`

const FollowGroupsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  margin-bottom: 0.45rem;
`

const FollowGroupsLabel = styled.div`
  font-size: 0.77rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-right: 0.2rem;
`

const GroupScopeToggle = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${(props) => (props.$active ? '#5a90ff' : props.theme.colors.divider)};
  background: ${(props) => (props.$active ? '#18366d' : props.theme.colors.bg.lighter)};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.3rem;
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
`

const FollowGroupsBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const FollowGroupsHint = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const FollowGroupsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`

const FollowGroupChip = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${(props) => (props.$active ? '#2cab66' : props.theme.colors.divider)};
  background: ${(props) => (props.$active ? '#164e31' : props.theme.colors.bg.lighter)};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 999px;
  font-size: 0.72rem;
  padding: 0.19rem 0.58rem;
  cursor: pointer;
`

const MoverPadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr));
  gap: 0.7rem;
  padding-right: 0.1rem;
`

const MoverPadCard = styled.div<{ $selected: boolean }>`
  border: 1px solid
    ${(props) =>
      props.$selected ? props.theme.colors.text.primary : props.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  cursor: pointer;
  background: ${(props) => props.theme.colors.bg.primary};
`

const MoverPadLabel = styled.div`
  font-size: 0.8rem;
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`

const MoverPadSubLabel = styled.div`
  font-size: 0.68rem;
  color: ${(props) => props.theme.colors.text.secondary};
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`

const MoverPadCanvas = styled.div`
  position: relative;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  background:
    linear-gradient(to right, transparent 49.5%, #ffffff33 49.5%, #ffffff33 50.5%, transparent 50.5%),
    linear-gradient(to bottom, transparent 49.5%, #ffffff33 49.5%, #ffffff33 50.5%, transparent 50.5%),
    #00000022;
  aspect-ratio: 1 / 1;
  min-height: 7.2rem;
  overflow: hidden;
`

const MoverPadCenterV = styled.div`
  display: none;
`

const MoverPadCenterH = styled.div`
  display: none;
`

const MoverPadCursor = styled.div`
  position: absolute;
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  background: #ffe17d;
  border: 1px solid #fff6;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px #ffe17daa;
`

const FloorMapWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 0;
`

const FloorMap = styled.div`
  position: relative;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  background:
    linear-gradient(to right, #ffffff18 1px, transparent 1px) 0 0 / 10% 10%,
    linear-gradient(to bottom, #ffffff18 1px, transparent 1px) 0 0 / 10% 10%,
    #0000002b;
  width: min(100%, 34rem);
  aspect-ratio: 1 / 1;
  min-height: 14rem;
  overflow: hidden;
`

const OrientationLabel = styled.div`
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.66rem;
  letter-spacing: 0.03em;
  color: ${(props) => props.theme.colors.text.secondary};
  text-transform: uppercase;
  pointer-events: none;
  opacity: 0.9;
`

const CornerLabel = styled.div`
  position: absolute;
  font-size: 0.64rem;
  color: ${(props) => props.theme.colors.text.secondary};
  pointer-events: none;
  opacity: 0.75;
`

const FloorMapEmpty = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.8rem;
  box-sizing: border-box;
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.76rem;
`

const MapLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`

const MapLineSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
`

const MapLineElement = styled.line`
  position: absolute;
  stroke-width: 0.42;
  stroke-linecap: round;
`

const MoverPoint = styled.div`
  position: absolute;
  width: 0.56rem;
  height: 0.56rem;
  border-radius: 999px;
  background: #6fb8ff;
  border: 1px solid #ffffffcc;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 7px #6fb8ffaa;
`

const SpotPoint = styled.div`
  position: absolute;
  width: 0.56rem;
  height: 0.56rem;
  border-radius: 999px;
  background: #ff8ac8;
  border: 1px solid #ffffffcc;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 7px #ff8ac8aa;
`

const MapLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`

const LegendSwatch = styled.div`
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 999px;
  border: 1px solid #ffffffcc;
`

const CalibrationSection = styled.div`
  margin-bottom: 1rem;
`

const SectionTitle = styled.div`
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
`

const BoundsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`

const CornerCard = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  padding: 0.5rem;
`

const CornerTitle = styled.div`
  font-size: 0.8rem;
  margin-bottom: 0.35rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const CornerFields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
`


const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 0.5rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const DialogHint = styled.div`
  font-size: 0.82rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: 0.8rem;
`













































