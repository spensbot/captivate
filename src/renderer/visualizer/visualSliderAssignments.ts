import {
  BuiltinEffectLinkSource,
  builtinEffectDisplayName,
  builtinGeneratorDisplayName,
  BuiltinVisualizerConfig,
} from '../../visualizer/threejs/layers/BuiltinVisualizer'
import { LayerConfig } from '../../visualizer/threejs/layers/LayerConfig'

export type VisualSliderParam =
  | 'visSlider1'
  | 'visSlider2'
  | 'visSlider3'
  | 'visSlider4'
  | 'visSlider5'
  | 'visSlider6'
  | 'visSlider7'
  | 'visSlider8'

export interface VisualSliderAssignmentSummary {
  labelsBySlider: Partial<Record<VisualSliderParam, string>>
  activeSliders: Set<VisualSliderParam>
}

type LayerLinkKey =
  | 'densityLinkSource'
  | 'quantityLinkSource'
  | 'varietyLinkSource'
  | 'speedLinkSource'
  | 'scaleLinkSource'
  | 'hueShiftLinkSource'
  | 'mixLinkSource'
  | 'depthLinkSource'
  | 'positionXLinkSource'
  | 'positionYLinkSource'
  | 'rotateXLinkSource'
  | 'rotateYLinkSource'

const linkSuffixByKey: Record<LayerLinkKey, string> = {
  densityLinkSource: 'Density Slider',
  quantityLinkSource: 'Quantity Slider',
  varietyLinkSource: 'Variety Slider',
  speedLinkSource: 'Speed Slider',
  scaleLinkSource: 'Scale Slider',
  hueShiftLinkSource: 'Color Slider',
  mixLinkSource: 'Mix Slider',
  depthLinkSource: 'Depth Slider',
  positionXLinkSource: 'Move X Slider',
  positionYLinkSource: 'Move Y Slider',
  rotateXLinkSource: 'Rotate X Slider',
  rotateYLinkSource: 'Rotate Y Slider',
}

const visualSliderList: VisualSliderParam[] = [
  'visSlider1',
  'visSlider2',
  'visSlider3',
  'visSlider4',
  'visSlider5',
  'visSlider6',
  'visSlider7',
  'visSlider8',
]
const visualSliderSet = new Set<string>(visualSliderList)

/** Which visualizer sliders are linked, for any layer container type. */
export function sumVisSliders(config: LayerConfig): VisualSliderAssignmentSummary {
  if (config.container !== 'builtin') {
    return {
      labelsBySlider: {},
      activeSliders: new Set<VisualSliderParam>(),
    }
  }
  return sumBuiltinVisSliders(config.builtin)
}

/** Which builtin visualizer sliders are linked to layer/effect controls. */
export function sumBuiltinVisSliders(
  config: BuiltinVisualizerConfig
): VisualSliderAssignmentSummary {
  const labelsBySliderList: Record<VisualSliderParam, string[]> = {
    visSlider1: [],
    visSlider2: [],
    visSlider3: [],
    visSlider4: [],
    visSlider5: [],
    visSlider6: [],
    visSlider7: [],
    visSlider8: [],
  }

  const push = (source: BuiltinEffectLinkSource, label: string) => {
    if (!visualSliderSet.has(source)) {
      return
    }
    labelsBySliderList[source as VisualSliderParam].push(label)
  }

  for (let i = 0; i < config.layers.length; i++) {
    const layer = config.layers[i]
    const layerName =
      layer.sourceType === 'procedural'
        ? builtinGeneratorDisplayName[layer.generator]
        : layer.sourceType === 'projectM'
        ? 'projectM'
        : layer.sourceType === 'imageFile'
        ? 'Image'
        : layer.sourceType === 'videoFile'
        ? 'Video'
        : layer.sourceType === 'ndiStream'
        ? 'NDI'
        : 'RTSP'
    const prefix = `Layer ${i + 1} ${layerName}`
    const linkKeys: LayerLinkKey[] = [
      'densityLinkSource',
      'quantityLinkSource',
      'varietyLinkSource',
      'speedLinkSource',
      'scaleLinkSource',
      'hueShiftLinkSource',
      'mixLinkSource',
      'depthLinkSource',
      'positionXLinkSource',
      'positionYLinkSource',
      'rotateXLinkSource',
      'rotateYLinkSource',
    ]
    for (const key of linkKeys) {
      push(layer[key], `${prefix} ${linkSuffixByKey[key]}`)
    }
  }

  for (let i = 0; i < config.effects.length; i++) {
    const effect = config.effects[i]
    push(
      effect.linkSource,
      `Effect ${i + 1} ${builtinEffectDisplayName[effect.type]} Amount Slider`
    )
    if (effect.type === 'rimLight') {
      push(
        effect.lightAzimuthLinkSource,
        `Effect ${i + 1} ${builtinEffectDisplayName.rimLight} Azimuth Slider`
      )
    }
  }

  const labelsBySlider: Partial<Record<VisualSliderParam, string>> = {}
  const activeSliders = new Set<VisualSliderParam>()

  for (const slider of visualSliderList) {
    const labels = labelsBySliderList[slider]
    if (labels.length <= 0) {
      continue
    }
    activeSliders.add(slider)
    labelsBySlider[slider] =
      labels.length === 1 ? labels[0] : `${labels[0]} (+${labels.length - 1})`
  }

  return {
    labelsBySlider,
    activeSliders,
  }
}
