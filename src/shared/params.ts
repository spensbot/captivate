export type DefaultParam =
  | 'hue'
  | 'saturation'
  | 'brightness'
  | 'white'
  | 'warmWhite'
  | 'amber'
  | 'uv'
  | 'x'
  | 'width'
  | 'y'
  | 'height'
  | 'z'
  | 'depth'
  | 'intensity'
  | 'strobe'
  | 'strobeRgb'
  | 'strobeWhite'
  | 'strobeWarmWhite'
  | 'strobeAmber'
  | 'strobeUv'
  | 'randomize'
  | 'xAxis'
  | 'yAxis'
  | 'xMirror'
  | 'moverSpread'
  | 'moverMirrorX'
  | 'moverMirrorY'
  | 'moverMode'

export type Params = { [key: string]: number | undefined }

export function initBaseParams(): Params {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
    white: 0.0,
    warmWhite: 0.0,
    amber: 0.0,
    uv: 0.0,
    strobeRgb: 1.0,
    strobeWhite: 1.0,
    strobeWarmWhite: 1.0,
    strobeAmber: 1.0,
    strobeUv: 1.0,
  }
}

// Params as they
export function initParams(): { [key in DefaultParam]: number } {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
    white: 0.0,
    warmWhite: 0.0,
    amber: 0.0,
    uv: 0.0,
    x: 0.5,
    width: 1.0,
    y: 0.5,
    height: 1.0,
    z: 1.0,
    depth: 1.0,
    intensity: 1.0,
    strobe: 0.0,
    strobeRgb: 1.0,
    strobeWhite: 1.0,
    strobeWarmWhite: 1.0,
    strobeAmber: 1.0,
    strobeUv: 1.0,
    randomize: 1.0,
    xAxis: 0.5,
    yAxis: 0.5,
    xMirror: 0.0,
    moverSpread: 0.0,
    moverMirrorX: 0.0,
    moverMirrorY: 0.0,
    moverMode: 0.0,
  }
}

const defaultParams: { [key in DefaultParam]: number } = {
  hue: 0.5,
  saturation: 0.5,
  brightness: 0.5,
  white: 0.0,
  warmWhite: 0.0,
  amber: 0.0,
  uv: 0.0,
  x: 0.5,
  width: 1.0,
  y: 0.5,
  height: 1.0,
  z: 1.0,
  depth: 1.0,
  intensity: 1.0,
  strobe: 0.0,
  strobeRgb: 1.0,
  strobeWhite: 1.0,
  strobeWarmWhite: 1.0,
  strobeAmber: 1.0,
  strobeUv: 1.0,
  randomize: 0.0,
  xAxis: 0.5,
  yAxis: 0.5,
  xMirror: 0.0,
  moverSpread: 0.0,
  moverMirrorX: 0.0,
  moverMirrorY: 0.0,
  moverMode: 0.0,
}

export function getParam(params: Params, param: DefaultParam): number {
  return params[param] ?? defaultParams[param]
}

export function defaultOutputParams(): Params {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
    white: 0.0,
    warmWhite: 0.0,
    amber: 0.0,
    uv: 0.0,
    strobeRgb: 1.0,
    strobeWhite: 1.0,
    strobeWarmWhite: 1.0,
    strobeAmber: 1.0,
    strobeUv: 1.0,
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
  'white',
  'warmWhite',
  'amber',
  'uv',
  'x',
  'width',
  'y',
  'height',
  'z',
  'depth',
  'intensity',
  'strobe',
  'randomize',
  'xAxis',
  'yAxis',
  'xMirror',
  'moverSpread',
  'moverMirrorX',
  'moverMirrorY',
  'moverMode',
]

const paramDisplayNames: { [key: string]: string } = {
  gobo: 'Gobo',
  white: 'White',
  warmWhite: 'Warm White',
  amber: 'Amber',
  uv: 'UV',
  z: 'Z',
  depth: 'Depth',
  xAxis: 'Pan',
  yAxis: 'Tilt',
  xMirror: 'Pan Mirror',
  moverSpread: 'Tandem Spread',
  moverMirrorX: 'Mirror Left/Right',
  moverMirrorY: 'Mirror Top/Bottom',
  moverMode: 'Mover Mode',
}

export function paramDisplayName(param: DefaultParam | string): string {
  return paramDisplayNames[param] ?? param
}
export type Modulation = Params

export function initModulation(): Modulation {
  return {}
}
