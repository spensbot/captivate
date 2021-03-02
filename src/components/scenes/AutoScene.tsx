import { Slider } from '@material-ui/core'
import React from 'react'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../../redux/store'
import { setAutoSceneEnabled, setAutoSceneBombacity } from '../../redux/scenesSlice'

export default function AutoScene() {
  const dispatch = useDispatch()
  const {enabled, bombacity} = useTypedSelector(state => state.scenes.auto)

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      alignItems: 'center'
    },
    button: {
      backgroundColor: enabled ? '#3d5a' : '#fff3',
      color: enabled ? '#eee' : '#fff9',
      borderRadius: '0.3rem',
      padding: '0.2rem',
      cursor: 'pointer',
      fontSize: '0.9rem',
      margin: '0'
    },
    slider: {
      flex: '1 0 auto',
      margin: '0 1rem'
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.button} onClick={() => dispatch(setAutoSceneEnabled(!enabled))}>
        auto
      </div>
      <div style={styles.slider}>
        <Slider value={bombacity} min={0} max={0} step={0.01} orientation="horizontal"
          onChange={(e, value) => dispatch(setAutoSceneBombacity(value))}
        />
      </div>
    </div>
  )
}
