import { rLerp } from 'features/utils/math/range'
import {
  AxisDir,
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
  default: (options: any) => Omit<GetFixturePayload<Type>, 'type'>
  /**
   * this happens on engine side
   */
  getValueFromDevice?: (ctx: GetContext<Type>) => number
}
// TODO: improve this typing
const createChannelConfig = () => {
  return <
    T extends {
      [k in ChannelType]: ChannelConfig<k>
    }
  >(config: {
    [k in keyof T]: k extends ChannelType ? T[k] : never
  }) => {
    return Object.entries(config).reduce((prev, [key, config]) => {
      // @ts-ignore figure out proper typing
      prev[key as ChannelType] = {
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
    }, {} as { [k in keyof T]: Omit<T[k], 'default'> & { default: (options?: Parameters<T[k]['default']>[0]) => GetFixturePayload<k> } })
  }
}

/**
 * TODO: one possible issue is that engine code and renderer code might be bundled together
 * should eventually split the config between engine / react one all details on channels are consolidated
 */
/**
 * This seems to be the conversion point between params and channel
 */

export const channelConfig = createChannelConfig()({
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
    default: ({ name = 'custom' }: { name?: string } = {}) => ({
      name,
      default: DMX_MIN_VALUE,
      isControllable: false,
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
    default: ({
      dir = 'x',
      isFine = false,
    }: { dir?: AxisDir; isFine?: boolean } = {}) => ({
      dir,
      isFine,
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
    default: ({ invert = false }: { invert?: boolean } = {}) =>
      invert
        ? {
            default_solid: DMX_MAX_VALUE,
            default_strobe: DMX_MIN_VALUE,
          }
        : {
            default_solid: DMX_MIN_VALUE,
            default_strobe: DMX_MAX_VALUE,
          },
    getValueFromDevice({ ch, params }) {
      return params.strobe !== undefined && params.strobe > 0.5
        ? ch.default_strobe
        : ch.default_solid
    },
  },

  color: {
    default: ({
      hue = 0,
      saturation = 1.0,
    }: { hue?: number; saturation?: number } = {}) => ({
      color: {
        hue,
        saturation,
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
