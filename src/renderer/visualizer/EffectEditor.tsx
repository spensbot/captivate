import cloneDeep from 'lodash.clonedeep'
import { useState, useEffect } from 'react'
import { EffectConfig } from '../../visualizer/threejs/effects/effectConfigs'
import { Button } from '@mui/material'
import LayerEditor from './LayerEditor'
import Select from 'renderer/base/Select'
import {
  visualizerTypeList,
  initLayerConfig,
} from '../../visualizer/threejs/layers/LayerConfig'
import makeControls from './makeControls'

interface Props {
  config: EffectConfig
  onChange: (newConfig: EffectConfig) => void
}

export default function EffectEditor({ config, onChange }: Props) {
  let [edit, setEdit] = useState(cloneDeep(config))

  useEffect(() => {
    setEdit(config)
  }, [config])

  return (
    <>
      <SpecificFields config={edit} onChange={setEdit} />
      <Button onClick={() => onChange(edit)}>Apply</Button>
    </>
  )
}

function SpecificFields({ config, onChange }: Props) {
  let { makeOnChange, makeSlider, makeSwitch, makeNumberInput, makeSelect } =
    makeControls(config, onChange)

  switch (config.type) {
    case 'AdaptiveToneMapping':
      return <></>
    case 'AfterImage':
      return <>{makeSlider('Time', config, 'damp', 0, 10, 0.01)}</>
    case 'DotScreen':
      return (
        <>
          {makeSlider('Center X', config, 'centerX')}
          {makeSlider('Center Y', config, 'centerY')}
          {makeSlider('Angle', config, 'angle')}
          {makeSlider('Scale', config, 'scale')}
        </>
      )
    case 'Film':
      return (
        <>
          {makeSlider('Grayscale', config, 'grayscale')}
          {makeSlider('Intensity', config, 'intensity')}
          {makeSlider('Scanlines', config, 'scanlines', 1, 1000, 1)}
        </>
      )
    case 'Glitch':
      return <></>
    case 'HalfTone':
      return (
        <>
          {makeSlider('Radius', config, 'radius', 0, 10, 0.1)}
          {makeSlider('Scatter', config, 'scatter', 0, 100, 0.1)}
          {makeSlider('Shape', config, 'shape', 0, 5, 1)}
        </>
      )
    case 'LightSync':
      return (
        <>
          {makeSlider('Obey Color', config, 'obeyColor')}
          {makeSwitch('Obey Brightness', config, 'obeyBrightness')}
          {makeSwitch('Obey Master', config, 'obeyMaster')}
          {makeSwitch('Obey Position', config, 'obeyPosition')}
          {makeSwitch('Obey Strobe', config, 'obeyStrobe')}
          {makeSwitch('Obey Epicness', config, 'obeyEpicness')}
        </>
      )
    case 'Pixel':
      return <>{makeSlider('Pixel Size', config, 'pixelSize', 1, 64, 1)}</>
    case 'RenderLayer':
      return (
        <>
          <Select
            label="Type"
            val={config.layerConfig.type}
            items={visualizerTypeList}
            onChange={(newLayerType) => {
              onChange({
                ...config,
                layerConfig: initLayerConfig(newLayerType),
              })
            }}
          />
          <LayerEditor
            config={config.layerConfig}
            onChange={makeOnChange('layerConfig')}
          />
        </>
      )
    case 'UnrealBloom':
      return (
        <>
          {makeSlider('Radius', config, 'radius', 0, 100, 0.1)}
          {makeSlider('Strength', config, 'strength', 0, 1, 0.01)}
          {makeSlider('Threshold', config, 'threshold', 0, 1, 0.01)}
        </>
      )
    default:
      return <></>
  }
}
