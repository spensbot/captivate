import type { LaserDacBackend, LaserOutputProtocol } from '../../shared/laserDac'

/** Single UI choice mapping to protocol + backend. */
export type LaserDacConnectionPresetId =
  | 'helios_usb'
  | 'etherdream_tcp'
  | 'fb4_beyond'
  | 'generic_ilda_udp'
  | 'generic_idn_udp'

export type LaserNodeConnectionPresetId =
  | 'etherdream_tcp'
  | 'generic_idn_udp'
  | 'generic_ilda_udp'
  | 'fb4_beyond'

export type LaserConnectionPresetBase = {
  id: string
  label: string
  shortHint: string
  protocol: LaserOutputProtocol
  backend: LaserDacBackend
  showTarget: boolean
  targetLabel: string
  targetPlaceholder: string
  targetTooltip: string
  showZonesButton: boolean
  showFb4Info: boolean
}

export const LASER_DAC_CONNECTION_PRESETS: (LaserConnectionPresetBase & {
  id: LaserDacConnectionPresetId
})[] = [
  {
    id: 'helios_usb',
    label: 'Helios — USB (ILDA)',
    shortHint:
      'Plug in the Helios over USB — Captivate detects it automatically (VID 1209 / PID E500).',
    protocol: 'ilda',
    backend: 'helios',
    showTarget: false,
    targetLabel: '',
    targetPlaceholder: '',
    targetTooltip: '',
    showZonesButton: true,
    showFb4Info: false,
  },
  {
    id: 'etherdream_tcp',
    label: 'Ether Dream — network (ILDA)',
    shortHint: 'Ether Dream over TCP. Enter host/IP or Auto discover on the LAN.',
    protocol: 'ilda',
    backend: 'etherdream',
    showTarget: true,
    targetLabel: 'Host',
    targetPlaceholder: 'Auto discover or 192.168.x.x',
    targetTooltip:
      'IP address or hostname of the Ether Dream. Auto discover scans the local network.',
    showZonesButton: true,
    showFb4Info: false,
  },
  {
    id: 'fb4_beyond',
    label: 'Pangolin FB4 — BEYOND (Windows)',
    shortHint:
      'Requires Pangolin BEYOND running and BEYONDIO.dll. Each Captivate zone maps to a BEYOND zone.',
    protocol: 'ilda',
    backend: 'fb4',
    showTarget: true,
    targetLabel: 'BEYONDIO.dll',
    targetPlaceholder: 'Optional — full path or leave empty',
    targetTooltip:
      'Path to BEYONDIO.dll from your BEYOND install. Empty searches Program Files and CAPTIVATE_BEYOND_SDK_DLL.',
    showZonesButton: true,
    showFb4Info: true,
  },
  {
    id: 'generic_ilda_udp',
    label: 'Generic ILDA — UDP bridge',
    shortHint: 'Development / custom ILDA UDP bridge on port 40200.',
    protocol: 'ilda',
    backend: 'generic',
    showTarget: true,
    targetLabel: 'Host',
    targetPlaceholder: '127.0.0.1 or host:port',
    targetTooltip: 'UDP destination for the Captivate ILDA dev bridge (default port 40200).',
    showZonesButton: true,
    showFb4Info: false,
  },
  {
    id: 'generic_idn_udp',
    label: 'Generic IDN — UDP bridge',
    shortHint: 'ILDA Digital Network over UDP (port 40201) for IDN-capable hardware.',
    protocol: 'idn',
    backend: 'generic',
    showTarget: true,
    targetLabel: 'Host / URL',
    targetPlaceholder: 'Host, IP, or idn:// URL',
    targetTooltip: 'Network endpoint for IDN streaming (UDP bridge or compatible receiver).',
    showZonesButton: true,
    showFb4Info: false,
  },
]

export const LASER_NODE_CONNECTION_PRESETS: (LaserConnectionPresetBase & {
  id: LaserNodeConnectionPresetId
})[] = [
  {
    id: 'etherdream_tcp',
    label: 'Ether Dream — network',
    shortHint: 'One Ether Dream per node session.',
    protocol: 'ilda',
    backend: 'etherdream',
    showTarget: true,
    targetLabel: 'Host',
    targetPlaceholder: 'Auto discover or IP',
    targetTooltip: 'Ether Dream IP or hostname for this node.',
    showZonesButton: false,
    showFb4Info: false,
  },
  {
    id: 'generic_idn_udp',
    label: 'Generic IDN — UDP',
    shortHint: 'IDN endpoint for a single remote laser.',
    protocol: 'idn',
    backend: 'generic',
    showTarget: true,
    targetLabel: 'Host / URL',
    targetPlaceholder: 'Host or idn:// URL',
    targetTooltip: 'IDN destination for this node.',
    showZonesButton: false,
    showFb4Info: false,
  },
  {
    id: 'generic_ilda_udp',
    label: 'Generic ILDA — UDP',
    shortHint: 'ILDA UDP bridge for one endpoint.',
    protocol: 'ilda',
    backend: 'generic',
    showTarget: true,
    targetLabel: 'Host',
    targetPlaceholder: '127.0.0.1',
    targetTooltip: 'UDP host for ILDA bridge output.',
    showZonesButton: false,
    showFb4Info: false,
  },
  {
    id: 'fb4_beyond',
    label: 'Pangolin FB4 — BEYOND',
    shortHint: 'FB4 via BEYOND (Windows). Prefer the main DAC profile for multi-zone FB4.',
    protocol: 'ilda',
    backend: 'fb4',
    showTarget: true,
    targetLabel: 'BEYONDIO.dll',
    targetPlaceholder: 'Optional DLL path',
    targetTooltip: 'Same as main FB4 profile — BEYOND must be running.',
    showZonesButton: false,
    showFb4Info: true,
  },
]

function matchPreset<
  T extends { id: string; protocol: LaserOutputProtocol; backend: LaserDacBackend },
>(
  presets: T[],
  protocol: LaserOutputProtocol,
  backend: LaserDacBackend
): T {
  return (
    presets.find((p) => p.protocol === protocol && p.backend === backend) ??
    presets[0]!
  )
}

export function dacPresetFromProfile(profile: {
  outputProtocol: LaserOutputProtocol
  backend: LaserDacBackend
}): LaserConnectionPresetBase & { id: LaserDacConnectionPresetId } {
  return matchPreset(LASER_DAC_CONNECTION_PRESETS, profile.outputProtocol, profile.backend)
}

export function nodePresetFromNode(node: {
  outputProtocol: LaserOutputProtocol
  backend: LaserDacBackend
}): LaserConnectionPresetBase & { id: LaserNodeConnectionPresetId } {
  return matchPreset(LASER_NODE_CONNECTION_PRESETS, node.outputProtocol, node.backend)
}

export function dacPresetById(
  id: LaserDacConnectionPresetId
): (typeof LASER_DAC_CONNECTION_PRESETS)[number] {
  return LASER_DAC_CONNECTION_PRESETS.find((p) => p.id === id) ?? LASER_DAC_CONNECTION_PRESETS[0]!
}

export function nodePresetById(
  id: LaserNodeConnectionPresetId
): (typeof LASER_NODE_CONNECTION_PRESETS)[number] {
  return LASER_NODE_CONNECTION_PRESETS.find((p) => p.id === id) ?? LASER_NODE_CONNECTION_PRESETS[0]!
}
