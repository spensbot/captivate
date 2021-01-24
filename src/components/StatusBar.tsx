import React from 'react'
import { useTypedSelector } from '../redux/store'
import Counter2 from './Counter2'
import ConnectionStatus from './ConnectionStatus'
import FPS from './FPS'

export default function StatusBar() {

  const height = 30

  const bpm = useTypedSelector(state => state.time.bpm)

  const styles = {
    root: {
      display: 'flex',
      justifyContent: 'right',
      alignItems: 'center',
      fontSize: `${height * 0.75}px`,
      padding: '0 1rem'
    },
    spaced: {
      margin: '0 1rem 0 0'
    }
  }

  return (
    <div style={styles.root}>
      {/* <TimeSignature /> */}
      <span style={styles.spaced}>{`${Math.round(bpm)} BPM`}</span>
      <Counter2 />
      <div style={{ flex: '1 0 0' }} />
      <ConnectionStatus />
    </div>
  )
}
