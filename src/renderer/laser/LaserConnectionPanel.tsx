import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { LaserDacProfile, LaserNetworkNode } from '../../shared/laserFixtureRouting'
import { dacSessionId, nodeSessionId } from '../../shared/laserFixtureRouting'
import {
  LASER_DAC_CONNECTION_PRESETS,
  LASER_NODE_CONNECTION_PRESETS,
  dacPresetById,
  dacPresetFromProfile,
  nodePresetById,
  nodePresetFromNode,
  type LaserDacConnectionPresetId,
  type LaserNodeConnectionPresetId,
} from './laserConnectionPresets'
import LaserFb4BeyondInfoDialog from './LaserFb4BeyondInfoDialog'
import LaserHardwareSettingsFields from './LaserHardwareSettingsFields'
import LaserHeliosDeviceField from './LaserHeliosDeviceField'
import { defaultConnectionTargetForBackend } from './laserHeliosConnection'
import { normalizeLaserDacHardwareSettings } from '../../shared/laserHardwareSettings'
import {
  LaserActionRow,
  LaserConnectionStatus,
  LaserFieldLabel,
  LaserInlineButton,
  LaserMuted,
  LaserPrimaryButton,
  LaserSection,
  LaserSectionTitle,
  LaserSelect,
  LaserTextInput,
  LaserToggleRow,
} from './laserUi'

export type LaserConnectionPanelProps = {
  dacProfiles: LaserDacProfile[]
  activeDacProfileId: string
  onActiveDacProfileId: (id: string) => void
  onDacProfilesChange: (
    updater: (prev: LaserDacProfile[]) => LaserDacProfile[]
  ) => void
  networkNodes: LaserNetworkNode[]
  onNetworkNodesChange: (
    updater: (prev: LaserNetworkNode[]) => LaserNetworkNode[]
  ) => void
  connectedSessionIds: string[]
  isConnected: boolean
  connectionNote: string
  onAddDacProfile: () => void
  onAddNetworkNode: () => void
  onOpenZones: () => void
  onConnectDac: (profile: LaserDacProfile) => void
  onConnectNode: (node: LaserNetworkNode) => void
  onDisconnectSession: (sessionId?: string) => void
  onDisconnectAll: () => void
  onOpenSetupWizard?: () => void
  calibrationTestPatternActive?: boolean
  onCalibrationTestPatternActiveChange?: (active: boolean) => void
  calibrationTestPatternOutputReady?: boolean
}

