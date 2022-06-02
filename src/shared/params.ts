export type Param =
  | 'hue'
  | 'saturation'
  | 'brightness'
  | 'x'
  | 'width'
  | 'y'
  | 'height'
  | 'black'
  | 'intensity'
  | 'strobe'
  | 'randomize'
  | 'xAxis'
  | 'yAxis'
  | 'xMirror'

export type Params = { [key in Param]: number }
export function initBaseParams(): Partial<Params> {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
    // x: 0.5,
    // width: 1.0,
    // y: 0.5,
    // height: 1.0,
    // black: 1.0,
    // intensity: 1.0,
    // strobe: 0.0,
    // randomize: 0.0,
    // xAxis: 0.5,
    // yAxis: 0.5,
    // xMirror: 0.0,
  }
}

export function defaultOutputParams(): Params {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
    x: 0.5,
    width: 1.0,
    y: 0.5,
    height: 1.0,
    black: 1.0,
    intensity: 1.0,
    strobe: 0.0,
    randomize: 0.0,
    xAxis: 0.5,
    yAxis: 0.5,
    xMirror: 0.0,
  }
}

export const paramsList: Param[] = [
  'hue',
  'saturation',
  'brightness',
  'x',
  'width',
  'y',
  'height',
  'black',
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

export function mapUndefinedParamsToDefault(params: Partial<Params>): Params {
  const defalt = defaultOutputParams()
  for (const param of paramsList) {
    const val = params[param]
    if (val !== undefined) {
      defalt[param] = val
    }
  }
  return defalt
}
