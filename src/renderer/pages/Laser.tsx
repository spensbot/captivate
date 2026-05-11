import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BoltIcon from '@mui/icons-material/Bolt'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useActiveLightScene } from '../redux/store'
import { splitDisplayName } from '../scenes/splitUiVisibility'
import { LfoShape } from '../../shared/oscillator'
import { send_open_page_window } from '../ipcHandler'
import LaserEditorCanvas from '../laser/LaserEditorCanvas'
import LaserSceneStrip, { createEmptyLaserScene } from '../laser/LaserSceneStrip'
import LaserSvgImportDialog from '../laser/LaserSvgImportDialog'
import LaserGradientModal from '../laser/LaserGradientModal'
import type {
  BeamGradientStop,
  LaserScene,
  LaserRgbCapabilities,
  LaserTool,
} from '../laser/laserEditorTypes'
import { LASER_SCENES_PER_PAGE } from '../laser/laserEditorTypes'
import { DEFAULT_LASER_RGB_CAPABILITIES } from '../laser/laserBeamColor'

interface LaserAlphaPageProps {
  standalone?: boolean
}

type LaserBackend = 'helios' | 'etherdream' | 'fb4' | 'generic'
type LaserParamRouteMode = 'manual' | 'split' | 'lfo' | 'split+lfo'

interface LaserUnit {
  id: string
  name: string
  group: string
  zone: string
  enabled: boolean
  laserChannels: LaserRgbCapabilities
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
  const ildaBootstrap = useRef<{ scenes: LaserScene[]; activeId: string } | null>(null)
  if (!ildaBootstrap.current) {
    const first = createEmptyLaserScene('Graphic 1')
    ildaBootstrap.current = { scenes: [first], activeId: first.id }
  }