export default function LaserConnectionPanel({
  dacProfiles,
  activeDacProfileId,
  onActiveDacProfileId,
  onDacProfilesChange,
  networkNodes,
  onNetworkNodesChange,
  connectedSessionIds,
  isConnected,
  connectionNote,
  onAddDacProfile,
  onAddNetworkNode,
  onOpenZones,
  onConnectDac,
  onConnectNode,
  onDisconnectSession,
  onDisconnectAll,
  onOpenSetupWizard,
  calibrationTestPatternActive = false,
  onCalibrationTestPatternActiveChange,
  calibrationTestPatternOutputReady = false,
}: LaserConnectionPanelProps) {
  const [fb4InfoOpen, setFb4InfoOpen] = useState(false)
  const [nodesExpanded, setNodesExpanded] = useState(networkNodes.length > 0)
  const [hardwareExpanded, setHardwareExpanded] = useState(false)

  useEffect(() => {
    if (networkNodes.length > 0) setNodesExpanded(true)
  }, [networkNodes.length])

  const activeProfile = useMemo(
    () => dacProfiles.find((p) => p.id === activeDacProfileId) ?? dacProfiles[0]!,
    [dacProfiles, activeDacProfileId]
  )

  const dacPreset = dacPresetFromProfile(activeProfile)
  const dacConnected = connectedSessionIds.includes(
    dacSessionId(activeProfile.id)
  )

  const patchActiveProfile = (patch: Partial<LaserDacProfile>) => {
    onDacProfilesChange((prev) =>
      prev.map((p) => (p.id === activeProfile.id ? { ...p, ...patch } : p))
    )
  }

  const patchActiveHardware = (
    hardwareSettings: LaserDacProfile['hardwareSettings']
  ) => {
    patchActiveProfile({
      hardwareSettings: normalizeLaserDacHardwareSettings(hardwareSettings),
    })
  }

  const applyDacPreset = (presetId: LaserDacConnectionPresetId) => {
    const preset = dacPresetById(presetId)
    patchActiveProfile({
      outputProtocol: preset.protocol,
      backend: preset.backend,
      connectionTarget: defaultConnectionTargetForBackend(preset.backend),
    })
  }

  return (
    <>
      <LaserSection>
        <LaserSectionTitle>DAC connection</LaserSectionTitle>
        <LaserMuted>
          Choose your ILDA hardware, connect, then assign fixtures to projection
          zones.
        </LaserMuted>

        <LaserFieldLabel htmlFor="laser-dac-profile">Profile</LaserFieldLabel>
        <LaserSelect
          id="laser-dac-profile"
          value={activeDacProfileId}
          onChange={(e) => onActiveDacProfileId(e.target.value)}
        >
          {dacProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </LaserSelect>
        <LaserActionRow>
          <LaserInlineButton onClick={onAddDacProfile}>Add profile</LaserInlineButton>
          {onOpenSetupWizard ? (
            <LaserPrimaryButton onClick={onOpenSetupWizard}>
              Setup wizard
            </LaserPrimaryButton>
          ) : null}
        </LaserActionRow>

        <SectionTitleRow>
          <Tooltip title="How this DAC reaches your hardware" placement="top">
            <LaserFieldLabel as="span">Connection type</LaserFieldLabel>
          </Tooltip>
          {dacPreset.showFb4Info ? (
            <Tooltip title="FB4 & BEYOND setup guide">
              <IconButton
                size="small"
                aria-label="FB4 and BEYOND setup information"
                onClick={() => setFb4InfoOpen(true)}
                sx={{ marginLeft: 'auto', padding: '2px' }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </SectionTitleRow>
        <LaserSelect
          value={dacPreset.id}
          onChange={(e) =>
            applyDacPreset(e.target.value as LaserDacConnectionPresetId)
          }
        >
          {LASER_DAC_CONNECTION_PRESETS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </LaserSelect>

        <LaserMuted>{dacPreset.shortHint}</LaserMuted>

        {activeProfile.backend === 'helios' ? (
          <LaserHeliosDeviceField
            connectionTarget={activeProfile.connectionTarget}
            onConnectionTargetChange={(connectionTarget) =>
              patchActiveProfile({ connectionTarget })
            }
          />
        ) : null}

        {dacPreset.showTarget && activeProfile.backend !== 'helios' ? (
          <>
            <Tooltip title={dacPreset.targetTooltip} placement="left">
              <LaserFieldLabel>{dacPreset.targetLabel}</LaserFieldLabel>
            </Tooltip>
            <LaserTextInput
              value={activeProfile.connectionTarget}
              onChange={(e) =>
                patchActiveProfile({ connectionTarget: e.target.value })
              }
              placeholder={dacPreset.targetPlaceholder}
            />
          </>
        ) : null}

        {dacPreset.showZonesButton ? (
          <LaserActionRow>
            <LaserInlineButton onClick={onOpenZones}>
              Projection zones…
            </LaserInlineButton>
          </LaserActionRow>
        ) : null}

        <LaserToggleRow>
          <LaserFieldLabel as="span">Status</LaserFieldLabel>
          <LaserConnectionStatus $connected={dacConnected}>
            {dacConnected ? 'Connected' : 'Disconnected'}
          </LaserConnectionStatus>
        </LaserToggleRow>
        <LaserActionRow>
          <LaserInlineButton
            disabled={!dacConnected}
            onClick={() => onDisconnectSession(dacSessionId(activeProfile.id))}
          >
            Disconnect
          </LaserInlineButton>
          <LaserPrimaryButton onClick={() => onConnectDac(activeProfile)}>
            Connect
          </LaserPrimaryButton>
        </LaserActionRow>
      </LaserSection>

      <LaserSection>
        <SectionTitleRow>
          <LaserSectionTitle>Hardware tuning</LaserSectionTitle>
          <LaserInlineButton
            onClick={() => setHardwareExpanded((v) => !v)}
            style={{ marginLeft: 'auto' }}
          >
            {hardwareExpanded ? 'Hide' : 'Show'}
          </LaserInlineButton>
        </SectionTitleRow>
        {hardwareExpanded ? (
          <>
            <LaserMuted>
              Scan rate, analog/TTL color mode, output power, and galvo calibration.
            </LaserMuted>
            <HardwareFieldsWrap>
              <LaserHardwareSettingsFields
                settings={normalizeLaserDacHardwareSettings(
                  activeProfile.hardwareSettings
                )}
                onChange={patchActiveHardware}
                testPatternActive={calibrationTestPatternActive}
                onTestPatternActiveChange={onCalibrationTestPatternActiveChange}
                testPatternOutputReady={calibrationTestPatternOutputReady}
              />
            </HardwareFieldsWrap>
          </>
        ) : (
          <LaserMuted>
            Expand to adjust scan rate, color mode, and calibration test pattern.
          </LaserMuted>
        )}
      </LaserSection>

      <LaserSection>
        <SectionTitleRow>
          <LaserSectionTitle>Network nodes</LaserSectionTitle>
          <Tooltip title="Optional extra endpoints (Ether Dream, IDN, etc.)">
            <IconButton
              size="small"
              aria-label="About network nodes"
              sx={{ padding: '2px' }}
            >
              <InfoOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <LaserInlineButton
            onClick={() => setNodesExpanded((v) => !v)}
            style={{ marginLeft: 'auto' }}
          >
            {nodesExpanded ? 'Hide' : 'Show'}
          </LaserInlineButton>
        </SectionTitleRow>
        {nodesExpanded ? (
          <>
            <LaserMuted>
              One session per node. Use the main DAC profile for multi-zone scanners.
            </LaserMuted>
            <LaserActionRow>
              <LaserInlineButton onClick={onAddNetworkNode}>Add node</LaserInlineButton>
            </LaserActionRow>
            {networkNodes.length <= 0 ? (
              <LaserMuted>No nodes yet.</LaserMuted>
            ) : (
              networkNodes.map((node) => (
                <NodeCard key={node.id}>
                  <LaserTextInput
                    value={node.name}
                    onChange={(e) => {
                      const name = e.target.value
                      onNetworkNodesChange((prev) =>
                        prev.map((n) => (n.id === node.id ? { ...n, name } : n))
                      )
                    }}
                    placeholder="Node name"
                  />
                  <NodeConnectionFields
                    node={node}
                    connected={connectedSessionIds.includes(
                      nodeSessionId(node.id)
                    )}
                    onPresetChange={(presetId) => {
                      const preset = nodePresetById(presetId)
                      onNetworkNodesChange((prev) =>
                        prev.map((n) =>
                          n.id === node.id
                            ? {
                                ...n,
                                outputProtocol: preset.protocol,
                                backend: preset.backend,
                              }
                            : n
                        )
                      )
                    }}
                    onTargetChange={(connectionTarget) => {
                      onNetworkNodesChange((prev) =>
                        prev.map((n) =>
                          n.id === node.id ? { ...n, connectionTarget } : n
                        )
                      )
                    }}
                    onConnect={() => onConnectNode(node)}
                    onDisconnect={() =>
                      onDisconnectSession(nodeSessionId(node.id))
                    }
                    onFb4Info={() => setFb4InfoOpen(true)}
                  />
                </NodeCard>
              ))
            )}
          </>
        ) : (
          <LaserMuted>Optional remote laser endpoints beyond the main DAC.</LaserMuted>
        )}
      </LaserSection>

      <LaserSection>
        <LaserSectionTitle>Active sessions</LaserSectionTitle>
        <LaserToggleRow>
          <LaserFieldLabel as="span">Open sessions</LaserFieldLabel>
          <LaserConnectionStatus $connected={isConnected}>
            {isConnected
              ? `${connectedSessionIds.length} connected`
              : 'None'}
          </LaserConnectionStatus>
        </LaserToggleRow>
        {connectionNote.length > 0 ? (
          <LaserMuted>{connectionNote}</LaserMuted>
        ) : null}
        <LaserActionRow>
          <LaserInlineButton onClick={onDisconnectAll}>
            Disconnect all
          </LaserInlineButton>
        </LaserActionRow>
      </LaserSection>

      <LaserFb4BeyondInfoDialog
        open={fb4InfoOpen}
        onClose={() => setFb4InfoOpen(false)}
      />
    </>
  )
}

function NodeConnectionFields({
  node,
  connected,
  onPresetChange,
  onTargetChange,
  onConnect,
  onDisconnect,
  onFb4Info,
}: {
  node: LaserNetworkNode
  connected: boolean
  onPresetChange: (id: LaserNodeConnectionPresetId) => void
  onTargetChange: (target: string) => void
  onConnect: () => void
  onDisconnect: () => void
  onFb4Info: () => void
}) {
  const preset = nodePresetFromNode(node)
  return (
    <>
      <SectionTitleRow>
        <LaserFieldLabel as="span">Connection</LaserFieldLabel>
        {preset.showFb4Info ? (
          <Tooltip title="FB4 & BEYOND setup">
            <IconButton
              size="small"
              aria-label="FB4 setup"
              onClick={onFb4Info}
              sx={{ marginLeft: 'auto', padding: '2px' }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </SectionTitleRow>
      <LaserSelect
        value={preset.id}
        onChange={(e) =>
          onPresetChange(e.target.value as LaserNodeConnectionPresetId)
        }
      >
        {LASER_NODE_CONNECTION_PRESETS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </LaserSelect>
      <LaserMuted>{preset.shortHint}</LaserMuted>
      {preset.showTarget ? (
        <Tooltip title={preset.targetTooltip}>
          <LaserTextInput
            value={node.connectionTarget}
            onChange={(e) => onTargetChange(e.target.value)}
            placeholder={preset.targetPlaceholder}
          />
        </Tooltip>
      ) : null}
      <LaserToggleRow>
        <LaserConnectionStatus $connected={connected}>
          {connected ? 'Connected' : 'Disconnected'}
        </LaserConnectionStatus>
      </LaserToggleRow>
      <LaserActionRow>
        <LaserInlineButton disabled={!connected} onClick={onDisconnect}>
          Disconnect
        </LaserInlineButton>
        <LaserPrimaryButton onClick={onConnect}>Connect</LaserPrimaryButton>
      </LaserActionRow>
    </>
  )
}

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  width: 100%;
`

const NodeCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.3rem;
  padding: 0.45rem;
  margin-top: 0.15rem;
  background: ${(p) => p.theme.colors.bg.darker};
`

const HardwareFieldsWrap = styled.div`
  margin-top: 0.1rem;
`
