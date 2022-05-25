import cloneDeep from 'lodash.clonedeep'
import deepEqual from 'deep-equal'
import { useEffect, useState } from 'react'
import { LayerConfig } from '../../visualizer/threejs/layers/LayerConfig'
import {
  objectFits,
  orderTypes,
} from '../../visualizer/threejs/layers/LocalMediaConfig'
import { fontTypes } from '../../visualizer/threejs/fonts/FontType'
import { Button } from '@mui/material'
import makeControls from './makeControls'
import FileList from './FileList'
import { spaceShapes } from 'visualizer/threejs/layers/Space'

interface Props {
  config: LayerConfig
  onChange: (newConfig: LayerConfig) => void
}

export default function LayerEditor({ config, onChange }: Props) {
  let [edit, setEdit] = useState(cloneDeep(config))

  useEffect(() => {
    setEdit(config)
  }, [config])

  const disabled = deepEqual(config, edit, { strict: true })

  return (
    <>
      <SpecificFields config={edit} onChange={setEdit} />
      <Button
        variant="outlined"
        disabled={disabled}
        onClick={() => onChange(edit)}
      >
        Apply
      </Button>
    </>
  )
}

//ADD LAYER!!!
function SpecificFields({ config, onChange }: Props) {
  let {
    makeOnChange,
    makeSlider,
    makeNumberInput,
    makeTextInput,
    makeSelect,
    makeInputArray,
    makeRangeSlider,
  } = makeControls(config, onChange)

  switch (config.type) {
    case 'CubeSphere':
      return (
        <>
          {makeSlider('Quantity', config, 'quantity', 1, 1000, 1)}
          {makeSlider('Size', config, 'size', 0, 5, 0.01)}
        </>
      )
    case 'Cubes':
      return <></>
    case 'LocalMedia':
      return (
        <>
          {makeSelect('Fit', config, objectFits, 'objectFit')}
          {makeSelect('Order', config, orderTypes, 'order')}
          {makeNumberInput('Beats Per Change', config, 'period')}
          <FileList
            filepaths={config.paths}
            onChange={(newFilepaths) => makeOnChange('paths')(newFilepaths)}
          />
        </>
      )
    case 'Spheres':
      return (
        <>
          {makeSlider('Quantity', config, 'quantity', 1, 1000, 1)}
          {makeSlider('Radius', config, 'radius', 0, 5, 0.01)}
        </>
      )
    case 'TextParticles':
      config.fontType
      config.text
      config.textSize
      config.particleCount
      return (
        <>
          {makeSelect('Font', config, fontTypes, 'fontType')}
          {makeNumberInput('Font Size', config, 'textSize')}
          {makeNumberInput('Particle Count', config, 'particleCount')}
          {makeNumberInput('Beats Per Change', config, 'period')}
          {makeSlider('Particle Size', config, 'particleSize')}
          {makeInputArray('Text', config, 'text')}
        </>
      )
    case 'TextSpin':
      return (
        <>
          {makeSlider('Size', config, 'size', 0, 5, 0.01)}
          {makeTextInput('Text', config, 'text')}
        </>
      )
    case 'Space':
      return (
        <>
          {makeRangeSlider('Count', config, 'count')}
          {makeRangeSlider('Speed', config, 'speed')}
          {makeSelect('Shape', config, spaceShapes, 'shape')}
          {makeSlider('Width', config, 'width')}
          {makeSlider('Height', config, 'height')}
          {makeRangeSlider('Randomize', config, 'randomize')}
        </>
      )
    default:
      return <></>
  }
}
