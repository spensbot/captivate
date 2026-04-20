import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BoltIcon from '@mui/icons-material/Bolt'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useActiveLightScene } from '../redux/store'
import { LfoShape } from '../../shared/oscillator'
import { send_open_page_window } from '../ipcHandler'

interface LaserAlphaPageProps {
  standalone?: boolean
}

type LaserBackend = 'helios' | 'etherdream' | 'fb4' | 'generic'
type LaserTool = 'select' | 'line' | 'freehand' | 'rect' | 'circle' | 'poly'
type LaserParamRouteMode = 'manual' | 'split' | 'lfo' | 'split+lfo'

interface LaserUnit {
  id: string
  name: string
  group: string
  zone: string
  enabled: boolean
}

const LFO_SHAPE_LABEL: Record<LfoShape, string> = {
  [LfoShape.Sin]: 'Sine',
  [LfoShape.Ramp]: 'Ramp',
  [LfoShape.Square]: 'Square',
  [LfoShape.Saw]: 'Saw',
  [LfoShape.Noise]: 'Noise',
  [LfoShape.AudioBand]: 'Audio Band',
  [LfoShape.AudioEnergy]: 'Audio Energy',
}

export function LaserAlphaPage({ standalone = false }: LaserAlphaPageProps) {
  const splitSummaries = useActiveLightScene((scene) =>
    scene.splitScenes.map((split, index) => {
      const entries = Object.entries(split.groups).filter(
        ([name]) => name.trim().length > 0
      )
      const groupLabel =
        entries.length > 0
          ? entries
              .map(([name, include]) => `${include === false ? 'not ' : ''}${name}`)
              .join(', ')
          : 'all'
      return {
        index,
        label: `Split ${index + 1}`,
        groups: groupLabel,
      }
    })
  )
  const lfoSummaries = useActiveLightScene((scene) =>
    scene.modulators.map((mod, index) => ({
      index,
      label: `LFO ${index + 1} · ${LFO_SHAPE_LABEL[mod.lfo.shape] ?? 'LFO'}`,
    }))
  )

  const [backend, setBackend] = useState<LaserBackend>('helios')
  const [connectionTarget, setConnectionTarget] = useState('Auto discover')
  const [isConnected, setIsConnected] = useState(false)
  const [scanRatePps, setScanRatePps] = useState(30000)
  const [outputPower, setOutputPower] = useState(75)
  const [safetyArmed, setSafetyArmed] = useState(false)
  const [enableProjectionMask, setEnableProjectionMask] = useState(true)
  const [eStopLatched, setEStopLatched] = useState(false)
  const [audienceScanGate, setAudienceScanGate] = useState(true)
  const [selectedTool, setSelectedTool] = useState<LaserTool>('line')
  const [activeSplit, setActiveSplit] = useState(0)
  const [activeLfo, setActiveLfo] = useState(0)
  const [activeGraphicName, setActiveGraphicName] = useState('Graphic 1')
  const [laserPresetName, setLaserPresetName] = useState('Main Drop')
  const [dotDensityRoute, setDotDensityRoute] = useState<LaserParamRouteMode>('lfo')
  const [scanMotionRoute, setScanMotionRoute] =
    useState<LaserParamRouteMode>('split+lfo')
  const [beamColorRoute, setBeamColorRoute] = useState<LaserParamRouteMode>('split')
  const [lineColor, setLineColor] = useState('#00ff88')
  const [fillColor, setFillColor] = useState('#5d7dff')
  const [units, setUnits] = useState<LaserUnit[]>([
    {
      id: 'laser-front-left',
      name: 'Laser Front Left',
      group: 'Main Lasers',
      zone: 'Floor',
      enabled: true,
    },
    {
      id: 'laser-front-right',
      name: 'Laser Front Right',
      group: 'Main Lasers',
      zone: 'Floor',
      enabled: true,
    },
  ])
  const [selectedUnitId, setSelectedUnitId] = useState<string>('laser-front-left')
  const [colorLinkMode, setColorLinkMode] = useState<'split' | 'manual'>('split')
  const [beamPalette, setBeamPalette] = useState('#00ff88')

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) ?? null,
    [selectedUnitId, units]
  )
  const groupNames = useMemo(() => {
    const names = new Set<string>()
    for (const unit of units) {
      if (unit.group.trim().length > 0) {
        names.add(unit.group.trim())
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [units])

  const addLaserUnit = () => {
    const nextIndex = units.length + 1
    const id = `laser-${Date.now()}-${nextIndex}`
    const next: LaserUnit = {
      id,
      name: `Laser ${nextIndex}`,
      group: 'Main Lasers',
      zone: 'Floor',
      enabled: true,
    }
    setUnits((current) => [...current, next])
    setSelectedUnitId(id)
  }

  const removeSelectedLaserUnit = () => {
    if (selectedUnit === null) {
      return
    }
    setUnits((current) => {
      const next = current.filter((unit) => unit.id !== selectedUnit.id)
      const fallback = next[0]
      setSelectedUnitId(fallback?.id ?? '')
      return next
    })
  }

  const updateSelectedUnit = (patch: Partial<LaserUnit>) => {
    if (selectedUnit === null) {
      return
    }
    setUnits((current) =>
      current.map((unit) =>
        unit.id === selectedUnit.id
          ? {
              ...unit,
              ...patch,
            }
          : unit
      )
    )
  }

  return (
    <WorkspaceRoot>
      <Header>
        <HeaderTitleRow>
          <BoltIcon fontSize="small" />
          <HeaderTitle>Laser Engine (Alpha)</HeaderTitle>
          <HeaderTag>ILDA Preview UI</HeaderTag>
        </HeaderTitleRow>
        <ConnectionCard>
          <ConnectionRow>
            <ConnectionLabel>Connection</ConnectionLabel>
            <ConnectionStatus $connected={isConnected}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </ConnectionStatus>
          </ConnectionRow>
          <ConnectionRow>
            <MiniFieldLabel>Backend</MiniFieldLabel>
            <SelectLike
              value={backend}
              onChange={(event) => setBackend(event.target.value as LaserBackend)}
            >
              <option value="helios">Helios (USB)</option>
              <option value="etherdream">Ether Dream (Network)</option>
              <option value="fb4">FB4</option>
              <option value="generic">Generic ILDA DAC</option>
            </SelectLike>
          </ConnectionRow>
          <ConnectionRow>
            <MiniFieldLabel>Target</MiniFieldLabel>
            <TextField
              value={connectionTarget}
              onChange={(event) => setConnectionTarget(event.target.value)}
              placeholder="Auto discover / host / USB device"
            />
          </ConnectionRow>
          <ConnectionActionRow>
            <TinyButton type="button" onClick={() => setIsConnected(false)}>
              Disconnect
            </TinyButton>
            <TinyButton type="button" onClick={() => setIsConnected(true)}>
              Connect
            </TinyButton>
          </ConnectionActionRow>
        </ConnectionCard>
      </Header>

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
                    onClick={() => setSelectedUnitId(unit.id)}
                  >
                    <UnitName>{unit.name}</UnitName>
                    <UnitMeta>{`${unit.group} · ${unit.zone}`}</UnitMeta>
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
                  <MiniFieldLabel>Projection Zone</MiniFieldLabel>
                  <TextField
                    value={selectedUnit.zone}
                    onChange={(event) => updateSelectedUnit({ zone: event.target.value })}
                    placeholder="Floor / Audience-safe zone"
                  />
                  <CheckboxRow>
                    <input
                      type="checkbox"
                      checked={selectedUnit.enabled}
                      onChange={(event) =>
                        updateSelectedUnit({ enabled: event.target.checked })
                      }
                    />
                    Enabled
                  </CheckboxRow>
                </>
              )}
            </SectionBlock>

            <SectionBlock>
              <SectionBlockTitle>Group Routing</SectionBlockTitle>
              {groupNames.length <= 0 ? (
                <MutedLine>Create a group in unit settings to route controls.</MutedLine>
              ) : (
                groupNames.map((groupName) => (
                  <GroupRouteRow key={groupName}>
                    <span>{groupName}</span>
                    <GroupRouteTag>Split linked</GroupRouteTag>
                  </GroupRouteRow>
                ))
              )}
            </SectionBlock>
          </PanelBody>
        </SetupPanel>

        <DrawPanel>
          <PanelTitle>Main Laser Control</PanelTitle>
          <DrawToolbar>
            {([
              ['select', 'Select'],
              ['line', 'Line'],
              ['freehand', 'Free Hand'],
              ['rect', 'Rect'],
              ['circle', 'Circle'],
              ['poly', 'Polygon'],
            ] as Array<[LaserTool, string]>).map(([tool, label]) => (
              <ToolButton
                key={tool}
                type="button"
                $active={selectedTool === tool}
                onClick={() => setSelectedTool(tool)}
              >
                {label}
              </ToolButton>
            ))}
            <ToolDivider />
            <TinyButton type="button">
              <UploadFileIcon fontSize="inherit" />
              Import Vector
            </TinyButton>
            <TinyButton type="button">Save Graphic</TinyButton>
          </DrawToolbar>
          <GraphicMetaRow>
            <MetaField>
              <MiniFieldLabel>Graphic Name</MiniFieldLabel>
              <TextField
                value={activeGraphicName}
                onChange={(event) => setActiveGraphicName(event.target.value)}
              />
            </MetaField>
            <MetaField>
              <MiniFieldLabel>Scene Preset</MiniFieldLabel>
              <TextField
                value={laserPresetName}
                onChange={(event) => setLaserPresetName(event.target.value)}
              />
            </MetaField>
            <MetaColorRow>
              <MetaColorField>
                <MiniFieldLabel>Line Color</MiniFieldLabel>
                <ColorField
                  type="color"
                  value={lineColor}
                  onChange={(event) => setLineColor(event.target.value)}
                />
              </MetaColorField>
              <MetaColorField>
                <MiniFieldLabel>Fill Color</MiniFieldLabel>
                <ColorField
                  type="color"
                  value={fillColor}
                  onChange={(event) => setFillColor(event.target.value)}
                />
              </MetaColorField>
            </MetaColorRow>
          </GraphicMetaRow>
          <DrawCanvas>
            <CanvasGrid />
            <CanvasHint>
              Draw zone-ready laser graphics here.
              <br />
              Tools: lines, free hand, shapes, imported vector art.
            </CanvasHint>
          </DrawCanvas>
          <LinkPanel>
            <SectionBlockTitle>Scene / Split / LFO Linkage</SectionBlockTitle>
            <LinkGrid>
              <LinkField>
                <MiniFieldLabel>Active Split</MiniFieldLabel>
                <SelectLike
                  value={activeSplit}
                  onChange={(event) => setActiveSplit(Number(event.target.value))}
                >
                  {splitSummaries.map((split) => (
                    <option key={split.index} value={split.index}>
                      {`${split.label} (${split.groups})`}
                    </option>
                  ))}
                </SelectLike>
              </LinkField>
              <LinkField>
                <MiniFieldLabel>Assigned LFO</MiniFieldLabel>
                <SelectLike
                  value={activeLfo}
                  onChange={(event) => setActiveLfo(Number(event.target.value))}
                >
                  {lfoSummaries.map((lfo) => (
                    <option key={lfo.index} value={lfo.index}>
                      {lfo.label}
                    </option>
                  ))}
                </SelectLike>
              </LinkField>
            </LinkGrid>
            <ParamMapGrid>
              <ParamMapItem>
                <ParamName>Dot Count / Point Density</ParamName>
                <ParamSelect
                  value={dotDensityRoute}
                  onChange={(event) =>
                    setDotDensityRoute(event.target.value as LaserParamRouteMode)
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="split">Split</option>
                  <option value="lfo">LFO</option>
                  <option value="split+lfo">Split + LFO</option>
                </ParamSelect>
              </ParamMapItem>
              <ParamMapItem>
                <ParamName>Line Motion / Scan Path</ParamName>
                <ParamSelect
                  value={scanMotionRoute}
                  onChange={(event) =>
                    setScanMotionRoute(event.target.value as LaserParamRouteMode)
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="split">Split</option>
                  <option value="lfo">LFO</option>
                  <option value="split+lfo">Split + LFO</option>
                </ParamSelect>
              </ParamMapItem>
              <ParamMapItem>
                <ParamName>Beam Color</ParamName>
                <ParamSelect
                  value={beamColorRoute}
                  onChange={(event) =>
                    setBeamColorRoute(event.target.value as LaserParamRouteMode)
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="split">Split</option>
                  <option value="lfo">LFO</option>
                  <option value="split+lfo">Split + LFO</option>
                </ParamSelect>
              </ParamMapItem>
            </ParamMapGrid>
          </LinkPanel>
        </DrawPanel>

        <ControlPanel>
          <PanelTitle>Control + Safety</PanelTitle>
          <PanelBody>
            <SectionBlock>
              <SectionBlockTitle>Beam Color</SectionBlockTitle>
              <MiniFieldLabel>Color Mode</MiniFieldLabel>
              <SelectLike
                value={colorLinkMode}
                onChange={(event) =>
                  setColorLinkMode(event.target.value as 'split' | 'manual')
                }
              >
                <option value="split">Split Color Sync</option>
                <option value="manual">Manual Palette</option>
              </SelectLike>
              <MiniFieldLabel>Manual Color</MiniFieldLabel>
              <ColorField
                type="color"
                value={beamPalette}
                onChange={(event) => setBeamPalette(event.target.value)}
                disabled={colorLinkMode !== 'manual'}
              />
            </SectionBlock>

            <SectionBlock>
              <SectionBlockTitle>Safety Controls</SectionBlockTitle>
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={safetyArmed}
                  onChange={(event) => setSafetyArmed(event.target.checked)}
                />
                Arm output (required)
              </CheckboxRow>
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={enableProjectionMask}
                  onChange={(event) => setEnableProjectionMask(event.target.checked)}
                />
                Projection mask enabled
              </CheckboxRow>
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={audienceScanGate}
                  onChange={(event) => setAudienceScanGate(event.target.checked)}
                />
                Audience scan gate enabled
              </CheckboxRow>
              <TinyButton
                type="button"
                onClick={() => setEStopLatched((current) => !current)}
                style={{
                  borderColor: eStopLatched ? '#d95f5f' : undefined,
                  color: eStopLatched ? '#ffdada' : undefined,
                }}
              >
                {eStopLatched ? 'E-Stop Latched' : 'Latch E-Stop'}
              </TinyButton>
            </SectionBlock>

            <SectionBlock>
              <SectionBlockTitle>Laser Groups</SectionBlockTitle>
              {groupNames.length <= 0 ? (
                <MutedLine>No groups yet.</MutedLine>
              ) : (
                groupNames.map((groupName) => (
                  <GroupPill key={groupName}>{groupName}</GroupPill>
                ))
              )}
            </SectionBlock>
          </PanelBody>
        </ControlPanel>
      </MainGrid>

      <FooterStrip>
        <FooterBlock>
          <MiniFieldLabel>Scan Rate (PPS)</MiniFieldLabel>
          <InlineNumber
            type="number"
            value={scanRatePps}
            min={8000}
            max={60000}
            step={500}
            onChange={(event) =>
              setScanRatePps(Math.max(8000, Math.min(60000, Number(event.target.value) || 30000)))
            }
          />
        </FooterBlock>
        <FooterBlock>
          <MiniFieldLabel>Output Power Limit</MiniFieldLabel>
          <InlineRange
            type="range"
            min={1}
            max={100}
            step={1}
            value={outputPower}
            onChange={(event) => setOutputPower(Number(event.target.value))}
          />
          <FooterValue>{`${outputPower}%`}</FooterValue>
        </FooterBlock>
        {!standalone && (
          <OpenButton onClick={() => send_open_page_window('Laser')}>
            <OpenInNewIcon fontSize="small" />
            Open / Focus Laser Window
          </OpenButton>
        )}
      </FooterStrip>
    </WorkspaceRoot>
  )
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
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.7rem;
  box-sizing: border-box;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0.6rem;
  min-height: 0;
`

const HeaderTitleRow = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.darker};
  border-radius: 0.45rem;
  padding: 0.55rem 0.65rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  flex: 1 1 auto;
`

const HeaderTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
`

const HeaderTag = styled.div`
  margin-left: auto;
  font-size: 0.68rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 999px;
  padding: 0.12rem 0.42rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ConnectionCard = styled.div`
  width: min(24rem, 48%);
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.45rem;
  background: ${(props) => props.theme.colors.bg.darker};
  padding: 0.48rem 0.56rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 15rem;
`

const ConnectionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

const ConnectionLabel = styled.div`
  font-size: 0.75rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin-right: auto;
`

const ConnectionStatus = styled.div<{ $connected: boolean }>`
  font-size: 0.7rem;
  border: 1px solid ${(props) => (props.$connected ? '#2ea56b' : '#a15858')};
  color: ${(props) => (props.$connected ? '#b8ffd9' : '#ffd7d7')};
  border-radius: 999px;
  padding: 0.08rem 0.4rem;
`

const ConnectionActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
`

const MainGrid = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(15rem, 0.9fr) minmax(26rem, 1.8fr) minmax(15rem, 0.95fr);
  gap: 0.6rem;
  overflow: hidden;
`

const SetupPanel = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.45rem;
  background: ${(props) => props.theme.colors.bg.darker};
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const DrawPanel = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.45rem;
  background: ${(props) => props.theme.colors.bg.darker};
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const ControlPanel = styled(SetupPanel)``

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

const CheckboxRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  font-size: 0.68rem;
`

const DrawToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  padding: 0.5rem 0.56rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
`

const GraphicMetaRow = styled.div`
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  padding: 0.44rem 0.56rem;
  display: grid;
  grid-template-columns: minmax(10rem, 1fr) minmax(10rem, 1fr) minmax(12rem, 1.2fr);
  gap: 0.44rem;
`

const MetaField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
`

const MetaColorRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(5rem, 1fr));
  gap: 0.4rem;
`

const MetaColorField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
`

const ToolButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${(props) => (props.$active ? '#75c6ff' : props.theme.colors.divider)};
  background: ${(props) =>
    props.$active ? 'rgba(45, 114, 168, 0.38)' : props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.28rem;
  padding: 0.22rem 0.44rem;
  font-size: 0.67rem;
  cursor: pointer;
`

const ToolDivider = styled.div`
  width: 1px;
  background: ${(props) => props.theme.colors.divider};
  margin: 0 0.1rem;
`

const DrawCanvas = styled.div`
  flex: 1 1 auto;
  min-height: 14rem;
  margin: 0.52rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.4rem;
  background: radial-gradient(circle at 50% 50%, #101822 0%, #090c12 68%, #05070b 100%);
  position: relative;
  overflow: hidden;
`

const CanvasGrid = styled.div`
  position: absolute;
  inset: 0;
  background-image: linear-gradient(#ffffff0e 1px, transparent 1px),
    linear-gradient(90deg, #ffffff0e 1px, transparent 1px);
  background-size: 2rem 2rem;
`

const CanvasHint = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-size: 0.73rem;
  color: #dfe9ffb5;
  line-height: 1.35;
  pointer-events: none;
`

const LinkPanel = styled.div`
  border-top: 1px solid ${(props) => props.theme.colors.divider};
  padding: 0.5rem 0.56rem 0.56rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`

const LinkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(10rem, 1fr));
  gap: 0.42rem;
`

const LinkField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
`

const ParamMapGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.24rem;
`

const ParamMapItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.24rem 0.34rem;
  font-size: 0.66rem;
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
  width: 8.6rem;
`

const MutedLine = styled.div`
  font-size: 0.66rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const GroupPill = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 999px;
  padding: 0.12rem 0.42rem;
  width: fit-content;
  font-size: 0.66rem;
`

const GroupRouteRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.28rem;
  padding: 0.2rem 0.34rem;
  font-size: 0.66rem;
`

const GroupRouteTag = styled.div`
  font-size: 0.61rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 999px;
  padding: 0.08rem 0.3rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ColorField = styled.input`
  width: 100%;
  height: 2rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.3rem;
  background: ${(props) => props.theme.colors.bg.primary};
`

const FooterStrip = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.45rem;
  background: ${(props) => props.theme.colors.bg.darker};
  padding: 0.42rem 0.56rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
`

const FooterBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
`

const InlineNumber = styled.input`
  width: 6.8rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.26rem;
  padding: 0.2rem 0.3rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
`

const InlineRange = styled.input`
  width: 10rem;
`

const FooterValue = styled.div`
  font-size: 0.68rem;
  min-width: 2.2rem;
  text-align: right;
`
