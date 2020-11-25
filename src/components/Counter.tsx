import React from 'react'
import ProgressCircle from './ProgressCircle'
import { useSelector } from 'react-redux'

export default function Counter({radius}) {

  const time = useSelector(state => state.time);

  const styles = {
    container: {
      position: 'relative',
      width: `${radius * 2}px`,
      height: `${radius * 2}px`
    },
    progressRing: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    number: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: `${radius * 1.7}px`
    }
  }

  return (
    <div style={styles.container}>
      <ProgressCircle ratio={(time.beat - 1 + time.pos) / time.signature.numerator} radius={radius}/>
      {/* <div style={styles.number}>
        <ProgressCircle ratio={time.pos} radius={radius-10}/>
      </div> */}
      <div style={styles.number}>
        <span>{time.beat}</span>
      </div>
    </div>
  )
}
