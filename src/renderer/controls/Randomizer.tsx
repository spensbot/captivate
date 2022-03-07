import styled from 'styled-components'
import ADSRWrapper from './ADSRWrapper'
import { useActiveLightScene } from '../redux/store'
import TriggerDensity from './TriggerDensity'
import DraggableNumber from '../base/DraggableNumber'
import { useDispatch } from 'react-redux'
import { setRandomizer } from '../redux/controlSlice'
import Slider from '../base/Slider'

interface Props {
  splitIndex: number | null
}

export default function Randomizer({ splitIndex }: Props) {
  const triggerPeriod = useActiveLightScene(
    (scene) => scene.randomizer.triggerPeriod
  )
  const triggerDensity = useActiveLightScene(
    (scene) => scene.randomizer.triggerDensity
  )
  const dispatch = useDispatch()

  return (
    <Root>
      <ADSRWrapper />
      <TriggerDensity />
      <Row>
        <div
          style={{
            flex: '1 0 0',
            marginRight: '0.3rem',
          }}
        >
          <Slider
            value={triggerDensity}
            orientation="horizontal"
            onChange={(newVal) =>
              dispatch(
                setRandomizer({
                  key: 'triggerDensity',
                  value: newVal,
                })
              )
            }
          />
        </div>
        <DraggableNumber
          value={triggerPeriod}
          min={0.05}
          max={4}
          onChange={(newVal) =>
            dispatch(
              setRandomizer({
                key: 'triggerPeriod',
                value: newVal,
              })
            )
          }
          style={{ height: '0.8rem' }}
        />
      </Row>
    </Root>
  )
}

const Root = styled.div`
  width: fit-content;
  border: 1px solid ${(props) => props.theme.colors.divider};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`

const Row = styled.div`
  width: 100%;
  display: flex;
  padding: 0 0.3rem 0.3rem 0.3rem;
  box-sizing: border-box;
`
