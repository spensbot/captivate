import styled from 'styled-components'
import DraggableNumber from '../base/DraggableNumber'
import { useDispatch } from 'react-redux'
import { useActiveLightScene } from '../redux/store'
import { setRandomizer } from '../redux/controlSlice'
import { RandomizerOptions } from '../../shared/randomizer'
import Slider from '../base/Slider'

interface Props {}

export default function Randomizer({}: Props) {
  return (
    <Root>
      <Title>Randomizer Settings</Title>
      <RandomizerControl option={'triggerPeriod'} />
      <RandomizerControl option={'triggerDensity'} />
      <RandomizerControl option={'riseTime'} />
      <RandomizerControl option={'fallTime'} />
    </Root>
  )
}

const Root = styled.div`
  padding: 1rem;
  width: 20rem;
`

const Title = styled.div``

function RandomizerControl({ option }: { option: keyof RandomizerOptions }) {
  const dispatch = useDispatch()
  const val = useActiveLightScene(
    (activeScene) => activeScene.randomizer[option]
  )

  const onChange = (newVal: number) => {
    dispatch(
      setRandomizer({
        key: option,
        value: newVal,
      })
    )
  }

  return (
    <Row>
      <Label>{option}</Label>
      {option === 'triggerPeriod' || option === 'triggerDensity' ? (
        <DraggableNumber value={val} min={0} max={4} onChange={onChange} />
      ) : (
        <Slider
          value={val / 300}
          onChange={(val) => onChange(val * 300)}
          orientation="horizontal"
        />
      )}
    </Row>
  )
}

const Row = styled.div`
  display: flex;
  align-items: center;
`

const Label = styled.div``
