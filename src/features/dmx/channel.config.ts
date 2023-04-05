import { rLerp } from 'features/utils/math/range'
import {
  DMX_DEFAULT_VALUE,
  DMX_MAX_VALUE,
  FlattenedFixture,
} from './shared/dmxFixtures'
import { DMX_MIN_VALUE } from './shared/dmxFixtures'
import { ChannelType, GetFixturePayload } from './shared/dmxFixtures'

import { findClosest } from 'features/utils/math/util'
import { getColorChannelLevel } from './shared/dmxColors'
import { StrictParams, getParam, Params } from '../params/shared/params'
import { calculate_axis_channel } from './engine/channelUtils'
import { Window2D_t } from 'features/shared/shared/window'
import { getBrightness } from 'features/params/engine'

type GetContext<Type extends ChannelType> = {
  ch: GetFixturePayload<Type>
  params: Partial<Type extends 'custom' ? Params : StrictParams>
  fixture: FlattenedFixture
  master: number
  randomizerLevel: number
  movingWindow: Window2D_t
}

export type ChannelConfig<Type extends ChannelType> = {
  /**
   * This happens on react side
   */
  default: () => Omit<GetFixturePayload<Type>, 'type'>
  /**
   * this happens on engine side
   */
  getValueFromDevice?: (ctx: GetContext<Type>) => number
}

const createChannelConfig = <
  T extends { [k in ChannelType]: ChannelConfig<k> }
>(
  config: T
) => {
  return Object.entries(config).reduce((prev, [key, config]) => {
    // @ts-ignore figure out proper typing
    prev[key as keyof T] = {
      ...config,
      default: (...args) => {
        return {
          ...config.default(...args),
          type: key,
        }
      },
    }
    return prev
    // @ts-ignore figure out proper typing
  }, {} as { [k in keyof T]: Omit<T[k], 'default'> & { default: () => GetFixturePayload<k> } })
}

/**
 * one possible issue is that engine code and renderer code might be bundled together
 * should eventually split the config between engine / react one all details on channels are consolidated
 */
export const channelConfig = createChannelConfig({
  master: {
    default: () => ({
      min: DMX_MIN_VALUE,
      max: DMX_MAX_VALUE,
      isOnOff: false,
    }),
    getValueFromDevice({
      master,
      ch,
      randomizerLevel,
      fixture,
      params,
      movingWindow,
    }) {
      const level =
        getBrightness(params, randomizerLevel, fixture.window, movingWindow) *
        master
      if (ch.isOnOff) {
        return level > 0.5 ? ch.max : ch.min
      } else {
        return rLerp(ch, level)
      }
    },
  },
  custom: {
    default: () => ({
      name: 'custom',
      default: DMX_MIN_VALUE,
      min: DMX_MIN_VALUE,
      max: DMX_MAX_VALUE,
    }),
    getValueFromDevice({ ch, params }) {
      const customParam = params[ch.name]
      if (customParam === undefined) {
        return ch.default
      } else {
        return rLerp(ch, customParam)
      }
    },
  },
  reset: {
    default: () => ({ resetVal: DMX_MAX_VALUE }),
  },
  colorMap: {
    default: () => ({
      colors: [{ max: 0, hue: 0, saturation: 1.0 }],
    }),
    getValueFromDevice({ ch, params }) {
      const _colors = ch.colors
      const hue = params.hue
      const saturation = params.saturation
      if (hue !== undefined && saturation !== undefined) {
        let closestColor = findClosest(
          _colors.map((color) => {
            return [color, color.hue, color.saturation * 2]
          }),
          hue,
          saturation * 2
        )
        return closestColor?.max ?? DMX_DEFAULT_VALUE
      } else {
        return DMX_DEFAULT_VALUE
      }
    },
  },
  axis: {
    default: () => ({
      dir: 'x',
      isFine: false,
      min: DMX_MIN_VALUE,
      max: DMX_MAX_VALUE,
    }),
    getValueFromDevice({ ch, fixture, params }) {
      if (ch.dir === 'x') {
        return calculate_axis_channel(
          ch,
          params.xAxis,
          fixture.window?.x?.pos,
          params.xMirror,
          fixture
        )
      } else {
        return calculate_axis_channel(
          ch,
          params.yAxis,
          fixture.window?.y?.pos,
          undefined, // No y-mirroring yet
          fixture
        )
      }
    },
  },
  strobe: {
    default: () => ({
      default_solid: DMX_MIN_VALUE,
      default_strobe: DMX_MAX_VALUE,
    }),
    getValueFromDevice({ ch, params }) {
      return params.strobe !== undefined && params.strobe > 0.5
        ? ch.default_strobe
        : ch.default_solid
    },
  },
  other: {
    default: () => ({
      default: DMX_MIN_VALUE,
    }),
    getValueFromDevice({ ch }) {
      return ch.default
    },
  },
  color: {
    default: () => ({
      color: {
        hue: 0,
        saturation: 1.0,
      },
    }),
    getValueFromDevice({ ch, fixture, randomizerLevel, params, movingWindow }) {
      const brightness = getBrightness(
        params,
        randomizerLevel,
        fixture.window,
        movingWindow
      )
      return (
        getColorChannelLevel(
          getParam(params, 'hue'),
          getParam(params, 'saturation'),
          brightness,
          ch.color
        ) * DMX_MAX_VALUE
      )
    },
  },
})
