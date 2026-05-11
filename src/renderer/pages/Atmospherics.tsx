import { useEffect, useMemo, useState } from 'react'
import styled, { css } from 'styled-components'
import { useDispatch } from 'react-redux'
import AirIcon from '@mui/icons-material/Air'
import SliderBase from '../base/SliderBase'
import SliderCursor from '../base/SliderCursor'
import { ButtonMidiOverlay } from '../base/MidiOverlay'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { useActiveLightScene, useDeviceSelector, useDmxSelector } from '../redux/store'
import {
  ATMOSPHERICS_DEFAULT_GROUP,
  ATMOSPHERICS_SPLIT_LEVEL_PARAM,
  ATMOSPHERICS_SPLIT_TRIGGER_PARAM,
  initAtmosFxtrControlConfig,
  initAtmosLevelChConfig,
  initAtmosTriggerChConfig,
} from '../../shared/atmospherics'
import { listAtmosFxtrs } from '../../shared/atmosphericsMapping'
import {
  ensureAtmosFxtrConfig,
  patchAtmosFxtr,
  patchAtmosLevelCh,
  patchAtmosTrigCh,
  selectAtmosFxtr,
  setAtmosPyro,
  setAtmosArmed,
  setAtmosEStop,
  setAtmosOn,
  setAtmosFxtrGroup,
} from '../redux/controlSlice'
import { fireAtmosManualTrigger } from '../redux/guiSlice'

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function formatDelay(ms: number) {
  const clamped = Math.max(0, Math.round(ms))
  const seconds = Math.floor(clamped / 1000)
  const millis = clamped % 1000
  return `${seconds}.${millis.toString().padStart(3, '0')}s`
}

function snapToDetent(value: number, detent: number, epsilon = 0.025) {
  if (Math.abs(value - detent) <= epsilon) {
    return detent
  }
  return value
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onCommit: (next: number) => void
}) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const clamp = (next: number) => Math.max(min, Math.min(max, Math.round(next)))

  return (
    <NumberFieldRoot>
      <Muted>{label}</Muted>
      <NumberFieldRow>
        <button type="button" onClick={() => onCommit(clamp(value - step))}>
          -
        </button>
        <input
          type="number"
          value={draft}
          min={min}
          max={max}
          step={step}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const parsed = Number(draft)
            if (!Number.isFinite(parsed)) {
              setDraft(String(value))
              return
            }
            const next = clamp(parsed)
            onCommit(next)
            setDraft(String(next))
          }}
        />
        <button type="button" onClick={() => onCommit(clamp(value + step))}>
          +
        </button>
      </NumberFieldRow>
    </NumberFieldRoot>
  )
}

function formatStatus(
  blockedReason: string | null | undefined,
  pendingDelayMs: number | undefined,
  active: boolean | undefined
) {
  if (blockedReason) {
    if (blockedReason === 'system inactive') return 'System inactive'
    if (blockedReason === 'emergency stop') return 'Emergency stop'
    if (blockedReason === 'fixture disabled') return 'Fixture disabled'
    if (blockedReason === 'pyro disabled') return 'Pyro disabled'
    return `Blocked: ${blockedReason}`
  }
  if ((pendingDelayMs ?? 0) > 0) return `Delay ${formatDelay(pendingDelayMs ?? 0)}`
  if (active) return 'Active'
  return 'Ready'
}

