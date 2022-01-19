import Slider from '../base/Slider'
import React from 'react'
import { useDispatch } from 'react-redux'
import { useScenesSelector } from '../redux/store'
import {
  setAutoSceneEnabled,
  setAutoSceneBombacity,
  setAutoScenePeriod,
} from '../redux/scenesSlice'
import DraggableNumber from '../base/DraggableNumber'

export default function AutoScene() {
  const dispatch = useDispatch()
  const { enabled, bombacity, period } = useScenesSelector(
    (state) => state.auto
  )

  const enabledColor = '#3d5a'

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '0.5rem',
    },
    button: {
      backgroundColor: enabled ? enabledColor : '#fff3',
      color: enabled ? '#eee' : '#fff9',
      borderRadius: '0.3rem',
      padding: '0.1rem 0.3rem',
      cursor: 'pointer',
      fontSize: '0.9rem',
      marginRight: '0.5rem',
    },
    slider: {
      flex: '1 0 auto',
      margin: '0 1rem',
    },
  }

  const onBombacityChange = (newVal: number) => {
    dispatch(setAutoSceneBombacity(newVal))
  }

  const onPeriodChange = (newVal: number) => {
    dispatch(setAutoScenePeriod(newVal))
  }

  return (
    <div style={styles.root}>
      <div
        style={styles.button}
        onClick={() => dispatch(setAutoSceneEnabled(!enabled))}
      >
        auto
      </div>
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
      <div style={styles.slider}>
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
      </div>
    </div>
  )
}
