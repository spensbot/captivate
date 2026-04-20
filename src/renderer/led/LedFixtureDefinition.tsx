import { IconButton } from '@mui/material'
import RemoveIcon from '@mui/icons-material/Remove'
import SearchIcon from '@mui/icons-material/Search'
import { useDispatch } from 'react-redux'
import Input from 'renderer/base/Input'
import NumberField from 'renderer/base/NumberField'
import GroupPicker from 'renderer/base/GroupPicker'
import {
  removeLedFixture,
  setActiveLedFixture,
  updateActiveLedFixture,
} from 'renderer/redux/dmxSlice'
import { useDmxSelector } from 'renderer/redux/store'
import {
  LedFixture,
  MAX_LED_COUNT,
  WLedGridFixture,
  WLedStringFixture,
  getLedFixturePixelCount,
} from 'shared/ledFixtures'
import styled from 'styled-components'
import Dropdown from 'renderer/base/Dropdown'
import { useEffect, useState } from 'react'
import { fromFeet, stageAxisToDisplayValue } from 'shared/stage'
import WledDiscoveryDialog from './WledDiscoveryDialog'
import { probeWledController } from 'renderer/ipcHandler'
import {
  WledControllerCapabilities,
  WledOutputMode,
} from 'shared/wledDiscovery'

interface Props {
  index: number
}

const OUTPUT_MODE_LABEL: Record<WledOutputMode, string> = {
  auto: 'Auto',
  pixel: 'Pixel Stream',
  pwm3: 'PWM RGB (3ch)',
  pwm4: 'PWM RGBW (4ch)',
}

const PIXEL_FORMAT_LABEL: Record<'auto' | 'rgb' | 'rgbw', string> = {
  auto: 'Auto',
  rgb: 'RGB',
  rgbw: 'RGBW',
}

function toGridFixture(source: LedFixture): WLedGridFixture {
  return {
    type: 'WLed',
    id: source.id,
    name: source.name,
    groups: [...source.groups],
    mdns: source.mdns,
    controller: { ...source.controller },
    kind: 'grid',
    position: { ...source.position },
    rotation: { ...source.rotation },
    rows: 10,
    columns: 10,
    pixel_pitch: 0.02,
    anchor: { x: 0.2, y: 0.8 },
    anchor_xz: { x: 0.2, y: 0.8 },
    serpentine: true,
  }
}

function toStringFixture(source: LedFixture): WLedStringFixture {
  return {
    type: 'WLed',
    id: source.id,
    name: source.name,
    groups: [...source.groups],
    mdns: source.mdns,
    controller: { ...source.controller },
    kind: 'string',
    position: { ...source.position },
    rotation: { ...source.rotation },
    led_count: 100,
    pixel_spacing: 0.01,
    draw_mode: 'polyline',
    points: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }],
    segment_modes: ['polyline'],
    curve_handles: [
      { in: 0.04, out: 0.04 },
      { in: 0.04, out: 0.04 },
    ],
    points_xz: [{ x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }],
    segment_modes_xz: ['polyline'],
    curve_handles_xz: [
      { in: 0.04, out: 0.04 },
      { in: 0.04, out: 0.04 },
    ],
  }
}

