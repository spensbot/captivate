import styled from 'styled-components'
import ADSRWrapper from './ADSRWrapper'
import { useActiveLightScene, useBaseParam } from '../redux/store'
import TriggerDensity from './TriggerDensity'
import DraggableNumber from '../base/DraggableNumber'
import { useDispatch } from 'react-redux'
import { setRandomizer } from '../redux/controlSlice'
import Slider from '../base/Slider'
import ParamXButton from './ParamXButton'
import ParamSlider from './ParamSlider'

interface Props {
  splitIndex: number | null
}

export default function Randomizer({ splitIndex }: Props) {
  const { triggerPeriod, triggerDensity } = useActiveLightScene((scene) => {
    if (splitIndex === null) {
      return scene.randomizer
    } else {
      return scene.splitScenes[splitIndex].randomizer
    }
  })
  const dispatch = useDispatch()
  const randomize = useBaseParam('randomize', splitIndex)

  if (randomize === undefined) {
    return null
  }

  return (
    <>
      <Root>
        <ADSRWrapper splitIndex={splitIndex} />
        <TriggerDensity splitIndex={splitIndex} />
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
                    splitIndex,
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
                  splitIndex,
                })
              )
            }
          />
        </Row>
        <ParamXButton splitIndex={splitIndex} params={['randomize']} />
      </Root>
      <ParamSlider param={'randomize'} splitIndex={splitIndex} />
    </>
  )
}

const Root = styled.div`
  position: relative;
  width: fit-content;
  border: 1px solid ${(props) => props.theme.colors.divider};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  margin-right: 1rem;
`

const Row = styled.div`
  width: 100%;
  display: flex;
  height: 2rem;
  align-items: stretch;
  padding: 0 0.3rem 0.3rem 0.3rem;
  box-sizing: border-box;
`
