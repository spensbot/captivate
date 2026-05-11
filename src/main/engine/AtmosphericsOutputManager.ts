import { CleanReduxState } from '../../renderer/redux/store'
import { SplitState } from '../../renderer/redux/realtimeStore'
import { TimeState } from '../../shared/TimeState'
import { AudioEngineMetrics } from '../../shared/audioEngine'
import {
  ATMOSPHERICS_DEFAULT_GROUP,
  ATMOSPHERICS_SPLIT_LEVEL_PARAM,
  ATMOSPHERICS_SPLIT_TRIGGER_PARAM,
  AtmosLevelChConfig,
  AtmosRunState,
  AtmosTrigChConfig,
  initAtmosFxtrControlConfig,
  initAtmosLevelChConfig,
  initAtmosRunState,
  initAtmosTriggerChConfig,
  normAtmosSettings,
} from '../../shared/atmospherics'
import { listAtmosFxtrs } from '../../shared/atmosphericsMapping'

type TriggerRuntime = {
  wasAbove: boolean
  latchOn: boolean
  pendingUntilMs: number | null
  pendingManual: boolean
  pulseUntilMs: number | null
  intervalActive: boolean
  intervalManualMode: boolean
  lastIntervalStartMs: number
  lastManualNonce: number
}

function clampNormalized(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function clampByte(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(255, Math.round(value)))
}

function ensureUniverseBuffer(dmxOutByUniverse: number[][], universeOneBased: number) {
  const index = Math.max(0, Math.round(universeOneBased) - 1)
  while (dmxOutByUniverse.length <= index) {
    dmxOutByUniverse.push(Array(512).fill(0))
  }
  if (!Array.isArray(dmxOutByUniverse[index]) || dmxOutByUniverse[index].length < 512) {
    dmxOutByUniverse[index] = Array(512).fill(0)
  }
  return dmxOutByUniverse[index]
}

function writeChannelMax(buffer: number[], channelOneBased: number, value: number) {
  const idx = Math.max(1, Math.min(512, Math.round(channelOneBased))) - 1
  buffer[idx] = Math.max(Number(buffer[idx]) || 0, value)
}

function getOrCreateRuntime(
  stateByChannelKey: Map<string, TriggerRuntime>,
  channelKey: string
): TriggerRuntime {
  const existing = stateByChannelKey.get(channelKey)
  if (existing !== undefined) {
    return existing
  }
  const created: TriggerRuntime = {
    wasAbove: false,
    latchOn: false,
    pendingUntilMs: null,
    pendingManual: false,
    pulseUntilMs: null,
    intervalActive: false,
    intervalManualMode: false,
    lastIntervalStartMs: 0,
    lastManualNonce: 0,
  }
  stateByChannelKey.set(channelKey, created)
  return created
}

function isLikelyPyroFixture(name: string) {
  const lower = name.toLowerCase()
  return lower.includes('flame') || lower.includes('spark') || lower.includes('pyro')
}

function readSplitLiveParam(
  splitStates: SplitState[],
  splitIndex: number,
  param: string,
  fallback: number
) {
  const value = Number(splitStates[splitIndex]?.outputParams?.[param])
  if (!Number.isFinite(value)) {
    return clampNormalized(fallback)
  }
  return clampNormalized(value)
}

function readSplitBaseParam(
  controlState: CleanReduxState,
  splitIndex: number,
  param: string,
  fallback: number
) {
  const scene = controlState.control.light.byId[controlState.control.light.active]
  const value = Number(scene?.splitScenes?.[splitIndex]?.baseParams?.[param])
  if (!Number.isFinite(value)) {
    return clampNormalized(fallback)
  }
  return clampNormalized(value)
}

function findSplitIndexForGroup(controlState: CleanReduxState, groupName: string) {
  const scene = controlState.control.light.byId[controlState.control.light.active]
  if (scene === undefined) return -1
  const normalized = groupName.trim()
  if (normalized.length <= 0) return -1
  return scene.splitScenes.findIndex((split) => split.groups?.[normalized] === true)
}

