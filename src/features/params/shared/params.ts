import {
  DmxState,
  getCustomChannels,
} from 'features/fixtures/redux/fixturesSlice'
import { Pretty } from 'features/shared/shared/type-utils'

export type DefaultParam =
  | 'hue'
  | 'saturation'
  | 'brightness'
  | 'x'
  | 'width'
  | 'y'
  | 'height'
  | 'intensity'
  | 'strobe'
  | 'randomize'
  | 'xAxis'
  | 'yAxis'
  | 'xMirror'

export type StrictParams = { [key in DefaultParam]: number | undefined }
export type Params = Pretty<
  StrictParams & { [key: string]: number | undefined }
>

export function initBaseParams(): Partial<StrictParams> {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
  }
}

// Params as they
export function initParams(): { [key in DefaultParam]: number } {
  return {
    ...defaultParams,
    randomize: 1.0,
  }
}

const defaultParams: { [key in DefaultParam]: number } = {
  hue: 0.5,
  saturation: 0.5,
  brightness: 0.5,
  x: 0.5,
  width: 1.0,
  y: 0.5,
  height: 1.0,
  intensity: 1.0,
  strobe: 0.0,
  randomize: 0.0,
  xAxis: 0.5,
  yAxis: 0.5,
  xMirror: 0.0,
}

export function getParam(
  params: Partial<StrictParams>,
  param: DefaultParam
): number {
  return params[param] ?? defaultParams[param]
}

export function getAllParamKeys(dmx: DmxState): string[] {
  return (defaultParamsList as string[]).concat(
    Array.from(getCustomChannels(dmx))
  )
}

export function defaultOutputParams(): Partial<Params> {
  return {
    ...initBaseParams(),
    // x: 0.5,
    // width: 1.0,
    // y: 0.5,
    // height: 1.0,
    // intensity: 1.0,
    // strobe: 0.0,
    // randomize: 0.0,
    // xAxis: 0.5,
    // yAxis: 0.5,
    // xMirror: 0.0,
  }
}

export const defaultParamsList: DefaultParam[] = [
  'hue',
  'saturation',
  'brightness',
  'x',
  'width',
  'y',
  'height',
  'intensity',
  'strobe',
  'randomize',
  'xAxis',
  'yAxis',
  'xMirror',
]

export type Modulation = Partial<Params>
