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
import {
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
  MOVER_MIN_TURNS,
  MOVER_MAX_TURNS,
  FixtureType,
  MoverBounds,
  MoverCalibration,
  initMoverBounds,
  initMoverCalibration,
  MoverMountOrientation,
} from '../../shared/dmxFixtures'
import { useDmxSelector } from '../redux/store'
import {
  setFixtureMoverBounds,
  setMoverGroupForFixture,
  setFixtureMoverMountOrientation,
  updateFixtureType,
} from '../redux/dmxSlice'
import { clearMoverCalibrationOverride, setMoverCalibrationOverride } from '../redux/guiSlice'
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

function clampDmxValue(value: number): number {
  if (!Number.isFinite(value)) return DMX_MIN_VALUE
  return Math.min(DMX_MAX_VALUE, Math.max(DMX_MIN_VALUE, Math.round(value)))
}

export default function MoversPage() {
  const dispatch = useDispatch()

  const moverFixtures = useDmxSelector(buildMoverPreviewRows)

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

  return (
    <Root>
      <StatusBar />
      <Content>
        <Panel>
          <PanelTitle>Mover Groups</PanelTitle>
          <PanelHint>
            Movers are auto-grouped by fixture groups/type name. Click a fixture row
            to open calibration, and rename groups to split or merge fixtures.
          </PanelHint>

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
        </Panel>
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
            Calibration values are DMX units (`0-255`).
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
      typeof value === 'number' && field !== 'turns'
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
            val={calibration.pan.turns}
            label="Pan Turns"
            min={MOVER_MIN_TURNS}
            max={MOVER_MAX_TURNS}
            numberType="float"
            step={0.25}
            variant="outlined"
            onChange={(value) =>
              setPanField(
                'turns',
                Math.max(MOVER_MIN_TURNS, Math.min(MOVER_MAX_TURNS, value))
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
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  min-height: 0;
  overflow: auto;
`

const Panel = styled.div`
  background: ${(props) => props.theme.colors.bg.darker};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.4rem;
  padding: 0.9rem;
  min-height: 0;
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













































