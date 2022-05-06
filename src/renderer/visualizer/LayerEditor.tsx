import cloneDeep from 'lodash.clonedeep'
import { useState } from 'react'
import Select from 'renderer/base/Select'
import styled from 'styled-components'
import { LayerConfig } from './threejs/layers/LayerConfig'
import {
  LocalMediaConfig,
  objectFits,
  ObjectFit,
  orderTypes,
} from './threejs/layers/LocalMedia'
import { fontTypes } from './threejs/fonts/FontType'
import { Button, Input, TextField } from '@mui/material'

interface Props {
  config: LayerConfig
  onChange: (newConfig: LayerConfig) => void
}

export default function LayerEditor({ config, onChange }: Props) {
  let [edit, setEdit] = useState(cloneDeep(config))

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
    case 'CubeSphere':
      return <></>
    case 'Cubes':
      return <></>
    case 'LocalMedia':
      return (
        <>
          <Select
            label="Fit"
            val={config.objectFit}
            items={objectFits}
            onChange={makeOnChange('objectFit')}
          />
          <Select
            label="Order"
            val={config.order}
            items={orderTypes}
            onChange={makeOnChange('order')}
          />
        </>
      )
    case 'Spheres':
      return <></>
    case 'TextParticles':
      config.fontType
      config.text
      config.textSize
      config.particleCount
      return (
        <>
          <TextField label="Text" value={config.text}></TextField>
          <Select
            label="Font"
            val={config.fontType}
            items={fontTypes}
            onChange={makeOnChange('fontType')}
          />
          <TextField label="Font Size" type="number" value={config.textSize} />
          <TextField
            label="Particle Count"
            type="number"
            value={config.particleCount}
          />
        </>
      )
    case 'TextSpin':
      return <></>
    default:
      return <></>
  }
}

const Root = styled.div``
