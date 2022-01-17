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

export function initModulation(): Params {
  const params = initParams()
  paramsList.forEach((param) => (params[param] = 0.5))
  return params
}
