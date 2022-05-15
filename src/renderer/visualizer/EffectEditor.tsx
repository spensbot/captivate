import cloneDeep from 'lodash.clonedeep'
import { useState, useEffect } from 'react'
import { EffectConfig } from '../../visualizer/threejs/effects/effectConfigs'
import { Button, Slider, Switch } from '@mui/material'
import LayerEditor from './LayerEditor'
import Select from 'renderer/base/Select'
import {
  visualizerTypeList,
  initLayerConfig,
} from '../../visualizer/threejs/layers/LayerConfig'

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
  function makeOnChange<Config, Val>(key: keyof Config) {
    return (newVal: Val) =>
      onChange({
        ...config,
        [key]: newVal,
      })
  }

  function makeSlider<Config>(
    config: Config,
    key: keyof Config,
    min?: number,
    max?: number,
    step?: number
  ) {
    const _min = min ?? 0
    const _max = max ?? 1
    const _step = step ?? 0.01
    return (
      <Slider
        //@ts-ignore
        value={config[key]}
        min={_min}
        max={_max}
        step={_step}
        onChange={(_e, value) => makeOnChange(key)(value)}
      />
    )
  }

  function makeSwitch<Config>(config: Config, key: keyof Config) {
    return (
      <Switch
        //@ts-ignore
        checked={config[key]}
        onChange={(e) => makeOnChange(key)(e.target.checked)}
      />
    )
  }

  switch (config.type) {
    case 'AdaptiveToneMapping':
      return <></>
    case 'AfterImage':
      return <>{makeSlider(config, 'damp', 0, 10, 0.01)}</>
    case 'DotScreen':
      return (
        <>
          {makeSlider(config, 'centerX')}
          {makeSlider(config, 'centerY')}
          {makeSlider(config, 'angle')}
          {makeSlider(config, 'scale')}
        </>
      )
    case 'Film':
      return (
        <>
          {makeSlider(config, 'grayscale')}
          {makeSlider(config, 'intensity')}
          {makeSlider(config, 'scanlines', 1, 1000, 1)}
        </>
      )
    case 'Glitch':
      return <></>
    case 'HalfTone':
      return (
        <>
          {makeSlider(config, 'radius', 0, 10, 0.1)}
          {makeSlider(config, 'scatter', 0, 100, 0.1)}
          {makeSlider(config, 'shape', 0, 5, 1)}
        </>
      )
    case 'LightSync':
      return (
        <>
          {makeSlider(config, 'obeyColor')}
          {makeSwitch(config, 'obeyBrightness')}
          {makeSwitch(config, 'obeyMaster')}
          {makeSwitch(config, 'obeyPosition')}
          {makeSwitch(config, 'obeyStrobe')}
          {makeSwitch(config, 'obeyEpicness')}
        </>
      )
    case 'Pixel':
      return <>{makeSlider(config, 'pixelSize', 1, 64, 1)}</>
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
          {makeSlider(config, 'radius', 0, 100, 0.1)}
          {makeSlider(config, 'strength', 0, 1, 0.01)}
          {makeSlider(config, 'threshold', 0, 1, 0.01)}
        </>
      )
    default:
      return <></>
  }
}
