import React from 'react'
import { useTypedSelector } from '../redux/store'

export default function Counter2() {

  const time = useTypedSelector(state => state.time);

  const beats = Array(time.quantum).fill(0)
  beats[Math.floor(time.phase)] = 1 - time.phase % 1.0

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: 10, width: 200, backgroundColor: '#0008'}}>
      {beats.map((beat, index) => {
        return (
          <div key={index} style={{flex: '1 0 0', backgroundColor: '#fff', opacity: beat}}/>
        )
      })}
    </div>
  )
}