function resolveTriggerConfig(
  config: ReturnType<typeof initAtmosFxtrControlConfig>,
  channelNumber: number
): AtmosTrigChConfig {
  const explicit = config.triggerChannels[channelNumber]
  if (explicit !== undefined) {
    return explicit
  }
  return initAtmosTriggerChConfig(channelNumber)
}

function resolveLevelConfig(
  config: ReturnType<typeof initAtmosFxtrControlConfig>,
  channelNumber: number
): AtmosLevelChConfig {
  const explicit = config.levelChannels[channelNumber]
  if (explicit !== undefined) {
    return explicit
  }
  return initAtmosLevelChConfig(channelNumber)
}

export default class AtmosphericsOutputManager {
  private runtimeState: AtmosRunState = initAtmosRunState()
  private triggerRuntimeByChannelKey = new Map<string, TriggerRuntime>()

  getRuntimeState() {
    return this.runtimeState
  }

  apply(
    controlState: CleanReduxState,
    splitStates: SplitState[],
    _timeState: TimeState,
    _audioMetrics: AudioEngineMetrics,
    dmxOutByUniverse: number[][]
  ) {
    const settings = normAtmosSettings(
      controlState.control.device.connectionSettings.atmos
    )
    const descriptors = listAtmosFxtrs(controlState.dmx)
    const nowMs = Date.now()
    const messages: string[] = []

    const inactiveReason: string | null =
      settings.emergencyStop === true
        ? 'emergency stop'
        : settings.enabled !== true || settings.armed !== true
          ? 'system inactive'
          : null
    const engineActive = inactiveReason === null
    if (!settings.enabled) messages.push('Atmospherics disabled')
    if (!settings.armed) messages.push('Atmospherics not armed')
    if (settings.emergencyStop) messages.push('Emergency stop latched')

    const runtimeFixtures = descriptors.map((descriptor) => {
      const config =
        settings.fixtures[descriptor.fixtureId] ??
        initAtmosFxtrControlConfig(descriptor.fixtureId)

      const preferredGroup = config.groupName.trim()
      const descriptorDefaultGroup =
        descriptor.groups.find((group) => group.trim().length > 0) ??
        ATMOSPHERICS_DEFAULT_GROUP
      const groupName =
        preferredGroup.length > 0 ? preferredGroup : descriptorDefaultGroup

      let splitIndex = findSplitIndexForGroup(controlState, groupName)
      if (splitIndex < 0 && groupName !== ATMOSPHERICS_DEFAULT_GROUP) {
        splitIndex = findSplitIndexForGroup(controlState, ATMOSPHERICS_DEFAULT_GROUP)
      }
      if (splitIndex < 0) {
        splitIndex = 0
      }

      const groupLiveTrigger =
        readSplitLiveParam(
          splitStates,
          splitIndex,
          ATMOSPHERICS_SPLIT_TRIGGER_PARAM,
          config.threshold
        ) * settings.globalLevelLimit
      const groupThreshold = readSplitBaseParam(
        controlState,
        splitIndex,
        ATMOSPHERICS_SPLIT_TRIGGER_PARAM,
        config.threshold
      )
      const groupLiveLevel =
        readSplitLiveParam(
          splitStates,
          splitIndex,
          ATMOSPHERICS_SPLIT_LEVEL_PARAM,
          1
        ) * settings.globalLevelLimit

      let blockedReason: string | null = null
      if (!engineActive) {
        blockedReason = inactiveReason
      } else if (config.enabled !== true) {
        blockedReason = 'fixture disabled'
      } else if (!settings.allowPyro && isLikelyPyroFixture(descriptor.fixtureName)) {
        blockedReason = 'pyro disabled'
      }

      const manualNonce =
        controlState.gui.atmosManualTriggerNonceByFixtureId[descriptor.fixtureId] ?? 0

      const universeBuffer = ensureUniverseBuffer(dmxOutByUniverse, descriptor.universe)
      const triggerChannelRuntimeRows: Array<{
        channelNumber: number
        name: string
        sourceLiveValue: number
        threshold: number
        crossed: boolean
        action: 'momentary' | 'latching' | 'interval'
        triggerOutputActive: boolean
        pendingDelayMs: number
        intervalActive: boolean
        blockedReason: string | null
        useGroupThreshold: boolean
        groupThreshold: number
      }> = []

      descriptor.triggerChannels.forEach((triggerChannel) => {
        const channelConfig = resolveTriggerConfig(config, triggerChannel.channel)
        const sourceLiveValue = groupLiveTrigger
        const threshold = channelConfig.useGroupThreshold
          ? groupThreshold
          : clampNormalized(channelConfig.threshold)
        const channelKey = `${descriptor.fixtureId}:${triggerChannel.channel}`
        const runtimeTrigger = getOrCreateRuntime(this.triggerRuntimeByChannelKey, channelKey)

        if (blockedReason !== null) {
          runtimeTrigger.wasAbove = false
          runtimeTrigger.latchOn = false
          runtimeTrigger.pendingUntilMs = null
          runtimeTrigger.pendingManual = false
          runtimeTrigger.pulseUntilMs = null
          runtimeTrigger.intervalActive = false
          runtimeTrigger.intervalManualMode = false
          runtimeTrigger.lastIntervalStartMs = 0
        }

        const above = sourceLiveValue >= threshold
        const crossed = !runtimeTrigger.wasAbove && above
        runtimeTrigger.wasAbove = above

        const manualTriggered = manualNonce !== runtimeTrigger.lastManualNonce
        runtimeTrigger.lastManualNonce = manualNonce

        const shouldFire = blockedReason === null && (crossed || manualTriggered)
        if (shouldFire) {
          const isManual = manualTriggered
          const delayMs = isManual ? channelConfig.manualDelayMs : channelConfig.delayMs
          runtimeTrigger.pendingUntilMs = nowMs + Math.max(0, delayMs)
          runtimeTrigger.pendingManual = isManual
        }

        if (runtimeTrigger.pendingUntilMs !== null && nowMs >= runtimeTrigger.pendingUntilMs) {
          const pendingWasManual = runtimeTrigger.pendingManual
          runtimeTrigger.pendingUntilMs = null
          runtimeTrigger.pendingManual = false
          if (channelConfig.triggerAction === 'latching') {
            runtimeTrigger.latchOn = !runtimeTrigger.latchOn
          } else if (channelConfig.triggerAction === 'interval') {
            if (
              pendingWasManual &&
              runtimeTrigger.intervalActive &&
              runtimeTrigger.intervalManualMode
            ) {
              runtimeTrigger.intervalActive = false
              runtimeTrigger.intervalManualMode = false
              runtimeTrigger.pulseUntilMs = null
            } else {
              runtimeTrigger.intervalActive = true
              runtimeTrigger.intervalManualMode = pendingWasManual
              runtimeTrigger.lastIntervalStartMs = nowMs
              runtimeTrigger.pulseUntilMs = nowMs + channelConfig.pulseMs
            }
          } else {
            runtimeTrigger.pulseUntilMs = nowMs + channelConfig.pulseMs
          }
        }

        if (runtimeTrigger.pulseUntilMs !== null && nowMs >= runtimeTrigger.pulseUntilMs) {
          runtimeTrigger.pulseUntilMs = null
        }

        if (channelConfig.triggerAction === 'interval' && runtimeTrigger.intervalActive) {
          const intervalMs = Math.max(
            10,
            runtimeTrigger.intervalManualMode
              ? channelConfig.manualIntervalMs
              : channelConfig.intervalMs
          )
          if (nowMs - runtimeTrigger.lastIntervalStartMs >= intervalMs) {
            runtimeTrigger.lastIntervalStartMs = nowMs
            runtimeTrigger.pulseUntilMs = nowMs + channelConfig.pulseMs
          }
          if (!runtimeTrigger.intervalManualMode && !above && !manualTriggered && !crossed) {
            runtimeTrigger.intervalActive = false
            runtimeTrigger.intervalManualMode = false
            runtimeTrigger.pulseUntilMs = null
          }
        }

        const triggerOutputActive =
          blockedReason === null &&
          (runtimeTrigger.latchOn === true ||
            runtimeTrigger.pulseUntilMs !== null ||
            runtimeTrigger.intervalActive)

        writeChannelMax(
          universeBuffer,
          triggerChannel.channel,
          triggerOutputActive ? triggerChannel.on : triggerChannel.off
        )

        triggerChannelRuntimeRows.push({
          channelNumber: triggerChannel.channel,
          name: triggerChannel.name,
          sourceLiveValue,
          threshold,
          crossed,
          action: channelConfig.triggerAction,
          triggerOutputActive,
          pendingDelayMs:
            runtimeTrigger.pendingUntilMs !== null
              ? Math.max(0, runtimeTrigger.pendingUntilMs - nowMs)
              : 0,
          intervalActive: runtimeTrigger.intervalActive,
          blockedReason,
          useGroupThreshold: channelConfig.useGroupThreshold,
          groupThreshold,
        })
      })

      const levelChannelRuntimeRows: Array<{
        channelNumber: number
        name: string
        sourceValue: number
        controlMode: 'split' | 'manual'
      }> = []
      descriptor.auxChannels.forEach((levelChannel) => {
        const levelConfig = resolveLevelConfig(config, levelChannel.channel)
        const sourceValueRaw =
          levelConfig.controlMode === 'manual'
            ? levelConfig.manualValue
            : groupLiveLevel
        const sourceValue = clampNormalized(sourceValueRaw)
        const dmx = clampByte(
          levelChannel.min + (levelChannel.max - levelChannel.min) * sourceValue
        )
        const fallbackDmx = clampByte(levelChannel.defaultValue)
        writeChannelMax(
          universeBuffer,
          levelChannel.channel,
          blockedReason === null ? dmx : fallbackDmx
        )
        levelChannelRuntimeRows.push({
          channelNumber: levelChannel.channel,
          name: levelChannel.name,
          sourceValue,
          controlMode: levelConfig.controlMode,
        })
      })

      const firstTriggerRuntime = triggerChannelRuntimeRows[0]
      const triggerOutputActive = triggerChannelRuntimeRows.some(
        (runtime) => runtime.triggerOutputActive
      )

      return {
        fixtureId: descriptor.fixtureId,
        fixtureName: descriptor.fixtureName,
        universe: descriptor.universe,
        groupName,
        sourceLiveValue: firstTriggerRuntime?.sourceLiveValue ?? groupLiveTrigger,
        threshold: firstTriggerRuntime?.threshold ?? groupThreshold,
        crossed: firstTriggerRuntime?.crossed ?? false,
        action: firstTriggerRuntime?.action ?? 'momentary',
        triggerOutputActive,
        pendingDelayMs: Math.max(
          0,
          ...triggerChannelRuntimeRows.map((runtime) => runtime.pendingDelayMs)
        ),
        intervalActive: triggerChannelRuntimeRows.some((runtime) => runtime.intervalActive),
        blockedReason,
        triggerChannels: triggerChannelRuntimeRows,
        levelChannels: levelChannelRuntimeRows,
      }
    })

    const active = runtimeFixtures.some((fixture) => fixture.triggerOutputActive)
    this.runtimeState = {
      enabled: settings.enabled,
      armed: settings.armed,
      emergencyStop: settings.emergencyStop,
      active,
      messages,
      fixtures: runtimeFixtures,
      updatedAtMs: nowMs,
    }
    return this.runtimeState
  }
}