export default function LedFixtureDefinition({ index }: Props) {
  const fixtures = useDmxSelector((dmx) => dmx.led.ledFixtures)
  const stage = useDmxSelector((dmx) => dmx.stage)
  const def = fixtures[index]
  const isActive = useDmxSelector((dmx) => dmx.led.activeFixture === index)
  const dispatch = useDispatch()
  const [hostDialogOpen, setHostDialogOpen] = useState(false)
  const [capabilities, setCapabilities] = useState<WledControllerCapabilities | null>(
    null
  )
  const [isProbingHost, setIsProbingHost] = useState(false)
  const [probeError, setProbeError] = useState<string | null>(null)

  const availableGroups = Array.from(
    new Set(fixtures.flatMap((fixture) => fixture.groups))
  ).sort((a, b) => (a > b ? 1 : -1))

  const pixelCount = getLedFixturePixelCount(def)
  const xDisplay = stageAxisToDisplayValue(stage, 'x', def.position.x).toFixed(2)
  const yDisplay = stageAxisToDisplayValue(stage, 'y', def.position.y).toFixed(2)
  const zDisplay = stageAxisToDisplayValue(stage, 'z', def.position.z).toFixed(2)
  const spacingDisplay =
    def.kind === 'string'
      ? fromFeet(def.pixel_spacing * stage.widthFt, stage.unit).toFixed(3)
      : fromFeet(def.pixel_pitch * stage.widthFt, stage.unit).toFixed(3)

  const updateFixture = (next: LedFixture) => {
    dispatch(updateActiveLedFixture(next))
  }

  const patchFixture = (next: Partial<LedFixture>) => {
    updateFixture({ ...def, ...next } as LedFixture)
  }

  useEffect(() => {
    if (!isActive) return
    const host = def.mdns.trim()
    if (host.length <= 0) {
      setCapabilities(null)
      setProbeError(null)
      setIsProbingHost(false)
      return
    }

    let cancelled = false
    setIsProbingHost(true)
    setProbeError(null)
    void probeWledController(host)
      .then((nextCapabilities) => {
        if (cancelled) return
        setCapabilities(nextCapabilities)
        if (!nextCapabilities.reachable) {
          setProbeError(nextCapabilities.warnings[0] ?? 'Controller is unreachable.')
          return
        }
        const currentMode = def.controller.output_mode
        if (
          currentMode === 'auto' &&
          nextCapabilities.defaultOutputMode !== 'auto'
        ) {
          patchFixture({
            controller: {
              ...def.controller,
              output_mode: nextCapabilities.defaultOutputMode,
              pixel_format:
                nextCapabilities.supportsPixelRgbw === true ? 'rgbw' : 'rgb',
            },
          } as Partial<LedFixture>)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setCapabilities(null)
        setProbeError(err instanceof Error ? err.message : 'Capability probe failed')
      })
      .finally(() => {
        if (!cancelled) {
          setIsProbingHost(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isActive, def.mdns])

  const outputModeOptions: WledOutputMode[] = (() => {
    const options: WledOutputMode[] = ['auto']
    if (capabilities?.supportsPixel !== false) options.push('pixel')
    if (capabilities?.supportsPwm3 === true) options.push('pwm3')
    if (capabilities?.supportsPwm4 === true) options.push('pwm4')
    return Array.from(new Set(options))
  })()

  const selectedSegmentLength = (() => {
    if (capabilities === null || def.controller.segment_id === null) {
      return null
    }
    const segment = capabilities.segments.find(
      (candidate) => candidate.id === def.controller.segment_id
    )
    return segment?.length ?? null
  })()
  const effectiveOutputMode =
    def.controller.output_mode === 'auto'
      ? capabilities?.defaultOutputMode ?? 'pixel'
      : def.controller.output_mode
  const pixelFormatOptions = (() => {
    const options: Array<'auto' | 'rgb' | 'rgbw'> = ['auto', 'rgb']
    if (capabilities?.supportsPixelRgbw === true) {
      options.push('rgbw')
    }
    return options
  })()

  if (isActive)
    return (
      <ActiveRoot>
        <Row>
          <Dropdown
            isOpen={true}
            onClick={() => dispatch(setActiveLedFixture(null))}
          />
          <EditColumn>
            <Input
              value={def.name}
              onChange={(name) => {
                patchFixture({ name })
              }}
            />
            <Sp />
            <HostPickerButton type="button" onClick={() => setHostDialogOpen(true)}>
              <SearchIcon style={{ fontSize: '1rem' }} />
              <HostText>{def.mdns.trim().length > 0 ? def.mdns : 'Select WLED Host'}</HostText>
            </HostPickerButton>
            <Hint>WLED Host (mDNS or IP). Click to search network or enter manually.</Hint>
            <Sp />
            <SectionTitle>Controller Output</SectionTitle>
            <Field>
              <Label>Mode</Label>
              <Select
                value={def.controller.output_mode}
                onChange={(event) => {
                  const outputMode = event.target.value as WledOutputMode
                  patchFixture({
                    controller: {
                      ...def.controller,
                      output_mode: outputMode,
                    },
                  } as Partial<LedFixture>)
                }}
              >
                {outputModeOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {OUTPUT_MODE_LABEL[mode]}
                  </option>
                ))}
              </Select>
            </Field>
            {capabilities !== null && capabilities.segments.length > 0 && (
              <>
                <Sp />
                <Field>
                  <Label>Segment</Label>
                  <Select
                    value={
                      def.controller.segment_id === null
                        ? ''
                        : `${def.controller.segment_id}`
                    }
                    onChange={(event) => {
                      const raw = event.target.value
                      const segmentId = raw.length <= 0 ? null : Number(raw)
                      const segment =
                        segmentId === null
                          ? null
                          : capabilities.segments.find((s) => s.id === segmentId) ?? null
                      patchFixture({
                        controller: {
                          ...def.controller,
                          segment_id: segmentId,
                          pixel_start: segment?.start ?? def.controller.pixel_start,
                          pixel_count:
                            segment !== null && segment.length > 0
                              ? segment.length
                              : def.controller.pixel_count,
                        },
                      } as Partial<LedFixture>)
                    }}
                  >
                    <option value="">Full Controller</option>
                    {capabilities.segments.map((segment) => (
                      <option key={segment.id} value={segment.id}>
                        {`${segment.name} (${segment.start}-${segment.stop})`}
                      </option>
                    ))}
                  </Select>
                </Field>
                {selectedSegmentLength !== null && (
                  <Hint>{`Segment length: ${selectedSegmentLength} px`}</Hint>
                )}
              </>
            )}
            <Sp />
            {effectiveOutputMode === 'pixel' && (
              <>
                <Field>
                  <Label>Pixel Format</Label>
                  <Select
                    value={def.controller.pixel_format}
                    onChange={(event) =>
                      patchFixture({
                        controller: {
                          ...def.controller,
                          pixel_format: event.target.value as 'auto' | 'rgb' | 'rgbw',
                        },
                      } as Partial<LedFixture>)
                    }
                  >
                    {pixelFormatOptions.map((option) => (
                      <option key={option} value={option}>
                        {PIXEL_FORMAT_LABEL[option]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Sp />
                <Field>
                  <Label>Start Pixel</Label>
                  <NumberField
                    label=""
                    val={def.controller.pixel_start}
                    onChange={(pixel_start) =>
                      patchFixture({
                        controller: {
                          ...def.controller,
                          pixel_start,
                        },
                      } as Partial<LedFixture>)
                    }
                    min={0}
                    max={1000000}
                    step={1}
                  />
                </Field>
                <Sp />
                <Field>
                  <Label>Pixel Limit</Label>
                  <NumberField
                    label=""
                    val={def.controller.pixel_count ?? 0}
                    onChange={(pixel_count) =>
                      patchFixture({
                        controller: {
                          ...def.controller,
                          pixel_count: pixel_count <= 0 ? null : pixel_count,
                        },
                      } as Partial<LedFixture>)
                    }
                    min={0}
                    max={1000000}
                    step={1}
                  />
                </Field>
                <Hint>Set to 0 for no limit.</Hint>
              </>
            )}
            {effectiveOutputMode !== 'pixel' && (
              <Hint>
                PWM mode outputs one shared color per fixture/segment. Layout points are
                ignored for transport.
              </Hint>
            )}
            <Sp />
            {isProbingHost && <Hint>Probing controller capabilities...</Hint>}
            {!isProbingHost && probeError !== null && <WarnText>{probeError}</WarnText>}
            {!isProbingHost && capabilities !== null && capabilities.reachable && (
              <Hint>
                {`Detected: ${capabilities.ledCount} px, ${
                  capabilities.maxSegments
                } segments, firmware ${capabilities.firmware ?? 'unknown'}`}
              </Hint>
            )}
            {!isProbingHost &&
              capabilities !== null &&
              capabilities.warnings.map((warning, warningIndex) => (
                <WarnText key={`${def.id}_wled_warn_${warningIndex}`}>{warning}</WarnText>
              ))}
            <Sp />
            <Field>
              <Label>Type</Label>
              <Select
                value={def.kind}
                disabled={effectiveOutputMode !== 'pixel'}
                onChange={(event) => {
                  const nextKind = event.target.value as LedFixture['kind']
                  if (nextKind === def.kind) return
                  updateFixture(
                    nextKind === 'grid' ? toGridFixture(def) : toStringFixture(def)
                  )
                }}
              >
                <option value="string">Pixel String</option>
                <option value="grid">Pixel Grid</option>
              </Select>
            </Field>
            {def.kind === 'string' && (
              <>
                <NumberField
                  label="Pixel Count"
                  val={def.led_count}
                  onChange={(led_count) => patchFixture({ led_count } as Partial<LedFixture>)}
                  min={1}
                  max={MAX_LED_COUNT}
                />
                <Sp />
                <NumberField
                  label="Pixel Spacing"
                  val={def.pixel_spacing}
                  onChange={(pixel_spacing) =>
                    patchFixture({ pixel_spacing } as Partial<LedFixture>)
                  }
                  min={0.001}
                  max={0.25}
                  numberType="float"
                  step={0.001}
                />
                <Hint>{`Approx spacing: ${spacingDisplay} ${stage.unit}`}</Hint>
              </>
            )}
            {def.kind === 'grid' && (
              <>
                <NumberField
                  label="Rows"
                  val={def.rows}
                  onChange={(rows) => patchFixture({ rows } as Partial<LedFixture>)}
                  min={1}
                  max={100}
                />
                <Sp />
                <NumberField
                  label="Columns"
                  val={def.columns}
                  onChange={(columns) => patchFixture({ columns } as Partial<LedFixture>)}
                  min={1}
                  max={100}
                />
                <Sp />
                <NumberField
                  label="Pixel Pitch"
                  val={def.pixel_pitch}
                  onChange={(pixel_pitch) =>
                    patchFixture({ pixel_pitch } as Partial<LedFixture>)
                  }
                  min={0.001}
                  max={0.25}
                  numberType="float"
                  step={0.001}
                />
                <Hint>{`Approx pitch: ${spacingDisplay} ${stage.unit}`}</Hint>
                <Sp />
                <CheckRow>
                  <input
                    type="checkbox"
                    checked={def.serpentine}
                    onChange={(event) =>
                      patchFixture({ serpentine: event.target.checked } as Partial<LedFixture>)
                    }
                  />
                  Serpentine Wiring
                </CheckRow>
              </>
            )}
            <Sp />
            <SectionTitle>Placement</SectionTitle>
            <PlacementRow>
              <NumberField
                label="X"
                val={def.position.x}
                onChange={(x) =>
                  patchFixture({ position: { ...def.position, x } } as Partial<LedFixture>)
                }
                min={0}
                max={1}
                numberType="float"
                step={0.01}
              />
              <NumberField
                label="Y"
                val={def.position.y}
                onChange={(y) =>
                  patchFixture({ position: { ...def.position, y } } as Partial<LedFixture>)
                }
                min={0}
                max={1}
                numberType="float"
                step={0.01}
              />
              <NumberField
                label="Z"
                val={def.position.z}
                onChange={(z) =>
                  patchFixture({ position: { ...def.position, z } } as Partial<LedFixture>)
                }
                min={0}
                max={1}
                numberType="float"
                step={0.01}
              />
            </PlacementRow>
            <Sp />
            <PlacementRow>
              <NumberField
                label="Rot X"
                val={def.rotation.x}
                onChange={(x) =>
                  patchFixture({ rotation: { ...def.rotation, x } } as Partial<LedFixture>)
                }
                min={-180}
                max={180}
                numberType="float"
                step={1}
              />
              <NumberField
                label="Rot Y"
                val={def.rotation.y}
                onChange={(y) =>
                  patchFixture({ rotation: { ...def.rotation, y } } as Partial<LedFixture>)
                }
                min={-180}
                max={180}
                numberType="float"
                step={1}
              />
              <NumberField
                label="Rot Z"
                val={def.rotation.z}
                onChange={(z) =>
                  patchFixture({ rotation: { ...def.rotation, z } } as Partial<LedFixture>)
                }
                min={-180}
                max={180}
                numberType="float"
                step={1}
              />
            </PlacementRow>
            <Sp />
            <Hint>{`Placement: X ${xDisplay} ${stage.unit} | Y ${yDisplay} ${stage.unit} | Z ${zDisplay} ${stage.unit}`}</Hint>
            <Sp />
            <GroupPicker
              groups={def.groups}
              availableGroups={availableGroups}
              addGroup={(group) => {
                const next = group.trim()
                if (next.length === 0 || def.groups.includes(next)) return
                patchFixture({ groups: [...def.groups, next] })
              }}
              removeGroup={(group) => {
                patchFixture({ groups: def.groups.filter((g) => g !== group) })
              }}
            />
            <Sp />
            <Hint>{`Total Pixels: ${pixelCount}`}</Hint>
          </EditColumn>
        </Row>
        <WledDiscoveryDialog
          open={hostDialogOpen}
          initialHost={def.mdns}
          onClose={() => setHostDialogOpen(false)}
          onSelect={(mdns) => patchFixture({ mdns })}
        />
      </ActiveRoot>
    )

  return (
    <InactiveRoot>
      <Dropdown
        isOpen={false}
        onClick={() => dispatch(setActiveLedFixture(index))}
      />
      <Name>{def.name}</Name>
      <Info>{`${def.kind} | ${pixelCount} px | ${def.mdns}`}</Info>
      <div style={{ flex: '1 0 0' }} />
      <IconButton onClick={() => dispatch(removeLedFixture(index))}>
        <RemoveIcon />
      </IconButton>
    </InactiveRoot>
  )
}

const ActiveRoot = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: ${(props) => props.theme.colors.bg.darker};
  border: 1px solid white;
`

const InactiveRoot = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  cursor: pointer;
`

const Name = styled.div`
  margin-right: 1rem;
`

const Info = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
`

const Row = styled.div`
  display: flex;
  align-items: flex-start;
`

const EditColumn = styled.div`
  min-width: 0;
  flex: 1 1 auto;
`

const Sp = styled.div`
  height: 0.5rem;
`

const Field = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const Label = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
  min-width: 4.2rem;
`

const Select = styled.select`
  width: 100%;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.2rem 0.35rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
`

const Hint = styled.div`
  font-size: 0.75rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const WarnText = styled.div`
  font-size: 0.75rem;
  color: #ffb8b8;
`

const SectionTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
`

const PlacementRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
`

const CheckRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
`

const HostPickerButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.28rem 0.36rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  cursor: pointer;
`

const HostText = styled.div`
  min-width: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
