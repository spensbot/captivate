import Slider from '../base/Slider'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { useControlSelector } from '../redux/store'
import {
  setAutoSceneEnabled,
  setAutoSceneBombacity,
  setAutoScenePeriod,
} from '../redux/controlSlice'
import { SceneType } from '../../shared/Scenes'
import DraggableNumber from '../base/DraggableNumber'
import { SliderMidiOverlay } from 'renderer/base/MidiOverlay'

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
          backgroundColor: '#0005',
          color: enabled ? '#fff' : '#fff5',
        }}
      />
      {sceneType === 'light' && (
        <SliderMidiOverlay
          action={{ type: 'setAutoSceneBombacity' }}
          style={{ flex: '1 0 auto', marginLeft: '0.5rem', padding: '0.5rem' }}
        >
          <Slider
            value={bombacity}
            radius={enabled ? 0.5 : 0.4}
            orientation="horizontal"
            onChange={onBombacityChange}
            color={enabled ? '#3d5e' : undefined}
          />
        </SliderMidiOverlay>
      )}
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
