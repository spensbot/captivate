import cloneDeep from 'lodash.clonedeep'
import { useState, useEffect } from 'react'
import Select from 'renderer/base/Select'
import styled from 'styled-components'
import { EffectConfig } from '../../visualizer/threejs/effects/effectConfigs'
import { Button, Slider, TextField } from '@mui/material'

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
        value={config[key]}
        min={_min}
        max={_max}
        step={_step}
        onChange={(_e, value) => makeOnChange(key)(value)}
      />
    )
  }

  switch (config.type) {
    case 'AdaptiveToneMapping':
      return <></>
    case 'AfterImage':
      return <></>
    case 'DotScreen':
      return <></>
    case 'Film':
      return (
        <>
          {makeSlider(config, 'grayscale')}
          {makeSlider(config, 'noiseIntensity')}
          {makeSlider(config, 'scanlinesCount', 0, 1000, 1)}
          {makeSlider(config, 'scanlinesIntensity')}
        </>
      )
    case 'Glitch':
      return <></>
    case 'HalfTone':
      return <></>
    case 'LightSync':
      return <>{makeSlider(config, 'obeyColor')}</>
    case 'RenderLayer':
      return <></>
    case 'UnrealBloom':
      return <></>
    default:
      return <></>
  }
}
