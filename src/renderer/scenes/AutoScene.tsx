import Slider from '../base/Slider'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { useControlSelector } from '../redux/store'
import {
  setAutoSceneEnabled,
  setAutoSceneBombacity,
  setAutoScenePeriod,
  SceneType,
} from '../redux/controlSlice'
import DraggableNumber from '../base/DraggableNumber'

export default function AutoScene({ sceneType }: { sceneType: SceneType }) {
  const dispatch = useDispatch()
  const { enabled, bombacity, period } = useControlSelector(
    (control) => control[sceneType].auto
  )

  const onBombacityChange = (newVal: number) => {
    dispatch(
      setAutoSceneBombacity({
        sceneType: sceneType,
        val: newVal,
      })
    )
  }

  const onPeriodChange = (newVal: number) => {
    dispatch(
      setAutoScenePeriod({
        sceneType: sceneType,
        val: newVal,
      })
    )
  }

  return (
    <Root>
      <Button
        style={{
          backgroundColor: enabled ? '#3d5a' : '#fff3',
          color: enabled ? '#eee' : '#fff9',
        }}
        onClick={() =>
          dispatch(
            setAutoSceneEnabled({
              sceneType: sceneType,
              val: !enabled,
            })
          )
        }
      >
        auto
      </Button>
      <DraggableNumber
        value={period}
        min={1}
        max={4}
        onChange={onPeriodChange}
        style={{
          padding: '0.2rem 0.4rem',
          backgroundColor: '#0005',
          color: enabled ? '#fff' : '#fff5',
        }}
      />
      <SliderWrapper>
        {/* <Slider value={bombacity} min={0} max={0} step={0.01} orientation="horizontal"
          onChange={(e, value) => dispatch(setAutoSceneBombacity(value))}
        /> */}
        <Slider
          value={bombacity}
          radius={enabled ? 0.35 : 0.3}
          orientation="horizontal"
          onChange={onBombacityChange}
          color={enabled ? '#3d5e' : undefined}
        />
      </SliderWrapper>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`

const Button = styled.div`
  border-radius: 0.3rem;
  padding: 0.1rem 0.3rem;
  cursor: pointer;
  font-size: 0.9rem;
  margin-right: 0.5rem;
`

const SliderWrapper = styled.div`
  flex: 1 0 auto;
  margin: 0 1rem;
`
