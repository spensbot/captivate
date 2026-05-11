import { clampNormalized } from '../math/util'
import { DMX_MAX_UNIVERSES, DMX_NUM_CHANNELS } from './dmxFixtures'
import { DefaultParam } from './params'

export type AtmosSrcMode = 'manual' | 'split' | 'lfo'
export type AtmosTrigAction = 'momentary' | 'latching' | 'interval'
export type AtmosLevelMode = 'split' | 'manual'

export const ATMOSPHERICS_DEFAULT_GROUP = 'Atmosphere'
export const ATMOSPHERICS_SPLIT_TRIGGER_PARAM = 'atmosFxtrOnOff'
export const ATMOSPHERICS_SPLIT_LEVEL_PARAM = 'atmosFxtrLevel'

export interface AtmosSrcRoute {
  mode: AtmosSrcMode
  manualValue: number
  splitIndex: number
  param: DefaultParam | string
  lfoIndex: number
  gain: number
  offset: number
  invert: boolean
}

export interface AtmosTrigChConfig {
  channelNumber: number
  useGroupThreshold: boolean
  threshold: number
  triggerAction: AtmosTrigAction
  delayMs: number
  intervalMs: number
  pulseMs: number
  manualDelayMs: number
  manualIntervalMs: number
}

export interface AtmosLevelChConfig {
  channelNumber: number
  controlMode: AtmosLevelMode
  manualValue: number
}

export interface AtmosFxtrConfig {
  fixtureId: string
  enabled: boolean
  groupName: string
  triggerChannels: {
    [channelNumber: number]: AtmosTrigChConfig | undefined
  }
  levelChannels: {
    [channelNumber: number]: AtmosLevelChConfig | undefined
  }

  // Legacy fields kept for old save compatibility.
  threshold: number
  hysteresis: number
  source: AtmosSrcRoute
  triggerAction: AtmosTrigAction
  delayMs: number
  intervalMs: number
  pulseMs: number
  manualDelayMs: number
  manualIntervalMs: number
  auxChannels: {
    [channelNumber: number]: AtmosSrcRoute | undefined
  }
}

export interface AtmosSettings {
  enabled: boolean
  armed: boolean
  emergencyStop: boolean
  allowPyro: boolean
  globalLevelLimit: number
  selectedFixtureId: string | null
  fixtures: {
    [fixtureId: string]: AtmosFxtrConfig | undefined
  }
}

export interface AtmosRunFxtrState {
  fixtureId: string
  fixtureName: string
  universe: number
  groupName: string
  sourceLiveValue: number
  threshold: number
  crossed: boolean
  action: AtmosTrigAction
  triggerOutputActive: boolean
  pendingDelayMs: number
  intervalActive: boolean
  blockedReason: string | null
  triggerChannels: Array<{
    channelNumber: number
    name: string
    sourceLiveValue: number
    threshold: number
    crossed: boolean
    action: AtmosTrigAction
    triggerOutputActive: boolean
    pendingDelayMs: number
    intervalActive: boolean
    blockedReason: string | null
    useGroupThreshold: boolean
    groupThreshold: number
  }>
  levelChannels: Array<{
    channelNumber: number
    name: string
    sourceValue: number
    controlMode: AtmosLevelMode
  }>
}

export interface AtmosRunState {
  enabled: boolean
  armed: boolean
  emergencyStop: boolean
  active: boolean
  messages: string[]
  fixtures: AtmosRunFxtrState[]
  updatedAtMs: number
}

function clampByteValue(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(0, Math.min(255, Math.round(value)))
}

function clampUniverse(value: number, fallback = 1) {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(1, Math.min(DMX_MAX_UNIVERSES, Math.round(value)))
}

function clampChannel(value: number, fallback = 1) {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(1, Math.min(DMX_NUM_CHANNELS, Math.round(value)))
}

function clampSigned(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(min, Math.min(max, value))
}

function normalizeSourceMode(value: unknown): AtmosSrcMode {
  return value === 'split' || value === 'lfo' ? value : 'manual'
}

