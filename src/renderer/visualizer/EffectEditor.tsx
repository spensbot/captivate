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

  switch (config.type) {
    case 'AdaptiveToneMapping':
      return <></>
    case 'AfterImage':
      return <></>
    case 'DotScreen':
      return <></>
    case 'Film':
      return <></>
    case 'Glitch':
      return <></>
    case 'HalfTone':
      return <></>
    case 'LightSync':
      return (
        <>
          <Slider
            value={config.obeyColor}
            min={0}
            max={1}
            step={0.01}
            onChange={(_e, value) => makeOnChange('obeyColor')(value)}
          />
        </>
      )
    case 'RenderLayer':
      return <></>
    case 'UnrealBloom':
      return <></>
    default:
      return <></>
  }
}
