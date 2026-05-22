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
}: LaserConnectionPanelProps) {
  const [fb4InfoOpen, setFb4InfoOpen] = useState(false)
  const [nodesExpanded, setNodesExpanded] = useState(networkNodes.length > 0)

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

  const applyDacPreset = (presetId: LaserDacConnectionPresetId) => {
    const preset = dacPresetById(presetId)
    patchActiveProfile({
      outputProtocol: preset.protocol,
      backend: preset.backend,
    })
  }

  return (
    <>
      <SectionBlock>
        <SectionBlockTitle>Output connection</SectionBlockTitle>
        <MutedLine>
          Pick hardware type, connect, then assign fixtures to zones or nodes.
        </MutedLine>

        <MiniFieldLabel>Profile</MiniFieldLabel>
        <SelectLike
          value={activeDacProfileId}
          onChange={(e) => onActiveDacProfileId(e.target.value)}
        >
          {dacProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectLike>
        <ConnectionActionRow>
          <PanelButton type="button" onClick={onAddDacProfile}>
            Add profile
          </PanelButton>
        </ConnectionActionRow>

        <FieldLabelRow>
          <Tooltip title="How this DAC reaches your hardware" placement="top">
            <MiniFieldLabel $inline>Connection type</MiniFieldLabel>
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
        </FieldLabelRow>
        <SelectLike
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
        </SelectLike>

        <MutedLine>{dacPreset.shortHint}</MutedLine>

        {dacPreset.showTarget ? (
          <>
            <Tooltip title={dacPreset.targetTooltip} placement="left">
              <MiniFieldLabel>{dacPreset.targetLabel}</MiniFieldLabel>
            </Tooltip>
            <TextField
              value={activeProfile.connectionTarget}
              onChange={(e) =>
                patchActiveProfile({ connectionTarget: e.target.value })
              }
              placeholder={dacPreset.targetPlaceholder}
            />
          </>
        ) : null}

        {dacPreset.showZonesButton ? (
          <ConnectionActionRow>
            <PanelButton type="button" onClick={onOpenZones}>
              Projection zones…
            </PanelButton>
          </ConnectionActionRow>
        ) : null}

        <ConnectionRow>
          <ConnectionLabel>Status</ConnectionLabel>
          <ConnectionStatus $connected={dacConnected}>
            {dacConnected ? 'Connected' : 'Disconnected'}
          </ConnectionStatus>
        </ConnectionRow>
        <ConnectionActionRow>
          <PanelButton
            type="button"
            disabled={!dacConnected}
            onClick={() => onDisconnectSession(dacSessionId(activeProfile.id))}
          >
            Disconnect
          </PanelButton>
          <PanelButton
            type="button"
            onClick={() => onConnectDac(activeProfile)}
          >
            Connect
          </PanelButton>
        </ConnectionActionRow>
      </SectionBlock>

      <SectionBlock>
        <SectionBlockTitleRow>
          <SectionBlockTitle $flush>Network nodes</SectionBlockTitle>
          <Tooltip title="Optional extra endpoints (Ether Dream, IDN, etc.) — one session per node">
            <IconButton
              size="small"
              aria-label="About network nodes"
              sx={{ padding: '2px' }}
            >
              <InfoOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <PanelButton
            type="button"
            onClick={() => setNodesExpanded((v) => !v)}
            style={{ marginLeft: 'auto' }}
          >
            {nodesExpanded ? 'Hide' : 'Show'}
          </PanelButton>
        </SectionBlockTitleRow>
        {nodesExpanded ? (
          <>
            <MutedLine>
              Assign fixtures to a node in the unit list. Use the main profile above for
              multi-zone DACs.
            </MutedLine>
            <ConnectionActionRow>
              <PanelButton type="button" onClick={onAddNetworkNode}>
                Add node
              </PanelButton>
            </ConnectionActionRow>
            {networkNodes.length <= 0 ? (
              <MutedLine>No nodes yet.</MutedLine>
            ) : (
              networkNodes.map((node) => (
                <NodeCard key={node.id}>
                  <TextField
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
        ) : null}
      </SectionBlock>

      <SectionBlock>
        <SectionBlockTitle>Sessions</SectionBlockTitle>
        <ConnectionRow>
          <ConnectionLabel>Active</ConnectionLabel>
          <ConnectionStatus $connected={isConnected}>
            {isConnected
              ? `${connectedSessionIds.length} session(s)`
              : 'None'}
          </ConnectionStatus>
        </ConnectionRow>
        {connectionNote.length > 0 ? (
          <MutedLine>{connectionNote}</MutedLine>
        ) : null}
        <ConnectionActionRow>
          <PanelButton type="button" onClick={onDisconnectAll}>
            Disconnect all
          </PanelButton>
        </ConnectionActionRow>
      </SectionBlock>

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
      <FieldLabelRow>
        <MiniFieldLabel $inline>Connection</MiniFieldLabel>
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
      </FieldLabelRow>
      <SelectLike
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
      </SelectLike>
      <MutedLine>{preset.shortHint}</MutedLine>
      {preset.showTarget ? (
        <Tooltip title={preset.targetTooltip}>
          <TextField
            value={node.connectionTarget}
            onChange={(e) => onTargetChange(e.target.value)}
            placeholder={preset.targetPlaceholder}
          />
        </Tooltip>
      ) : null}
      <ConnectionRow>
        <ConnectionStatus $connected={connected}>
          {connected ? 'Connected' : 'Disconnected'}
        </ConnectionStatus>
      </ConnectionRow>
      <ConnectionActionRow>
        <PanelButton type="button" disabled={!connected} onClick={onDisconnect}>
          Disconnect
        </PanelButton>
        <PanelButton type="button" onClick={onConnect}>
          Connect
        </PanelButton>
      </ConnectionActionRow>
    </>
  )
}

const SectionBlock = styled.div`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(p) => p.theme.colors.bg.primary};
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`

const SectionBlockTitle = styled.div<{ $flush?: boolean }>`
  font-size: 0.74rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
  margin-bottom: ${(p) => (p.$flush ? 0 : '0.1rem')};
`

const SectionBlockTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex-wrap: wrap;
`

const MutedLine = styled.div`
  font-size: 0.66rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.35;
`

const MiniFieldLabel = styled.label<{ $inline?: boolean }>`
  font-size: 0.68rem;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.secondary};
  display: ${(p) => (p.$inline ? 'inline' : 'block')};
`

const FieldLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
`

const TextField = styled.input`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.28rem;
  background: ${(p) => p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
  padding: 0.28rem 0.38rem;
  font-size: 0.72rem;
`

const SelectLike = styled.select`
  width: 100%;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.28rem;
  background: ${(p) => p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
  padding: 0.28rem 0.34rem;
  font-size: 0.72rem;
`

const ConnectionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

const ConnectionLabel = styled.div`
  font-size: 0.75rem;
  color: ${(p) => p.theme.colors.text.secondary};
  margin-right: auto;
`

const ConnectionStatus = styled.div<{ $connected: boolean }>`
  font-size: 0.7rem;
  border: 1px solid ${(p) => (p.$connected ? '#2ea56b' : '#a15858')};
  color: ${(p) => (p.$connected ? '#b8ffd9' : '#ffd7d7')};
  border-radius: 999px;
  padding: 0.08rem 0.4rem;
`

const ConnectionActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
  flex-wrap: wrap;
`

const PanelButton = styled.button`
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  border-radius: 0.3rem;
  padding: 0.32rem 0.5rem;
  font-size: 0.72rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

const NodeCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.3rem;
  padding: 0.35rem;
  margin-top: 0.2rem;
`