function normalizeLevelControlMode(value: unknown): AtmosLevelMode {
  return value === 'manual' ? 'manual' : 'split'
}

export function initAtmosSrcRoute(
  mode: AtmosSrcMode = 'manual'
): AtmosSrcRoute {
  return {
    mode,
    manualValue: 0,
    splitIndex: 0,
    param: 'intensity',
    lfoIndex: 0,
    gain: 1,
    offset: 0,
    invert: false,
  }
}

export function normAtmosSrcRoute(raw: unknown): AtmosSrcRoute {
  const source = (raw !== null && typeof raw === 'object'
    ? raw
    : {}) as Partial<AtmosSrcRoute>
  const defaults = initAtmosSrcRoute()
  return {
    mode: normalizeSourceMode(source.mode),
    manualValue: clampNormalized(Number(source.manualValue ?? defaults.manualValue)),
    splitIndex: Math.max(0, Math.round(Number(source.splitIndex ?? defaults.splitIndex) || 0)),
    param:
      typeof source.param === 'string' && source.param.trim().length > 0
        ? source.param.trim()
        : defaults.param,
    lfoIndex: Math.max(0, Math.round(Number(source.lfoIndex ?? defaults.lfoIndex) || 0)),
    gain: clampSigned(Number(source.gain), -4, 4, defaults.gain),
    offset: clampSigned(Number(source.offset), -1, 1, defaults.offset),
    invert: source.invert === true,
  }
}

export function initAtmosTriggerChConfig(
  channelNumber: number
): AtmosTrigChConfig {
  return {
    channelNumber: clampChannel(channelNumber, 1),
    useGroupThreshold: true,
    threshold: 0.5,
    triggerAction: 'momentary',
    delayMs: 0,
    intervalMs: 500,
    pulseMs: 150,
    manualDelayMs: 0,
    manualIntervalMs: 500,
  }
}

export function normAtmosTriggerChConfig(
  raw: unknown,
  channelNumberFallback: number
): AtmosTrigChConfig {
  const source = (raw !== null && typeof raw === 'object'
    ? raw
    : {}) as Partial<AtmosTrigChConfig>
  const defaults = initAtmosTriggerChConfig(channelNumberFallback)
  const triggerAction: AtmosTrigAction =
    source.triggerAction === 'latching' || source.triggerAction === 'interval'
      ? source.triggerAction
      : defaults.triggerAction
  return {
    channelNumber: clampChannel(
      Number(source.channelNumber ?? defaults.channelNumber),
      defaults.channelNumber
    ),
    useGroupThreshold: source.useGroupThreshold !== false,
    threshold: clampNormalized(Number(source.threshold ?? defaults.threshold)),
    triggerAction,
    delayMs: Math.max(0, Math.min(600000, Math.round(Number(source.delayMs ?? defaults.delayMs) || 0))),
    intervalMs: Math.max(
      10,
      Math.min(600000, Math.round(Number(source.intervalMs ?? defaults.intervalMs) || 10))
    ),
    pulseMs: Math.max(10, Math.min(600000, Math.round(Number(source.pulseMs ?? defaults.pulseMs) || 10))),
    manualDelayMs: Math.max(
      0,
      Math.min(600000, Math.round(Number(source.manualDelayMs ?? defaults.manualDelayMs) || 0))
    ),
    manualIntervalMs: Math.max(
      10,
      Math.min(
        600000,
        Math.round(Number(source.manualIntervalMs ?? defaults.manualIntervalMs) || 10)
      )
    ),
  }
}

export function initAtmosLevelChConfig(
  channelNumber: number
): AtmosLevelChConfig {
  return {
    channelNumber: clampChannel(channelNumber, 1),
    controlMode: 'split',
    manualValue: 0,
  }
}