  const splitSummaries = useActiveLightScene((scene) =>
    scene.splitScenes.map((split, index) => ({
      index,
      label: splitDisplayName(index, split.groups),
    }))
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
  const [laserScenes, setLaserScenes] = useState(() => ildaBootstrap.current!.scenes)
  const [activeLaserSceneId, setActiveLaserSceneId] = useState(
    () => ildaBootstrap.current!.activeId
  )
  const [laserScenePage, setLaserScenePage] = useState(0)
  const [ildaSelectedLayerId, setIldaSelectedLayerId] = useState<string | null>(null)
  const [svgImportOpen, setSvgImportOpen] = useState(false)
  const [laserPresetName, setLaserPresetName] = useState('Main Drop')
  const [dotDensityRoute, setDotDensityRoute] = useState<LaserParamRouteMode>('lfo')
  const [scanMotionRoute, setScanMotionRoute] =
    useState<LaserParamRouteMode>('split+lfo')
  const [beamColorRoute, setBeamColorRoute] = useState<LaserParamRouteMode>('split')
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
  const [gradientModalOpen, setGradientModalOpen] = useState(false)
  const [units, setUnits] = useState<LaserUnit[]>([
    {
      id: 'laser-front-left',
      name: 'Laser Front Left',
      group: 'Main Lasers',
      zone: 'Floor',
      enabled: true,
      laserChannels: { ...DEFAULT_LASER_RGB_CAPABILITIES },
    },
    {
      id: 'laser-front-right',
      name: 'Laser Front Right',
      group: 'Main Lasers',
      zone: 'Floor',
      enabled: true,
      laserChannels: { ...DEFAULT_LASER_RGB_CAPABILITIES },
    },
  ])
  const [selectedUnitId, setSelectedUnitId] = useState<string>('laser-front-left')
  const [colorLinkMode, setColorLinkMode] = useState<'split' | 'manual'>('split')
  const [beamPalette, setBeamPalette] = useState('#00ff88')

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) ?? null,
    [selectedUnitId, units]
  )
  const activeLaserScene = useMemo(
    () => laserScenes.find((s) => s.id === activeLaserSceneId) ?? null,
    [laserScenes, activeLaserSceneId]
  )
  const laserPageCount = Math.max(
    1,
    Math.ceil((laserScenes.length + 1) / LASER_SCENES_PER_PAGE)
  )
  useEffect(() => {
    setLaserScenePage((p) =>
      Math.min(Math.max(0, p), Math.max(0, laserPageCount - 1))
    )
  }, [laserPageCount])
  const groupNames = useMemo(() => {
    const names = new Set<string>()
    for (const unit of units) {
      if (unit.group.trim().length > 0) {
        names.add(unit.group.trim())
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [units])

  const editorLaserCaps = useMemo(
    () => selectedUnit?.laserChannels ?? DEFAULT_LASER_RGB_CAPABILITIES,
    [selectedUnit]
  )

  const addLaserUnit = () => {
    const nextIndex = units.length + 1
    const id = `laser-${Date.now()}-${nextIndex}`
    const next: LaserUnit = {
      id,
      name: `Laser ${nextIndex}`,
      group: 'Main Lasers',
      zone: 'Floor',
      enabled: true,
      laserChannels: { ...DEFAULT_LASER_RGB_CAPABILITIES },
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
                      <CheckboxRow key={key}>
                        <input
                          type="checkbox"
                          checked={selectedUnit.laserChannels[key]}
                          onChange={() =>
                            updateSelectedUnit({
                              laserChannels: {
                                ...selectedUnit.laserChannels,
                                [key]: !selectedUnit.laserChannels[key],
                              },
                            })
                          }
                        />
                        {label}
                      </CheckboxRow>
                    ))}
                  </ChannelGrid>
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
            <MetaField>
              <MiniFieldLabel>Scene Preset</MiniFieldLabel>
              <TextField
                value={laserPresetName}
                onChange={(event) => setLaserPresetName(event.target.value)}
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
          {activeLaserScene ? (
            <LaserEditorCanvas
              layers={activeLaserScene.layers}
              onLayersChange={(next) =>
                setLaserScenes((prev) =>
                  prev.map((s) =>
                    s.id === activeLaserSceneId ? { ...s, layers: next } : s
                  )
                )
              }
              selectedLayerId={ildaSelectedLayerId}
              onSelectLayer={setIldaSelectedLayerId}
              tool={selectedTool}
              onToolChange={setSelectedTool}
              lineColor={lineColor}
              onLineColorChange={setLineColor}
              laserCapabilities={editorLaserCaps}
              beamStrokeMode={beamStrokeMode}
              onBeamStrokeModeChange={setBeamStrokeMode}
              beamGradientStops={beamGradientStops}
              rainbowCycles={rainbowCycles}
              onRainbowCyclesChange={setRainbowCycles}
              onOpenBeamGradientModal={() => setGradientModalOpen(true)}
            />
          ) : (
            <EditorFallback>
              <MutedLine>Select or create a scene below.</MutedLine>
            </EditorFallback>
          )}
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
                      {split.label}
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

      <LaserSvgImportDialog
        open={svgImportOpen}
        onClose={() => setSvgImportOpen(false)}
        beamColor={lineColor}
        onAccept={(newLayers) => {
          if (activeLaserSceneId === null) return
          setLaserScenes((prev) =>
            prev.map((s) =>
              s.id === activeLaserSceneId
                ? { ...s, layers: [...s.layers, ...newLayers] }
                : s
            )
          )
          const top = newLayers[newLayers.length - 1]
          if (top) {
            setIldaSelectedLayerId(top.id)
          }
        }}
      />
      <LaserGradientModal
        open={gradientModalOpen}
        onClose={() => setGradientModalOpen(false)}
        stops={beamGradientStops}
        onApply={setBeamGradientStops}
        laserCaps={editorLaserCaps}
      />
      <LaserSceneStrip
        scenes={laserScenes}
        activeSceneId={activeLaserSceneId}
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
          setLaserScenePage(Math.floor(idx / LASER_SCENES_PER_PAGE))
        }}
        page={laserScenePage}
        onPageChange={setLaserScenePage}
      />

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

const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.2rem 0.5rem;
`

const GraphicMetaRow = styled.div`
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  padding: 0.44rem 0.56rem;
  display: grid;
  grid-template-columns: minmax(10rem, 1fr) minmax(10rem, 1fr);
  gap: 0.44rem;
`

const MetaField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
`

const EditorImportRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  padding: 0.38rem 0.56rem 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
`

const EditorFallback = styled.div`
  flex: 1 1 auto;
  min-height: 14rem;
  margin: 0.52rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
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
