import Slider from '../base/Slider'
import React from 'react'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../../redux/store'
import { setAutoSceneEnabled, setAutoSceneBombacity } from '../../redux/scenesSlice'

export default function AutoScene() {
  const dispatch = useDispatch()
  const { enabled, bombacity } = useTypedSelector(state => state.scenes.auto)
  
  const enabledColor = '#3d5a';

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '0.5rem'
    },
    button: {
      backgroundColor: enabled ? enabledColor : '#fff3',
      color: enabled ? '#eee' : '#fff9',
      borderRadius: '0.3rem',
      padding: '0.1rem 0.3rem',
      cursor: 'pointer',
      fontSize: '0.9rem',
      margin: '0'
    },
    slider: {
      flex: '1 0 auto',
      margin: '0 1rem'
    }
  }

  const onChange = (newVal: number) => {
    dispatch(setAutoSceneBombacity(newVal))
  }

  return (
    <div style={styles.root}>
      <div style={styles.button} onClick={() => dispatch(setAutoSceneEnabled(!enabled))}>
        auto
      </div>
      <div style={styles.slider}>
        {/* <Slider value={bombacity} min={0} max={0} step={0.01} orientation="horizontal"
          onChange={(e, value) => dispatch(setAutoSceneBombacity(value))}
        /> */}
        <Slider value={bombacity} radius={enabled ? 0.35 : 0.3} orientation="horizontal" onChange={onChange} color={enabled ? "#3d5e" : undefined}/>
      </div>
    </div>
  )
}