export function normAtmosLevelChConfig(
  raw: unknown,
  channelNumberFallback: number
): AtmosLevelChConfig {
  const source = (raw !== null && typeof raw === 'object'
    ? raw
    : {}) as Partial<AtmosLevelChConfig>
  const defaults = initAtmosLevelChConfig(channelNumberFallback)
  return {
    channelNumber: clampChannel(
      Number(source.channelNumber ?? defaults.channelNumber),
      defaults.channelNumber
    ),
    controlMode: normalizeLevelControlMode(source.controlMode),
    manualValue: clampNormalized(Number(source.manualValue ?? defaults.manualValue)),
  }
}

export function initAtmosFxtrControlConfig(
  fixtureId: string
): AtmosFxtrConfig {
  return {
    fixtureId,
    enabled: true,
    groupName: ATMOSPHERICS_DEFAULT_GROUP,
    triggerChannels: {},
    levelChannels: {},
    threshold: 0.5,
    hysteresis: 0.05,
    source: initAtmosSrcRoute('split'),
    triggerAction: 'momentary',
    delayMs: 0,
    intervalMs: 500,
    pulseMs: 150,
    manualDelayMs: 0,
    manualIntervalMs: 500,
    auxChannels: {},
  }
}

export function normAtmosFxtrControlConfig(
  raw: unknown,
  fixtureIdFallback: string
): AtmosFxtrConfig {
  const source = (raw !== null && typeof raw === 'object'
    ? raw
    : {}) as Partial<AtmosFxtrConfig>
  const defaults = initAtmosFxtrControlConfig(fixtureIdFallback)

  const triggerAction: AtmosTrigAction =
    source.triggerAction === 'latching' || source.triggerAction === 'interval'
      ? source.triggerAction
      : 'momentary'
  const auxChannelsRaw =
    source.auxChannels !== null && typeof source.auxChannels === 'object'
      ? (source.auxChannels as { [channel: number]: unknown })
      : {}
  const auxChannels: AtmosFxtrConfig['auxChannels'] = {}
  for (const [channelKey, routing] of Object.entries(auxChannelsRaw)) {
    const channel = clampChannel(Number(channelKey), -1)
    if (channel <= 0) continue
    auxChannels[channel] = normAtmosSrcRoute(routing)
  }

  const triggerChannelsRaw =
    source.triggerChannels !== null && typeof source.triggerChannels === 'object'
      ? (source.triggerChannels as { [channel: number]: unknown })
      : {}
  const triggerChannels: AtmosFxtrConfig['triggerChannels'] = {}
  for (const [channelKey, trigger] of Object.entries(triggerChannelsRaw)) {
    const channel = clampChannel(Number(channelKey), -1)
    if (channel <= 0) continue
    triggerChannels[channel] = normAtmosTriggerChConfig(trigger, channel)
  }

  const levelChannelsRaw =
    source.levelChannels !== null && typeof source.levelChannels === 'object'
      ? (source.levelChannels as { [channel: number]: unknown })
      : {}
  const levelChannels: AtmosFxtrConfig['levelChannels'] = {}
  for (const [channelKey, level] of Object.entries(levelChannelsRaw)) {
    const channel = clampChannel(Number(channelKey), -1)
    if (channel <= 0) continue
    levelChannels[channel] = normAtmosLevelChConfig(level, channel)
  }

  return {
    fixtureId:
      typeof source.fixtureId === 'string' && source.fixtureId.trim().length > 0
        ? source.fixtureId.trim()
        : defaults.fixtureId,
    enabled: source.enabled !== false,
    groupName:
      typeof source.groupName === 'string' && source.groupName.trim().length > 0
        ? source.groupName.trim()
        : defaults.groupName,
    triggerChannels,
    levelChannels,
    threshold: clampNormalized(Number(source.threshold ?? defaults.threshold)),
    hysteresis: clampSigned(Number(source.hysteresis), 0, 0.5, defaults.hysteresis),
    source: normAtmosSrcRoute(source.source),
    triggerAction,
    delayMs: Math.max(0, Math.min(600000, Math.round(Number(source.delayMs ?? defaults.delayMs) || 0))),
    intervalMs: Math.max(
      10,
      Math.min(600000, Math.round(Number(source.intervalMs ?? defaults.intervalMs) || 10))
    ),
    pulseMs: Math.max(10, Math.min(600000, Math.round(Number(source.pulseMs ?? defaults.pulseMs) || 10))),
    manualDelayMs: Math.max(
      0,
      Math.min(600000, Math.round(Number(source.manualDelayMs ?? defaults.manualDelayMs) || 0))
    ),
    manualIntervalMs: Math.max(
      10,
      Math.min(
        600000,
        Math.round(Number(source.manualIntervalMs ?? defaults.manualIntervalMs) || 10)
      )
    ),
    auxChannels,
  }
}

