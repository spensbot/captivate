import styled from 'styled-components'
import ADSRWrapper from './ADSRWrapper'
import { useActiveScene } from '../redux/store'
import TriggerDensity from './TriggerDensity'
import DraggableNumber from '../base/DraggableNumber'
import { useDispatch } from 'react-redux'
import { setRandomizer } from '../redux/scenesSlice'

interface Props {}

export default function Randomizer({}: Props) {
  const triggerPeriod = useActiveScene(
    (scene) => scene.randomizer.triggerPeriod
  )
  const dispatch = useDispatch()

  return (
    <Root>
      <ADSRWrapper />
      <Row>
        <TriggerDensity />
        <DraggableNumber
          value={triggerPeriod}
          min={0.25}
          max={4}
          onChange={(newVal) =>
            dispatch(
              setRandomizer({
                key: 'triggerPeriod',
                value: newVal,
              })
            )
          }
        />
      </Row>
    </Root>
  )
}

const Root = styled.div`
  width: fit-content;
  border: 1px solid ${(props) => props.theme.colors.divider};
`

const Row = styled.div`
  width: 100%;
  display: flex;
`
