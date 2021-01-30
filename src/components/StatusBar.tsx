import React from 'react'
import Counter2 from './Counter2'
import ConnectionStatus from './ConnectionStatus'
import { useRealtimeSelector, useRealtimeDispatch, incrementBPM } from '../redux/realtimeStore'
import useDragBasic from './hooks/useDragBasic'

function BPM() {
  const dispatch = useRealtimeDispatch()
  const bpm = useRealtimeSelector(state => state.time.bpm)

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    console.log("Mouse Down")
    const dx = - e.movementX
    const dy = e.movementY
    dispatch(incrementBPM(dx + dy))
  })

  return (
    <div ref={dragContainer} onMouseDown={onMouseDown} style={{ margin: '0 1rem 0 0', cursor: 'pointer' }}>
      {`${Math.round(bpm)} BPM`}
    </div>
  )
}

export default function StatusBar() {

  const height = 30

  const styles = {
    root: {
      display: 'flex',
      justifyContent: 'right',
      alignItems: 'center',
      fontSize: `${height * 0.75}px`,
      padding: '0 1rem'
    }
  }

  return (
    <div style={styles.root}>
      <BPM />
      <Counter2 />
      <div style={{ flex: '1 0 0' }} />
      <ConnectionStatus />
    </div>
  )
}
