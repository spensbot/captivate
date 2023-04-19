import {
  DMX_MAX_VALUE,
  DMX_DEFAULT_VALUE,
  DMX_NUM_CHANNELS,
  FlattenedFixture,
  FixtureChannel,
  DmxValue,
  ChannelType,
} from '../shared/dmxFixtures'
import { Params } from '../../params/shared/params'
import { RandomizerState } from '../../bpm/shared/randomizer'
import { CleanReduxState } from '../../../renderer/redux/store'
import { getFixturesInGroups, flatten_fixtures } from '../shared/dmxUtil'
import { indexArray, zip } from '../../utils/util'
import { SplitState } from 'renderer/redux/realtimeStore'
import { ChannelConfig, channelConfig } from '../channel.config'
import { getMovingWindow } from 'features/params/engine'

export function getChannels({ state }: { state: CleanReduxState }) {
  const universe = state.dmx.universe
  const all_fixtures = flatten_fixtures(universe, state.dmx.fixtureTypesByID)

  const channels = Array<number>(DMX_NUM_CHANNELS).fill(0)

  return {
    channels,
    all_fixtures,
  }
}

type OutChannelConfig = ReturnType<typeof getChannels>

export function getDmxValue(
  ch: FixtureChannel,
  params: Partial<Params>,
  fixture: FlattenedFixture,
  master: number,
  randomizerLevel: number
): DmxValue {
  const movingWindow = getMovingWindow(params)
  const channelTypeConfig = channelConfig[ch.type] as ChannelConfig<ChannelType>
  if (!channelTypeConfig || !channelTypeConfig.getValueFromDevice)
    return DMX_DEFAULT_VALUE

  return channelTypeConfig.getValueFromDevice({
    ch,
    fixture,
    master,
    movingWindow,
    params,
    randomizerLevel,
  })
}

export function calculateDmxOut(
  {
    state,
    splitStates,
  }: {
    state: CleanReduxState
    splitStates: SplitState[]
  },
  { all_fixtures, channels }: OutChannelConfig
) {
  const scenes = state.control.light
  const activeScene = scenes.byId[scenes.active]

  const applyFixtures = (
    fixtures: FlattenedFixture[],
    outputParams: Partial<Params>,
    randomizerState: RandomizerState
  ) => {
    fixtures.forEach((fixture, i) => {
      fixture.channels.forEach(([outputChannel, channelType]) => {
        let new_channel_value = DMX_DEFAULT_VALUE
        let current_channel_value = channels[outputChannel - 1]
        if (fixture.intensity <= (outputParams.intensity ?? 1)) {
          new_channel_value = getDmxValue(
            channelType,
            outputParams,
            fixture,
            state.control.master,
            randomizerState[i]?.level ?? 1
          )
        }
        channels[outputChannel - 1] = Math.max(
          new_channel_value,
          current_channel_value
        )
      })
    })
  }

  for (const [{ outputParams, randomizer }, splitScene] of zip(
    splitStates,
    activeScene.splitScenes
  )) {
    const splitGroups = splitScene.groups

    const splitSceneFixtures = getFixturesInGroups(all_fixtures, splitGroups)

    applyFixtures(splitSceneFixtures, outputParams, randomizer)
  }

  // Apply any overwrites
  indexArray(DMX_NUM_CHANNELS).forEach((i) => {
    const overwrite = state.mixer.overwrites[i]
    if (overwrite !== undefined) {
      channels[i] = overwrite * DMX_MAX_VALUE
    }
  })
}