export function initAtmosSettings(): AtmosSettings {
  return {
    enabled: false,
    armed: false,
    emergencyStop: false,
    allowPyro: false,
    globalLevelLimit: 1,
    selectedFixtureId: null,
    fixtures: {},
  }
}

export function normAtmosSettings(raw: unknown): AtmosSettings {
  const source = (raw !== null && typeof raw === 'object'
    ? raw
    : {}) as Partial<AtmosSettings>
  const defaults = initAtmosSettings()
  const fixturesSource =
    source.fixtures !== null && typeof source.fixtures === 'object'
      ? (source.fixtures as { [fixtureId: string]: unknown })
      : {}
  const fixtures: AtmosSettings['fixtures'] = {}
  for (const [fixtureId, config] of Object.entries(fixturesSource)) {
    if (typeof fixtureId !== 'string' || fixtureId.trim().length <= 0) continue
    fixtures[fixtureId] = normAtmosFxtrControlConfig(config, fixtureId)
  }

  return {
    enabled: source.enabled === true,
    armed: source.armed === true,
    emergencyStop: source.emergencyStop === true,
    allowPyro: source.allowPyro === true,
    globalLevelLimit: clampNormalized(Number(source.globalLevelLimit ?? defaults.globalLevelLimit)),
    selectedFixtureId:
      typeof source.selectedFixtureId === 'string' &&
      source.selectedFixtureId.trim().length > 0
        ? source.selectedFixtureId
        : defaults.selectedFixtureId,
    fixtures,
  }
}

export function initAtmosRunState(): AtmosRunState {
  return {
    enabled: false,
    armed: false,
    emergencyStop: false,
    active: false,
    messages: [],
    fixtures: [],
    updatedAtMs: 0,
  }
}

export interface AtmosFxtrDesc {
  fixtureId: string
  fixtureName: string
  universe: number
  groups: string[]
  triggerChannels: Array<{
    channel: number
    name: string
    off: number
    on: number
  }>
  auxChannels: Array<{
    channel: number
    name: string
    min: number
    max: number
    defaultValue: number
  }>
}

export function normAtmosFxtrDesc(
  raw: AtmosFxtrDesc
): AtmosFxtrDesc {
  return {
    fixtureId: raw.fixtureId.trim(),
    fixtureName: raw.fixtureName.trim(),
    universe: clampUniverse(raw.universe, 1),
    groups:
      Array.isArray(raw.groups) && raw.groups.length > 0
        ? Array.from(
            new Set(
              raw.groups
                .map((group) => group.trim())
                .filter((group) => group.length > 0)
            )
          )
        : [ATMOSPHERICS_DEFAULT_GROUP],
    triggerChannels: raw.triggerChannels.map((trigger) => ({
      channel: clampChannel(trigger.channel, 1),
      name: trigger.name.trim().length > 0 ? trigger.name.trim() : 'Trigger',
      off: clampByteValue(trigger.off, 0),
      on: clampByteValue(trigger.on, 255),
    })),
    auxChannels: raw.auxChannels.map((aux) => ({
      channel: clampChannel(aux.channel, 1),
      name: aux.name.trim().length > 0 ? aux.name.trim() : 'Aux',
      min: clampByteValue(aux.min, 0),
      max: clampByteValue(aux.max, 255),
      defaultValue: clampByteValue(aux.defaultValue, 0),
    })),
  }
}
