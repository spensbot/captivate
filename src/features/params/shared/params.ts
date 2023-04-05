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

export type Params = { [key in DefaultParam]: number | undefined }

export function initBaseParams(): Partial<Params> {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
  }
}

// Params as they
export function initParams(): { [key in DefaultParam]: number } {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
    x: 0.5,
    width: 1.0,
    y: 0.5,
    height: 1.0,
    intensity: 1.0,
    strobe: 0.0,
    randomize: 1.0,
    xAxis: 0.5,
    yAxis: 0.5,
    xMirror: 0.0,
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

export function getParam(params: Partial<Params>, param: DefaultParam): number {
  return params[param] ?? defaultParams[param]
}

export function defaultOutputParams(): Partial<Params> {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
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

export function initModulation(): Modulation {
  return {}
}