export default function AtmosphericsPage() {
  const dispatch = useDispatch()
  const dmx = useDmxSelector((state) => state)
  const fixtures = useMemo(() => listAtmosFxtrs(dmx), [dmx])
  const settings = useDeviceSelector((state) => state.connectionSettings.atmos)
  const runtime = useRealtimeSelector((state) => state.atmos)
  const splitStates = useRealtimeSelector((state) => state.splitStates)
  const splitScenes = useActiveLightScene((scene) => scene.splitScenes)

  const selectedFixtureId =
    settings.selectedFixtureId && fixtures.some((fixture) => fixture.fixtureId === settings.selectedFixtureId)
      ? settings.selectedFixtureId
      : fixtures[0]?.fixtureId ?? null

  const findSplitIndexForGroup = (groupName: string) => {
    const normalized = groupName.trim()
    if (normalized.length <= 0) return -1
    return splitScenes.findIndex((split) => split.groups?.[normalized] === true)
  }

  useEffect(() => {
    if (fixtures.length <= 0) {
      if (settings.selectedFixtureId !== null) dispatch(selectAtmosFxtr(null))
      return
    }
    if (selectedFixtureId === null) return
    if (settings.selectedFixtureId !== selectedFixtureId) {
      dispatch(selectAtmosFxtr(selectedFixtureId))
      return
    }
    for (const fixture of fixtures) {
      const config = settings.fixtures[fixture.fixtureId]
      if (config === undefined) {
        dispatch(ensureAtmosFxtrConfig(fixture.fixtureId))
        return
      }
      if (config.groupName.trim().length <= 0) {
        dispatch(
          setAtmosFxtrGroup({
            fixtureId: fixture.fixtureId,
            groupName: fixture.groups[0] ?? ATMOSPHERICS_DEFAULT_GROUP,
          })
        )
        return
      }
      for (const trigger of fixture.triggerChannels) {
        if (config.triggerChannels[trigger.channel] === undefined) {
          dispatch(
            patchAtmosTrigCh({
              fixtureId: fixture.fixtureId,
              channelNumber: trigger.channel,
              patch: {},
            })
          )
          return
        }
      }
      for (const level of fixture.auxChannels) {
        if (config.levelChannels[level.channel] === undefined) {
          dispatch(
            patchAtmosLevelCh({
              fixtureId: fixture.fixtureId,
              channelNumber: level.channel,
              patch: {},
            })
          )
          return
        }
      }
    }
  }, [dispatch, fixtures, selectedFixtureId, settings.fixtures, settings.selectedFixtureId])

  const selectedFixture = fixtures.find((fixture) => fixture.fixtureId === selectedFixtureId)
  const selectedConfig =
    selectedFixtureId === null
      ? null
      : settings.fixtures[selectedFixtureId] ?? initAtmosFxtrControlConfig(selectedFixtureId)
  const selectedRuntime = runtime.fixtures.find((fixture) => fixture.fixtureId === selectedFixtureId)

  const groupName =
    selectedConfig?.groupName?.trim() || selectedFixture?.groups[0] || ATMOSPHERICS_DEFAULT_GROUP
  const selectedSplitIndex = Math.max(
    0,
    findSplitIndexForGroup(groupName) >= 0
      ? findSplitIndexForGroup(groupName)
      : findSplitIndexForGroup(ATMOSPHERICS_DEFAULT_GROUP)
  )
  const groupThreshold = clamp01(
    Number(splitScenes[selectedSplitIndex]?.baseParams?.[ATMOSPHERICS_SPLIT_TRIGGER_PARAM]) || 0.5
  )
  const groupTriggerLive = clamp01(
    Number(splitStates[selectedSplitIndex]?.outputParams?.[ATMOSPHERICS_SPLIT_TRIGGER_PARAM]) || 0
  )
  const groupLevelLive = clamp01(
    Number(splitStates[selectedSplitIndex]?.outputParams?.[ATMOSPHERICS_SPLIT_LEVEL_PARAM]) || 1
  )

  const groupedFixtures = useMemo(() => {
    const byGroup = new Map<string, typeof fixtures>()
    fixtures.forEach((fixture) => {
      const configGroup = settings.fixtures[fixture.fixtureId]?.groupName?.trim()
      const key =
        configGroup && configGroup.length > 0
          ? configGroup
          : fixture.groups[0] ?? ATMOSPHERICS_DEFAULT_GROUP
      byGroup.set(key, [...(byGroup.get(key) ?? []), fixture])
    })
    return Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [fixtures, settings.fixtures])

  const groupOptions = useMemo(() => {
    const set = new Set<string>([ATMOSPHERICS_DEFAULT_GROUP])
    selectedFixture?.groups.forEach((group) => set.add(group))
    groupedFixtures.forEach(([group]) => set.add(group))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [groupedFixtures, selectedFixture])

  if (fixtures.length <= 0) {
    return (
      <Root>
        <Panel>
          <Row>
            <AirIcon fontSize="small" />
            <strong>Atmospherics + FX</strong>
          </Row>
          <Muted>
            Add fixtures with `fxtrTrigger` and/or `fxtrLevel` channels to enable this page.
          </Muted>
        </Panel>
      </Root>
    )
  }

  return (
    <Root>
      <EmergencyButton
        type="button"
        $active={settings.emergencyStop}
        onClick={() => dispatch(setAtmosEStop(!settings.emergencyStop))}
      >
        {settings.emergencyStop ? (
          <MarqueeWrap>
            <MarqueeText>{'EMERGENCY STOP ACTIVE · OUTPUTS BLOCKED · '}</MarqueeText>
          </MarqueeWrap>
        ) : (
          'EMERGENCY STOP'
        )}
      </EmergencyButton>
      <Layout>
        <Panel style={{ overflow: 'auto' }}>
          {groupedFixtures.map(([group, members]) => (
            <div key={group}>
              <GroupHeader>{group}</GroupHeader>
              {members.map((fixture) => {
                const fixtureRuntime = runtime.fixtures.find((entry) => entry.fixtureId === fixture.fixtureId)
                const config = settings.fixtures[fixture.fixtureId]
                const status = formatStatus(
                  fixtureRuntime?.blockedReason,
                  fixtureRuntime?.pendingDelayMs,
                  fixtureRuntime?.triggerOutputActive
                )
                return (
                  <FixtureButton
                    key={fixture.fixtureId}
                    type="button"
                    $selected={fixture.fixtureId === selectedFixtureId}
                    $active={fixtureRuntime?.triggerOutputActive === true}
                    $disabled={config?.enabled === false || settings.emergencyStop}
                    onClick={() => dispatch(selectAtmosFxtr(fixture.fixtureId))}
                  >
                    <div>{fixture.fixtureName}</div>
                    <Muted>
                      U{fixture.universe} · T{fixture.triggerChannels.length} · L{fixture.auxChannels.length}
                    </Muted>
                    <StatusText>{status}</StatusText>
                  </FixtureButton>
                )
              })}
            </div>
          ))}
        </Panel>
        <Panel style={{ overflow: 'auto' }}>
          <Row>
            <AirIcon fontSize="small" />
            <strong>Atmospherics + FX Control</strong>
          </Row>
          <Row>
            <label>
              <input
                type="checkbox"
                checked={settings.enabled && settings.armed}
                onChange={(event) => {
                  dispatch(setAtmosOn(event.target.checked))
                  dispatch(setAtmosArmed(event.target.checked))
                }}
              />{' '}
              System Active
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.allowPyro}
                onChange={(event) => dispatch(setAtmosPyro(event.target.checked))}
              />{' '}
              Allow Pyro
            </label>
            {selectedConfig && (
              <label>
                <input
                  type="checkbox"
                  checked={selectedConfig.enabled !== false}
                  onChange={(event) =>
                    dispatch(
                      patchAtmosFxtr({
                        fixtureId: selectedConfig.fixtureId,
                        patch: { enabled: event.target.checked },
                      })
                    )
                  }
                />{' '}
                Fixture Enabled
              </label>
            )}
          </Row>
          {selectedFixture && selectedConfig && (
            <>
              <Row>
                <label>Assigned Group</label>
                <select
                  value={groupName}
                  onChange={(event) =>
                    dispatch(
                      setAtmosFxtrGroup({
                        fixtureId: selectedFixture.fixtureId,
                        groupName: event.target.value,
                      })
                    )
                  }
                >
                  {groupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Row>
              <Muted>
                Group slider live: {Math.round(groupTriggerLive * 100)}% · threshold:{' '}
                {Math.round(groupThreshold * 100)}% · level: {Math.round(groupLevelLive * 100)}%
              </Muted>
              {selectedFixture.triggerChannels.map((channel) => {
                const config =
                  selectedConfig.triggerChannels[channel.channel] ??
                  initAtmosTriggerChConfig(channel.channel)
                const channelRuntime = selectedRuntime?.triggerChannels.find(
                  (entry) => entry.channelNumber === channel.channel
                )
                const thresholdValue = config.useGroupThreshold ? groupThreshold : config.threshold
                return (
                  <Block key={`trigger-${channel.channel}`}>
                    <strong>{channel.name} (CH {channel.channel})</strong>
                    <SliderBase
                      orientation="horizontal"
                      radius={0.34}
                      onChange={(value) =>
                        dispatch(
                          patchAtmosTrigCh({
                            fixtureId: selectedFixture.fixtureId,
                            channelNumber: channel.channel,
                            patch: {
                              threshold: snapToDetent(clamp01(value), groupThreshold),
                              useGroupThreshold:
                                Math.abs(snapToDetent(clamp01(value), groupThreshold) - groupThreshold) <
                                0.0001,
                            },
                          })
                        )
                      }
                    >
                      <SliderCursor orientation="horizontal" value={groupThreshold} radius={0.22} color="#69b6ff" border />
                      {!config.useGroupThreshold && (
                        <SliderCursor orientation="horizontal" value={thresholdValue} radius={0.34} color="#ffffff" border />
                      )}
                      <SliderCursor orientation="horizontal" value={channelRuntime?.sourceLiveValue ?? groupTriggerLive} radius={0.24} color="#ffffff" />
                    </SliderBase>
                    <Row>
                      <ActionButton
                        type="button"
                        $active={config.useGroupThreshold}
                        onClick={() =>
                          dispatch(
                            patchAtmosTrigCh({
                              fixtureId: selectedFixture.fixtureId,
                              channelNumber: channel.channel,
                              patch: {
                                useGroupThreshold: !config.useGroupThreshold,
                                threshold: config.useGroupThreshold
                                  ? config.threshold
                                  : groupThreshold,
                              },
                            })
                          )
                        }
                      >
                        Group Slider Link: {config.useGroupThreshold ? 'On' : 'Off'}
                      </ActionButton>
                    </Row>
                    <ToggleRow>
                      {(
                        [
                          ['latching', 'Latching'],
                          ['interval', 'Interval'],
                          ['momentary', 'Momentary'],
                        ] as const
                      ).map(([action, label]) => (
                        <ToggleButton
                          key={action}
                          type="button"
                          $active={config.triggerAction === action}
                          onClick={() =>
                            dispatch(
                              patchAtmosTrigCh({
                                fixtureId: selectedFixture.fixtureId,
                                channelNumber: channel.channel,
                                patch: { triggerAction: action },
                              })
                            )
                          }
                        >
                          {label}
                        </ToggleButton>
                      ))}
                    </ToggleRow>
                    <Row>
                      <NumberField
                        label="Start Delay (ms)"
                        value={config.delayMs}
                        min={0}
                        max={600000}
                        step={10}
                        onCommit={(next) =>
                          dispatch(
                            patchAtmosTrigCh({
                              fixtureId: selectedFixture.fixtureId,
                              channelNumber: channel.channel,
                              patch: { delayMs: next },
                            })
                          )
                        }
                      />
                      {config.triggerAction === 'momentary' && (
                        <NumberField
                          label="Pulse (ms)"
                          value={config.pulseMs}
                          min={10}
                          max={600000}
                          step={10}
                          onCommit={(next) =>
                            dispatch(
                              patchAtmosTrigCh({
                                fixtureId: selectedFixture.fixtureId,
                                channelNumber: channel.channel,
                                patch: { pulseMs: next },
                              })
                            )
                          }
                        />
                      )}
                      {config.triggerAction === 'interval' && (
                        <NumberField
                          label="Interval (ms)"
                          value={config.intervalMs}
                          min={10}
                          max={600000}
                          step={10}
                          onCommit={(next) =>
                            dispatch(
                              patchAtmosTrigCh({
                                fixtureId: selectedFixture.fixtureId,
                                channelNumber: channel.channel,
                                patch: { intervalMs: next },
                              })
                            )
                          }
                        />
                      )}
                      <NumberField
                        label="Manual Delay (ms)"
                        value={config.manualDelayMs}
                        min={0}
                        max={600000}
                        step={10}
                        onCommit={(next) =>
                          dispatch(
                            patchAtmosTrigCh({
                              fixtureId: selectedFixture.fixtureId,
                              channelNumber: channel.channel,
                              patch: { manualDelayMs: next },
                            })
                          )
                        }
                      />
                      {config.triggerAction === 'interval' && (
                        <NumberField
                          label="Manual Interval (ms)"
                          value={config.manualIntervalMs}
                          min={10}
                          max={600000}
                          step={10}
                          onCommit={(next) =>
                            dispatch(
                              patchAtmosTrigCh({
                                fixtureId: selectedFixture.fixtureId,
                                channelNumber: channel.channel,
                                patch: { manualIntervalMs: next },
                              })
                            )
                          }
                        />
                      )}
                    </Row>
                    <Muted>{formatStatus(channelRuntime?.blockedReason, channelRuntime?.pendingDelayMs, channelRuntime?.triggerOutputActive)}</Muted>
                  </Block>
                )
              })}
              <ButtonMidiOverlay action={{ type: 'triggerAtmosFixture', fixtureId: selectedFixture.fixtureId }}>
                <TriggerPad
                  type="button"
                  $state={
                    (selectedRuntime?.pendingDelayMs ?? 0) > 0
                      ? 'delay'
                      : selectedRuntime?.triggerOutputActive
                      ? 'active'
                      : 'idle'
                  }
                  onClick={() => dispatch(fireAtmosManualTrigger(selectedFixture.fixtureId))}
                >
                  {(selectedRuntime?.pendingDelayMs ?? 0) > 0
                    ? formatDelay(selectedRuntime?.pendingDelayMs ?? 0)
                    : selectedRuntime?.triggerOutputActive
                    ? 'Active'
                    : 'Trigger'}
                </TriggerPad>
              </ButtonMidiOverlay>
              {selectedFixture.auxChannels.map((channel) => {
                const config =
                  selectedConfig.levelChannels[channel.channel] ??
                  initAtmosLevelChConfig(channel.channel)
                const channelRuntime = selectedRuntime?.levelChannels.find(
                  (entry) => entry.channelNumber === channel.channel
                )
                return (
                  <Block key={`level-${channel.channel}`}>
                    <strong>{channel.name} (CH {channel.channel})</strong>
                    <ToggleRow>
                      <ToggleButton
                        type="button"
                        $active={config.controlMode === 'split'}
                        onClick={() =>
                          dispatch(
                            patchAtmosLevelCh({
                              fixtureId: selectedFixture.fixtureId,
                              channelNumber: channel.channel,
                              patch: { controlMode: 'split' },
                            })
                          )
                        }
                      >
                        Split Control
                      </ToggleButton>
                      <ToggleButton
                        type="button"
                        $active={config.controlMode === 'manual'}
                        onClick={() =>
                          dispatch(
                            patchAtmosLevelCh({
                              fixtureId: selectedFixture.fixtureId,
                              channelNumber: channel.channel,
                              patch: { controlMode: 'manual' },
                            })
                          )
                        }
                      >
                        Manual Control
                      </ToggleButton>
                    </ToggleRow>
                    {config.controlMode === 'manual' && (
                      <SliderBase
                        orientation="horizontal"
                        radius={0.34}
                        onChange={(value) =>
                          dispatch(
                            patchAtmosLevelCh({
                              fixtureId: selectedFixture.fixtureId,
                              channelNumber: channel.channel,
                              patch: { manualValue: clamp01(value) },
                            })
                          )
                        }
                      >
                        <SliderCursor orientation="horizontal" value={config.manualValue} radius={0.34} color="#69b6ff" border />
                        <SliderCursor orientation="horizontal" value={channelRuntime?.sourceValue ?? config.manualValue} radius={0.24} color="#ffffff" />
                      </SliderBase>
                    )}
                    <Muted>Source {Math.round((channelRuntime?.sourceValue ?? groupLevelLive) * 100)}%</Muted>
                  </Block>
                )
              })}
            </>
          )}
        </Panel>
      </Layout>
    </Root>
  )
}

const flashRedGray = css`
  animation: flashRedGray 0.8s linear infinite;
  @keyframes flashRedGray {
    0% { background: #cc1f1f; }
    50% { background: #666; }
    100% { background: #cc1f1f; }
  }
`

const Root = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.75rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`

const Layout = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(16rem, 1fr) minmax(28rem, 2fr);
  gap: 0.65rem;
  overflow: hidden;
`

const Panel = styled.div`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.4rem;
  background: ${(p) => p.theme.colors.bg.darker};
  padding: 0.62rem;
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
`

const GroupHeader = styled.div`
  font-size: 0.73rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.text.secondary};
`

const FixtureButton = styled.button<{ $selected: boolean; $active: boolean; $disabled: boolean }>`
  border: 1px solid ${(p) => (p.$selected ? '#6ebeff' : p.theme.colors.divider)};
  border-radius: 0.35rem;
  padding: 0.42rem 0.48rem;
  text-align: left;
  background: ${(p) =>
    p.$active
      ? 'linear-gradient(180deg, rgba(203, 52, 52, 0.35), rgba(88, 19, 19, 0.3))'
      : p.$disabled
      ? 'linear-gradient(180deg, rgba(92, 92, 92, 0.32), rgba(48, 48, 48, 0.28))'
      : p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`

const StatusText = styled.div`
  font-size: 0.67rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #f3f7ff;
  opacity: 0.9;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const Block = styled.div`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.3rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${(p) => (p.$active ? '#6ebeff' : p.theme.colors.divider)};
  border-radius: 0.32rem;
  min-height: 2rem;
  padding: 0.34rem 0.62rem;
  background: ${(p) =>
    p.$active
      ? 'linear-gradient(180deg, rgba(74, 121, 210, 0.44), rgba(41, 72, 136, 0.38))'
      : p.theme.colors.bg.primary};
  color: ${(p) => (p.$active ? '#f2f7ff' : p.theme.colors.text.primary)};
  font-size: 0.74rem;
  font-weight: ${(p) => (p.$active ? 700 : 600)};
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color 110ms ease, background-color 110ms ease, color 110ms ease;

  &:hover {
    border-color: ${(p) => (p.$active ? '#8bcaff' : '#ffffff66')};
  }
`

const ActionButton = styled(ToggleButton)`
  width: 100%;
  justify-content: center;
  text-align: center;
  background: ${(p) =>
    p.$active
      ? 'linear-gradient(180deg, rgba(46, 155, 74, 0.5), rgba(33, 105, 55, 0.4))'
      : 'linear-gradient(180deg, rgba(92, 92, 92, 0.36), rgba(58, 58, 58, 0.3))'};
  border-color: ${(p) => (p.$active ? '#76d692' : p.theme.colors.divider)};
`

const Muted = styled.div`
  font-size: 0.72rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const EmergencyButton = styled.button<{ $active: boolean }>`
  border: 1px solid #ffffff44;
  border-radius: 0.42rem;
  width: 100%;
  min-height: 3.2rem;
  color: #fff;
  cursor: pointer;
  background: #cc1f1f;
  font-size: 0.98rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  ${(props) => props.$active && flashRedGray}
`

const MarqueeWrap = styled.div`
  overflow: hidden;
  white-space: nowrap;
  width: 100%;
`

const MarqueeText = styled.div`
  display: inline-block;
  padding-left: 100%;
  animation: marquee 8s linear infinite;

  @keyframes marquee {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-100%);
    }
  }
`

const TriggerPad = styled.button<{ $state: 'idle' | 'active' | 'delay' }>`
  width: 100%;
  min-height: 6rem;
  border-radius: 0.52rem;
  border: 1px solid #ffffff44;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  background: ${(props) =>
    props.$state === 'active' ? '#c33434' : props.$state === 'idle' ? '#2e9b4a' : '#d9ab2f'};
`

const NumberFieldRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 10rem;
`

const NumberFieldRow = styled.div`
  display: grid;
  grid-template-columns: 2rem 1fr 2rem;
  gap: 0.2rem;
  align-items: center;

  button,
  input {
    border: 1px solid ${(p) => p.theme.colors.divider};
    border-radius: 0.28rem;
    background: ${(p) => p.theme.colors.bg.primary};
    color: ${(p) => p.theme.colors.text.primary};
    padding: 0.2rem 0.3rem;
  }
  input {
    text-align: center;
    font-weight: 700;
  }
`
