export function initParams() {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
    x: 0.5,
    width: 0.5,
    y: 0.5,
    height: 1.0,
    black: 0.5,
    epicness: 0.5,
    strobe: 0.0,
    randomize: 0.0,
  }
}

export type Params = ReturnType<typeof initParams>
export type Param = keyof Params

export function initModulation(): Params {
  return {
    hue: 0.5,
    saturation: 0.5,
    brightness: 0.5,
    x: 0.5,
    width: 0.5,
    y: 0.5,
    height: 0.5,
    black: 0.5,
    epicness: 0.5,
    strobe: 0.5,
    randomize: 0.5,
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
  'epicness',
  'strobe',
  'randomize',
]
