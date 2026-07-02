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
  | 'positionFeather'
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
  | 'moverFloorLock'
  | 'moverSpread'
  | 'moverMirrorX'
  | 'moverMirrorY'
  | 'moverMode'
  | 'atmosFxtrOnOff'
  | 'atmosFxtrLevel'
  | 'visSlider1'
  | 'visSlider2'
  | 'visSlider3'
  | 'visSlider4'
  | 'visSlider5'
  | 'visSlider6'
  | 'visSlider7'
  | 'visSlider8'
  | 'visStageMapMix'

export type Params = { [key: string]: number | undefined }

export const visualSliderParams: readonly DefaultParam[] = [
  'visSlider1',
  'visSlider2',
  'visSlider3',
  'visSlider4',
  'visSlider5',
  'visSlider6',
  'visSlider7',
  'visSlider8',
]

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
    positionFeather: 0.0,
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
    moverFloorLock: 0.0,
    moverSpread: 0.0,
    moverMirrorX: 0.0,
    moverMirrorY: 0.0,
    moverMode: 0.0,
    atmosFxtrOnOff: 0.5,
    atmosFxtrLevel: 1.0,
    visSlider1: 0.5,
    visSlider2: 0.5,
    visSlider3: 0.5,
    visSlider4: 0.5,
    visSlider5: 0.5,
    visSlider6: 0.5,
    visSlider7: 0.5,
    visSlider8: 0.5,
    visStageMapMix: 0,
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
  positionFeather: 0.0,
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
  moverFloorLock: 0.0,
  moverSpread: 0.0,
  moverMirrorX: 0.0,
  moverMirrorY: 0.0,
  moverMode: 0.0,
  atmosFxtrOnOff: 0.5,
  atmosFxtrLevel: 1.0,
  visSlider1: 0.5,
  visSlider2: 0.5,
  visSlider3: 0.5,
  visSlider4: 0.5,
  visSlider5: 0.5,
  visSlider6: 0.5,
  visSlider7: 0.5,
  visSlider8: 0.5,
  visStageMapMix: 0,
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
  'positionFeather',
  'z',
  'depth',
  'intensity',
  'strobe',
  'randomize',
  'xAxis',
  'yAxis',
  'moverFloorLock',
  'moverSpread',
  'moverMirrorX',
  'moverMirrorY',
  'moverMode',
  'atmosFxtrOnOff',
  'atmosFxtrLevel',
  'visSlider1',
  'visSlider2',
  'visSlider3',
  'visSlider4',
  'visSlider5',
  'visSlider6',
  'visSlider7',
  'visSlider8',
  'visStageMapMix',
]

const paramDisplayNames: { [key: string]: string } = {
  gobo: 'Gobo',
  focus: 'Focus',
  prism: 'Prism',
  white: 'White',
  warmWhite: 'Warm White',
  amber: 'Amber',
  uv: 'UV',
  z: 'Z',
  depth: 'Depth',
  positionFeather: 'Feather',
  xAxis: 'Pan',
  yAxis: 'Tilt',
  xMirror: 'Pan Mirror',
  moverFloorLock: 'Floor Bounds Lock',
  moverSpread: 'Tandem Spread',
  moverMirrorX: 'Mirror Left/Right',
  moverMirrorY: 'Mirror Top/Bottom',
  moverMode: 'Mover Mode',
  atmosFxtrOnOff: 'Atmosphere on/off',
  atmosFxtrLevel: 'Atmosphere level',
  visSlider1: 'Visual Slider 1',
  visSlider2: 'Visual Slider 2',
  visSlider3: 'Visual Slider 3',
  visSlider4: 'Visual Slider 4',
  visSlider5: 'Visual Slider 5',
  visSlider6: 'Visual Slider 6',
  visSlider7: 'Visual Slider 7',
  visSlider8: 'Visual Slider 8',
  visStageMapMix: 'Stage light map',
  laserDotDensity: 'Dot density',
  laserScanPath: 'Scan path',
  laserPlaybackSpeed: 'Playback speed',
  laserAnimProgress: 'Animation progress',
  laserBeamHue: 'Beam color (solid)',
}

export function paramDisplayName(param: DefaultParam | string): string {
  return paramDisplayNames[param] ?? param
}
export type Modulation = Params

export function initModulation(): Modulation {
  return {}
}
