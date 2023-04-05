import {
  DmxValue,
  DMX_MAX_VALUE,
  FixtureChannel,
  DMX_DEFAULT_VALUE,
  AxisDir,
  DMX_MIN_VALUE,
  FlattenedFixture,
  GetFixturePayload,
  ChannelType,
} from '../shared/dmxFixtures'
import { Params } from '../../params/shared/params'
import { Normalized } from '../../utils/math/util'
import { rLerp } from '../../utils/math/range'

import { applyMirror } from '../shared/dmxUtil'
import { ChannelConfig, channelConfig } from '../channel.config'
import { getMovingWindow } from 'features/params/engine'

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

export function calculate_axis_channel(
  ch: GetFixturePayload<'axis'>,
  axis_param: Normalized | undefined,
  fixture_position: Normalized | undefined,
  mirror_param: Normalized | undefined,
  fixture: FlattenedFixture
) {
  if (axis_param === undefined) return 0

  let mirrored_param =
    fixture_position && fixture_position > 0.5
      ? applyMirror(axis_param, mirror_param)
      : axis_param

  if (ch.isFine) {
    const step_count = axis_range(fixture, ch.dir)
    const step_delta = 1 / step_count
    let remainder = mirrored_param % step_delta
    let remainder_ratio = remainder / step_delta
    return remainder_ratio * DMX_MAX_VALUE
  } else {
    return Math.floor(rLerp(ch, mirrored_param))
  }
}

function axis_range(fixture: FlattenedFixture, dir: AxisDir) {
  for (const [_channel_num, ch] of fixture.channels) {
    if (ch.type === 'axis' && ch.dir === dir && !ch.isFine)
      return ch.max - ch.min
  }
  return DMX_MAX_VALUE - DMX_MIN_VALUE
}
